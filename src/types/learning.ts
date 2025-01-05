import { type ConceptIndex } from "./analysis";

export type LearningSession = {
  id: string;
  title: string;
  userId: string;
  progress: number;
  concepts: ConceptIndex[];
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  document?: {
    id: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  };
};

export interface LearningSessionProps {
  session: LearningSession;
}

export interface ConceptQuestion {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  type: "open" | "multiple";
  options?: string[];
}

export interface Concept {
  id: string;
  title: string;
  content: string;
  children?: Concept[];
  parent?: Concept;
  prerequisites?: string[];
  relations?: Array<{
    targetId: string;
    targetTitle: string;
    type: string;
  }>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface QuestionPanelProps {
  explanationId: string;
  concept: Concept;
}

export interface Section {
  title: string;
  content?: string;
  subsections?: Section[];
}

export interface Index {
  sections: Section[];
  sessionId?: string;
} 