// explanation-service.js
import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { logger } from '@/lib/debug/logger';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { ConceptStorageService } from '@/lib/redis/concept-storage';
import { StructuredDocumentService } from '@/lib/services/structured-document-service';

interface ModelConfig {
  wordsPerToken: number;
  temperature: number;
}

interface GenerateExplanationParams {
  conceptId: string;
  layer: number;
  context?: string;
  conceptPath?: string[];
  forceRegenerate?: boolean;
}

interface ConceptData {
  id: string;
  title: string;
  content: string;
  level: number;
  parentId: string | null;
  contentUuid: string | null;
  processingStatus: string;
  version?: number;
}

interface Section {
  header: string;
  content: string;
}

export class ExplanationService {
  private static instance: ExplanationService;
  private readonly MAX_ITERATIONS = 15;
  private readonly TARGET_PERCENTAGES: Record<number, number> = {
    1: 0.33, // 33% for layer 1
    2: 0.60, // 60% for layer 2
    3: 1.0   // 100% for layer 3
  };
  private readonly WIGGLE_ROOM = 0.06;
  private readonly TOKENS_PER_SUMMARY = 515;
  private readonly MODEL = 'gemini';
  private readonly MAX_SECTION_WORDS = 4000;
  private readonly MIN_CHUNK_SIZE = 150;
  private subdivision_factor = 1.0;
  private target_subdivisions = 0;
  private current_subdivisions = 0;
  private prisma = new PrismaClient();
  private gemini: GoogleGenerativeAI;
  private conceptStorage = new ConceptStorageService();
  private structuredDocument = new StructuredDocumentService();

  private readonly MODEL_CONFIGS: Record<string, ModelConfig> = {
    claude: { wordsPerToken: 0.36, temperature: 0.95 },
    gpt: { wordsPerToken: 2.9, temperature: 1.75 },
    gemini: { wordsPerToken: 0.247, temperature: 1.75 },
    llama: { wordsPerToken: 0.4, temperature: 1.45 }
  };

