import { prisma } from "@/lib/prisma";
import { type LearningSession } from "@/types/learning";
import { 
  type AssessmentAIProvider,
  AssessmentAIFactory, 
  type QuestionGenerationParams, 
  type AnswerValidationParams,
  type QuestionType,
  type AIProviderType,
  type AIProviderConfig 
} from "@/lib/ai/assessment-ai-provider";
import { AI_PROVIDER_CONFIG, validateProviderConfig } from "@/lib/ai/config";
import { Prisma } from "@prisma/client";
import { createId } from '@paralleldrive/cuid2';
import { learningAnalyticsService } from "./learning-analytics-service";

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  explanation?: string;
  learningUnitId: string;
}

export interface AssessmentResult {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
  confidenceScore: number;
  userAnswer: string;
}

export interface AssessmentSummary {
  totalQuestions: number;
  correctAnswers: number;
  averageConfidence: number;
  knowledgeGaps: string[];
  recommendations: string[];
}

export interface AssessmentBlockStatus {
  isBlocked: boolean;
  reason?: string;
  requiredScore: number;
  currentScore: number;
}

export interface AssessmentDifficulty {
  level: number; // 1-5
  adaptiveFactor: number; // 0.5-1.5
  targetAreas: string[];
}

export interface KnowledgeGapAnalysis {
  gaps: Array<{
    conceptId: string;
    conceptTitle: string;
    confidenceScore: number;
    failureRate: number;
    recommendedActions: string[];
  }>;
  overallStrength: number; // 0-100
  criticalAreas: string[];
}

export interface LearningPattern {
  bestTimeOfDay: number; // 0-23 hour
  averageSessionLength: number; // minutes
  optimalDifficulty: number; // 1-5
  retentionRate: number; // 0-100
  focusScore: number; // 0-100
}

export class AssessmentService {
  private static instance: AssessmentService;
  private aiProvider: AssessmentAIProvider;

  private constructor() {
    validateProviderConfig(AI_PROVIDER_CONFIG);
    const factory = AssessmentAIFactory.getInstance();
    
    // Determine provider type based on model name
    const modelName = AI_PROVIDER_CONFIG.modelName?.toLowerCase() || '';
    let providerType: AIProviderType = 'openai'; // default

    if (modelName.startsWith('llama')) {
      providerType = 'groq';
    } else if (modelName.startsWith('gemini')) {
      providerType = 'gemini';
    } else if (modelName.startsWith('gpt') || modelName.startsWith('o')) {
      providerType = 'openai';
    } else {
      providerType = 'custom-openai';
    }

    // Update config with determined provider type
    const config: AIProviderConfig = {
      ...AI_PROVIDER_CONFIG,
      type: providerType,
      // Only include baseUrl for custom-openai
      baseUrl: providerType === 'custom-openai' ? AI_PROVIDER_CONFIG.baseUrl : undefined
    };

    factory.initializeProvider(config).catch((error: Error) => {
      console.error('Failed to initialize AI provider:', error);
    });
    this.aiProvider = factory.getCurrentProvider();
  }

  public static getInstance(): AssessmentService {
    if (!AssessmentService.instance) {
      AssessmentService.instance = new AssessmentService();
    }
    return AssessmentService.instance;
  }

  /**
   * Creates a new assessment session
   */
  private async createAssessmentSession(sessionId: string, userId: string): Promise<string> {
    const query = Prisma.sql`
      INSERT INTO "Assessment" ("id", "sessionId", "userId", "status", "createdAt", "updatedAt")
      VALUES (${createId()}, ${sessionId}, ${userId}, 'IN_PROGRESS', NOW(), NOW())
      RETURNING "id"
    `;
    
    const result = await prisma.$queryRaw<[{ id: string }]>(query);
    return result[0].id;
  }

  /**
   * Saves generated questions to the database
   */
  private async saveQuestions(assessmentId: string, questions: AssessmentQuestion[]): Promise<void> {
    const values = questions.map(q => {
      const id = createId();
      return `(
        '${id}',
        '${assessmentId}',
        ${Prisma.sql`${q.text}`},
        '${q.type}',
        ${q.options ? `ARRAY[${q.options.map(o => `'${o}'`).join(',')}]` : 'ARRAY[]::text[]'},
        ${q.explanation ? Prisma.sql`${q.explanation}` : null},
        NOW(),
        NOW()
      )`;
    }).join(',');

    const query = Prisma.sql`
      INSERT INTO "AssessmentQuestion" (
        "id", "assessmentId", "text", "type", "options", "explanation",
        "createdAt", "updatedAt"
      )
      VALUES ${Prisma.raw(values)}
    `;

    await prisma.$executeRaw(query);
  }

