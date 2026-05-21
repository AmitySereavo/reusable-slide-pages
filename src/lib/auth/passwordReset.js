import crypto from "crypto";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_ACCESS_COOKIE_NAME = "password_reset_access";

const EMAIL_RESET_EXPIRY_MS = 1000 * 60 * 60; // 60 min
const PHONE_RESET_CODE_EXPIRY_MS = 1000 * 60 * 10; // 10 min
const RESET_ACCESS_EXPIRY_MS = 1000 * 60 * 15; // 15 min
const MAX_RESET_CODE_ATTEMPTS = 5;

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

function generateCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function invalidateOpenPasswordResetRecordsForUser(userId) {
  const now = new Date();

  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });

  await prisma.passwordResetChallenge.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });

  await prisma.passwordResetAccessGrant.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });
}

export async function createEmailPasswordResetToken(user) {
  await invalidateOpenPasswordResetRecordsForUser(user.id);

  const rawToken = generateRawToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_RESET_EXPIRY_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      identifier: user.email,
      tokenHash,
      expiresAt,
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}

export async function createPhonePasswordResetChallenge({
  user,
  identifier,
  channel,
}) {
  await invalidateOpenPasswordResetRecordsForUser(user.id);

  const code = generateCode(6);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + PHONE_RESET_CODE_EXPIRY_MS);

  await prisma.passwordResetChallenge.create({
    data: {
      userId: user.id,
      identifier,
      channel,
      codeHash,
      expiresAt,
    },
  });

  return {
    code,
    expiresAt,
  };
}

export async function verifyPhonePasswordResetCode({
  identifier,
  code,
  channel = null,
}) {
  const challenge = await prisma.passwordResetChallenge.findFirst({
    where: {
      identifier,
      consumedAt: null,
      ...(channel ? { channel } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: true,
    },
  });

  if (!challenge) {
    return { ok: false, reason: "not_found" };
  }

  if (challenge.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  if (challenge.attempts >= MAX_RESET_CODE_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const valid = await bcrypt.compare(code, challenge.codeHash);

  if (!valid) {
    await prisma.passwordResetChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: { increment: 1 },
      },
    });

    return { ok: false, reason: "invalid_code" };
  }

  await prisma.passwordResetChallenge.update({
    where: { id: challenge.id },
    data: {
      consumedAt: new Date(),
    },
  });

  return {
    ok: true,
    user: challenge.user,
  };
}

export async function createPasswordResetAccessGrant(userId) {
  await prisma.passwordResetAccessGrant.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  const rawGrant = generateRawToken(32);
  const grantHash = hashToken(rawGrant);
  const expiresAt = new Date(Date.now() + RESET_ACCESS_EXPIRY_MS);

  await prisma.passwordResetAccessGrant.create({
    data: {
      userId,
      grantHash,
      expiresAt,
    },
  });

  return {
    rawGrant,
    expiresAt,
  };
}

export async function setPasswordResetAccessCookie(rawGrant, expiresAt) {
  const cookieStore = await cookies();

  cookieStore.set(PASSWORD_RESET_ACCESS_COOKIE_NAME, rawGrant, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearPasswordResetAccessCookie() {
  const cookieStore = await cookies();

  cookieStore.set(PASSWORD_RESET_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getPasswordResetAccessGrantFromCookie() {
  const cookieStore = await cookies();
  const rawGrant = cookieStore.get(PASSWORD_RESET_ACCESS_COOKIE_NAME)?.value;

  if (!rawGrant) return null;

  const grantHash = hashToken(rawGrant);

  const grant = await prisma.passwordResetAccessGrant.findUnique({
    where: { grantHash },
    include: { user: true },
  });

  if (!grant) {
    await clearPasswordResetAccessCookie();
    return null;
  }

  if (grant.consumedAt || grant.expiresAt < new Date()) {
    await clearPasswordResetAccessCookie();
    return null;
  }

  return grant;
}

export async function getValidPasswordResetToken(rawToken) {
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!token) return null;
  if (token.consumedAt || token.expiresAt < new Date()) return null;

  return token;
}

export async function consumePasswordResetToken(id) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: {
      consumedAt: new Date(),
    },
  });
}

export async function consumePasswordResetAccessGrant(id) {
  await prisma.passwordResetAccessGrant.update({
    where: { id },
    data: {
      consumedAt: new Date(),
    },
  });
}

export async function revokeAllUserSessions(userId) {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}