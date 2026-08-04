import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  createSeedlingBatch,
  listSeedlingBatches,
  recordSeedlingBatchActivity,
  seedlingProductionTemplates,
  syncStarterSeedlingBatches,
} from "@/lib/seedlings/seedlingBatches";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const batches = await listSeedlingBatches(prisma as any);
    return NextResponse.json({
      ok: true,
      templates: seedlingProductionTemplates,
      batches,
    });
  } catch (error) {
    console.error("Seedling batches GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Seedling batches could not be loaded.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const action = String(body?.action || "").trim();

    if (action === "create-batch") {
      const batch = await createSeedlingBatch(prisma as any, body || {});
      const batches = await listSeedlingBatches(prisma as any);
      return NextResponse.json({ ok: true, batch, batches });
    }

    if (action === "sync-starter-batches") {
      const created = await syncStarterSeedlingBatches(prisma as any);
      const batches = await listSeedlingBatches(prisma as any);
      return NextResponse.json({
        ok: true,
        created,
        batches,
        templates: seedlingProductionTemplates,
      });
    }

    if (action === "record-activity") {
      const batch = await recordSeedlingBatchActivity(prisma as any, body || {});
      const batches = await listSeedlingBatches(prisma as any);
      return NextResponse.json({ ok: true, batch, batches });
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported seedling batch action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Seedling batches POST error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Seedling batch could not be saved.",
      },
      { status: 400 }
    );
  }
}
