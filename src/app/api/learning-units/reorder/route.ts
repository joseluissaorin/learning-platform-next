import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// Validation schema for request body
const reorderSchema = z.object({
  documentId: z.string(),
  units: z.array(z.object({
    id: z.string(),
    order: z.number().int().min(0)
  }))
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = reorderSchema.parse(body);

    // Check document ownership
    const document = await prisma.document.findUnique({
      where: {
        id: validatedData.documentId,
        userId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update learning unit orders in a transaction
    await prisma.$transaction(
      validatedData.units.map(unit => 
        prisma.learningUnit.update({
          where: {
            id: unit.id,
            documentId: validatedData.documentId // Ensure unit belongs to document
          },
          data: {
            order: unit.order
          }
        })
      )
    );

    // Get updated learning units
    const updatedUnits = await prisma.learningUnit.findMany({
      where: {
        documentId: validatedData.documentId
      },
      orderBy: {
        order: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      units: updatedUnits
    });

  } catch (error) {
    console.error('Error reordering learning units:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to reorder learning units' },
      { status: 500 }
    );
  }
} 