  /**
   * Saves an assessment result
   */
  private async saveResult(
    assessmentId: string,
    questionId: string,
    result: AssessmentResult
  ): Promise<void> {
    const query = Prisma.sql`
      INSERT INTO "AssessmentResult" (
        "id", "assessmentId", "questionId", "userAnswer", "isCorrect",
        "feedback", "confidenceScore", "createdAt", "updatedAt"
      )
      VALUES (
        ${createId()}, ${assessmentId}, ${questionId}, ${result.userAnswer},
        ${result.isCorrect}, ${result.feedback}, ${result.confidenceScore},
        NOW(), NOW()
      )
    `;

    await prisma.$executeRaw(query);
  }

  /**
   * Updates assessment status
   */
  private async updateAssessmentStatus(
    assessmentId: string,
    status: 'COMPLETED' | 'NEEDS_REVIEW'
  ): Promise<void> {
    const query = Prisma.sql`
      UPDATE "Assessment"
      SET "status" = ${status}, "completedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${assessmentId}
    `;

    await prisma.$executeRaw(query);
  }

  /**
   * Gets the latest assessment for a session
   */
  private async getLatestAssessment(sessionId: string): Promise<{
    id: string;
    status: string;
    completedAt: Date | null;
  } | null> {
    const query = Prisma.sql`
      SELECT "id", "status", "completedAt"
      FROM "Assessment"
      WHERE "sessionId" = ${sessionId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const results = await prisma.$queryRaw<Array<{
      id: string;
      status: string;
      completedAt: Date | null;
    }>>(query);

    return results[0] || null;
  }

  public async shouldTriggerAssessment(session: LearningSession): Promise<boolean> {
    const query = Prisma.sql`
      SELECT AVG(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as "successRate"
      FROM "Assessment" a
      JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
      WHERE a."sessionId" = ${session.id}
      AND a."completedAt" > NOW() - INTERVAL '24 hours'
    `;

    const results = await prisma.$queryRaw<Array<{ successRate: number | null }>>(query);
    const recentSuccessRate = results[0]?.successRate ?? 0;

    // Trigger assessment if:
    // 1. No recent assessments (successRate is null)
    // 2. Recent performance below 70%
    // 3. Progress increased significantly since last assessment
    return recentSuccessRate < 0.7;
  }

  public async generateQuestions(params: QuestionGenerationParams): Promise<AssessmentQuestion[]> {
    try {
      return await this.aiProvider.generateQuestions(params);
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error('Failed to generate questions');
    }
  }

  public async validateAnswer(params: AnswerValidationParams): Promise<AssessmentResult> {
    try {
      return await this.aiProvider.validateAnswer(params);
    } catch (error) {
      console.error('Error validating answer:', error);
      throw new Error('Failed to validate answer');
    }
  }

  public async createAssessmentSummary(results: AssessmentResult[]): Promise<AssessmentSummary> {
    const totalQuestions = results.length;
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const averageConfidence = results.reduce((acc, r) => acc + r.confidenceScore, 0) / totalQuestions;

    // Get the session and user info
    const query = Prisma.sql`
      SELECT 
        a."userId",
        a."sessionId"
      FROM "Assessment" a
      JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
      WHERE ar."id" = ${results[0].questionId}
      LIMIT 1
    `;

    const sessionInfo = await prisma.$queryRaw<[{ userId: string; sessionId: string }]>(query);

    if (sessionInfo[0]) {
      // Get learning analytics for recommendations
      const [gaps, recommendations] = await Promise.all([
        this.analyzeKnowledgeGaps(sessionInfo[0].userId, sessionInfo[0].sessionId),
        learningAnalyticsService.getStudyRecommendations(sessionInfo[0].userId)
      ]);

      return {
        totalQuestions,
        correctAnswers,
        averageConfidence,
        knowledgeGaps: gaps.criticalAreas,
        recommendations: [
          ...recommendations.recommendedTopics.map(topic => `Review ${topic}`),
          `Best study time: ${recommendations.bestTimeToStudy}:00`,
          `Recommended session length: ${recommendations.recommendedSessionLength} minutes`
        ]
      };
    }

    return {
      totalQuestions,
      correctAnswers,
      averageConfidence,
      knowledgeGaps: [],
      recommendations: []
    };
  }

  public async getProgressBlockStatus(session: LearningSession): Promise<AssessmentBlockStatus> {
    try {
      const query = Prisma.sql`
        WITH LatestAssessment AS (
          SELECT a."id", a."status"
          FROM "Assessment" a
          WHERE a."sessionId" = ${session.id}
          ORDER BY a."createdAt" DESC
          LIMIT 1
        ),
        AssessmentStats AS (
          SELECT 
            COUNT(*) as "totalQuestions",
            SUM(CASE WHEN ar."isCorrect" THEN 1 ELSE 0 END) as "correctAnswers",
            AVG(ar."confidenceScore") as "avgConfidence"
          FROM LatestAssessment la
          JOIN "AssessmentResult" ar ON ar."assessmentId" = la."id"
        )
        SELECT 
          la."status",
          COALESCE(ast."avgConfidence", 0) as "currentScore",
          CASE 
            WHEN la."status" = 'NEEDS_REVIEW' THEN true
            WHEN COALESCE(ast."avgConfidence", 0) < 70 THEN true
            ELSE false
          END as "isBlocked"
        FROM LatestAssessment la
        LEFT JOIN AssessmentStats ast ON true
      `;

      const results = await prisma.$queryRaw<Array<{
        status: string;
        currentScore: number;
        isBlocked: boolean;
      }>>(query);

      const result = results[0] || { status: 'IN_PROGRESS', currentScore: 0, isBlocked: false };

      return {
        isBlocked: result.isBlocked,
        reason: result.isBlocked ? 'Assessment needs to be completed successfully to continue' : undefined,
        requiredScore: 70,
        currentScore: Math.round(result.currentScore)
      };
    } catch (error) {
      console.error('Error checking progress block status:', error);
      return {
        isBlocked: false,
        requiredScore: 70,
        currentScore: 0
      };
    }
  }

  /**
   * Calculates the optimal difficulty for the next assessment
   */
  private async calculateNextDifficulty(userId: string, sessionId: string): Promise<AssessmentDifficulty> {
    const query = Prisma.sql`
      WITH UserPerformance AS (
        SELECT 
          AVG(CASE WHEN ar."isCorrect" THEN 1 ELSE 0 END) as "successRate",
          AVG(ar."confidenceScore") as "avgConfidence",
          COUNT(DISTINCT aq."type") as "questionTypes"
        FROM "Assessment" a
        JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
        JOIN "AssessmentQuestion" aq ON aq."id" = ar."questionId"
        WHERE a."userId" = ${userId}
        AND a."completedAt" > NOW() - INTERVAL '7 days'
      ),
      ConceptStrengths AS (
        SELECT 
          sc."conceptId",
          AVG(CASE WHEN ar."isCorrect" THEN 1 ELSE 0 END) as "conceptScore"
        FROM "SessionConcept" sc
        JOIN "Assessment" a ON a."sessionId" = sc."sessionId"
        JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
        WHERE sc."sessionId" = ${sessionId}
        GROUP BY sc."conceptId"
      )
      SELECT 
        up."successRate",
        up."avgConfidence",
        ARRAY_AGG(cs."conceptId") FILTER (WHERE cs."conceptScore" < 0.7) as "weakConcepts"
      FROM UserPerformance up
      CROSS JOIN LATERAL (
        SELECT ARRAY_AGG(cs."conceptId") as "conceptIds"
        FROM ConceptStrengths cs
      ) as concepts
    `;

    const results = await prisma.$queryRaw<Array<{
      successRate: number;
      avgConfidence: number;
      weakConcepts: string[];
    }>>(query);

    const performance = results[0] || { successRate: 0.5, avgConfidence: 50, weakConcepts: [] };

    // Calculate adaptive difficulty
    const baseLevel = Math.round(performance.successRate * 5);
    const adaptiveFactor = performance.avgConfidence < 70 ? 0.8 : 1.2;

    return {
      level: Math.max(1, Math.min(5, baseLevel)),
      adaptiveFactor,
      targetAreas: performance.weakConcepts
    };
  }

  /**
   * Analyzes knowledge gaps based on assessment history
   */
  private async analyzeKnowledgeGaps(userId: string, sessionId: string): Promise<KnowledgeGapAnalysis> {
    const query = Prisma.sql`
      WITH ConceptPerformance AS (
        SELECT 
          sc."conceptId",
          c."title" as "conceptTitle",
          COUNT(ar."id") as "totalAttempts",
          SUM(CASE WHEN ar."isCorrect" THEN 1 ELSE 0 END) as "correctAttempts",
          AVG(ar."confidenceScore") as "avgConfidence"
        FROM "SessionConcept" sc
        JOIN "Concept" c ON c."id" = sc."conceptId"
        LEFT JOIN "Assessment" a ON a."sessionId" = sc."sessionId"
        LEFT JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
        WHERE sc."sessionId" = ${sessionId}
        GROUP BY sc."conceptId", c."title"
      )
      SELECT 
        cp."conceptId",
        cp."conceptTitle",
        cp."avgConfidence",
        (1 - (cp."correctAttempts"::float / NULLIF(cp."totalAttempts", 0))) as "failureRate"
      FROM ConceptPerformance cp
      WHERE cp."totalAttempts" > 0
      ORDER BY cp."avgConfidence" ASC
    `;

    const results = await prisma.$queryRaw<Array<{
      conceptId: string;
      conceptTitle: string;
      avgConfidence: number;
      failureRate: number;
    }>>(query);

    const gaps = results.map(r => ({
      conceptId: r.conceptId,
      conceptTitle: r.conceptTitle,
      confidenceScore: r.avgConfidence,
      failureRate: r.failureRate,
      recommendedActions: this.generateRecommendations(r.failureRate, r.avgConfidence)
    }));

    const overallStrength = results.reduce((acc, r) => 
      acc + (1 - r.failureRate) * (r.avgConfidence / 100), 0) / results.length * 100;

    const criticalAreas = gaps
      .filter(g => g.failureRate > 0.3 || g.confidenceScore < 60)
      .map(g => g.conceptTitle);

    return {
      gaps,
      overallStrength,
      criticalAreas
    };
  }

  /**
   * Analyzes learning patterns for optimal scheduling
   */
  private async analyzeLearningPatterns(userId: string): Promise<LearningPattern> {
    const query = Prisma.sql`
      WITH SessionStats AS (
        SELECT 
          EXTRACT(HOUR FROM st."startTime") as "hourOfDay",
          EXTRACT(EPOCH FROM (st."endTime" - st."startTime"))/60 as "duration",
          ar."isCorrect",
          ar."confidenceScore"
        FROM "SessionTime" st
        JOIN "Assessment" a ON a."sessionId" = st."sessionId"
        JOIN "AssessmentResult" ar ON ar."assessmentId" = a."id"
        WHERE st."endTime" IS NOT NULL
        AND a."userId" = ${userId}
        AND st."startTime" > NOW() - INTERVAL '30 days'
      )
      SELECT 
        MODE() WITHIN GROUP (ORDER BY "hourOfDay") as "bestHour",
        AVG("duration") as "avgDuration",
        AVG(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as "retentionRate",
        AVG("confidenceScore") as "avgConfidence"
      FROM SessionStats
    `;

    const results = await prisma.$queryRaw<Array<{
      bestHour: number;
      avgDuration: number;
      retentionRate: number;
      avgConfidence: number;
    }>>(query);

    const pattern = results[0] || {
      bestHour: 9,
      avgDuration: 30,
      retentionRate: 0.7,
      avgConfidence: 70
    };

    return {
      bestTimeOfDay: pattern.bestHour,
      averageSessionLength: Math.round(pattern.avgDuration),
      optimalDifficulty: Math.round(pattern.retentionRate * 5),
      retentionRate: pattern.retentionRate * 100,
      focusScore: this.calculateFocusScore(pattern.avgDuration, pattern.retentionRate)
    };
  }

  private calculateFocusScore(avgDuration: number, retentionRate: number): number {
    // Optimal session length is between 25-45 minutes
    const durationScore = avgDuration >= 25 && avgDuration <= 45 ? 100 :
      avgDuration < 25 ? (avgDuration / 25) * 100 :
      Math.max(0, (1 - (avgDuration - 45) / 45) * 100);

    // Combine duration score with retention rate
    return Math.round((durationScore + (retentionRate * 100)) / 2);
  }

  private generateRecommendations(failureRate: number, confidence: number): string[] {
    const recommendations: string[] = [];

    if (failureRate > 0.5) {
      recommendations.push('Review core concepts');
      recommendations.push('Practice with simpler examples');
    } else if (failureRate > 0.3) {
      recommendations.push('Focus on specific weak areas');
      recommendations.push('Try different question types');
    }

    if (confidence < 50) {
      recommendations.push('Build confidence through regular practice');
      recommendations.push('Review successful attempts');
    }

    return recommendations;
  }

  public async generateAssessment(
    sessionTitle: string,
    concepts: Array<{ id: string; title: string; content: string }>,
    questionDistribution: { multipleChoice: number; trueFalse: number; openEnded: number }
  ): Promise<AssessmentQuestion[]> {
    // Get the session and user info from the first concept
    const session = await prisma.$queryRaw<[{ sessionId: string; userId: string }]>(Prisma.sql`
      SELECT DISTINCT ls."id" as "sessionId", ls."userId"
      FROM "LearningSession" ls
      JOIN "SessionConcept" sc ON sc."sessionId" = ls."id"
      WHERE sc."conceptId" = ${concepts[0].id}
      LIMIT 1
    `);

    if (!session[0]) {
      throw new Error('Session not found');
    }

    // Get learning patterns and recommendations
    const [difficulty, gaps, recommendations] = await Promise.all([
      this.calculateNextDifficulty(session[0].userId, session[0].sessionId),
      this.analyzeKnowledgeGaps(session[0].userId, session[0].sessionId),
      learningAnalyticsService.getStudyRecommendations(session[0].userId)
    ]);

    // Adjust question distribution based on analytics
    const adjustedDistribution = this.adjustQuestionDistribution(
      questionDistribution,
      {
        ...difficulty,
        level: recommendations.difficulty // Use recommended difficulty level
      },
      gaps
    );

    const params: QuestionGenerationParams = {
      sessionTitle,
      concepts,
      requiredQuestionTypes: adjustedDistribution
    };

    return this.generateQuestions(params);
  }

  private adjustQuestionDistribution(
    original: { multipleChoice: number; trueFalse: number; openEnded: number },
    difficulty: AssessmentDifficulty,
    gaps: KnowledgeGapAnalysis
  ) {
    // Increase open-ended questions for higher difficulties
    const openEndedAdjustment = Math.min(2, Math.floor(difficulty.level / 2));
    
    // Reduce multiple choice for higher difficulties
    const multipleChoiceAdjustment = Math.max(-2, -Math.floor(difficulty.level / 2));

    return {
      multipleChoice: Math.max(1, original.multipleChoice + multipleChoiceAdjustment),
      trueFalse: original.trueFalse,
      openEnded: Math.max(1, original.openEnded + openEndedAdjustment)
    };
  }

  public async checkAnswer(
    question: AssessmentQuestion,
    userAnswer: string,
    conceptContext: string
  ): Promise<AssessmentResult> {
    const params: AnswerValidationParams = {
      question,
      userAnswer,
      conceptContext
    };

    return this.validateAnswer(params);
  }

  public async updateProgress(
    session: LearningSession,
    results: AssessmentResult[]
  ): Promise<void> {
    const successRate = results.filter(r => r.isCorrect).length / results.length;
    const status = successRate >= 0.7 ? 'COMPLETED' : 'NEEDS_REVIEW';

    // Update assessment and session status
    const query = Prisma.sql`
      WITH assessment_update AS (
        UPDATE "Assessment"
        SET 
          "status" = ${status},
          "completedAt" = NOW(),
          "updatedAt" = NOW()
        WHERE "sessionId" = ${session.id}
        AND "status" = 'IN_PROGRESS'
        RETURNING "id"
      )
      UPDATE "LearningSession"
      SET 
        "progress" = CASE 
          WHEN ${status} = 'COMPLETED' THEN ${session.progress}
          ELSE "progress"
        END,
        "lastActiveAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = ${session.id}
    `;

    await Promise.all([
      prisma.$executeRaw(query),
      learningAnalyticsService.updateAnalytics(session.userId, session.id, results)
    ]);
  }
}

// Export a singleton instance
export const assessmentService = AssessmentService.getInstance(); 