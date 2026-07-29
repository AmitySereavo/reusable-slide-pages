import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureUnregisteredVisitorActivityTable } from "@/lib/visitors/unregisteredVisitors";

function cleanText(value: unknown, maxLength = 260) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 45);
  return expiresAt;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const deviceKey = cleanText(body.deviceKey, 220);
    const eventType = cleanText(body.eventType, 80);

    if (!deviceKey || !eventType) {
      return NextResponse.json(
        { ok: false, error: "deviceKey and eventType are required." },
        { status: 400 }
      );
    }

    await ensureUnregisteredVisitorActivityTable();

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    await prisma.$executeRaw`
      INSERT INTO "UnregisteredVisitorActivity" (
        "id",
        "deviceKey",
        "eventType",
        "questionnaireSlug",
        "slideId",
        "slideLabel",
        "path",
        "metadata",
        "expiresAt"
      )
      VALUES (
        ${`uva-${randomUUID()}`},
        ${deviceKey},
        ${eventType},
        ${cleanText(body.questionnaireSlug, 160) || null},
        ${cleanText(body.slideId, 180) || null},
        ${cleanText(body.slideLabel, 220) || null},
        ${cleanText(body.path, 500) || null},
        ${metadata},
        ${getExpiryDate()}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("VISITOR ACTIVITY ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Visitor activity could not be saved.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
