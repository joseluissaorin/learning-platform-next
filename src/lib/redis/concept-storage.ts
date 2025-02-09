import { getRedisClient } from './client';
import debug from 'debug';

const log = debug('app:redis:concept-storage');
const logError = debug('app:redis:concept-storage:error');

const TTL = 24 * 60 * 60; // 24 hours in seconds

export interface ConceptContent {
  layer1Summary: string;
  layer2Summary: string;
  layer3Content: string;
  metadata: {
    version: number;
    lastUpdated: string;
    parentPath: string[];
    level: number;
    order: string;
  }
}

export class ConceptStorageService {
  private generateKey(uuid: string, type: 'content' | 'layer2' | 'layer1' | 'metadata' | 'references') {
    return `concept:${uuid}:${type}`;
  }

  async storeConceptContent(uuid: string, content: ConceptContent): Promise<void> {
    const redis = await getRedisClient();
    const pipeline = redis.pipeline();

    try {
      // Store each layer separately
      pipeline.setex(
        this.generateKey(uuid, 'content'),
        TTL,
        content.layer3Content
      );

      pipeline.setex(
        this.generateKey(uuid, 'layer2'),
        TTL,
        content.layer2Summary
      );

      pipeline.setex(
        this.generateKey(uuid, 'layer1'),
        TTL,
        content.layer1Summary
      );

      pipeline.setex(
        this.generateKey(uuid, 'metadata'),
        TTL,
        JSON.stringify(content.metadata)
      );

      await pipeline.exec();
      log('Stored concept content for UUID:', uuid);
    } catch (error) {
      logError('Error storing concept content:', error);
      throw error;
    }
  }

  async getConceptContent(uuid: string): Promise<ConceptContent | null> {
    const redis = await getRedisClient();

    try {
      const [layer3Content, layer2Summary, layer1Summary, metadata] = await Promise.all([
        redis.get(this.generateKey(uuid, 'content')),
        redis.get(this.generateKey(uuid, 'layer2')),
        redis.get(this.generateKey(uuid, 'layer1')),
        redis.get(this.generateKey(uuid, 'metadata'))
      ]);

      if (!layer3Content || !layer2Summary || !layer1Summary || !metadata) {
        return null;
      }

      return {
        layer3Content,
        layer2Summary,
        layer1Summary,
        metadata: JSON.parse(metadata)
      };
    } catch (error) {
      logError('Error retrieving concept content:', error);
      throw error;
    }
  }

  async getLayerContent(uuid: string, layer: number): Promise<string | null> {
    const redis = await getRedisClient();

    try {
      let key: string;
      switch (layer) {
        case 3:
          key = this.generateKey(uuid, 'content');
          break;
        case 2:
          key = this.generateKey(uuid, 'layer2');
          break;
        case 1:
          key = this.generateKey(uuid, 'layer1');
          break;
        default:
          throw new Error(`Invalid layer: ${layer}`);
      }
      const content = await redis.get(key);
      return content;
    } catch (error) {
      logError('Error retrieving layer content:', error);
      throw error;
    }
  }

  async invalidateContent(uuid: string): Promise<void> {
    const redis = await getRedisClient();
    const pipeline = redis.pipeline();

    try {
      pipeline.del(this.generateKey(uuid, 'content'));
      pipeline.del(this.generateKey(uuid, 'layer2'));
      pipeline.del(this.generateKey(uuid, 'layer1'));
      pipeline.del(this.generateKey(uuid, 'metadata'));
      pipeline.del(this.generateKey(uuid, 'references'));

      await pipeline.exec();
      log('Invalidated content for UUID:', uuid);
    } catch (error) {
      logError('Error invalidating content:', error);
      throw error;
    }
  }
} 