import { Document, ProcessingStatus } from '@prisma/client';
import { documentQueue, embeddingQueue } from '../redis/queues';
import { prisma } from '../db/prisma';
import { redis } from '../redis/client';
import { convertToMarkdown } from '../upload';
import { getMinioClient } from '../storage/minio';
import { env } from '@/env.mjs';

interface ProcessingProgress {
  stage: ProcessingStatus;
  progress: number;
  error?: string;
}

export class DocumentProcessor {
  private static instance: DocumentProcessor;
  private processingStatus: Map<string, ProcessingProgress>;

  private constructor() {
    this.processingStatus = new Map();
  }

  public static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor();
    }
    return DocumentProcessor.instance;
  }

  public async processDocument(documentId: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateStatus(documentId, {
        stage: 'PROCESSING',
        progress: 0
      });

      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Get file from MinIO
      const minioClient = await getMinioClient();
      const fileStream = await minioClient.getObject(
        env.MINIO_BUCKET_NAME,
        document.storageKey
      );

      // Convert to markdown
      const markdownResult = await this.convertToMarkdown(fileStream);
      
      if (!markdownResult.success) {
        throw new Error(markdownResult.error || 'Failed to convert document');
      }

      // Update document with markdown content
      await prisma.document.update({
        where: { id: documentId },
        data: {
          content: markdownResult.markdown,
          status: 'CONVERTED'
        }
      });

      // Update progress
      await this.updateStatus(documentId, {
        stage: 'CONVERTED',
        progress: 50
      });

      // Queue for embedding generation
      await embeddingQueue.add(
        'generate-embeddings',
        { documentId },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );

      // Update final status
      await this.updateStatus(documentId, {
        stage: 'QUEUED_FOR_EMBEDDING',
        progress: 100
      });

    } catch (error) {
      console.error('Error processing document:', error);
      await this.updateStatus(documentId, {
        stage: 'ERROR',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      // Update document status in database
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ERROR'
        }
      });
    }
  }

  private async convertToMarkdown(fileStream: any): Promise<{
    success: boolean;
    markdown?: string;
    error?: string;
  }> {
    try {
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      // Create File object from buffer
      const file = new File([buffer], 'document', {
        type: 'application/octet-stream'
      });

      // Convert to markdown
      return await convertToMarkdown(file);
    } catch (error) {
      console.error('Error converting to markdown:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert to markdown'
      };
    }
  }

  private async updateStatus(
    documentId: string,
    status: ProcessingProgress
  ): Promise<void> {
    // Update in-memory status
    this.processingStatus.set(documentId, status);

    // Update in Redis for persistence
    await redis.set(
      `document:${documentId}:status`,
      JSON.stringify(status),
      'EX',
      3600 // 1 hour expiry
    );

    // Emit status update via WebSocket (to be implemented)
  }

  public async getStatus(documentId: string): Promise<ProcessingProgress | null> {
    // Check in-memory first
    const memoryStatus = this.processingStatus.get(documentId);
    if (memoryStatus) {
      return memoryStatus;
    }

    // Check Redis
    const redisStatus = await redis.get(`document:${documentId}:status`);
    if (redisStatus) {
      const status = JSON.parse(redisStatus) as ProcessingProgress;
      this.processingStatus.set(documentId, status); // Cache in memory
      return status;
    }

    return null;
  }
} 