import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    
    // Redis
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.string().default("6379"),
    REDIS_PASSWORD: z.string().optional(),
    
    // MinIO
    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.string().default("9000"),
    MINIO_USE_SSL: z.string().default("false"),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    MINIO_BUCKET_NAME: z.string().default("documents"),
    
    // LLM
    ANTHROPIC_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string(),
    
    // Auth
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    
    // App
    MAX_DOCUMENT_SIZE: z.number().default(15 * 1024 * 1024), // 15MB
  },
  client: {
    // Add client-side env vars here
  },
  runtimeEnv: {
    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Redis
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    
    // MinIO
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_PORT: process.env.MINIO_PORT,
    MINIO_USE_SSL: process.env.MINIO_USE_SSL,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME,
    
    // LLM
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    
    // Auth
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    
    // App
    MAX_DOCUMENT_SIZE: process.env.MAX_DOCUMENT_SIZE 
      ? parseInt(process.env.MAX_DOCUMENT_SIZE)
      : 15 * 1024 * 1024,
  },
}); 