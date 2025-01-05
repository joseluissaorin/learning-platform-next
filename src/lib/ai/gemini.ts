import { QuestionType } from "@prisma/client";
import { GeneratedQuestion } from "./types";
import { getGeminiConfig, getGeminiEndpoint } from "./config";

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

const enhanceQuestionPrompt = `As an expert educator, enhance the following question with additional context, examples, and alternative explanations. Make the question more engaging and help students better understand the concept.

Original Question:
{question}

Original Content:
{content}

Enhance the question by:
1. Adding relevant examples
2. Providing more context
3. Including real-world applications
4. Making the explanation more detailed and clear

Format your response as a JSON object with the same structure as the original question, but with enhanced content.

Example output:
{
  "text": "Enhanced question text...",
  "type": "MULTIPLE_CHOICE",
  "options": ["Enhanced option A", "Enhanced option B", "Enhanced option C", "Enhanced option D"],
  "explanation": "Enhanced explanation with examples..."
}`;

export async function enhanceQuestionWithGemini(
  question: GeneratedQuestion,
  content: string
): Promise<GeneratedQuestion> {
  const config = getGeminiConfig();
  const endpoint = getGeminiEndpoint();

  const prompt = enhanceQuestionPrompt
    .replace("{question}", JSON.stringify(question, null, 2))
    .replace("{content}", content);

  try {
    const response = await fetch(`${endpoint}?key=${config.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const enhancedQuestion: GeneratedQuestion = JSON.parse(
      data.candidates[0].content.parts[0].text
    );

    return enhancedQuestion;
  } catch (error) {
    console.error("Error enhancing question with Gemini:", error);
    throw error;
  }
}

export async function generateAlternativeExplanationWithGemini(
  question: GeneratedQuestion,
  content: string,
  previousExplanations: string[]
): Promise<string> {
  const config = getGeminiConfig();
  const endpoint = getGeminiEndpoint();

  const prompt = `Create a new, alternative explanation for the following question. The explanation should be different from previous explanations but still help students understand the concept.

Question: ${question.text}
Original Explanation: ${question.explanation}

Previous Explanations:
${previousExplanations.map((exp, i) => `${i + 1}. ${exp}`).join("\n")}

Original Content:
${content}

Create a new explanation that:
1. Uses different examples or analogies
2. Approaches the concept from a new angle
3. Connects to different real-world applications
4. Maintains accuracy while being unique

Provide only the new explanation text.`;

  try {
    const response = await fetch(`${endpoint}?key=${config.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating alternative explanation with Gemini:", error);
    throw error;
  }
} 