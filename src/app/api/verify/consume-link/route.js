import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { buildGatedAccessCookie } from "@/lib/questionnaire/gatedAccessCookie";
import { enrollVerifiedEmailTagSequencesForUser } from "@/lib/verification/emailSequences";
import { createSession } from "@/lib/auth/sessionServer";
import { getRequestIdentity } from "@/lib/security/requestIdentity";

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

  if (result.user?.id && identifier.includes("@")) {
    try {
      await enrollVerifiedEmailTagSequencesForUser({
        user: result.user,
        email: identifier,
        source: "gated-lead-email-verification",
        context: {
          target: record.target || null,
        },
      });
    } catch (sequenceError) {
      console.error("VERIFIED EMAIL TAG SEQUENCE ENROLLMENT ERROR:", sequenceError);
    }
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

async function consumeSequenceDeviceAccess({ record, tokenHash }) {
  const identifier = String(record.identifier || "").trim().toLowerCase();
  const redirectUrl = new URL(
    record.successRedirect || "http://localhost/questionnaire/itasl"
  );
  const sequenceJobId = redirectUrl.searchParams.get("sequenceJobId");
  const unlockKey = redirectUrl.searchParams.get("unlockKey");
  const dripSequenceKey = redirectUrl.searchParams.get("dripSequenceKey");

  if (!sequenceJobId || !unlockKey || !dripSequenceKey) {
    return NextResponse.json(
      { error: "This device verification link is incomplete." },
      { status: 400 }
    );
  }

  const job = await prisma.emailSequenceJob.findUnique({
    where: { id: sequenceJobId },
    include: {
      enrollment: {
        select: {
          recipientEmail: true,
          userId: true,
        },
      },
    },
  });

  const recipientEmail = String(
    job?.recipientEmail || job?.enrollment?.recipientEmail || ""
  )
    .trim()
    .toLowerCase();

  if (!job || !recipientEmail || recipientEmail !== identifier) {
    return NextResponse.json(
      { error: "This device verification link does not match the email sequence." },
      { status: 403 }
    );
  }

  const userId = job.userId || job.enrollment?.userId || record.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "This device verification link is not attached to an account." },
      { status: 409 }
    );
  }

  const requestIdentity = await getRequestIdentity();

  await prisma.$transaction(async (tx) => {
    await tx.emailSequenceEvent.create({
      data: {
        sequenceId: job.sequenceId,
        stepId: job.stepId,
        enrollmentId: job.enrollmentId,
        jobId: job.id,
        userId,
        recipientEmail,
        eventType: "sequence_link_device_authorized",
        eventKey: unlockKey,
        metadata: {
          dripSequenceKey,
          source: "device-verification-email",
          deviceKey: requestIdentity.deviceKey,
          ipHash: requestIdentity.ipHash,
          userAgent: requestIdentity.userAgent,
          acceptLanguage: requestIdentity.acceptLanguage,
          platform: requestIdentity.platform,
          location: requestIdentity.location,
        },
      },
    });

    await tx.verificationToken.delete({
      where: { tokenHash },
    });
  });

  await createSession(userId);

  return NextResponse.json({
    success: true,
    message: "Device verified.",
    identifier,
    successRedirect: record.successRedirect || null,
    target: record.target || null,
  });
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

    if (record.target === "sequenceDeviceAccess") {
      return consumeSequenceDeviceAccess({ record, tokenHash });
    }

    const identifier = record.identifier;
    const isEmail = identifier.includes("@");

    const userVerificationData = isEmail
    ? { emailVerifiedAt: new Date() }
    : { phoneVerifiedAt: new Date() };

    const userResult = await prisma.user.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: userVerificationData,
    });

    const leadResult = await prisma.lead.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: {
        verifiedAt: new Date(),
      },
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

    if (isEmail && userResult.count > 0) {
      try {
        const verifiedUser = await prisma.user.findFirst({
          where: {
            email: identifier,
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        if (verifiedUser) {
          await enrollVerifiedEmailTagSequencesForUser({
            user: verifiedUser,
            email: identifier,
            source: "email-link-verification",
            context: {
              target,
              successRedirect: redirectTo,
            },
          });
        }
      } catch (sequenceError) {
        console.error("VERIFIED EMAIL TAG SEQUENCE ENROLLMENT ERROR:", sequenceError);
      }
    }

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
