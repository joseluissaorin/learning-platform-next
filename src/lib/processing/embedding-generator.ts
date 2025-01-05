import { prisma } from '../db/prisma';
import { learningUnitQueue } from '../redis/queues';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/env.mjs';

export class EmbeddingGenerator {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  }

  public async generateEmbeddings(documentId: string): Promise<void> {
    try {
      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'EMBEDDING' }
      });

      // Get document content
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document || !document.content) {
        throw new Error('Document not found or has no content');
      }

      // Split content into chunks
      const chunks = this.splitIntoChunks(document.content);

      // Generate embeddings for each chunk
      const embeddings: number[][] = [];
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk);
        embeddings.push(embedding);

        // Store embedding in database
        await prisma.embedding.create({
          data: {
            vector: embedding,
            content: chunk,
            documentId: document.id
          }
        });
      }

      // Queue for learning unit generation
      await learningUnitQueue.add(
        'generate-units',
        { documentId, embeddings },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'QUEUED_FOR_ANALYSIS' }
      });

    } catch (error) {
      console.error('Error generating embeddings:', error);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' }
      });
      throw error;
    }
  }

  private splitIntoChunks(content: string, maxChunkSize: number = 1000): string[] {
    const sentences = content.split(/[.!?]+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
} 