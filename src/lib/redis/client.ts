import Redis from 'ioredis';

let redis: Redis | null = null;

// This ensures Redis client is only created on the server side
if (typeof window === 'undefined') {
  if (!redis) {
    redis = new Redis({
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
}

export function getRedisClient(): Redis {
  if (!redis) {
    throw new Error('Redis client not initialized - are you trying to use it on the client side?');
  }
  return redis;
} 