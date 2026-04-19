import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  name: string;
};

const DEV_USER_OPEN_ID = "dev-user-local";

class SDKServer {
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? 1000 * 60 * 60 * 24 * 365;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ openId, name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(cookieValue: string | undefined | null) {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
      const { openId, name } = payload as Record<string, unknown>;
      if (typeof openId !== "string" || !openId) return null;
      return { openId, name: typeof name === "string" ? name : "" };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw new Error("Invalid session");
    }

    let user = await db.getUserByOpenId(session.openId);
    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || null,
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(session.openId);
    }

    if (!user) throw new Error("User not found");
    return user;
  }

  async getOrCreateDevUser(): Promise<User> {
    let user = await db.getUserByOpenId(DEV_USER_OPEN_ID);
    if (!user) {
      await db.upsertUser({
        openId: DEV_USER_OPEN_ID,
        name: "Dev User",
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(DEV_USER_OPEN_ID);
    }
    if (!user) throw new Error("Failed to create dev user");
    return user;
  }
}

export const sdk = new SDKServer();
