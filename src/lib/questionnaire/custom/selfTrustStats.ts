import { prisma } from "@/lib/prisma";
import { selfTrustSyntheticData } from "./selfTrustSyntheticData";

type Primitive = string | number | boolean | null | undefined;

type SelfTrustStatsInput = {
  selfScore: Primitive;
  futureScore: Primitive;
};

type SubmissionRecord = {
  email: string | null;
  phone: string | null;
  answers: unknown;
};

type NormalizedSubmission = {
  email: string | null;
  phone: string | null;
  selfScore: number | null;
  futureScore: number | null;
};

type SelfTrustStatsResult = {
  selfScoreMatchCount: number;
  selfScoreAndFutureScoreMatchCount: number;
  futureScoreMatchCount: number;
};

function normalizeIdentifier(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  return digits.length ? digits : null;
}

function parseAnswerNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const num = Number(value.trim());
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

function normalizeSubmission(record: SubmissionRecord): NormalizedSubmission {
  const answers =
    record.answers && typeof record.answers === "object"
      ? (record.answers as Record<string, unknown>)
      : {};

  return {
    email: normalizeIdentifier(record.email),
    phone: normalizePhone(record.phone),
    selfScore: parseAnswerNumber(answers.selfScore),
    futureScore: parseAnswerNumber(answers.futureScore),
  };
}

function getIdentityKey(record: NormalizedSubmission, index: number) {
  if (record.email) return `email:${record.email}`;
  if (record.phone) return `phone:${record.phone}`;
  return `anon:${index}`;
}

function dedupeByMatchingScore(
  submissions: NormalizedSubmission[],
  scoreKey: "selfScore" | "futureScore",
  targetScore: number
) {
  const map = new Map<string, NormalizedSubmission>();

  submissions.forEach((submission, index) => {
    if (submission[scoreKey] !== targetScore) return;

    const identityKey = getIdentityKey(submission, index);

    if (!map.has(identityKey)) {
      map.set(identityKey, submission);
    }
  });

  return Array.from(map.values());
}

async function loadRealSelfTrustSubmissions(): Promise<NormalizedSubmission[]> {
  const rows = await prisma.questionnaireSubmission.findMany({
    where: {
      questionnaireSlug: "self-trust",
    },
    select: {
      email: true,
      phone: true,
      answers: true,
    },
  });

  return rows.map(normalizeSubmission);
}

function loadSyntheticSelfTrustSubmissions(): NormalizedSubmission[] {
  return selfTrustSyntheticData.map(normalizeSubmission);
}

async function loadSelfTrustSubmissions(): Promise<NormalizedSubmission[]> {
  const mode = String(process.env.SELF_TRUST_STATS_MODE ?? "real")
    .trim()
    .toLowerCase();

  if (mode === "synthetic") {
    return loadSyntheticSelfTrustSubmissions();
  }

  return loadRealSelfTrustSubmissions();
}

export async function getSelfTrustStats(
  input: SelfTrustStatsInput
): Promise<SelfTrustStatsResult> {
  const selfScore = parseAnswerNumber(input.selfScore);
  const futureScore = parseAnswerNumber(input.futureScore);

  if (selfScore === null || futureScore === null) {
    return {
      selfScoreMatchCount: 0,
      selfScoreAndFutureScoreMatchCount: 0,
      futureScoreMatchCount: 0,
    };
  }

  const submissions = await loadSelfTrustSubmissions();

  const selfScoreMatches = dedupeByMatchingScore(
    submissions,
    "selfScore",
    selfScore
  );

  const selfScoreMatchCount = selfScoreMatches.length;

  const selfScoreAndFutureScoreMatchCount = selfScoreMatches.filter(
    (submission) => submission.futureScore === futureScore
  ).length;

  const futureScoreMatches = dedupeByMatchingScore(
    submissions,
    "futureScore",
    futureScore
  );

  return {
    selfScoreMatchCount,
    selfScoreAndFutureScoreMatchCount,
    futureScoreMatchCount: futureScoreMatches.length,
  };
}