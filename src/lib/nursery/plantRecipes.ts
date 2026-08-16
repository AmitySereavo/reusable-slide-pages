import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { plantRecipeDrafts } from "@/lib/nursery/plantRecipeDraftData";

type Database = PrismaClient | any;

export const PLANT_RECIPE_ACTION_TYPES = [
  "Water",
  "Mist",
  "Sow",
  "Set cutting",
  "Feed",
  "Pest control",
  "Disease control",
  "Prune",
  "Pinch",
  "Pot-up",
  "Transplant",
  "Hardening",
  "Move to sun",
  "Move to shade",
  "Install support",
  "Pest inspection",
  "Disease inspection",
  "Harvest ready check",
  "Propagation-material check",
  "Other",
] as const;

export const PROPAGATION_METHODS = [
  "seed",
  "cutting",
  "air-layer",
  "division",
  "sucker",
  "grafting",
  "other",
] as const;

export function makePlantKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCanonicalPlantName(value: unknown) {
  const cleaned = cleanVariantName(value);
  const key = makePlantKey(cleaned);

  if (
    key.includes("black-pepper") ||
    key === "pepper-black-pepper" ||
    key === "black-pepper-forage-pot"
  ) {
    return "Black Pepper";
  }

  if (key.includes("bok-choy")) return "Bok Choy";
  if (key.includes("callaloo")) return "Callaloo";
  if (key.includes("cabbage") || key.includes("caribbean-queen-cabbage")) {
    return "Cabbage";
  }
  if (key.includes("carrot")) return "Carrots";
  if (key.includes("scotch-bonnet")) return "Pepper - Scotch Bonnet";
  if (key.includes("sweet-pepper")) return "Pepper - Sweet";
  if (key.includes("caribbean-red-pepper")) return "Pepper - Caribbean Red";
  if (key.includes("chili-pepper")) return "Pepper - Chili";
  if (key.includes("bird-pepper")) return "Pepper - Bird";
  if (key.includes("cherry-tomato")) return "Tomato - Cherry";
  if (key.includes("slicing-tomato")) {
    return "Tomato - Slicing (Salad or Sandwich Tomato)";
  }
  if (key.includes("plummy-tomato") || key.includes("plum-tomato")) {
    return "Tomato - Plummy (Cooking Tomato)";
  }
  if (key.includes("italian-basil")) return "Basil - Italian Sweet";
  if (key.includes("genovese-basil")) return "Basil - Genovese";
  if (key.includes("thai-basil")) return "Basil - Thai";
  if (key.includes("flat-leaf-parsley") || key.includes("parsley")) {
    return "Parsley";
  }
  if (key.includes("bolo-mint") || key.includes("panadol-plant") || key.includes("balla-mint")) {
    return "Bolo Mint (Panadol Plant)";
  }
  if (
    key.includes("costa-rican-peppermint") ||
    key.includes("jamaican-peppermint") ||
    key.includes("tree-mint")
  ) {
    return "Jamaican Peppermint, Tree Mint";
  }

  return cleaned;
}

export function getCanonicalPlantKey(value: unknown) {
  return makePlantKey(getCanonicalPlantName(value));
}

