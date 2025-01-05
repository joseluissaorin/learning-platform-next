import { NextResponse } from "next/server";
import { analyzeContent } from "@/lib/analysis";
import { type AnalysisRequest } from "@/types/analysis";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();

    // Set up analysis timeout
    const analysisPromise = analyzeContent(body as AnalysisRequest);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Analysis timed out")),
        env.ANALYSIS_TIMEOUT,
      ),
    );

    // Race between analysis and timeout
    const result = await Promise.race([analysisPromise, timeoutPromise]) as { success: boolean };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in analysis API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
} 