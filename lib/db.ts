import mongoose from 'mongoose';
import { getMongoUri } from './env';

/**
 * Next.js clears the module registry on every hot reload, which would otherwise
 * open a new connection pool per edit until MongoDB refuses them. Caching the
 * promise on `globalThis` survives reloads and keeps a single pool per process.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose._mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose
    .connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 10,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((error) => {
      // Clear the cached promise so the next request retries instead of
      // permanently rethrowing this one rejection.
      cache.promise = null;
      throw error;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}
