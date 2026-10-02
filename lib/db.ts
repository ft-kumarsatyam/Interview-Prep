import mongoose from "mongoose";
import { env } from "./env";

/**
 * One cached connection per server instance. On Vercel each warm function
 * reuses it; without the global cache, hot reload and cold starts would open
 * a new pool every time and exhaust Atlas M0's connection limit.
 */
const globalForMongoose = globalThis as unknown as {
  mongooseConn?: Promise<typeof mongoose>;
};

export function connectDb(): Promise<typeof mongoose> {
  globalForMongoose.mongooseConn ??= mongoose
    .connect(env().MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
    .catch((err) => {
      globalForMongoose.mongooseConn = undefined;
      throw err;
    });
  return globalForMongoose.mongooseConn;
}
