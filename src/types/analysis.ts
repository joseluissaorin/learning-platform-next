export interface ConceptAnalysis {
  fundamentalConcepts: string[];
  intermediateConcepts: string[];
  advancedConcepts: string[];
  hierarchicalStructure: string;
  justification?: string;
}

export interface ConceptIndex {
  id: string;
  title: string;
  level: number;
  content: string;
  children?: ConceptIndex[];
  parentId?: string;
  order: number;
}

export interface AnalysisRequest {
  content: string;
  format?: "markdown" | "text";
  language?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: ConceptAnalysis;
  index?: ConceptIndex[];
  relationships?: ConceptRelationship[];
  error?: string;
}

export interface ConceptRelationship {
  sourceId: string;
  targetId: string;
  type: "prerequisite" | "related" | "followUp";
  strength: number; // 0-1
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  concepts: ConceptIndex[];
  relationships: ConceptRelationship[];
  estimatedDuration: number; // in minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[]; // concept IDs
  learningObjectives: string[];
} 