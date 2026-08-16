"use client";

import { useEffect, useMemo, useState } from "react";

const SEEDS_PER_CALLOO_PARCEL = 10;
const AVAILABILITY_STORAGE_KEY = "paralife:dashboard:planning-confirmations";

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function findCallalooDeliveryPlan(value, depth = 0) {
  if (!value || depth > 5) return [];

  if (Array.isArray(value)) {
    const looksLikePlan = value.some(
      (entry) => isRecord(entry) && (entry.deliveryDate || entry.deliveryLabel)
    );

    if (looksLikePlan) return value.filter(isRecord);

    return value.flatMap((entry) => findCallalooDeliveryPlan(entry, depth + 1));
  }

  if (!isRecord(value)) return [];

  if (Array.isArray(value.callalooDeliveryPlan)) {
    return value.callalooDeliveryPlan.filter(isRecord);
  }

  for (const child of Object.values(value)) {
    const result = findCallalooDeliveryPlan(child, depth + 1);
    if (result.length) return result;
  }

  return [];
}

function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function nearestWeekday(date, targetDay, hour = 8) {
  const day = date.getDay();
  const forward = (targetDay - day + 7) % 7;
  const backward = forward === 0 ? 0 : forward - 7;
  const offset = Math.abs(backward) <= Math.abs(forward) ? backward : forward;
  const next = addDays(date, offset);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function formatDate(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "Not dated";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "Not dated";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isTodayOrTomorrow(value, { includeOverdue = false } = {}) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return false;

  const today = startOfDay(new Date());
  const tomorrowEnd = endOfDay(addDays(today, 1));

  if (includeOverdue && date < today) return true;

  return date >= today && date <= tomorrowEnd;
}

function formatDueLabel(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDiff = Math.round((target - today) / 86400000);

  if (dayDiff < 0) {
    const overdueDays = Math.abs(dayDiff);
    return overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`;
  }

  if (dayDiff === 0) return "Due today";
  if (dayDiff === 1) return "Due tomorrow";
  if (dayDiff <= 7) return `Within ${dayDiff} days`;

  return `In ${dayDiff} days`;
}

function toDateInputValue(value = new Date()) {
  const date = value instanceof Date ? value : parseDate(value) || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : parseDate(value) || new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function canCompleteTask(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() <= startOfDay(new Date()).getTime();
}

function getDefaultCompletionDraft(task) {
  return {
    performedDate: toDateInputValue(task?.date || new Date()),
    performedTime: toTimeInputValue(new Date()),
    notes: "",
  };
}

function formatMoney(currencyCode, value) {
  const currency = currencyCode || "JMD";
  const amount = Number(value || 0);

  if (currency === "JMD") {
    return `JMD $${Math.round(amount).toLocaleString("en-JM")}`;
  }

  return `${currency} ${amount.toLocaleString()}`;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function prepLabel(value) {
  const labels = {
    fresh_bundle: "Fresh bundle",
    cleaned_chopped: "Cleaned and chopped",
    cleaned_chopped_seasoned: "Cleaned, chopped and seasoned",
  };

  return labels[value] || String(value || "Format not selected");
}

function shopLabel(item) {
  const slug = String(item.metadata?.questionnaireSlug || item.sourceType || "");
  const labels = {
    callaloo: "Callaloo Subscription",
    "garden-package": "Garden Package",
    "seedling-shop": "Seedling Shop",
    "little-orchard-shop": "Little Orchard Shop",
  };

  return labels[slug] || labels[item.sourceType] || "Shop order";
}

function isPaymentConfirmed(item) {
  return item?.metadata?.paymentStatus === "PAYMENT_CONFIRMED";
}

function isAdminTestTransaction(item) {
  const metadata = isRecord(item?.metadata) ? item.metadata : {};

  return (
    metadata.isAdminTestTransaction === true ||
    metadata.testMode === true ||
    metadata.transactionMode === "admin_test"
  );
}

function stageLabel({ now, sowingDate, transplantDate, deliveryDate }) {
  const germinatedDate = addDays(sowingDate, 7);
  const harvestDate = new Date(deliveryDate);
  harvestDate.setHours(7, 0, 0, 0);

  if (now < sowingDate) return "Needs sowing";
  if (now < germinatedDate) return "Sown / awaiting germination";
  if (now < transplantDate) return "Germinated / readying for transplant";
  if (now < harvestDate) return "Transplanted / growing to harvest";
  return "Harvest and prep due";
}

function getOrderPlanningBlocks(items) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const seenOrders = new Set();
  const blocks = [];

  for (const item of items) {
    if (!isPaymentConfirmed(item)) {
      continue;
    }

    const metadata = isRecord(item.metadata) ? item.metadata : {};
    const plan = findCallalooDeliveryPlan(metadata);
    const orderKey = item.orderCode || item.id;
    const isTest = isAdminTestTransaction(item);

    if (plan.length && !seenOrders.has(orderKey)) {
      seenOrders.add(orderKey);
      plan.forEach((block, index) => {
        const deliveryDate = parseDate(block.deliveryDate);
        if (!deliveryDate || deliveryDate < todayStart) return;

        const parcelQuantity = Math.max(
          0,
          Math.floor(Number(block.parcelQuantity || block.quantity || 0))
        );
        if (!parcelQuantity) return;

        const sowingDate = nearestWeekday(addMonths(deliveryDate, -3), 6, 8);
        const transplantDate = nearestWeekday(addDays(sowingDate, 21), 0, 8);

        blocks.push({
          key: `${orderKey}:callaloo:${block.id || index}`,
          source: shopLabel(item),
          orderCode: item.orderCode || "No order code",
          customerName: item.recipientName || "No customer name",
          productTitle: "Callaloo subscription",
          deliveryDate,
          deliveryLabel: block.deliveryLabel || formatDate(deliveryDate),
          useLabel: block.useLabel || "",
          prepFormat: prepLabel(block.prepFormat),
          parcelQuantity,
          seedCount: parcelQuantity * SEEDS_PER_CALLOO_PARCEL,
          sowingDate,
          transplantDate,
          stage: stageLabel({
            now: new Date(),
            sowingDate,
            transplantDate,
            deliveryDate,
          }),
          note: block.customerNote || "",
          lineTotal: Number(block.lineTotal || 0),
          currencyCode: item.currencyCode || "JMD",
          isTestTransaction: isTest,
        });
      });

      continue;
    }

    const estimatedDeliveryAt = parseDate(item.estimatedDeliveryAt);
    if (estimatedDeliveryAt && estimatedDeliveryAt >= todayStart) {
      blocks.push({
        key: `${item.id}:estimated-delivery`,
        source: shopLabel(item),
        orderCode: item.orderCode || "No order code",
        customerName: item.recipientName || "No customer name",
        productTitle: item.productTitle || "Order item",
        deliveryDate: estimatedDeliveryAt,
        deliveryLabel: formatDate(estimatedDeliveryAt),
        useLabel: "",
        prepFormat: item.sizeLabel || item.purchaseModeLabel || "",
        parcelQuantity: Number(item.quantity || 0),
        seedCount: 0,
        sowingDate: null,
        transplantDate: null,
        stage: "Scheduled delivery",
        note: item.fulfillmentNotes || "",
        lineTotal: Number(item.lineTotal || 0),
        currencyCode: item.currencyCode || "JMD",
        isTestTransaction: isTest,
      });
    }
  }

  return blocks.sort((first, second) => second.deliveryDate - first.deliveryDate);
}

function getStoreProductionPlanningBlocks(plan) {
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];

  return blocks
    .map((block) => ({
      key: block.key,
      source: block.source || "Garden Package",
      orderCode: block.orderCode || block.packageTarget || "Store Package",
      customerName: block.customerName || "Store Package",
      productTitle: block.productTitle || "Production task",
      deliveryDate: parseDate(block.deliveryDate),
      deliveryLabel: block.deliveryLabel || "",
      useLabel: block.useLabel || "",
      prepFormat: block.prepFormat || "",
      parcelQuantity: Number(block.parcelQuantity || 0),
      seedCount: Number(block.seedCount || 0),
      productionQuantity: Number(block.productionQuantity || 0),
      productionUnitLabel: block.productionUnitLabel || "starts",
      productionSource: block.productionSource || "Store Package",
      propagationMethod: block.propagationMethod || "",
      packageTarget: block.packageTarget || "",
      propagationDate: parseDate(block.propagationDate),
      sowingDate: parseDate(block.sowingDate),
      transplantDate: parseDate(block.transplantDate),
      targetReadyDate: parseDate(block.targetReadyDate),
      stage: block.stage || "Planned store production",
      note: block.note || "",
      lineTotal: Number(block.lineTotal || 0),
      currencyCode: block.currencyCode || "JMD",
      isStoreProduction: true,
    }))
    .filter(
      (block) =>
        block.deliveryDate ||
        block.sowingDate ||
        block.propagationDate ||
        block.transplantDate ||
        block.targetReadyDate
    );
}

function getBatchProductionPlanningBlocks(plan) {
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];

  return blocks
    .map((block) => ({
      key: block.key,
      source: block.source || "Batch Plan",
      sourceType: "batch",
      orderCode: block.orderCode || block.batchName || "Batch",
      customerName: block.customerName || block.batchPurpose?.label || "Batch Plan",
      productTitle: block.productTitle || "Batch item",
      batchId: block.batchId || "",
      batchName: block.batchName || "",
        batchPurpose: block.batchPurpose || null,
        actionDate: parseDate(block.actionDate),
        actionDay: Number(block.actionDay || 0),
      actionType: block.actionType || "",
      treatment: block.treatment || "",
      instruction: block.instruction || "",
      quantityInstruction: block.quantityInstruction || "",
      strength: block.strength || "",
      applicationMethod: block.applicationMethod || "",
      stageCheckRequired: Boolean(block.stageCheckRequired),
      deliveryDate: parseDate(block.deliveryDate),
      deliveryLabel: block.deliveryLabel || "",
      prepFormat: block.prepFormat || "",
        parcelQuantity: Number(block.parcelQuantity || 0),
        seedCount: Number(block.seedCount || 0),
        productionQuantity: Number(block.productionQuantity || 0),
        batchQuantityStarted: Number(block.productionQuantity || block.parcelQuantity || 0),
        productionUnitLabel: block.productionUnitLabel || "starts",
      productionSource: block.productionSource || "Batch Plan",
      propagationMethod: block.propagationMethod || "",
      sowingDate: parseDate(block.sowingDate),
      propagationDate: parseDate(block.propagationDate),
      transplantDate: parseDate(block.transplantDate),
      stage: block.stage || "Batch timeline action",
      note: block.note || "",
      lineTotal: Number(block.lineTotal || 0),
      currencyCode: block.currencyCode || "JMD",
      isBatchPlan: true,
    }))
    .filter(
      (block) =>
        block.actionDate ||
        block.sowingDate ||
        block.propagationDate ||
        block.transplantDate
    );
}

function groupByDate(blocks, dateField, sortDirection = "desc") {
  const sortMultiplier = sortDirection === "asc" ? 1 : -1;

  return Array.from(
    blocks.reduce((groups, block) => {
      const date = block[dateField];
      if (!date) return groups;

      const key = dateKey(date);
      const current =
        groups.get(key) || {
          key,
          date,
          parcels: 0,
          seeds: 0,
          blocks: [],
        };

      current.parcels += Number(block.parcelQuantity || 0);
      current.seeds += Number(block.seedCount || 0);
      current.blocks.push(block);
      groups.set(key, current);

      return groups;
    }, new Map()).values()
  )
    .map((group) => ({
      ...group,
      blocks: group.blocks.sort((first, second) => {
        const firstDate = first[dateField] || first.deliveryDate;
        const secondDate = second[dateField] || second.deliveryDate;

        return (firstDate - secondDate) * sortMultiplier;
      }),
    }))
    .sort((first, second) => (first.date - second.date) * sortMultiplier);
}

function makeImmediatePlanningTasks(planningBlocks) {
  return planningBlocks.flatMap((block) => {
    const tasks = [];

    if (isTodayOrTomorrow(block.sowingDate, { includeOverdue: true })) {
      tasks.push({
        key: `${block.key}:sowing`,
        type: "Seed sowing",
        date: block.sowingDate,
        title: block.productTitle,
        customerName: block.customerName,
        source: block.source,
        orderCode: block.orderCode,
        detail: `${block.seedCount} seeds for ${block.parcelQuantity} parcel(s)`,
        note: block.note,
        isTestTransaction: block.isTestTransaction,
        batchTask: getBatchTaskPayload(block),
      });
    }

    if (isTodayOrTomorrow(block.transplantDate, { includeOverdue: true })) {
      tasks.push({
        key: `${block.key}:transplant`,
        type: "Transplant",
        date: block.transplantDate,
        title: block.productTitle,
        customerName: block.customerName,
        source: block.source,
        orderCode: block.orderCode,
        detail: `${block.seedCount} seedlings for ${block.parcelQuantity} parcel(s)`,
        note: block.note,
        isTestTransaction: block.isTestTransaction,
        batchTask: getBatchTaskPayload(block),
      });
    }

    if (isTodayOrTomorrow(block.propagationDate, { includeOverdue: true })) {
      tasks.push({
        key: `${block.key}:propagation`,
        type: "Propagation",
        date: block.propagationDate,
        title: block.productTitle,
        customerName: block.customerName,
        source: block.source,
        orderCode: block.orderCode,
        detail: `${block.productionQuantity} ${block.productionUnitLabel}`,
        note: block.note,
        isTestTransaction: block.isTestTransaction,
        batchTask: getBatchTaskPayload(block),
      });
    }

    if (
      block.isBatchPlan &&
      block.actionDate &&
      !block.sowingDate &&
      !block.propagationDate &&
      !block.transplantDate &&
      isTodayOrTomorrow(block.actionDate, { includeOverdue: true })
    ) {
      const treatment = block.treatment ? ` - ${block.treatment}` : "";
      const quantityText = block.batchQuantityStarted
        ? `Qty sown: ${block.batchQuantityStarted.toLocaleString("en-JM")}`
        : "";
      tasks.push({
        key: `${block.key}:batch-action`,
        type: "Batch action",
        date: block.actionDate,
        title: `${block.productTitle} - Day ${block.actionDay}`,
        customerName: block.batchName || block.customerName,
        source: block.source,
        orderCode: block.orderCode,
        detail: [quantityText, `${block.actionType}${treatment}`]
          .filter(Boolean)
          .join(" - "),
        note: [
          block.instruction,
          block.quantityInstruction ? `Quantity: ${block.quantityInstruction}` : "",
          block.strength ? `Strength: ${block.strength}` : "",
          block.applicationMethod ? `Method: ${block.applicationMethod}` : "",
          block.note,
        ]
          .filter(Boolean)
          .join("\n"),
        isTestTransaction: block.isTestTransaction,
        batchTask: getBatchTaskPayload(block),
      });
    }

    if (isTodayOrTomorrow(block.deliveryDate, { includeOverdue: true })) {
      tasks.push({
        key: `${block.key}:delivery`,
        type: "Delivery",
        date: block.deliveryDate,
        title: block.productTitle,
        customerName: block.customerName,
        source: block.source,
        orderCode: block.orderCode,
        detail: `${block.parcelQuantity} parcel(s) - ${block.prepFormat}`,
        note: block.note,
        isTestTransaction: block.isTestTransaction,
        batchTask: getBatchTaskPayload(block),
      });
    }

    return tasks;
  });
}

function getBatchTaskPayload(block) {
  if (!block?.isBatchPlan || !block.batchId) return null;

  return {
    batchId: block.batchId,
    timelineTaskKey: block.key,
    actionDate: block.actionDate || block.sowingDate || block.propagationDate || block.transplantDate,
    actionDay: block.actionDay,
    actionType: block.actionType || block.stage || "Task",
    treatment: block.treatment || "",
    instruction: block.instruction || block.note || "",
    plantName: block.productTitle || "",
  };
}

function makeCompletedBatchTasks(batchProductionPlan) {
  const tasks = Array.isArray(batchProductionPlan?.completedTimelineTasks)
    ? batchProductionPlan.completedTimelineTasks
    : [];

  return tasks
    .map((task) => {
      const performedAt = parseDate(task.performedAt);
      if (!performedAt || !isTodayOrTomorrow(performedAt)) return null;
      const treatment = task.treatment ? ` - ${task.treatment}` : "";

      return {
        key: `${task.key}:completed:${task.activityId || task.performedAt}`,
        type: "Batch action",
        date: performedAt,
        title: `${task.productTitle} - Day ${task.actionDay || "?"}`,
        customerName: task.batchName || task.customerName,
        source: task.source || "Plant Batch",
        orderCode: task.batchName || "",
        detail: `${task.actionType}${treatment}`,
        note: task.notes || task.instruction || "",
        recordedAt: parseDate(task.enteredAt),
      };
    })
    .filter(Boolean);
}

function saveCompletedBatchTask(task, completionDraft) {
  const performedDate =
    completionDraft?.performedDate || toDateInputValue(task?.date || new Date());
  const performedTime =
    completionDraft?.performedTime || toTimeInputValue(new Date());
  const adminNotes = String(completionDraft?.notes || "").trim();

  return fetch("/api/dashboard/seedling-batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      action: "record-activity",
      batchId: task.batchTask.batchId,
      actionType: "custom",
      customActionTitle: `${task.batchTask.actionType} completed`,
      performedDate,
      performedTime,
      notes: [
        "Confirmed scheduled production timeline task.",
        task.batchTask.plantName ? `Plant: ${task.batchTask.plantName}.` : "",
        task.batchTask.actionDay ? `Day: ${task.batchTask.actionDay}.` : "",
        task.batchTask.treatment ? `Treatment: ${task.batchTask.treatment}.` : "",
        task.batchTask.instruction
          ? `Instruction: ${task.batchTask.instruction}`
          : "",
        adminNotes ? `Admin note: ${adminNotes}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      metadata: {
        source: "plant-production-timeline",
        completionStatus: "done",
        timelineTaskKey: task.batchTask.timelineTaskKey,
        timelineActionDate: task.batchTask.actionDate,
        timelineActionDay: task.batchTask.actionDay,
        timelineActionType: task.batchTask.actionType,
        timelineTreatment: task.batchTask.treatment,
        timelineInstruction: task.batchTask.instruction,
      },
    }),
  });
}

