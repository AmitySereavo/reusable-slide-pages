export type SeedlingProductionTemplate = {
  key: string;
  cropName: string;
  propagationType:
    | "seedling"
    | "cutting"
    | "air_layer"
    | "division"
    | "sucker"
    | "grafting"
    | "existing_stock"
    | "other";
  retailPrice: number;
  estimatedGerminationDays: number;
  readyWeeksAfterGermination: number;
  defaultQuantity: number;
  currentBatch?: {
    dateStarted: string;
    quantityLabel: string;
    estimatedPlantsLabel: string;
    germinationTimeLabel: string;
  };
};

export type SeedlingTimelineEvent = {
  id: string;
  title: string;
  plannedAt: string;
  status: "upcoming" | "completed" | "skipped" | "rescheduled" | "replaced";
  publicTitle?: string;
  publicVisible?: boolean;
  priceIncrease?: boolean;
  treatment?: string;
  strength?: string;
  actualAt?: string;
  enteredAt?: string;
  notes?: string;
  photoUrl?: string;
};

export const SEEDLING_SHOP_SLUG = "seedling-shop";

export const seedlingProductionTemplates: SeedlingProductionTemplate[] = [
  makeCurrentSeedlingTemplate("yellow-passion-fruit", "Yellow Passion Fruit", "seedling", 100, "2026-07-19", "2 seed rolls", "~50 seeds", "10-21 days", 50, 21),
  makeCurrentSeedlingTemplate("cherry-tomatoes", "Cherry Tomatoes", "seedling", 50, "2026-07-19", "4 seed rolls", "~100 seeds", "6-12 days", 100, 12),
  makeCurrentSeedlingTemplate("purple-sweet-peppers", "Purple Sweet Peppers", "seedling", 50, "2026-07-19", "6 seed rolls", "~150 seeds", "7-14 days", 150, 14),
  makeCurrentSeedlingTemplate("eggplant", "Eggplant", "seedling", 50, "2026-07-20", "7 seed rolls", "~175 seeds", "6-10 days", 175, 10),
  makeCurrentSeedlingTemplate("cucumber", "Cucumber", "seedling", 50, "2026-08-02", "2 seed rolls", "~50 seeds", "3-10 days", 50, 10),
  makeCurrentSeedlingTemplate("carrots", "Carrots", "seedling", 50, "2026-08-02", "2 seed rolls", "~50 seeds", "12-18 days", 50, 18),
  makeCurrentSeedlingTemplate("pak-choi", "Pak Choi", "seedling", 30, "2026-08-02", "2 seed rolls", "~50 seeds", "3-5 days", 50, 5),
  makeCurrentSeedlingTemplate("bok-choy", "Bok Choy", "seedling", 30, "2026-08-02", "2 seed rolls", "~50 seeds", "3-5 days", 50, 5),
  makeCurrentSeedlingTemplate("okra", "Okra", "seedling", 50, "2026-08-03", "2 seed rolls", "~50 seeds", "7-10 days", 50, 10),
  makeCurrentSeedlingTemplate("callaloo", "Callaloo", "seedling", 30, "2026-08-09", "2 seed rolls", "~50 seeds", "5-10 days", 50, 10),
  makeCurrentSeedlingTemplate("rosemary", "Rosemary", "seedling", 100, "2026-08-03", "2 seed rolls", "~50 seeds", "14-28 days", 50, 28, 6),
  makeCurrentSeedlingTemplate("caribbean-red-peppers", "Caribbean Red Peppers", "seedling", 50, "2026-08-04", "1 seed roll", "~25 seeds", "7-14 days", 25, 14),
  makeCurrentSeedlingTemplate("cilantro", "Cilantro", "seedling", 75, "2026-08-05", "2 seed rolls", "~50 seeds", "7-10 days", 50, 10),
  makeCurrentSeedlingTemplate("utah-celery", "Utah Celery", "seedling", 75, "2026-08-05", "2 seed rolls", "~50 seeds", "14-21 days", 50, 21),
  makeCurrentSeedlingTemplate("italian-flat-leaf-parsley", "Italian Flat-Leaf Parsley", "seedling", 75, "2026-08-05", "2 seed rolls", "~50 seeds", "40-60 days", 50, 60, 6),
  makeCurrentSeedlingTemplate("string-beans", "String Beans", "seedling", 40, "2026-08-05", "3 seeds in 1 cup", "3 seeds", "5-10 days", 3, 10),
  makeCurrentSeedlingTemplate("thai-basil", "Thai Basil", "seedling", 75, "2026-08-05", "1 seed roll", "~25 seeds", "5-10 days", 25, 10),
  makeCurrentSeedlingTemplate("italian-basil-cuttings", "Italian Basil (Cuttings)", "cutting", 75, "2026-08-05", "25 cuttings", "25 plants", "Roots in 7-14 days", 25, 14),
  makeCurrentSeedlingTemplate("genovese-basil-cuttings", "Genovese Basil (Cuttings)", "cutting", 75, "2026-08-05", "25 cuttings", "25 plants", "Roots in 7-14 days", 25, 14),
  makeCurrentSeedlingTemplate("chili-pepper", "Chili Pepper", "seedling", 50, "2026-08-06", "1 seed roll", "~25 seeds", "7-14 days", 25, 14),
  makeCurrentSeedlingTemplate("bird-pepper", "Bird Pepper", "seedling", 50, "2026-08-06", "1 seed roll", "~25 seeds", "7-14 days", 25, 14),
  makeCurrentSeedlingTemplate("original-scotch-bonnet-pepper", "Pepper - Scotch Bonnet", "seedling", 50, "2026-08-09", "2 seed rolls", "~50 seeds", "7-14 days", 50, 14),
];