export async function ensurePlantRecipeTables(db: Database) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlantProductionRecipe" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "plantKey" TEXT NOT NULL,
      "plantName" TEXT NOT NULL,
      "propagationMethod" TEXT NOT NULL DEFAULT 'seed',
      "cycleLengthDays" INTEGER NOT NULL DEFAULT 90,
      "maintenanceLoopStartDay" INTEGER NOT NULL DEFAULT 91,
      "maintenanceLoopLengthDays" INTEGER NOT NULL DEFAULT 7,
      "profileMetadata" JSONB,
      "sourceLabel" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlantProductionRecipe_plant_method_unique"
        UNIQUE ("plantKey", "propagationMethod")
    )
  `;

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlantProductionRecipeAction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "recipeId" TEXT NOT NULL REFERENCES "PlantProductionRecipe" ("id") ON DELETE CASCADE,
      "dayNumber" INTEGER NOT NULL,
      "actionType" TEXT NOT NULL,
      "treatment" TEXT,
      "instruction" TEXT NOT NULL,
      "quantity" TEXT,
      "strength" TEXT,
      "applicationMethod" TEXT,
      "stageCheckRequired" BOOLEAN NOT NULL DEFAULT false,
      "shopAction" TEXT,
      "notes" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "PlantProductionRecipeAction_recipe_day_idx"
      ON "PlantProductionRecipeAction" ("recipeId", "dayNumber", "sortOrder")
  `;

  await db.$executeRaw`
    ALTER TABLE "PlantProductionRecipe"
      ADD COLUMN IF NOT EXISTS "profileMetadata" JSONB
  `;

  await db.$executeRaw`
    ALTER TABLE "PlantProductionRecipe"
      ADD COLUMN IF NOT EXISTS "sourceLabel" TEXT
  `;

  await db.$executeRaw`
    ALTER TABLE "PlantProductionRecipeAction"
      ADD COLUMN IF NOT EXISTS "treatment" TEXT
  `;
}

