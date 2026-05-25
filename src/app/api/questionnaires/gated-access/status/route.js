import { cookies } from "next/headers";
import {
  GATED_ACCESS_COOKIE_NAME,
  parseGatedAccessValue,
} from "@/lib/questionnaire/gatedAccessCookie";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(GATED_ACCESS_COOKIE_NAME);

    const payload = parseGatedAccessValue(accessCookie?.value);

    if (!payload) {
      return Response.json({
        ok: true,
        hasAccess: false,
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
      });
    }

    return Response.json({
      ok: true,
      hasAccess: true,
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
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}