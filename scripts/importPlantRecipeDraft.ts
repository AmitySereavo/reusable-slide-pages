import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

loadLocalEnv();

async function main() {
  const [{ prisma }, { importDraftPlantRecipes }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/lib/nursery/plantRecipes"),
  ]);
  const replaceExisting = process.argv.includes("--replace");
  const result = await importDraftPlantRecipes(prisma as any, {
    replaceExisting,
  });

  console.log(
    [
      `Imported recipes: ${result.importedRecipes}`,
      `Skipped recipes: ${result.skippedRecipes}`,
      `Imported actions: ${result.importedActions}`,
      `Draft recipes: ${result.totalDraftRecipes}`,
    ].join("\n")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
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
