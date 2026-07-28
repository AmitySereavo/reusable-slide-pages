import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

export const FOLLOW_UP_INTERVALS = {
  none: 0,
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  every_3_months: 90 * 24 * 60 * 60 * 1000,
};

export type PersonTarget = {
  targetKind: string;
  targetKey: string;
};

export type ImportedConversationNoteSeed = PersonTarget & {
  sourceKey: string;
  summary?: string | null;
  additionalNotes?: string | null;
  createdAt?: string | Date | null;
};

export function makeProfileId(targetKind: string, targetKey: string) {
  return `${targetKind}:${targetKey}`.replace(/[^a-zA-Z0-9:_@.+-]/g, "_");
}

function makeImportedNoteId(profileId: string, sourceKey: string) {
  return `pcn-import-${createHash("sha1")
    .update(`${profileId}:${sourceKey}`)
    .digest("hex")
    .slice(0, 32)}`;
}

export async function ensurePersonProfileTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PersonProfile" (
      "id" TEXT PRIMARY KEY,
      "targetKind" TEXT NOT NULL,
      "targetKey" TEXT NOT NULL,
      "bucket" TEXT,
      "labels" JSONB,
      "interests" JSONB,
      "contactOverride" JSONB,
      "followUpFrequency" TEXT DEFAULT 'none',
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("targetKind", "targetKey")
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PersonProfile"
    ADD COLUMN IF NOT EXISTS "interests" JSONB
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PersonProfile"
    ADD COLUMN IF NOT EXISTS "contactOverride" JSONB
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PersonConversationNote" (
      "id" TEXT PRIMARY KEY,
      "profileId" TEXT NOT NULL REFERENCES "PersonProfile"("id") ON DELETE CASCADE,
      "summary" TEXT,
      "currentGoals" TEXT,
      "currentPosition" TEXT,
      "immediateNextStep" TEXT,
      "relationshipImpact" TEXT,
      "nextQuestions" TEXT,
      "emotionalState" TEXT,
      "satisfaction" TEXT,
      "referralOpportunities" TEXT,
      "additionalNotes" TEXT,
      "createdByUserId" TEXT,
      "createdByUserName" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PersonProfile_target_idx"
    ON "PersonProfile" ("targetKind", "targetKey")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PersonConversationNote_profile_created_idx"
    ON "PersonConversationNote" ("profileId", "createdAt")
  `);
}

export function getFollowUpStatus(profile: any, notes: any[]) {
  const frequency = String(profile?.followUpFrequency || "none");
  const intervalMs =
    FOLLOW_UP_INTERVALS[frequency as keyof typeof FOLLOW_UP_INTERVALS] || 0;

  if (!intervalMs) {
    return {
      color: "none",
      label: "No follow-up frequency set",
      dueAt: null,
    };
  }

  const latestNote = notes
    .filter((note) => !note.deletedAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )[0];
  const anchor = latestNote?.createdAt || profile?.updatedAt || profile?.createdAt;
  if (!anchor) {
    return { color: "red", label: "Follow-up due", dueAt: null };
  }

  const dueAtMs = new Date(anchor).getTime() + intervalMs;
  const nowMs = Date.now();
  const approachingWindowMs = Math.min(24 * 60 * 60 * 1000, intervalMs * 0.2);

  if (nowMs >= dueAtMs) {
    return {
      color: "red",
      label: "Follow-up due",
      dueAt: new Date(dueAtMs).toISOString(),
    };
  }

  if (dueAtMs - nowMs <= approachingWindowMs) {
    return {
      color: "yellow",
      label: "Follow-up approaching",
      dueAt: new Date(dueAtMs).toISOString(),
    };
  }

  return {
    color: "none",
    label: "Follow-up scheduled",
    dueAt: new Date(dueAtMs).toISOString(),
  };
}

export async function getProfilesForTargets(
  prisma: PrismaClient,
  targets: PersonTarget[]
) {
  if (!targets.length) return new Map<string, any>();

  await ensurePersonProfileTables(prisma);

  const valuesSql = Prisma.join(
    targets.map(
      (target) =>
        Prisma.sql`(${target.targetKind}, ${target.targetKey}, ${makeProfileId(
          target.targetKind,
          target.targetKey
        )})`
    )
  );

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "PersonProfile" ("targetKind", "targetKey", "id")
    VALUES ${valuesSql}
    ON CONFLICT ("targetKind", "targetKey") DO NOTHING
  `);

  const profileRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT *
    FROM "PersonProfile"
    WHERE ("targetKind", "targetKey") IN (${Prisma.join(
      targets.map(
        (target) => Prisma.sql`(${target.targetKind}, ${target.targetKey})`
      )
    )})
  `);

  const profileIds = profileRows.map((profile) => String(profile.id || ""));
  const noteRows = profileIds.length
    ? await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT *
        FROM "PersonConversationNote"
        WHERE "profileId" IN (${Prisma.join(profileIds)})
          AND "deletedAt" IS NULL
        ORDER BY "createdAt" DESC
      `)
    : [];

  const notesByProfile = new Map<string, any[]>();
  for (const note of noteRows) {
    const profileId = String(note.profileId || "");
    notesByProfile.set(profileId, [...(notesByProfile.get(profileId) || []), note]);
  }

  const byTarget = new Map<string, any>();
  for (const profile of profileRows) {
    const notes = notesByProfile.get(String(profile.id || "")) || [];
    byTarget.set(`${profile.targetKind}:${profile.targetKey}`, {
      ...profile,
      labels: profile.labels || [],
      conversationNotes: notes,
      latestConversationNote: notes[0] || null,
      followUpStatus: getFollowUpStatus(profile, notes),
    });
  }

  return byTarget;
}

export async function seedImportedConversationNotes(
  prisma: PrismaClient,
  seeds: ImportedConversationNoteSeed[]
) {
  const usefulSeeds = seeds.filter(
    (seed) =>
      seed.targetKind &&
      seed.targetKey &&
      seed.sourceKey &&
      (String(seed.summary || "").trim() ||
        String(seed.additionalNotes || "").trim())
  );

  if (!usefulSeeds.length) return;

  await ensurePersonProfileTables(prisma);

  const seen = new Set<string>();
  for (const seed of usefulSeeds) {
    const profileId = makeProfileId(seed.targetKind, seed.targetKey);
    const sourceKey = String(seed.sourceKey || "").trim();
    const dedupeKey = `${profileId}:${sourceKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const noteId = makeImportedNoteId(profileId, sourceKey);
    const createdAt = seed.createdAt ? new Date(seed.createdAt) : new Date();

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PersonProfile" ("id", "targetKind", "targetKey")
      VALUES (${profileId}, ${seed.targetKind}, ${seed.targetKey})
      ON CONFLICT ("targetKind", "targetKey") DO NOTHING
    `);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PersonConversationNote" (
        "id",
        "profileId",
        "summary",
        "additionalNotes",
        "createdByUserName",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${noteId},
        ${profileId},
        ${String(seed.summary || "").trim() || "Imported first conversation notes"},
        ${String(seed.additionalNotes || "").trim()},
        ${"Imported from order notes"},
        ${createdAt},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO NOTHING
    `);
  }
}
