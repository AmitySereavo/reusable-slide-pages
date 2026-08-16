import { Prisma } from "@prisma/client";
import {
  ensurePlantRecipeTables,
  getCanonicalPlantKey,
  getCanonicalPlantName,
  makePlantKey,
  normalizePropagationMethod,
} from "@/lib/nursery/plantRecipes";
import { plantRecipeDrafts } from "@/lib/nursery/plantRecipeDraftData";
import {
  ensureSeedlingBatchTables,
  listSeedlingBatches,
  syncCurrentSeedlingShopBatches,
} from "@/lib/seedlings/seedlingBatches";

type DbClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  $queryRaw: <T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ) => Promise<T>;
};

type TimelineAction = {
  dayNumber: number;
  actionType: string;
  treatment?: string | null;
  instruction: string;
  quantity?: string | null;
  strength?: string | null;
  applicationMethod?: string | null;
  notes?: string | null;
  stageCheckRequired?: boolean;
  sortOrder?: number;
};

const PLANNING_WINDOW_DAYS = 120;

export async function buildBatchProductionPlanning(db: DbClient) {
  await syncCurrentSeedlingShopBatches(db as any);
  await ensureSeedlingBatchTables(db as any);
  await ensurePlantRecipeTables(db as any);

  const batches = await listSeedlingBatches(db as any);
  const blocks = [];
  const completedTimelineTasks = [];

  for (const batch of batches) {
    if (batch.status === "cancelled" || batch.status === "sold_out") {
      continue;
    }

    const completedTaskKeys = getCompletedTimelineTaskKeys(batch);
    completedTimelineTasks.push(...getCompletedTimelineTasks(batch));

    const actions = await getCentralTimelineActions(db, {
      plantName: batch.cropName,
      propagationType: batch.propagationType,
    });

    for (const action of actions) {
      const actionDate = addDays(
        new Date(batch.productionAt),
        Math.max(0, Number(action.dayNumber || 1) - 1)
      );

      if (!isWithinPlanningWindow(actionDate)) continue;

      const taskKind = getTaskKind(action.actionType);
      const blockKey = `batch:${batch.id}:day-${action.dayNumber}:${action.sortOrder || 0}:${makePlantKey(action.actionType)}`;
      if (completedTaskKeys.has(blockKey)) continue;

      const block: any = {
        key: blockKey,
        source: batch.productionPurpose?.label || "Nursery Batch",
        sourceType: "batch",
        orderCode: batch.batchName,
        customerName: batch.productionPurpose?.label || "Batch Plan",
        productTitle: batch.cropName,
        batchId: batch.id,
        batchName: batch.batchName,
        batchPurpose: batch.productionPurpose || null,
        batchStatus: batch.status,
        actionDate: actionDate.toISOString(),
        actionDay: action.dayNumber,
        actionType: action.actionType,
        treatment: action.treatment || "",
        instruction: action.instruction,
        quantityInstruction: action.quantity || "",
        strength: action.strength || "",
        applicationMethod: action.applicationMethod || "",
        stageCheckRequired: Boolean(action.stageCheckRequired),
        note: action.notes || "",
        prepFormat: batch.propagationType,
        parcelQuantity: Number(batch.quantityAvailable || batch.quantityStarted || 0),
        seedCount:
          batch.propagationType === "seedling"
            ? Number(batch.quantityStarted || 0)
            : 0,
        productionQuantity: Number(batch.quantityStarted || 0),
        productionUnitLabel:
          batch.propagationType === "cutting" ? "cuttings" : "starts",
        propagationMethod: mapBatchPropagationMethod(batch.propagationType),
        productionSource: batch.productionPurpose?.label || "Batch Plan",
        stage: getBatchStage(action.actionType, action.dayNumber),
        deliveryDate: null,
        deliveryLabel: batch.availabilityAt
          ? `Available ${formatDate(batch.availabilityAt)}`
          : "",
        lineTotal: 0,
        currencyCode: "JMD",
        isBatchPlan: true,
      };

      if (taskKind === "sowing") block.sowingDate = block.actionDate;
      if (taskKind === "propagation") block.propagationDate = block.actionDate;
      if (taskKind === "transplant") block.transplantDate = block.actionDate;

      blocks.push(block);
    }
  }

  return {
    batches,
    blocks,
    completedTimelineTasks,
  };
}

function getCompletedTimelineTaskKeys(batch: any) {
  const keys = new Set<string>();
  const activities: any[] = Array.isArray(batch?.activities)
    ? batch.activities
    : [];

  activities.forEach((activity) => {
    const metadata = activity?.metadata || {};
    if (
      metadata.source !== "plant-production-timeline" ||
      metadata.completionStatus !== "done"
    ) {
      return;
    }

    const taskKey = String(metadata.timelineTaskKey || "").trim();
    if (taskKey) keys.add(taskKey);
  });

  return keys;
}

