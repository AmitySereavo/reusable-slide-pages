import { NextResponse } from "next/server";
import { getSelfTrustStats } from "@/lib/questionnaire/custom/selfTrustStats";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const selfScore = searchParams.get("selfScore");
    const futureScore = searchParams.get("futureScore");

    const stats = await getSelfTrustStats({
      selfScore,
      futureScore,
    });

    return NextResponse.json({
      ok: true,
      variables: stats,
    });
  } catch (error) {
    console.error("Self trust stats route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load self trust stats.",
      },
      { status: 500 }
    );
  }
}