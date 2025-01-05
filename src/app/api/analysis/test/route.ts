import { NextResponse } from "next/server";
import { analyzeContent } from "@/lib/analysis";
import { type AnalysisRequest } from "@/types/analysis";
import { env } from "@/lib/env";

const TEST_CONTENT = `
# Introduction to Programming
Programming is the process of creating a set of instructions that tell a computer how to perform a task.

## Basic Concepts
- Variables: Containers for storing data values
- Functions: Reusable blocks of code
- Control Flow: Decision making and loops

## Data Types
- Numbers: Integers and floating-point numbers
- Strings: Text data
- Booleans: True/false values
- Arrays: Collections of values

## Advanced Topics
- Object-Oriented Programming
- Error Handling
- Asynchronous Programming
`;

export async function GET(request: Request) {
  console.log("[Analysis Test] Received GET request:", {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    console.log("[Analysis Test] Starting test analysis");
    console.log("[Analysis Test] Environment check:", {
      hasGeminiKey: !!env.GOOGLE_API_KEY,
      keyPrefix: env.GOOGLE_API_KEY ? env.GOOGLE_API_KEY.substring(0, 4) + "..." : "not set"
    });
    
    const analysisRequest: AnalysisRequest = {
      content: TEST_CONTENT,
      format: "markdown",
      language: "en"
    };

    console.log("[Analysis Test] Request:", {
      contentLength: analysisRequest.content.length,
      format: analysisRequest.format,
      language: analysisRequest.language
    });

    const result = await analyzeContent(analysisRequest);
    
    console.log("[Analysis Test] Analysis completed:", {
      success: result.success,
      hasAnalysis: !!result.analysis,
      indexLength: result.index?.length,
      relationshipsCount: result.relationships?.length,
      error: result.error
    });

    if (!result.success) {
      throw new Error(result.error || "Analysis failed without error message");
    }

    return NextResponse.json({
      success: true,
      message: "Analysis test completed successfully",
      result
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Test analysis failed";
    console.error("[Analysis Test] Test failed:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
} 