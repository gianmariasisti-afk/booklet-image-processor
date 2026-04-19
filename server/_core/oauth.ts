import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/dev-login", async (req: Request, res: Response) => {
    try {
      const devUser = await sdk.getOrCreateDevUser();
      const sessionToken = await sdk.createSessionToken(devUser.openId, {
        name: devUser.name || "Dev User",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Dev login failed:", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });
}
