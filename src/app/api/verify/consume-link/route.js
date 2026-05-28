import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { buildGatedAccessCookie } from "@/lib/questionnaire/gatedAccessCookie";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function consumeGatedLeadAccess({ record, tokenHash }) {
  const now = new Date();
  const identifier = String(record.identifier || "").trim().toLowerCase();

  const result = await prisma.$transaction(async (tx) => {
    const user = record.userId
      ? await tx.user.findUnique({
          where: {
            id: record.userId,
          },
        })
      : await tx.user.findFirst({
          where: {
            email: identifier,
          },
        });

    const lead = await tx.lead.findFirst({
      where: {
        email: identifier,
        target: "gatedLeadAccess",
      },
    });

    if (user) {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerifiedAt: now,
        },
      });

      await tx.userEmailAddress.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          isActive: false,
        },
      });

      await tx.userEmailAddress.upsert({
        where: {
          normalizedEmail: identifier,
        },
        create: {
          userId: user.id,
          email: identifier,
          normalizedEmail: identifier,
          isActive: true,
          isVerified: true,
          verifiedAt: now,
        },
        update: {
          isActive: true,
          isVerified: true,
          verifiedAt: now,
        },
      });
    }

    if (lead) {
      await tx.lead.update({
        where: {
          id: lead.id,
        },
        data: {
          verifiedAt: now,
          metadata: {
            ...(lead.metadata && typeof lead.metadata === "object"
              ? lead.metadata
              : {}),
            lastAccessVerifiedAt: now.toISOString(),
          },
        },
      });
    }

    await tx.verificationToken.delete({
      where: {
        tokenHash,
      },
    });

    return {
      user,
      lead,
    };
  });

  if (!result.user && !result.lead) {
    return NextResponse.json(
      {
        error:
          AUTH_MESSAGES?.verification?.noMatchingRecord ||
          "No matching user or lead found.",
      },
      { status: 404 }
    );
  }

    const metadata =
    result.lead?.metadata && typeof result.lead.metadata === "object"
      ? result.lead.metadata
      : {};

  const questionnaireSlug =
    typeof metadata.questionnaireSlug === "string"
      ? metadata.questionnaireSlug
      : "invitation";

  const goto =
    typeof metadata.goto === "string" ? metadata.goto : "second-video";

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 180);

  const response = NextResponse.json({
    success: true,
    message: "Private access verified.",
    identifier,
    successRedirect: record.successRedirect || null,
    target: record.target || null,
  });

  response.cookies.set(
    buildGatedAccessCookie({
      target: "gatedLeadAccess",
      questionnaireSlug,
      goto,
      userId: result.user?.id || null,
      identifierHash: crypto
        .createHash("sha256")
        .update(identifier)
        .digest("hex"),
      verifiedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
  );

  return response;
}

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({
        where: { tokenHash },
      });

      return NextResponse.json(
        { error: "Verification link has expired." },
        { status: 400 }
      );
    }

    if (record.target === "gatedLeadAccess") {
      return consumeGatedLeadAccess({ record, tokenHash });
    }

    const identifier = record.identifier;
    const isEmail = identifier.includes("@");

    const verificationData = isEmail
      ? { emailVerifiedAt: new Date() }
      : { phoneVerifiedAt: new Date() };

    const userResult = await prisma.user.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: verificationData,
    });

    const leadResult = await prisma.lead.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: verificationData,
    });

    if (userResult.count === 0 && leadResult.count === 0) {
      await prisma.verificationToken.delete({
        where: { tokenHash },
      });

      return NextResponse.json(
        {
          error:
            AUTH_MESSAGES?.verification?.noMatchingRecord ||
            "No matching user or lead found.",
        },
        { status: 404 }
      );
    }

    const redirectTo = record.successRedirect || null;
    const target = record.target || null;

    await prisma.verificationToken.delete({
      where: { tokenHash },
    });

    return NextResponse.json({
      success: true,
      message:
        AUTH_MESSAGES?.verification?.verificationSuccess ||
        "Verification successful.",
      identifier,
      successRedirect: redirectTo,
      target,
    });
  } catch (error) {
    console.error("VERIFY CONSUME LINK ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to verify link.",
      },
      { status: 500 }
    );
  }
}