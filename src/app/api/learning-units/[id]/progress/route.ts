import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { ProgressStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for progress update
const progressSchema = z.object({
  status: z.nativeEnum(ProgressStatus),
  confidence: z.number().int().min(0).max(100),
  nextReview: z.string().datetime().optional()
});

export async function POST(
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

    const unitId = params.id;

    // Check learning unit ownership
    const learningUnit = await prisma.learningUnit.findFirst({
      where: {
        id: unitId,
        document: {
          userId: session.user.id
        }
      }
    });

    if (!learningUnit) {
      return NextResponse.json(
        { error: 'Learning unit not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = progressSchema.parse(body);

    // Create or update progress
    const progress = await prisma.progress.upsert({
      where: {
        userId_learningUnitId: {
          userId: session.user.id,
          learningUnitId: unitId
        }
      },
      create: {
        userId: session.user.id,
        learningUnitId: unitId,
        status: validatedData.status,
        confidence: validatedData.confidence,
        nextReview: validatedData.nextReview ? new Date(validatedData.nextReview) : null
      },
      update: {
        status: validatedData.status,
        confidence: validatedData.confidence,
        nextReview: validatedData.nextReview ? new Date(validatedData.nextReview) : null,
        lastReviewed: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
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

    const unitId = params.id;

    // Get progress
    const progress = await prisma.progress.findUnique({
      where: {
        userId_learningUnitId: {
          userId: session.user.id,
          learningUnitId: unitId
        }
      }
    });

    if (!progress) {
      return NextResponse.json({
        progress: {
          status: 'NOT_STARTED',
          confidence: 0,
          nextReview: null,
          lastReviewed: null
        }
      });
    }

    return NextResponse.json({
      progress
    });

  } catch (error) {
    console.error('Error getting progress:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
} 