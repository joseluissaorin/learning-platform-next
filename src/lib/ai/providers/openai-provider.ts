import { type AssessmentAIProvider, type AIProviderConfig, type QuestionGenerationParams, type AnswerValidationParams } from "../assessment-ai-provider";
import { type AssessmentQuestion, type AssessmentResult } from "@/lib/services/assessment-service";
import OpenAI from "openai";

export class OpenAIProvider implements AssessmentAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl // Optional, defaults to OpenAI's API
    });
  }

  private buildQuestionPrompt(params: QuestionGenerationParams): string {
    return `
      You are an expert educational assessment system. Generate questions based on the following concepts:

      Session Title: ${params.sessionTitle}

      Concepts to Cover:
      ${params.concepts.map(c => `- ${c.title}: ${c.content}`).join('\n')}

      Required Question Distribution:
      - Multiple Choice: ${params.requiredQuestionTypes.multipleChoice}
      - True/False: ${params.requiredQuestionTypes.trueFalse}
      - Open Ended: ${params.requiredQuestionTypes.openEnded}

      For each question, provide:
      1. Question text
      2. Question type
      3. Options (for multiple choice)
      4. Correct answer
      5. Explanation

      Format the response as a JSON array of questions.
      Each question should follow this structure:
      {
        "id": "unique-id",
        "text": "question text",
        "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "OPEN_ENDED",
        "options": ["option1", "option2", ...] (for multiple choice),
        "correctAnswer": "the correct answer",
        "explanation": "explanation of the answer"
      }
    `;
  }

  private buildValidationPrompt(params: AnswerValidationParams): string {
    return `
      You are an expert educational assessment system. Validate the following answer:

      Context:
      ${params.conceptContext}

      Question:
      ${params.question.text}

      Type: ${params.question.type}
      ${params.question.options ? `Options: ${params.question.options.join(', ')}` : ''}

      User's Answer:
      ${params.userAnswer}

      Evaluate the answer and provide:
      1. Whether it's correct (true/false)
      2. Detailed feedback explaining why
      3. A confidence score (0-100) indicating how confident you are in this assessment

      Format the response as JSON:
      {
        "isCorrect": boolean,
        "feedback": "detailed feedback",
        "confidenceScore": number
      }
    `;
  }

  public async generateQuestions(params: QuestionGenerationParams): Promise<AssessmentQuestion[]> {
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert educational assessment system that generates questions and validates answers."
          },
          {
            role: "user",
            content: this.buildQuestionPrompt(params)
          }
        ],
        model: "gpt-4-turbo-preview",
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const questions = JSON.parse(response);

      // Validate and transform the questions
      return questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        explanation: q.explanation,
        learningUnitId: params.concepts[0].id // Use the first concept's ID as the learning unit
      }));
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      throw new Error('Failed to generate questions');
    }
  }

  public async validateAnswer(params: AnswerValidationParams): Promise<AssessmentResult> {
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert educational assessment system that generates questions and validates answers."
          },
          {
            role: "user",
            content: this.buildValidationPrompt(params)
          }
        ],
        model: "gpt-4-turbo-preview",
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const validation = JSON.parse(response);

      return {
        questionId: params.question.id,
        isCorrect: validation.isCorrect,
        feedback: validation.feedback,
        confidenceScore: validation.confidenceScore
      };
    } catch (error) {
      console.error('Error validating answer with OpenAI:', error);
      throw new Error('Failed to validate answer');
    }
  }
} 