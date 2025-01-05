import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Document, LearningUnit, Question } from '@prisma/client';

interface DocumentWithUnits extends Document {
  learningUnits: Array<LearningUnit & {
    questions: Question[];
  }>;
}

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

    // Get document with learning units and questions
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        userId: session.user.id // Ensure user owns the document
      },
      include: {
        learningUnits: {
          include: {
            questions: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    }) as DocumentWithUnits | null;

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document is ready
    if (document.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Document is still processing' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: document.id,
      title: document.title,
      content: document.content,
      learningUnits: document.learningUnits.map((unit: LearningUnit & { questions: Question[] }) => ({
        id: unit.id,
        title: unit.title,
        content: unit.content,
        description: unit.description,
        prerequisites: unit.prerequisites,
        objectives: unit.objectives,
        estimatedTime: unit.estimatedTime,
        difficulty: unit.difficulty,
        order: unit.order,
        questions: unit.questions.map((question: Question) => ({
          id: question.id,
          text: question.text,
          type: question.type,
          options: question.options,
          explanation: question.explanation
        }))
      }))
    });

  } catch (error) {
    console.error('Error retrieving document:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if document exists and belongs to user
    const document = await prisma.document.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Delete document and all related data
    await prisma.document.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Check if document exists and belongs to user
    const document = await prisma.document.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: {
        id: params.id,
      },
      data: {
        status,
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
} 