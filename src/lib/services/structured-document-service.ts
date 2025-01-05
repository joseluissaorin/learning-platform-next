import { type Index, type Section } from '@/types/learning';
import { type ConceptIndex } from '@/types/analysis';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { getRedisClient } from '@/lib/redis/client';
import crypto from 'crypto';
import debug from 'debug';
import { PrismaClient } from '@prisma/client';

const log = debug('app:services:structured-document');
const logError = debug('app:services:structured-document:error');

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

type ModelProvider = 'groq' | 'gemini';

interface StructuredDocumentOptions {
  temperature?: number;
  maxTokens?: number;
  language?: string;
  easyToUnderstand?: boolean;
  modelProvider?: ModelProvider;
}

const DEFAULT_OPTIONS: StructuredDocumentOptions = {
  temperature: 1.45,
  maxTokens: 456,
  language: 'es',
  easyToUnderstand: true,
  modelProvider: 'gemini'
};

export class StructuredDocumentService {
  private groq!: Groq;
  private gemini!: GoogleGenerativeAI;
  private options: StructuredDocumentOptions;
  private redis = typeof window === 'undefined' ? getRedisClient() : null;
  private cacheTTL = 3600; // 1 hour
  private prisma = new PrismaClient();

  constructor(options: StructuredDocumentOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.modelProvider === 'groq') {
      const apiKey = env.GROQ_API_KEY;
      if (!apiKey.startsWith('gsk_')) {
        throw new Error('Invalid Groq API key format');
      }

      try {
        this.groq = new Groq({
          apiKey: apiKey.trim()
        });
      } catch (err) {
        logError('[StructuredDocumentService] Error initializing Groq: %O', err instanceof Error ? err.message : err);
        throw new Error('Failed to initialize Groq client');
      }
    } else {
      // Initialize Gemini
      try {
        const apiKey = env.GEMINI_API_KEY;
        this.gemini = new GoogleGenerativeAI(apiKey.trim());
        
        // Test the connection to ensure the API key is valid
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        if (!model) {
          throw new Error('Failed to get Gemini model');
        }
      } catch (err) {
        logError('[StructuredDocumentService] Error initializing Gemini: %O', err instanceof Error ? err.message : err);
        throw new Error('Failed to initialize Gemini client: ' + (err instanceof Error ? err.message : String(err)));
      }
    }

