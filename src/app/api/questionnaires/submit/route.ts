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