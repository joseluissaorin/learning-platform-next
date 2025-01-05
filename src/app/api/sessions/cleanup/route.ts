import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cleanupSchema = z.object({
  thresholdDays: z.number().int().min(1).max(365).default(30),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { thresholdDays } = cleanupSchema.parse(body);

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - thresholdDays);

    // Use raw SQL for better performance
    await prisma.$executeRaw`
      UPDATE "LearningSession"
      SET status = 'inactive'
      WHERE "lastActiveAt" < ${threshold}
      AND status = 'active'
      AND "userId" = ${session.user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SESSION_CLEANUP]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to cleanup inactive sessions" },
      { status: 500 }
    );
  }
} 