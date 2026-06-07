import type {
  MealMenu,
  ShopResolvedCartLine,
  TicketAssignment,
  TicketAssignments,
  TicketOwnerPaymentMode,
} from "@/types/questionnaire";

const DEFAULT_TICKET_OWNER_PAYMENT_MODE: TicketOwnerPaymentMode =
  "purchaser_pays_ticket_and_addons";

function normalizeTicketOwnerPaymentMode(
  value: unknown
): TicketOwnerPaymentMode {
    return value === "purchaser_pays_ticket_and_addons" ||
    value === "owner_selects_sender_pays_addons" ||
    value === "owner_pays_addons" ||
    value === "owner_pays_ticket_and_addons"
    ? value
    : DEFAULT_TICKET_OWNER_PAYMENT_MODE;
}

export function normalizeTicketAssignments(input: unknown): TicketAssignments {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const ticketCode =
        typeof record.ticketCode === "string" ? record.ticketCode : "";
      const lineKey = typeof record.lineKey === "string" ? record.lineKey : "";
      const productId =
        typeof record.productId === "string" ? record.productId : "";
      const sizeOptionId =
        typeof record.sizeOptionId === "string" ? record.sizeOptionId : "";
      const ticketIndex =
        typeof record.ticketIndex === "number" &&
        Number.isFinite(record.ticketIndex)
          ? record.ticketIndex
          : 0;
      const ticketLabel =
        typeof record.ticketLabel === "string" ? record.ticketLabel : "";
      const productTitle =
        typeof record.productTitle === "string" ? record.productTitle : "";

      if (!ticketCode || !lineKey || !productId || !sizeOptionId) {
        return null;
      }

      return {
        ticketCode,
        lineKey,
        productId,
        sizeOptionId,
        purchaseModeId:
          typeof record.purchaseModeId === "string"
            ? record.purchaseModeId
            : undefined,
        ticketIndex,
        ticketLabel,
        productTitle,
        ownerName:
          typeof record.ownerName === "string" ? record.ownerName : "",
        ownerEmail:
          typeof record.ownerEmail === "string" ? record.ownerEmail : "",
        ownerPhone:
          typeof record.ownerPhone === "string" ? record.ownerPhone : "",
        purchaserContactPrefilled: record.purchaserContactPrefilled === true,
        isPurchaserTicket: record.isPurchaserTicket === true,
        emailTicketToOwner: record.emailTicketToOwner !== false,
        ticketOwnerPaymentMode: normalizeTicketOwnerPaymentMode(
          record.ticketOwnerPaymentMode
        ),

        ticketOwnerAddonBudget:
          typeof record.ticketOwnerAddonBudget === "number" &&
          Number.isFinite(record.ticketOwnerAddonBudget)
            ? Math.max(0, record.ticketOwnerAddonBudget)
            : 0,

        mealMode:
          record.mealMode === "required" || record.mealMode === "optional"
            ? record.mealMode
            : undefined,
        mealMenuId:
          typeof record.mealMenuId === "string" ? record.mealMenuId : undefined,
        mealLabel:
          typeof record.mealLabel === "string" ? record.mealLabel : undefined,
        mealAddOnPrice:
          typeof record.mealAddOnPrice === "number" &&
          Number.isFinite(record.mealAddOnPrice)
            ? record.mealAddOnPrice
            : undefined,
        mealEnabled:
          record.mealMode === "required" ? true : record.mealEnabled === true,
        mealSelection: normalizeTicketMealSelection(record.mealSelection),
        wantsExtraFood: record.wantsExtraFood === true,
        hasMealNotes: record.hasMealNotes === true,
        mealNotes:
          typeof record.mealNotes === "string" ? record.mealNotes : "",
      } satisfies TicketAssignment;
    })
    .filter(Boolean) as TicketAssignments;
}

