import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";
import { z } from "zod";

// Validation schema for query parameters
const querySchema = z.object({
  layer: z.string().transform(Number).pipe(z.number().int().min(1))
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validatedQuery = querySchema.parse({
      layer: searchParams.get("layer")
    });

    const conceptId = params.id;

    // Check cache first
    const cacheKey = `concept:${conceptId}:${validatedQuery.layer}`;
    const cachedExplanation = await redis.get(cacheKey);
    if (cachedExplanation) {
      return NextResponse.json({ content: cachedExplanation });
    }

    // If not in cache, get from database
    const explanation = await prisma.conceptExplanation.findUnique({
      where: {
        conceptId_layer: {
          conceptId,
          layer: validatedQuery.layer
        }
      }
    });

    if (!explanation) {
      return NextResponse.json(
        { error: "Explanation not found" },
        { status: 404 }
      );
    }

    // Cache the explanation
    await redis.set(cacheKey, explanation.content, "EX", 3600); // 1 hour

    return NextResponse.json({ content: explanation.content });
  } catch (error) {
    console.error("Error retrieving concept explanation:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to retrieve explanation" },
      { status: 500 }
    );
  }
} 