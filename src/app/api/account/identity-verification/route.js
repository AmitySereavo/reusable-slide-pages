import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

function cleanString(value) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

function cleanUrl(value) {
  const text = cleanString(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function serializeVerification(record) {
  if (!record) return null;

  return {
    id: record.id,
    documentType: record.documentType,
    instagramUrl: record.instagramUrl,
    tiktokUrl: record.tiktokUrl,
    facebookUrl: record.facebookUrl,
    status: record.status,
    adminNotes: record.adminNotes,
    reviewedAt: record.reviewedAt?.toISOString?.() ?? record.reviewedAt ?? null,
    submittedAt: record.submittedAt?.toISOString?.() ?? record.submittedAt ?? null,
    frontFileUrl: `/api/account/identity-verification/file?id=${encodeURIComponent(
      record.id
    )}&side=front`,
    backFileUrl: `/api/account/identity-verification/file?id=${encodeURIComponent(
      record.id
    )}&side=back`,
  };
}

async function saveUpload({ file, userId, verificationId, side }) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error(`${side === "front" ? "Front" : "Back"} ID image is required.`);
  }

  const extension = ALLOWED_MIME_TYPES.get(file.type);
  if (!extension) {
    throw new Error("ID upload must be JPG, PNG, WEBP, or PDF.");
  }

  if (Number(file.size || 0) > MAX_FILE_BYTES) {
    throw new Error("Each ID upload must be 8MB or smaller.");
  }

  const uploadDir = path.join(
    process.cwd(),
    "protected-uploads",
    "identity",
    userId
  );
  await mkdir(uploadDir, { recursive: true });

  const relativePath = path.join(
    "protected-uploads",
    "identity",
    userId,
    `${verificationId}-${side}.${extension}`
  );
  const absolutePath = path.join(process.cwd(), relativePath);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return relativePath;
}

export async function GET() {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return NextResponse.json({
      verification: null,
      notice: "Identity verification storage is not available until Prisma is refreshed.",
    });
  }

  const verification = await prisma.userIdentityVerification.findFirst({
    where: { userId: session.userId },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ verification: serializeVerification(verification) });
}

export async function POST(request) {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return NextResponse.json(
      { error: "Identity verification storage is not available. Run Prisma generate and db push." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const documentType = cleanString(formData.get("documentType")) || "drivers_license";
    const frontFile = formData.get("frontFile");
    const backFile = formData.get("backFile");
    const verificationId = randomUUID();

    const [frontFilePath, backFilePath] = await Promise.all([
      saveUpload({
        file: frontFile,
        userId: session.userId,
        verificationId,
        side: "front",
      }),
      saveUpload({
        file: backFile,
        userId: session.userId,
        verificationId,
        side: "back",
      }),
    ]);

    const verification = await prisma.userIdentityVerification.create({
      data: {
        id: verificationId,
        userId: session.userId,
        documentType,
        frontFilePath,
        backFilePath,
        instagramUrl: cleanUrl(formData.get("instagramUrl")),
        tiktokUrl: cleanUrl(formData.get("tiktokUrl")),
        facebookUrl: cleanUrl(formData.get("facebookUrl")),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      verification: serializeVerification(verification),
      message: "Verification submitted for admin review.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit verification.",
      },
      { status: 400 }
    );
  }
}
