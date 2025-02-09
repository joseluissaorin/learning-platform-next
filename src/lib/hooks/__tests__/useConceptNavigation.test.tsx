import { renderHook, act } from '@testing-library/react';
import { useConceptNavigation } from '../useConceptNavigation';
import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { type LearningSession } from '@/types/learning';

// Mock dependencies
jest.mock('@/lib/cache/explanation-cache');

describe('useConceptNavigation', () => {
  const mockSession: LearningSession = {
    id: 'test-session',
    title: 'Test Session',
    userId: 'test-user',
    progress: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    concepts: [
      {
        id: '1',
        title: 'Root Concept 1',
        content: 'Content 1',
        level: 0,
        order: 1,
        children: [
          {
            id: '1.1',
            title: 'Child Concept 1.1',
            content: 'Content 1.1',
            level: 1,
            order: 1,
            parentId: '1',
            children: [
              {
                id: '1.1.1',
                title: 'Child Concept 1.1.1',
                content: 'Content 1.1.1',
                level: 2,
                order: 1,
                parentId: '1.1'
              }
            ]
          }
        ]
      },
      {
        id: '2',
        title: 'Root Concept 2',
        content: 'Content 2',
        level: 0,
        order: 2,
        children: []
      }
    ],
    document: {
      id: 'doc-1',
      title: 'Test Document',
      content: 'Document content'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    expect(result.current.state).toEqual(expect.objectContaining({
      currentIndex: 0,
      currentLayer: 1,
      currentPath: [],
      explanation: null,
      isLoading: false,
      error: null,
      progress: 0,
      totalConceptsInLayer: 2,
      completedConceptsInLayer: 1
    }));
  });

  it('should navigate to next concept', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    act(() => {
      result.current.nextConcept();
    });

    expect(result.current.state.currentIndex).toBe(1);
    expect(result.current.getCurrentConcept()?.id).toBe('2');
  });

  it('should navigate to previous concept', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    // Move to second concept first
    act(() => {
      result.current.nextConcept();
    });

    act(() => {
      result.current.previousConcept();
    });

    expect(result.current.state.currentIndex).toBe(0);
    expect(result.current.getCurrentConcept()?.id).toBe('1');
  });

  it('should change layer and update concepts', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    act(() => {
      result.current.changeLayer(2);
    });

    const layerConcepts = result.current.getLayerConcepts();
    expect(layerConcepts.length).toBe(1);
    expect(layerConcepts[0].id).toBe('1.1');
    expect(result.current.state.currentLayer).toBe(2);
  });

  it('should filter concepts by layer correctly', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    // Layer 1 (root concepts)
    let concepts = result.current.getLayerConcepts();
    expect(concepts.length).toBe(2);
    expect(concepts.map(c => c.id)).toEqual(['1', '2']);

    // Layer 2
    act(() => {
      result.current.changeLayer(2);
    });
    concepts = result.current.getLayerConcepts();
    expect(concepts.length).toBe(1);
    expect(concepts[0].id).toBe('1.1');

    // Layer 3
    act(() => {
      result.current.changeLayer(3);
    });
    concepts = result.current.getLayerConcepts();
    expect(concepts.length).toBe(1);
    expect(concepts[0].id).toBe('1.1.1');
  });

  it('should handle regeneration of explanation', async () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));
    const mockExplanation = 'Regenerated explanation';

    (explanationCacheService.deleteExplanation as jest.Mock).mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: mockExplanation })
    });

    await act(async () => {
      await result.current.regenerateExplanation();
    });

    expect(result.current.state.explanation).toBe(mockExplanation);
    expect(explanationCacheService.deleteExplanation).toHaveBeenCalled();
  });

  it('should update progress when navigating', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    act(() => {
      result.current.nextConcept();
    });

    expect(result.current.state.progress).toBe(100);
    expect(result.current.state.completedConceptsInLayer).toBe(2);
    expect(result.current.state.totalConceptsInLayer).toBe(2);
  });

  it('should maintain correct path when changing layers', () => {
    const { result } = renderHook(() => useConceptNavigation(mockSession));

    act(() => {
      result.current.changeLayer(2);
    });

    expect(result.current.state.currentPath).toEqual(['Root Concept 1']);

    act(() => {
      result.current.changeLayer(3);
    });

    expect(result.current.state.currentPath).toEqual(['Root Concept 1', 'Child Concept 1.1']);
  });
}); 