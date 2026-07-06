import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function resolveStoredPath(storedPath) {
  const workspaceRoot = process.cwd();
  const absolutePath = path.resolve(workspaceRoot, storedPath || "");
  const allowedRoot = path.resolve(workspaceRoot, "protected-uploads", "identity");

  if (!absolutePath.startsWith(allowedRoot)) {
    return null;
  }

  return absolutePath;
}

export async function GET(request) {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return NextResponse.json(
      { error: "Identity verification storage is not available." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") || "").trim();
  const side = String(url.searchParams.get("side") || "").trim();

  if (!id || !["front", "back"].includes(side)) {
    return NextResponse.json({ error: "Missing file reference." }, { status: 400 });
  }

  const verification = await prisma.userIdentityVerification.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  if (!verification) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }

  const adminLevel = Number(session.user?.adminLevel || 0);
  const ownsFile = verification.userId === session.userId;

  if (!ownsFile && adminLevel < 1) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const storedPath = side === "front" ? verification.frontFilePath : verification.backFilePath;
  const absolutePath = resolveStoredPath(storedPath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  try {
    const bytes = await readFile(absolutePath);
    const contentType =
      CONTENT_TYPES[path.extname(absolutePath).toLowerCase()] ||
      "application/octet-stream";

    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