export async function getPlantRecipeCatalog(db: Database) {
  await ensurePlantRecipeTables(db);

  const byKey = new Map<string, { key: string; name: string; sku?: string | null }>();

  for (const draft of plantRecipeDrafts) {
    const name = getCanonicalPlantName(draft.plantName);
    const key = getCanonicalPlantKey(draft.plantName);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, { key, name, sku: null });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export async function getOrCreatePlantRecipe(
  db: Database,
  input: { plantKey: string; plantName: string; propagationMethod?: string }
) {
  await ensurePlantRecipeTables(db);

  const plantName = getCanonicalPlantName(input.plantName || input.plantKey || "Plant");
  const plantKey = getCanonicalPlantKey(input.plantKey || plantName);
  const aliasKeys = getPlantKeyAliases(input.plantKey || input.plantName || plantName);
  const propagationMethod = normalizePropagationMethod(input.propagationMethod);

  const existing = await db.$queryRaw<any[]>`
    SELECT *
    FROM "PlantProductionRecipe"
    WHERE "plantKey" IN (${Prisma.join(aliasKeys)})
      AND "propagationMethod" = ${propagationMethod}
    ORDER BY
      CASE WHEN "plantKey" = ${plantKey} THEN 0 ELSE 1 END,
      "updatedAt" DESC
    LIMIT 1
  `;

  if (!existing.length) {
    await db.$executeRaw`
      INSERT INTO "PlantProductionRecipe" (
        "id",
        "plantKey",
        "plantName",
        "propagationMethod",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${plantKey},
        ${plantName},
        ${propagationMethod},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("plantKey", "propagationMethod") DO NOTHING
    `;
  }

  const [recipe] = await db.$queryRaw<any[]>`
    SELECT *
    FROM "PlantProductionRecipe"
    WHERE "plantKey" IN (${Prisma.join(aliasKeys)})
      AND "propagationMethod" = ${propagationMethod}
    ORDER BY
      CASE WHEN "plantKey" = ${plantKey} THEN 0 ELSE 1 END,
      "updatedAt" DESC
    LIMIT 1
  `;

  const actions = await db.$queryRaw<any[]>`
    SELECT *
    FROM "PlantProductionRecipeAction"
    WHERE "recipeId" = ${recipe.id}
    ORDER BY "dayNumber" ASC, "sortOrder" ASC, "createdAt" ASC
  `;

  return {
    ...recipe,
    actions,
  };
}

export async function updatePlantRecipeSettings(
  db: Database,
  input: {
    recipeId: string;
    cycleLengthDays: number;
    maintenanceLoopStartDay: number;
    maintenanceLoopLengthDays: number;
  }
) {
  await ensurePlantRecipeTables(db);

  await db.$executeRaw`
    UPDATE "PlantProductionRecipe"
    SET
      "cycleLengthDays" = ${clampInt(input.cycleLengthDays, 1, 365, 90)},
      "maintenanceLoopStartDay" = ${clampInt(input.maintenanceLoopStartDay, 1, 730, 91)},
      "maintenanceLoopLengthDays" = ${clampInt(input.maintenanceLoopLengthDays, 1, 90, 7)},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.recipeId}
  `;
}

export async function upsertPlantRecipeAction(db: Database, input: any) {
  await ensurePlantRecipeTables(db);

  const id = input.id || randomUUID();
  const instruction = String(input.instruction || "").trim();

  await db.$executeRaw`
    INSERT INTO "PlantProductionRecipeAction" (
      "id",
      "recipeId",
      "dayNumber",
      "actionType",
      "treatment",
      "instruction",
      "quantity",
      "strength",
      "applicationMethod",
      "stageCheckRequired",
      "shopAction",
      "notes",
      "sortOrder",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.recipeId},
      ${clampInt(input.dayNumber, 1, 730, 1)},
      ${String(input.actionType || "Other").trim()},
      ${cleanText(input.treatment)},
      ${instruction},
      ${cleanText(input.quantity)},
      ${cleanText(input.strength)},
      ${cleanText(input.applicationMethod)},
      ${Boolean(input.stageCheckRequired)},
      ${null},
      ${cleanText(input.notes)},
      ${clampInt(input.sortOrder, 0, 9999, 0)},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "dayNumber" = EXCLUDED."dayNumber",
      "actionType" = EXCLUDED."actionType",
      "treatment" = EXCLUDED."treatment",
      "instruction" = EXCLUDED."instruction",
      "quantity" = EXCLUDED."quantity",
      "strength" = EXCLUDED."strength",
      "applicationMethod" = EXCLUDED."applicationMethod",
      "stageCheckRequired" = EXCLUDED."stageCheckRequired",
      "shopAction" = EXCLUDED."shopAction",
      "notes" = EXCLUDED."notes",
      "sortOrder" = EXCLUDED."sortOrder",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function deletePlantRecipeAction(db: Database, actionId: string) {
  await ensurePlantRecipeTables(db);

  await db.$executeRaw`
    DELETE FROM "PlantProductionRecipeAction"
    WHERE "id" = ${actionId}
  `;
}

export async function importDraftPlantRecipes(
  db: Database,
  options: { replaceExisting?: boolean } = {}
) {
  await ensurePlantRecipeTables(db);

  let importedRecipes = 0;
  let skippedRecipes = 0;
  let importedActions = 0;

  for (const draft of plantRecipeDrafts) {
    const propagationMethod = normalizePropagationMethod(
      draft.preferredPropagationMethod
    );
    const plantKey = getCanonicalPlantKey(draft.plantName);
    const plantName = getCanonicalPlantName(draft.plantName);
    const recipe = await getOrCreatePlantRecipe(db, {
      plantKey,
      plantName,
      propagationMethod,
    });

    const existingActionRows = await db.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*) AS count
      FROM "PlantProductionRecipeAction"
      WHERE "recipeId" = ${recipe.id}
    `;
    const existingActionCount = Number(existingActionRows[0]?.count || 0);

    if (existingActionCount > 0 && !options.replaceExisting) {
      skippedRecipes += 1;
      continue;
    }

    if (options.replaceExisting) {
      await db.$executeRaw`
        DELETE FROM "PlantProductionRecipeAction"
        WHERE "recipeId" = ${recipe.id}
      `;
    }

    await db.$executeRaw`
      UPDATE "PlantProductionRecipe"
      SET
        "plantName" = ${plantName},
        "cycleLengthDays" = 90,
        "maintenanceLoopStartDay" = 91,
        "maintenanceLoopLengthDays" = 7,
        "profileMetadata" = CAST(${JSON.stringify(makeDraftProfileMetadata(draft))} AS jsonb),
        "sourceLabel" = 'ParaLife production timeline draft v0.2 feed detail',
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${recipe.id}
    `;

    const actionRows = [];
    let sortOrder = 0;

    for (const action of draft.actions) {
      for (const dayNumber of action.days) {
        const normalizedAction = normalizeImportedActionType(
          action.actionType,
          action.instruction,
          (action as any).treatment
        );
        actionRows.push(
          Prisma.sql`(
            ${randomUUID()},
            ${recipe.id},
            ${dayNumber},
            ${normalizedAction.actionType},
            ${normalizedAction.treatment},
            ${action.instruction},
            ${(action as any).quantity || null},
            ${(action as any).strength || extractStrength(action.instruction) || null},
            ${(action as any).applicationMethod || extractApplicationMethod(action.instruction) || null},
            ${Boolean(action.stageCheckRequired)},
            ${null},
            ${(action as any).notes || null},
            ${sortOrder},
            CURRENT_TIMESTAMP
          )`
        );
        importedActions += 1;
        sortOrder += 1;
      }
    }

    if (actionRows.length) {
      await db.$executeRaw(
        Prisma.sql`
          INSERT INTO "PlantProductionRecipeAction" (
            "id",
            "recipeId",
            "dayNumber",
            "actionType",
            "treatment",
            "instruction",
            "quantity",
            "strength",
            "applicationMethod",
            "stageCheckRequired",
            "shopAction",
            "notes",
            "sortOrder",
            "updatedAt"
          )
          VALUES ${Prisma.join(actionRows)}
        `
      );
    }

    importedRecipes += 1;
  }

  return {
    importedRecipes,
    skippedRecipes,
    importedActions,
    totalDraftRecipes: plantRecipeDrafts.length,
  };
}

