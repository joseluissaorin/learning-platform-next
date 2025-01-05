import { Job } from 'bull';
import { documentQueue, embeddingQueue, learningUnitQueue } from '../redis/queues';
import { DocumentProcessor } from './document-processor';
import { EmbeddingGenerator } from './embedding-generator';
import { LearningUnitGenerator } from './learning-unit-generator';

interface DocumentJob {
  documentId: string;
}

interface EmbeddingJob {
  documentId: string;
}

interface LearningUnitJob {
  documentId: string;
  embeddings: number[][];
}

// Initialize processors
const documentProcessor = DocumentProcessor.getInstance();
const embeddingGenerator = new EmbeddingGenerator();
const learningUnitGenerator = new LearningUnitGenerator();

// Process document uploads
documentQueue.process(async (job: Job<DocumentJob>) => {
  const { documentId } = job.data;
  await documentProcessor.processDocument(documentId);
});

// Process embedding generation
embeddingQueue.process(async (job: Job<EmbeddingJob>) => {
  const { documentId } = job.data;
  await embeddingGenerator.generateEmbeddings(documentId);
});

// Process learning unit generation
learningUnitQueue.process(async (job: Job<LearningUnitJob>) => {
  const { documentId, embeddings } = job.data;
  await learningUnitGenerator.generateUnits(documentId, embeddings);
});

// Error handling
documentQueue.on('failed', (job: Job<DocumentJob>, error: Error) => {
  console.error(`Document processing failed for ${job.data.documentId}:`, error);
});

embeddingQueue.on('failed', (job: Job<EmbeddingJob>, error: Error) => {
  console.error(`Embedding generation failed for ${job.data.documentId}:`, error);
});

learningUnitQueue.on('failed', (job: Job<LearningUnitJob>, error: Error) => {
  console.error(`Learning unit generation failed for ${job.data.documentId}:`, error);
});

// Cleanup completed jobs
documentQueue.on('completed', async (job: Job<DocumentJob>) => {
  await job.remove();
});

embeddingQueue.on('completed', async (job: Job<EmbeddingJob>) => {
  await job.remove();
});

learningUnitQueue.on('completed', async (job: Job<LearningUnitJob>) => {
  await job.remove();
}); 