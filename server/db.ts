import { eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { InsertUser, users, uploads, croppedImages, descriptions } from "../drizzle/schema";
import { ENV } from './_core/env';
import path from "node:path";
import fs from "node:fs";

let _db: ReturnType<typeof drizzle> | null = null;

function ensureDbDir(dbPath: string) {
  const dir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (!_db) {
    const dbPath = ENV.databaseUrl;
    ensureDbDir(dbPath);
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite);
    ensureSchema(_db);
  }
  return _db;
}

function ensureSchema(db: ReturnType<typeof drizzle>) {
  const sqlite = (db as any).session?.client as Database.Database | undefined;
  if (!sqlite) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      loginMethod TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
      lastSignedIn INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fileName TEXT NOT NULL,
      originalImageUrl TEXT NOT NULL,
      originalImageKey TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      processingStatus TEXT NOT NULL DEFAULT 'pending',
      totalImagesDetected INTEGER DEFAULT 0,
      totalImagesProcessed INTEGER DEFAULT 0,
      errorMessage TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS cropped_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploadId INTEGER NOT NULL,
      croppedImageUrl TEXT NOT NULL,
      croppedImageKey TEXT NOT NULL,
      detectionConfidence TEXT NOT NULL,
      regionCoordinates TEXT NOT NULL,
      imageType TEXT NOT NULL,
      processingStatus TEXT NOT NULL DEFAULT 'detected',
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS descriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      croppedImageId INTEGER NOT NULL,
      uploadId INTEGER NOT NULL,
      description TEXT NOT NULL,
      contextSummary TEXT,
      generationModel TEXT DEFAULT 'claude-haiku-4-5',
      generationTokens INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = getDb();

  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    const updateData: any = { updatedAt: new Date(), lastSignedIn: user.lastSignedIn ?? new Date() };
    if (user.name !== undefined) updateData.name = user.name;
    if (user.email !== undefined) updateData.email = user.email;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
    if (user.role !== undefined) updateData.role = user.role;
    db.update(users).set(updateData).where(eq(users.openId, user.openId)).run();
  } else {
    db.insert(users).values({
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? "user",
      lastSignedIn: user.lastSignedIn ?? new Date(),
    }).run();
  }
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.openId, openId)).limit(1).all();
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.id, userId)).limit(1).all();
  return result.length > 0 ? result[0] : undefined;
}

export async function createUpload(data: {
  userId: number;
  fileName: string;
  originalImageUrl: string;
  originalImageKey: string;
  mimeType: string;
  fileSize: number;
}) {
  const db = getDb();
  const result = db.insert(uploads).values(data).run();
  return { insertId: result.lastInsertRowid };
}

export async function getUploadById(uploadId: number) {
  const db = getDb();
  const result = db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1).all();
  return result[0] || null;
}

export async function getUserUploads(userId: number) {
  const db = getDb();
  return db.select().from(uploads).where(eq(uploads.userId, userId)).orderBy(desc(uploads.createdAt)).all();
}

export async function updateUploadStatus(
  uploadId: number,
  status: "pending" | "processing" | "completed" | "failed",
  updates?: { totalImagesDetected?: number; totalImagesProcessed?: number; errorMessage?: string | null }
) {
  const db = getDb();
  const updateData: any = { processingStatus: status, updatedAt: new Date() };
  if (updates?.totalImagesDetected !== undefined) updateData.totalImagesDetected = updates.totalImagesDetected;
  if (updates?.totalImagesProcessed !== undefined) updateData.totalImagesProcessed = updates.totalImagesProcessed;
  if (updates?.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;
  return db.update(uploads).set(updateData).where(eq(uploads.id, uploadId)).run();
}

export async function createCroppedImage(data: {
  uploadId: number;
  croppedImageUrl: string;
  croppedImageKey: string;
  detectionConfidence: string;
  regionCoordinates: any;
  imageType: string;
}) {
  const db = getDb();
  const result = db.insert(croppedImages).values({
    ...data,
    regionCoordinates: typeof data.regionCoordinates === "string" ? data.regionCoordinates : JSON.stringify(data.regionCoordinates),
  }).run();
  return { insertId: result.lastInsertRowid };
}

export async function getCroppedImagesByUploadId(uploadId: number) {
  const db = getDb();
  return db.select().from(croppedImages).where(eq(croppedImages.uploadId, uploadId)).orderBy(asc(croppedImages.id)).all();
}

export async function updateCroppedImageStatus(
  croppedImageId: number,
  status: "detected" | "cropped" | "described" | "failed"
) {
  const db = getDb();
  return db.update(croppedImages).set({ processingStatus: status, updatedAt: new Date() }).where(eq(croppedImages.id, croppedImageId)).run();
}

export async function createDescription(data: {
  croppedImageId: number;
  uploadId: number;
  description: string;
  contextSummary?: string;
  generationModel?: string;
  generationTokens?: number;
}) {
  const db = getDb();
  const result = db.insert(descriptions).values(data).run();
  return { insertId: result.lastInsertRowid };
}

export async function getDescriptionByCroppedImageId(croppedImageId: number) {
  const db = getDb();
  const result = db.select().from(descriptions).where(eq(descriptions.croppedImageId, croppedImageId)).limit(1).all();
  return result[0] || null;
}

export async function getDescriptionsByUploadId(uploadId: number) {
  const db = getDb();
  return db.select().from(descriptions).where(eq(descriptions.uploadId, uploadId)).orderBy(asc(descriptions.createdAt)).all();
}
