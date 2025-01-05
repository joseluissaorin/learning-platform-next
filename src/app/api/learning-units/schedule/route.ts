import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// Constants for spaced repetition intervals (in days)
const REVIEW_INTERVALS = {
  LEVEL_1: 1,    // Next day
  LEVEL_2: 3,    // 3 days later
  LEVEL_3: 7,    // 1 week later
  LEVEL_4: 14,   // 2 weeks later
  LEVEL_5: 30,   // 1 month later
  LEVEL_6: 90,   // 3 months later
  LEVEL_7: 180,  // 6 months later
};

// Validation schema for scheduling request
const scheduleSchema = z.object({
  unitIds: z.array(z.string()),
  confidence: z.number().int().min(0).max(100)
});

function calculateNextReview(confidence: number): Date {
  // Calculate review interval based on confidence level
  let interval = REVIEW_INTERVALS.LEVEL_1;
  if (confidence >= 95) interval = REVIEW_INTERVALS.LEVEL_7;
  else if (confidence >= 90) interval = REVIEW_INTERVALS.LEVEL_6;
  else if (confidence >= 80) interval = REVIEW_INTERVALS.LEVEL_5;
  else if (confidence >= 70) interval = REVIEW_INTERVALS.LEVEL_4;
  else if (confidence >= 60) interval = REVIEW_INTERVALS.LEVEL_3;
  else if (confidence >= 40) interval = REVIEW_INTERVALS.LEVEL_2;

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return nextReview;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = scheduleSchema.parse(body);

    // Calculate next review date
    const nextReview = calculateNextReview(validatedData.confidence);

    // Update progress for all units
    const updates = await prisma.$transaction(
      validatedData.unitIds.map(unitId =>
        prisma.progress.update({
          where: {
            userId_learningUnitId: {
              userId: session.user.id,
              learningUnitId: unitId
            }
          },
          data: {
            nextReview,
            confidence: validatedData.confidence,
            status: validatedData.confidence >= 80 ? 'COMPLETED' : 'IN_PROGRESS'
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      nextReview,
      updates
    });

  } catch (error) {
    console.error('Error scheduling reviews:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to schedule reviews' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current date
    const now = new Date();

    // Get all units due for review
    const dueReviews = await prisma.progress.findMany({
      where: {
        userId: session.user.id,
        nextReview: {
          lte: now
        },
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        learningUnit: {
          select: {
            title: true,
            content: true,
            difficulty: true,
            document: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        nextReview: 'asc'
      }
    });

    return NextResponse.json({
      reviews: dueReviews.map(review => ({
        id: review.learningUnitId,
        title: review.learningUnit.title,
        content: review.learningUnit.content,
        difficulty: review.learningUnit.difficulty,
        document: review.learningUnit.document.title,
        lastReviewed: review.lastReviewed,
        confidence: review.confidence,
        status: review.status
      }))
    });

  } catch (error) {
    console.error('Error getting due reviews:', error);
    return NextResponse.json(
      { error: 'Failed to get due reviews' },
      { status: 500 }
    );
  }
} 