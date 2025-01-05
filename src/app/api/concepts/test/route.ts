import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

export async function GET() {
  try {
    console.log('Using API Key prefix:', env.GOOGLE_API_KEY.substring(0, 8) + '...');
    
    const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-exp-1206",
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 100,
      }
    });

    const result = await model.generateContent("Say hello!");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ success: true, message: text });
  } catch (error) {
    console.error('Gemini API test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 