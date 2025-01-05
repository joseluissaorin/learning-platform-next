import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { logger } from '@/lib/debug/logger';

interface ModelConfig {
  wordsPerToken: number;
  temperature: number;
}

interface GenerateExplanationParams {
  conceptId: string;
  layer: number;
  structuredContent: string;
  context?: string;
  conceptPath?: string[];
  forceRegenerate?: boolean;
}

interface Section {
  header: string;
  content: string;
}

export class ExplanationService {
  private static instance: ExplanationService;
  private readonly MAX_ITERATIONS = 15;
  private readonly TARGET_PERCENTAGES: Record<number, number> = {
    1: 0.33, // Layer 1: 33%
    2: 0.60, // Layer 2: 60%
    3: 1.0   // Layer 3: 100%
  };
  private readonly WIGGLE_ROOM = 0.06; // Allow 6% deviation
  private readonly TOKENS_PER_SUMMARY = 515;
  private readonly MODEL = 'llama';

  private readonly MODEL_CONFIGS: Record<string, ModelConfig> = {
    'claude': { wordsPerToken: 0.36, temperature: 0.95 },
    'gpt': { wordsPerToken: 2.9, temperature: 1.75 },
    'gemini': { wordsPerToken: 0.247, temperature: 1.75 },
    'llama': { wordsPerToken: 0.4, temperature: 1.45 }
  };

  private constructor() {}

  public static getInstance(): ExplanationService {
    if (!this.instance) {
      this.instance = new ExplanationService();
    }
    return this.instance;
  }

  async generateExplanation({
    conceptId,
    layer,
    structuredContent,
    context = '',
    conceptPath = [],
    forceRegenerate = false
  }: GenerateExplanationParams): Promise<string> {
    logger.info('ExplanationService', 'Generating explanation', {
      conceptId,
      layer,
      hasStructuredContent: !!structuredContent,
      contextLength: context.length,
      pathLength: conceptPath.length
    });

    // Check cache unless forced regeneration
    if (!forceRegenerate) {
      const cached = await explanationCacheService.getExplanation(conceptId, layer);
      if (cached) {
        logger.info('ExplanationService', 'Cache hit', { conceptId, layer });
        return cached;
      }
    }

    // Extract relevant section from structured content
    const sectionContent = this.extractSection(structuredContent, conceptId);
    if (!sectionContent) {
      throw new Error(`No content found for concept: ${conceptId}`);
    }

    // For layer 3, return the structured content directly
    if (layer === 3) {
      await explanationCacheService.setExplanation(conceptId, layer, sectionContent);
      return sectionContent;
    }

    // Process content using new_summarize approach
    const processed = await this.processContent(sectionContent, layer);
    
    // Cache the result
    await explanationCacheService.setExplanation(conceptId, layer, processed);

    return processed;
  }

