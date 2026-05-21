import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  buildExpiredSessionCookie,
} from "./sessionCookie";
import { generateSessionToken, hashSessionToken } from "./sessionToken";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const userAgent = headerStore.get("user-agent") || null;

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const cookieStore = await cookies();
  const cookie = buildSessionCookie(token, expiresAt);

  cookieStore.set(cookie.name, cookie.value, cookie);

  return { expiresAt };
}

export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.revokedAt || session.expiresAt < new Date()) {
    await clearSessionCookie();
    return null;
  }

  return session;
}

export async function requireUser() {
  const session = await getSessionFromCookie();
  return session?.user || null;
}

export async function touchSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastUsedAt: new Date() },
  });
}

export async function revokeSessionByToken(token) {
  const tokenHash = hashSessionToken(token);

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const expiredCookie = buildExpiredSessionCookie();

  cookieStore.set(
    expiredCookie.name,
    expiredCookie.value,
    expiredCookie
  );
}

export async function logoutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSessionByToken(token);
  }

  await clearSessionCookie();
}