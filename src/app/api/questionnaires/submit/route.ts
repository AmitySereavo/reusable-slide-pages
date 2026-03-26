import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SubmitPayload = {
  questionnaireSlug?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  answers?: Record<string, unknown>;
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

    const submission = await prisma.questionnaireSubmission.create({
      data: {
        questionnaireSlug,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        whatsappOptIn,
        answers,
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