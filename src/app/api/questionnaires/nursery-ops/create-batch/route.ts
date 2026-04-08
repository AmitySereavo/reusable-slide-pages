import { NextResponse } from "next/server";
import {
  BatchBuyerType,
  BatchIntendedUse,
  ContainerCondition,
  ContainerType,
  GrowingMediumType,
  MediumQuality,
  PlantSourceType,
  PlantStartMethod,
  Prisma,
  SunExposure,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateNurseryBatchPayload = {
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

function asOptionalDecimal(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Prisma.Decimal(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return new Prisma.Decimal(parsed);
    }
  }

  return null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function makeShortCode(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

function getBatchPrefix(bucketIndex: number) {
  const first = String.fromCharCode(65 + (bucketIndex % 26));
  const second = String.fromCharCode(65 + Math.floor(bucketIndex / 26));
  return `${first}${second}`;
}

function getDateCodeParts(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

async function generateBatchCode() {
  const now = new Date();
  const dateCode = getDateCodeParts(now);

  let existingBatchCount = await prisma.plantBatch.count();
  let attempts = 0;

  while (attempts < 1000) {
    const bucketIndex = Math.floor(existingBatchCount / 100);
    const prefix = getBatchPrefix(bucketIndex);
    const candidate = `${prefix}${dateCode}`;

    const existing = await prisma.plantBatch.findUnique({
      where: { code: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    existingBatchCount += 100;
    attempts += 1;
  }

  throw new Error("Unable to generate a unique batch code.");
}

function mapStartMethod(value: string): PlantStartMethod {
  switch (value) {
    case "seed":
      return PlantStartMethod.SEED;
    case "cutting":
      return PlantStartMethod.CUTTING;
    case "air-layering":
      return PlantStartMethod.AIR_LAYERING;
    case "water-propagation":
      return PlantStartMethod.WATER_PROPAGATION;
    case "vendor":
      return PlantStartMethod.VENDOR;
    case "gift":
      return PlantStartMethod.GIFT;
    case "foraged":
      return PlantStartMethod.FORAGED;
    case "transplant":
      return PlantStartMethod.TRANSPLANT;
    default:
      return PlantStartMethod.OTHER;
  }
}

function mapSourceType(value: string): PlantSourceType {
  switch (value) {
    case "vendor":
      return PlantSourceType.VENDOR;
    case "gift":
      return PlantSourceType.GIFT;
    case "foraged":
      return PlantSourceType.FORAGED;
    default:
      return PlantSourceType.SELF_STARTED;
  }
}

function mapIntendedUse(value: string): BatchIntendedUse {
  switch (value) {
    case "retail":
      return BatchIntendedUse.RETAIL;
    case "wholesale":
      return BatchIntendedUse.WHOLESALE;
    case "popup-shop":
      return BatchIntendedUse.POPUP_SHOP;
    case "special-event":
      return BatchIntendedUse.SPECIAL_EVENT;
    case "greenhouse-stock":
      return BatchIntendedUse.GREENHOUSE_STOCK;
    case "farm-use":
      return BatchIntendedUse.FARM_USE;
    case "promotional-gift":
      return BatchIntendedUse.PROMOTIONAL_GIFT;
    case "lead-magnet":
      return BatchIntendedUse.LEAD_MAGNET;
    default:
      return BatchIntendedUse.OTHER;
  }
}

function mapBuyerType(value: string | null) {
  switch (value) {
    case "hi-pro":
      return BatchBuyerType.HI_PRO;
    case "evergrow":
      return BatchBuyerType.EVERGROW;
    case "hope-gardens":
      return BatchBuyerType.HOPE_GARDENS;
    case "general-wholesale":
      return BatchBuyerType.GENERAL_WHOLESALE;
    case "retail-walk-in":
      return BatchBuyerType.RETAIL_WALK_IN;
    case "popup-customer":
      return BatchBuyerType.POPUP_CUSTOMER;
    case "custom":
      return BatchBuyerType.CUSTOM;
    default:
      return null;
  }
}

function mapContainerType(value: string | null) {
  switch (value) {
    case "pot-2-5":
    case "pot-4":
    case "pot-6":
    case "pot-8":
      return ContainerType.POT;
    case "tray-8x16":
      return ContainerType.TRAY;
    case "cup":
      return ContainerType.CUP;
    case "grow-bag":
      return ContainerType.BAG;
    case "bucket":
      return ContainerType.BUCKET;
    default:
      return value ? ContainerType.OTHER : null;
  }
}

function mapContainerCondition(value: string | null) {
  switch (value) {
    case "brand-new":
      return ContainerCondition.BRAND_NEW;
    case "good":
      return ContainerCondition.GOOD;
    case "used":
      return ContainerCondition.GOOD;
    case "worn":
      return ContainerCondition.WORN;
    case "damaged":
      return ContainerCondition.DAMAGED;
    default:
      return null;
  }
}

function mapMediumQuality(value: string | null) {
  switch (value) {
    case "professional":
      return MediumQuality.PROFESSIONAL;
    case "good":
      return MediumQuality.GOOD;
    case "fair":
      return MediumQuality.FAIR;
    case "poor":
      return MediumQuality.POOR;
    default:
      return null;
  }
}

function inferMediumType(value: string | null) {
  if (!value) return null;

  const normalized = value.toLowerCase();

  if (normalized.includes("soil")) return GrowingMediumType.SOIL;
  if (normalized.includes("starter")) return GrowingMediumType.SEED_STARTER;
  if (normalized.includes("coir")) return GrowingMediumType.COCONUT_COIR;
  if (normalized.includes("tissue")) return GrowingMediumType.TISSUE;
  if (normalized.includes("sponge")) return GrowingMediumType.SPONGE;
  if (normalized.includes("hay")) return GrowingMediumType.HAY;
  if (normalized.includes("water")) return GrowingMediumType.WATER;
  if (normalized.includes("rock")) return GrowingMediumType.ROCK;
  if (normalized.includes("sand")) return GrowingMediumType.SAND;
  if (
    normalized.includes("mix") ||
    normalized.includes("mixed") ||
    normalized.includes("blend")
  ) {
    return GrowingMediumType.MIXED;
  }

  return GrowingMediumType.OTHER;
}

function mapSunExposure(value: string | null) {
  switch (value) {
    case "full-sun":
      return SunExposure.FULL_SUN;
    case "partial-sun":
      return SunExposure.PARTIAL_SUN;
    case "shade":
      return SunExposure.SHADE;
    case "bright-indirect":
      return SunExposure.BRIGHT_INDIRECT;
    case "mixed-light":
      return SunExposure.MIXED;
    default:
      return null;
  }
}

function inferPlantCategory(value: string | null) {
  switch (value) {
    case "herb":
      return "HERB";
    case "vegetable":
      return "VEGETABLE";
    case "fruit":
      return "FRUIT";
    case "tree":
      return "TREE";
    case "ornamental":
      return "ORNAMENTAL";
    case "flowering":
      return "FLOWERING";
    case "medicinal":
      return "MEDICINAL";
    case "shade":
      return "SHADE";
    default:
      return "OTHER";
  }
}

function convertToCm(
  rawValue: unknown,
  rawUnit: unknown
): Prisma.Decimal | null {
  const value = asOptionalDecimal(rawValue);
  if (!value) return null;

  const unit = asString(rawUnit).toLowerCase();
  if (unit === "inches") {
    return value.mul(new Prisma.Decimal("2.54"));
  }

  return value;
}

function buildContainerSnapshot(answers: Record<string, unknown>) {
  return JSON.stringify({
    type: answers.opsContainerType ?? null,
    otherDescription: answers.opsContainerOtherDescription ?? null,
    quantity: answers.opsContainerQuantity ?? null,
    length: answers.opsContainerLength ?? null,
    lengthUnit: answers.opsContainerLengthUnit ?? null,
    width: answers.opsContainerWidth ?? null,
    widthUnit: answers.opsContainerWidthUnit ?? null,
    depth: answers.opsContainerDepth ?? null,
    depthUnit: answers.opsContainerDepthUnit ?? null,
    condition: answers.opsContainerCondition ?? null,
    description: answers.opsContainerDescription ?? null,
  });
}

function buildLocationSnapshot(answers: Record<string, unknown>) {
  return JSON.stringify({
    code: answers.opsLocationCode ?? null,
    sun: answers.opsLocationSun ?? null,
    temperature: answers.opsLocationTemperature ?? null,
    description: answers.opsLocationDescription ?? null,
  });
}

function buildMediumSnapshot(answers: Record<string, unknown>) {
  return JSON.stringify({
    name: answers.opsMediumName ?? null,
    quality: answers.opsMediumQuality ?? null,
    description: answers.opsMediumDescription ?? null,
    source: answers.opsMediumSource ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateNurseryBatchPayload;
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};

    const plantName =
      asString(answers.opsBatchPlantNameOther) ||
      asString(answers.opsBatchPlantName);
    const plantTypeValue =
      asString(answers.opsBatchPlantTypeOther) ||
      asString(answers.opsBatchPlantType);
    const startDateRaw = asString(answers.opsBatchStartDate);
    const startMethodRaw = asString(answers.opsBatchStartMethod);
    const intendedUseRaw = asString(answers.opsBatchIntendedUse);

    if (!plantName) {
      return NextResponse.json(
        { ok: false, error: "Plant name is required." },
        { status: 400 }
      );
    }

    if (!startDateRaw) {
      return NextResponse.json(
        { ok: false, error: "Start date is required." },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateRaw);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid start date." },
        { status: 400 }
      );
    }

    if (!startMethodRaw) {
      return NextResponse.json(
        { ok: false, error: "Start method is required." },
        { status: 400 }
      );
    }

    if (!intendedUseRaw) {
      return NextResponse.json(
        { ok: false, error: "Goal for this batch is required." },
        { status: 400 }
      );
    }

    const quantityStarted = asPositiveInt(answers.opsBatchQuantityStarted);
    if (quantityStarted <= 0) {
      return NextResponse.json(
        { ok: false, error: "Quantity started must be greater than zero." },
        { status: 400 }
      );
    }

    const generatedBatchCode = await generateBatchCode();

    const plantSlug = slugify(plantName);
    const plantTypeSlug = plantSlug || makeShortCode("PLANT");

    const existingPlantType = await prisma.plantType.findUnique({
      where: { slug: plantTypeSlug },
    });

    const plantType =
      existingPlantType ??
      (await prisma.plantType.create({
        data: {
          slug: plantTypeSlug,
          name: plantName,
          displayName: plantName,
          category: inferPlantCategory(
            plantTypeValue.toLowerCase()
          ) as Prisma.EnumNurseryPlantCategoryFieldUpdateOperationsInput["set"],
          active: true,
        },
      }));

    let containerId: string | null = null;
    const containerTypeRaw = asOptionalString(answers.opsContainerType);
    const containerDescription = asOptionalString(
      answers.opsContainerDescription
    );
    const containerOtherDescription = asOptionalString(
      answers.opsContainerOtherDescription
    );
    const containerConditionRaw = asOptionalString(
      answers.opsContainerCondition
    );

    if (
      containerTypeRaw ||
      containerDescription ||
      containerOtherDescription ||
      answers.opsContainerLength !== undefined ||
      answers.opsContainerWidth !== undefined ||
      answers.opsContainerDepth !== undefined
    ) {
      const container = await prisma.container.create({
        data: {
          code: makeShortCode("CTR"),
          type: mapContainerType(containerTypeRaw) ?? ContainerType.OTHER,
          description:
            [containerTypeRaw, containerOtherDescription, containerDescription]
              .filter(Boolean)
              .join(" | ") || null,
          lengthCm: convertToCm(
            answers.opsContainerLength,
            answers.opsContainerLengthUnit
          ),
          widthCm: convertToCm(
            answers.opsContainerWidth,
            answers.opsContainerWidthUnit
          ),
          depthCm: convertToCm(
            answers.opsContainerDepth,
            answers.opsContainerDepthUnit
          ),
          condition: mapContainerCondition(containerConditionRaw),
          reusable: true,
          active: true,
        },
      });

      containerId = container.id;
    }

    let mediumId: string | null = null;
    const mediumName = asOptionalString(answers.opsMediumName);
    const mediumDescription = asOptionalString(answers.opsMediumDescription);
    const mediumSource = asOptionalString(answers.opsMediumSource);

    if (mediumName || mediumDescription || mediumSource) {
      const medium = await prisma.growingMedium.create({
        data: {
          code: makeShortCode("MED"),
          name: mediumName ?? "Unspecified Medium",
          type: inferMediumType(mediumName) ?? GrowingMediumType.OTHER,
          quality: mapMediumQuality(asOptionalString(answers.opsMediumQuality)),
          description: mediumDescription,
          sourceNotes: mediumSource,
          active: true,
        },
      });

      mediumId = medium.id;
    }

    let locationId: string | null = null;
    const locationCode = asOptionalString(answers.opsLocationCode);
    const locationDescription = asOptionalString(
      answers.opsLocationDescription
    );
    const locationTemperature = asOptionalString(
      answers.opsLocationTemperature
    );

    if (locationCode || locationDescription || answers.opsLocationSun) {
      const location = await prisma.location.create({
        data: {
          code: locationCode ?? makeShortCode("LOC"),
          name: locationCode ?? locationDescription ?? "Nursery Location",
          description: [locationDescription, locationTemperature]
            .filter(Boolean)
            .join(" | ") || null,
          exposure: mapSunExposure(asOptionalString(answers.opsLocationSun)),
          active: true,
        },
      });

      locationId = location.id;
    }

    const batch = await prisma.plantBatch.create({
      data: {
        code: generatedBatchCode,
        plantTypeId: plantType.id,
        startMethod: mapStartMethod(startMethodRaw),
        startDate,
        quantityStarted,
        quantityAlive: quantityStarted,
        quantityLost: 0,
        quantityTransplanted: 0,
        quantitySold: 0,
        quantityGifted: 0,
        intendedUse: mapIntendedUse(intendedUseRaw),
        targetBuyerType: mapBuyerType(asOptionalString(answers.opsBatchBuyerTarget)),
        targetBuyerName:
          asOptionalString(answers.opsBatchBuyerTarget) === "custom"
            ? asOptionalString(answers.opsBatchBuyerTargetOther)
            : null,
        sourceType: mapSourceType(startMethodRaw),
        sourceName: asOptionalString(answers.opsBatchSourceName),
        sourceNotes: asOptionalString(answers.opsBatchSourceNotes),
        containerId,
        mediumId,
        locationId,
        labeledForSale: asBoolean(answers.opsBatchLabeledForSale),
        startMediumSnapshot: buildMediumSnapshot(answers),
        containerSnapshot: buildContainerSnapshot(answers),
        locationSnapshot: buildLocationSnapshot(answers),
        startNotes: asOptionalString(answers.opsBatchStartNotes),
        commercialNotes: asOptionalString(answers.opsBatchCommercialNotes),
        active: true,
        archived: false,
      },
      include: {
        plantType: true,
        container: true,
        medium: true,
        location: true,
      },
    });

    await prisma.plantActivity.create({
      data: {
        batchId: batch.id,
        activityType: "STARTED",
        activityAt: startDate,
        quantityAffected: quantityStarted,
        notes:
          asOptionalString(answers.opsBatchQuantityNotes) ??
          "Batch created from nursery operations flow.",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Nursery batch created.",
      generatedBatchCode,
      batch: {
        id: batch.id,
        code: batch.code,
        plantName: batch.plantType.displayName ?? batch.plantType.name,
        startDate: batch.startDate.toISOString(),
        quantityStarted: batch.quantityStarted,
        quantityAlive: batch.quantityAlive,
        intendedUse: batch.intendedUse,
        labeledForSale: batch.labeledForSale,
      },
    });
  } catch (error) {
    console.error("Nursery create-batch route error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create nursery batch." },
      { status: 500 }
    );
  }
}