import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  GATED_ACCESS_COOKIE_NAME,
  parseGatedAccessValue,
} from "@/lib/questionnaire/gatedAccessCookie";
import {
  createSession,
  getSessionFromCookie,
} from "@/lib/auth/sessionServer";

function normalizeUserForResponse(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(GATED_ACCESS_COOKIE_NAME);

    const payload = parseGatedAccessValue(accessCookie?.value);

    if (!payload) {
      return Response.json({
        ok: true,
        hasAccess: false,
        authenticatedFromGatedCookie: false,
      });
    }

    const url = new URL(request.url);
    const requestedSlug = url.searchParams.get("questionnaireSlug");

    if (
      requestedSlug &&
      payload.questionnaireSlug &&
      requestedSlug !== payload.questionnaireSlug
    ) {
      return Response.json({
        ok: true,
        hasAccess: false,
        authenticatedFromGatedCookie: false,
      });
    }

    let session = await getSessionFromCookie();
    let authenticatedFromGatedCookie = false;
    let authenticatedUser = session?.user || null;

    if (!session?.userId && typeof payload.userId === "string" && payload.userId) {
      const user = await prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          deletedAt: true,
          deletionStatus: true,
        },
      });

      if (
        user &&
        !user.deletedAt &&
        user.deletionStatus !== "DELETED"
      ) {
        await createSession(user.id);
        authenticatedFromGatedCookie = true;
        authenticatedUser = user;
      }
    }

    return Response.json({
      ok: true,
      hasAccess: true,
      authenticatedFromGatedCookie,
      authenticatedUser: normalizeUserForResponse(authenticatedUser),
      access: {
        questionnaireSlug: payload.questionnaireSlug || null,
        goto: payload.goto || null,
        target: payload.target || null,
        verifiedAt: payload.verifiedAt || null,
        expiresAt: payload.expiresAt || null,
      },
    });
  } catch (error) {
    console.error("GATED ACCESS STATUS ERROR:", error);

    return Response.json(
      {
        ok: false,
        hasAccess: false,
        authenticatedFromGatedCookie: false,
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}