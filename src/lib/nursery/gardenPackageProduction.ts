import { getLargestHomeGardenPackageBillOfMaterials } from "@/lib/inventory/unifiedInventory";
import {
  addDays,
  addMonths,
  gardenPackageRecurringProduction,
  nearestAllowedWeekday,
  nextAllowedWeekday,
  nurseryOperatingSchedule,
  propagationSafetyMultipliers,
} from "./productionRules";

type PropagationMethod =
  | "seed"
  | "cutting"
  | "airLayer"
  | "division"
  | "sucker"
  | "grafting"
  | "other";

type PlantProductionProfile = {
  propagationMethod: PropagationMethod;
  maturityDays: number;
  germinationOrRootingDays: number;
  transplantAfterDays: number | null;
  multiplierOverride?: number;
};

const defaultProfiles: Record<string, PlantProductionProfile> = {
  default: {
    propagationMethod: "seed",
    maturityDays: 90,
    germinationOrRootingDays: 10,
    transplantAfterDays: 35,
  },
  cutting: {
    propagationMethod: "cutting",
    maturityDays: 70,
    germinationOrRootingDays: 14,
    transplantAfterDays: 28,
  },
  sucker: {
    propagationMethod: "sucker",
    maturityDays: 90,
    germinationOrRootingDays: 21,
    transplantAfterDays: null,
  },
  grafting: {
    propagationMethod: "grafting",
    maturityDays: 120,
    germinationOrRootingDays: 30,
    transplantAfterDays: null,
  },
  airLayer: {
    propagationMethod: "airLayer",
    maturityDays: 120,
    germinationOrRootingDays: 35,
    transplantAfterDays: null,
  },
};

function normalize(value: string) {
  return value.toLowerCase();
}

function getPlantProductionProfile(productTitle: string): PlantProductionProfile {
  const title = normalize(productTitle);

  if (
    title.includes("banana sucker") ||
    title.includes("plantain sucker") ||
    title.includes("yam") ||
    title.includes("dasheen") ||
    title.includes("coco yam") ||
    title.includes("sweet potato")
  ) {
    return defaultProfiles.sucker;
  }

  if (
    title.includes("mulberry") ||
    title.includes("key lime") ||
    title.includes("star fruit") ||
    title.includes("soursop") ||
    title.includes("cherry tree")
  ) {
    return defaultProfiles.grafting;
  }

  if (title.includes("black pepper") || title.includes("grape vine")) {
    return defaultProfiles.airLayer;
  }

  if (
    title.includes("mint") ||
    title.includes("thyme") ||
    title.includes("lemongrass") ||
    title.includes("fever grass") ||
    title.includes("rosemary")
  ) {
    return defaultProfiles.cutting;
  }

  return defaultProfiles.default;
}

function getMultiplier(profile: PlantProductionProfile) {
  if (profile.multiplierOverride) return profile.multiplierOverride;
  return (
    propagationSafetyMultipliers[profile.propagationMethod] ||
    propagationSafetyMultipliers.other
  );
}

