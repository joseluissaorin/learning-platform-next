import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ConceptIndex } from "@/types/analysis";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log("[Session Creation] User authenticated:", session?.user?.id);

    if (!session?.user?.id) {
      console.error("[Session Creation] No authenticated user");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Ensure user exists in database
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.log("[Session Creation] User not found in database, creating user");
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || null,
          image: session.user.image || null,
        }
      });
      console.log("[Session Creation] User created:", user.id);
    }

    // Get request body
    const body = await request.json();
    console.log("[Session Creation] Request body received:", {
      hasFiles: !!body.files,
      filesCount: body.files?.length,
      hasAnalysis: !!body.analysis,
      hasIndex: !!body.index,
      contentLength: body.content?.length
    });

    // Validate request body
    if (!body.files || !body.analysis || !body.index || !body.content) {
      console.error("[Session Creation] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate concept index structure
    const index = body.index as ConceptIndex[];
    console.log("[Session Creation] Index array length:", index.length);

    if (!Array.isArray(index) || index.length === 0) {
      console.error("[Session Creation] Invalid concept index structure");
      return NextResponse.json(
        { error: "Invalid concept index structure" },
        { status: 400 }
      );
    }

    // Generate session title from first file name
    const title = body.files[0]?.title || "New Learning Session";
    console.log("[Session Creation] Generated session title:", title);

    const sessionId = randomUUID();
    console.log("[Session Creation] Generated session ID:", sessionId);

    // Create session and document in a transaction
    const createdSession = await prisma.$transaction(async (tx) => {
      // Create the session first
      const session = await tx.learningSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          title,
          concepts: index as unknown as Prisma.InputJsonValue[],
          status: 'active',
          progress: 0
        }
      });

      // Create the associated document using raw query
      const metadata = JSON.stringify({
        files: body.files,
        analysis: body.analysis,
        timestamp: new Date().toISOString()
      });
      const indexJson = JSON.stringify(body.index);
      
      await tx.$executeRaw`
        INSERT INTO "SessionDocument" (id, title, content, index, metadata, "sessionId", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${title}, ${body.content}, ${indexJson}::jsonb, ${metadata}::jsonb, ${session.id}, NOW(), NOW())
      `;

      return session;
    });

    console.log("[Session Creation] Session created successfully:", {
      id: createdSession.id,
      title: createdSession.title
    });

    return NextResponse.json(createdSession);
  } catch (error) {
    console.error("[Session Creation] Fatal error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user's sessions
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[Session Retrieval] Fatal error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve sessions" },
      { status: 500 }
    );
  }
} 