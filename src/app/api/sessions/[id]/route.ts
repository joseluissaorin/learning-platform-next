import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { title, status } = body;

    // Get resolved params
    const resolvedParams = await Promise.resolve(params);

    // Verify session ownership
    const learningSession = await prisma.learningSession.findUnique({
      where: { id: resolvedParams.id },
      select: { userId: true },
    });

    if (!learningSession) {
      return new NextResponse("Session not found", { status: 404 });
    }

    if (learningSession.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update session
    const updatedSession = await prisma.learningSession.update({
      where: { id: resolvedParams.id },
      data: {
        ...(title && { title }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[SESSION_UPDATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get resolved params
    const resolvedParams = await Promise.resolve(params);

    // Verify session ownership
    const learningSession = await prisma.learningSession.findUnique({
      where: { id: resolvedParams.id },
      select: { userId: true },
    });

    if (!learningSession) {
      return new NextResponse("Session not found", { status: 404 });
    }

    if (learningSession.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete session
    await prisma.learningSession.delete({
      where: { id: resolvedParams.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SESSION_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 