export function normalizePropagationMethod(value: unknown) {
  const raw = String(value || "seed").trim().toLowerCase();
  const normalized = raw.includes("cutting")
    ? "cutting"
    : raw.includes("air")
      ? "air-layer"
      : raw.includes("division")
        ? "division"
        : raw.includes("sucker") || raw.includes("slip") || raw.includes("corm")
          ? "sucker"
          : raw.includes("graft")
            ? "grafting"
            : raw.includes("seed")
              ? "seed"
              : raw;
  return PROPAGATION_METHODS.includes(normalized as any) ? normalized : "seed";
}

function normalizeImportedActionType(
  actionType: unknown,
  instruction: unknown,
  treatment: unknown = null
) {
  const rawType = String(actionType || "Other").trim();
  const lowerType = rawType.toLowerCase();
  const lowerInstruction = String(instruction || "").toLowerCase();
  const rawTreatment = cleanText(treatment);

  if (lowerType === "watering check") {
    return { actionType: "Water", treatment: null };
  }

  if (
    lowerType.includes("seedling booster") ||
    lowerInstruction.includes("seedling booster")
  ) {
    return { actionType: "Feed", treatment: rawTreatment || "Seedling Booster" };
  }

  if (
    lowerType.includes("rooting solution") ||
    lowerInstruction.includes("rooting solution")
  ) {
    return { actionType: "Feed", treatment: rawTreatment || "Rooting Solution" };
  }

  if (
    lowerType.includes("plant food") ||
    lowerInstruction.includes("macro grow") ||
    lowerInstruction.includes("macrogro")
  ) {
    return { actionType: "Feed", treatment: rawTreatment || "MacroGro Complete" };
  }

  if (lowerInstruction.includes("20-20")) {
    return { actionType: "Feed", treatment: rawTreatment || "20-20-20 Everyday Feed" };
  }

  if (lowerType.includes("pest") && lowerType.includes("disease")) {
    return { actionType: "Pest inspection", treatment: null };
  }

  if (lowerType.includes("pest")) {
    return { actionType: "Pest inspection", treatment: null };
  }

  if (lowerType.includes("disease")) {
    return { actionType: "Disease inspection", treatment: null };
  }

  if (lowerType.includes("shop entry") || lowerType.includes("shop exit")) {
    return { actionType: "Harvest ready check", treatment: null };
  }

  if (lowerType === "harvest check") {
    return { actionType: "Harvest ready check", treatment: null };
  }

  return { actionType: rawType || "Other", treatment: rawTreatment };
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanVariantName(title: unknown) {
  return String(title || "")
    .replace(/\s+\[IDENTITY[\s\S]*$/i, "")
    .replace(/\s+-\s+(Seedling|Seedling Pack|Garden Ready|10-inch Ready-to-Harvest Pack|Near Harvest Ready|16-inch Premium Pack)$/i, "")
    .replace(/\s+\((?:grown from seed|seed grown|grown from cutting|cutting grown)\)$/i, "")
    .replace(/\s+-\s+(?:grown from seed|seed grown|grown from cutting|cutting grown)$/i, "")
    .replace(/\s+\((?:Cuttings|Started[^)]*|Forage[^)]*)\)$/i, "")
    .replace(/\s+-\s+Started\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}.*$/i, "")
    .replace(/\s+Started\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}.*$/i, "")
    .replace(/\s+forage\s+pot$/i, "")
    .replace(/\s+plant$/i, "")
    .replace(/\s+-\s+(Small Household|Home Garden|Large Household).*$/i, "")
    .trim();
}

