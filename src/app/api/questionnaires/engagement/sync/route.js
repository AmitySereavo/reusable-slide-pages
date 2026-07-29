import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { scheduleNextDripSequenceJob } from "@/lib/verification/emailSequences";
import { ensureUserVideoProgressAnalyticsColumns } from "@/lib/questionnaire/videoProgressSchema";
import { randomUUID } from "crypto";

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
      totalWatchSeconds: asPositiveInt(item.totalWatchSeconds),
      maxPositionSeconds: asPositiveInt(
        item.maxPositionSeconds ?? item.lastPositionSeconds
      ),
      playEventCount: asPositiveInt(item.playEventCount),
      seekForwardCount: asPositiveInt(item.seekForwardCount),
      seekBackwardCount: asPositiveInt(item.seekBackwardCount),
      lastEventType: asString(item.lastEventType) || null,
      watchedAt: item.watchedAt ? new Date(item.watchedAt) : new Date(),
    }))
    .filter((item) => item.slideId);
}

function normalizeBookmarkEvents(snapshot, questionnaireSlug) {
  const records = Array.isArray(snapshot?.bookmarkEvents)
    ? snapshot.bookmarkEvents
    : [];

  return records
    .map((item) => {
      const bookmarkKind =
        item.bookmarkKind === "video" ? "video" : "chapter";
      const action = item.action === "started" ? "started" : "saved";
      const triggerType =
        item.triggerType === "automatic" ? "automatic" : "manual";
      const bookmarkedAt = item.bookmarkedAt
        ? new Date(item.bookmarkedAt)
        : new Date();

      return {
        id: asString(item.id),
        questionnaireSlug: asString(item.questionnaireSlug) || questionnaireSlug,
        slideId: asString(item.slideId),
        slideLabel: asString(item.slideLabel) || null,
        bookmarkKind,
        action,
        triggerType,
        bookmarkedAt,
        videoTimestampSeconds:
          item.videoTimestampSeconds === null ||
          item.videoTimestampSeconds === undefined
            ? null
            : asPositiveInt(item.videoTimestampSeconds),
        videoDurationSeconds:
          item.videoDurationSeconds === null ||
          item.videoDurationSeconds === undefined
            ? null
            : asPositiveInt(item.videoDurationSeconds),
      };
    })
    .filter((item) => item.slideId && Number.isFinite(item.bookmarkedAt.getTime()));
}

export async function syncEngagementForUser({ userId, questionnaireSlug, snapshot, source }) {
  const questionAnswers = normalizeQuestionAnswers(snapshot, questionnaireSlug);
  const videoProgress = normalizeVideoProgress(snapshot, questionnaireSlug);
  const bookmarkEvents = normalizeBookmarkEvents(snapshot, questionnaireSlug);
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

  if (videoProgress.length) {
    await ensureUserVideoProgressAnalyticsColumns(prisma);
  }

  for (const item of videoProgress) {
    await prisma.$executeRaw`
      INSERT INTO "UserVideoProgress" (
        "id",
        "userId",
        "questionnaireSlug",
        "slideId",
        "lastPositionSeconds",
        "durationSeconds",
        "totalWatchSeconds",
        "maxPositionSeconds",
        "playEventCount",
        "seekForwardCount",
        "seekBackwardCount",
        "lastEventType",
        "watchedAt",
        "updatedAt"
      )
      VALUES (
        ${`uvp-${randomUUID()}`},
        ${userId},
        ${item.questionnaireSlug},
        ${item.slideId},
        ${item.lastPositionSeconds},
        ${item.durationSeconds},
        ${item.totalWatchSeconds},
        ${Math.max(item.maxPositionSeconds, item.lastPositionSeconds)},
        ${item.playEventCount},
        ${item.seekForwardCount},
        ${item.seekBackwardCount},
        ${item.lastEventType},
        ${item.watchedAt},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId", "questionnaireSlug", "slideId")
      DO UPDATE SET
        "lastPositionSeconds" = EXCLUDED."lastPositionSeconds",
        "durationSeconds" = EXCLUDED."durationSeconds",
        "totalWatchSeconds" = GREATEST("UserVideoProgress"."totalWatchSeconds", EXCLUDED."totalWatchSeconds"),
        "maxPositionSeconds" = GREATEST("UserVideoProgress"."maxPositionSeconds", EXCLUDED."maxPositionSeconds"),
        "playEventCount" = GREATEST("UserVideoProgress"."playEventCount", EXCLUDED."playEventCount"),
        "seekForwardCount" = GREATEST("UserVideoProgress"."seekForwardCount", EXCLUDED."seekForwardCount"),
        "seekBackwardCount" = GREATEST("UserVideoProgress"."seekBackwardCount", EXCLUDED."seekBackwardCount"),
        "lastEventType" = EXCLUDED."lastEventType",
        "watchedAt" = EXCLUDED."watchedAt",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  if (bookmarkEvents.length) {
    const bookmarkRows = bookmarkEvents.map((item) => ({
      userId,
      eventType:
        item.bookmarkKind === "video"
          ? item.action === "started"
            ? "video_bookmark_started"
            : "video_bookmark_saved"
          : item.action === "started"
            ? "chapter_bookmark_started"
            : "chapter_bookmark_saved",
      eventKey:
        item.id ||
        `${item.questionnaireSlug}:${item.bookmarkKind}:${item.action}:${item.slideId}:${item.bookmarkedAt.toISOString()}`,
      metadata: {
        questionnaireSlug: item.questionnaireSlug,
        slideId: item.slideId,
        slideLabel: item.slideLabel,
        bookmarkKind: item.bookmarkKind,
        action: item.action,
        triggerType: item.triggerType,
        bookmarkedAt: item.bookmarkedAt.toISOString(),
        videoTimestampSeconds: item.videoTimestampSeconds,
        videoDurationSeconds: item.videoDurationSeconds,
        source,
      },
      createdAt: item.bookmarkedAt,
    }));
    const eventKeys = bookmarkRows
      .map((item) => item.eventKey)
      .filter(Boolean);
    const existingEvents = eventKeys.length
      ? await prisma.emailSequenceEvent.findMany({
          where: {
            userId,
            eventKey: { in: eventKeys },
            eventType: {
              in: [
                "chapter_bookmark_saved",
                "chapter_bookmark_started",
                "video_bookmark_saved",
                "video_bookmark_started",
              ],
            },
          },
          select: { eventKey: true },
        })
      : [];
    const existingEventKeys = new Set(
      existingEvents.map((event) => event.eventKey).filter(Boolean)
    );

    const newBookmarkRows = bookmarkRows.filter(
      (item) => !existingEventKeys.has(item.eventKey)
    );

    if (newBookmarkRows.length) {
      await prisma.emailSequenceEvent.createMany({
        data: newBookmarkRows,
      });
    }
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
          bookmarkEventCount: bookmarkEvents.length,
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
    bookmarkEventCount: bookmarkEvents.length,
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
