import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { ensureUserVideoProgressAnalyticsColumns } from "@/lib/questionnaire/videoProgressSchema";
import {
  ensureItaslLeadNurtureSequence,
  scheduleNextDripSequenceJob,
  sendDueEmailSequenceJobs,
} from "@/lib/verification/emailSequences";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request) {
  try {
    const session = await getSessionFromCookie();
    const url = new URL(request.url);
    const questionnaireSlug = asString(url.searchParams.get("questionnaireSlug"));

    if (!questionnaireSlug) {
      return Response.json(
        { ok: false, error: "questionnaireSlug is required." },
        { status: 400 }
      );
    }

    if (!session?.userId) {
      return Response.json({
        ok: true,
        hasUser: false,
        answeredQuestionSlideIds: [],
        questionAnswers: [],
        videoProgress: [],
      });
    }

    const dripSequenceKey = asString(url.searchParams.get("dripSequenceKey"));

    if (dripSequenceKey === "itasl") {
      await ensureItaslLeadNurtureSequence();
    }

    await ensureUserVideoProgressAnalyticsColumns(prisma);

    const [questionAnswers, videoProgress] = await Promise.all([
      prisma.userMarketingQuestionAnswer.findMany({
        where: {
          userId: session.userId,
          questionnaireSlug,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.userVideoProgress.findMany({
        where: {
          userId: session.userId,
          questionnaireSlug,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);
    let [dripEvents, initialDripNextJob] = await loadDripState({
      userId: session.userId,
      dripSequenceKey,
    });

    if (
      dripSequenceKey &&
      initialDripNextJob?.scheduledFor &&
      new Date(initialDripNextJob.scheduledFor).getTime() <= Date.now()
    ) {
      await sendDueEmailSequenceJobs({ limit: 10 });
      [dripEvents, initialDripNextJob] = await loadDripState({
        userId: session.userId,
        dripSequenceKey,
      });
    }

    const dripUnlockKeys = new Set();
    const dripOpenedKeys = new Set();
    let dripNextJob = initialDripNextJob;

    for (const event of dripEvents) {
      if (!event.eventKey) continue;

      if (event.eventType === "slide_unlocked") {
        dripUnlockKeys.add(event.eventKey);
      }

      if (event.eventType === "opened_slide" || event.eventType === "clicked_link") {
        dripUnlockKeys.add(event.eventKey);
        dripOpenedKeys.add(event.eventKey);
      }
    }

    if (!dripNextJob && dripSequenceKey) {
      const latestOpenedEvent = dripEvents.find(
        (event) =>
          event.eventKey &&
          (event.eventType === "opened_slide" || event.eventType === "clicked_link")
      );

      if (latestOpenedEvent) {
        dripNextJob = await scheduleNextDripSequenceJob({
          userId: session.userId,
          dripSequenceKey,
          currentUnlockKey: latestOpenedEvent.eventKey,
          openedAt: latestOpenedEvent.createdAt || new Date(),
        });
      } else if (dripSequenceKey === "itasl") {
        dripNextJob = await scheduleNextDripSequenceJob({
          userId: session.userId,
          dripSequenceKey,
          currentUnlockKey: "itasl-day-01",
          openedAt: new Date(),
        });
      }
    }

    return Response.json({
      ok: true,
      hasUser: true,
      answeredQuestionSlideIds: Array.from(
        new Set(questionAnswers.map((item) => item.slideId))
      ),
      questionAnswers: questionAnswers.map((item) => ({
        slideId: item.slideId,
        questionKey: item.questionKey,
        answer: item.answer,
        answeredAt: item.answeredAt,
        updatedAt: item.updatedAt,
      })),
      videoProgress: videoProgress.map((item) => ({
        slideId: item.slideId,
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        totalWatchSeconds: item.totalWatchSeconds ?? 0,
        maxPositionSeconds:
          item.maxPositionSeconds ?? item.lastPositionSeconds ?? 0,
        playEventCount: item.playEventCount ?? 0,
        seekForwardCount: item.seekForwardCount ?? 0,
        seekBackwardCount: item.seekBackwardCount ?? 0,
        lastEventType: item.lastEventType ?? null,
        watchedAt: item.watchedAt,
        updatedAt: item.updatedAt,
      })),
      dripUnlockKeys: Array.from(dripUnlockKeys),
      dripOpenedKeys: Array.from(dripOpenedKeys),
      dripNextJob: dripNextJob
        ? {
            id: dripNextJob.id,
            scheduledFor: dripNextJob.scheduledFor,
            stepKey: dripNextJob.step?.stepKey || null,
            stepName: dripNextJob.step?.name || null,
          }
        : null,
    });
  } catch (error) {
    console.error("ENGAGEMENT STATUS ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to read engagement status.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function loadDripState({ userId, dripSequenceKey }) {
  if (!dripSequenceKey) {
    return [[], null];
  }

  return Promise.all([
    prisma.emailSequenceEvent.findMany({
      where: {
        userId,
        eventType: {
          in: ["slide_unlocked", "opened_slide", "clicked_link"],
        },
        metadata: {
          path: ["dripSequenceKey"],
          equals: dripSequenceKey,
        },
      },
      select: {
        eventType: true,
        eventKey: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.emailSequenceJob.findFirst({
      where: {
        userId,
        status: "PENDING",
        sequence: {
          metadata: {
            path: ["dripSequenceKey"],
            equals: dripSequenceKey,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
      select: {
        id: true,
        scheduledFor: true,
        step: {
          select: {
            stepKey: true,
            name: true,
          },
        },
      },
    }),
  ]);
}
