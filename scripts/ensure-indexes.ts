import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { logger } from '../src/common/utils/logger.util';

// Load environment variables
dotenv.config();

async function ensureIndexes() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    logger.info('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Define index types
    type IndexDirection = 1 | -1 | 'text';
    interface IndexConfig {
      name: string;
      spec: { [key: string]: IndexDirection };
      options?: {
        unique?: boolean;
        weights?: { [key: string]: number };
      };
    }

    // Array of index configurations to ensure
    const requiredIndexes: IndexConfig[] = [
      {
        name: 'emailLower_unique',
        spec: { emailLower: 1 as IndexDirection },
        options: { unique: true }
      },
      {
        name: 'text_search',
        spec: { name: 'text' as IndexDirection, email: 'text' as IndexDirection },
        options: { weights: { name: 3, email: 1 } }
      },
      {
        name: 'age_createdAt',
        spec: { age: 1 as IndexDirection, createdAt: -1 as IndexDirection }
      },
    ];

    // Check and create each required index
    for (const indexConfig of requiredIndexes) {
      const existingIndexes = await usersCollection.listIndexes().toArray();
      const indexExists = existingIndexes.some(idx => idx.name === indexConfig.name);

      if (indexExists) {
        logger.info(`Index '${indexConfig.name}' already exists`);
      } else {
        try {
          await usersCollection.createIndex(
            indexConfig.spec,
            {
              name: indexConfig.name,
              background: true,
              ...(indexConfig.options || {})
            }
          );
          logger.info(`✓ Created index '${indexConfig.name}'`);
        } catch (error) {
          logger.error(`✗ Failed to create index '${indexConfig.name}':`, error.message);
        }
      }
    }

    // Log all current indexes for verification
    logger.info('\nCurrent indexes in users collection:');
    const allIndexes = await usersCollection.listIndexes().toArray();
    allIndexes.forEach(index => {
      logger.info(`- ${index.name}:`, JSON.stringify(index.key));
    });

  } catch (error) {
    logger.error('Error ensuring indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the script
ensureIndexes()
  .then(() => {
    logger.info('Index verification complete');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
  });