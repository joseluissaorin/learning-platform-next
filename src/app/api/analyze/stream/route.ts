import { NextRequest } from 'next/server';
import { analyzeContent } from '@/lib/analysis';
import { type AnalysisRequest } from '@/types/analysis';
import { analysisCache } from '@/lib/redis/analysis-cache';

// Store for active analysis sessions
const activeSessions = new Map<string, {
  request: AnalysisRequest;
  controller: ReadableStreamDefaultController;
}>();

// Helper to send SSE messages
function sendEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
) {
  console.log("[Stream] Sending event:", { event, data });
  controller.enqueue(
    new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

// Helper to close stream gracefully
async function closeStream(controller: ReadableStreamDefaultController) {
  console.log("[Stream] Starting graceful stream closure");
  // Send a final progress event before closing
  sendEvent(controller, 'progress', {
    stage: 'Complete',
    progress: 100,
    timestamp: Date.now()
  });

  // Small delay to ensure all messages are sent
  console.log("[Stream] Waiting for messages to be sent");
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log("[Stream] Closing stream controller");
  controller.close();
}

// Handle POST request to start analysis
export async function POST(request: NextRequest) {
  console.log("[API] Analysis POST request received");
  const body = await request.json();
  const sessionId = request.nextUrl.searchParams.get('session');

  console.log("[API] POST request details:", {
    sessionId,
    contentLength: body.content?.length,
    format: body.format,
    language: body.language
  });

  if (!sessionId) {
    console.error("[API] POST request missing session ID");
    return new Response(JSON.stringify({ error: 'Session ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const analysisRequest: AnalysisRequest = {
    content: body.content,
    format: body.format || 'markdown',
    language: body.language || 'en'
  };

  // Store the request for the GET endpoint
  activeSessions.set(sessionId, {
    request: analysisRequest,
    controller: null as any // Will be set in GET request
  });

  console.log("[API] Stored analysis request for session:", sessionId);
  console.log("[API] Active sessions count:", activeSessions.size);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle GET request for SSE stream
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session');
  console.log("[API] Analysis stream GET request received for session:", sessionId);

  if (!sessionId) {
    console.error("[API] GET request missing session ID");
    return new Response(JSON.stringify({ error: 'Session ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error("[API] Session not found:", sessionId);
    console.log("[API] Active sessions:", Array.from(activeSessions.keys()));
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log("[API] Found session:", {
    sessionId,
    contentLength: session.request.content.length,
    hasController: !!session.controller
  });

  console.log("[API] Creating analysis stream");
  const stream = new ReadableStream({
    async start(controller) {
      // Store controller in session
      session.controller = controller;

      try {
        // Initial progress update
        console.log("[API] Starting analysis process");
        sendEvent(controller, 'progress', {
          stage: 'Starting analysis',
          progress: 0,
          timestamp: Date.now()
        });

        // Check cache first
        console.log("[API] Checking cache");
        sendEvent(controller, 'progress', {
          stage: 'Checking cache',
          progress: 10,
          timestamp: Date.now()
        });

        const cachedResult = await analysisCache.get(session.request);
        if (cachedResult) {
          console.log("[API] Cache hit, preparing to stream cached result");
          
          // Send intermediate progress updates for cache hit
          sendEvent(controller, 'progress', {
            stage: 'Processing cached result',
            progress: 50,
            timestamp: Date.now()
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          sendEvent(controller, 'progress', {
            stage: 'Retrieved from cache',
            progress: 90,
            timestamp: Date.now()
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          // Send the cached result
          console.log("[API] Sending cached result through stream");
          sendEvent(controller, 'complete', {
            ...cachedResult,
            timestamp: Date.now()
          });

          console.log("[API] Closing stream after cache hit");
          await closeStream(controller);
          activeSessions.delete(sessionId);
          return;
        }

        console.log("[API] Cache miss, proceeding with analysis");
        // If no cache hit, proceed with analysis
        sendEvent(controller, 'progress', {
          stage: 'Starting content analysis',
          progress: 20,
          timestamp: Date.now()
        });

        const result = await analyzeContent(
          session.request,
          (stage: string, progress: number) => {
            // Normalize progress to be between 20 and 90
            const normalizedProgress = 20 + (progress * 0.7);
            // Send progress updates through SSE
            sendEvent(controller, 'progress', {
              stage,
              progress: normalizedProgress,
              timestamp: Date.now()
            });
          }
        );

        // Send pre-completion progress
        sendEvent(controller, 'progress', {
          stage: 'Finalizing analysis',
          progress: 90,
          timestamp: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Send the final result
        console.log("[API] Analysis complete, sending result");
        sendEvent(controller, 'complete', {
          ...result,
          timestamp: Date.now()
        });

        console.log("[API] Closing stream after analysis");
        await closeStream(controller);
        activeSessions.delete(sessionId);
      } catch (error) {
        // Send error through SSE
        console.error("[API] Error during analysis:", error);
        sendEvent(controller, 'error', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to analyze content',
          timestamp: Date.now()
        });
        console.log("[API] Closing stream after error");
        await closeStream(controller);
        activeSessions.delete(sessionId);
      }
    },
  });

  console.log("[API] Returning stream response");
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 