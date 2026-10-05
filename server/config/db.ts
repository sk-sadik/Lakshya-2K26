import mongoose from 'mongoose';

const MAX_ATTEMPTS = 4;

async function attempt(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lakshya2027';
  const conn = await mongoose.connect(uri, {
    maxPoolSize: 100, // Efficiently handles 1000+ concurrent incoming requests
    minPoolSize: 10,
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
  });
  console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
}

export async function connectDB(): Promise<void> {
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      await attempt();
      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message.split('\n')[0] : String(error);
      console.error(`[MongoDB] Connection attempt ${i}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (i < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 4000 * i));
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      } else {
        console.error('[MongoDB] Giving up after all retries.');
        process.exit(1);
      }
    }
  }
}