function makeImmediateFollowUpTasks(people) {
  const seen = new Set();

  return people.flatMap((person) => {
    const profile = person.peopleProfile || {};
    const status = profile.followUpStatus || {};
    const dueAt = parseDate(status.dueAt);

    if (!dueAt || !isTodayOrTomorrow(dueAt, { includeOverdue: true })) {
      return [];
    }

    const key = `${person.kind || "person"}:${person.id || person.rowKey || person.contact?.email || person.contact?.phone}`;
    if (seen.has(key)) return [];
    seen.add(key);

    return [
      {
        key: `${key}:follow-up`,
        type: "People follow-up",
        date: dueAt,
        title: person.contact?.name || person.name || "Unnamed person",
        customerName: person.contact?.phone || person.contact?.email || "No contact recorded",
        source: person.bucket || profile.bucket || person.kind || "People",
        orderCode: "",
        detail: status.label || "Follow-up due",
        note: person.latestConversationNote?.summary || "",
        href: "/dashboard/people",
      },
    ];
  });
}

function sortImmediateTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstTime = new Date(first.date || 0).getTime();
    const secondTime = new Date(second.date || 0).getTime();

    if (firstTime !== secondTime) return firstTime - secondTime;
    return String(first.type).localeCompare(String(second.type));
  });
}

