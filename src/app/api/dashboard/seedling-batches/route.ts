import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  createSeedlingBatch,
  deleteSeedlingBatch,
  listSeedlingBatches,
  recordSeedlingBatchActivity,
  seedlingProductionTemplates,
  syncStarterSeedlingBatches,
  updateSeedlingBatch,
} from "@/lib/seedlings/seedlingBatches";
import {
  getCanonicalPlantKey,
  getPlantRecipeCatalog,
} from "@/lib/nursery/plantRecipes";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const plantCatalog = await getPlantRecipeCatalog(prisma as any);
    const batches = attachTimelineMatches(
      await listSeedlingBatches(prisma as any),
      plantCatalog
    );
    return NextResponse.json({
      ok: true,
      templates: seedlingProductionTemplates,
      plantCatalog,
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
      const plantCatalog = await getPlantRecipeCatalog(prisma as any);
      const batches = attachTimelineMatches(
        await listSeedlingBatches(prisma as any),
        plantCatalog
      );
      return NextResponse.json({ ok: true, batch, batches, plantCatalog });
    }

    if (action === "sync-starter-batches") {
      const created = await syncStarterSeedlingBatches(prisma as any);
      const plantCatalog = await getPlantRecipeCatalog(prisma as any);
      const batches = attachTimelineMatches(
        await listSeedlingBatches(prisma as any),
        plantCatalog
      );
      return NextResponse.json({
        ok: true,
        created,
        batches,
        plantCatalog,
        templates: seedlingProductionTemplates,
      });
    }

    if (action === "record-activity") {
      const batch = await recordSeedlingBatchActivity(prisma as any, body || {});
      const plantCatalog = await getPlantRecipeCatalog(prisma as any);
      const batches = attachTimelineMatches(
        await listSeedlingBatches(prisma as any),
        plantCatalog
      );
      return NextResponse.json({ ok: true, batch, batches, plantCatalog });
    }

    if (action === "update-batch") {
      const batch = await updateSeedlingBatch(prisma as any, body || {});
      const plantCatalog = await getPlantRecipeCatalog(prisma as any);
      const batches = attachTimelineMatches(
        await listSeedlingBatches(prisma as any),
        plantCatalog
      );
      return NextResponse.json({ ok: true, batch, batches, plantCatalog });
    }

    if (action === "delete-batch") {
      const deletedBatch = await deleteSeedlingBatch(prisma as any, body || {});
      const plantCatalog = await getPlantRecipeCatalog(prisma as any);
      const batches = attachTimelineMatches(
        await listSeedlingBatches(prisma as any),
        plantCatalog
      );
      return NextResponse.json({ ok: true, deletedBatch, batches, plantCatalog });
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

function attachTimelineMatches(
  batches: any[],
  plantCatalog: Array<{ key: string; name: string }>
) {
  const catalogByKey = new Map(plantCatalog.map((plant) => [plant.key, plant]));

  return batches.map((batch) => {
    const candidateKeys = [
      batch.cropKey,
      batch.cropName,
      batch.batchName,
      batch.metadata?.template?.cropName,
    ]
      .map((value) => getCanonicalPlantKey(value))
      .filter(Boolean);
    const timelinePlant = candidateKeys
      .map((key) => catalogByKey.get(key))
      .find(Boolean);

    return {
      ...batch,
      timelinePlant: timelinePlant || null,
      needsTimelineMatch: !timelinePlant,
    };
  });
}
