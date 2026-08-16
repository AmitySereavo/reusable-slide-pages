export const nurseryOperatingSchedule = {
  seedSowingDays: [6],
  transplantDays: [0],
  deliveryDays: [1, 5],
  defaultWorkHour: 8,
};

export const propagationSafetyMultipliers = {
  seed: 10,
  cutting: 5,
  airLayer: 5,
  division: 2,
  sucker: 2,
  grafting: 3,
  other: 5,
};

export const gardenPackageRecurringProduction = {
  shopKey: "garden-package",
  productionSource: "Store Package",
  targetPackageCount: 1,
  frequency: "monthly",
  rollingMonths: 1,
  firstTargetLeadMonths: 3,
  packageSize: "large",
  packageFormat: "premium",
};

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function nearestAllowedWeekday(
  date: Date,
  allowedDays: number[],
  hour = nurseryOperatingSchedule.defaultWorkHour
) {
  const usefulDays = allowedDays.length ? allowedDays : [date.getDay()];
  let bestOffset = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const targetDay of usefulDays) {
    const forward = (targetDay - date.getDay() + 7) % 7;
    const backward = forward === 0 ? 0 : forward - 7;

    for (const offset of [backward, forward]) {
      const distance = Math.abs(offset);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = offset;
      }
    }
  }

  const next = addDays(date, bestOffset);
  next.setHours(hour, 0, 0, 0);
  return next;
}

export function nextAllowedWeekday(
  date: Date,
  allowedDays: number[],
  hour = nurseryOperatingSchedule.defaultWorkHour
) {
  const usefulDays = allowedDays.length ? allowedDays : [date.getDay()];
  let bestOffset = 7;

  for (const targetDay of usefulDays) {
    const offset = (targetDay - date.getDay() + 7) % 7;
    bestOffset = Math.min(bestOffset, offset);
  }

  const next = addDays(date, bestOffset);
  next.setHours(hour, 0, 0, 0);
  return next;
}
