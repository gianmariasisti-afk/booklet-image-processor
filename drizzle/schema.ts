import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  fileName: text("fileName").notNull(),
  originalImageUrl: text("originalImageUrl").notNull(),
  originalImageKey: text("originalImageKey").notNull(),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  processingStatus: text("processingStatus", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  totalImagesDetected: integer("totalImagesDetected").default(0),
  totalImagesProcessed: integer("totalImagesProcessed").default(0),
  errorMessage: text("errorMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

export const croppedImages = sqliteTable("cropped_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uploadId: integer("uploadId").notNull(),
  croppedImageUrl: text("croppedImageUrl").notNull(),
  croppedImageKey: text("croppedImageKey").notNull(),
  detectionConfidence: text("detectionConfidence").notNull(),
  regionCoordinates: text("regionCoordinates", { mode: "json" }).notNull(),
  imageType: text("imageType").notNull(),
  caption: text("caption"),
  processingStatus: text("processingStatus", { enum: ["detected", "cropped", "described", "failed"] }).default("detected").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type CroppedImage = typeof croppedImages.$inferSelect;
export type InsertCroppedImage = typeof croppedImages.$inferInsert;

export const descriptions = sqliteTable("descriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  croppedImageId: integer("croppedImageId").notNull(),
  uploadId: integer("uploadId").notNull(),
  description: text("description").notNull(),
  contextSummary: text("contextSummary"),
  generationModel: text("generationModel").default("claude-haiku-4-5"),
  generationTokens: integer("generationTokens").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Description = typeof descriptions.$inferSelect;
export type InsertDescription = typeof descriptions.$inferInsert;

export const uploadsRelations = relations(uploads, ({ many }) => ({
  croppedImages: many(croppedImages),
  descriptions: many(descriptions),
}));

export const croppedImagesRelations = relations(croppedImages, ({ one, many }) => ({
  upload: one(uploads, {
    fields: [croppedImages.uploadId],
    references: [uploads.id],
  }),
  description: many(descriptions),
}));

export const descriptionsRelations = relations(descriptions, ({ one }) => ({
  upload: one(uploads, {
    fields: [descriptions.uploadId],
    references: [uploads.id],
  }),
  croppedImage: one(croppedImages, {
    fields: [descriptions.croppedImageId],
    references: [croppedImages.id],
  }),
}));