export function buildTicketAssignmentsFromLines(params: {
  lines: ShopResolvedCartLine[];
  existingAssignments: TicketAssignments;
}) {
  const { lines, existingAssignments } = params;
  const nextAssignments: TicketAssignments = [];

  for (const line of lines) {
    for (let index = 0; index < line.quantity; index += 1) {
      const ticketCode = buildTicketCode(line, index);
      const existing = existingAssignments.find(
        (assignment) => assignment.ticketCode === ticketCode
      );

      nextAssignments.push({
        ticketCode,
        lineKey: line.lineKey,
        productId: line.productId,
        sizeOptionId: line.sizeOptionId,
        purchaseModeId: line.purchaseModeId,
        ticketIndex: index,
        ticketLabel: `${line.sizeLabel} #${index + 1}`,
        productTitle: line.productTitle,
        ownerName: existing?.ownerName ?? "",
        ownerEmail: existing?.ownerEmail ?? "",
        ownerPhone: existing?.ownerPhone ?? "",
        purchaserContactPrefilled: existing?.purchaserContactPrefilled,
        isPurchaserTicket: existing?.isPurchaserTicket ?? index === 0,
        emailTicketToOwner:
          existing?.emailTicketToOwner ?? (existing?.isPurchaserTicket ? false : true),
        ticketOwnerPaymentMode:
          existing?.ticketOwnerPaymentMode ?? DEFAULT_TICKET_OWNER_PAYMENT_MODE,  
        ticketOwnerAddonBudget: existing?.ticketOwnerAddonBudget ?? 0,
        mealMode: line.mealSelection?.mode,
        mealMenuId: line.mealSelection?.menuId,
        mealLabel: line.mealSelection?.label,
        mealAddOnPrice: line.mealSelection?.price,
        mealEnabled:
          line.mealSelection?.mode === "required"
            ? true
            : existing?.mealEnabled ?? false,
        mealSelection: existing?.mealSelection ?? {},
        wantsExtraFood: existing?.wantsExtraFood ?? false,
        hasMealNotes: existing?.hasMealNotes ?? false,
        mealNotes: existing?.mealNotes ?? "",
      });
    }
  }

  return nextAssignments;
}

export function getTicketsNeedingMeal(assignments: TicketAssignments) {
  return assignments.filter(
    (assignment) =>
      assignment.mealMode === "required" || assignment.mealEnabled === true
  );
}

export function hasTicketsNeedingMeal(assignments: TicketAssignments) {
  return getTicketsNeedingMeal(assignments).length > 0;
}

export function areRequiredTicketMealsComplete(params: {
  menu: MealMenu | null;
  assignments: TicketAssignments;
}) {
  const { menu, assignments } = params;

  if (!menu) {
    return false;
  }

  return getTicketsNeedingMeal(assignments).every((assignment) =>
    menu.groups.every((group) => {
      if (group.required === false) {
        return true;
      }

      return getTicketMealGroupTotal(assignment, group.id) >= 1;
    })
  );
}

export function getTicketMealGroupTotal(
  assignment: TicketAssignment,
  groupId: string
) {
  const groupSelection = assignment.mealSelection?.[groupId] ?? {};

  return Object.values(groupSelection).reduce(
    (sum, quantity) => sum + normalizeNonNegativeInteger(quantity),
    0
  );
}

export function getTicketMealOptionExtraTotal(params: {
  menu: MealMenu;
  assignment: TicketAssignment;
  groupId: string;
  optionId: string;
}) {
  const { menu, assignment, groupId, optionId } = params;
  const group = menu.groups.find((item) => item.id === groupId);
  const option = group?.options.find((item) => item.id === optionId);

  if (!group || !option) {
    return 0;
  }

  const quantity = normalizeNonNegativeInteger(
    assignment.mealSelection?.[group.id]?.[option.id] ?? 0
  );

  if (quantity <= 0) {
    return 0;
  }

  const includedServings =
    typeof group.includedServings === "number"
      ? group.includedServings
      : group.required === false
        ? 0
        : 1;

  let selectedBeforeThisOption = 0;

  for (const candidate of group.options) {
    if (candidate.id === option.id) {
      break;
    }

    selectedBeforeThisOption += normalizeNonNegativeInteger(
      assignment.mealSelection?.[group.id]?.[candidate.id] ?? 0
    );
  }

  const includedRemainingForThisOption = Math.max(
    0,
    includedServings - selectedBeforeThisOption
  );

  const chargedQuantity = Math.max(0, quantity - includedRemainingForThisOption);

  return chargedQuantity * (option.price ?? 0);
}

export function calculateSingleTicketMealExtraTotal(params: {
  menu: MealMenu | null;
  assignment: TicketAssignment;
}) {
  const { menu, assignment } = params;

  if (!menu) {
    return 0;
  }

  return calculateTicketMealExtraTotal({
    menu,
    assignments: [assignment],
  });
}

export function getTicketMealSelectionSummary(params: {
  menu: MealMenu | null;
  assignment: TicketAssignment;
}) {
  const { menu, assignment } = params;

  if (!menu) {
    return [];
  }

  return menu.groups.flatMap((group) =>
    group.options
      .map((option) => {
        const quantity =
          assignment.mealSelection?.[group.id]?.[option.id] ?? 0;

        if (quantity <= 0) {
          return null;
        }

        const extraTotal = getTicketMealOptionExtraTotal({
          menu,
          assignment,
          groupId: group.id,
          optionId: option.id,
        });

        return {
          groupLabel: group.label,
          optionLabel: option.label,
          quantity,
          extraTotal,
        };
      })
      .filter(Boolean)
  ) as Array<{
    groupLabel: string;
    optionLabel: string;
    quantity: number;
    extraTotal: number;
  }>;
}

