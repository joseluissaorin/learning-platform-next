import { QuestionType } from "@prisma/client";
import { GeneratedQuestion, QuestionGenerationParams } from "./types";
import { generateQuestionsWithClaude, evaluateAnswerWithClaude } from "./claude";
import { enhanceQuestionWithGemini, generateAlternativeExplanationWithGemini } from "./gemini";

export async function generateQuestions({
  content,
  context = "",
  difficulty = 1,
  preferredTypes = [QuestionType.MULTIPLE_CHOICE, QuestionType.OPEN_ENDED],
  count = 3
}: QuestionGenerationParams): Promise<GeneratedQuestion[]> {
  // First, use Claude to analyze the content and create sophisticated questions
  const claudeQuestions = await generateQuestionsWithClaude(
    content,
    context,
    difficulty,
    preferredTypes,
    count
  );

  // Then, use Gemini to enhance each question with additional context and examples
  const enhancedQuestions = await Promise.all(
    claudeQuestions.map(async (question) => {
      try {
        return await enhanceQuestionWithGemini(question, content);
      } catch (error) {
        console.error("Error enhancing question:", error);
        return question; // Fallback to original question if enhancement fails
      }
    })
  );

  return enhancedQuestions;
}

export async function evaluateAnswer(
  question: GeneratedQuestion,
  answer: string,
  content: string
): Promise<{
  isCorrect: boolean;
  feedback: string;
  alternativeExplanation?: string;
}> {
  // Use Claude for initial evaluation
  const evaluation = await evaluateAnswerWithClaude(question, answer, content);

  // If the answer is incorrect, use Gemini to generate an alternative explanation
  if (!evaluation.isCorrect) {
    try {
      const alternativeExplanation = await generateAlternativeExplanationWithGemini(
        question,
        content,
        [question.explanation] // Pass previous explanations
      );
      return {
        ...evaluation,
        alternativeExplanation,
      };
    } catch (error) {
      console.error("Error generating alternative explanation:", error);
      return evaluation;
    }
  }

  return evaluation;
}

export async function generateAlternativeExplanation(
  question: GeneratedQuestion,
  content: string,
  previousExplanations: string[]
): Promise<string> {
  return generateAlternativeExplanationWithGemini(
    question,
    content,
    previousExplanations
  );
} 