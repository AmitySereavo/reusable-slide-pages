import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

loadLocalEnv();

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const result = await prisma.$queryRaw<Array<{ deleted_count: bigint | number }>>`
    WITH ranked AS (
      SELECT
        "id",
        ROW_NUMBER() OVER (
          PARTITION BY
            "recipeId",
            "dayNumber",
            "actionType",
            "instruction",
            COALESCE("quantity", ''),
            COALESCE("strength", ''),
            COALESCE("applicationMethod", ''),
            "stageCheckRequired",
            COALESCE("shopAction", ''),
            COALESCE("notes", ''),
            "sortOrder"
          ORDER BY "createdAt" ASC, "id" ASC
        ) AS rn
      FROM "PlantProductionRecipeAction"
    ),
    deleted AS (
      DELETE FROM "PlantProductionRecipeAction"
      WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1)
      RETURNING "id"
    )
    SELECT COUNT(*) AS deleted_count FROM deleted
  `;

  console.log(
    JSON.stringify(
      { deletedDuplicateActions: Number(result[0]?.deleted_count || 0) },
      null,
      2
    )
  );
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