export function updateTicketAssignmentField(params: {
  assignments: TicketAssignments;
  ticketCode: string;
  field:
    | "ownerName"
    | "ownerEmail"
    | "ownerPhone"
    | "mealNotes"
    | "ticketOwnerAddonBudget";
  value: string | number;
}) {
  return params.assignments.map((assignment) =>
    assignment.ticketCode === params.ticketCode
      ? {
          ...assignment,
          [params.field]:
            params.field === "ticketOwnerAddonBudget"
              ? Math.max(0, Number(params.value || 0))
              : String(params.value ?? ""),
        }
      : assignment
  );
}

export function updateTicketAssignmentBoolean(params: {
  assignments: TicketAssignments;
  ticketCode: string;
   field:
    | "mealEnabled"
    | "wantsExtraFood"
    | "hasMealNotes"
    | "isPurchaserTicket"
    | "emailTicketToOwner";
  value: boolean;
}) {
  return params.assignments.map((assignment) =>
    assignment.ticketCode === params.ticketCode
      ? {
          ...assignment,
          [params.field]:
            assignment.mealMode === "required" &&
            params.field === "mealEnabled"
              ? true
              : params.value,
        }
      : assignment
  );
}

export function updateTicketOwnerPaymentMode(params: {
  assignments: TicketAssignments;
  ticketCode: string;
  value: TicketOwnerPaymentMode;
}) {
  return params.assignments.map((assignment) =>
    assignment.ticketCode === params.ticketCode
      ? {
          ...assignment,
          ticketOwnerPaymentMode: params.value,
        }
      : assignment
  );
}

export function setTicketMealOptionQuantity(params: {
  assignments: TicketAssignments;
  ticketCode: string;
  groupId: string;
  optionId: string;
  quantity: number;
}) {
  return params.assignments.map((assignment) => {
    if (assignment.ticketCode !== params.ticketCode) {
      return assignment;
    }

    const quantity = normalizeNonNegativeInteger(params.quantity);
    const mealSelection = {
      ...(assignment.mealSelection ?? {}),
      [params.groupId]: {
        ...(assignment.mealSelection?.[params.groupId] ?? {}),
      },
    };

    if (quantity <= 0) {
      delete mealSelection[params.groupId][params.optionId];
    } else {
      mealSelection[params.groupId][params.optionId] = quantity;
    }

    return {
      ...assignment,
      mealSelection,
    };
  });
}

export function calculateTicketMealExtraTotal(params: {
  menu: MealMenu | null;
  assignments: TicketAssignments;
}) {
  const { menu, assignments } = params;

  if (!menu) {
    return 0;
  }

  return getTicketsNeedingMeal(assignments).reduce((sum, assignment) => {
    const servingExtraTotal = menu.groups.reduce((groupSum, group) => {
      
      const includedServings =
        typeof group.includedServings === "number"
          ? group.includedServings
          : group.required === false
            ? 0
            : 1;

      let includedRemaining = includedServings;
      let optionTotal = 0;

      for (const option of group.options) {
        const quantity = normalizeNonNegativeInteger(
          assignment.mealSelection?.[group.id]?.[option.id] ?? 0
        );

        const includedQuantity = Math.min(includedRemaining, quantity);
        const chargedQuantity = Math.max(0, quantity - includedQuantity);

        includedRemaining = Math.max(0, includedRemaining - includedQuantity);
        optionTotal += chargedQuantity * (option.price ?? 0);
      }

      return groupSum + optionTotal;
    }, 0);

    return sum + servingExtraTotal;
  }, 0);
}

function buildTicketCode(line: ShopResolvedCartLine, index: number) {
  const slug = `${line.productId}-${line.sizeOptionId}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  return `TKT-${slug}-${String(index + 1).padStart(4, "0")}`;
}

function normalizeTicketMealSelection(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: TicketAssignment["mealSelection"] = {};

  for (const [groupId, rawGroup] of Object.entries(input as Record<string, unknown>)) {
    if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup)) {
      continue;
    }

    normalized[groupId] = {};

    for (const [optionId, rawQuantity] of Object.entries(
      rawGroup as Record<string, unknown>
    )) {
      const quantity = normalizeNonNegativeInteger(rawQuantity);

      if (quantity > 0) {
        normalized[groupId][optionId] = quantity;
      }
    }
  }

  return normalized;
}

function normalizeNonNegativeInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}