import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get resolved params
    const resolvedParams = await Promise.resolve(params);

    // Verify session ownership
    const learningSession = await prisma.$queryRaw`
      SELECT "userId"
      FROM "LearningSession"
      WHERE id = ${resolvedParams.id}
    `;

    if (!learningSession || !Array.isArray(learningSession) || learningSession.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (learningSession[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update session activity
    await prisma.$executeRaw`
      UPDATE "LearningSession"
      SET "lastActiveAt" = NOW()
      WHERE id = ${resolvedParams.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SESSION_ACTIVITY_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update session activity" },
      { status: 500 }
    );
  }
} 