function getProductionUnitLabel(method: PropagationMethod) {
  return (
    {
      seed: "seeds",
      cutting: "cuttings",
      airLayer: "air layers",
      division: "divisions",
      sucker: "suckers/slips",
      grafting: "grafts",
      other: "starts",
    }[method] || "starts"
  );
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function targetReadyDate(monthOffset: number) {
  const base = addMonths(new Date(), gardenPackageRecurringProduction.firstTargetLeadMonths);
  base.setDate(1);
  base.setHours(8, 0, 0, 0);
  const monthlyTarget = addMonths(base, monthOffset);

  return nextAllowedWeekday(
    monthlyTarget,
    nurseryOperatingSchedule.deliveryDays,
    nurseryOperatingSchedule.defaultWorkHour
  );
}

export function buildGardenPackageStoreProductionPlan() {
  const billOfMaterials = getLargestHomeGardenPackageBillOfMaterials(
    gardenPackageRecurringProduction.packageFormat as "premium"
  );
  const blocks = [];

  for (
    let monthIndex = 0;
    monthIndex < gardenPackageRecurringProduction.rollingMonths;
    monthIndex += 1
  ) {
    const deliveryDate = targetReadyDate(monthIndex);
    const packageTarget = `${monthLabel(deliveryDate)} ${billOfMaterials.packageTitle}`;

    blocks.push({
      key: `store-package:${monthIndex}:${billOfMaterials.packageId}:target-ready`,
      taskKind: "delivery",
      source: "Garden Package",
      orderCode: packageTarget,
      customerName: "Store Package",
      productTitle: billOfMaterials.packageTitle,
      deliveryDate: deliveryDate.toISOString(),
      deliveryLabel: `${monthLabel(deliveryDate)} package target`,
      useLabel: "",
      prepFormat: billOfMaterials.packageFormatLabel,
      parcelQuantity: gardenPackageRecurringProduction.targetPackageCount,
      seedCount: 0,
      productionQuantity: gardenPackageRecurringProduction.targetPackageCount,
      productionUnitLabel: "package",
      propagationMethod: "other",
      productionSource: gardenPackageRecurringProduction.productionSource,
      packageTarget,
      stage: "Planned store package target",
      note: `Recurring store demand: ${gardenPackageRecurringProduction.targetPackageCount} ${billOfMaterials.packageTitle} per ${gardenPackageRecurringProduction.frequency}.`,
      lineTotal: 0,
      currencyCode: "JMD",
      sowingDate: null,
      propagationDate: null,
      germinationDate: null,
      transplantDate: null,
    });

    for (const content of billOfMaterials.contents) {
      const profile = getPlantProductionProfile(content.productTitle);
      const multiplier = getMultiplier(profile);
      const productionQuantity = content.quantity * multiplier;
      const idealStartDate = addDays(deliveryDate, -profile.maturityDays);
      const propagationDate =
        profile.propagationMethod === "seed"
          ? nearestAllowedWeekday(
              idealStartDate,
              nurseryOperatingSchedule.seedSowingDays,
              nurseryOperatingSchedule.defaultWorkHour
            )
          : nearestAllowedWeekday(
              idealStartDate,
              nurseryOperatingSchedule.seedSowingDays,
              nurseryOperatingSchedule.defaultWorkHour
            );
      const germinationDate = addDays(
        propagationDate,
        profile.germinationOrRootingDays
      );
      const transplantDate =
        typeof profile.transplantAfterDays === "number"
          ? nearestAllowedWeekday(
              addDays(propagationDate, profile.transplantAfterDays),
              nurseryOperatingSchedule.transplantDays,
              nurseryOperatingSchedule.defaultWorkHour
            )
          : null;
      const base = {
        source: "Garden Package",
        orderCode: packageTarget,
        customerName: "Store Package",
        productTitle: content.productTitle,
        deliveryDate: deliveryDate.toISOString(),
        deliveryLabel: `${monthLabel(deliveryDate)} package target`,
        useLabel: "",
        prepFormat: billOfMaterials.packageFormatLabel,
        parcelQuantity: content.quantity,
        seedCount: profile.propagationMethod === "seed" ? productionQuantity : 0,
        productionQuantity,
        productionUnitLabel: getProductionUnitLabel(profile.propagationMethod),
        propagationMethod: profile.propagationMethod,
        productionSource: gardenPackageRecurringProduction.productionSource,
        packageTarget,
        stage: "Planned store production",
        note: `${content.quantity} mature plant(s) required. Plan ${productionQuantity} ${getProductionUnitLabel(
          profile.propagationMethod
        )} using ${multiplier}x propagation safety multiplier.`,
        lineTotal: 0,
        currencyCode: "JMD",
      };

      blocks.push({
        ...base,
        key: `store-package:${monthIndex}:${content.sku}:production`,
        taskKind: "production",
        deliveryDate: null,
        targetReadyDate: deliveryDate.toISOString(),
        sowingDate:
          profile.propagationMethod === "seed"
            ? propagationDate.toISOString()
            : null,
        propagationDate:
          profile.propagationMethod !== "seed"
            ? propagationDate.toISOString()
            : null,
        germinationDate: germinationDate.toISOString(),
        transplantDate: transplantDate?.toISOString() || null,
      });
    }
  }

  return {
    rules: {
      nurseryOperatingSchedule,
      propagationSafetyMultipliers,
      gardenPackageRecurringProduction,
    },
    package: billOfMaterials,
    blocks,
  };
}