function getPlantKeyAliases(value: unknown) {
  const canonicalName = getCanonicalPlantName(value);
  const canonicalKey = makePlantKey(canonicalName);
  const rawKey = makePlantKey(String(value || ""));
  const aliases = new Set([canonicalKey, rawKey]);

  const add = (...values: string[]) => values.forEach((entry) => aliases.add(entry));

  switch (canonicalKey) {
    case "black-pepper":
      add("pepper-black-pepper", "black-pepper-plant", "black-pepper-forage-pot");
      break;
    case "bok-choy":
      add("bok-choy-started-2026-08-02", "bok-choy-started-2026-08-26");
      break;
    case "callaloo":
      add("callaloo-started-2026-08-09", "callaloo-started-2026-08-26");
      break;
    case "cabbage":
      add("caribbean-queen-cabbage", "caribbean-queen-cabbage-seedlings");
      break;
    case "carrots":
      add("carrot", "carrots-started-2026-08-02", "carrots-started-2026-08-20");
      break;
    case "basil-italian-sweet":
      add("italian-basil", "italian-sweet-basil", "italian-basil-cuttings");
      break;
    case "basil-genovese":
      add("genovese-basil", "genovese-basil-cuttings");
      break;
    case "bolo-mint-panadol-plant":
      add("bolo-mint", "panadol-plant", "panadol-plant-bolo-mint", "balla-mint");
      break;
    case "jamaican-peppermint-tree-mint":
      add(
        "jamaican-peppermint",
        "tree-mint",
        "costa-rican-peppermint",
        "costa-rican-peppermint-tree-mint-jamaican-peppermint",
        "jamaican-peppermint-tree-mint-identity-cultivar"
      );
      break;
  }

  return Array.from(aliases).filter(Boolean);
}

function makeDraftProfileMetadata(draft: (typeof plantRecipeDrafts)[number]) {
  return {
    draftNumber: draft.number,
    scientificName: draft.scientificName,
    category: draft.category,
    commonNames: draft.commonNames,
    preferredPropagationMethod: draft.preferredPropagationMethod,
    multiplierText: draft.multiplierText,
    germinationRooting: draft.germinationRooting,
    planningEstimate: draft.planningEstimate,
    potUpTransplant: draft.potUpTransplant,
    gardenReady: draft.gardenReady,
    nearHarvestMature: draft.nearHarvestMature,
    startingMaterial: draft.startingMaterial,
    nextContainerMedium: draft.nextContainerMedium,
    support: draft.support,
    packageWarnings: draft.packageWarnings,
    commonProblems: draft.commonProblems,
    notes: draft.notes,
  };
}

function extractStrength(instruction: string) {
  const match = instruction.match(/(?:1\/4|1\/2|3\/4|full|label)[^.;,]*(?:strength|rate)/i);
  return match ? match[0] : "";
}

function extractApplicationMethod(instruction: string) {
  const lower = instruction.toLowerCase();

  if (lower.includes("root-zone")) return "Root-zone";
  if (lower.includes("bottom-water") || lower.includes("bottom water")) {
    return "Bottom watering";
  }
  if (lower.includes("mist")) return "Mist";
  if (lower.includes("foliar")) return "Foliar";
  if (lower.includes("drench")) return "Drench";
  if (lower.includes("hand")) return "Hand";

  return "";
}