  private async processContent(content: string, layer: number): Promise<string> {
    const sections = this.divideIntoSections(content);
    const totalWords = this.countWords(content);
    const targetWords = Math.floor(totalWords * this.TARGET_PERCENTAGES[layer]);
    const lowerBound = Math.floor(targetWords - 350);
    const upperBound = Math.floor(targetWords + 350);

    let subdivisionFactor = 1.0;
    const maxSubdivisionFactor = 50;
    
    logger.info('ExplanationService', 'Processing content', {
      totalWords,
      targetWords,
      bounds: { lower: lowerBound, upper: upperBound },
      sectionsCount: sections.length
    });

    for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
      logger.info('ExplanationService', 'Processing iteration', { iteration: iteration + 1 });

      // Subdivide sections based on current factor
      const subdivisions = this.subdivideSections(sections, subdivisionFactor);
      
      // Estimate before generating
      const estimatedWords = this.estimateSummaryLength(subdivisions);
      logger.info('ExplanationService', 'Iteration estimate', {
        iteration: iteration + 1,
        estimatedWords,
        lowerBound,
        upperBound
      });

      if (estimatedWords < lowerBound) {
        subdivisionFactor *= 0.5;
        continue;
      } else if (estimatedWords > upperBound) {
        subdivisionFactor *= 2;
        if (subdivisionFactor > maxSubdivisionFactor) {
          subdivisionFactor = maxSubdivisionFactor;
        }
        continue;
      }

      // Generate summaries for each subdivision
      const summaries = await Promise.all(
        subdivisions.map(async (subdivision) => {
          const prompt = this.generatePrompt(subdivision);

          const response = await fetch('/api/llm/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              temperature: this.MODEL_CONFIGS[this.MODEL].temperature,
              maxTokens: Math.floor(this.countWords(subdivision) * 0.4), // 40% of input length
              stop: ["Human:", "Assistant:"]
            })
          });

          if (!response.ok) {
            throw new Error('Failed to generate summary');
          }

          const { content } = await response.json();
          return content;
        })
      );

      // Combine summaries
      const combined = summaries.join('\n\n');
      const combinedWords = this.countWords(combined);

      logger.info('ExplanationService', 'Generated summary', {
        iteration: iteration + 1,
        words: combinedWords,
        subdivisions: subdivisions.length,
        targetWords
      });

      // Check if within bounds
      if (combinedWords >= lowerBound && combinedWords <= upperBound) {
        return combined;
      }

      // Adjust subdivision factor based on result
      if (combinedWords < lowerBound) {
        subdivisionFactor *= 0.5;
      } else {
        subdivisionFactor *= 2;
        if (subdivisionFactor > maxSubdivisionFactor) {
          subdivisionFactor = maxSubdivisionFactor;
        }
      }
    }

    throw new Error('Failed to achieve target length after maximum iterations');
  }

  private divideIntoSections(content: string): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentSection: Section = { header: '', content: '' };

    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        if (currentSection.content) {
          sections.push(currentSection);
          currentSection = { header: '', content: '' };
        }
        currentSection.header = line;
      } else {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }

  private subdivideSections(sections: Section[], factor: number): string[] {
    const subdivisions: string[] = [];
    
    for (const section of sections) {
      const words = this.countWords(section.content);
      const targetSize = Math.max(150, Math.floor(words / factor));
      
      // Split content into sentences
      const sentences = section.content.match(/[^.!?]+[.!?]+/g) || [section.content];
      let currentSubdivision = section.header + '\n\n';
      let currentWordCount = 0;

      for (const sentence of sentences) {
        const sentenceWords = this.countWords(sentence);
        
        if (currentWordCount + sentenceWords > targetSize) {
          subdivisions.push(currentSubdivision.trim());
          currentSubdivision = section.header + '\n\n' + sentence;
          currentWordCount = sentenceWords;
        } else {
          currentSubdivision += sentence;
          currentWordCount += sentenceWords;
        }
      }

      if (currentSubdivision !== section.header + '\n\n') {
        subdivisions.push(currentSubdivision.trim());
      }
    }

    return this.mergeShortSubdivisions(subdivisions);
  }

  private mergeShortSubdivisions(subdivisions: string[]): string[] {
    const merged: string[] = [];
    let current = '';
    
    for (const subdivision of subdivisions) {
      if (this.countWords(current + subdivision) < 150) {
        current += (current ? '\n\n' : '') + subdivision;
      } else {
        if (current) merged.push(current);
        current = subdivision;
      }
    }
    
    if (current) merged.push(current);
    return merged;
  }

  private estimateSummaryLength(subdivisions: string[]): number {
    logger.info('ExplanationService', 'Words per token ratio', {
      ratio: this.MODEL_CONFIGS[this.MODEL].wordsPerToken
    });
    
    const actualSubdivisions = subdivisions.length;
    const totalTokens = actualSubdivisions * this.TOKENS_PER_SUMMARY;
    const estimatedWords = totalTokens * this.MODEL_CONFIGS[this.MODEL].wordsPerToken;
    
    logger.info('ExplanationService', 'Estimating summary length', {
      tokens: totalTokens,
      subdivisions: actualSubdivisions,
      wordsPerToken: this.MODEL_CONFIGS[this.MODEL].wordsPerToken,
      estimatedWords
    });
    
    return Math.ceil(estimatedWords);
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractSection(content: string, conceptId: string): string | null {
    // Debug the first 200 chars of content
    logger.debug('ExplanationService', 'Content preview', {
      firstChars: content.substring(0, 2),
      contentLength: content.length,
      conceptId
    });

    // Split content into sections based on ## headers
    const sections = content.split(/(?=\n##\s)/);
    
    // Log the sections for debugging
    logger.debug('ExplanationService', 'Content sections', {
      totalSections: sections.length,
      conceptId,
      sectionHeaders: sections.map(s => {
        const firstLine = s.split('\n').find(line => line.trim().startsWith('##'));
        return firstLine || 'No header found';
      }).join(', ')
    });

    // Create a regex that looks for the concept ID in ## headers
    const regex = new RegExp(`##\\s.*${conceptId}.*$`, 'm');
    
    // Find the matching section
    const section = sections.find(s => {
      const hasMatch = regex.test(s);
      if (hasMatch) {
        logger.debug('ExplanationService', 'Found matching section', {
          conceptId,
          header: s.split('\n').find(line => line.trim().startsWith('##'))
        });
      }
      return hasMatch;
    });

    if (!section) {
      logger.warn('ExplanationService', 'No matching section found', {
        conceptId,
        availableHeaders: sections.map(s => {
          const firstLine = s.split('\n').find(line => line.trim().startsWith('##'));
          return firstLine || 'No header found';
        })
      });
    }

    return section ? section.trim() : null;
  }

  private generatePrompt(text: string): string {
    return `You are a helpful and knowledgeable assistant specialized in summarizing texts. 
You will understand the given text and its underlying syntax, which might not be evident. 
You will keep the most essential information and optimizing for space, this may include 
specific names, theories, dates, lists and definitions. You must make no mention to the 
fact that you are summarizing anything or that you've been given any text but rather you 
must write the text as one that exists by itself.

You must easily explain complex topics in such way that they are understandable to anyone. 
That means you must not use technical jargon or complex words, you must use simple words 
and explain the topics in a way that is easy to understand. Also, explain in great detail 
each topic and subtopic, possibly even stop just to explain a single word or concept if 
it's necessary. Write thorough explanations that make complex ideas accessible to everyone.

## Text to summarize:
${text}

## Instructions:
Summarize the text above maintaining the most important information. Ensure the summary is substantive.
Do not write lists or numbered items unless they are explicitly written in the given text.
Write a cohesive text. Keep in mind the context if provided and make seamless transitions.
Output in markdown.`;
  }

  async clearCache(conceptId: string, layer: number): Promise<void> {
    await explanationCacheService.deleteExplanation(conceptId, layer);
  }
} 