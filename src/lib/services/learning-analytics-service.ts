import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { type AssessmentResult } from "./assessment-service";

export interface LearningMetrics {
  retentionRate: number;
  focusScore: number;
  completedUnits: number;
  timeSpent: number;
  bestTimeOfDay: number;
  topicMastery: Array<{
    topic: string;
    masteryLevel: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

export interface StudyRecommendation {
  bestTimeToStudy: number;
  recommendedSessionLength: number;
  recommendedTopics: string[];
  difficulty: number;
}

export class LearningAnalyticsService {
  private static instance: LearningAnalyticsService;

  private constructor() {}

  public static getInstance(): LearningAnalyticsService {
    if (!LearningAnalyticsService.instance) {
      LearningAnalyticsService.instance = new LearningAnalyticsService();
    }
    return LearningAnalyticsService.instance;
  }

  /**
   * Updates analytics based on assessment results
   */
  public async updateAnalytics(
    userId: string,
    sessionId: string,
    results: AssessmentResult[]
  ): Promise<void> {
    const timeOfDay = new Date().getHours();
    const successRate = results.filter(r => r.isCorrect).length / results.length;
    const avgConfidence = results.reduce((acc, r) => acc + r.confidenceScore, 0) / results.length;

    // Update learning analytics
    const analyticsQuery = Prisma.sql`
      INSERT INTO "LearningAnalytics" (
        "id", "userId", "date", "timeOfDay", "sessionLength",
        "completedUnits", "retentionScore", "focusScore",
        "createdAt", "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        ${userId},
        CURRENT_DATE,
        ${timeOfDay},
        EXTRACT(EPOCH FROM (NOW() - MIN(st."startTime")))/60,
        COUNT(DISTINCT sc."conceptId"),
        ${successRate * 100},
        ${avgConfidence},
        NOW(),
        NOW()
      FROM "SessionTime" st
      JOIN "SessionConcept" sc ON sc."sessionId" = st."sessionId"
      WHERE st."sessionId" = ${sessionId}
      AND st."startTime" > NOW() - INTERVAL '24 hours'
      GROUP BY st."sessionId"
    `;

    // Update study patterns
    const patternQuery = Prisma.sql`
      INSERT INTO "StudyPattern" (
        "id", "userId", "dayOfWeek", "hourOfDay",
        "effectiveness", "frequency", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${userId},
        EXTRACT(DOW FROM NOW()),
        ${timeOfDay},
        ${successRate * 100},
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "dayOfWeek", "hourOfDay")
      DO UPDATE SET
        "effectiveness" = (
          "StudyPattern"."effectiveness" * "StudyPattern"."frequency" + EXCLUDED."effectiveness"
        ) / ("StudyPattern"."frequency" + 1),
        "frequency" = "StudyPattern"."frequency" + 1,
        "updatedAt" = NOW()
    `;

    // Update topic mastery
    const masteryQuery = Prisma.sql`
      INSERT INTO "TopicMastery" (
        "id", "userId", "topic", "masteryLevel",
        "attempts", "successRate", "lastReviewed",
        "createdAt", "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        ${userId},
        c."title",
        ${avgConfidence},
        1,
        ${successRate * 100},
        NOW(),
        NOW(),
        NOW()
      FROM "SessionConcept" sc
      JOIN "Concept" c ON c."id" = sc."conceptId"
      WHERE sc."sessionId" = ${sessionId}
      ON CONFLICT ("userId", "topic")
      DO UPDATE SET
        "masteryLevel" = (
          "TopicMastery"."masteryLevel" * "TopicMastery"."attempts" + EXCLUDED."masteryLevel"
        ) / ("TopicMastery"."attempts" + 1),
        "attempts" = "TopicMastery"."attempts" + 1,
        "successRate" = (
          "TopicMastery"."successRate" * "TopicMastery"."attempts" + EXCLUDED."successRate"
        ) / ("TopicMastery"."attempts" + 1),
        "lastReviewed" = NOW(),
        "updatedAt" = NOW()
    `;

    await Promise.all([
      prisma.$executeRaw(analyticsQuery),
      prisma.$executeRaw(patternQuery),
      prisma.$executeRaw(masteryQuery)
    ]);
  }

  /**
   * Gets learning metrics for the dashboard
   */
  public async getLearningMetrics(userId: string): Promise<LearningMetrics> {
    const query = Prisma.sql`
      WITH RecentAnalytics AS (
        SELECT 
          AVG("retentionScore") as "avgRetention",
          AVG("focusScore") as "avgFocus",
          SUM("completedUnits") as "totalUnits",
          SUM("sessionLength") as "totalTime",
          MODE() WITHIN GROUP (ORDER BY "timeOfDay") as "bestTime"
        FROM "LearningAnalytics"
        WHERE "userId" = ${userId}
        AND "date" > CURRENT_DATE - INTERVAL '30 days'
      ),
      TopicStats AS (
        SELECT 
          "topic",
          "masteryLevel",
          CASE 
            WHEN "masteryLevel" > LAG("masteryLevel") OVER (PARTITION BY "topic" ORDER BY "updatedAt")
            THEN 'improving'
            WHEN "masteryLevel" < LAG("masteryLevel") OVER (PARTITION BY "topic" ORDER BY "updatedAt")
            THEN 'declining'
            ELSE 'stable'
          END as "trend"
        FROM "TopicMastery"
        WHERE "userId" = ${userId}
        AND "lastReviewed" > CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        ra.*,
        COALESCE(
          json_agg(
            json_build_object(
              'topic', ts."topic",
              'masteryLevel', ts."masteryLevel",
              'trend', ts."trend"
            )
          ) FILTER (WHERE ts."topic" IS NOT NULL),
          '[]'
        ) as "topicStats"
      FROM RecentAnalytics ra
      LEFT JOIN TopicStats ts ON true
      GROUP BY 
        ra."avgRetention", ra."avgFocus", ra."totalUnits",
        ra."totalTime", ra."bestTime"
    `;

    const results = await prisma.$queryRaw<Array<{
      avgRetention: number;
      avgFocus: number;
      totalUnits: number;
      totalTime: number;
      bestTime: number;
      topicStats: Array<{
        topic: string;
        masteryLevel: number;
        trend: 'improving' | 'declining' | 'stable';
      }>;
    }>>(query);

    const metrics = results[0] || {
      avgRetention: 0,
      avgFocus: 0,
      totalUnits: 0,
      totalTime: 0,
      bestTime: 9,
      topicStats: []
    };

    return {
      retentionRate: metrics.avgRetention,
      focusScore: metrics.avgFocus,
      completedUnits: metrics.totalUnits,
      timeSpent: metrics.totalTime,
      bestTimeOfDay: metrics.bestTime,
      topicMastery: metrics.topicStats
    };
  }

  /**
   * Gets personalized study recommendations
   */
  public async getStudyRecommendations(userId: string): Promise<StudyRecommendation> {
    const query = Prisma.sql`
      WITH UserPatterns AS (
        SELECT 
          "hourOfDay",
          "effectiveness",
          "frequency"
        FROM "StudyPattern"
        WHERE "userId" = ${userId}
        AND "updatedAt" > CURRENT_DATE - INTERVAL '30 days'
      ),
      WeakTopics AS (
        SELECT 
          "topic",
          "masteryLevel"
        FROM "TopicMastery"
        WHERE "userId" = ${userId}
        AND "masteryLevel" < 70
        ORDER BY "masteryLevel" ASC
        LIMIT 3
      )
      SELECT 
        (
          SELECT "hourOfDay"
          FROM UserPatterns
          ORDER BY "effectiveness" DESC, "frequency" DESC
          LIMIT 1
        ) as "bestHour",
        (
          SELECT AVG("sessionLength")
          FROM "LearningAnalytics"
          WHERE "userId" = ${userId}
          AND "retentionScore" > 70
          AND "date" > CURRENT_DATE - INTERVAL '30 days'
        ) as "optimalLength",
        (
          SELECT json_agg("topic")
          FROM WeakTopics
        ) as "recommendedTopics",
        (
          SELECT AVG("masteryLevel")
          FROM "TopicMastery"
          WHERE "userId" = ${userId}
        ) as "avgMastery"
    `;

    const results = await prisma.$queryRaw<Array<{
      bestHour: number;
      optimalLength: number;
      recommendedTopics: string[];
      avgMastery: number;
    }>>(query);

    const recommendation = results[0] || {
      bestHour: 9,
      optimalLength: 30,
      recommendedTopics: [],
      avgMastery: 50
    };

    return {
      bestTimeToStudy: recommendation.bestHour,
      recommendedSessionLength: Math.round(recommendation.optimalLength),
      recommendedTopics: recommendation.recommendedTopics || [],
      difficulty: Math.max(1, Math.min(5, Math.ceil(recommendation.avgMastery / 20)))
    };
  }
}

// Export a singleton instance
export const learningAnalyticsService = LearningAnalyticsService.getInstance(); 