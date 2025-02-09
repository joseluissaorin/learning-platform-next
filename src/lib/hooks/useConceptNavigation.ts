// useConceptNavigation.ts

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { type LearningSession } from '@/types/learning';
import { type ConceptIndex } from '@/types/analysis';
import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { logger } from '@/lib/debug/logger';
import { nestConcepts } from '@/lib/utils/concept-transformer';

/**
 * The primary state interface for ALNS navigation.
 */
interface ALNState {
  // The concept that is currently "selected" by the learner
  currentConceptId: string | null;
  // Explanation for the current concept
  explanation: string | null;
  // Are we fetching the explanation from the server?
  isLoading: boolean;
  // Error while fetching explanation (if any)
  error: string | null;
  // Linear progress for the "visible" array (see getVisibleConcepts)
  progress: number;
  // Count of visible concepts
  totalVisible: number;
  // Index of current concept in the visible list
  visibleIndex: number;
  // Additional signals (regeneration, etc.)
  regenerationProgress: {
    isRegenerating: boolean;
    progress: number;
  };
}

/**
 * The exported interface for ALNS-based concept navigation.
 */
export interface ALNSNavigation {
  state: ALNState;
  nextConcept: () => void;
  previousConcept: () => void;
  regenerateExplanation: () => Promise<void>;
  getVisibleConcepts: () => ConceptIndex[];
  getCurrentConcept: () => ConceptIndex | null;
}

/**
 * ALNS Hook Implementation
 */
export function useConceptNavigation(session: LearningSession): ALNSNavigation {
  // Build a nested concept tree from the session's concepts
  const nestedConcepts = useMemo(() => nestConcepts(session.concepts), [session.concepts]);

  // Flatten all concepts for easy access
  const flatConcepts = useMemo<ConceptIndex[]>(() => {
    const result: ConceptIndex[] = [];
    const traverse = (c: ConceptIndex) => {
      result.push(c);
      if (c.children) {
        c.children.forEach(traverse);
      }
    };
    nestedConcepts.forEach(traverse);
    return result;
  }, [nestedConcepts]);

  // The main state - simplified to remove layer management
  const [state, setState] = useState<ALNState>(() => ({
    currentConceptId: flatConcepts[0]?.id || null,
    explanation: null,
    isLoading: false,
    error: null,
    progress: 0,
    totalVisible: flatConcepts.length,
    visibleIndex: 0,
    regenerationProgress: {
      isRegenerating: false,
      progress: 0
    }
  }));

  // We store a set of "currently generating" keys to avoid duplication
  const generatingSetRef = useRef<Set<string>>(new Set());

  /**
   * getVisibleConcepts
   * Return all concepts in their natural order
   */
  const getVisibleConcepts = useCallback((): ConceptIndex[] => {
    return flatConcepts;
  }, [flatConcepts]);

  /**
   * getCurrentConcept
   */
  const getCurrentConcept = useCallback((): ConceptIndex | null => {
    if (!state.currentConceptId) return null;
    return flatConcepts.find((c) => c.id === state.currentConceptId) || null;
  }, [state.currentConceptId, flatConcepts]);

  /**
   * fetchExplanation
   * Fetch the explanation for the currently selected concept
   */
  const fetchExplanation = async (params: {
    conceptId: string;
    conceptPath?: string[];
    forceRegenerate?: boolean;
  }) => {
    const searchParams = new URLSearchParams({
      conceptId: params.conceptId,
      layer: '3', // Always use layer 3
      ...(params.forceRegenerate && { forceRegenerate: 'true' }),
      ...(params.conceptPath && { conceptPath: params.conceptPath.join(',') }),
    });

    const response = await fetch(`/api/explanations?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch explanation');
    }
    const data = await response.json();
    return data.explanation;
  };

  /**
   * buildConceptPath
   * Reconstruct the chain of titles from root -> concept
   */
  const buildConceptPath = useCallback(
    (conceptId: string): string[] => {
      const path: string[] = [];
      let current: ConceptIndex | undefined = flatConcepts.find(c => c.id === conceptId);
      
      while (current !== undefined) {
        path.unshift(current.title);
        current = current.parentId 
          ? flatConcepts.find(c => c.id === current?.parentId)
          : undefined;
      }
      
      return path;
    },
    [flatConcepts]
  );

  /**
   * Navigation functions
   */
  const nextConcept = useCallback(() => {
    setState(prev => {
      const visibleConcepts = flatConcepts;
      const currentIndex = visibleConcepts.findIndex(c => c.id === prev.currentConceptId);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= visibleConcepts.length) return prev;
      
      return {
        ...prev,
        currentConceptId: visibleConcepts[nextIndex].id,
        visibleIndex: nextIndex,
        progress: (nextIndex / (visibleConcepts.length - 1)) * 100
      };
    });
  }, [flatConcepts]);

  const previousConcept = useCallback(() => {
    setState(prev => {
      const visibleConcepts = flatConcepts;
      const currentIndex = visibleConcepts.findIndex(c => c.id === prev.currentConceptId);
      const prevIndex = currentIndex - 1;
      
      if (prevIndex < 0) return prev;
      
      return {
        ...prev,
        currentConceptId: visibleConcepts[prevIndex].id,
        visibleIndex: prevIndex,
        progress: (prevIndex / (visibleConcepts.length - 1)) * 100
      };
    });
  }, [flatConcepts]);

  /**
   * Regenerate explanation for current concept
   */
  const regenerateExplanation = useCallback(async () => {
    const currentConcept = getCurrentConcept();
    if (!currentConcept || generatingSetRef.current.has(currentConcept.id)) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      regenerationProgress: {
        isRegenerating: true,
        progress: 0
      }
    }));

    try {
      generatingSetRef.current.add(currentConcept.id);
      const conceptPath = buildConceptPath(currentConcept.id);
      const explanation = await fetchExplanation({
        conceptId: currentConcept.id,
        conceptPath,
        forceRegenerate: true
      });

      setState(prev => ({
        ...prev,
        explanation,
        isLoading: false,
        regenerationProgress: {
          isRegenerating: false,
          progress: 100
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to regenerate explanation',
        isLoading: false,
        regenerationProgress: {
          isRegenerating: false,
          progress: 0
        }
      }));
    } finally {
      generatingSetRef.current.delete(currentConcept.id);
    }
  }, [getCurrentConcept, buildConceptPath]);

  // Effect to fetch explanation when current concept changes
  useEffect(() => {
    const currentConcept = getCurrentConcept();
    if (!currentConcept || generatingSetRef.current.has(currentConcept.id)) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const fetchCurrentExplanation = async () => {
      try {
        generatingSetRef.current.add(currentConcept.id);
        const conceptPath = buildConceptPath(currentConcept.id);
        const explanation = await fetchExplanation({
          conceptId: currentConcept.id,
          conceptPath
        });

        setState(prev => ({
          ...prev,
          explanation,
          isLoading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to fetch explanation',
          isLoading: false
        }));
      } finally {
        generatingSetRef.current.delete(currentConcept.id);
      }
    };

    fetchCurrentExplanation();
  }, [state.currentConceptId, getCurrentConcept, buildConceptPath]);

  return {
    state,
    nextConcept,
    previousConcept,
    regenerateExplanation,
    getVisibleConcepts,
    getCurrentConcept
  };
}
