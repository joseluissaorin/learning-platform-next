import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { type AnalysisResult } from '@/types/upload';
import { StructuredDocumentService } from '@/lib/services/structured-document-service';
import { env } from '@/lib/env';
import debug from 'debug';

const log = debug('app:api:sessions:document');
const logError = debug('app:api:sessions:document:error');

interface CreateDocumentRequest {
  title: string;
  content: string;
  index: AnalysisResult['index'];
  language: string;
}

interface LearningSessionResult {
  id: string;
  title: string;
  userId: string;
  concepts: any[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionDocumentResult {
  id: string;
  title: string;
  content: string;
  structuredContent: any;
  concepts: any[];
  index: AnalysisResult['index'];
  metadata: { language: string };
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

function transformIndex(rawIndex: any) {
  log('Transforming index structure %O', { rawIndex });

  // If it's already in the correct format, return it
  if (rawIndex && typeof rawIndex === 'object' && !Array.isArray(rawIndex) && Array.isArray(rawIndex.sections)) {
    log('Index already in correct format');
    return rawIndex;
  }

  // If it's an array, wrap it in an object with sections property
  if (Array.isArray(rawIndex)) {
    log('Converting array to sections object');
    return { sections: rawIndex };
  }

  // If it has an index property that's an array, use that as sections
  if (rawIndex && typeof rawIndex === 'object' && Array.isArray(rawIndex.index)) {
    log('Using index array from object');
    return { sections: rawIndex.index };
  }

  logError('Invalid index structure %O', rawIndex);
  throw new Error('Invalid index structure');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logError('Unauthorized request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    log('Processing request %O', {
      hasTitle: !!body.title,
      contentLength: body.content?.length,
      hasIndex: !!body.index,
      language: body.language
    });

    const { title, content, index, language } = body;

    // Validate request
    if (!title || !content || !index || !language) {
      logError('Missing required fields %O', { title: !!title, content: !!content, index: !!index, language: !!language });
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Transform the index into the correct structure
    const transformedIndex = transformIndex(index);
    log('Index transformed %O', {
      sectionsCount: transformedIndex.sections?.length
    });

    // Initialize service with options
    const structuredDocService = new StructuredDocumentService({
      language,
      easyToUnderstand: true
    });

    // Generate document and transform concepts
    log('Starting document generation and concept transformation');
    const { structuredContent } = await structuredDocService.generateStructuredDocument(
      content,
      transformedIndex,
      (progress) => {
        log('Generation progress: %d%', progress);
      }
    );

    // Transform sections into concepts even if content was cached
    log('Transforming sections into concepts');
    const concepts = await structuredDocService.transformSectionsIntoConcepts(transformedIndex.sections || []);

    // Validate concept structure
    if (!Array.isArray(concepts) || concepts.length === 0) {
      log('Error: Invalid concept array structure');
      return NextResponse.json(
        { error: "Invalid concept structure: Empty or invalid array" },
        { status: 400 }
      );
    }

    // Validate each concept
    for (const concept of concepts) {
      if (!concept.title || typeof concept.level !== 'number' || typeof concept.order !== 'number') {
        log('Error: Invalid concept structure %O', concept);
        return NextResponse.json(
          { error: `Invalid concept structure: Missing required fields for concept "${concept.title || 'unknown'}"` },
          { status: 400 }
        );
      }

      // Validate parent-child relationships
      if (concept.parentId) {
        const parentExists = concepts.some(c => c.id === concept.parentId);
        if (!parentExists) {
          log('Error: Invalid parent reference %O', {
            conceptTitle: concept.title,
            parentId: concept.parentId
          });
          return NextResponse.json(
            { error: `Invalid concept structure: Parent concept not found for "${concept.title}"` },
            { status: 400 }
          );
        }
      }
    }

    log('Document generated successfully %O', {
      contentLength: structuredContent.length,
      conceptCount: concepts.length,
      concepts: concepts.map(c => ({
        id: c.id,
        title: c.title,
        level: c.level,
        order: c.order,
        parentId: c.parentId
      }))
    });

    // Create a new learning session and its concepts using a transaction
    const result = await prisma.$transaction(async (tx) => {
      log('Starting transaction for session and concept creation');
      
      try {
        // 1. Create the learning session
        log('Creating learning session with title: %s', title);
        const learningSession = await tx.learningSession.create({
          data: {
            title,
            userId: session.user.id,
            concepts: [],
            status: 'active',
            progress: 0
          }
        });

        if (!learningSession?.id) {
          throw new Error('Failed to create learning session: No ID returned');
        }

        const sessionId = learningSession.id;
        log('Created learning session with ID: %s', sessionId);

        // 2. Create concepts and their relationships
        log('Starting concept creation, total concepts: %d', concepts.length);
        
        // First, create a map to store concept IDs
        const conceptIdMap = new Map<string, string>();
        
        // Sort concepts by level to ensure parents are created before children
        const sortedConcepts = [...concepts].sort((a, b) => a.level - b.level);
        
        // Batch concept creation for better performance
        const batchSize = 50;
        for (let i = 0; i < sortedConcepts.length; i += batchSize) {
          const batch = sortedConcepts.slice(i, i + batchSize);
          log('Processing concept batch %d-%d of %d', i, i + batch.length, sortedConcepts.length);

          await Promise.all(batch.map(async (concept) => {
            // Create or update the concept
            const dbConcept = await tx.concept.upsert({
              where: {
                title_level_order: {
                  title: concept.title,
                  level: concept.level || 0,
                  order: concept.order || 0
                }
              },
              create: {
                title: concept.title,
                content: concept.content || '',
                level: concept.level || 0,
                order: concept.order || 0,
                parentId: concept.parentId ? conceptIdMap.get(concept.parentId) : null
              },
              update: {
                content: concept.content || '',
                parentId: concept.parentId ? conceptIdMap.get(concept.parentId) : null
              }
            });

            // Store the concept's database ID in the map
            conceptIdMap.set(concept.id, dbConcept.id);
            log('Created/Updated concept with ID: %s', dbConcept.id);

            // Create session-concept relationship
            await tx.sessionConcept.upsert({
              where: {
                sessionId_conceptId: {
                  sessionId,
                  conceptId: dbConcept.id
                }
              },
              create: {
                sessionId,
                conceptId: dbConcept.id,
                progress: 0,
                status: 'not_started'
              },
              update: {}
            });

            log('Created session-concept relationship for concept: %s', concept.title);
          }));
        }

        // 3. Create the session document
        log('Creating session document');
        
        // Safely stringify JSON data
        const safeStructuredContent = structuredContent ? JSON.stringify(structuredContent) : '{}';
        const safeIndex = transformedIndex ? JSON.stringify(transformedIndex) : '{"sections":[]}';
        const safeMetadata = { language };

        log('Prepared JSON data for session document: %O', {
          structuredContentLength: safeStructuredContent.length,
          indexSections: transformedIndex?.sections?.length || 0,
          metadata: safeMetadata
        });

        const sessionDocument = await tx.sessionDocument.create({
          data: {
            title,
            content,
            structuredContent: safeStructuredContent as any,
            index: safeIndex as any,
            metadata: safeMetadata as any,
            sessionId
          }
        });

        if (!sessionDocument?.id) {
          throw new Error('Failed to create session document: No ID returned');
        }

        log('Created session document with ID: %s', sessionDocument.id);

        return {
          sessionId,
          documentId: sessionDocument.id
        };
      } catch (txError) {
        log('Transaction failed: %O', {
          error: txError instanceof Error ? txError.message : 'Unknown error',
          step: 'transaction execution'
        });
        throw txError;
      }
    }, {
      timeout: 30000, // Increase timeout to 30 seconds
      maxWait: 35000  // Maximum time to wait for transaction to start
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err) {
    // Safely extract error details without source map dependencies
    const errorDetails = {
      message: err instanceof Error ? err.message : 'An unknown error occurred',
      type: err instanceof Error ? err.constructor.name : typeof err,
      data: err instanceof Error ? undefined : err
    };

    // Log the error without source map information
    logError('Session document creation failed: %j', {
      error: errorDetails.message,
      type: errorDetails.type
    });

    // Return a clean error response
    return NextResponse.json({
      error: errorDetails.message,
      type: errorDetails.type
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 