import { prisma } from "@/lib/prisma";

type SeedCampaignPlantRecord = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  claimEligible: boolean;
  claimSwitchEligible: boolean;
  claimFeatured: boolean;
  quantityAvailable: number;
  questionnaire: {
    seedRevealBlock: string | null;
    plantInfoBlock: string | null;
  } | null;
};

function getPlantDisplayName(plant?: SeedCampaignPlantRecord) {
  if (!plant) return "";
  return plant.displayName?.trim() || plant.name;
}

function ensureBlock(value: string | null | undefined) {
  return value?.trim() || "";
}

export async function getSeedCampaignData() {
  const plants = await prisma.plant.findMany({
    where: {
      active: true,
      claimEligible: true,
      quantityAvailable: {
        gt: 0,
      },
    },
    orderBy: [{ claimFeatured: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      claimEligible: true,
      claimSwitchEligible: true,
      claimFeatured: true,
      quantityAvailable: true,
      questionnaire: {
        select: {
          seedRevealBlock: true,
          plantInfoBlock: true,
        },
      },
    },
  });

  const featuredPlant = plants.find((plant) => plant.claimFeatured) ?? plants[0];

  const switchPlants = plants
    .filter(
      (plant) =>
        featuredPlant &&
        plant.slug !== featuredPlant.slug &&
        plant.claimSwitchEligible
    )
    .slice(0, 4);

  return {
    featuredPlant,
    switchPlants,
    campaignPlants: plants.map((plant) => ({
      id: plant.id,
      slug: plant.slug,
      label: getPlantDisplayName(plant),
    })),
    variables: {
      mainPlantName: getPlantDisplayName(featuredPlant),
      seedRevealBlock: ensureBlock(featuredPlant?.questionnaire?.seedRevealBlock),
      plantInfoBlock: ensureBlock(featuredPlant?.questionnaire?.plantInfoBlock),

      switchPlant1Name: getPlantDisplayName(switchPlants[0]),
      switchPlant2Name: getPlantDisplayName(switchPlants[1]),
      switchPlant3Name: getPlantDisplayName(switchPlants[2]),
      switchPlant4Name: getPlantDisplayName(switchPlants[3]),
    },
  };
}