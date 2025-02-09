// concept-transformer.js
import { type ConceptIndex } from '@/types/analysis';

/**
 * nestConcepts
 * Sorts and nests the concepts by their parent-child relationship.
 */
export function nestConcepts(concepts: ConceptIndex[]): ConceptIndex[] {
  // Sort concepts by level and order
  const sortedConcepts = [...concepts].sort((a, b) => {
    if (a.level === b.level) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.level || 0) - (b.level || 0);
  });

  // Create a map of concepts by their ID
  const conceptMap = new Map<string, ConceptIndex>();
  sortedConcepts.forEach((concept) => {
    conceptMap.set(concept.id, { ...concept, children: [] });
  });

  // Build the tree structure
  const rootConcepts: ConceptIndex[] = [];
  sortedConcepts.forEach((concept) => {
    const conceptWithChildren = conceptMap.get(concept.id)!;
    if (concept.parentId) {
      const parent = conceptMap.get(concept.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(conceptWithChildren);
      }
    } else {
      rootConcepts.push(conceptWithChildren);
    }
  });

  return rootConcepts;
}

/**
 * flattenConcepts
 * Takes a nested tree of concepts and flattens them into a single array.
 */
export function flattenConcepts(concepts: ConceptIndex[]): ConceptIndex[] {
  const flattened: ConceptIndex[] = [];

  function traverse(concept: ConceptIndex) {
    flattened.push(concept);
    if (concept.children) {
      concept.children.forEach(traverse);
    }
  }

  concepts.forEach(traverse);

  // Sort again by level and order just to maintain consistent ordering
  return flattened.sort((a, b) => {
    if (a.level === b.level) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.level || 0) - (b.level || 0);
  });
}

