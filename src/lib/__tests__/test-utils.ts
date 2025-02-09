import { type AssessmentResult } from '../services/assessment-service';
import { type LearningMetrics, type StudyRecommendation } from '../services/learning-analytics-service';

export const createMockAssessmentResults = (count: number): AssessmentResult[] => {
  return Array.from({ length: count }, (_, index) => ({
    questionId: `q${index + 1}`,
    isCorrect: Math.random() > 0.5,
    feedback: `Test feedback ${index + 1}`,
    confidenceScore: Math.floor(Math.random() * 100),
    userAnswer: `Test answer ${index + 1}`,
  }));
};

export const createMockLearningMetrics = (overrides?: Partial<LearningMetrics>): LearningMetrics => ({
  retentionRate: 85,
  focusScore: 75,
  completedUnits: 10,
  timeSpent: 120,
  bestTimeOfDay: 14,
  topicMastery: [
    {
      topic: 'React Hooks',
      masteryLevel: 80,
      trend: 'improving' as const,
    },
    {
      topic: 'TypeScript Basics',
      masteryLevel: 60,
      trend: 'stable' as const,
    },
  ],
  ...overrides,
});

export const createMockStudyRecommendations = (
  overrides?: Partial<StudyRecommendation>
): StudyRecommendation => ({
  bestTimeToStudy: 14,
  recommendedSessionLength: 45,
  recommendedTopics: ['GraphQL', 'React Context'],
  difficulty: 3,
  ...overrides,
});

export const mockPrismaResponse = <T>(data: T) => {
  return {
    $queryRaw: jest.fn().mockResolvedValue([data]),
    $executeRaw: jest.fn().mockResolvedValue(undefined),
  };
};

export const mockPrismaError = (error: Error) => {
  return {
    $queryRaw: jest.fn().mockRejectedValue(error),
    $executeRaw: jest.fn().mockRejectedValue(error),
  };
};

export const waitForLoadingToFinish = async () => {
  // Wait for all loading states to resolve
  await new Promise(resolve => setTimeout(resolve, 0));
};

export const createTestIds = () => ({
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  assessmentId: 'test-assessment-id',
  questionId: 'test-question-id',
});

export const mockConsoleError = () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  return console.error as jest.Mock;
};

export const createMockSqlQuery = (tableName: string) => ({
  sql: `SELECT * FROM "${tableName}"`,
  values: [],
});

export const mockDateNow = (date: Date = new Date('2024-01-01')) => {
  const originalNow = Date.now;
  beforeAll(() => {
    global.Date.now = jest.fn(() => date.getTime());
  });
  afterAll(() => {
    global.Date.now = originalNow;
  });
  return date;
}; 