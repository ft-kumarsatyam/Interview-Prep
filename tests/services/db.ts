import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | undefined;

/** Spin up a throwaway MongoDB and point the app's env at it. */
export async function startDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  Object.assign(process.env, {
    MONGODB_URI: mongod.getUri("prepos-test"),
    AUTH_SECRET: "test-secret-test-secret-test-secret-123",
    ADMIN_EMAIL: "owner@example.com",
    ADMIN_PASSWORD_HASH_B64: "dGVzdC1oYXNoLXRlc3QtaGFzaA==",
    ADMIN_NAME: "Tester",
    APP_TIMEZONE: "Asia/Kolkata",
  });
  const { connectDb } = await import("@/lib/db");
  await connectDb();
}

export async function resetDb(): Promise<void> {
  await mongoose.connection.db?.dropDatabase();
}

export async function stopDb(): Promise<void> {
  await mongoose.disconnect();
  (globalThis as { mongooseConn?: unknown }).mongooseConn = undefined;
  await mongod?.stop();
}

/** A Date that falls on `date` around 11:30 in Asia/Kolkata. */
export const at = (date: string) => new Date(`${date}T06:00:00Z`);