function getCompletedTimelineTasks(batch: any) {
  const activities: any[] = Array.isArray(batch?.activities)
    ? batch.activities
    : [];

  return activities
    .filter((activity) => {
      const metadata = activity?.metadata || {};
      return (
        metadata.source === "plant-production-timeline" &&
        metadata.completionStatus === "done" &&
        metadata.timelineTaskKey
      );
    })
    .map((activity) => {
      const metadata = activity.metadata || {};
      return {
        key: String(metadata.timelineTaskKey || activity.id),
        activityId: activity.id,
        batchId: batch.id,
        batchName: batch.batchName,
        source: batch.productionPurpose?.label || "Nursery Batch",
        customerName: batch.productionPurpose?.label || "Batch Plan",
        productTitle: batch.cropName,
        actionDay: Number(metadata.timelineActionDay || 0),
        actionType: String(metadata.timelineActionType || activity.title || "Task"),
        treatment: String(metadata.timelineTreatment || ""),
        instruction: String(metadata.timelineInstruction || ""),
        performedAt: activity.performedAt || null,
        enteredAt: activity.enteredAt || null,
        notes: activity.notes || "",
      };
    });
}

async function getCentralTimelineActions(
  db: DbClient,
  input: { plantName: string; propagationType: string }
): Promise<TimelineAction[]> {
  const plantName = getCanonicalPlantName(input.plantName);
  const plantKey = getCanonicalPlantKey(plantName);
  const propagationMethod = mapBatchPropagationMethod(input.propagationType);

  const rows = await db.$queryRaw<any[]>`
    SELECT action.*
    FROM "PlantProductionRecipe" recipe
    JOIN "PlantProductionRecipeAction" action ON action."recipeId" = recipe."id"
    WHERE recipe."plantKey" = ${plantKey}
      AND recipe."propagationMethod" = ${propagationMethod}
    ORDER BY action."dayNumber" ASC, action."sortOrder" ASC, action."createdAt" ASC
  `.catch(() => []);

  if (rows.length) {
    return rows.map((row) => ({
      dayNumber: Number(row.dayNumber || 1),
      actionType: String(row.actionType || "Other"),
      treatment: row.treatment,
      instruction: String(row.instruction || ""),
      quantity: row.quantity,
      strength: row.strength,
      applicationMethod: row.applicationMethod,
      notes: row.notes,
      stageCheckRequired: Boolean(row.stageCheckRequired),
      sortOrder: Number(row.sortOrder || 0),
    }));
  }

  return getDraftTimelineActions(plantName, propagationMethod);
}

function getDraftTimelineActions(plantName: string, propagationMethod: string) {
  const plantKey = getCanonicalPlantKey(plantName);
  const draft = plantRecipeDrafts.find(
    (item) =>
      getCanonicalPlantKey(item.plantName) === plantKey &&
      normalizePropagationMethod((item as any).propagationMethod) === propagationMethod
  );

  if (!draft) return [];

  const actions: TimelineAction[] = [];
  draft.actions.forEach((action: any, actionIndex: number) => {
    const days = Array.isArray(action.days) ? action.days : [1];
    days.forEach((dayNumber: unknown, dayIndex: number) => {
      actions.push({
        dayNumber: Number(dayNumber || 1),
        actionType: String(action.actionType || "Other"),
        treatment: action.treatment || null,
        instruction: String(action.instruction || ""),
        quantity: action.quantity || null,
        strength: action.strength || null,
        applicationMethod: action.applicationMethod || null,
        notes: action.notes || null,
        stageCheckRequired: Boolean(action.stageCheckRequired),
        sortOrder: actionIndex * 10 + dayIndex,
      });
    });
  });

  return actions;
}

function mapBatchPropagationMethod(value: string) {
  if (value === "cutting") return "cutting";
  if (value === "air_layer") return "air-layer";
  if (value === "division") return "division";
  if (value === "sucker") return "sucker";
  if (value === "grafting") return "grafting";
  if (value === "existing_stock") return "other";
  return "seed";
}

function getTaskKind(actionType: string) {
  const normalized = actionType.toLowerCase();
  if (normalized === "sow") return "sowing";
  if (normalized.includes("cutting") || normalized.includes("air")) {
    return "propagation";
  }
  if (normalized.includes("transplant") || normalized.includes("pot-up")) {
    return "transplant";
  }
  return "action";
}

function getBatchStage(actionType: string, dayNumber: number) {
  const taskKind = getTaskKind(actionType);
  if (taskKind === "sowing") return "Propagation started";
  if (taskKind === "propagation") return "Propagation action";
  if (taskKind === "transplant") return "Transplant / pot-up check";
  if (dayNumber <= 14) return "Early propagation care";
  if (dayNumber <= 45) return "Seedling establishment";
  return "Growth and readiness care";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isWithinPlanningWindow(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = addDays(today, PLANNING_WINDOW_DAYS);
  end.setHours(23, 59, 59, 999);
  return date >= today && date <= end;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeZone: "America/Jamaica",
  }).format(new Date(value));
}
