import { prisma } from "@/lib/db/prisma";
import { addDays } from "date-fns";

// SuperMemo 2 algorithm parameters
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const EASE_BONUS = 0.15;
const EASE_PENALTY = 0.2;

interface ReviewResult {
  quality: number; // 0 to 5, where 5 is perfect recall
  timeTaken: number; // in seconds
}

export async function scheduleReview(
  userId: string,
  learningUnitId: string,
  result: ReviewResult
) {
  // Get current progress
  const progress = await prisma.progress.findUnique({
    where: {
      userId_learningUnitId: {
        userId,
        learningUnitId,
      },
    },
  });

  if (!progress) {
    throw new Error("Progress not found");
  }

  // Calculate new review schedule
  const { nextReview, newConfidence } = calculateNextReview(
    result.quality,
    progress.confidence
  );

  // Update progress
  await prisma.progress.update({
    where: {
      id: progress.id,
    },
    data: {
      confidence: newConfidence,
      lastReviewed: new Date(),
      nextReview,
      status: newConfidence >= 80 ? "COMPLETED" : "IN_PROGRESS",
    },
  });

  return { nextReview, confidence: newConfidence };
}

function calculateNextReview(
  quality: number,
  currentConfidence: number
): { nextReview: Date; newConfidence: number } {
  // Convert quality (0-5) to ease factor
  const ease = Math.max(
    MIN_EASE,
    DEFAULT_EASE + (quality >= 3 ? EASE_BONUS : -EASE_PENALTY)
  );

  // Calculate new confidence
  const confidenceChange = quality >= 3 ? 10 : -5;
  const newConfidence = Math.min(100, Math.max(0, currentConfidence + confidenceChange));

  // Calculate next review interval based on confidence and ease
  const interval = calculateInterval(newConfidence, ease);
  const nextReview = addDays(new Date(), interval);

  return { nextReview, newConfidence };
}

function calculateInterval(confidence: number, ease: number): number {
  if (confidence < 30) return 1; // Review tomorrow
  if (confidence < 50) return 2; // Review in 2 days
  if (confidence < 70) return Math.ceil(3 * ease); // Review in 3-7 days
  if (confidence < 90) return Math.ceil(7 * ease); // Review in 7-17 days
  return Math.ceil(14 * ease); // Review in 14-35 days
}

export async function getDueReviews(userId: string) {
  const now = new Date();

  return prisma.progress.findMany({
    where: {
      userId,
      nextReview: {
        lte: now,
      },
      status: {
        not: "COMPLETED",
      },
    },
    include: {
      learningUnit: {
        include: {
          questions: true,
        },
      },
    },
    orderBy: {
      nextReview: "asc",
    },
  });
}

export async function getReviewStats(userId: string) {
  const progress = await prisma.progress.findMany({
    where: {
      userId,
    },
    select: {
      confidence: true,
      status: true,
      lastReviewed: true,
    },
  });

  const totalUnits = progress.length;
  const completedUnits = progress.filter((p) => p.status === "COMPLETED").length;
  const averageConfidence =
    progress.reduce((sum, p) => sum + p.confidence, 0) / totalUnits;

  const recentlyReviewed = progress.filter(
    (p) => p.lastReviewed > addDays(new Date(), -7)
  ).length;

  return {
    totalUnits,
    completedUnits,
    averageConfidence,
    recentlyReviewed,
  };
} 