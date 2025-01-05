import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Log what we received
    console.log("Received file:", {
      type: file.type,
      size: file.size,
      name: file instanceof File ? file.name : 'unknown'
    });

    // Create a new FormData with the file
    const markdownFormData = new FormData();
    markdownFormData.append("file", file);

    // Make the request to MarkItDown service
    const response = await fetch("https://markitdown.joseluissaorin.com/api/convert", {
      method: "POST",
      body: markdownFormData,
    });

    // Get the response text first
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    try {
      // Try to parse as JSON
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (e) {
      // If not JSON, return the raw text
      return NextResponse.json({
        success: false,
        error: "Failed to parse response",
        rawResponse: responseText
      });
    }
  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      { error: "Test endpoint error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 