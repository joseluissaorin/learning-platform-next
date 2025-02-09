// structured-document-service.ts
import { type Index, type Section } from '@/types/learning';
import { type ConceptIndex } from '@/types/analysis';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { getRedisClient } from '@/lib/redis/client';
import { ConceptStorageService, type ConceptContent } from '@/lib/redis/concept-storage';
import crypto from 'crypto';
import debug from 'debug';
import { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import type { Pipeline } from 'ioredis';

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
  private redis: Redis | null = null;
  private cacheTTL = 3600; // 1 hour
  private prisma = new PrismaClient();
  private conceptStorage = new ConceptStorageService();

  constructor(options: StructuredDocumentOptions = {}) {
    if (typeof window !== 'undefined') {
      throw new Error('StructuredDocumentService cannot be instantiated on the client side');
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize Redis client
    getRedisClient()
      .then(client => {
        this.redis = client;
      })
      .catch(error => {
        logError('[StructuredDocumentService] Redis initialization error:', error);
      });

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
      model: 'llama-3.1-8b-instant',
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
      const prompt = messages
        .map((m) => {
          if (m.role === 'system') {
            return `Instructions: ${m.content}`;
          }
          return m.content;
        })
        .join('\n\n');

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

  private async getRedisClientSafe(): Promise<Redis | null> {
    if (!this.redis) {
      try {
        this.redis = await getRedisClient();
      } catch (error) {
        logError('[getRedisClientSafe] Error getting Redis client:', error);
        return null;
      }
    }
    return this.redis;
  }

  private async executeRedisPipeline(pipeline: ReturnType<Redis['pipeline']>): Promise<[Error | null, unknown][] | null> {
    try {
      const results = await pipeline.exec();
      if (!results) {
        logError('[executeRedisPipeline] Pipeline execution returned null');
        return null;
      }
      return results;
    } catch (error) {
      logError('[executeRedisPipeline] Pipeline execution error:', error);
      return null;
    }
  }

  private async cacheContent(pathKey: string, content: string, metadata: Record<string, unknown>): Promise<void> {
    const client = await this.getRedisClientSafe();
    if (!client) return;

    const pipeline = client.pipeline();
    pipeline
      .set(`content:${pathKey}:layer3`, content)
      .set(`content:${pathKey}:metadata`, JSON.stringify(metadata))
      .expire(`content:${pathKey}:layer3`, this.cacheTTL)
      .expire(`content:${pathKey}:metadata`, this.cacheTTL);

    await this.executeRedisPipeline(pipeline);
  }

  private async getCachedContent(pathKey: string): Promise<{ content: string | null; metadata: any | null }> {
    const client = await this.getRedisClientSafe();
    if (!client) {
      return { content: null, metadata: null };
    }

    const pipeline = client.pipeline();
    pipeline
      .get(`content:${pathKey}:layer3`)
      .get(`content:${pathKey}:metadata`);

    const results = await this.executeRedisPipeline(pipeline);
    if (!results) {
      return { content: null, metadata: null };
    }

    const [contentResult, metadataResult] = results;
    return {
      content: contentResult[1] as string | null,
      metadata: metadataResult[1] ? JSON.parse(metadataResult[1] as string) : null
    };
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

    try {
      const generateWithDelay = async (msgs: any[]): Promise<string> => {
        const result = await this.generateContent(msgs);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return result;
      };

      // Layer 3
      const layer3Content = await generateWithDelay(messages);

      // Layer 2 (60%) summary
      const layer2Messages = [
        {
          role: 'system',
          content: this.buildSummarySystemPrompt(2)
        },
        {
          role: 'user',
          content: layer3Content
        }
      ];
      const layer2Summary = await generateWithDelay(layer2Messages);

      // Layer 1 (33%) summary
      const layer1Messages = [
        {
          role: 'system',
          content: this.buildSummarySystemPrompt(1)
        },
        {
          role: 'user',
          content: layer2Summary
        }
      ];
      const layer1Summary = await generateWithDelay(layer1Messages);

      // Store content in Redis with path information
      const contentUuid = crypto.randomUUID();
      const pathKey = currentPath.split(' > ').join(':');
      
      const client = await this.getRedisClientSafe();
      if (client) {
        try {
          await client.pipeline()
            .set(`content:${pathKey}:uuid`, contentUuid)
            .set(`content:${pathKey}:layer3`, layer3Content)
            .set(`content:${pathKey}:layer2`, layer2Summary)
            .set(`content:${pathKey}:layer1`, layer1Summary)
            .set(`content:${pathKey}:metadata`, JSON.stringify({
              version: 1,
              lastUpdated: new Date().toISOString(),
              parentPath: currentPath.split(' > '),
              level: depth,
              order: String(typeof section.order === 'string' ? parseInt(section.order, 10) : section.order || 0)
            }))
            .expire(`content:${pathKey}:uuid`, this.cacheTTL)
            .expire(`content:${pathKey}:layer3`, this.cacheTTL)
            .expire(`content:${pathKey}:layer2`, this.cacheTTL)
            .expire(`content:${pathKey}:layer1`, this.cacheTTL)
            .expire(`content:${pathKey}:metadata`, this.cacheTTL)
            .exec();
        } catch (error) {
          logError('[generateSectionContent] Redis pipeline error:', error);
        }
      }

      // Update concept in DB
      try {
        await this.prisma.$transaction(async (tx) => {
          const order = typeof section.order === 'string' ? parseInt(section.order, 10) : section.order || 0;

          const [existingConcept] = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id 
            FROM "Concept"
            WHERE title = ${section.title}
              AND level = ${depth}
              AND "order" = ${order}
            LIMIT 1;
          `;

          if (existingConcept) {
            await tx.$executeRaw`
              UPDATE "Concept"
              SET 
                content = ${layer3Content},
                "contentUuid" = ${contentUuid},
                "processingStatus" = 'completed',
                version = version + 1,
                "updatedAt" = NOW()
              WHERE id = ${existingConcept.id};
            `;
          } else {
            await tx.$executeRaw`
              INSERT INTO "Concept" (
                id,
                title,
                content,
                level,
                "order",
                "contentUuid",
                "processingStatus",
                version,
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${crypto.randomUUID()},
                ${section.title},
                ${layer3Content},
                ${depth},
                ${order},
                ${contentUuid},
                'completed',
                1,
                NOW(),
                NOW()
              );
            `;
          }
        });

        log('[generateSectionContent] Updated concept in database:', {
          title: section.title,
          contentUuid
        });
      } catch (error) {
        logError('[generateSectionContent] Error updating concept in DB:', {
          title: section.title,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      processedSections.count++;
      if (onProgress) {
        onProgress((processedSections.count / totalSections) * 100);
      }

      return layer3Content;
    } catch (error) {
      logError('[generateSectionContent] Error generating content:', {
        path: currentPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    const languageMap = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      it: 'Italian'
    };

    const language = languageMap[this.options.language as keyof typeof languageMap] || 'Spanish';
    const easyToUnderstand = this.options.easyToUnderstand
      ? 'but easy to understand. You must easily explain complex topics in such way that they are understandable to anyone...'
      : 'that would be used in academia';

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
    return `Generate a detailed explanation for the section "${path}" based on the following content. 
Focus only on the content relevant to this specific section and its immediate context.
Do not generate any headers - they will be added automatically.
Content to explain:

${rawContent}`;
  }

  private buildSummarySystemPrompt(layer: number): string {
    const percentage = layer === 1 ? '33%' : '60%';
    return `You are an expert summarizer. Your task is to create a concise summary that captures the essential information while reducing the content to approximately ${percentage} of its original length. 
Maintain academic language and key terminology. Focus on the most important concepts and their relationships.
The summary should be self-contained and understandable without reference to the full text.`;
  }

  /**
   * New method: findSectionInStructuredContent
   * Given a list of sections and a path (array of section titles),
   * recursively locate the matching section. Returns the content if found, else null.
   */
  private findSectionInStructuredContent(sections: Section[], path: string[]): string | null {
    if (!sections || path.length === 0) return null;
    
    const [current, ...rest] = path;
    let targetSection: Section | null = null;

    // Find the target section
    for (const section of sections) {
        if (section.title.trim() === current.trim()) {
            targetSection = section;
            break;
        }
    }

    if (!targetSection) return null;

    // If this is the final path segment, return full content including subsections
    if (rest.length === 0) {
        let content = targetSection.content || '';
        
        // Add subsection content recursively
        if (targetSection.subsections?.length) {
            content += '\n\n' + this.getSubsectionsContent(targetSection.subsections);
        }
        
        return content.trim() || null;
    }

    // Otherwise, continue searching in subsections
    if (targetSection.subsections?.length) {
        return this.findSectionInStructuredContent(targetSection.subsections, rest);
    }

    return null;
  }

  private getSubsectionsContent(subsections: Section[]): string {
    return subsections.map(subsection => {
        let content = subsection.content || '';
        
        if (subsection.subsections?.length) {
            content += '\n\n' + this.getSubsectionsContent(subsection.subsections);
        }
        
        return content;
    }).join('\n\n');
  }

  /**
   * New public method: getPartialContent
   * Allows retrieving a portion of the structured content given a path of section titles.
   * If the path isn't found, returns null. This is used by ExplanationService to do
   * partial retrieval for ALNS.
   */
  public async getPartialContent(sessionId: string, path: string[]): Promise<string | null> {
    try {
      const pathKey = path.join(':');
      
      // Try to get content directly from Redis first
      const { content } = await this.getCachedContent(pathKey);
      if (content) {
        log('[getPartialContent] Found content in Redis for path:', pathKey);
        return content;
      }

      // If not found, try to find parent content
      for (let i = path.length - 1; i >= 0; i--) {
        const parentPath = path.slice(0, i).join(':');
        if (!parentPath) continue;

        const { content: parentContent } = await this.getCachedContent(parentPath);
        if (parentContent) {
          log('[getPartialContent] Found parent content in Redis for path:', parentPath);
          return this.extractRelevantContent(parentContent, path.slice(i));
        }
      }

      return this.getPartialContentFromDB(sessionId, path);
    } catch (error) {
      logError('[getPartialContent] Error retrieving partial content:', error);
      return null;
    }
  }

  private async getPartialContentFromDB(sessionId: string, path: string[]): Promise<string | null> {
    const sessionDoc = await this.prisma.sessionDocument.findFirst({
        where: { sessionId },
        select: {
            structuredContent: true,
            id: true
        }
    });

    if (!sessionDoc?.structuredContent) {
        log('[getPartialContentFromDB] No structured content found for session:', sessionId);
        return null;
    }

    try {
        const parsed = JSON.parse(sessionDoc.structuredContent as string);
        if (!parsed.sections || !Array.isArray(parsed.sections)) {
            log('[getPartialContentFromDB] Invalid sections array in content for session:', sessionId);
            return null;
        }

        const content = this.findSectionInStructuredContent(parsed.sections, path);
        
        // Cache the found content in Redis for faster future access
        if (content) {
            const client = await this.getRedisClientSafe();
            if (client) {
                const pathKey = path.join(':');
                try {
                    await client.pipeline()
                        .set(`content:${pathKey}:layer3`, content)
                        .set(`content:${pathKey}:metadata`, JSON.stringify({
                            version: 1,
                            lastUpdated: new Date().toISOString(),
                            parentPath: path,
                            sessionId,
                            documentId: sessionDoc.id
                        }))
                        .expire(`content:${pathKey}:layer3`, this.cacheTTL)
                        .expire(`content:${pathKey}:metadata`, this.cacheTTL)
                        .exec();
                    
                    log('[getPartialContentFromDB] Cached content for future use:', { pathKey });
                } catch (error) {
                    logError('[getPartialContentFromDB] Error caching content:', error);
                }
            }
        }

        return content;
    } catch (error) {
        logError('[getPartialContentFromDB] Error parsing content:', error);
        return null;
    }
  }

  private extractRelevantContent(content: string, remainingPath: string[]): string | null {
    if (!remainingPath.length) return content;

    const lines = content.split('\n');
    let result = '';
    let currentSection = '';
    let inTargetSection = false;
    let targetDepth = 0;
    let currentDepth = 0;
    let foundTarget = false;

    // First pass: find the target section and its depth
    for (const line of lines) {
        const sectionMatch = line.match(/^(#+)\s+(.+)$/);
        if (sectionMatch) {
            const [, hashes, title] = sectionMatch;
            currentDepth = hashes.length;

            if (title.trim() === remainingPath[0].trim()) {
                foundTarget = true;
                targetDepth = currentDepth;
                break;
            }
        }
    }

    if (!foundTarget) return null;

    // Second pass: extract content including subsections
    for (const line of lines) {
        const sectionMatch = line.match(/^(#+)\s+(.+)$/);
        
        if (sectionMatch) {
            const [, hashes, title] = sectionMatch;
            currentDepth = hashes.length;

            // Found our target section
            if (title.trim() === remainingPath[0].trim() && currentDepth === targetDepth) {
                if (currentSection) {
                    result += currentSection + '\n';
                }
                inTargetSection = true;
                currentSection = line;
                continue;
            }

            // Found a new section at same or higher level
            if (inTargetSection && currentDepth <= targetDepth) {
                result += currentSection + '\n';
                inTargetSection = false;
                currentSection = '';
                continue;
            }

            // Found a subsection
            if (inTargetSection) {
                if (currentSection) {
                    result += currentSection + '\n';
                }
                currentSection = line;
                continue;
            }
        }

        // Add content lines
        if (inTargetSection) {
            currentSection += '\n' + line;
        }
    }

    // Add the last section if we were still in target
    if (inTargetSection && currentSection) {
        result += currentSection;
    }

    // Clean up the result
    result = result.trim();

    // If we have remaining path segments, recursively process them
    if (remainingPath.length > 1 && result) {
        return this.extractRelevantContent(result, remainingPath.slice(1));
    }

    return result || null;
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

      // Generate concept ID
      let id: string;
      if (level === 0) {
        id = sectionNumber ? sectionNumber : `${mainSectionCounter}.-`;
        mainSectionCounter++;
      } else {
        id = sectionNumber || `${parentId?.replace(/\.-$/, '')}.${level}`;
      }

      // Clean up the title by removing any leading numbers
      const cleanTitle = section.title
        .replace(/^\s*(?:\d+\.)+\s*/, '')
        .replace(/^[IVX]+\.\s*/, '')
        .trim();

      const conceptData: ConceptIndex = {
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

      // DB Save
      if (sessionId) {
        try {
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
            // Link session -> concept
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
          }
        } catch (error) {
          logError('[transformSectionsIntoConcepts] Error saving concept:', error);
        }
      }

      concepts.push(conceptData);

      // Process subsections recursively
      if (section.subsections?.length) {
        for (const subsection of section.subsections) {
          await processSection(subsection, conceptData.id, level + 1);
        }
      } else {
        // Fallback: parse content
        const lines = section.content?.split('\n') || [];
        let currentSubsection: Section | null = null;
        const subsections: Section[] = [];

        for (const line of lines) {
          const numberedSectionMatch = line.match(/^\s*(\d+(?:\.\d+){0,2}\.)\s(.+)$/);
          if (numberedSectionMatch) {
            const [, number, title] = numberedSectionMatch;
            const currentDepth = (number.match(/\./g) || []).length;

            if (currentDepth === level + 1) {
              if (currentSubsection) {
                subsections.push(currentSubsection);
              }
              currentSubsection = {
                title: `${number} ${title}`,
                content: ''
              };
            } else if (currentSubsection && currentDepth > level + 1) {
              currentSubsection.content += line + '\n';
            }
          } else if (currentSubsection) {
            currentSubsection.content += line + '\n';
          }
        }

        if (currentSubsection) {
          subsections.push(currentSubsection);
        }

        for (const subsection of subsections) {
          await processSection(subsection, conceptData.id, level + 1);
        }
      }
    };

    // Process all sections
    for (const section of sections) {
      await processSection(section);
    }

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

      // Check cache
      const cached = await this.getFromCache(rawContent, index, this.options.language!);
      if (cached) {
        try {
          const { structuredContent, concepts } = JSON.parse(cached);
          log('[generateStructuredDocument] Returning cached result');
          return { structuredContent, concepts };
        } catch (error) {
          log('[generateStructuredDocument] Error parsing cached result:', error);
        }
      }

      const totalSections = this.countTotalSections(index.sections || []);
      const BATCH_SIZE = 5;
      const processedSections = { count: 0 };
      const sectionContents: string[] = [];

      if (index.sections) {
        for (let i = 0; i < index.sections.length; i += BATCH_SIZE) {
          const batch = index.sections.slice(i, i + BATCH_SIZE);
          log('[generateStructuredDocument] Processing batch %d to %d', i, i + batch.length);

          const batchPromises = batch.map((section) =>
            this.generateSectionContent(section, rawContent, '', processedSections, totalSections, onProgress, 0)
          );

          const batchResults = await Promise.all(batchPromises);
          sectionContents.push(...batchResults);

          if (i + BATCH_SIZE < index.sections.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      const structuredContent = sectionContents.filter(Boolean).join('\n\n');

      // Transform sections -> concepts
      log('[generateStructuredDocument] Transforming sections into concepts');
      const concepts = await this.transformSectionsIntoConcepts(index.sections || [], index.sessionId);

      // Cache
      const result = { structuredContent, concepts };
      await this.setInCache(rawContent, index, this.options.language!, JSON.stringify(result));

      return result;
    } catch (error) {
      logError('[generateStructuredDocument] Error:', error);
      throw error;
    }
  }

  private countTotalSections(sections: Section[]): number {
    if (!sections || !Array.isArray(sections)) {
      return 0;
    }

    let totalCount = 0;
    for (const section of sections) {
      if (!section.content) {
        continue;
      }
      const mainSectionRegex = /^\s*\d+\.\s/gm;
      const mainSections = (section.content.match(mainSectionRegex) || []).length;

      const subSectionRegex = /^\s*\d+\.\d+\.\s/gm;
      const subSections = (section.content.match(subSectionRegex) || []).length;

      const detailedSectionRegex = /^\s*\d+\.\d+\.\d+\.\s/gm;
      const detailedSections = (section.content.match(detailedSectionRegex) || []).length;

      totalCount += mainSections + subSections + detailedSections;
    }
    return totalCount;
  }
}
