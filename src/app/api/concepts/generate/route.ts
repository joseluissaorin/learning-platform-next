import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ExplanationService } from "@/lib/services/explanation-service";
import { logger } from "@/lib/debug/logger";

// Validation schema
const generateSchema = z.object({
  conceptId: z.string(),
  layer: z.number().int().min(1).max(3),
  sessionId: z.string(),
  conceptPath: z.array(z.string()).optional(),
  lastExplanation: z.string().optional()
});

// Initialize service
const explanationService = ExplanationService.getInstance();

export async function POST(request: NextRequest) {
  try {
    logger.info('ConceptGeneration', 'Starting request');

    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn('ConceptGeneration', 'No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    logger.info('ConceptGeneration', 'Request body received', {
      conceptId: body.conceptId,
      layer: body.layer,
      sessionId: body.sessionId
    });

    const validationResult = generateSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('ConceptGeneration', 'Validation failed', validationResult.error);
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get session document
    const sessionDoc = await prisma.sessionDocument.findFirst({
      where: { sessionId: body.sessionId }
    });

    if (!sessionDoc) {
      logger.error('ConceptGeneration', 'Session document not found', { sessionId: body.sessionId });
      return NextResponse.json(
        { error: "Session document not found" },
        { status: 404 }
      );
    }

    // Generate explanation using service
    const explanation = await explanationService.generateExplanation({
      conceptId: body.conceptId,
      layer: body.layer,
      structuredContent: sessionDoc.content,
      context: body.lastExplanation || '',
      conceptPath: body.conceptPath || []
    });

    // Cache the explanation
    await prisma.conceptExplanation.upsert({
      where: {
        conceptId_layer_sessionId: {
          conceptId: body.conceptId,
          layer: body.layer,
          sessionId: body.sessionId
        }
      },
      update: {
        content: explanation,
        updatedAt: new Date()
      },
      create: {
        conceptId: body.conceptId,
        layer: body.layer,
        sessionId: body.sessionId,
        content: explanation
      }
    });

    return NextResponse.json({ content: explanation });

  } catch (error) {
    logger.error('ConceptGeneration', 'Error generating explanation', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Error generating explanation", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = generateSchema.parse(body);

    // Get session document
    const sessionDoc = await prisma.sessionDocument.findFirst({
      where: { sessionId: validatedData.sessionId }
    });

    if (!sessionDoc) {
      return NextResponse.json(
        { error: "Session document not found" },
        { status: 404 }
      );
    }

    // Clear cache and regenerate
    await explanationService.clearCache(validatedData.conceptId, validatedData.layer);
    
    // Regenerate explanation
    const explanation = await explanationService.generateExplanation({
      conceptId: validatedData.conceptId,
      layer: validatedData.layer,
      structuredContent: sessionDoc.content,
      context: validatedData.lastExplanation || '',
      conceptPath: validatedData.conceptPath || [],
      forceRegenerate: true
    });

    // Update cached explanation
    await prisma.conceptExplanation.update({
      where: {
        conceptId_layer_sessionId: {
          conceptId: validatedData.conceptId,
          layer: validatedData.layer,
          sessionId: validatedData.sessionId
        }
      },
      data: {
        content: explanation,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ content: explanation });
  } catch (error) {
    logger.error('ConceptGeneration', 'Error regenerating explanation', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to regenerate explanation" },
      { status: 500 }
    );
  }
} 