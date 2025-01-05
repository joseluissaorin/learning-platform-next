import { QuestionType } from "@prisma/client";

export interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  options?: string[];
  explanation: string;
}

export interface QuestionGenerationParams {
  content: string;
  context?: string;
  difficulty?: number;
  preferredTypes?: QuestionType[];
  count?: number;
}

export interface QuestionEvaluation {
  isCorrect: boolean;
  feedback: string;
  alternativeExplanation?: string;
} 