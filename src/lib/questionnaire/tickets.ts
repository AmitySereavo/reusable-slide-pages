import type {
  MealMenu,
  ShopPurchaseRecipient,
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
      const ticketSelectionTimestamp =
        typeof record.ticketSelectionTimestamp === "string"
          ? record.ticketSelectionTimestamp
          : undefined;
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
        purchaseModeLabel:
          typeof record.purchaseModeLabel === "string"
            ? record.purchaseModeLabel
            : undefined,
        ticketUpgradeOverride: record.ticketUpgradeOverride === true,
        invitationDeliveryMode:
          record.invitationDeliveryMode === "physical" ? "physical" : "digital",
        ticketIndex,
        ticketSelectionTimestamp,
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
        ownerLockedFromRecipient: record.ownerLockedFromRecipient === true,
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
    const recipientAllocations = getTicketRecipientAllocations(
      line.purchaseRecipients
    );
    const recipientTicketQuantity = recipientAllocations.reduce(
      (sum, recipient) => sum + recipient.quantity,
      0
    );
    const purchaserTicketQuantity = Math.max(
      0,
      line.quantity - recipientTicketQuantity
    );
    const ownerSlots = [
      ...Array.from({ length: purchaserTicketQuantity }, () => ({
        isPurchaserTicket: true,
        ownerLockedFromRecipient: false,
        ownerName: "",
        ownerEmail: "",
        purchaseModeId: undefined as string | undefined,
        purchaseModeLabel: undefined as string | undefined,
      })),
      ...recipientAllocations.flatMap((recipient) =>
        Array.from({ length: recipient.quantity }, () => ({
          isPurchaserTicket: false,
          ownerLockedFromRecipient: true,
          ownerName: recipient.name,
          ownerEmail: recipient.email,
          purchaseModeId: recipient.purchaseModeId,
          purchaseModeLabel: recipient.purchaseModeLabel,
        }))
      ),
    ];

    for (let index = 0; index < ownerSlots.length; index += 1) {
      const ownerSlot = ownerSlots[index];
      const existing = existingAssignments.find(
        (assignment) =>
          assignment.lineKey === line.lineKey &&
          assignment.ticketIndex === index &&
          assignment.productId === line.productId &&
          assignment.sizeOptionId === line.sizeOptionId
      );
      const ticketSelectionTimestamp =
        existing?.ticketSelectionTimestamp ?? new Date().toISOString();
      const ticketCode =
        existing?.ticketCode ??
        buildTicketCode(line, index, ticketSelectionTimestamp);
      const isPurchaserTicket =
        ownerSlot.isPurchaserTicket === false
          ? false
          : existing?.isPurchaserTicket ?? true;
      const ownerName = ownerSlot.ownerName || existing?.ownerName || "";
      const ownerEmail = ownerSlot.ownerEmail || existing?.ownerEmail || "";
      const purchaseModeId =
        ownerSlot.purchaseModeId ??
        (existing?.ticketUpgradeOverride === true
          ? existing.purchaseModeId
          : line.purchaseModeId);
      const purchaseModeLabel =
        ownerSlot.purchaseModeLabel ??
        (existing?.ticketUpgradeOverride === true
          ? existing.purchaseModeLabel
          : line.purchaseModeLabel);

      nextAssignments.push({
        ticketCode,
        lineKey: line.lineKey,
        productId: line.productId,
        sizeOptionId: line.sizeOptionId,
        purchaseModeId,
        purchaseModeLabel,
        ticketUpgradeOverride: existing?.ticketUpgradeOverride === true,
        invitationDeliveryMode: existing?.invitationDeliveryMode ?? "digital",
        ticketIndex: index,
        ticketSelectionTimestamp,
        ticketLabel: `${line.sizeLabel} #${index + 1}`,
        productTitle: line.productTitle,
        ownerName,
        ownerEmail,
        ownerPhone: existing?.ownerPhone ?? "",
        purchaserContactPrefilled:
          isPurchaserTicket === false
            ? false
            : existing?.purchaserContactPrefilled,
        isPurchaserTicket,
        ownerLockedFromRecipient:
          ownerSlot.ownerLockedFromRecipient === true ||
          existing?.ownerLockedFromRecipient === true,
        emailTicketToOwner:
          ownerSlot.isPurchaserTicket === false
            ? true
            : existing?.emailTicketToOwner ?? false,
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

function getTicketRecipientAllocations(
  recipients: ShopPurchaseRecipient[] | undefined
) {
  if (!Array.isArray(recipients)) {
    return [];
  }

  return recipients
    .map((recipient) => {
      const name = String(recipient.name ?? "").trim();
      const email = String(recipient.email ?? "").trim();
      const quantity =
        typeof recipient.quantity === "number" &&
        Number.isFinite(recipient.quantity)
          ? Math.max(1, Math.floor(recipient.quantity))
          : 1;

      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return null;
      }

      return {
        name,
        email,
        quantity,
        purchaseModeId:
          typeof recipient.purchaseModeId === "string"
            ? recipient.purchaseModeId
            : undefined,
        purchaseModeLabel:
          typeof recipient.purchaseModeLabel === "string"
            ? recipient.purchaseModeLabel
            : undefined,
      };
    })
    .filter(Boolean) as Array<{
    name: string;
    email: string;
    quantity: number;
    purchaseModeId?: string;
    purchaseModeLabel?: string;
  }>;
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
      : group.billingMode === "pay"
        ? 0
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
    | "invitationDeliveryMode"
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
              : params.field === "invitationDeliveryMode"
                ? params.value === "physical"
                  ? "physical"
                  : "digital"
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
          : group.billingMode === "pay"
            ? 0
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

function buildTicketCode(
  line: ShopResolvedCartLine,
  index: number,
  selectionTimestamp: string
) {
  const selectedAt = new Date(selectionTimestamp);
  const timestamp =
    Number.isNaN(selectedAt.getTime()) ? new Date() : selectedAt;
  const productType = "INV";
  const eventMonthDay = extractMonthDay(
    `${line.productTitle} ${line.productId} ${line.sizeOptionId}`
  );
  const venue = extractVenueAbbreviation(line.productId) || "EV";
  const selectionStamp = [
    String(timestamp.getMonth() + 1).padStart(2, "0"),
    String(timestamp.getDate()).padStart(2, "0"),
    String(timestamp.getHours()).padStart(2, "0"),
    String(timestamp.getMinutes()).padStart(2, "0"),
  ].join("");
  const ticketType = abbreviateWords(line.sizeLabel || line.sizeOptionId, 2) || "TK";
  const accountHolder = "AH";

  return `${productType}${eventMonthDay}${venue}${selectionStamp}-${ticketType}${accountHolder}${index + 1}`;
}

function extractMonthDay(value: string) {
  const normalized = String(value ?? "");
  const numericDate = normalized.match(/\b(0?[1-9]|1[0-2])[-_/](0?[1-9]|[12][0-9]|3[01])\b/);

  if (numericDate) {
    return `${numericDate[1].padStart(2, "0")}${numericDate[2].padStart(2, "0")}`;
  }

  const monthNames = new Map([
    ["jan", "01"],
    ["january", "01"],
    ["feb", "02"],
    ["february", "02"],
    ["mar", "03"],
    ["march", "03"],
    ["apr", "04"],
    ["april", "04"],
    ["may", "05"],
    ["jun", "06"],
    ["june", "06"],
    ["jul", "07"],
    ["july", "07"],
    ["aug", "08"],
    ["august", "08"],
    ["sep", "09"],
    ["sept", "09"],
    ["september", "09"],
    ["oct", "10"],
    ["october", "10"],
    ["nov", "11"],
    ["november", "11"],
    ["dec", "12"],
    ["december", "12"],
  ]);
  const namedDate = normalized.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+([0-9]{1,2})\b/i
  );

  if (namedDate) {
    return `${monthNames.get(namedDate[1].toLowerCase()) ?? "00"}${namedDate[2].padStart(2, "0")}`;
  }

  return "0000";
}

function extractVenueAbbreviation(productId: string) {
  const tokens = String(productId ?? "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  const ignored = new Set(["event", "ticket", "invitation", "july"]);
  const venueTokens = tokens.filter(
    (token) => /^[a-z]+$/i.test(token) && !ignored.has(token.toLowerCase())
  );

  return venueTokens.length
    ? venueTokens
        .slice(0, 2)
        .map((token) => token.slice(0, 1))
        .join("")
        .toUpperCase()
    : "";
}

function abbreviateWords(value: string, maxLength: number) {
  const ignored = new Set([
    "the",
    "and",
    "with",
    "for",
    "event",
    "live",
    "invitation",
    "ticket",
  ]);
  const words = String(value ?? "")
    .split(/[^a-z0-9]+/i)
    .filter((word) => word && !ignored.has(word.toLowerCase()));
  const initials = words
    .map((word) => word.slice(0, 1))
    .join("")
    .toUpperCase();

  return initials.slice(0, maxLength);
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
