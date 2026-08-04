export type SeedlingProductionTemplate = {
  key: string;
  cropName: string;
  propagationType: "seedling" | "cutting";
  retailPrice: number;
  estimatedGerminationDays: number;
  readyWeeksAfterGermination: number;
  defaultQuantity: number;
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
  { key: "callaloo", cropName: "Callaloo", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 4, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "cucumber", cropName: "Cucumber", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 3, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "thai-basil", cropName: "Thai Basil", propagationType: "seedling", retailPrice: 75, estimatedGerminationDays: 7, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "pak-choi", cropName: "Pak Choi", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 4, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "bok-choy", cropName: "Bok Choy", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 4, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "cabbage", cropName: "Cabbage", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 5, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "lettuce", cropName: "Lettuce", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 3, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "scotch-bonnet-pepper", cropName: "Scotch Bonnet Pepper", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "sweet-pepper", cropName: "Sweet Pepper", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 8, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "slicing-tomato", cropName: "Slicing Tomato", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 5, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "plum-tomato", cropName: "Plum Tomato", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 5, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "cherry-tomato", cropName: "Cherry Tomato", propagationType: "seedling", retailPrice: 50, estimatedGerminationDays: 5, readyWeeksAfterGermination: 4, defaultQuantity: 1000 },
  { key: "rosemary-seed", cropName: "Rosemary (grown from seed)", propagationType: "seedling", retailPrice: 100, estimatedGerminationDays: 18, readyWeeksAfterGermination: 6, defaultQuantity: 1000 },
  { key: "black-mint-cutting", cropName: "Black Mint", propagationType: "cutting", retailPrice: 100, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 500 },
  { key: "spearmint-cutting", cropName: "Spearmint", propagationType: "cutting", retailPrice: 100, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 500 },
  { key: "tree-mint-cutting", cropName: "Costa Rican Peppermint / Tree Mint / Jamaican Peppermint", propagationType: "cutting", retailPrice: 100, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 500 },
  { key: "bolo-mint-cutting", cropName: "Bola Mint / Panadol Plant", propagationType: "cutting", retailPrice: 100, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 500 },
  { key: "common-mint-cutting", cropName: "Common Mint", propagationType: "cutting", retailPrice: 100, estimatedGerminationDays: 10, readyWeeksAfterGermination: 4, defaultQuantity: 500 },
];

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