function makeCurrentSeedlingTemplate(
  key: string,
  cropName: string,
  propagationType: "seedling" | "cutting",
  retailPrice: number,
  dateStarted: string,
  quantityLabel: string,
  estimatedPlantsLabel: string,
  germinationTimeLabel: string,
  defaultQuantity: number,
  estimatedGerminationDays: number,
  readyWeeksAfterGermination = 4
): SeedlingProductionTemplate {
  return {
    key,
    cropName,
    propagationType,
    retailPrice,
    estimatedGerminationDays,
    readyWeeksAfterGermination,
    defaultQuantity,
    currentBatch: {
      dateStarted,
      quantityLabel,
      estimatedPlantsLabel,
      germinationTimeLabel,
    },
  };
}

export function getSeedlingProductionTemplate(key: unknown) {
  return seedlingProductionTemplates.find(
    (template) => template.key === String(key || "").trim()
  );
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toLocalDateTimeIso(dateInput: string, timeInput = "08:00") {
  const date = String(dateInput || "").trim();
  const time = String(timeInput || "08:00").trim();
  return new Date(`${date}T${time}:00`).toISOString();
}

export function buildSeedlingTimeline({
  productionAt,
  template,
}: {
  productionAt: string;
  template: SeedlingProductionTemplate;
}) {
  const productionDate = new Date(productionAt);
  const germinationDate = addDays(productionDate, template.estimatedGerminationDays);
  const events: SeedlingTimelineEvent[] = [
    {
      id: "production-started",
      title: template.propagationType === "cutting" ? "Cuttings started" : "Seeds sown",
      publicTitle: template.propagationType === "cutting" ? "Cuttings started" : "Seeds sown",
      plannedAt: productionDate.toISOString(),
      status: "completed",
      publicVisible: true,
    },
    {
      id: "germination",
      title: template.propagationType === "cutting" ? "Rooting estimate" : "Estimated germination",
      publicTitle: template.propagationType === "cutting" ? "Rooting estimate" : "Estimated germination",
      plannedAt: germinationDate.toISOString(),
      status: "upcoming",
      publicVisible: true,
    },
  ];

  const boosterStrengths = [
    "Quarter-strength Seedling Booster",
    "Half-strength Seedling Booster",
    "Full-strength Seedling Booster",
    "Full-strength Seedling Booster",
  ];

  for (let index = 0; index < template.readyWeeksAfterGermination; index += 1) {
    const plannedAt = addDays(germinationDate, (index + 1) * 7);
    events.push({
      id: `booster-week-${index + 1}`,
      title: boosterStrengths[Math.min(index, boosterStrengths.length - 1)],
      publicTitle: "Seedling Booster applied",
      plannedAt: plannedAt.toISOString(),
      status: "upcoming",
      publicVisible: true,
      priceIncrease: true,
      treatment: "Seedling Booster",
      strength: boosterStrengths[Math.min(index, boosterStrengths.length - 1)],
    });
    events.push({
      id: `soap-week-${index + 1}`,
      title: "Insecticidal Soap",
      publicTitle: "Pest prevention treatment",
      plannedAt: plannedAt.toISOString(),
      status: "upcoming",
      publicVisible: true,
      treatment: "Insecticidal Soap",
    });
  }

  const availabilityAt = addDays(
    germinationDate,
    template.readyWeeksAfterGermination * 7
  );
  events.push({
    id: "availability-check",
    title: "Readiness inspection / availability confirmation",
    publicTitle: "Availability estimate",
    plannedAt: availabilityAt.toISOString(),
    status: "upcoming",
    publicVisible: true,
  });

  return {
    germinationAt: germinationDate.toISOString(),
    availabilityAt: availabilityAt.toISOString(),
    priceIncreaseDates: events
      .filter((event) => event.priceIncrease)
      .map((event) => event.plannedAt),
    events,
  };
}

export function getSeedlingBatchCurrentPrice({
  retailPrice,
  productionAt,
  availabilityAt,
  priceIncreaseDates,
  now = new Date(),
}: {
  retailPrice: number;
  productionAt: string;
  availabilityAt: string;
  priceIncreaseDates: string[];
  now?: Date;
}) {
  if (now.getTime() >= new Date(availabilityAt).getTime()) {
    return retailPrice;
  }

  const orderedDates = [...priceIncreaseDates].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  const completedIncreases = orderedDates.filter(
    (date) => new Date(date).getTime() <= now.getTime()
  ).length;
  const ratios = [0.2, 0.4, 0.7, 0.85, 1];
  const ratio = ratios[Math.min(completedIncreases, ratios.length - 1)];
  return Math.max(1, Math.round(retailPrice * ratio));
}

export function getNextUpcomingDate(dates: string[], now = new Date()) {
  return [...dates]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .find((date) => new Date(date).getTime() > now.getTime());
}