    log('[StructuredDocumentService] Initialized with options:', {
      ...this.options,
      modelProvider: this.options.modelProvider
    });
  }

  private generateCacheKey(content: string, index: Index, language: string): string {
    const contentHash = crypto
      .createHash('md5')
      .update(content)
      .digest('base64');
    
    const indexHash = crypto
      .createHash('md5')
      .update(JSON.stringify(index))
      .digest('base64');
    
    return `structured-doc:${contentHash}:${indexHash}:${language}`;
  }

  private async getFromCache(content: string, index: Index, language: string): Promise<string | null> {
    if (!this.redis) return null;

    try {
      const key = this.generateCacheKey(content, index, language);
      const cached = await this.redis.get(key);
      
      if (cached) {
        log('[StructuredDocumentService] Cache hit:', { key });
        return cached;
      }
      
      log('[StructuredDocumentService] Cache miss:', { key });
      return null;
    } catch (error) {
      logError('[StructuredDocumentService] Cache retrieval error:', error);
      return null;
    }
  }

  private async setInCache(content: string, index: Index, language: string, structuredContent: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.generateCacheKey(content, index, language);
      await this.redis.setex(key, this.cacheTTL, structuredContent);
      log('[StructuredDocumentService] Cached result:', { key });
    } catch (error) {
      logError('[StructuredDocumentService] Cache storage error:', error);
    }
  }

  private async generateContentWithGroq(messages: any[]): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      messages,
      model: "llama-3.1-8b-instant",
      temperature: this.options.temperature!,
      max_tokens: this.options.maxTokens!,
      top_p: 0.95,
      stream: false,
      stop: null
    });

    return completion.choices[0]?.message?.content || '';
  }

  private async generateContentWithGemini(messages: any[]): Promise<string> {
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Combine system and user messages into a single prompt
      const prompt = messages.map(m => {
        if (m.role === 'system') {
          return `Instructions: ${m.content}`;
        }
        return m.content;
      }).join('\n\n');

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logError('[generateContentWithGemini] Error generating content:', error);
      throw new Error('Failed to generate content with Gemini: ' + (error as Error).message);
    }
  }

  private async generateContent(messages: any[]): Promise<string> {
    if (this.options.modelProvider === 'groq') {
      return this.generateContentWithGroq(messages);
    } else {
      return this.generateContentWithGemini(messages);
    }
  }

  private async generateSectionContent(
    section: Section,
    rawContent: string,
    parentPath: string = '',
    processedSections: { count: number } = { count: 0 },
    totalSections: number,
    onProgress?: (progress: number) => void,
    depth: number = 0
  ): Promise<string> {
    // Skip if we're beyond level 3
    if (depth >= 3) {
      log('[generateSectionContent] Skipping section due to depth limit:', {
        title: section.title,
        depth
      });
      return '';
    }

    log('[generateSectionContent] Processing section:', {
      title: section.title,
      parentPath,
      hasSubsections: section.subsections?.length || 0,
      processedSections: processedSections.count,
      totalSections,
      depth,
      modelProvider: this.options.modelProvider
    });

    const currentPath = parentPath ? `${parentPath} > ${section.title}` : section.title;
    
    // Generate detailed explanation for this section
    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      },
      {
        role: 'user',
        content: this.buildUserPrompt(section, rawContent, currentPath)
      }
    ];

    log('[generateSectionContent] Sending request to model:', {
      path: currentPath,
      contentLength: rawContent.length,
      depth,
      modelProvider: this.options.modelProvider
    });

    try {
      const content = await this.generateContent(messages);
      
      log('[generateSectionContent] Received content:', {
        path: currentPath,
        contentLength: content.length,
        hasContent: !!content,
        depth,
        modelProvider: this.options.modelProvider
      });

      // Extract the section number from content if it exists
      const sectionMatch = section.content?.match(/^\s*(\d+(?:\.\d+)*\.)\s/m);
      const sectionNumber = sectionMatch ? sectionMatch[1] : '';

      // For main sections (I., II., III.), we already handle H1 in generateStructuredDocument
      // For numbered sections, we keep their original numbering
      let fullContent = sectionNumber 
        ? `${sectionNumber} ${content}\n\n`
        : `${content}\n\n`;

      // Update progress after processing this section
      processedSections.count++;
      if (onProgress) {
        const progress = (processedSections.count / totalSections) * 100;
        log('[generateSectionContent] Progress update:', {
          processedSections: processedSections.count,
          totalSections,
          progress,
          depth
        });
        onProgress(progress);
      }
      
      // Only process numbered sections if we're not at max depth
      if (depth < 2) {
        // Process numbered sections from content
        const lines = section.content?.split('\n') || [];
        for (const line of lines) {
          // Only match sections up to three levels (x.x.x)
          const numberedSectionMatch = line.match(/^\s*(\d+(?:\.\d+){0,2}\.)\s(.+)$/);
          if (numberedSectionMatch) {
            const [, number, title] = numberedSectionMatch;
            // Calculate current depth based on number of dots
            const currentDepth = (number.match(/\./g) || []).length;
            
            // Only process if it's the next level
            if (currentDepth === depth + 1) {
              const numberedSection: Section = {
                title: `${number} ${title}`,
                content: '' // We'll generate content for this section
              };

              const numberedContent = await this.generateSectionContent(
                numberedSection,
                rawContent,
                currentPath,
                processedSections,
                totalSections,
                onProgress,
                depth + 1
              );
              fullContent += numberedContent;
            }
          }
        }
      }

      return fullContent;
    } catch (error) {
      logError('[generateSectionContent] Error generating section content:', error);
      throw new Error('Failed to generate section content');
    }
  }

  private buildSystemPrompt(): string {
    const languageMap = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'it': 'Italian'
    };
    
    const language = languageMap[this.options.language as keyof typeof languageMap] || 'Spanish';
    const easyToUnderstand = this.options.easyToUnderstand
      ? "but easy to understand. You must easily explain complex topics in such way that they are understandable to anyone. That means you must not use technical jargon or complex words, you must use simple words and explain the topics in a way that is easy to understand. Also, explain in great detail each topic and subtopic, possibly even stop just to explain a single word or concept if it's necessary. Write thoroughs explanations that take as much space as necessary for explaining these concepts in a way as such that everyone can understand it. You must divide the answer in two parts: Summary/Resumen/Résumé and Explanation/Explicación/Explication. Only write in the language it is needed, if it is in English:Summary / Explanation, if it is in Spanish: Resumen / Explicación, if it is in French: Résumé / Explication. Use Header 2 (##) To indicate this divide. The first part must be a summary of the text, the second part must be an explanation of the text. The summary must be in the same language as the text, the explanation must be in the same language as the text."
      : "that would be used in academia";

    log('[buildSystemPrompt] Generated prompt with:', {
      language,
      easyToUnderstand: !!this.options.easyToUnderstand
    });

    return `You are a helpful and knowledgeable assistant specialized in creating detailed explanations. 
You will understand the given text and its underlying syntax, which might not be evident.
You will keep the most essential information and optimizing for space, this may include 
specific names, theories, dates, lists and definitions. You are only talking about the text provided, so you 
must not mention anything outside of it. You must answer in precise and technically perfect ${language}, 
${easyToUnderstand}. You must make no mention to the fact that you are explaining 
anything or that you've been given any text but rather you must write the text as one that 
exists by itself. You must not reference the document. You must do all 
of this in markdown. Remember to answer in ${language}. Take a deep breath and think step by step.`;
  }

  private buildUserPrompt(section: Section, rawContent: string, path: string): string {
    log('[buildUserPrompt] Building prompt for:', {
      path,
      contentLength: rawContent.length
    });

    return `Generate a detailed explanation for the section "${path}" based on the following content. 
Focus only on the content relevant to this specific section and its immediate context.
Do not generate any headers - they will be added automatically.
Content to explain:

${rawContent}`;
  }

  public async transformSectionsIntoConcepts(sections: Section[], sessionId?: string): Promise<ConceptIndex[]> {
    log('[transformSectionsIntoConcepts] Starting transformation:', {
      sectionCount: sections.length,
      hasSessionId: !!sessionId
    });

    const concepts: ConceptIndex[] = [];
    let mainSectionCounter = 1;

    const processSection = async (section: Section, parentId?: string, level: number = 0) => {
      // Extract section number from content if available
      const sectionMatch = section.content?.match(/^\s*(\d+(?:\.\d+)*\.)\s/m);
      const sectionNumber = sectionMatch ? sectionMatch[1] : null;

      // Generate concept ID based on hierarchy
      let id: string;
      if (level === 0) {
        // Main sections use roman numerals and section number
        id = sectionNumber ? sectionNumber : `${mainSectionCounter}.-`;
        mainSectionCounter++;
      } else {
        // Subsections use their original numbering or generate based on parent
        id = sectionNumber || `${parentId?.replace(/\.-$/, '')}.${level}`;
      }

      // Clean up the title by removing any leading numbers and roman numerals
      const cleanTitle = section.title
        .replace(/^\s*(?:\d+\.)+\s*/, '')  // Remove leading numbers
        .replace(/^[IVX]+\.\s*/, '')       // Remove roman numerals
        .trim();

      const conceptData = {
        id,
        title: cleanTitle,
        content: section.content || '',
        level,
        children: [],
        parentId,
        order: level === 0 ? mainSectionCounter : parseInt(id.split('.')[level] || '0')
      };

      log('[transformSectionsIntoConcepts] Created concept:', {
        id: conceptData.id,
        title: conceptData.title,
        level,
        parentId,
        sectionNumber,
        order: conceptData.order
      });

      // Save concept to database if sessionId is provided
      if (sessionId) {
        try {
          // Create or update the concept using raw SQL
          const [savedConcept] = await this.prisma.$queryRaw<Array<{ id: string }>>`
            INSERT INTO "Concept" (
              "id",
              "title",
              "content",
              "level",
              "order",
              "parentId",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${id},
              ${cleanTitle},
              ${section.content || ''},
              ${level},
              ${conceptData.order},
              ${parentId},
              NOW(),
              NOW()
            )
            ON CONFLICT ("id") DO UPDATE
            SET
              "title" = ${cleanTitle},
              "content" = ${section.content || ''},
              "level" = ${level},
              "order" = ${conceptData.order},
              "parentId" = ${parentId},
              "updatedAt" = NOW()
            RETURNING "id";
          `;

          if (savedConcept?.id) {
            // Create the session-concept relationship
            await this.prisma.$executeRaw`
              INSERT INTO "SessionConcept" (
                "id",
                "sessionId",
                "conceptId",
                "progress",
                "status",
                "createdAt",
                "updatedAt"
              )
              VALUES (
                gen_random_uuid(),
                ${sessionId},
                ${savedConcept.id},
                0,
                'not_started',
                NOW(),
                NOW()
              )
              ON CONFLICT ("sessionId", "conceptId") DO NOTHING;
            `;

            log('[transformSectionsIntoConcepts] Saved concept to database:', {
              conceptId: savedConcept.id,
              sessionId
            });
          }
        } catch (error) {
          logError('[transformSectionsIntoConcepts] Error saving concept:', error);
          // Continue processing other concepts even if one fails
        }
      }

      concepts.push(conceptData);

      // Process subsections recursively
      if (section.subsections?.length) {
        for (const subsection of section.subsections) {
          await processSection(subsection, conceptData.id, level + 1);
        }
      } else {
        // If no explicit subsections, look for numbered sections in content
        const lines = section.content?.split('\n') || [];
        let currentSubsection: Section | null = null;
        let subsections: Section[] = [];

        for (const line of lines) {
          // Match section numbers up to three levels (e.g., 1., 1.1., 1.1.1.)
          const numberedSectionMatch = line.match(/^\s*(\d+(?:\.\d+){0,2}\.)\s(.+)$/);
          if (numberedSectionMatch) {
            const [, number, title] = numberedSectionMatch;
            const currentDepth = (number.match(/\./g) || []).length;
            
            // Only process if it's the next level
            if (currentDepth === level + 1) {
              if (currentSubsection) {
                subsections.push(currentSubsection);
              }
              currentSubsection = {
                title: `${number} ${title}`,
                content: ''
              };
            } else if (currentSubsection && currentDepth > level + 1) {
              // Add content to current subsection
              currentSubsection.content += line + '\n';
            }
          } else if (currentSubsection) {
            // Add content to current subsection
            currentSubsection.content += line + '\n';
          }
        }

        // Add the last subsection if exists
        if (currentSubsection) {
          subsections.push(currentSubsection);
        }

        // Process found subsections
        for (const subsection of subsections) {
          await processSection(subsection, conceptData.id, level + 1);
        }
      }
    };

    // Process all sections
    for (const section of sections) {
      await processSection(section);
    }

    log('[transformSectionsIntoConcepts] Completed transformation:', {
      conceptCount: concepts.length,
      conceptIds: concepts.map(c => c.id),
      hierarchy: concepts.map(c => ({
        id: c.id,
        title: c.title,
        level: c.level,
        parentId: c.parentId
      }))
    });

    return concepts;
  }

  public async generateStructuredDocument(
    rawContent: string,
    index: Index,
    onProgress?: (progress: number) => void
  ): Promise<{ structuredContent: string; concepts: ConceptIndex[] }> {
    log('[generateStructuredDocument] Starting generation:', {
      contentLength: rawContent.length,
      indexSections: index.sections?.length || 0,
      language: this.options.language
    });

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(rawContent, index, this.options.language!);
      
      // Check cache first
      const cached = await this.getFromCache(rawContent, index, this.options.language!);
      if (cached) {
        try {
          const { structuredContent, concepts } = JSON.parse(cached);
          log('[generateStructuredDocument] Returning cached result');
          return { structuredContent, concepts };
        } catch (error) {
          log('[generateStructuredDocument] Error parsing cached result:', error);
          // Continue with generation if cache parsing fails
        }
      }

      // Count total sections for progress tracking first
      const totalSections = this.countTotalSections(index.sections || []);
      log('[generateStructuredDocument] Total sections to process:', totalSections);

      // Process sections in batches of 5
      const BATCH_SIZE = 5;
      const processedSections = { count: 0 };
      const sectionContents: string[] = [];

      if (index.sections) {
        // Process sections in batches
        for (let i = 0; i < index.sections.length; i += BATCH_SIZE) {
          const batch = index.sections.slice(i, i + BATCH_SIZE);
          log('[generateStructuredDocument] Processing batch %d to %d', i, i + batch.length);

          const batchPromises = batch.map(section =>
            this.generateSectionContent(
              section,
              rawContent,
              '',
              processedSections,
              totalSections,
              onProgress,
              0
            )
          );

          const batchResults = await Promise.all(batchPromises);
          sectionContents.push(...batchResults);
        }
      }

      const structuredContent = sectionContents.filter(Boolean).join('\n\n');

      // Transform sections into concepts after content generation
      log('[generateStructuredDocument] Transforming sections into concepts');
      const concepts = await this.transformSectionsIntoConcepts(index.sections || [], index.sessionId);
      log('[generateStructuredDocument] Transformed sections into concepts:', {
        conceptCount: concepts.length,
        conceptIds: concepts.map(c => c.id)
      });

      // Cache both the structured content and concepts
      const result = { structuredContent, concepts };
      await this.setInCache(rawContent, index, this.options.language!, JSON.stringify(result));

      log('[generateStructuredDocument] Generation complete:', {
        contentLength: structuredContent.length,
        sections: sectionContents.length,
        conceptCount: concepts.length
      });

      return result;
    } catch (error) {
      logError('[generateStructuredDocument] Error:', error);
      throw error;
    }
  }

  private countTotalSections(sections: Section[]): number {
    log('[countTotalSections] Counting sections:', {
      sectionsProvided: !!sections,
      isArray: Array.isArray(sections),
      length: sections?.length || 0
    });

    if (!sections || !Array.isArray(sections)) {
      log('[countTotalSections] Invalid sections array');
      return 0;
    }

    let totalCount = 0;

    for (const section of sections) {
      if (!section.content) {
        log('[countTotalSections] Section has no content:', section.title);
        continue;
      }

      // Count main sections (e.g., "1.", "2.", "3.")
      const mainSectionRegex = /^\s*\d+\.\s/gm;
      const mainSections = (section.content.match(mainSectionRegex) || []).length;

      // Count subsections (e.g., "1.1.", "1.2.", "2.1.")
      const subSectionRegex = /^\s*\d+\.\d+\.\s/gm;
      const subSections = (section.content.match(subSectionRegex) || []).length;

      // Count detailed sections (e.g., "1.1.1.", "1.1.2.")
      const detailedSectionRegex = /^\s*\d+\.\d+\.\d+\.\s/gm;
      const detailedSections = (section.content.match(detailedSectionRegex) || []).length;

      // We no longer count very detailed sections (x.x.x.x)
      const sectionCount = mainSections + subSections + detailedSections;

      log('[countTotalSections] Section counts:', {
        title: section.title,
        mainSections,
        subSections,
        detailedSections,
        total: sectionCount
      });

      totalCount += sectionCount;
    }

    log('[countTotalSections] Final total count:', { totalCount });
    return totalCount;
  }
} 