export default function PlanningManager({ view }) {
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [storeProductionPlan, setStoreProductionPlan] = useState(null);
  const [batchProductionPlan, setBatchProductionPlan] = useState(null);
  const [status, setStatus] = useState("Loading planning data...");
  const [confirmations, setConfirmations] = useState({});
  const [sortDirection, setSortDirection] = useState("desc");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingTaskKey, setSavingTaskKey] = useState("");
  const [completionDrafts, setCompletionDrafts] = useState({});
  const [openCompletionTaskKey, setOpenCompletionTaskKey] = useState("");
  const [todayTomorrowTaskType, setTodayTomorrowTaskType] = useState("Delivery");
  const [bulkCompletionDraft, setBulkCompletionDraft] = useState(() =>
    getDefaultCompletionDraft()
  );
  const [bulkCompletionOpen, setBulkCompletionOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
      if (saved) setConfirmations(JSON.parse(saved));
    } catch {
      setConfirmations({});
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AVAILABILITY_STORAGE_KEY,
        JSON.stringify(confirmations)
      );
    } catch {
      // Local confirmation is still useful even when storage is unavailable.
    }
  }, [confirmations]);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("Loading planning data...");
      const [ordersResponse, productionResponse, peopleResponse] = await Promise.all([
        fetch("/api/dashboard/orders", {
          credentials: "same-origin",
        }),
        fetch("/api/dashboard/production-planning", {
          credentials: "same-origin",
        }),
        view === "today-tomorrow"
          ? fetch("/api/dashboard/people?limit=100", {
              credentials: "same-origin",
            })
          : Promise.resolve(null),
      ]);
      const payload = await ordersResponse.json().catch(() => ({}));
      const productionPayload = await productionResponse.json().catch(() => ({}));
      const peoplePayload = peopleResponse
        ? await peopleResponse.json().catch(() => ({}))
        : {};

      if (!active) return;

      if (!ordersResponse.ok) {
        setStatus(payload?.error || "Planning data could not be loaded.");
        return;
      }

      if (!productionResponse.ok) {
        setStatus(
          productionPayload?.error || "Production planning data could not be loaded."
        );
        return;
      }

      if (peopleResponse && !peopleResponse.ok) {
        setStatus(peoplePayload?.error || "People follow-ups could not be loaded.");
        return;
      }

      setItems(payload.items || []);
      setStoreProductionPlan(
        productionPayload.gardenPackageStoreProduction || null
      );
      setBatchProductionPlan(productionPayload.batchProductionPlanning || null);
      setPeople(peoplePayload.people || []);
      setStatus("");
    }

    void load();

    return () => {
      active = false;
    };
  }, [view, refreshKey]);

  const customerPlanningBlocks = useMemo(
    () => getOrderPlanningBlocks(items),
    [items]
  );
  const storeProductionBlocks = useMemo(
    () => getStoreProductionPlanningBlocks(storeProductionPlan),
    [storeProductionPlan]
  );
  const batchProductionBlocks = useMemo(
    () => getBatchProductionPlanningBlocks(batchProductionPlan),
    [batchProductionPlan]
  );
  const planningBlocks = useMemo(
    () => [
      ...customerPlanningBlocks,
      ...storeProductionBlocks,
      ...batchProductionBlocks,
    ],
    [customerPlanningBlocks, storeProductionBlocks, batchProductionBlocks]
  );
  const deliveryGroups = useMemo(
    () => groupByDate(customerPlanningBlocks, "deliveryDate", sortDirection),
    [customerPlanningBlocks, sortDirection]
  );
  const storeProductionGroups = useMemo(
    () => groupByDate(storeProductionBlocks, "deliveryDate", sortDirection),
    [storeProductionBlocks, sortDirection]
  );
  const sowingGroups = useMemo(
    () =>
      groupByDate(
        planningBlocks.filter((block) => block.sowingDate),
        "sowingDate",
        sortDirection
      ),
    [planningBlocks, sortDirection]
  );
  const transplantGroups = useMemo(
    () =>
      groupByDate(
        planningBlocks.filter((block) => block.transplantDate),
        "transplantDate",
        sortDirection
      ),
    [planningBlocks, sortDirection]
  );
  const propagationGroups = useMemo(
    () =>
      groupByDate(
        planningBlocks.filter((block) => block.propagationDate),
        "propagationDate",
        sortDirection
      ),
    [planningBlocks, sortDirection]
  );
  const immediateTasks = useMemo(
    () =>
      sortImmediateTasks([
        ...makeImmediatePlanningTasks(planningBlocks),
        ...makeImmediateFollowUpTasks(people),
      ]),
    [planningBlocks, people]
  );
  const completedTasks = useMemo(
    () => sortImmediateTasks(makeCompletedBatchTasks(batchProductionPlan)),
    [batchProductionPlan]
  );

  function updateCompletionDraft(task, key, value) {
    if (!task?.key) return;
    setCompletionDrafts((current) => ({
      ...current,
      [task.key]: {
        ...getDefaultCompletionDraft(task),
        ...(current[task.key] || {}),
        [key]: value,
      },
    }));
  }

  function toggleCompletionForm(task) {
    if (!task?.key) return;
    setCompletionDrafts((current) => ({
      ...current,
      [task.key]: current[task.key] || getDefaultCompletionDraft(task),
    }));
    setOpenCompletionTaskKey((current) => (current === task.key ? "" : task.key));
  }

  async function completeBatchTask(task) {
    if (!task?.batchTask?.batchId || !canCompleteTask(task.date)) return;

    const completionDraft =
      completionDrafts[task.key] || getDefaultCompletionDraft(task);
    setSavingTaskKey(task.key);
    setStatus("");

    const response = await saveCompletedBatchTask(task, completionDraft);
    const payload = await response.json().catch(() => ({}));
    setSavingTaskKey("");

    if (!response.ok) {
      setStatus(payload?.error || "Task could not be completed.");
      return;
    }

    setRefreshKey((value) => value + 1);
    setOpenCompletionTaskKey("");
    setCompletionDrafts((current) => {
      const next = { ...current };
      delete next[task.key];
      return next;
    });
  }

  async function completeBatchTasks(tasksToComplete) {
    const completableTasks = tasksToComplete.filter(
      (task) => task?.batchTask?.batchId && canCompleteTask(task.date)
    );
    if (!completableTasks.length) return;

    setSavingTaskKey("bulk");
    setStatus("");

    for (const task of completableTasks) {
      const response = await saveCompletedBatchTask(task, bulkCompletionDraft);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSavingTaskKey("");
        setStatus(payload?.error || "One of the selected tasks could not be completed.");
        return;
      }
    }

    setSavingTaskKey("");
    setBulkCompletionOpen(false);
    setBulkCompletionDraft(getDefaultCompletionDraft());
    setRefreshKey((value) => value + 1);
  }

  if (status) {
    return <div style={styles.status}>{status}</div>;
  }

  if (view === "today-tomorrow") {
    return (
      <TodayTomorrowPanel
        tasks={immediateTasks}
        completedTasks={completedTasks}
        onCompleteBatchTask={completeBatchTask}
        onCompleteBatchTasks={completeBatchTasks}
        onToggleCompletionForm={toggleCompletionForm}
        onUpdateCompletionDraft={updateCompletionDraft}
        bulkCompletionDraft={bulkCompletionDraft}
        setBulkCompletionDraft={setBulkCompletionDraft}
        bulkCompletionOpen={bulkCompletionOpen}
        setBulkCompletionOpen={setBulkCompletionOpen}
        completionDrafts={completionDrafts}
        openCompletionTaskKey={openCompletionTaskKey}
        activeType={todayTomorrowTaskType}
        setActiveType={setTodayTomorrowTaskType}
        savingTaskKey={savingTaskKey}
      />
    );
  }

  if (view === "sowing") {
    return (
      <PlanningLayout
        title="Upcoming seed sowing"
        description="Seeds are planned for Saturdays. Callaloo subscriptions use 10 seeds per ordered parcel so there is room for germination loss."
        groups={sowingGroups}
        emptyText="No upcoming seed sowing tasks are planned yet."
        primaryMetric={(group) => `${group.seeds} seeds`}
        secondaryMetric={(group) => `${group.parcels} parcel(s) covered`}
        confirmations={confirmations}
        setConfirmations={setConfirmations}
        confirmationLabel="Confirm seeds prepared"
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        showPlannedUse={true}
        showSeedCounts={true}
      />
    );
  }

  if (view === "transplant") {
    return (
      <PlanningLayout
        title="Upcoming transplant"
        description="Transplant work is grouped to Sundays so soil, containers, labels, and nursery space can be prepared before the week starts."
        groups={transplantGroups}
        emptyText="No upcoming transplant tasks are planned yet."
        primaryMetric={(group) => `${group.seeds} seedlings`}
        secondaryMetric={(group) => `${group.parcels} parcel(s) covered`}
        confirmations={confirmations}
        setConfirmations={setConfirmations}
        confirmationLabel="Confirm seedlings available"
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        showPlannedUse={true}
        showSeedCounts={true}
      />
    );
  }

  if (view === "propagation") {
    return (
      <PlanningLayout
        title="Upcoming propagation"
        description="Non-seed propagation tasks such as cuttings, air layers, suckers, divisions, grafting, and custom starts."
        groups={propagationGroups}
        emptyText="No upcoming non-seed propagation tasks are planned yet."
        primaryMetric={(group) =>
          `${group.blocks.reduce(
            (sum, block) => sum + Number(block.productionQuantity || 0),
            0
          )} starts`
        }
        secondaryMetric={(group) => `${group.blocks.length} production task(s)`}
        confirmations={confirmations}
        setConfirmations={setConfirmations}
        confirmationLabel="Confirm propagation started"
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        showPlannedUse={false}
        showSeedCounts={false}
        showProductionQuantity={true}
      />
    );
  }

  if (view === "store-production") {
    return (
      <PlanningLayout
        title="Store production"
        description="Production targets the store is making for future stock, separate from paid customer delivery commitments."
        groups={storeProductionGroups}
        emptyText="No store-production targets are planned yet."
        primaryMetric={(group) => `${group.blocks.length} store target(s)`}
        secondaryMetric={(group) =>
          `${group.blocks.reduce(
            (sum, block) => sum + Number(block.productionQuantity || block.parcelQuantity || 0),
            0
          )} planned starts/items`
        }
        confirmations={confirmations}
        setConfirmations={setConfirmations}
        confirmationLabel="Confirm production capacity"
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        showPlannedUse={false}
        showSeedCounts={false}
        showProductionQuantity={true}
      />
    );
  }

  return (
    <PlanningLayout
      title="Upcoming deliveries"
      description="Delivery work is grouped across shops so one delivery day shows paid-confirmed customer commitments in one place."
      groups={deliveryGroups}
      emptyText="No upcoming deliveries are planned yet."
      primaryMetric={(group) => `${group.blocks.length} delivery block(s)`}
      secondaryMetric={(group) => `${group.parcels} parcel(s)`}
      confirmations={confirmations}
      setConfirmations={setConfirmations}
      confirmationLabel="Confirm delivery capacity"
      sortDirection={sortDirection}
      setSortDirection={setSortDirection}
      showPlannedUse={false}
      showSeedCounts={false}
    />
  );
}

