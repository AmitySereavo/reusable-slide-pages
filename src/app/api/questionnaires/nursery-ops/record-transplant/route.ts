import { NextResponse } from "next/server";
import { PlantActivityType, PlantUnitKind, PlantUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RecordNurseryTransplantPayload = {
  questionnaireSlug?: string;
  action?: string;
  answers?: Record<string, unknown>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const next = asString(value);
  return next.length > 0 ? next : null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asPositiveInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return 0;
}

function formatSequenceNumber(value: number) {
  return String(value).padStart(4, "0");
}

function buildTransplantIndividualCode(params: {
  batchCode: string;
  batchContainerSequence?: number | null;
  transplantContainerSequence: number;
}) {
  const batchContainerPart =
    typeof params.batchContainerSequence === "number" &&
    params.batchContainerSequence > 0
      ? `-${formatSequenceNumber(params.batchContainerSequence)}`
      : "";

  return `${params.batchCode}${batchContainerPart}T-${formatSequenceNumber(
    params.transplantContainerSequence
  )}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RecordNurseryTransplantPayload;
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};

        const selectedBatchCode = asString(answers.opsSelectedBatchCode);
    const batchCode = selectedBatchCode;
    const transplantDateRaw = asString(answers.opsTransplantDate);
    const transplantQuantity = asPositiveInt(answers.opsTransplantQuantity);
    const transplantQuantityPerContainer = asPositiveInt(
      answers.opsTransplantQuantityPerContainer
    );
    const selectedPlantCode = asString(answers.opsSelectedPlantCode);
    if (!batchCode) {
      return NextResponse.json(
        { ok: false, error: "Batch code is required." },
        { status: 400 }
      );
    }

    if (!transplantDateRaw) {
      return NextResponse.json(
        { ok: false, error: "Transplant date is required." },
        { status: 400 }
      );
    }

    const transplantDate = new Date(transplantDateRaw);

    if (Number.isNaN(transplantDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid transplant date." },
        { status: 400 }
      );
    }

    if (transplantQuantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "Transplant quantity must be greater than zero." },
        { status: 400 }
      );
    }

    if (transplantQuantityPerContainer <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quantity of plants in container must be greater than zero.",
        },
        { status: 400 }
      );
    }

    const batch = await prisma.plantBatch.findUnique({
      where: { code: batchCode },
      include: {
        units: {
          orderBy: [{ sequenceNumber: "asc" }],
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { ok: false, error: "Batch not found." },
        { status: 404 }
      );
    }

    const batchIndividualUnits = batch.units.filter(
      (unit) => unit.unitKind === PlantUnitKind.BATCH_INDIVIDUAL
    );

    const sourceUnit =
      selectedPlantCode.length > 0
        ? batchIndividualUnits.find((unit) => unit.code === selectedPlantCode) ?? null
        : null;

    if (selectedPlantCode && !sourceUnit) {
      return NextResponse.json(
        { ok: false, error: "Selected batch individual was not found." },
        { status: 404 }
      );
    }

    const nextBatchSequence =
      batch.units.reduce(
        (max, unit) => Math.max(max, unit.sequenceNumber),
        0
      ) + 1;

    const sourceBatchContainerSequence =
      sourceUnit?.batchContainerSequence ??
      (batchIndividualUnits.length >= 2 ? null : null);

    const sourceBatchContainerCodePart =
      batchIndividualUnits.length >= 2 ? sourceUnit?.batchContainerSequence ?? null : null;

    const existingSiblingTransplants = batch.units.filter((unit) => {
      if (unit.unitKind !== PlantUnitKind.TRANSPLANT_INDIVIDUAL) {
        return false;
      }

      if (sourceUnit?.id) {
        return unit.parentUnitId === sourceUnit.id;
      }

      return unit.parentUnitId === null;
    });

    const createdTransplantUnits = await prisma.$transaction(async (tx) => {
      const createdUnits = [];

      for (let index = 0; index < transplantQuantity; index += 1) {
        const transplantContainerSequence = existingSiblingTransplants.length + index + 1;
        const sequenceNumber = nextBatchSequence + index;

        const code = buildTransplantIndividualCode({
          batchCode: batch.code,
          batchContainerSequence: sourceBatchContainerCodePart,
          transplantContainerSequence,
        });

        const createdUnit = await tx.plantUnit.create({
          data: {
            code,
            batchId: batch.id,
            sequenceNumber,
            unitKind: PlantUnitKind.TRANSPLANT_INDIVIDUAL,
            parentUnitId: sourceUnit?.id ?? null,
            batchContainerSequence: sourceBatchContainerCodePart,
            transplantContainerSequence,
            status: PlantUnitStatus.ACTIVE,
            conditionStatus: sourceUnit?.conditionStatus ?? undefined,
            containerId: batch.containerId,
            locationId: batch.locationId,
            labeledForSale: asBoolean(answers.opsTransplantLabeledForSale),
            transplantDate,
            notes:
              asOptionalString(answers.opsTransplantNotes) ??
              `Quantity in container: ${transplantQuantityPerContainer}`,
          },
        });

        createdUnits.push(createdUnit);
      }

      await tx.plantBatch.update({
        where: { id: batch.id },
        data: {
          transplantDate,
          quantityTransplanted: {
            increment: transplantQuantity,
          },
        },
      });

      if (sourceUnit) {
        await tx.plantUnit.update({
          where: { id: sourceUnit.id },
          data: {
            status: PlantUnitStatus.TRANSPLANTED,
            transplantDate,
          },
        });
      }

      await tx.plantActivity.create({
        data: {
          batchId: batch.id,
          unitId: sourceUnit?.id ?? null,
          activityType: PlantActivityType.TRANSPLANTED,
          activityAt: transplantDate,
          transplantQuantity,
          quantityAffected: transplantQuantity,
          labeledSetTo: asBoolean(answers.opsTransplantLabeledForSale),
                    notes:
            asOptionalString(answers.opsTransplantNotes) ??
            `Transplant recorded from nursery operations flow. Quantity in container: ${transplantQuantityPerContainer}.`,
        },
      });

      return createdUnits;
    });

    return NextResponse.json({
      ok: true,
      message: "Nursery transplant recorded.",
      batchCode: batch.code,
      sourceUnitCode: sourceUnit?.code ?? null,
      createdTransplantCount: createdTransplantUnits.length,
      transplantQuantityPerContainer,
      createdTransplantCodes: createdTransplantUnits.map((unit) => unit.code),
    });
  } catch (error) {
    console.error("Nursery record-transplant route error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to record nursery transplant." },
      { status: 500 }
    );
  }
}