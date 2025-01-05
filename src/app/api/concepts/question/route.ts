import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import { type NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

export async function POST(req: NextRequest) {
  try {
    const { question, conceptId, explanationId, context } = await req.json();

    if (!question || !conceptId || !explanationId || !context) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const prompt = `You are a helpful AI tutor. You are helping a student understand a concept. Here is the context about the concept:

${context}

The student asks: "${question}"

Please provide a clear, concise, and helpful answer that:
1. Directly addresses the student's question
2. Uses examples when appropriate
3. Connects to the provided context
4. Encourages deeper understanding
5. Is formatted in markdown

Keep your response focused and to the point, ideally no more than 2-3 paragraphs unless more detail is clearly needed.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return new Response(
      JSON.stringify({ answer }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling question:', error);
    return new Response(
      JSON.stringify({ error: "Failed to process question" }),
      { status: 500 }
    );
  }
} 