function PlanningLayout({
  title,
  description,
  groups,
  emptyText,
  primaryMetric,
  secondaryMetric,
  confirmations,
  setConfirmations,
  confirmationLabel,
  sortDirection,
  setSortDirection,
  showPlannedUse = true,
  showSeedCounts = true,
  showProductionQuantity = false,
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span style={styles.badge}>{groups.length} day(s)</span>
      </div>

      <div style={styles.sortControl}>
        <span>Date order</span>
        <div style={styles.sortButtonGroup}>
          <button
            type="button"
            onClick={() => setSortDirection("desc")}
            style={
              sortDirection === "desc"
                ? styles.sortButtonActive
                : styles.sortButton
            }
          >
            Newest first
          </button>
          <button
            type="button"
            onClick={() => setSortDirection("asc")}
            style={
              sortDirection === "asc"
                ? styles.sortButtonActive
                : styles.sortButton
            }
          >
            Earliest first
          </button>
        </div>
      </div>

      {groups.length ? (
        <div style={styles.dayList}>
          {groups.map((group, index) => (
            <section key={group.key} style={styles.dayCard}>
              <div style={styles.dayHeader}>
                <div style={styles.dateTitleStack}>
                  <strong>{formatDate(group.date)}</strong>
                  <span style={styles.dueLabel}>{formatDueLabel(group.date)}</span>
                </div>
                <span>{primaryMetric(group)}</span>
              </div>
              <div style={styles.muted}>{secondaryMetric(group)}</div>
              <label style={styles.label}>
                {confirmationLabel}
                <input
                  type="number"
                  min="0"
                  value={confirmations[group.key] || ""}
                  onChange={(event) =>
                    setConfirmations((current) => ({
                      ...current,
                      [group.key]: event.target.value,
                    }))
                  }
                  placeholder="Admin confirmed count"
                  style={styles.input}
                />
              </label>
              <details style={styles.orderDetails} open={index === 0}>
                <summary style={styles.orderDetailsSummary}>
                  Show exact orders ({group.blocks.length})
                </summary>
                <div style={styles.blockList}>
                  {group.blocks.map((block) => (
                    <PlanningBlockCard
                      key={block.key}
                      block={block}
                      showPlannedUse={showPlannedUse}
                      showSeedCounts={showSeedCounts}
                      showProductionQuantity={showProductionQuantity}
                    />
                  ))}
                </div>
              </details>
            </section>
          ))}
        </div>
      ) : (
        <div style={styles.empty}>{emptyText}</div>
      )}
    </section>
  );
}

