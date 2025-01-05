import { Client } from 'minio';
import { env } from '@/env.mjs';

let minioClient: Client | null = null;

export async function getMinioClient(): Promise<Client> {
  if (!minioClient) {
    minioClient = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: parseInt(env.MINIO_PORT),
      useSSL: env.MINIO_USE_SSL === 'true',
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY
    });
  }
  return minioClient;
} 