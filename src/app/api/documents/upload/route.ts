import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getMinioClient } from '@/lib/storage/minio';
import { prisma } from '@/lib/db/prisma';
import { documentQueue } from '@/lib/redis/queues';
import { env } from '@/env.mjs';

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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > env.MAX_DOCUMENT_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit' },
        { status: 400 }
      );
    }

    // Generate unique storage key
    const storageKey = `${session.user.id}/${crypto.randomUUID()}-${file.name}`;

    // Upload to MinIO
    const minioClient = await getMinioClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    await minioClient.putObject(
      env.MINIO_BUCKET_NAME,
      storageKey,
      buffer,
      file.size,
      {
        'Content-Type': file.type
      }
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: file.name,
        mimeType: file.type,
        size: file.size,
        status: 'PENDING',
        storageKey,
        userId: session.user.id,
        content: '' // Will be updated after conversion
      }
    });

    // Queue for processing
    await documentQueue.add(
      'process-document',
      { documentId: document.id },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    );

    return NextResponse.json({
      id: document.id,
      status: document.status
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
} 