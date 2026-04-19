import fs from "node:fs";
import path from "node:path";

// Load .env file directly, overriding any empty shell env vars.
// This runs at module-load time before ENV is evaluated.
function loadEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      // Set if missing or empty (shell may have set vars as empty strings)
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env file — rely on real environment variables
  }
}

loadEnvFile();

export const ENV = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL ?? "./data/app.db",
  uploadsDir: process.env.UPLOADS_DIR ?? "./uploads",
};
