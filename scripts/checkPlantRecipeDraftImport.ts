import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { plantRecipeDrafts } from "../src/lib/nursery/plantRecipeDraftData";
import { getCanonicalPlantKey } from "../src/lib/nursery/plantRecipes";

loadLocalEnv();

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const mismatches = [];

  for (const draft of plantRecipeDrafts) {
    const plantKey = getCanonicalPlantKey(draft.plantName);
    const expected = draft.actions.reduce(
      (
        sum: number,
        action: { days: Array<number> }
      ) => sum + action.days.length,
      0
    );
    const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(a."id") AS count
      FROM "PlantProductionRecipe" r
      LEFT JOIN "PlantProductionRecipeAction" a ON a."recipeId" = r."id"
      WHERE r."plantKey" = ${plantKey}
    `;
    const actual = Number(rows[0]?.count || 0);

    if (actual !== expected) {
      mismatches.push({
        plantName: draft.plantName,
        expected,
        actual,
      });
    }
  }

  console.log(JSON.stringify({ mismatches }, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
