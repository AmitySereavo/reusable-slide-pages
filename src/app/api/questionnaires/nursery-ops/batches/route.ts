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

function parseSnapshot(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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

        const nurseryBatches = batches.map((batch) => {
      const containerSnapshot = parseSnapshot(batch.containerSnapshot);
      const mediumSnapshot = parseSnapshot(batch.startMediumSnapshot);
      const locationSnapshot = parseSnapshot(batch.locationSnapshot);

      const containerQuantity =
        typeof containerSnapshot?.quantity === "number"
          ? containerSnapshot.quantity
          : typeof containerSnapshot?.quantity === "string"
            ? Number(containerSnapshot.quantity)
            : 0;

      const individualsVisible =
        batch.units.length >= 2 || containerQuantity >= 2;

      return {
        value: batch.code,
        id: batch.id,
        code: batch.code,
        plantName: batch.plantType.displayName ?? batch.plantType.name,
        startDate: batch.startDate.toISOString().slice(0, 10),
        startMethod: formatEnumLabel(batch.startMethod),
        quantityStarted: batch.quantityStarted,
        quantityAlive: batch.quantityAlive,
        quantityLost: batch.quantityLost,
        quantityTransplanted: batch.quantityTransplanted,
        intendedUse: formatEnumLabel(batch.intendedUse),
        targetBuyerType: formatEnumLabel(batch.targetBuyerType),
        sourceName: batch.sourceName ?? "",
        sourceNotes: batch.sourceNotes ?? "",
        labeledForSale: batch.labeledForSale,
        labeledForSaleText: batch.labeledForSale ? "Yes" : "No",
        commercialNotes: batch.commercialNotes ?? "",
        startNotes: batch.startNotes ?? "",
        childCount: batch.units.length,
        containerType:
          typeof containerSnapshot?.type === "string"
            ? containerSnapshot.type
            : "",
        containerQuantity: Number.isFinite(containerQuantity)
          ? containerQuantity
          : 0,
        containerDescription:
          typeof containerSnapshot?.description === "string"
            ? containerSnapshot.description
            : typeof containerSnapshot?.otherDescription === "string"
              ? containerSnapshot.otherDescription
              : "",
        mediumName:
          typeof mediumSnapshot?.name === "string" ? mediumSnapshot.name : "",
        mediumQuality:
          typeof mediumSnapshot?.quality === "string"
            ? mediumSnapshot.quality
            : "",
        locationCode:
          typeof locationSnapshot?.code === "string"
            ? locationSnapshot.code
            : "",
        locationDescription:
          typeof locationSnapshot?.description === "string"
            ? locationSnapshot.description
            : "",
        individualsVisible,
      };
    });;

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

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const batchId =
      body && typeof body.batchId === "string" ? body.batchId.trim() : "";
    const batchCode =
      body && typeof body.batchCode === "string" ? body.batchCode.trim() : "";
    const confirmation =
      body && typeof body.confirmation === "string"
        ? body.confirmation.trim()
        : "";

    if (confirmation !== "delete batch") {
      return NextResponse.json(
        { ok: false, error: 'Type "delete batch" to confirm deletion.' },
        { status: 400 }
      );
    }

    if (!batchId && !batchCode) {
      return NextResponse.json(
        { ok: false, error: "Batch id or batch code is required." },
        { status: 400 }
      );
    }

    const existingBatch = await prisma.plantBatch.findFirst({
      where: batchId ? { id: batchId } : { code: batchCode },
      select: {
        id: true,
        code: true,
      },
    });

    if (!existingBatch) {
      return NextResponse.json(
        { ok: false, error: "Batch not found." },
        { status: 404 }
      );
    }

    await prisma.plantBatch.delete({
      where: {
        id: existingBatch.id,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedBatchId: existingBatch.id,
      deletedBatchCode: existingBatch.code,
    });
  } catch (error) {
    console.error("Nursery delete batch route error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete nursery batch." },
      { status: 500 }
    );
  }
}