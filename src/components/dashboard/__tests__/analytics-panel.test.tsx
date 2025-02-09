import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsPanel } from '../analytics-panel';
import { learningAnalyticsService } from '@/lib/services/learning-analytics-service';

// Mock the learning analytics service
jest.mock('@/lib/services/learning-analytics-service', () => ({
  learningAnalyticsService: {
    getLearningMetrics: jest.fn(),
    getStudyRecommendations: jest.fn(),
  },
}));

const mockMetrics = {
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
};

const mockRecommendations = {
  bestTimeToStudy: 14,
  recommendedSessionLength: 45,
  recommendedTopics: ['GraphQL', 'React Context'],
  difficulty: 3,
};

describe('AnalyticsPanel', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (learningAnalyticsService.getLearningMetrics as jest.Mock).mockResolvedValue(mockMetrics);
    (learningAnalyticsService.getStudyRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);
  });

  it('renders loading state initially', () => {
    render(<AnalyticsPanel userId="test-user" />);
    
    // Check for loading skeleton
    const skeletons = screen.getAllByRole('article');
    expect(skeletons).toHaveLength(6);
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  it('renders analytics data after loading', async () => {
    render(<AnalyticsPanel userId="test-user" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Learning Analytics')).toBeInTheDocument();
    });

    // Check Overall Progress section
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Retention Rate
    expect(screen.getByText('75%')).toBeInTheDocument(); // Focus Score
    expect(screen.getByText('Completed 10 units')).toBeInTheDocument();
    expect(screen.getByText('Total study time: 120 minutes')).toBeInTheDocument();

    // Check Topic Mastery section
    expect(screen.getByText('Topic Mastery')).toBeInTheDocument();
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Basics')).toBeInTheDocument();

    // Check Study Recommendations section
    expect(screen.getByText('Study Recommendations')).toBeInTheDocument();
    expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Recommended session: 45 minutes')).toBeInTheDocument();
    mockRecommendations.recommendedTopics.forEach(topic => {
      expect(screen.getByText(`• ${topic}`)).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    // Mock error response
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (learningAnalyticsService.getLearningMetrics as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    render(<AnalyticsPanel userId="test-user" />);

    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to load analytics:', expect.any(Error));
    });

    // Clean up
    consoleError.mockRestore();
  });

  it('formats time correctly', async () => {
    render(<AnalyticsPanel userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    });

    // Update mock data to test AM time
    (learningAnalyticsService.getLearningMetrics as jest.Mock).mockResolvedValue({
      ...mockMetrics,
      bestTimeOfDay: 9,
    });
    (learningAnalyticsService.getStudyRecommendations as jest.Mock).mockResolvedValue({
      ...mockRecommendations,
      bestTimeToStudy: 9,
    });

    render(<AnalyticsPanel userId="test-user-2" />);

    await waitFor(() => {
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    });
  });

  it('displays correct color coding for mastery levels', async () => {
    const customMockMetrics = {
      ...mockMetrics,
      topicMastery: [
        { topic: 'High Mastery', masteryLevel: 80, trend: 'improving' as const },
        { topic: 'Medium Mastery', masteryLevel: 50, trend: 'stable' as const },
        { topic: 'Low Mastery', masteryLevel: 30, trend: 'declining' as const },
      ],
    };

    (learningAnalyticsService.getLearningMetrics as jest.Mock).mockResolvedValue(customMockMetrics);

    render(<AnalyticsPanel userId="test-user" />);

    await waitFor(() => {
      const highMastery = screen.getByText('80%');
      const mediumMastery = screen.getByText('50%');
      const lowMastery = screen.getByText('30%');

      expect(highMastery).toHaveClass('text-green-500');
      expect(mediumMastery).toHaveClass('text-orange-500');
      expect(lowMastery).toHaveClass('text-red-500');
    });
  });

  it('displays difficulty level indicator correctly', async () => {
    render(<AnalyticsPanel userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Level 3 of 5')).toBeInTheDocument();
      
      // Check that 3 indicators are filled and 2 are empty
      const indicators = screen.getAllByRole('generic').filter(el => 
        el.className.includes('h-2 flex-1 rounded-full')
      );
      
      expect(indicators).toHaveLength(5);
      indicators.slice(0, 3).forEach(indicator => {
        expect(indicator).toHaveClass('bg-primary');
      });
      indicators.slice(3).forEach(indicator => {
        expect(indicator).toHaveClass('bg-muted');
      });
    });
  });
}); 