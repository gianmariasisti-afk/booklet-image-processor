import fs from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

function getUploadsDir(): string {
  const dir = path.resolve(ENV.uploadsDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const uploadsDir = getUploadsDir();
  const filePath = path.join(uploadsDir, key.replace(/\//g, "_"));

  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  fs.writeFileSync(filePath, buf);

  return { key: filePath, url: `/uploads/${path.basename(filePath)}` };
}

export async function storageGet(key: string): Promise<{ key: string; url: string }> {
  const filename = path.basename(key);
  return { key, url: `/uploads/${filename}` };
}

export async function storageReadBuffer(key: string): Promise<Buffer> {
  const filePath = path.isAbsolute(key) ? key : path.join(path.resolve(ENV.uploadsDir), key);
  return fs.readFileSync(filePath);
}
