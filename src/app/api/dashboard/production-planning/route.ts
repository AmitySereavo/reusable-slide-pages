import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { prisma } from "@/lib/prisma";
import { buildBatchProductionPlanning } from "@/lib/nursery/batchPlanning";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    return NextResponse.json({
      ok: true,
      gardenPackageStoreProduction: {
        rules: null,
        package: null,
        blocks: [],
        disabledReason:
          "Store-generated package orders are paused while production rules are being refined.",
      },
      batchProductionPlanning: await buildBatchProductionPlanning(prisma as any),
    });
  } catch (error) {
    console.error("Production planning API failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Production planning data could not be loaded.",
      },
      { status: 500 }
    );
  }
}
