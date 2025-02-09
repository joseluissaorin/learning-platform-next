import type Redis from 'ioredis';

let redis: Redis | null = null;

export async function getRedisClient(): Promise<Redis> {
  if (typeof window !== 'undefined') {
    throw new Error('Redis client cannot be used on the client side');
  }

  if (!redis) {
    const { default: RedisClient } = await import('ioredis');
    redis = new RedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      // Disable auto reconnect in development to prevent hanging
      retryStrategy: process.env.NODE_ENV === 'production' 
        ? (times) => Math.min(times * 50, 2000)
        : () => null
    });

    redis.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }

  return redis;
} 