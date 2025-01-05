import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Skip API key check for NextAuth routes and convert endpoint
  if (
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/api/convert") ||
    request.nextUrl.pathname.startsWith("/api/test-convert") ||
    request.nextUrl.pathname.startsWith("/api/analyze") ||
    request.nextUrl.pathname.startsWith("/api/analysis") ||
    request.nextUrl.pathname.startsWith("/api/sessions") ||
    request.nextUrl.pathname.startsWith("/api/concepts")
  ) {
    return NextResponse.next();
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handleCORS(request);
  }

  // Get the API key from the request headers
  const apiKey = request.headers.get("x-api-key");

  // Validate API key for non-OPTIONS requests
  if (
    !apiKey ||
    apiKey !== process.env.API_KEY
  ) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid API key" }),
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  return handleCORS(request);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400",
};

function handleCORS(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure the middleware to run only on API routes
export const config = {
  matcher: "/api/:path*",
}; 