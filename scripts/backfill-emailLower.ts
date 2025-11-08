import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function backfillEmailLower() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('users');

    // Find all users without emailLower field
    const users = await collection.find({ emailLower: { $exists: false } }).toArray();
    console.log(`Found ${users.length} users without emailLower field`);

    // Update each user
    let updated = 0;
    for (const user of users) {
      if (user.email) {
        await collection.updateOne(
          { _id: user._id },
          { $set: { emailLower: user.email.toLowerCase() } }
        );
        updated++;
      }
    }

    console.log(`Successfully updated ${updated} users`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
  }
}

backfillEmailLower().catch(console.error);