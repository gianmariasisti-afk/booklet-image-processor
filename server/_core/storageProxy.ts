import type { Express } from "express";
import express from "express";
import path from "node:path";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  const uploadsDir = path.resolve(ENV.uploadsDir);
  app.use("/uploads", express.static(uploadsDir));
}