function PlanningBlockCard({
  block,
  showPlannedUse,
  showSeedCounts,
  showProductionQuantity,
}) {
  const sourceLabel = block.isStoreProduction
    ? "Store Package"
    : block.isBatchPlan
      ? "Plant Batch"
      : block.source;
  const quantityText = getBlockQuantityText({
    block,
    showSeedCounts,
    showProductionQuantity,
  });
  const contextLines = getBlockContextLines(block, {
    showPlannedUse,
  });
  const note = getConciseBlockNote(block);
  const visibleContextLines = contextLines.filter((line) => line.visible);
  const detailContextLines = contextLines.filter((line) => !line.visible);
  const hasDetails = detailContextLines.length > 0 || note;

  return (
    <article style={styles.blockCard}>
      <div style={styles.compactCardHeader}>
        <strong>
          {block.productTitle}
          {block.isTestTransaction ? (
            <span style={styles.testBadge}>Admin test</span>
          ) : null}
        </strong>
        <span style={styles.sourceBadge}>{sourceLabel}</span>
      </div>
      {block.isTestTransaction ? (
        <div style={styles.testNotice}>
          Test transaction. Not a real delivery and should be excluded from
          profit and loss.
        </div>
      ) : null}
      <div style={styles.taskLine}>{quantityText}</div>
      {visibleContextLines.length ? (
        <div style={styles.compactMetaList}>
          {visibleContextLines.map((line) => (
            <div key={line.label} style={styles.compactMetaRow}>
              <span style={styles.compactMetaLabel}>{line.label}</span>
              <span style={styles.compactMetaValue}>{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {hasDetails ? (
        <details style={styles.compactDetails}>
          <summary style={styles.compactDetailsSummary}>Details</summary>
          {detailContextLines.length ? (
            <div style={styles.compactMetaList}>
              {detailContextLines.map((line) => (
                <div key={line.label} style={styles.compactMetaRow}>
                  <span style={styles.compactMetaLabel}>{line.label}</span>
                  <span style={styles.compactMetaValue}>{line.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {note ? <p style={styles.note}>{note}</p> : null}
        </details>
      ) : null}
    </article>
  );
}

function getBlockQuantityText({
  block,
  showSeedCounts,
  showProductionQuantity,
}) {
  if (showProductionQuantity && block.productionQuantity) {
    return `${block.productionQuantity} ${block.productionUnitLabel}`;
  }

  if (showSeedCounts && block.seedCount) {
    return `${block.seedCount} seeds`;
  }

  if (block.parcelQuantity) {
    const unitLabel =
      block.sourceType === "batch" || block.isBatchPlan
        ? "plant(s)"
        : "parcel/item unit(s)";
    return `${block.parcelQuantity} ${unitLabel}`;
  }

  return "Quantity not recorded";
}

function getBlockContextLines(block, { showPlannedUse }) {
  const lines = [];

  if (!block.isStoreProduction && !block.isBatchPlan && block.customerName) {
    lines.push({ label: "Customer", value: block.customerName, visible: true });
  }

  if (block.orderCode && !block.isStoreProduction && !block.isBatchPlan) {
    lines.push({ label: "Record", value: block.orderCode, visible: false });
  }

  if (block.deliveryLabel && !block.isStoreProduction) {
    lines.push({
      label: block.isBatchPlan ? "Available" : "Delivery",
      value: block.deliveryLabel,
      visible: false,
    });
  }

  if (block.prepFormat && !block.isBatchPlan) {
    lines.push({ label: "Format", value: block.prepFormat, visible: true });
  }

  if (showPlannedUse && block.useLabel) {
    lines.push({ label: "Planned use", value: block.useLabel, visible: true });
  }

  if (block.packageTarget && block.isStoreProduction) {
    lines.push({ label: "For", value: block.packageTarget, visible: false });
  }

  if (block.batchName && block.batchName !== block.orderCode) {
    lines.push({ label: "Batch", value: block.batchName, visible: false });
  }

  if (block.lineTotal) {
    lines.push({
      label: "Value",
      value: formatMoney(block.currencyCode, block.lineTotal),
      visible: true,
    });
  }

  return lines;
}

function getConciseBlockNote(block) {
  if (!block.note) return "";

  const matureMatch = String(block.note).match(
    /(\d+\s+mature\s+plant\(s\)\s+required)/i
  );
  if (matureMatch && block.isStoreProduction) {
    return matureMatch[1].replace(/^./, (letter) => letter.toUpperCase()) + ".";
  }

  return block.note;
}

function TodayTomorrowPanel({
  tasks,
  completedTasks,
  onCompleteBatchTask,
  onCompleteBatchTasks,
  onToggleCompletionForm,
  onUpdateCompletionDraft,
  bulkCompletionDraft,
  setBulkCompletionDraft,
  bulkCompletionOpen,
  setBulkCompletionOpen,
  completionDrafts,
  openCompletionTaskKey,
  activeType,
  setActiveType,
  savingTaskKey,
}) {
  const taskTypes = [
    "Delivery",
    "Seed sowing",
    "Propagation",
    "Transplant",
    "Batch action",
    "People follow-up",
  ];
  const selectedType = taskTypes.includes(activeType) ? activeType : taskTypes[0];
  const groupedTasks = taskTypes.map((type) => ({
    type,
    tasks: tasks.filter((task) => task.type === type),
  }));
  const groupedCompletedTasks = taskTypes.map((type) => ({
    type,
    tasks: completedTasks.filter((task) => task.type === type),
  }));
  const selectedActiveTasks =
    groupedTasks.find((group) => group.type === selectedType)?.tasks || [];
  const selectedCompletedTasks =
    groupedCompletedTasks.find((group) => group.type === selectedType)?.tasks || [];
  const selectedActiveTaskKeySignature = selectedActiveTasks
    .map((task) => task.key)
    .join("|");
  const [selectedTaskKeys, setSelectedTaskKeys] = useState([]);
  const selectedTaskKeySet = useMemo(
    () => new Set(selectedTaskKeys),
    [selectedTaskKeys]
  );
  const completableTasks = selectedActiveTasks.filter(
    (task) => task.batchTask && canCompleteTask(task.date)
  );
  const selectedTasks = selectedActiveTasks.filter((task) =>
    selectedTaskKeySet.has(task.key)
  );

  useEffect(() => {
    const visibleKeys = new Set(selectedActiveTasks.map((task) => task.key));
    setSelectedTaskKeys((current) =>
      current.filter((key) => visibleKeys.has(key))
    );
  }, [selectedActiveTaskKeySignature]);

  function toggleTaskSelection(task) {
    setSelectedTaskKeys((current) =>
      current.includes(task.key)
        ? current.filter((key) => key !== task.key)
        : [...current, task.key]
    );
  }

  function toggleSelectAllCompletable() {
    const completableKeys = completableTasks.map((task) => task.key);
    const allSelected = completableKeys.every((key) => selectedTaskKeySet.has(key));
    setSelectedTaskKeys((current) => {
      if (allSelected) {
        return current.filter((key) => !completableKeys.includes(key));
      }
      return Array.from(new Set([...current, ...completableKeys]));
    });
  }

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2>Today and tomorrow</h2>
          <p>
            Immediate work across deliveries, seed sowing, transplant, and people
            follow-up.
          </p>
        </div>
        <div style={styles.badgeStack}>
          <span style={styles.badge}>{tasks.length} active</span>
          <span style={styles.secondaryBadge}>{completedTasks.length} completed</span>
        </div>
      </div>

      <div style={styles.taskTypeTabs} role="tablist" aria-label="Task type">
        {taskTypes.map((type) => {
          const activeCount =
            groupedTasks.find((group) => group.type === type)?.tasks.length || 0;
          const completedCount =
            groupedCompletedTasks.find((group) => group.type === type)?.tasks
              .length || 0;
          const isActive = selectedType === type;

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              style={isActive ? styles.taskTypeTabActive : styles.taskTypeTab}
              onClick={() => setActiveType(type)}
            >
              <span>{type}</span>
              <span style={styles.taskTypeCounts}>
                {activeCount} active · {completedCount} done
              </span>
            </button>
          );
        })}
      </div>

      <div style={styles.todayTomorrowSectionHeader}>
        <strong>{selectedType} task view</strong>
        <span>{selectedActiveTasks.length}</span>
      </div>
      {completableTasks.length ? (
        <div style={styles.bulkActionBar}>
          <button
            type="button"
            style={styles.secondaryActionButton}
            onClick={toggleSelectAllCompletable}
          >
            {completableTasks.every((task) => selectedTaskKeySet.has(task.key))
              ? "Clear selected"
              : "Select all eligible"}
          </button>
          <span style={styles.muted}>
            {selectedTasks.length} selected for completion
          </span>
          <button
            type="button"
            style={styles.taskActionButton}
            disabled={!selectedTasks.length || savingTaskKey === "bulk"}
            onClick={() => setBulkCompletionOpen(!bulkCompletionOpen)}
          >
            {bulkCompletionOpen ? "Close bulk confirm" : "Confirm selected done"}
          </button>
        </div>
      ) : null}
      {bulkCompletionOpen && selectedTasks.length ? (
        <div style={styles.bulkCompletionPanel}>
          <strong>Complete {selectedTasks.length} selected task(s)</strong>
          <TaskCompletionForm
            draft={bulkCompletionDraft}
            disabled={savingTaskKey === "bulk"}
            onChange={(key, value) =>
              setBulkCompletionDraft((current) => ({
                ...current,
                [key]: value,
              }))
            }
            onSave={() => onCompleteBatchTasks(selectedTasks)}
            saveLabel={`Save ${selectedTasks.length} completed task(s)`}
          />
        </div>
      ) : null}
      {selectedActiveTasks.length ? (
        <div style={styles.focusedTaskList}>
          {selectedActiveTasks.map((task) => (
            <TodayTomorrowTaskCard
              key={task.key}
              task={task}
              isSelected={selectedTaskKeySet.has(task.key)}
              onToggleSelected={() => toggleTaskSelection(task)}
              completionDrafts={completionDrafts}
              openCompletionTaskKey={openCompletionTaskKey}
              savingTaskKey={savingTaskKey}
              onCompleteBatchTask={onCompleteBatchTask}
              onToggleCompletionForm={onToggleCompletionForm}
              onUpdateCompletionDraft={onUpdateCompletionDraft}
            />
          ))}
        </div>
      ) : (
        <div style={styles.empty}>No {selectedType.toLowerCase()} tasks due today or tomorrow.</div>
      )}

      <div style={styles.todayTomorrowSectionHeader}>
        <strong>{selectedType} completed</strong>
        <span>{selectedCompletedTasks.length}</span>
      </div>
      {selectedCompletedTasks.length ? (
        <div style={styles.focusedTaskList}>
          {selectedCompletedTasks.map((task) => (
            <CompletedTaskCard key={task.key} task={task} />
          ))}
        </div>
      ) : (
        <div style={styles.empty}>No completed {selectedType.toLowerCase()} tasks yet.</div>
      )}
    </section>
  );
}

function TodayTomorrowTaskCard({
  task,
  isSelected,
  onToggleSelected,
  completionDrafts,
  openCompletionTaskKey,
  savingTaskKey,
  onCompleteBatchTask,
  onToggleCompletionForm,
  onUpdateCompletionDraft,
}) {
  const canSelectTask = task.batchTask && canCompleteTask(task.date);

  return (
    <article style={styles.planningTaskRow}>
      <div style={styles.cardHeader}>
        <div style={styles.taskTitleWithSelect}>
          {canSelectTask ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelected}
              aria-label={`Select ${task.title}`}
              style={styles.taskCheckbox}
            />
          ) : null}
          <strong>
            {task.title}
            {task.isTestTransaction ? (
              <span style={styles.testBadge}>Admin test</span>
            ) : null}
          </strong>
        </div>
        <span style={styles.dueLabel}>{formatDueLabel(task.date)}</span>
      </div>
      {task.isTestTransaction ? (
        <div style={styles.testNotice}>
          Test transaction. Not a real delivery and should be excluded from
          profit and loss.
        </div>
      ) : null}
      <div style={styles.taskMetaGrid}>
        <div style={styles.muted}>Due: {formatDateTime(task.date)}</div>
        <div style={styles.muted}>{task.customerName}</div>
        <div style={styles.muted}>{task.source}</div>
        {task.orderCode ? <div style={styles.muted}>{task.orderCode}</div> : null}
      </div>
      <div>{task.detail}</div>
      {task.note ? <p style={styles.note}>{task.note}</p> : null}
      {task.href ? (
        <a href={task.href} style={styles.inlineLink}>
          Open people
        </a>
      ) : null}
      {task.batchTask && canCompleteTask(task.date) ? (
        <>
          <button
            type="button"
            style={styles.taskActionButton}
            disabled={savingTaskKey === task.key}
            onClick={() => onToggleCompletionForm(task)}
          >
            {openCompletionTaskKey === task.key
              ? "Close completion"
              : "Confirm done"}
          </button>
          {openCompletionTaskKey === task.key ? (
            <TaskCompletionForm
              draft={completionDrafts[task.key] || getDefaultCompletionDraft(task)}
              disabled={savingTaskKey === task.key}
              onChange={(key, value) => onUpdateCompletionDraft(task, key, value)}
              onSave={() => onCompleteBatchTask(task)}
            />
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function CompletedTaskCard({ task }) {
  return (
    <article style={styles.completedTaskRow}>
      <div style={styles.cardHeader}>
        <strong>{task.title}</strong>
        <span style={styles.completedLabel}>Done</span>
      </div>
      <div style={styles.taskMetaGrid}>
        <div style={styles.muted}>Task: {formatDateTime(task.date)}</div>
        {task.recordedAt ? (
          <div style={styles.muted}>Recorded: {formatDateTime(task.recordedAt)}</div>
        ) : null}
        <div style={styles.muted}>{task.customerName}</div>
        <div style={styles.muted}>{task.source}</div>
      </div>
      <div>{task.detail}</div>
      {task.note ? <p style={styles.note}>{task.note}</p> : null}
    </article>
  );
}

function TaskCompletionForm({
  draft,
  disabled,
  onChange,
  onSave,
  saveLabel = "Save completed task",
}) {
  return (
    <div style={styles.completionForm}>
      <label style={styles.completionField}>
        <span>Actual date</span>
        <input
          type="date"
          value={draft.performedDate}
          onChange={(event) => onChange("performedDate", event.target.value)}
          style={styles.input}
        />
      </label>
      <label style={styles.completionField}>
        <span>Actual time</span>
        <input
          type="time"
          value={draft.performedTime}
          onChange={(event) => onChange("performedTime", event.target.value)}
          style={styles.input}
        />
      </label>
      <label style={styles.completionFieldWide}>
        <span>Notes</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          style={styles.input}
          placeholder="Example: Watered lightly; no germination seen yet."
        />
      </label>
      <button
        type="button"
        style={styles.taskActionButton}
        disabled={disabled}
        onClick={onSave}
      >
        {disabled ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

const styles = {
  stack: {
    display: "grid",
    gap: "16px",
  },
  status: {
    color: "#2f6f46",
    fontWeight: 800,
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "14px",
    padding: "16px",
  },
  header: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
  },
  badge: {
    background: "#2f6f46",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "0.82rem",
    fontWeight: 800,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  badgeStack: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "end",
  },
  secondaryBadge: {
    background: "#f8f4ed",
    border: "1px solid rgba(91, 63, 35, 0.18)",
    borderRadius: "999px",
    color: "#4d463f",
    fontSize: "0.82rem",
    fontWeight: 900,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  todayTomorrowSectionHeader: {
    alignItems: "center",
    borderTop: "2px solid rgba(47, 111, 70, 0.22)",
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "12px",
  },
  sortControl: {
    alignItems: "start",
    background: "#f8f4ed",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    padding: "10px",
  },
  sortButtonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  sortButton: {
    background: "#fffdfa",
    border: "1px solid rgba(91, 63, 35, 0.24)",
    borderRadius: "999px",
    color: "#28231f",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "8px 12px",
  },
  sortButtonActive: {
    background: "#2f6f46",
    border: "1px solid #2f6f46",
    borderRadius: "999px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "8px 12px",
  },
  dayList: {
    display: "grid",
    gap: "0",
  },
  dayCard: {
    background: "transparent",
    borderTop: "2px solid rgba(47, 111, 70, 0.28)",
    display: "grid",
    gap: "12px",
    padding: "16px 0",
  },
  dayHeader: {
    alignItems: "baseline",
    borderBottom: "1px solid rgba(91, 63, 35, 0.16)",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    paddingBottom: "10px",
  },
  dateTitleStack: {
    display: "grid",
    gap: "4px",
  },
  dueLabel: {
    color: "#7a5a12",
    fontSize: "0.9rem",
    fontWeight: 900,
    lineHeight: 1.2,
  },
  blockList: {
    display: "grid",
    gap: "0",
    paddingTop: "10px",
  },
  orderDetails: {
    borderTop: "1px solid rgba(91, 63, 35, 0.16)",
    paddingTop: "10px",
  },
  orderDetailsSummary: {
    cursor: "pointer",
    fontWeight: 900,
    color: "#2f6f46",
  },
  blockCard: {
    background: "transparent",
    borderTop: "1px solid rgba(91, 63, 35, 0.14)",
    display: "grid",
    gap: "9px",
    padding: "12px 0",
  },
  planningTaskRow: {
    background: "transparent",
    borderTop: "1px solid rgba(91, 63, 35, 0.14)",
    display: "grid",
    gap: "8px",
    padding: "12px 0",
  },
  completedTaskRow: {
    background: "#f3f8f1",
    border: "1px solid rgba(47, 111, 70, 0.16)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    padding: "12px",
  },
  completedLabel: {
    color: "#2f6f46",
    fontSize: "0.82rem",
    fontWeight: 900,
  },
  taskActionButton: {
    background: "#2f6f46",
    border: "1px solid #2f6f46",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    justifySelf: "start",
    minHeight: "40px",
    minWidth: "132px",
    padding: "8px 12px",
  },
  secondaryActionButton: {
    background: "#fffdfa",
    border: "1px solid rgba(91, 63, 35, 0.24)",
    borderRadius: "8px",
    color: "#201c1d",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    minHeight: "40px",
    padding: "8px 12px",
  },
  bulkActionBar: {
    alignItems: "center",
    background: "#f8f4ed",
    border: "1px solid rgba(91, 63, 35, 0.16)",
    borderRadius: "8px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    padding: "10px",
  },
  bulkCompletionPanel: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 111, 70, 0.22)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  completionForm: {
    borderTop: "1px solid rgba(91, 63, 35, 0.16)",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    paddingTop: "10px",
  },
  completionField: {
    display: "grid",
    gap: "5px",
    fontWeight: 900,
  },
  completionFieldWide: {
    display: "grid",
    gap: "5px",
    fontWeight: 900,
    gridColumn: "1 / -1",
  },
  input: {
    background: "#fffdfa",
    border: "1px solid rgba(91, 63, 35, 0.22)",
    borderRadius: "8px",
    color: "#201c1d",
    font: "inherit",
    minHeight: "42px",
    padding: "9px 10px",
    width: "100%",
  },
  compactCardHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
  },
  sourceBadge: {
    background: "transparent",
    border: "0",
    color: "#4d463f",
    fontSize: "0.78rem",
    fontWeight: 900,
    padding: 0,
  },
  taskLine: {
    color: "#201c1d",
    fontSize: "1.02rem",
    fontWeight: 900,
    lineHeight: 1.25,
  },
  compactMetaList: {
    display: "grid",
    gap: "6px",
    margin: 0,
  },
  compactMetaRow: {
    display: "grid",
    gap: "2px",
  },
  compactMetaLabel: {
    color: "#7b7168",
    fontSize: "0.72rem",
    fontWeight: 900,
    textTransform: "uppercase",
  },
  compactMetaValue: {
    color: "#4d463f",
    lineHeight: 1.35,
  },
  compactDetails: {
    borderTop: "1px solid rgba(91, 63, 35, 0.12)",
    display: "grid",
    gap: "8px",
    paddingTop: "8px",
  },
  compactDetailsSummary: {
    color: "#2f6f46",
    cursor: "pointer",
    fontWeight: 900,
  },
  cardHeader: {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
  },
  taskTitleWithSelect: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  taskCheckbox: {
    accentColor: "#2f6f46",
    flex: "0 0 auto",
    height: "20px",
    width: "20px",
  },
  grid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  taskTypeTabs: {
    borderBottom: "1px solid rgba(91, 63, 35, 0.16)",
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "8px",
  },
  taskTypeTab: {
    background: "#f8f4ed",
    border: "1px solid rgba(91, 63, 35, 0.18)",
    borderRadius: "8px",
    color: "#2f2924",
    cursor: "pointer",
    display: "grid",
    flex: "0 0 auto",
    font: "inherit",
    fontWeight: 900,
    gap: "3px",
    minWidth: "148px",
    padding: "9px 11px",
    textAlign: "left",
  },
  taskTypeTabActive: {
    background: "#2f6f46",
    border: "1px solid #2f6f46",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    display: "grid",
    flex: "0 0 auto",
    font: "inherit",
    fontWeight: 900,
    gap: "3px",
    minWidth: "148px",
    padding: "9px 11px",
    textAlign: "left",
  },
  taskTypeCounts: {
    fontSize: "0.76rem",
    fontWeight: 800,
    opacity: 0.82,
  },
  focusedTaskList: {
    display: "grid",
    gap: "0",
  },
  immediateGrid: {
    display: "grid",
    gap: "18px",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  immediateColumn: {
    background: "transparent",
    borderTop: "1px solid rgba(91, 63, 35, 0.16)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  immediateColumnHeader: {
    alignItems: "center",
    borderBottom: "1px solid rgba(91, 63, 35, 0.16)",
    display: "flex",
    gap: "10px",
    justifyContent: "space-between",
    paddingBottom: "8px",
  },
  card: {
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    padding: "12px",
  },
  muted: {
    color: "#6b625c",
    lineHeight: 1.45,
  },
  taskMetaGrid: {
    display: "grid",
    gap: "4px 12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  note: {
    borderLeft: "3px solid rgba(47, 111, 70, 0.35)",
    color: "#4d463f",
    margin: 0,
    paddingLeft: "10px",
  },
  testBadge: {
    background: "#1f1f1f",
    borderRadius: "999px",
    color: "#fff",
    display: "inline-block",
    fontSize: "0.72rem",
    fontWeight: 900,
    marginLeft: "8px",
    padding: "3px 7px",
    verticalAlign: "middle",
  },
  testNotice: {
    background: "#fff4d8",
    border: "1px solid rgba(133, 91, 12, 0.2)",
    borderRadius: "6px",
    color: "#5e4511",
    fontSize: "0.86rem",
    fontWeight: 800,
    padding: "8px 10px",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontWeight: 800,
  },
  input: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    padding: "10px 12px",
    width: "100%",
  },
  empty: {
    background: "#f8f4ed",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    color: "#6b625c",
    padding: "14px",
  },
  emptySmall: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.08)",
    borderRadius: "8px",
    color: "#6b625c",
    fontSize: "14px",
    padding: "10px",
  },
  inlineLink: {
    color: "#2f6f46",
    fontWeight: 900,
  },
};
