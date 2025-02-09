import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/env.mjs";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis/client";
import fs from "fs";
import path from "path";
import { type GenerateContentResult } from "@google/generative-ai";
import { type ConceptExplanation } from "@prisma/client";
import { logger } from '@/lib/debug/logger';

interface ConceptRelation {
  sourceId: string;
  targetId: string;
  type: 'parent' | 'prerequisite';
  sessionId: string;
}

interface GenerateRequest {
  conceptId: string;
  layer: number;
  parentContext?: string;
  conceptTitle: string;
  isLeafNode: boolean;
  sourceContent?: string;
  documentContent: string;  // Full document content
  sessionId: string;
  parentTitles?: string[];
  parentId?: string;
  prerequisites?: string[];
  relatedConcepts?: Array<{
    id: string;
    title: string;
    relationship: string;
  }>;
}

interface ExplanationResponse {
  content: string;
  fromCache: boolean;
  relations?: ConceptRelation[];
}

export class ConceptGenerationService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private redis: ReturnType<typeof getRedisClient> | null = null;

  constructor() {
    // Initialize with a placeholder key, will be set per request
    this.genAI = new GoogleGenerativeAI('placeholder-key');
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    logger.info('ConceptGenerationService', 'Initialized with placeholder key');

    if (typeof window === 'undefined') {
      this.redis = getRedisClient();
    }
  }

  private getCacheKey(conceptId: string, layer: number): string {
    return `concept:${conceptId}:${layer}`;
  }

  private async getFromCache(conceptId: string, layer: number): Promise<string | null> {
    if (typeof window !== 'undefined' || !this.redis) return null;
    const cacheKey = this.getCacheKey(conceptId, layer);
    return this.redis.get(cacheKey);
  }

  private async setInCache(conceptId: string, layer: number, content: string): Promise<void> {
    if (typeof window !== 'undefined' || !this.redis) return;
    const cacheKey = this.getCacheKey(conceptId, layer);
    await this.redis.set(cacheKey, content, "EX", 3600); // 1 hour
  }

  private async getFromDatabase(conceptId: string, layer: number): Promise<string | null> {
    const explanation = await prisma.$transaction(async (tx) => {
      return tx.conceptExplanation.findFirst({
        where: {
          conceptId,
          layer
        }
      });
    });
    return explanation?.content || null;
  }

  private async saveToDatabase(data: GenerateRequest, content: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.conceptExplanation.upsert({
        where: {
          conceptId_layer_sessionId: {
            conceptId: data.conceptId,
            layer: data.layer,
            sessionId: data.sessionId
          }
        },
        create: {
          conceptId: data.conceptId,
          layer: data.layer,
          content,
          sessionId: data.sessionId
        },
        update: {
          content
        }
      });
    });
  }

  private getFullConceptPath(data: GenerateRequest): string {
    if (data.layer === 1) {
      return data.conceptTitle;
    }
    
    if (data.layer === 2 && data.parentTitles?.[0]) {
      return `${data.parentTitles[0]} / ${data.conceptTitle}`;
    }
    
    if (data.layer === 3 && data.parentTitles?.[0] && data.parentTitles?.[1]) {
      return `${data.parentTitles[0]} / ${data.parentTitles[1]} / ${data.conceptTitle}`;
    }
    
    return data.conceptTitle; // Fallback
  }

  private loadPromptTemplate(): string {
    const promptPath = path.join(process.cwd(), 'src/lib/prompts/concept-generation.md');
    console.log('[Prompt Loading] Loading prompt from:', promptPath);
    
    const promptContent = fs.readFileSync(promptPath, 'utf8');
    console.log('[Prompt Loading] Prompt content length:', promptContent.length);
    console.log('[Prompt Loading] First 1000 chars:', promptContent.substring(0, 1000));
    
    return promptContent;
  }

  private async generateExplanation(data: GenerateRequest): Promise<string> {
    try {
      // Load prompt template every time
      console.log('[Generation] Loading prompt template for concept:', data.conceptTitle);
      const promptTemplate = this.loadPromptTemplate();

      // Get the full concept path
      const conceptPath = this.getFullConceptPath(data);
      console.log('[Generation] Full concept path:', conceptPath);

      // Build related concepts string
      const relatedConceptsStr = data.relatedConcepts?.map(rc => 
        `${rc.title} (${rc.relationship})`
      ).join('\n') || '';
      console.log('[Generation] Related concepts:', relatedConceptsStr || 'None');

      // Format the prompt with the data
      const prompt = promptTemplate
        .replace('{{conceptPath}}', conceptPath)
        .replace('{{layer}}', data.layer.toString())
        .replace('{{parentContext}}', data.parentContext || '')
        .replace('{{conceptTitle}}', conceptPath)
        .replace('{{isLeafNode}}', data.isLeafNode.toString())
        .replace('{{sourceContent}}', data.sourceContent || '')
        .replace('{{documentContent}}', data.documentContent)
        .replace('{{relatedConcepts}}', relatedConceptsStr);

      console.log('[Generation] Final prompt structure:', {
        conceptPath,
        layer: data.layer,
        hasParentContext: !!data.parentContext,
        isLeafNode: data.isLeafNode,
        hasSourceContent: !!data.sourceContent,
        documentContentLength: data.documentContent.length,
        relatedConceptsCount: data.relatedConcepts?.length || 0
      });

      // Generate content
      console.log('[Generation] Sending request to Gemini...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      console.log('[Generation] Received response length:', content.length);
      console.log('[Generation] First 100 chars of response:', content.substring(0, 100));

      // Validate content length based on layer requirements
      const paragraphCount = (content.match(/\n\n/g) || []).length + 1;
      const minParagraphs = data.layer === 1 ? 4 : data.layer === 2 ? 6 : 8;
      
      console.log('[Generation] Content validation:', {
        paragraphCount,
        minParagraphs,
        isValid: paragraphCount >= minParagraphs
      });
      
      if (paragraphCount < minParagraphs) {
        console.warn(`Generated content has fewer paragraphs (${paragraphCount}) than required (${minParagraphs}). Regenerating...`);
        return this.generateExplanation(data); // Retry generation
      }

      return content;
    } catch (error) {
      console.error('Error generating explanation:', error);
      throw error;
    }
  }

  private validateConceptHierarchy(data: GenerateRequest): void {
    // Validate layer-specific requirements
    if (data.layer === 2 && (!data.parentTitles || data.parentTitles.length < 1)) {
      throw new Error('Layer 2 concepts require a parent title');
    }

    if (data.layer === 3 && (!data.parentTitles || data.parentTitles.length < 2)) {
      throw new Error('Layer 3 concepts require both layer 1 and layer 2 parent titles');
    }

    // Validate parent ID if provided
    if (data.parentId && !data.parentTitles?.length) {
      throw new Error('Parent ID provided but missing parent titles');
    }

    // Validate document content
    if (!data.documentContent) {
      throw new Error('Full document content is required for context');
    }

    // No longer validating sourceContent as it's optional
    console.log('[Concept Generation] Validating concept:', {
      layer: data.layer,
      hasParentTitles: !!data.parentTitles?.length,
      hasParentId: !!data.parentId,
      documentContentLength: data.documentContent.length,
      hasSourceContent: !!data.sourceContent
    });
  }

  private async trackConceptRelations(data: GenerateRequest): Promise<ConceptRelation[]> {
    const relations: ConceptRelation[] = [];

    // Track parent relationship if parent ID is provided
    if (data.parentId) {
      relations.push({
        sourceId: data.conceptId,
        targetId: data.parentId,
        type: 'parent',
        sessionId: data.sessionId
      });
    }

    // Track prerequisites if provided
    if (data.prerequisites?.length) {
      for (const prereqId of data.prerequisites) {
        relations.push({
          sourceId: data.conceptId,
          targetId: prereqId,
          type: 'prerequisite',
          sessionId: data.sessionId
        });
      }
    }

    // Store relations in database
    await prisma.$transaction(async (tx) => {
      for (const relation of relations) {
        await tx.conceptRelation.upsert({
          where: {
            sourceId_targetId_type: {
              sourceId: relation.sourceId,
              targetId: relation.targetId,
              type: relation.type
            }
          },
          create: {
            ...relation,
            id: crypto.randomUUID()
          },
          update: relation
        });
      }
    });

    return relations;
  }

  public async generateContent(data: GenerateRequest, forceGeneration: boolean = false): Promise<ExplanationResponse> {
    try {
      this.validateConceptHierarchy(data);

      // Skip cache and database if forcing generation
      if (!forceGeneration) {
        // Try to get from cache first
        const cachedContent = await this.getFromCache(data.conceptId, data.layer);
        if (cachedContent) {
          return { content: cachedContent, fromCache: true };
        }

        // Try to get from database
        const dbContent = await this.getFromDatabase(data.conceptId, data.layer);
        if (dbContent) {
          // Store in cache for future use
          await this.setInCache(data.conceptId, data.layer, dbContent);
          return { content: dbContent, fromCache: true };
        }
      }

      // Generate new content
      const content = await this.generateExplanation(data);
      
      // Track concept relations
      const relations = await this.trackConceptRelations(data);

      // Store in database and cache
      await this.saveToDatabase(data, content);
      await this.setInCache(data.conceptId, data.layer, content);

      return { content, fromCache: false, relations };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  public async invalidateCache(conceptId: string, layer: number): Promise<void> {
    if (typeof window !== 'undefined' || !this.redis) return;
    const cacheKey = this.getCacheKey(conceptId, layer);
    await this.redis.del(cacheKey);
  }

  public async regenerateContent(data: GenerateRequest): Promise<ExplanationResponse> {
    console.log('[Regeneration] Starting regeneration for concept:', {
      conceptId: data.conceptId,
      layer: data.layer,
      title: data.conceptTitle
    });

    // Invalidate cache
    console.log('[Regeneration] Invalidating cache...');
    await this.invalidateCache(data.conceptId, data.layer);

    // Generate new content
    console.log('[Regeneration] Generating new content...');
    const generatedContent = await this.generateExplanation(data);
    
    // Update database and cache
    console.log('[Regeneration] Updating database and cache...');
    await prisma.$transaction(async (tx) => {
      await tx.conceptExplanation.updateMany({
        where: {
          conceptId: data.conceptId,
          layer: data.layer,
          sessionId: data.sessionId
        },
        data: {
          content: generatedContent
        }
      });
    });

    await this.setInCache(data.conceptId, data.layer, generatedContent);
    console.log('[Regeneration] Process completed');

    return { content: generatedContent, fromCache: false };
  }
} 