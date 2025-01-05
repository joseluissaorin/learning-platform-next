import { QuestionType } from "@prisma/client";
import { GeneratedQuestion } from "./types";
import { getClaudeConfig } from "./config";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: string;
  stop_reason: string;
  model: string;
}

const questionGenerationPrompt = `You are an expert educator tasked with creating insightful questions that test deep understanding rather than mere memorization. Based on the following content, create questions that:
1. Test conceptual understanding
2. Encourage critical thinking
3. Help identify knowledge gaps
4. Follow a natural progression from basic to advanced concepts

Content to analyze:
{content}

Additional context:
{context}

For each question:
- Create a clear, concise question text
- For multiple choice questions, provide 4 options with one correct answer
- Include a detailed explanation that helps understand the concept
- Ensure questions are at an appropriate difficulty level ({difficulty}/5)

Generate {count} questions of the following types: {types}

Format your response as a JSON array of questions, each with:
- text: The question text
- type: The question type (MULTIPLE_CHOICE, OPEN_ENDED, or TRUE_FALSE)
- options: Array of options for multiple choice questions
- explanation: Detailed explanation of the answer

Example output:
[
  {
    "text": "What is the main principle...",
    "type": "MULTIPLE_CHOICE",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "explanation": "The correct answer is..."
  }
]`;

export async function generateQuestionsWithClaude(
  content: string,
  context: string = "",
  difficulty: number = 1,
  preferredTypes: QuestionType[] = [QuestionType.MULTIPLE_CHOICE],
  count: number = 3
): Promise<GeneratedQuestion[]> {
  const config = getClaudeConfig();

  const prompt = questionGenerationPrompt
    .replace("{content}", content)
    .replace("{context}", context)
    .replace("{difficulty}", difficulty.toString())
    .replace("{count}", count.toString())
    .replace("{types}", preferredTypes.join(", "));

  const messages: ClaudeMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": config.version,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data: ClaudeResponse = await response.json();
    const questions: GeneratedQuestion[] = JSON.parse(data.content);

    return questions;
  } catch (error) {
    console.error("Error generating questions with Claude:", error);
    throw error;
  }
}

export async function evaluateAnswerWithClaude(
  question: GeneratedQuestion,
  answer: string,
  content: string
): Promise<{
  isCorrect: boolean;
  feedback: string;
}> {
  const config = getClaudeConfig();

  const prompt = `Evaluate the following answer to a question. Provide detailed feedback explaining why the answer is correct or incorrect, and what concepts the student should review if needed.

Question: ${question.text}
Student's Answer: ${answer}
Correct Answer: ${question.type === QuestionType.MULTIPLE_CHOICE ? question.options![0] : question.explanation}

Original Content:
${content}

Format your response as a JSON object with:
- isCorrect: boolean indicating if the answer is correct
- feedback: detailed explanation and feedback

Example:
{
  "isCorrect": true,
  "feedback": "Your answer demonstrates good understanding..."
}`;

  const messages: ClaudeMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": config.version,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data: ClaudeResponse = await response.json();
    return JSON.parse(data.content);
  } catch (error) {
    console.error("Error evaluating answer with Claude:", error);
    throw error;
  }
} 