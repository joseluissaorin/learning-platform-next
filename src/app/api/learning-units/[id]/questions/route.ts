import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { QuestionType } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const questions = await prisma.question.findMany({
      where: {
        learningUnitId: params.id,
        learningUnit: {
          userId: session.user.id
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { text, type, options, explanation } = body;

    // Validate the learning unit belongs to the user
    const learningUnit = await prisma.learningUnit.findUnique({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!learningUnit) {
      return NextResponse.json(
        { error: 'Learning unit not found' },
        { status: 404 }
      );
    }

    // Create the question
    const question = await prisma.question.create({
      data: {
        text,
        type: type as QuestionType,
        options: type === 'MULTIPLE_CHOICE' ? options : undefined,
        explanation,
        learningUnitId: params.id
      }
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate the question belongs to the user
    const question = await prisma.question.findFirst({
      where: {
        id: params.id,
        learningUnit: {
          userId: session.user.id
        }
      }
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete the question
    await prisma.question.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
} 