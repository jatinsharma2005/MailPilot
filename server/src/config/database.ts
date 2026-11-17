import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[MongoDB] Connection failed (${errorName}). Check MONGODB_URI and database network access.`);
    if (ENV.NODE_ENV !== 'production' && error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
};
