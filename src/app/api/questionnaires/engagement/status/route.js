import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

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
        watchedAt: item.watchedAt,
        updatedAt: item.updatedAt,
      })),
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