import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorSubmissionToGoogleSheets } from "@/lib/googleSheets";

type SubmitPayload = {
  questionnaireSlug?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  answers?: Record<string, unknown>;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitPayload;

    const questionnaireSlug = String(body.questionnaireSlug ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const whatsappOptIn = body.whatsappOptIn === true;
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};

    if (!questionnaireSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing questionnaireSlug." },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const prismaAnswers =
      toJsonValue(answers) as Parameters<
        typeof prisma.questionnaireSubmission.create
      >[0]["data"]["answers"];
    const duplicateWindowStart = new Date(Date.now() - 1000 * 60 * 10);
    const recentCandidates = await prisma.questionnaireSubmission.findMany({
      where: {
        questionnaireSlug,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        createdAt: {
          gte: duplicateWindowStart,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
    const requestAnswerSnapshot = stableStringify(prismaAnswers);
    const duplicateSubmission = recentCandidates.find(
      (candidate) => stableStringify(candidate.answers) === requestAnswerSnapshot
    );

    if (duplicateSubmission) {
      return NextResponse.json({
        ok: true,
        message: "Submission already received.",
        submissionId: duplicateSubmission.id,
        duplicate: true,
        sheetsMirrored: false,
      });
    }

    const submission = await prisma.questionnaireSubmission.create({
      data: {
        questionnaireSlug,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        whatsappOptIn,
        answers: prismaAnswers,
      },
    });

    let sheetsMirrored = false;

    try {
      const mirrorResult = await mirrorSubmissionToGoogleSheets({
        submissionId: submission.id,
        createdAt: submission.createdAt.toISOString(),
        questionnaireSlug: submission.questionnaireSlug,
        fullName: submission.fullName,
        email: submission.email,
        phone: submission.phone,
        whatsappOptIn: submission.whatsappOptIn,
        answers,
      });

      sheetsMirrored = mirrorResult.ok;
    } catch (mirrorError) {
      console.error("Google Sheets mirror error:", mirrorError);
    }

    return NextResponse.json({
      ok: true,
      message: "Submission received.",
      submissionId: submission.id,
      sheetsMirrored,
    });
  } catch (error) {
    console.error("Submit route error:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 500 }
    );
  }
}
