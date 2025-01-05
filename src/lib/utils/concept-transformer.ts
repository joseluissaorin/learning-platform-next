import { type ConceptIndex } from '@/types/analysis';

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
  sortedConcepts.forEach(concept => {
    conceptMap.set(concept.id, { ...concept, children: [] });
  });

  // Build the tree structure
  const rootConcepts: ConceptIndex[] = [];
  sortedConcepts.forEach(concept => {
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

export function flattenConcepts(concepts: ConceptIndex[]): ConceptIndex[] {
  const flattened: ConceptIndex[] = [];
  
  function traverse(concept: ConceptIndex) {
    flattened.push(concept);
    if (concept.children) {
      concept.children.forEach(traverse);
    }
  }
  
  concepts.forEach(traverse);
  
  // Sort by level and order
  return flattened.sort((a, b) => {
    if (a.level === b.level) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.level || 0) - (b.level || 0);
  });
} 