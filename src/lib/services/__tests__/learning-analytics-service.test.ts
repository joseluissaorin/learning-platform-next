import { prisma } from '@/lib/prisma';
import { learningAnalyticsService } from '../learning-analytics-service';
import { type AssessmentResult } from '../assessment-service';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

describe('LearningAnalyticsService', () => {
  const userId = 'test-user-id';
  const sessionId = 'test-session-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAnalytics', () => {
    const mockResults: AssessmentResult[] = [
      {
        questionId: 'q1',
        isCorrect: true,
        feedback: 'Good job!',
        confidenceScore: 85,
        userAnswer: 'Test answer 1',
      },
      {
        questionId: 'q2',
        isCorrect: false,
        feedback: 'Try again',
        confidenceScore: 60,
        userAnswer: 'Test answer 2',
      },
    ];

    it('updates analytics tables with assessment results', async () => {
      await learningAnalyticsService.updateAnalytics(userId, sessionId, mockResults);

      // Verify that all three queries were executed
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);

      // Check analytics query
      const analyticsCall = (prisma.$executeRaw as jest.Mock).mock.calls[0][0];
      expect(analyticsCall.sql).toContain('INSERT INTO "LearningAnalytics"');
      expect(analyticsCall.values).toContain(userId);

      // Check pattern query
      const patternCall = (prisma.$executeRaw as jest.Mock).mock.calls[1][0];
      expect(patternCall.sql).toContain('INSERT INTO "StudyPattern"');
      expect(patternCall.values).toContain(userId);

      // Check mastery query
      const masteryCall = (prisma.$executeRaw as jest.Mock).mock.calls[2][0];
      expect(masteryCall.sql).toContain('INSERT INTO "TopicMastery"');
      expect(masteryCall.values).toContain(userId);
    });

    it('handles errors gracefully', async () => {
      (prisma.$executeRaw as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        learningAnalyticsService.updateAnalytics(userId, sessionId, mockResults)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getLearningMetrics', () => {
    const mockMetricsData = {
      avgRetention: 85,
      avgFocus: 75,
      totalUnits: 10,
      totalTime: 120,
      bestTime: 14,
      topicStats: [
        {
          topic: 'React',
          masteryLevel: 80,
          trend: 'improving',
        },
      ],
    };

    beforeEach(() => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockMetricsData]);
    });

    it('returns formatted learning metrics', async () => {
      const metrics = await learningAnalyticsService.getLearningMetrics(userId);

      expect(metrics).toEqual({
        retentionRate: 85,
        focusScore: 75,
        completedUnits: 10,
        timeSpent: 120,
        bestTimeOfDay: 14,
        topicMastery: [
          {
            topic: 'React',
            masteryLevel: 80,
            trend: 'improving',
          },
        ],
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const query = (prisma.$queryRaw as jest.Mock).mock.calls[0][0];
      expect(query.sql).toContain('WITH RecentAnalytics');
      expect(query.values).toContain(userId);
    });

    it('returns default values when no data is found', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const metrics = await learningAnalyticsService.getLearningMetrics(userId);

      expect(metrics).toEqual({
        retentionRate: 0,
        focusScore: 0,
        completedUnits: 0,
        timeSpent: 0,
        bestTimeOfDay: 9,
        topicMastery: [],
      });
    });

    it('handles database errors', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        learningAnalyticsService.getLearningMetrics(userId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getStudyRecommendations', () => {
    const mockRecommendationData = {
      bestHour: 14,
      optimalLength: 45,
      recommendedTopics: ['GraphQL', 'React Context'],
      avgMastery: 65,
    };

    beforeEach(() => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRecommendationData]);
    });

    it('returns formatted study recommendations', async () => {
      const recommendations = await learningAnalyticsService.getStudyRecommendations(userId);

      expect(recommendations).toEqual({
        bestTimeToStudy: 14,
        recommendedSessionLength: 45,
        recommendedTopics: ['GraphQL', 'React Context'],
        difficulty: 4,
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const query = (prisma.$queryRaw as jest.Mock).mock.calls[0][0];
      expect(query.sql).toContain('WITH UserPatterns');
      expect(query.values).toContain(userId);
    });

    it('returns default values when no data is found', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const recommendations = await learningAnalyticsService.getStudyRecommendations(userId);

      expect(recommendations).toEqual({
        bestTimeToStudy: 9,
        recommendedSessionLength: 30,
        recommendedTopics: [],
        difficulty: 3,
      });
    });

    it('calculates difficulty level correctly', async () => {
      // Test different mastery levels
      const testCases = [
        { avgMastery: 20, expectedDifficulty: 1 },
        { avgMastery: 40, expectedDifficulty: 2 },
        { avgMastery: 60, expectedDifficulty: 3 },
        { avgMastery: 80, expectedDifficulty: 4 },
        { avgMastery: 100, expectedDifficulty: 5 },
      ];

      for (const { avgMastery, expectedDifficulty } of testCases) {
        (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ 
          ...mockRecommendationData,
          avgMastery,
        }]);

        const recommendations = await learningAnalyticsService.getStudyRecommendations(userId);
        expect(recommendations.difficulty).toBe(expectedDifficulty);
      }
    });

    it('handles database errors', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        learningAnalyticsService.getStudyRecommendations(userId)
      ).rejects.toThrow('Database error');
    });
  });
}); 