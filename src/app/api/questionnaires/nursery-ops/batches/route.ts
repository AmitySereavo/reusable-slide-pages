import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET() {
  try {
    const batches = await prisma.plantBatch.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        plantType: true,
        units: {
          select: {
            id: true,
            code: true,
            conditionStatus: true,
            labeledForSale: true,
            location: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          orderBy: [{ sequenceNumber: "asc" }],
        },
      },
    });

    const nurseryBatches = batches.map((batch) => ({
      value: batch.code,
      id: batch.id,
      code: batch.code,
      plantName: batch.plantType.displayName ?? batch.plantType.name,
      startDate: batch.startDate.toISOString().slice(0, 10),
      quantityStarted: batch.quantityStarted,
      quantityAlive: batch.quantityAlive,
      quantityLost: batch.quantityLost,
      intendedUse: formatEnumLabel(batch.intendedUse),
      targetBuyerType: formatEnumLabel(batch.targetBuyerType),
      labeledForSale: batch.labeledForSale,
      childCount: batch.units.length,
    }));

    const nurseryBatchPlants = batches.flatMap((batch) =>
      batch.units.map((unit) => ({
        value: unit.code,
        id: unit.id,
        code: unit.code,
        batchCode: batch.code,
        plantName: batch.plantType.displayName ?? batch.plantType.name,
        conditionStatus: formatEnumLabel(unit.conditionStatus),
        location: unit.location?.name ?? unit.location?.code ?? "",
        labelStatus: unit.labeledForSale ? "Labeled" : "Not labeled",
      }))
    );

    return NextResponse.json({
      ok: true,
      nurseryBatches,
      nurseryBatchPlants,
    });
  } catch (error) {
    console.error("Nursery batches route error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load nursery batches." },
      { status: 500 }
    );
  }
}