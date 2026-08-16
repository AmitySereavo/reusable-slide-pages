import "dotenv/config";
import { randomUUID } from "crypto";
import pg from "pg";
import { plantRecipeDrafts } from "../src/lib/nursery/plantRecipeDraftData";
import {
  getCanonicalPlantKey,
  getCanonicalPlantName,
  normalizePropagationMethod,
} from "../src/lib/nursery/plantRecipes";

const { Pool } = pg;

const requestedNames = process.argv
  .slice(2)
  .map((value) => value.trim())
  .filter(Boolean);

const targetNames = new Set(requestedNames);
const selectedDrafts = plantRecipeDrafts.filter((draft: any) =>
  targetNames.has(String(draft.plantName || ""))
);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

if (!requestedNames.length) {
  throw new Error("Pass at least one exact plant name to import.");
}

if (selectedDrafts.length !== requestedNames.length) {
  const foundNames = selectedDrafts.map((draft: any) => draft.plantName);
  const missingNames = requestedNames.filter((name) => !foundNames.includes(name));
  throw new Error(`Missing plant production timeline draft(s): ${missingNames.join(", ")}`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  try {
    await ensureTables();

    const updated = [];

    for (const draft of selectedDrafts as any[]) {
      const plantName = getCanonicalPlantName(draft.plantName);
      const plantKey = getCanonicalPlantKey(draft.plantName);
      const propagationMethod = normalizePropagationMethod(draft.preferredPropagationMethod);
      const recipeRows = await pool.query(
        `INSERT INTO "PlantProductionRecipe" (
        "id", "plantKey", "plantName", "propagationMethod", "cycleLengthDays",
        "maintenanceLoopStartDay", "maintenanceLoopLengthDays", "profileMetadata",
        "sourceLabel", "updatedAt"
      ) VALUES ($1,$2,$3,$4,90,91,7,$5::jsonb,$6,CURRENT_TIMESTAMP)
      ON CONFLICT ("plantKey", "propagationMethod") DO UPDATE SET
        "plantName" = EXCLUDED."plantName",
        "cycleLengthDays" = 90,
        "maintenanceLoopStartDay" = 91,
        "maintenanceLoopLengthDays" = 7,
        "profileMetadata" = EXCLUDED."profileMetadata",
        "sourceLabel" = EXCLUDED."sourceLabel",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "id"`,
        [
          randomUUID(),
          plantKey,
          plantName,
          propagationMethod,
          JSON.stringify(makeProfileMetadata(draft)),
          "ParaLife production timeline draft - selected import",
        ]
      );

      const recipeId = recipeRows.rows[0].id;
      await pool.query(`DELETE FROM "PlantProductionRecipeAction" WHERE "recipeId" = $1`, [
        recipeId,
      ]);

      let sortOrder = 0;
      let actionCount = 0;

      for (const action of draft.actions as any[]) {
        for (const dayNumber of action.days as number[]) {
          await pool.query(
            `INSERT INTO "PlantProductionRecipeAction" (
            "id", "recipeId", "dayNumber", "actionType", "treatment",
            "instruction", "quantity", "strength", "applicationMethod",
            "stageCheckRequired", "shopAction", "notes", "sortOrder", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP)`,
            [
              randomUUID(),
              recipeId,
              dayNumber,
              action.actionType || "Other",
              action.treatment || null,
              action.instruction || "Production timeline action.",
              action.quantity || null,
              action.strength || null,
              action.applicationMethod || null,
              Boolean(action.stageCheckRequired),
              action.shopAction || null,
              action.notes || null,
              sortOrder,
            ]
          );
          sortOrder += 1;
          actionCount += 1;
        }
      }

      updated.push({
        plantName: draft.plantName,
        plantKey,
        propagationMethod,
        actionCount,
      });
    }

    console.log(JSON.stringify({ updated }, null, 2));
  } finally {
    await pool.end();
  }
}

async function ensureTables() {
  await pool.query(`
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
  `);

  await pool.query(`
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
  `);
}

function makeProfileMetadata(draft: any) {
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
