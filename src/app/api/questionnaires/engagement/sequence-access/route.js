import { prisma } from "@/lib/prisma";
import { createSession, getSessionFromCookie } from "@/lib/auth/sessionServer";
import { getRequestIdentity } from "@/lib/security/requestIdentity";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import crypto from "crypto";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getDripUnlockFromUrl(ctaUrl) {
  if (!ctaUrl) {
    return null;
  }

  try {
    const url = new URL(String(ctaUrl), "http://localhost");

    return {
      unlockKey: url.searchParams.get("unlockKey"),
      slideId: url.searchParams.get("slide"),
      dripSequenceKey:
        url.searchParams.get("dripSequenceKey") ||
        url.pathname.split("/").filter(Boolean).pop(),
    };
  } catch {
    return null;
  }
}

function serializeSessionUser(user) {
  return {
    id: user.id,
    name: user.name || null,
    email: user.email || null,
    phone: user.phone || null,
    adminLevel: Number(user.adminLevel || 0),
    preferredCurrencyCode: user.preferredCurrencyCode || "USD",
    createdBy: user.createdBy || "user",
  };
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function sendDeviceVerificationEmail({ request, job, unlockKey, dripSequenceKey }) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  const recipientEmail = job.recipientEmail || job.enrollment?.recipientEmail || "";
  const baseUrl = new URL(request.url).origin;
  const successRedirect = `${baseUrl}/questionnaire/itasl?slide=${encodeURIComponent(
    unlockKey
  )}&unlockKey=${encodeURIComponent(unlockKey)}&dripSequenceKey=${encodeURIComponent(
    dripSequenceKey
  )}&sequenceJobId=${encodeURIComponent(job.id)}`;
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;

  await prisma.verificationToken.create({
    data: {
      identifier: recipientEmail,
      tokenHash,
      target: "sequenceDeviceAccess",
      successRedirect,
      expiresAt,
      userId: job.userId || job.enrollment?.userId || null,
    },
  });

  return sendEmailMessage({
    to: recipientEmail,
    subject: "Verify this device",
    text: `Someone opened your private content link from a new device.\n\nIf this was you, verify this device here:\n${verifyUrl}\n\nIf this was not you, ignore this email.`,
    html: `<p>Someone opened your private content link from a new device.</p><p>If this was you, verify this device here:</p><p><a href="${verifyUrl}">Verify this device</a></p><p>If this was not you, ignore this email.</p>`,
    purpose: "sequence-device-verification",
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const requestIdentity = await getRequestIdentity();
    const action = asString(body?.action);
    const sequenceJobId = asString(body?.sequenceJobId);
    const unlockKey = asString(body?.unlockKey);
    const dripSequenceKey = asString(body?.dripSequenceKey);

    if (!sequenceJobId || !unlockKey || !dripSequenceKey) {
      return Response.json(
        {
          ok: false,
          error: "sequenceJobId, unlockKey, and dripSequenceKey are required.",
        },
        { status: 400 }
      );
    }

    const job = await prisma.emailSequenceJob.findUnique({
      where: {
        id: sequenceJobId,
      },
      include: {
        enrollment: {
          select: {
            userId: true,
            recipientEmail: true,
            recipientName: true,
          },
        },
        sequence: {
          select: {
            metadata: true,
          },
        },
      },
    });

    if (!job) {
      return Response.json(
        { ok: false, error: "Email link access was not found." },
        { status: 404 }
      );
    }

    const dripUnlock = getDripUnlockFromUrl(job.ctaUrl);
    const sequenceMetadata =
      job.sequence?.metadata && typeof job.sequence.metadata === "object"
        ? job.sequence.metadata
        : {};
    const jobDripSequenceKey = sequenceMetadata.dripSequenceKey || null;

    if (
      dripUnlock?.unlockKey !== unlockKey ||
      (dripUnlock.dripSequenceKey || jobDripSequenceKey) !== dripSequenceKey
    ) {
      return Response.json(
        { ok: false, error: "Email link access does not match this content." },
        { status: 403 }
      );
    }

    const userId = job.userId || job.enrollment?.userId || null;

    if (!userId) {
      return Response.json(
        { ok: false, error: "This email link is not attached to an account yet." },
        { status: 409 }
      );
    }

    const existingSession = await getSessionFromCookie();

    if (existingSession?.user?.id && existingSession.user.id !== userId) {
      await prisma.emailSequenceEvent.create({
        data: {
          sequenceId: job.sequenceId,
          stepId: job.stepId,
          enrollmentId: job.enrollmentId,
          jobId: job.id,
          userId,
          recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
          eventType: "sequence_link_blocked_wrong_account",
          eventKey: unlockKey,
          metadata: {
            dripSequenceKey,
            reason: "session-user-mismatch",
            activeUserId: existingSession.user.id,
            deviceKey: requestIdentity.deviceKey,
            ipHash: requestIdentity.ipHash,
            userAgent: requestIdentity.userAgent,
            acceptLanguage: requestIdentity.acceptLanguage,
            platform: requestIdentity.platform,
            location: requestIdentity.location,
          },
        },
      });

      return Response.json(
        {
          ok: false,
          blocked: true,
          code: "WRONG_ACCOUNT",
          error:
            "This private link belongs to another email address. Sign up or log in with your own email to continue.",
          signupHref: "/questionnaire/invitation?slide=whatsapp-subscription",
        },
        { status: 403 }
      );
    }

    const authorizedDeviceEvent = await prisma.emailSequenceEvent.findFirst({
      where: {
        jobId: job.id,
        eventType: "sequence_link_device_authorized",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const authorizedDeviceKey =
      authorizedDeviceEvent?.metadata &&
      typeof authorizedDeviceEvent.metadata === "object"
        ? authorizedDeviceEvent.metadata.deviceKey
        : null;

    if (
      authorizedDeviceKey &&
      authorizedDeviceKey !== requestIdentity.deviceKey
    ) {
      if (action === "requestDeviceVerification") {
        const deliveryResult = await sendDeviceVerificationEmail({
          request,
          job,
          unlockKey,
          dripSequenceKey,
        });

        await prisma.emailSequenceEvent.create({
          data: {
            sequenceId: job.sequenceId,
            stepId: job.stepId,
            enrollmentId: job.enrollmentId,
            jobId: job.id,
            userId,
            recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
            eventType: "sequence_link_device_verification_sent",
            eventKey: unlockKey,
            metadata: {
              dripSequenceKey,
              deviceKey: requestIdentity.deviceKey,
              ipHash: requestIdentity.ipHash,
              userAgent: requestIdentity.userAgent,
              acceptLanguage: requestIdentity.acceptLanguage,
              platform: requestIdentity.platform,
              location: requestIdentity.location,
              deliveryOk: deliveryResult?.ok === true,
              provider: deliveryResult?.provider || null,
              rewritten: deliveryResult?.rewritten === true,
            },
          },
        });

        return Response.json({
          ok: true,
          blocked: true,
          code: "DEVICE_VERIFICATION_SENT",
          message:
            "We sent a device verification link to the email address that owns this content.",
        });
      }

      await prisma.emailSequenceEvent.create({
        data: {
          sequenceId: job.sequenceId,
          stepId: job.stepId,
          enrollmentId: job.enrollmentId,
          jobId: job.id,
          userId,
          recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
          eventType: "sequence_link_device_blocked",
          eventKey: unlockKey,
          metadata: {
            dripSequenceKey,
            reason: "unrecognized-device",
            authorizedDeviceKey,
            deviceKey: requestIdentity.deviceKey,
            ipHash: requestIdentity.ipHash,
            userAgent: requestIdentity.userAgent,
            acceptLanguage: requestIdentity.acceptLanguage,
            platform: requestIdentity.platform,
            location: requestIdentity.location,
          },
        },
      });

      return Response.json(
        {
          ok: false,
          blocked: true,
          code: "UNRECOGNIZED_DEVICE",
          error:
            "This private content link is already assigned to another device. Verify this device from the original email inbox, or sign up with your own email to receive your own access.",
          canVerifyDevice: true,
          signupHref: "/questionnaire/invitation?slide=whatsapp-subscription",
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return Response.json(
        { ok: false, error: "The account for this email link was not found." },
        { status: 404 }
      );
    }

    if (existingSession?.user?.id) {
      await prisma.emailSequenceEvent.create({
        data: {
          sequenceId: job.sequenceId,
          stepId: job.stepId,
          enrollmentId: job.enrollmentId,
          jobId: job.id,
          userId,
          recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
          eventType: "sequence_link_device_returned",
          eventKey: unlockKey,
          metadata: {
            dripSequenceKey,
            deviceKey: requestIdentity.deviceKey,
            ipHash: requestIdentity.ipHash,
            userAgent: requestIdentity.userAgent,
            acceptLanguage: requestIdentity.acceptLanguage,
            platform: requestIdentity.platform,
            location: requestIdentity.location,
          },
        },
      });

      return Response.json({
        ok: true,
        authenticated: true,
        user: serializeSessionUser(existingSession.user),
      });
    }

    if (!authorizedDeviceKey) {
      await prisma.emailSequenceEvent.create({
        data: {
          sequenceId: job.sequenceId,
          stepId: job.stepId,
          enrollmentId: job.enrollmentId,
          jobId: job.id,
          userId,
          recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
          eventType: "sequence_link_device_authorized",
          eventKey: unlockKey,
          metadata: {
            dripSequenceKey,
            deviceKey: requestIdentity.deviceKey,
            ipHash: requestIdentity.ipHash,
            userAgent: requestIdentity.userAgent,
            acceptLanguage: requestIdentity.acceptLanguage,
            platform: requestIdentity.platform,
            location: requestIdentity.location,
          },
        },
      });
    }

    await createSession(user.id);

    return Response.json({
      ok: true,
      authenticated: true,
      user: serializeSessionUser(user),
      access: {
        dripSequenceKey,
        unlockKey,
        slideId: dripUnlock?.slideId || null,
        recipientEmail: job.recipientEmail || job.enrollment?.recipientEmail || null,
      },
    });
  } catch (error) {
    console.error("SEQUENCE EMAIL ACCESS ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to open sequence email access.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
