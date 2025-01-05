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

    log('Document generated successfully %O', {
      contentLength: structuredContent.length,
      conceptCount: concepts.length
    });

    // Create a new learning session using raw SQL
    log('Creating learning session');
    const learningSession = await prisma.$queryRaw<LearningSessionResult[]>`
      INSERT INTO "LearningSession" (
        "id",
        "title",
        "userId",
        "concepts",
        "status",
        "createdAt",
        "updatedAt",
        "lastActiveAt",
        "progress"
      )
      VALUES (
        gen_random_uuid(), 
        ${title}, 
        ${session.user.id}, 
        ${JSON.stringify(concepts)}::jsonb[], 
        'active',
        NOW(),
        NOW(),
        NOW(),
        0
      )
      RETURNING *;
    `;

    if (!learningSession?.[0]?.id) {
      logError('Failed to create learning session %O', learningSession);
      return new NextResponse('Failed to create learning session', { status: 500 });
    }

    const sessionId = learningSession[0].id;
    log('Learning session created %s', sessionId);

    // Add sessionId to the transformed index
    transformedIndex.sessionId = sessionId;

    // Create the session document using raw SQL
    log('Creating session document');
    const sessionDocument = await prisma.$queryRaw<SessionDocumentResult[]>`
      INSERT INTO "SessionDocument" (
        "id",
        "title",
        "content",
        "structuredContent",
        "concepts",
        "index",
        "metadata",
        "sessionId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${title},
        ${content},
        ${JSON.stringify(structuredContent)}::jsonb,
        ${JSON.stringify(concepts)}::jsonb,
        ${JSON.stringify(transformedIndex)}::jsonb,
        ${JSON.stringify({ language })}::jsonb,
        ${sessionId},
        NOW(),
        NOW()
      )
      RETURNING *;
    `;

    if (!sessionDocument?.[0]?.id) {
      logError('Failed to create session document %O', sessionDocument);
      return new NextResponse('Failed to create session document', { status: 500 });
    }

    log('Session document created %s', sessionDocument[0].id);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        documentId: sessionDocument[0].id
      }
    });
  } catch (err) {
    // Safely format error for logging
    const errorDetails = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'UnknownError',
      code: (err as any)?.code,
      stack: err instanceof Error ? err.stack : undefined
    };
    
    logError('Error creating session document: %j', errorDetails);
    
    return new NextResponse(
      JSON.stringify({
        error: errorDetails.message
      }), 
      { status: 500 }
    );
  }
} 