  private constructor() {
    // Initialize Gemini
    try {
      const apiKey = env.GEMINI_API_KEY;
      this.gemini = new GoogleGenerativeAI(apiKey.trim());

      // Test the connection
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      if (!model) {
        throw new Error('Failed to get Gemini model');
      }
    } catch (err) {
      logger.error('ExplanationService', 'Error initializing Gemini:', err instanceof Error ? err.message : err);
      throw new Error('Failed to initialize Gemini client: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  public static getInstance(): ExplanationService {
    if (!this.instance) {
      this.instance = new ExplanationService();
    }
    return this.instance;
  }

  private async getConceptContent(conceptId: string): Promise<ConceptData | null> {
    try {
      const [concept] = await this.prisma.$queryRaw<ConceptData[]>`
        SELECT 
          c.id,
          c.title,
          c.content,
          c.level,
          c."parentId",
          c."contentUuid",
          c."processingStatus"
        FROM "Concept" c
        WHERE c.id = ${conceptId}
        LIMIT 1;
      `;
      if (!concept) {
        logger.warn('ExplanationService', 'Concept not found', { conceptId });
        return null;
      }
      return concept;
    } catch (error) {
      logger.error('ExplanationService', 'Error fetching concept', {
        conceptId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to fetch concept: ${conceptId}`);
    }
  }

  /**
   * Main public method to generate or retrieve an explanation for a given concept + layer.
   * If partial content is available (based on conceptPath), we retrieve that from structured doc.
   * Otherwise, we default to concept.content from DB.
   */
  async generateExplanation({
    conceptId,
    layer,
    context = '',
    conceptPath = [],
    forceRegenerate = false
  }: GenerateExplanationParams): Promise<string> {
    logger.info('ExplanationService', 'Generating explanation', {
      conceptId,
      layer,
      hasContext: !!context,
      forceRegenerate
    });

    try {
      const concept = await this.getConceptContent(conceptId);
      if (!concept) {
        throw new Error(`Concept not found: ${conceptId}`);
      }

      // If concept has been processed and stored, check Redis first
      if (concept.contentUuid && concept.processingStatus === 'completed' && !forceRegenerate) {
        const cachedContent = await this.conceptStorage.getLayerContent(concept.contentUuid, layer);
        if (cachedContent) {
          logger.info('ExplanationService', 'Retrieved from Redis storage', {
            conceptId,
            layer,
            contentUuid: concept.contentUuid
          });
          return cachedContent;
        }
      }

      // If we need to generate the content
      logger.info('ExplanationService', 'No suitable cached explanation found', {
        conceptId,
        layer,
        conceptPath,
        forceRegenerate
      });

      // Attempt partial retrieval from structured doc, if a conceptPath is provided
      let partialContent: string | null = null;
      if (conceptPath && conceptPath.length > 0) {
        // We assume the sessionId is contained in the path's parent or we can do a quick DB lookup
        // Minimal approach: find sessionConcept row
        const sessionConcept = await this.prisma.sessionConcept.findFirst({
          where: {
            conceptId: concept.id
          }
        });
        if (sessionConcept) {
          partialContent = await this.structuredDocument.getPartialContent(sessionConcept.sessionId, conceptPath);
        }
      }

      // Fallback to the DB "concept.content"
      const fullContent = partialContent || concept.content;

      let result: string;
      if (layer === 3) {
        // Full content
        result = fullContent;
      } else {
        // Summarization
        const targetPercentage = this.TARGET_PERCENTAGES[layer];
        result = await this.generateSummary(fullContent, targetPercentage);
      }

      // If concept has a contentUuid, update Redis
      if (concept.contentUuid) {
        await this.conceptStorage.storeConceptContent(concept.contentUuid, {
          layer1Summary: layer === 1 ? result : '',
          layer2Summary: layer === 2 ? result : '',
          layer3Content: layer === 3 ? result : concept.content,
          metadata: {
            version: concept.version || 1,
            lastUpdated: new Date().toISOString(),
            parentPath: conceptPath,
            level: concept.level,
            order: concept.id
          }
        });

        logger.info('ExplanationService', 'Stored new or updated content in Redis', {
          conceptId,
          layer,
          contentUuid: concept.contentUuid
        });
      }

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('ExplanationService', 'Error generating explanation', {
        conceptId,
        layer,
        error: msg
      });
      throw new Error(msg);
    }
  }

  /**
   * Below is the existing summarization logic, untouched except for calling it with partial or full content.
   */
  private isMarkdownContent(content: string): boolean {
    return Boolean(
      content.match(/^#{1,6}\s/m) ||
      content.match(/^\d+\.\s/m) ||
      content.match(/^[-*+]\s/m)
    );
  }

  private divideMarkdownContent(content: string): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentSection: Section = { header: '', content: '' };
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        currentSection.content += line + '\n';
        continue;
      }

      if (inCodeBlock) {
        currentSection.content += line + '\n';
        continue;
      }

      if (line.match(/^#{1,6}\s/)) {
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
          currentSection = { header: '', content: '' };
        }
        currentSection.header = line;
      } else if (line.match(/^(\d+\.|\*|-|\+)\s/)) {
        if (currentSection.content && !currentSection.header.includes('List')) {
          sections.push({ ...currentSection });
          currentSection = { header: 'List', content: '' };
        }
        currentSection.content += line + '\n';
      } else {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection.content.trim()) {
      sections.push({ ...currentSection });
    }

    return this.adjustSections(sections);
  }

  private adjustSections(sections: Section[]): Section[] {
    const MAX_SECTION_WORDS = 4000;
    const adjustedSections: Section[] = [];

    for (const section of sections) {
      const wordCount = section.content.split(/\s+/).length;
      if (wordCount <= MAX_SECTION_WORDS) {
        adjustedSections.push(section);
      } else {
        const subsections = this.divideIntoSubsections(section);
        adjustedSections.push(...subsections);
      }
    }

    return adjustedSections;
  }

  private divideIntoSubsections(section: Section): Section[] {
    const subsections: Section[] = [];
    const paragraphs = section.content.split(/\n\s*\n/);
    let currentSubsection: Section = {
      header: section.header ? `${section.header} (Part 1)` : '',
      content: ''
    };
    let currentWordCount = 0;
    const TARGET_WORDS = 2000;

    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.split(/\s+/).length;

      if (currentWordCount + paragraphWords > TARGET_WORDS && currentSubsection.content.trim()) {
        subsections.push({ ...currentSubsection });
        const partNumber = subsections.length + 1;
        currentSubsection = {
          header: section.header ? `${section.header} (Part ${partNumber})` : '',
          content: ''
        };
        currentWordCount = 0;
      }

      currentSubsection.content += paragraph + '\n\n';
      currentWordCount += paragraphWords;
    }

    if (currentSubsection.content.trim()) {
      subsections.push(currentSubsection);
    }

    return subsections;
  }

  private subdivideContent(content: string, targetSubdivisions: number): string[] {
    const words = content.split(/\s+/);
    const totalWords = words.length;
    const targetChunkSize = Math.max(
      150,
      Math.floor((totalWords / targetSubdivisions) * this.subdivision_factor)
    );

    const subdivisions: string[] = [];
    let start = 0;

    while (start < totalWords) {
      let end = Math.min(start + targetChunkSize, totalWords);

      while (end < totalWords && !words[end - 1].match(/[.!?]$/)) {
        end++;
        if (end - start > targetChunkSize * 1.5) {
          while (end > start && !words[end - 1].match(/[.!?]$/)) {
            end--;
          }
          if (end === start) {
            end = start + targetChunkSize;
          }
          break;
        }
      }

      const subdivision = words.slice(start, end).join(' ');
      subdivisions.push(subdivision);
      start = end;
    }

    return this.mergeOrSplitSubdivisions(subdivisions, targetSubdivisions);
  }

  private mergeOrSplitSubdivisions(subdivisions: string[], targetCount: number): string[] {
    if (subdivisions.length === targetCount) {
      return subdivisions;
    }
    if (subdivisions.length > targetCount) {
      return this.mergeSubdivisions(subdivisions, targetCount);
    } else {
      return this.splitSubdivisions(subdivisions, targetCount);
    }
  }

  private mergeSubdivisions(subdivisions: string[], targetCount: number): string[] {
    const merged: string[] = [];
    const totalWords = subdivisions.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
    const targetWordsPerSubdivision = Math.floor(totalWords / targetCount);

    let currentMerge = '';
    let currentWords = 0;

    for (const subdivision of subdivisions) {
      const subdivisionWords = subdivision.split(/\s+/).length;
      if (
        currentWords + subdivisionWords > targetWordsPerSubdivision * 1.2 &&
        merged.length < targetCount - 1
      ) {
        merged.push(currentMerge.trim());
        currentMerge = subdivision;
        currentWords = subdivisionWords;
      } else {
        currentMerge += (currentMerge ? ' ' : '') + subdivision;
        currentWords += subdivisionWords;
      }
    }

    if (currentMerge) {
      merged.push(currentMerge.trim());
    }
    return merged;
  }

  private splitSubdivisions(subdivisions: string[], targetCount: number): string[] {
    const result: string[] = [];

    for (const subdivision of subdivisions) {
      const sentences = subdivision.match(/[^.!?]+[.!?]+/g) || [subdivision];
      const splitCount = Math.ceil(targetCount / subdivisions.length);
      const sentencesPerSplit = Math.ceil(sentences.length / splitCount);

      for (let i = 0; i < sentences.length; i += sentencesPerSplit) {
        const chunk = sentences.slice(i, i + sentencesPerSplit).join(' ');
        if (chunk.trim()) {
          result.push(chunk);
        }
      }
    }

    while (result.length > targetCount) {
      let shortestIdx = 0;
      let shortestLen = Infinity;
      for (let i = 0; i < result.length - 1; i++) {
        const combinedLen = result[i].length + result[i + 1].length;
        if (combinedLen < shortestLen) {
          shortestLen = combinedLen;
          shortestIdx = i;
        }
      }
      result.splice(shortestIdx, 2, result[shortestIdx] + ' ' + result[shortestIdx + 1]);
    }

    return result;
  }

  private estimateTokens(text: string): number {
    const config = this.MODEL_CONFIGS[this.MODEL];
    return Math.floor(text.split(/\s+/).length * config.wordsPerToken);
  }

  private async generateSummary(content: string, targetPercentage: number): Promise<string> {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
    const targetLength = Math.floor(this.TOKENS_PER_SUMMARY * targetPercentage);
    const wiggleRoom = Math.floor(targetLength * this.WIGGLE_ROOM);
    const lowerBound = targetLength - wiggleRoom;
    const upperBound = targetLength + wiggleRoom;
    let iterations = 0;
    this.target_subdivisions = Math.max(
      1,
      Math.ceil(targetLength / (this.TOKENS_PER_SUMMARY * this.MODEL_CONFIGS[this.MODEL].wordsPerToken))
    );

    let sections: Section[] = [];
    if (this.isMarkdownContent(content)) {
      sections = this.divideMarkdownContent(content);
    } else {
      sections = [{ header: '', content }];
    }

    let subdivisions: string[] = [];
    let currentEstimatedLength = 0;
    let bestSubdivisions: string[] = [];
    let bestLengthDiff = Infinity;

    while (iterations < this.MAX_ITERATIONS) {
      subdivisions = [];
      for (const section of sections) {
        const sectionSubdivisions = this.subdivideContent(
          section.content,
          Math.max(
            1,
            Math.floor(
              this.target_subdivisions *
                (section.content.split(/\s+/).length / content.split(/\s+/).length)
            )
          )
        );
        subdivisions.push(...sectionSubdivisions);
      }

      currentEstimatedLength = this.estimateTokens(subdivisions.join(' '));
      const currentLengthDiff = Math.abs(currentEstimatedLength - targetLength);

      if (currentLengthDiff < bestLengthDiff) {
        bestLengthDiff = currentLengthDiff;
        bestSubdivisions = [...subdivisions];
      }

      if (currentEstimatedLength >= lowerBound && currentEstimatedLength <= upperBound) {
        break;
      }

      if (currentEstimatedLength < lowerBound) {
        this.subdivision_factor = Math.min(this.subdivision_factor * 1.5, 50);
        this.target_subdivisions = Math.min(this.target_subdivisions + 1, 10);
      } else {
        this.subdivision_factor = Math.max(this.subdivision_factor * 0.75, 0.1);
        this.target_subdivisions = Math.max(this.target_subdivisions - 1, 1);
      }

      iterations++;
    }

    if (currentEstimatedLength < lowerBound || currentEstimatedLength > upperBound) {
      subdivisions = bestSubdivisions;
    }

    const summaries: string[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < subdivisions.length; i += BATCH_SIZE) {
      const batch = subdivisions.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (subdivision) => {
        const prompt = `## Text to summarize: ${subdivision}\n\n## Instructions: Summarize the text above. Maintain the most important information and ensure the summary is substantive. Output in markdown, using headers, bold, italics, etc. Write in the language of the text.`;
        try {
          const result = await model.generateContent(prompt);
          return result.response.text();
        } catch (error) {
          logger.error('ExplanationService', 'Error generating subdivision summary', {
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      summaries.push(...batchResults);

      if (i + BATCH_SIZE < subdivisions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return summaries.join('\n\n');
  }
}
