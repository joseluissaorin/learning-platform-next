import { type AssessmentQuestion, type AssessmentResult } from "@/lib/services/assessment-service";
import { type ConceptIndex } from "@/types/analysis";

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';

export interface QuestionGenerationParams {
  sessionTitle: string;
  concepts: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  requiredQuestionTypes: {
    multipleChoice: number;
    trueFalse: number;
    openEnded: number;
  };
}

export interface AnswerValidationParams {
  conceptContext: string;
  question: AssessmentQuestion;
  userAnswer: string;
}

export type AIProviderType = 'groq' | 'gemini' | 'openai' | 'custom-openai';

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

export interface AssessmentAIProvider {
  generateQuestions(params: QuestionGenerationParams): Promise<AssessmentQuestion[]>;
  validateAnswer(params: AnswerValidationParams): Promise<AssessmentResult>;
}

export class AssessmentAIFactory {
  private static instance: AssessmentAIFactory;
  private currentProvider: AssessmentAIProvider | null = null;

  private constructor() {}

  public static getInstance(): AssessmentAIFactory {
    if (!AssessmentAIFactory.instance) {
      AssessmentAIFactory.instance = new AssessmentAIFactory();
    }
    return AssessmentAIFactory.instance;
  }

  public async initializeProvider(config: AIProviderConfig): Promise<void> {
    switch (config.type) {
      case 'groq': {
        const { GroqProvider } = await import('./providers/groq-provider');
        this.currentProvider = new GroqProvider(config);
        break;
      }
      case 'gemini': {
        const { GeminiProvider } = await import('./providers/gemini-provider');
        this.currentProvider = new GeminiProvider(config);
        break;
      }
      case 'openai': {
        const { OpenAIProvider } = await import('./providers/openai-provider');
        this.currentProvider = new OpenAIProvider(config);
        break;
      }
      case 'custom-openai': {
        const { CustomOpenAIProvider } = await import('./providers/custom-openai-provider');
        this.currentProvider = new CustomOpenAIProvider(config);
        break;
      }
      default:
        throw new Error(`Unsupported AI provider type: ${config.type}`);
    }
  }

  public getCurrentProvider(): AssessmentAIProvider {
    if (!this.currentProvider) {
      throw new Error('AI provider not initialized. Call initializeProvider first.');
    }
    return this.currentProvider;
  }
}

export const assessmentAIFactory = AssessmentAIFactory.getInstance(); 