import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { scheduleNextDripSequenceJob } from "@/lib/verification/emailSequences";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function normalizeQuestionAnswers(snapshot, questionnaireSlug) {
  const records = Array.isArray(snapshot?.questionAnswers)
    ? snapshot.questionAnswers
    : [];

  return records
    .map((item) => ({
      questionnaireSlug: asString(item.questionnaireSlug) || questionnaireSlug,
      slideId: asString(item.slideId),
      questionKey: asString(item.questionKey),
      answer: item.answer,
      answeredAt: item.answeredAt ? new Date(item.answeredAt) : new Date(),
    }))
    .filter((item) => item.slideId && item.questionKey);
}

function normalizeVideoProgress(snapshot, questionnaireSlug) {
  const records = Array.isArray(snapshot?.videoProgress)
    ? snapshot.videoProgress
    : [];

  return records
    .map((item) => ({
      questionnaireSlug: asString(item.questionnaireSlug) || questionnaireSlug,
      slideId: asString(item.slideId),
      lastPositionSeconds: asPositiveInt(item.lastPositionSeconds),
      durationSeconds:
        item.durationSeconds === null || item.durationSeconds === undefined
          ? null
          : asPositiveInt(item.durationSeconds),
      watchedAt: item.watchedAt ? new Date(item.watchedAt) : new Date(),
    }))
    .filter((item) => item.slideId);
}

export async function syncEngagementForUser({ userId, questionnaireSlug, snapshot, source }) {
  const questionAnswers = normalizeQuestionAnswers(snapshot, questionnaireSlug);
  const videoProgress = normalizeVideoProgress(snapshot, questionnaireSlug);
  const dripUnlock = snapshot?.dripUnlock;

  for (const item of questionAnswers) {
    await prisma.userMarketingQuestionAnswer.upsert({
      where: {
        userId_questionnaireSlug_questionKey: {
          userId,
          questionnaireSlug: item.questionnaireSlug,
          questionKey: item.questionKey,
        },
      },
      create: {
        userId,
        questionnaireSlug: item.questionnaireSlug,
        slideId: item.slideId,
        questionKey: item.questionKey,
        answer: item.answer,
        source,
        answeredAt: item.answeredAt,
      },
      update: {
        slideId: item.slideId,
        answer: item.answer,
        source,
        answeredAt: item.answeredAt,
      },
    });
  }

  for (const item of videoProgress) {
    await prisma.userVideoProgress.upsert({
      where: {
        userId_questionnaireSlug_slideId: {
          userId,
          questionnaireSlug: item.questionnaireSlug,
          slideId: item.slideId,
        },
      },
      create: {
        userId,
        questionnaireSlug: item.questionnaireSlug,
        slideId: item.slideId,
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        watchedAt: item.watchedAt,
      },
      update: {
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        watchedAt: item.watchedAt,
      },
    });
  }

  if (dripUnlock && typeof dripUnlock === "object") {
    const sequenceKey = asString(dripUnlock.sequenceKey);
    const unlockKey = asString(dripUnlock.unlockKey);
    const slideId = asString(dripUnlock.slideId);
    const jobId = asString(dripUnlock.jobId);

    if (sequenceKey && unlockKey) {
      const job = jobId
        ? await prisma.emailSequenceJob.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              sequenceId: true,
              stepId: true,
              enrollmentId: true,
              recipientEmail: true,
              userId: true,
            },
          })
        : null;

      if (jobId && (!job || job.userId !== userId)) {
        return {
          questionAnswerCount: questionAnswers.length,
          videoProgressCount: videoProgress.length,
          dripUnlocked: false,
        };
      }

      const metadata = {
        dripSequenceKey: sequenceKey,
        questionnaireSlug,
        slideId: slideId || null,
        source,
      };

      await prisma.emailSequenceEvent.createMany({
        data: [
          {
            jobId: jobId || null,
            sequenceId: job?.sequenceId || null,
            stepId: job?.stepId || null,
            enrollmentId: job?.enrollmentId || null,
            recipientEmail: job?.recipientEmail || null,
            userId,
            eventType: "slide_unlocked",
            eventKey: unlockKey,
            metadata,
          },
          {
            jobId: jobId || null,
            sequenceId: job?.sequenceId || null,
            stepId: job?.stepId || null,
            enrollmentId: job?.enrollmentId || null,
            recipientEmail: job?.recipientEmail || null,
            userId,
            eventType: "clicked_link",
            eventKey: unlockKey,
            metadata,
          },
          {
            jobId: jobId || null,
            sequenceId: job?.sequenceId || null,
            stepId: job?.stepId || null,
            enrollmentId: job?.enrollmentId || null,
            recipientEmail: job?.recipientEmail || null,
            userId,
            eventType: "opened_slide",
            eventKey: unlockKey,
            metadata,
          },
        ],
      });

      await scheduleNextDripSequenceJob({
        userId,
        dripSequenceKey: sequenceKey,
        currentUnlockKey: unlockKey,
        openedAt: new Date(),
      });
    }
  }

  return {
    questionAnswerCount: questionAnswers.length,
    videoProgressCount: videoProgress.length,
    dripUnlocked: Boolean(dripUnlock),
  };
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();
    const body = await request.json();

    const questionnaireSlug = asString(body.questionnaireSlug);

    if (!questionnaireSlug) {
      return Response.json(
        { ok: false, error: "questionnaireSlug is required." },
        { status: 400 }
      );
    }

    if (!session?.userId) {
      return Response.json({
        ok: true,
        synced: false,
        reason: "No logged-in user yet.",
      });
    }

    const result = await syncEngagementForUser({
      userId: session.userId,
      questionnaireSlug,
      snapshot: body.snapshot || body,
      source: asString(body.source) || "client",
    });

    return Response.json({
      ok: true,
      synced: true,
      ...result,
    });
  } catch (error) {
    console.error("ENGAGEMENT SYNC ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to sync engagement.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
