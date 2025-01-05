import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { DocumentProcessor } from '@/lib/processing/document-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Get document from database
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        userId: session.user.id // Ensure user owns the document
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get processing status
    const processor = DocumentProcessor.getInstance();
    const status = await processor.getStatus(documentId);

    return NextResponse.json({
      id: document.id,
      title: document.title,
      status: document.status,
      processing: status ? {
        stage: status.stage,
        progress: status.progress,
        error: status.error
      } : null
    });

  } catch (error) {
    console.error('Error getting document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
} 