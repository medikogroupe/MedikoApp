import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const SECRET = process.env.SESSION_SECRET || "mediko-plus-secret-ci-2026";
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
  return createHmac("sha256", SECRET).update(value).digest("hex");
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

export function adminToken(): string {
  return sign(`admin:${process.env.ADMIN_PASSWORD || "medikoplus2026"}`);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}

export type SessionUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = readToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export function normalizeNumber(input: string): string {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("225")) return `+${digits}`;
  return `+225${digits}`;
}
