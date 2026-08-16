import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  deletePlantRecipeAction,
  getOrCreatePlantRecipe,
  getPlantRecipeCatalog,
  importDraftPlantRecipes,
  makePlantKey,
  updatePlantRecipeSettings,
  upsertPlantRecipeAction,
} from "@/lib/nursery/plantRecipes";

export async function GET(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const catalog = await getPlantRecipeCatalog(prisma as any);
  const requestedPlantKey = searchParams.get("plantKey");
  const method = searchParams.get("method") || "seed";
  const selectedPlant =
    catalog.find((plant) => plant.key === requestedPlantKey) || catalog[0];

  const recipe = selectedPlant
    ? await getOrCreatePlantRecipe(prisma as any, {
        plantKey: selectedPlant.key,
        plantName: selectedPlant.name,
        propagationMethod: method,
      })
    : null;

  return NextResponse.json({
    catalog,
    recipe,
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);

  try {
    if (body?.action === "ensure-recipe") {
      const plantName = String(body?.plantName || "").trim();
      const plantKey = makePlantKey(body?.plantKey || plantName);

      if (!plantName || !plantKey) {
        return NextResponse.json(
          { error: "Plant name is required." },
          { status: 400 }
        );
      }

      const recipe = await getOrCreatePlantRecipe(prisma as any, {
        plantKey,
        plantName,
        propagationMethod: body?.method,
      });

      return NextResponse.json({ ok: true, recipe });
    }

    if (body?.action === "update-settings") {
      await updatePlantRecipeSettings(prisma as any, {
        recipeId: String(body.recipeId || ""),
        cycleLengthDays: Number(body.cycleLengthDays),
        maintenanceLoopStartDay: Number(body.maintenanceLoopStartDay),
        maintenanceLoopLengthDays: Number(body.maintenanceLoopLengthDays),
      });

      return NextResponse.json({ ok: true });
    }

    if (body?.action === "save-action") {
      await upsertPlantRecipeAction(prisma as any, body);

      return NextResponse.json({ ok: true });
    }

    if (body?.action === "delete-action") {
      const actionId = String(body?.actionId || "").trim();

      if (!actionId) {
        return NextResponse.json(
          { error: "Action id is required." },
          { status: 400 }
        );
      }

      await deletePlantRecipeAction(prisma as any, actionId);

      return NextResponse.json({ ok: true });
    }

    if (body?.action === "import-draft-recipes") {
      const result = await importDraftPlantRecipes(prisma as any, {
        replaceExisting: body?.replaceExisting === true,
      });

      const catalog = await getPlantRecipeCatalog(prisma as any);

      return NextResponse.json({ ok: true, ...result, catalog });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recipe update failed." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Unsupported plant production timeline action." },
    { status: 400 }
  );
}
