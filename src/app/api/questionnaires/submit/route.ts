import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SubmitPayload = {
  questionnaireSlug?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  selfScore?: number | string | null;
  futureScore?: number | string | null;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitPayload;

    const questionnaireSlug = String(body.questionnaireSlug ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const whatsappOptIn = body.whatsappOptIn === true;

    const selfScoreRaw =
      body.selfScore === null || body.selfScore === undefined || body.selfScore === ""
        ? null
        : Number(body.selfScore);

    const futureScoreRaw =
      body.futureScore === null || body.futureScore === undefined || body.futureScore === ""
        ? null
        : Number(body.futureScore);

    const selfScore =
      selfScoreRaw === null || Number.isNaN(selfScoreRaw) ? null : selfScoreRaw;

    const futureScore =
      futureScoreRaw === null || Number.isNaN(futureScoreRaw) ? null : futureScoreRaw;

    if (!questionnaireSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing questionnaireSlug." },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { ok: false, error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const submission = await prisma.questionnaireSubmission.create({
      data: {
        questionnaireSlug,
        fullName,
        email,
        phone: phone || null,
        whatsappOptIn,
        selfScore,
        futureScore,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Submission received.",
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Submit route error:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 500 }
    );
  }
}