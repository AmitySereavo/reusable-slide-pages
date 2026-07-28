import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  ensurePersonProfileTables,
  makeProfileId,
} from "@/lib/dashboard/personProfiles";

function cleanText(value: unknown, maxLength = 3000) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanTargetKind(value: unknown) {
  const kind = cleanText(value, 30);
  return ["person", "account", "lead", "customer"].includes(kind) ? kind : "";
}

function hasDeleteConfirmation(value: unknown) {
  return cleanText(value, 30).toLowerCase() === "delete";
}

function cleanTextList(value: unknown) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((part) => part.trim());

  return Array.from(
    new Set(
      rawValues
        .map((part) => cleanText(part, 80))
        .filter(Boolean)
    )
  );
}

function cleanContactOverride(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return {
    name: cleanText(record.name, 160),
    email: cleanText(record.email, 180).toLowerCase(),
    phone: cleanText(record.phone, 80),
    country: cleanText(record.country, 120),
    city: cleanText(record.city, 120),
    addressLine1: cleanText(record.addressLine1, 240),
    addressLine2: cleanText(record.addressLine2, 240),
    parishOrRegion: cleanText(record.parishOrRegion, 160),
    postalCode: cleanText(record.postalCode, 80),
  };
}

const ALLOWED_FREQUENCIES = new Set([
  "none",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "every_3_months",
]);

async function ensureProfile(targetKind: string, targetKey: string) {
  const profileId = makeProfileId(targetKind, targetKey);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "PersonProfile" ("id", "targetKind", "targetKey")
    VALUES (${profileId}, ${targetKind}, ${targetKey})
    ON CONFLICT ("targetKind", "targetKey") DO NOTHING
  `);

  return profileId;
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    await ensurePersonProfileTables(prisma);

    const body = await request.json().catch(() => ({}));
    const action = cleanText(body?.action, 60);
    const targetKind = cleanTargetKind(body?.targetKind);
    const targetKey = cleanText(body?.targetKey, 240);

    if (!targetKind || !targetKey) {
      return NextResponse.json(
        { ok: false, error: "A valid people profile target is required." },
        { status: 400 }
      );
    }

    const profileId = await ensureProfile(targetKind, targetKey);

    if (action === "update-profile-details") {
      const contact = cleanContactOverride(body?.contact);
      const labels = cleanTextList(body?.labels);
      const interests = cleanTextList(body?.interests);
      const bucket = cleanText(body?.bucket, 120);

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "bucket" = ${bucket || null},
            "labels" = ${JSON.stringify(labels)}::jsonb,
            "interests" = ${JSON.stringify(interests)}::jsonb,
            "contactOverride" = ${JSON.stringify(contact)}::jsonb,
            "deletedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true });
    }

    if (action === "set-follow-up") {
      const frequency = cleanText(body?.followUpFrequency, 40);
      if (!ALLOWED_FREQUENCIES.has(frequency)) {
        return NextResponse.json(
          { ok: false, error: "Choose a valid follow-up frequency." },
          { status: 400 }
        );
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "followUpFrequency" = ${frequency},
            "deletedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true });
    }

    if (action === "add-conversation-note") {
      const note = body?.note && typeof body.note === "object" ? body.note : {};
      const noteId = `pcn-${crypto.randomUUID()}`;
      const staffUser = guard.session?.user;
      const staffName =
        staffUser?.name || staffUser?.email || "Admin";

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "PersonConversationNote" (
          "id",
          "profileId",
          "summary",
          "currentGoals",
          "currentPosition",
          "immediateNextStep",
          "relationshipImpact",
          "nextQuestions",
          "emotionalState",
          "satisfaction",
          "referralOpportunities",
          "additionalNotes",
          "createdByUserId",
          "createdByUserName",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${noteId},
          ${profileId},
          ${cleanText(note.summary)},
          ${cleanText(note.currentGoals)},
          ${cleanText(note.currentPosition)},
          ${cleanText(note.immediateNextStep)},
          ${cleanText(note.relationshipImpact)},
          ${cleanText(note.nextQuestions)},
          ${cleanText(note.emotionalState)},
          ${cleanText(note.satisfaction)},
          ${cleanText(note.referralOpportunities)},
          ${cleanText(note.additionalNotes)},
          ${staffUser?.id || null},
          ${staffName},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "deletedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true, noteId });
    }

    if (action === "update-conversation-note") {
      const noteId = cleanText(body?.noteId, 120);
      const note = body?.note && typeof body.note === "object" ? body.note : {};

      if (!noteId) {
        return NextResponse.json(
          { ok: false, error: "Conversation note is required." },
          { status: 400 }
        );
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonConversationNote"
        SET "summary" = ${cleanText(note.summary)},
            "currentGoals" = ${cleanText(note.currentGoals)},
            "currentPosition" = ${cleanText(note.currentPosition)},
            "immediateNextStep" = ${cleanText(note.immediateNextStep)},
            "relationshipImpact" = ${cleanText(note.relationshipImpact)},
            "nextQuestions" = ${cleanText(note.nextQuestions)},
            "emotionalState" = ${cleanText(note.emotionalState)},
            "satisfaction" = ${cleanText(note.satisfaction)},
            "referralOpportunities" = ${cleanText(note.referralOpportunities)},
            "additionalNotes" = ${cleanText(note.additionalNotes)},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${noteId}
          AND "profileId" = ${profileId}
          AND "deletedAt" IS NULL
      `);

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "deletedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true, noteId });
    }

    if (action === "delete-conversation-note") {
      if (!hasDeleteConfirmation(body?.confirmation)) {
        return NextResponse.json(
          { ok: false, error: "Type delete to confirm this action." },
          { status: 400 }
        );
      }

      const noteId = cleanText(body?.noteId, 120);
      if (!noteId) {
        return NextResponse.json(
          { ok: false, error: "Conversation note is required." },
          { status: 400 }
        );
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonConversationNote"
        SET "deletedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${noteId}
          AND "profileId" = ${profileId}
      `);

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true });
    }

    if (action === "delete-profile") {
      if (!hasDeleteConfirmation(body?.confirmation)) {
        return NextResponse.json(
          { ok: false, error: "Type delete to confirm this action." },
          { status: 400 }
        );
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PersonProfile"
        SET "deletedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${profileId}
      `);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Choose a valid people profile action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unable to update people profile", error);
    return NextResponse.json(
      { ok: false, error: "Unable to update this people profile." },
      { status: 500 }
    );
  }
}
