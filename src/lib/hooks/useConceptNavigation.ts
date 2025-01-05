import { useState, useCallback, useEffect, useRef } from 'react';
import { type LearningSession } from '@/types/learning';
import { type ConceptIndex } from '@/types/analysis';
import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { logger } from '@/lib/debug/logger';
import { conceptNavigationDebugger } from '@/lib/debug/concept-navigation-debug';
import { nestConcepts, flattenConcepts } from '@/lib/utils/concept-transformer';

// Represents the entire navigation state
interface ConceptState {
  currentIndex: number;
  currentLayer: number;
  currentPath: string[];
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  totalConceptsInLayer: number;
  completedConceptsInLayer: number;
  regenerationProgress: {
    isRegenerating: boolean;
    completedLayers: number;
    totalLayers: number;
  };
  toast: {
    type: 'success' | 'error' | 'info' | null;
    message: string | null;
  };
}

export interface ConceptNavigation {
  state: ConceptState;
  nextConcept: () => void;
  previousConcept: () => void;
  changeLayer: (layer: number) => void;
  regenerateExplanation: () => Promise<void>;
  getCurrentConcept: () => ConceptIndex | null;
  getLayerConcepts: () => ConceptIndex[];
}

export function useConceptNavigation(session: LearningSession): ConceptNavigation {
  // Transform concepts to nested structure on initialization
  const nestedConcepts = useRef<ConceptIndex[]>(nestConcepts(session.concepts));

  // -------------------------------------------------------------------------------------------
  // 1) State Management
  // -------------------------------------------------------------------------------------------
  const [state, setState] = useState<ConceptState>({
    currentIndex: 0,
    currentLayer: 1,
    currentPath: [],
    explanation: null,
    isLoading: false,
    error: null,
    progress: 0,
    totalConceptsInLayer: 0,
    completedConceptsInLayer: 0,
    regenerationProgress: {
      isRegenerating: false,
      completedLayers: 0,
      totalLayers: 3
    },
    toast: {
      type: null,
      message: null
    }
  });

  // Refs used for controlling explanation fetch concurrency
  const generatingConceptsRef = useRef<Set<string>>(new Set());
  const currentConceptRef = useRef<string>('');
  const lastFetchedKeyRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------------------------
  // 2) Build a flat list of all concepts by traversing the tree
  // -------------------------------------------------------------------------------------------
  const flatConcepts = useCallback((): ConceptIndex[] => {
    return flattenConcepts(nestedConcepts.current);
  }, []);

  // -------------------------------------------------------------------------------------------
  // 3) Return the concepts actually visible at the current layer
  // -------------------------------------------------------------------------------------------
  const getLayerConcepts = useCallback((): ConceptIndex[] => {
    const allConcepts = flatConcepts();
    const currentConcept = allConcepts[state.currentIndex];

    logger.debug('getLayerConcepts', 'Starting concept filtering', {
      currentLayer: state.currentLayer,
      currentConceptId: currentConcept?.id,
      currentConceptTitle: currentConcept?.title,
      currentConceptContent: currentConcept?.content?.substring(0, 100) + '...',
      hasChildren: currentConcept?.children?.length ?? 0
    });

    // Filter concepts based on their level from the database
    const layerConcepts = allConcepts.filter(concept => {
      if (state.currentLayer === 1) {
        return concept.level === 0; // Root concepts
      } else if (state.currentLayer === 2) {
        if (!currentConcept) return false;
        const mainConceptId = currentConcept.id.split('.')[0];
        return concept.level === 1 && concept.parentId?.startsWith(mainConceptId);
      } else if (state.currentLayer === 3) {
        if (!currentConcept) return false;
        const parentId = currentConcept.id.split('.').slice(0, 2).join('.');
        return concept.level === 2 && concept.parentId === parentId;
      }
      return false;
    });

    // Sort concepts by their order field
    return layerConcepts.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [state.currentLayer, state.currentIndex, flatConcepts]);

  // -------------------------------------------------------------------------------------------
  // 4) Fetch Explanation for current concept + layer (uses caching).
  // -------------------------------------------------------------------------------------------
  const fetchExplanation = useCallback(async (conceptId: string, layer: number) => {
    logger.debug('fetchExplanation Start', JSON.stringify({
      conceptId,
      layer,
      currentKey: `${conceptId}-${layer}`,
      isGenerating: generatingConceptsRef.current.has(`${conceptId}-${layer}`),
      lastFetchedKey: lastFetchedKeyRef.current
    }));

    // Ensure concept is valid for the current layer
    const layerConcepts = getLayerConcepts();
    const isValidLayerConcept = layerConcepts.some(c => c.id === conceptId);
    
    logger.debug('Concept Validation', JSON.stringify({
      conceptId,
      isValid: isValidLayerConcept,
      availableConcepts: layerConcepts.map(c => ({
        id: c.id,
        title: c.title,
        level: c.level,
        order: c.order
      }))
    }));

    if (!isValidLayerConcept) {
      logger.warn('Invalid Concept for Layer', JSON.stringify({
        conceptId,
        layer,
        availableIds: layerConcepts.map(c => c.id)
      }));
      return;
    }

    logger.info('useConceptNavigation', 'Fetching explanation', { conceptId, layer });
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    generatingConceptsRef.current.add(`${conceptId}-${layer}`);
    currentConceptRef.current = conceptId;

    try {
      // Check cache
      const cached = await explanationCacheService.getExplanation(conceptId, layer);
      logger.debug('Cache Check Result', JSON.stringify({
        conceptId,
        layer,
        hasCachedValue: !!cached,
        cacheLength: cached?.length ?? 0
      }));

      if (cached && currentConceptRef.current === conceptId) {
        logger.debug('useConceptNavigation', 'Using cached explanation', { conceptId, layer });
        setState(prev => ({ ...prev, explanation: cached, isLoading: false }));
        return;
      }

      // Build request
      const concepts = flatConcepts();
      const currentConcept = concepts.find(c => c.id === conceptId);
      const isLeafNode = !currentConcept?.children?.length;
      const parentTitles: string[] = [];

      // Get parent titles from the concept hierarchy
      if (currentConcept?.parentId) {
        const parentConcept = concepts.find(c => c.id === currentConcept.parentId);
        if (parentConcept) {
          parentTitles.push(parentConcept.title);
          if (parentConcept.parentId) {
            const grandParentConcept = concepts.find(c => c.id === parentConcept.parentId);
            if (grandParentConcept) {
              parentTitles.unshift(grandParentConcept.title);
            }
          }
        }
      }

      // Call the API
      const requestBody = {
        conceptId,
        layer,
        conceptTitle: currentConcept?.title,
        documentContent: session.document?.content,
        sessionId: session.id,
        parentTitles,
        isLeafNode
      };

      logger.info('useConceptNavigation', 'Sending explanation request', {
        conceptId,
        layer,
        conceptTitle: currentConcept?.title,
        sessionId: session.id,
        parentTitles,
        isLeafNode,
        documentContentLength: session.document?.content?.length ?? 0
      });

      const response = await fetch('/api/concepts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch explanation');
      }

      const data = await response.json();
      await explanationCacheService.setExplanation(conceptId, layer, data.content);

      if (currentConceptRef.current === conceptId) {
        setState(prev => ({
          ...prev,
          explanation: data.content,
          isLoading: false
        }));
      }
    } catch (error) {
      logger.error('Explanation Fetch Failed', JSON.stringify({
        conceptId,
        layer,
        error: error instanceof Error ? error.message : 'Unknown error',
        state: {
          currentIndex: state.currentIndex,
          currentLayer: state.currentLayer,
          isLoading: state.isLoading
        }
      }));
      if (currentConceptRef.current === conceptId) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to fetch explanation',
          isLoading: false
        }));
      }
    } finally {
      generatingConceptsRef.current.delete(`${conceptId}-${layer}`);
      lastFetchedKeyRef.current = `${conceptId}-${layer}`;
    }
  }, [session, flatConcepts, getLayerConcepts]);

  // -------------------------------------------------------------------------------------------
  // 5) nextConcept / previousConcept: step through the concepts of the current layer
  // -------------------------------------------------------------------------------------------
  const nextConcept = useCallback(() => {
    const layerConcepts = getLayerConcepts();
    const all = flatConcepts();
    const currentC = all[state.currentIndex];

    logger.debug('useConceptNavigation', 'Next concept triggered', {
      currentId: currentC?.id,
      layerConceptsCount: layerConcepts.length,
      currentLayer: state.currentLayer
    });

    const iInLayer = layerConcepts.findIndex(c => c.id === currentC?.id);
    if (iInLayer < layerConcepts.length - 1) {
      const nextC = layerConcepts[iInLayer + 1];
      const nextIndex = all.findIndex(c => c.id === nextC.id);

      logger.debug('useConceptNavigation', 'Moving to next concept', {
        from: currentC?.id,
        to: nextC.id,
        fromIndex: state.currentIndex,
        toIndex: nextIndex
      });

      if (nextIndex !== -1) {
        setState(prev => ({ ...prev, currentIndex: nextIndex, explanation: null, error: null }));
      }
    }
  }, [state.currentIndex, state.currentLayer, getLayerConcepts, flatConcepts]);

  const previousConcept = useCallback(() => {
    const layerConcepts = getLayerConcepts();
    const all = flatConcepts();
    const currentC = all[state.currentIndex];

    logger.debug('useConceptNavigation', 'Previous concept triggered', {
      currentId: currentC?.id,
      layerConceptsCount: layerConcepts.length,
      currentLayer: state.currentLayer
    });

    const iInLayer = layerConcepts.findIndex(c => c.id === currentC?.id);
    if (iInLayer > 0) {
      const prevC = layerConcepts[iInLayer - 1];
      const prevIndex = all.findIndex(c => c.id === prevC.id);

      logger.debug('useConceptNavigation', 'Moving to previous concept', {
        from: currentC?.id,
        to: prevC.id,
        fromIndex: state.currentIndex,
        toIndex: prevIndex
      });

      if (prevIndex !== -1) {
        setState(prev => ({ ...prev, currentIndex: prevIndex, explanation: null, error: null }));
      }
    }
  }, [state.currentIndex, state.currentLayer, getLayerConcepts, flatConcepts]);

  // -------------------------------------------------------------------------------------------
  // 6) changeLayer: carefully reset index, explanation, and fetch new data
  // -------------------------------------------------------------------------------------------
  const changeLayer = useCallback((newLayer: number) => {
    logger.info('Layer Change Started', JSON.stringify({
      from: state.currentLayer,
      to: newLayer,
      currentConceptId: flatConcepts()[state.currentIndex]?.id,
      currentConceptTitle: flatConcepts()[state.currentIndex]?.title
    }));

    // Temporarily set loading & clear explanation
    setState(prev => ({
      ...prev,
      isLoading: true,
      explanation: null,
      error: null
    }));

    conceptNavigationDebugger.logLayerTransition(state.currentLayer, newLayer, state.currentIndex);

    // Figure out the new concept set for that layer
    // We'll do this AFTER we set the new layer in state, then pick index 0 by default.
    // But first, let's set the layer so getLayerConcepts will re-run for the new layer:
    setState(prev => ({ ...prev, currentLayer: newLayer }));

    // In the same tick, let's see which concepts are valid for the new layer
    // We do this in a small callback on the next tick so setState for currentLayer is done:
    setTimeout(() => {
      const layerConcepts = getLayerConcepts();

      // Use first concept if available, else remain on 0
      let newIndex = 0;
      if (layerConcepts.length > 0) {
        // If the old concept is itself valid for the new layer, keep it. Otherwise set 0.
        const oldConcept = flatConcepts()[state.currentIndex];
        const stillValid = layerConcepts.some(c => c.id === oldConcept?.id);
        if (stillValid) {
          newIndex = flatConcepts().findIndex(c => c.id === oldConcept?.id);
        }
      }

      logger.debug('useConceptNavigation', 'changeLayer post-check', {
        layerConceptCount: layerConcepts.length,
        chosenIndex: newIndex
      });

      setState(prev => ({
        ...prev,
        currentIndex: newIndex,
        totalConceptsInLayer: layerConcepts.length,
        completedConceptsInLayer: layerConcepts.length > 0 ? 1 : 0,
        progress: layerConcepts.length > 0 ? (1 / layerConcepts.length) * 100 : 0,
        isLoading: false
      }));

      lastFetchedKeyRef.current = null; // force re-fetch
    }, 0);
  }, [state.currentLayer, state.currentIndex, flatConcepts, getLayerConcepts]);

  // -------------------------------------------------------------------------------------------
  // 7) Regenerate Explanation
  // -------------------------------------------------------------------------------------------
  const regenerateExplanation = useCallback(async () => {
    const all = flatConcepts();
    const curr = all[state.currentIndex];
    if (!curr || state.isLoading) {
      logger.warn('useConceptNavigation', 'Cannot regenerate explanation', {
        reason: !curr ? 'no current concept' : 'already loading',
        currentIndex: state.currentIndex
      });
      return;
    }

    logger.info('useConceptNavigation', 'Starting explanation regeneration', {
      conceptId: curr.id,
      layer: state.currentLayer
    });

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      explanation: null
    }));

    try {
      // Clear cached explanation for this concept + layer
      await explanationCacheService.deleteExplanation(curr.id, state.currentLayer);

      // Force re-fetch by clearing references
      lastFetchedKeyRef.current = null;
      generatingConceptsRef.current.delete(`${curr.id}-${state.currentLayer}`);

      // Now fetch new explanation
      await fetchExplanation(curr.id, state.currentLayer);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to regenerate explanation';
      logger.error('useConceptNavigation', 'Failed to regenerate explanation', {
        conceptId: curr.id,
        layer: state.currentLayer,
        error: msg
      });
      setState(prev => ({
        ...prev,
        error: msg,
        isLoading: false
      }));
    }
  }, [state.currentIndex, state.currentLayer, state.isLoading, fetchExplanation, flatConcepts]);

  // -------------------------------------------------------------------------------------------
  // 8) Keep progress up to date if currentIndex or layer changes
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    const layerConcepts = getLayerConcepts();
    const all = flatConcepts();
    const currentC = all[state.currentIndex];
    const iInLayer = layerConcepts.findIndex(c => c.id === currentC?.id);

    setState(prev => ({
      ...prev,
      totalConceptsInLayer: layerConcepts.length,
      completedConceptsInLayer: iInLayer >= 0 ? iInLayer + 1 : 0,
      progress: layerConcepts.length > 0 && iInLayer >= 0
        ? ((iInLayer + 1) / layerConcepts.length) * 100
        : 0
    }));
  }, [state.currentIndex, state.currentLayer, flatConcepts, getLayerConcepts]);

  // -------------------------------------------------------------------------------------------
  // 9) Auto-fetch explanation each time the current concept or layer changes
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    const all = flatConcepts();
    const currentC = all[state.currentIndex];
    if (currentC) {
      fetchExplanation(currentC.id, state.currentLayer);
    }
  }, [state.currentIndex, state.currentLayer, fetchExplanation, flatConcepts]);

  // -------------------------------------------------------------------------------------------
  // 10) Helper to return the current concept
  // -------------------------------------------------------------------------------------------
  const getCurrentConcept = useCallback((): ConceptIndex | null => {
    const all = flatConcepts();
    return all[state.currentIndex] || null;
  }, [state.currentIndex, flatConcepts]);

  // -------------------------------------------------------------------------------------------
  // Debugging: Log the entire concept tree once
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    logger.info('ConceptTree', '=== Full Concept Tree Structure ===');
    logger.info('ConceptTree', `Session ID: ${session.id}`);
    logger.info('ConceptTree', `Total Root Concepts: ${session.concepts.length}`);
    const logConcepts = (concepts: ConceptIndex[], depth = 0) => {
      concepts.forEach(c => {
        const prefix = '  '.repeat(depth);
        logger.info('ConceptTree', `${prefix}${c.id}: ${c.title}`, {
          childCount: c.children?.length ?? 0
        });
        if (c.children?.length) {
          logConcepts(c.children, depth + 1);
        }
      });
    };
    logConcepts(session.concepts, 0);
    logger.info('ConceptTree', '===================================');
  }, [session.id, session.concepts]);

  // -------------------------------------------------------------------------------------------
  // 11) Return the navigation interface
  // -------------------------------------------------------------------------------------------
  return {
    state,
    nextConcept,
    previousConcept,
    changeLayer,
    regenerateExplanation,
    getCurrentConcept,
    getLayerConcepts
  };
} 