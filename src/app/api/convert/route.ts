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

    try {
      // Try to parse as JSON
      const data = JSON.parse(responseText);
      
      if (data.markdown) {
        return NextResponse.json({
          success: true,
          markdown: data.markdown
        });
      }
      
      return NextResponse.json({
        success: false,
        error: data.error || "No markdown content received"
      }, { status: 400 });
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: "Failed to parse service response"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to convert document"
      },
      { status: 500 }
    );
  }
} 