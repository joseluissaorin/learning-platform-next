import { NextResponse } from "next/server";
import { ConceptGenerationService } from "@/lib/services/concept-generation";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

interface LearningConcept {
  id: string;
  title: string;
  isLeafNode?: boolean;
  prerequisites: Array<{ id: string }>;
  relations?: Array<{
    targetId: string;
    target: {
      id: string;
      title: string;
    }
    type: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const { conceptId, layer, sessionId } = await request.json();

    if (!conceptId || !layer || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get session data
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get document content using raw query
    const documents = await prisma.$queryRaw<Array<{ content: string }>>`
      SELECT content FROM "SessionDocument"
      WHERE "sessionId" = ${sessionId}
      LIMIT 1
    `;

    const document = documents[0];
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get concept data from session concepts
    const concept = session.concepts.find((c: any) => c.id === conceptId) as LearningConcept | undefined;

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    // Get parent titles for proper context
    const parentTitles: string[] = [];
    let parentId: string | undefined;
    
    if (layer > 1) {
      const idParts = conceptId.split('.');
      if (idParts.length > 1) {
        const parentNumber = idParts[0];
        const parentConcept = session.concepts.find(
          (c: any) => c.id.startsWith(`${parentNumber}.-`)
        ) as LearningConcept | undefined;
        
        if (parentConcept) {
          parentTitles.push(parentConcept.title);
          parentId = parentConcept.id;
        }
      }
    }

    // Get related concepts with null check
    const relatedConcepts = concept.relations?.map(rel => ({
      id: rel.targetId,
      title: rel.target.title,
      relationship: rel.type
    })) || [];

    try {
      // Create service instance
      const service = new ConceptGenerationService();
      
      // Generate new content first to avoid unnecessary deletion if generation fails
      const result = await service.generateContent({
        conceptId,
        layer,
        conceptTitle: concept.title,
        isLeafNode: concept.isLeafNode ?? false,
        documentContent: document.content,
        sessionId,
        parentTitles,
        parentId,
        prerequisites: concept.prerequisites?.map(p => p.id) || [],
        relatedConcepts
      }, true); // Force new generation

      if (!result?.content) {
        return NextResponse.json(
          { error: 'No content generated' },
          { status: 500 }
        );
      }

      // Perform deletion and creation in a single transaction
      const updatedExplanation = await prisma.$transaction(async (tx) => {
        // Delete existing explanation
        await tx.conceptExplanation.deleteMany({
          where: {
            conceptId,
            layer,
            sessionId
          }
        });

        // Invalidate cache
        await service.invalidateCache(conceptId, layer);
        
        // Create new explanation
        return tx.conceptExplanation.create({
          data: {
            conceptId,
            layer,
            content: result.content,
            sessionId
          }
        });
      });

      return NextResponse.json({
        content: updatedExplanation.content,
        fromCache: false
      });
    } catch (genError) {
      console.error('Error in regeneration process:', genError instanceof Error ? genError.message : 'Unknown error');
      return NextResponse.json(
        { error: genError instanceof Error ? genError.message : 'Failed to regenerate content' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in regenerate endpoint:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 