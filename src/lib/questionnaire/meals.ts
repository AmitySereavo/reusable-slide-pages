import type {
  MealMenu,
  MealMenuCatalog,
  MealSelections,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ShopResolvedCartLine,
} from "@/types/questionnaire";

export function getMealMenu(
  variables: QuestionnaireVariableMap,
  menuCatalogKey: string | undefined,
  menuId?: string
): MealMenu | null {
  if (!menuCatalogKey) return null;

  const catalog = normalizeMealMenuCatalog(variables[menuCatalogKey]);
  if (!catalog?.menus.length) return null;

  if (!menuId) {
    return catalog.menus[0] ?? null;
  }

  return catalog.menus.find((menu) => menu.id === menuId) ?? null;
}

export function normalizeMealSelections(input: unknown): MealSelections {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: MealSelections = {};

  for (const [lineKey, rawLineSelection] of Object.entries(
    input as Record<string, unknown>
  )) {
    if (
      !rawLineSelection ||
      typeof rawLineSelection !== "object" ||
      Array.isArray(rawLineSelection)
    ) {
      continue;
    }

    normalized[lineKey] = {};

    for (const [groupId, rawGroupSelection] of Object.entries(
      rawLineSelection as Record<string, unknown>
    )) {
      if (
        !rawGroupSelection ||
        typeof rawGroupSelection !== "object" ||
        Array.isArray(rawGroupSelection)
      ) {
        continue;
      }

      normalized[lineKey][groupId] = {};

      for (const [optionId, rawQuantity] of Object.entries(
        rawGroupSelection as Record<string, unknown>
      )) {
        const quantity = normalizeNonNegativeInteger(rawQuantity);

        if (quantity > 0) {
          normalized[lineKey][groupId][optionId] = quantity;
        }
      }
    }
  }

  return normalized;
}

export function getMealRequiredLines(lines: ShopResolvedCartLine[]) {
  return lines.filter((line) => Boolean(line.mealSelection?.menuId));
}

export function hasMealSelectionItems(lines: ShopResolvedCartLine[]) {
  return getMealRequiredLines(lines).length > 0;
}

export function getMealTicketQuantity(lines: ShopResolvedCartLine[]) {
  return getMealRequiredLines(lines).reduce((sum, line) => sum + line.quantity, 0);
}

export function isMealSelectionComplete(params: {
  menu: MealMenu | null;
  lines: ShopResolvedCartLine[];
  selections: MealSelections;
}) {
  const { menu, lines, selections } = params;

  if (!menu) return false;

  const mealLines = getMealRequiredLines(lines);

  if (!mealLines.length) return true;

  return mealLines.every((line) =>
    menu.groups.every((group) => {
      if (group.required === false) {
        return true;
      }

      const groupTotal = getMealGroupTotal(
        selections,
        line.lineKey,
        group.id
      );

      return groupTotal === line.quantity;
    })
  );
}

export function getMealGroupTotal(
  selections: MealSelections,
  lineKey: string,
  groupId: string
) {
  const groupSelection = selections[lineKey]?.[groupId] ?? {};

  return Object.values(groupSelection).reduce(
    (sum, quantity) => sum + normalizeNonNegativeInteger(quantity),
    0
  );
}

export function setMealOptionQuantity(params: {
  selections: MealSelections;
  lineKey: string;
  groupId: string;
  optionId: string;
  quantity: number;
}) {
  const { selections, lineKey, groupId, optionId, quantity } = params;
  const nextSelections: MealSelections = structuredClone(selections);
  const normalizedQuantity = normalizeNonNegativeInteger(quantity);

  nextSelections[lineKey] = nextSelections[lineKey] ?? {};
  nextSelections[lineKey][groupId] = nextSelections[lineKey][groupId] ?? {};

  if (normalizedQuantity <= 0) {
    delete nextSelections[lineKey][groupId][optionId];
  } else {
    nextSelections[lineKey][groupId][optionId] = normalizedQuantity;
  }

  return nextSelections;
}

function normalizeMealMenuCatalog(
  input: QuestionnaireVariableValue | undefined
): MealMenuCatalog | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const menusValue = record.menus;

  if (!Array.isArray(menusValue)) {
    return null;
  }

  const menus = menusValue.map(normalizeMealMenu).filter(Boolean) as MealMenu[];

  return {
    menus,
  };
}

function normalizeMealMenu(input: QuestionnaireVariableValue): MealMenu | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const id = typeof record.id === "string" ? record.id : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const groupsValue = record.groups;

  if (!id || !label || !Array.isArray(groupsValue)) {
    return null;
  }

  const groups = groupsValue
    .map((group) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        return null;
      }

      const groupRecord = group as Record<string, QuestionnaireVariableValue>;
      const groupId =
        typeof groupRecord.id === "string" ? groupRecord.id : undefined;
      const groupLabel =
        typeof groupRecord.label === "string" ? groupRecord.label : undefined;
      const required =
        typeof groupRecord.required === "boolean"
          ? groupRecord.required
          : undefined;
      const includedServings =
        typeof groupRecord.includedServings === "number" &&
        Number.isFinite(groupRecord.includedServings)
          ? groupRecord.includedServings
          : undefined;
      const optionsValue = groupRecord.options;

      if (!groupId || !groupLabel || !Array.isArray(optionsValue)) {
        return null;
      }

      const options = optionsValue
        .map((option) => {
          if (!option || typeof option !== "object" || Array.isArray(option)) {
            return null;
          }

          const optionRecord = option as Record<string, QuestionnaireVariableValue>;
          const optionId =
            typeof optionRecord.id === "string" ? optionRecord.id : undefined;
          const optionLabel =
            typeof optionRecord.label === "string"
              ? optionRecord.label
              : undefined;
          const optionPrice =
            typeof optionRecord.price === "number" &&
            Number.isFinite(optionRecord.price)
              ? optionRecord.price
              : undefined;

          if (!optionId || !optionLabel) {
            return null;
          }

          return {
            id: optionId,
            label: optionLabel,
            price: optionPrice,
          };
        })
        .filter(Boolean) as MealMenu["groups"][number]["options"];

      return {
        id: groupId,
        label: groupLabel,
        required,
        includedServings,
        options,
      };
    })
    .filter(Boolean) as MealMenu["groups"];

  return {
    id,
    label,
    groups,
  };
}

function normalizeNonNegativeInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}