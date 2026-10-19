import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET est obligatoire en production.");
  }
  return "dev-only-secret-ne-pas-utiliser-en-production";
}

export const SESSION_COOKIE = "mp_session";
export const ADMIN_COOKIE = "mp_admin";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) return false;
  return timingSafeEqual(candidate, original);
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [userId, signature] = token.split(".");
  if (!userId || !signature) return null;
  if (sign(userId) !== signature) return null;
  return userId;
}

/** Jeton du cookie admin, ou null si ADMIN_PASSWORD n'est pas défini (accès admin refusé). */
export function adminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sign(`admin:${password}`);
}

export async function isAdmin(): Promise<boolean> {
  const expected = adminToken();
  if (!expected) return false;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export type SessionUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = readToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return null;
  // Un abonnement expiré retombe automatiquement sur le pack gratuit.
  if (user.pack !== "FREE" && user.packExpireAt && user.packExpireAt.getTime() < Date.now()) {
    return { ...user, pack: "FREE" };
  }
  return user;
}

export function normalizeNumber(input: string): string {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("225")) return `+${digits}`;
  return `+225${digits}`;
}
