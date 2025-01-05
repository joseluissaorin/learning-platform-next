import { type StudyAnalytics, type Concept, type LearningSession } from "@/types/learning";

export function calculateStudyAnalytics(
  session: LearningSession,
  dailyProgress: Array<{
    date: Date;
    timeSpent: number;
    conceptsReviewed: number;
    averageMastery: number;
  }>,
): StudyAnalytics {
  // Calculate concept mastery
  const conceptMastery = session.concepts.map((concept) => ({
    conceptId: concept.id,
    masteryLevel: concept.masteryLevel,
    lastReviewed: concept.lastReviewed || new Date(),
    reviewCount: concept.reviewCount,
  }));

  // Analyze learning patterns
  const learningPatterns = analyzeLearningPatterns(dailyProgress);

  return {
    dailyProgress,
    conceptMastery,
    learningPatterns,
  };
}

function analyzeLearningPatterns(
  dailyProgress: StudyAnalytics["dailyProgress"],
): StudyAnalytics["learningPatterns"] {
  // Find the best time of day for studying
  const timeOfDayProgress = new Map<number, { total: number; count: number }>();
  
  dailyProgress.forEach((day) => {
    const hour = new Date(day.date).getHours();
    const current = timeOfDayProgress.get(hour) || { total: 0, count: 0 };
    timeOfDayProgress.set(hour, {
      total: current.total + day.averageMastery,
      count: current.count + 1,
    });
  });

  let bestHour = 0;
  let bestAverage = 0;
  
  timeOfDayProgress.forEach((progress, hour) => {
    const average = progress.total / progress.count;
    if (average > bestAverage) {
      bestAverage = average;
      bestHour = hour;
    }
  });

  // Calculate average session length
  const averageSessionLength =
    dailyProgress.reduce((sum, day) => sum + day.timeSpent, 0) /
    dailyProgress.length;

  // Calculate recommended review intervals based on mastery progression
  const recommendedReviewIntervals = calculateRecommendedIntervals(dailyProgress);

  return {
    bestTimeOfDay: `${bestHour}:00`,
    averageSessionLength,
    mostChallengingConcepts: [], // TODO: Implement this
    recommendedReviewIntervals,
  };
}

function calculateRecommendedIntervals(
  dailyProgress: StudyAnalytics["dailyProgress"],
): number[] {
  // Calculate intervals that led to the best mastery improvements
  const masteryChanges = dailyProgress
    .slice(1)
    .map((day, index) => ({
      interval: (day.date.getTime() - dailyProgress[index].date.getTime()) / (1000 * 60 * 60),
      improvement: day.averageMastery - dailyProgress[index].averageMastery,
    }))
    .filter((change) => change.improvement > 0)
    .sort((a, b) => b.improvement - a.improvement);

  // Return top 3 most effective intervals
  return masteryChanges
    .slice(0, 3)
    .map((change) => Math.round(change.interval));
}

export function updateSessionAnalytics(
  session: LearningSession,
  timeSpent: number,
  conceptsReviewed: number,
): LearningSession {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));

  // Update analytics
  return {
    ...session,
    totalStudyTime: session.totalStudyTime + timeSpent,
    analytics: {
      ...session.analytics,
      timeSpentTotal: session.analytics.timeSpentTotal + timeSpent,
      timeSpentToday:
        session.lastStudyDate?.getTime() === today.getTime()
          ? session.analytics.timeSpentToday + timeSpent
          : timeSpent,
      conceptsLearned: session.analytics.conceptsLearned + conceptsReviewed,
      reviewsCompleted: session.analytics.reviewsCompleted + 1,
      averageMastery:
        session.concepts.reduce((sum, concept) => sum + concept.masteryLevel, 0) /
        session.concepts.length,
    },
    lastStudyDate: now,
    studyStreak:
      session.lastStudyDate &&
      now.getTime() - session.lastStudyDate.getTime() <= 24 * 60 * 60 * 1000
        ? session.studyStreak + 1
        : 1,
  };
} 