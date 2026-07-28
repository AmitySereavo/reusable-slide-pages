"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";
import {
  downloadDeletionRecordPdf,
  makeDeletionExportFilename,
} from "./deletionExportPdf";

const statusOptions = [
  "PENDING",
  "PROCESSING",
  "READY",
  "FULFILLED",
  "CANCELED",
  "REFUNDED",
];

const fulfillmentTypes = [
  { value: "", label: "All fulfillment" },
  { value: "order", label: "Submitted orders" },
  { value: "digital", label: "Digital" },
  { value: "physical", label: "Physical" },
  { value: "ticket", label: "Tickets" },
];

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(item) {
  return formatMoneyValue(item.currencyCode || "JMD", item.lineTotal || 0);
}

function formatMoneyValue(currencyCode, value) {
  const currency = currencyCode || "JMD";
  const amount = Number(value || 0);

  if (currency === "JMD") {
    return `JMD $${Math.round(amount).toLocaleString("en-JM")}`;
  }

  return `${currency} ${amount.toLocaleString()}`;
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "Not estimated";
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function statusColor(status) {
  switch (status) {
    case "FULFILLED":
      return "#2f7a46";
    case "PROCESSING":
      return "#7a5a12";
    case "READY":
      return "#245f99";
    case "CANCELED":
    case "REFUNDED":
      return "#8a2f2f";
    default:
      return "#5f5a52";
  }
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function cleanFulfillmentNotesForDisplay(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim().toLowerCase();

      return (
        normalized !== "payment status: awaiting_payment" &&
        normalized !== "inventory applied: no"
      );
    })
    .join("\n");
}

function confirmTypedDelete(message) {
  const response = window.prompt(`${message}\n\nType delete to confirm.`);
  return String(response || "").trim().toLowerCase() === "delete";
}

function exportBeforeDelete({ title, filename, record }) {
  downloadDeletionRecordPdf({ title, filename, record });
}

function getLittleOrchardOrderPhone(item) {
  return String(
    item.metadata?.customerWhatsappNumber ||
      item.metadata?.customerPhoneNumber ||
      item.metadata?.customerPhone ||
      ""
  ).replace(/[^\d+]/g, "");
}

function getLittleOrchardOrderEmail(item) {
  return String(item.metadata?.customerEmail || item.recipientEmail || "").trim();
}

function getLittleOrchardSocialContacts(item) {
  return [
    item.metadata?.customerInstagramHandle
      ? `Instagram: ${item.metadata.customerInstagramHandle}`
      : "",
    item.metadata?.customerTiktokHandle
      ? `TikTok: ${item.metadata.customerTiktokHandle}`
      : "",
    item.metadata?.customerFacebookMessengerHandle
      ? `Facebook Messenger: ${item.metadata.customerFacebookMessengerHandle}`
      : "",
  ].filter(Boolean);
}

const littleOrchardCatalogChoices = littleOrchardShopCatalog.products.flatMap(
  (product) =>
    product.sizeOptions.map((sizeOption) => ({
      key: `${product.id}::${sizeOption.id}`,
      productId: product.id,
      sizeOptionId: sizeOption.id,
      label: `${product.title} - ${sizeOption.label}`,
      price: sizeOption.price,
      currencyCode: littleOrchardShopCatalog.currencyCode || "JMD",
    }))
);

const growGuideProductRules = [
  { label: "Black pepper grow guide", terms: ["black pepper"] },
  { label: "Green onion / scallion grow guide", terms: ["scallion", "green onion"] },
  { label: "Lemon balm grow guide", terms: ["lemon balm"] },
  { label: "Tomato grow guide", terms: ["tomato"] },
  { label: "Scotch bonnet grow guide", terms: ["scotch bonnet"] },
  { label: "Lettuce grow guide", terms: ["lettuce"] },
];

function getGrowGuideLabelForOrderItem(item) {
  const text = [
    item.productTitle,
    item.sizeLabel,
    item.productId,
    item.sku,
    item.productSku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const rule = growGuideProductRules.find((entry) =>
    entry.terms.some((term) => text.includes(term))
  );

  return rule?.label || "";
}

function useCurrentOriginUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    const browserOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    const parsed = new URL(raw, browserOrigin || "http://localhost:3000");

    if (
      browserOrigin &&
      (parsed.pathname.startsWith("/receipt/") ||
        parsed.pathname === "/receipt" ||
        parsed.pathname.startsWith("/order-status/") ||
        parsed.pathname.startsWith("/admin/event-orders/order/"))
    ) {
      return `${browserOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

function getReceiptLink(item) {
  const statusLink = item.metadata?.orderStatusLink || "";
  const rawReceiptLink =
    item.metadata?.receiptLink ||
    (statusLink ? statusLink.replace("/order-status/", "/receipt/") : "");

  return useCurrentOriginUrl(rawReceiptLink);
}

function getCashierLink(item) {
  return useCurrentOriginUrl(item.metadata?.cashierLink || "");
}

function isNurseryStockRequest(item) {
  return item?.purchaseModeId === "nursery-stock-request";
}

function getOrderItemTitle(item) {
  return isNurseryStockRequest(item) ? "Nursery stock request" : item.productTitle;
}

function getRequestedItemLabel(item) {
  return [item.productTitle, item.sizeLabel].filter(Boolean).join(" - ");
}

const customerMessageTemplates = [
  { value: "ready", label: "Ready for pickup" },
  { value: "receipt", label: "Your receipt" },
  { value: "payment", label: "Payment confirmed" },
  { value: "cancelled", label: "Order cancelled" },
];

const paymentAllocationOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "remittance", label: "Remittance" },
  { value: "other", label: "Other" },
];

function getPaymentAllocations(item) {
  const allocations = item.metadata?.paymentAllocations || {};

  return paymentAllocationOptions.reduce((current, option) => {
    current[option.value] = Number(allocations?.[option.value] || 0);
    return current;
  }, {});
}

function getPaymentAllocationTotal(item) {
  const allocations = getPaymentAllocations(item);

  return Object.values(allocations).reduce(
    (sum, amount) => sum + Number(amount || 0),
    0
  );
}

function getCustomerOwesAmount({ item, orderTotal }) {
  if (item.metadata?.paymentStatus === "PAYMENT_CONFIRMED") return 0;

  return Math.max(0, orderTotal - getPaymentAllocationTotal(item));
}

function getCustomerInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function buildCustomerMessage({ item, orderTotal, template }) {
  const customerName = item.recipientName || "there";
  const orderCode = item.orderCode || "your order";
  const total = formatMoneyValue(item.currencyCode || "JMD", orderTotal);
  const status = item.fulfillmentStatus || "PENDING";
  const statusLink = useCurrentOriginUrl(item.metadata?.orderStatusLink || "");
  const receiptLink = getReceiptLink(item);
  const paymentConfirmed =
    item.metadata?.paymentStatus === "PAYMENT_CONFIRMED";

  if (template === "ready") {
    return [
      `Ready for pickup, ${customerName}.`,
      "",
      `Little Orchard order ${orderCode} is ready for pickup.`,
      "You may now come to the Little Orchard Nursery tent to collect your items.",
      "Happy gardening. Your next growing step is waiting for you.",
      !paymentConfirmed ? `Order total: ${total}` : "",
      statusLink ? `Order status: ${statusLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (template === "receipt") {
    return [
      `Your receipt, ${customerName}.`,
      "",
      `Receipt for Little Orchard order ${orderCode}.`,
      item.metadata?.receiptCode
        ? `Receipt code: ${item.metadata.receiptCode}`
        : "",
      "Congratulations, you've invested in your garden!",
      `Order total: ${total}`,
      `Current order status: ${status}`,
      receiptLink
        ? `View and download your receipt here: ${receiptLink}`
        : statusLink
          ? `You can view your order status here: ${statusLink}`
          : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (template === "cancelled") {
    return [
      `Order cancelled, ${customerName}.`,
      "",
      `Your order ${orderCode} has been cancelled.`,
      "Please contact us if you have any questions or would like help placing another order.",
      statusLink ? `Order status: ${statusLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Payment confirmed, ${customerName}.`,
    "",
      `Your payment for order ${orderCode} has been confirmed.`,
    "Your items are secured. Keep growing.",
    `Current order status: ${status}`,
    `Order total: ${total}`,
    "We will notify you when your order is ready for pickup at the Little Orchard Nursery tent.",
    statusLink ? `Order status: ${statusLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildGrowGuideCustomerMessage({
  item,
  guideLink,
  messageSet = "just-bought",
}) {
  const customerName = item?.recipientName || "there";
  const productTitle = String(
    guideLink?.productTitle || item?.productTitle || "your plant"
  );
  const linkUrl = guideLink?.linkUrl || "[INSERT URL]";
  const normalizedProduct = productTitle.toLowerCase();
  const messageTemplates = [
    {
      terms: ["lettuce"],
      itemLabel: "lettuce seedlings",
      justBoughtTitle:
        "🥬 You bought Lettuce Seedlings - now grow them crisp, fresh and ready to harvest!",
      followUpTitle: "🥬 From Seedling to Salad Bowl: Your Lettuce Grow Guide",
      guideLabel: "Lettuce Grow Guide",
      intro:
        "Lettuce can struggle in hot conditions, but the right shade, watering and timing can help you produce tender, fresh leaves.",
      points: [
        "Harden off and transplant seedlings safely",
        "Protect young plants from harsh sun",
        "Choose the right spacing",
        "Prevent wilting, yellowing and rot",
        "Control caterpillars, slugs and sucking insects",
        "Reduce bitterness and early bolting",
        "Know when your lettuce is ready to harvest",
      ],
    },
    {
      terms: ["lemon balm"],
      itemLabel: "Lemon Balm plant",
      justBoughtTitle:
        "🍋 You bought Lemon Balm - now learn how to keep it fresh, bushy and growing!",
      followUpTitle:
        "🍋 Your Lemon Balm Can Give You Fresh Leaves Again and Again - Here's How",
      guideLabel: "Lemon Balm Grow Guide",
      intro:
        "Your lemon balm needs the right sunlight, watering, spacing and trimming to produce plenty of soft, lemon-scented leaves.",
      points: [
        "Transplant your seedling safely",
        "Prevent wilting, yellow leaves and root rot",
        "Choose the right pot or garden spacing",
        "Identify common pests and leaf problems",
        "Prune and harvest for fresh new growth",
        "Keep the plant neat and under control",
      ],
    },
    {
      terms: ["tomato"],
      itemLabel: "slicing tomato seedlings",
      justBoughtTitle:
        "🍅 You bought Tomato Seedlings - now grow them into big, juicy slicing tomatoes!",
      followUpTitle:
        "🍅 From Seedling to Sandwich: Your Slicing Tomato Grow Guide",
      guideLabel: "Slicing Tomato Grow Guide",
      intro:
        "Your slicing tomato seedlings need proper transplanting, support, feeding and consistent watering to produce healthy fruit.",
      points: [
        "Transplant seedlings safely",
        "Space and support tomato plants",
        "Feed them without overfertilizing",
        "Prevent cracking and blossom-end rot",
        "Identify pests, leaf spots and wilt",
        "Know when and how to harvest",
      ],
    },
    {
      terms: ["scotch bonnet"],
      itemLabel: "Scotch Bonnet pepper plant",
      justBoughtTitle:
        "🌶️ You bought Scotch Bonnet Seedlings - now grow the heat!",
      followUpTitle:
        "🌶️ From Seedling to Fiery Harvest: Your Scotch Bonnet Grow Guide",
      guideLabel: "Scotch Bonnet Pepper Grow Guide",
      intro:
        "Your Scotch bonnet plants need plenty of sunlight, good drainage, steady watering and the right feeding to produce a strong harvest.",
      points: [
        "Harden off and transplant seedlings",
        "Choose the right spacing or container",
        "Prevent overwatering and root problems",
        "Identify whiteflies, aphids, mites and caterpillars",
        "Reduce flower drop and weak fruiting",
        "Care for plants through harvest",
      ],
    },
    {
      terms: ["scallion", "green onion"],
      itemLabel: "Scallion / Green Onion plant",
      justBoughtTitle:
        "🌱 You bought Scallion - now learn how to keep it green, strong and growing!",
      followUpTitle:
        "🌱 Grow Scallion for Repeated Fresh Harvests - Start Here",
      guideLabel: "Scallion / Green Onion Grow Guide",
      intro:
        "Your scallion seedlings need the right spacing, watering and soil care to grow healthy leaves and strong bases.",
      points: [
        "Transplant seedlings safely",
        "Choose the right spacing",
        "Prevent yellowing, browning and rot",
        "Identify common pests and diseases",
        "Grow scallion or allow it to mature longer as spring onion",
        "Know when your crop is ready to harvest",
      ],
    },
    {
      terms: ["black pepper"],
      itemLabel: "Black Pepper plant",
      justBoughtTitle:
        "🌿 You bought a Black Pepper Plant - now learn how to keep it growing!",
      followUpTitle: "🌿 Your Black Pepper Plant Grow Guide",
      guideLabel: "Black Pepper Plant Grow Guide",
      intro:
        "Your black pepper plant is a climbing vine that needs the right support, shade, watering and drainage to thrive.",
      points: [
        "Transplant it safely",
        "Choose the right support",
        "Prevent yellowing, wilting and root rot",
        "Identify pests and diseases",
        "Care for it until peppercorn harvest",
      ],
    },
  ];
  const guideTemplate = messageTemplates.find((template) =>
    template.terms.some((term) => normalizedProduct.includes(term))
  );
  const linkBlock = ["", linkUrl, ""];

  if (messageSet === "follow-up") {
    return [
      `*${guideTemplate?.followUpTitle || `🌱 Your ${productTitle} Grow Guide`}*`,
      "",
      `${customerName}, here is a quick guide to help you keep your ${
        guideTemplate?.itemLabel || productTitle
      } growing well now that you've brought it home.`,
      "",
      "*Tap the link below to view the guide:*",
      ...linkBlock,
      "_Para-life Trees - Planting a Life in Paradise._",
    ].join("\n");
  }

  if (guideTemplate) {
    return [
      `*${guideTemplate.justBoughtTitle}*`,
      "",
      guideTemplate.intro,
      "",
      "*This complete guide shows you how to:*",
      "",
      ...guideTemplate.points.map((point) => `✅ ${point}`),
      "",
      `*Tap the link below to view your ${guideTemplate.guideLabel}:*`,
      ...linkBlock,
      "_Para-life Trees - Planting a Life in Paradise._",
    ].join("\n");
  }

  return [
    `*🌱 Grow guide for ${customerName}.*`,
    "",
    `Here is the grow guide for ${productTitle}.`,
    ...linkBlock,
    "_Para-life Trees - Planting a Life in Paradise._",
  ].join("\n");
}

function openWhatsAppMessage(phone, message) {
  if (!phone) return;
  window.open(
    `https://api.whatsapp.com/send/?phone=${encodeURIComponent(
      phone
    )}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`,
    "_blank",
    "noopener,noreferrer"
  );
}

function openEmailMessage(email, subject, message) {
  if (!email) return;
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function copyMessageToClipboard(message) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = message;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export default function OrdersManager() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0 });
  const [status, setStatus] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading orders...");
  const [editing, setEditing] = useState({});
  const [updatingItemIds, setUpdatingItemIds] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({});
  const [cashTenderedByOrder, setCashTenderedByOrder] = useState({});
  const [adHocItemDrafts, setAdHocItemDrafts] = useState({});
  const [catalogItemDrafts, setCatalogItemDrafts] = useState({});
  const [customerPhoneDrafts, setCustomerPhoneDrafts] = useState({});
  const [customerContactDrafts, setCustomerContactDrafts] = useState({});
  const [customerNotesDrafts, setCustomerNotesDrafts] = useState({});
  const [paymentAllocationDrafts, setPaymentAllocationDrafts] = useState({});
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const [messageTemplateByOrder, setMessageTemplateByOrder] = useState({});
  const [growGuideDrafts, setGrowGuideDrafts] = useState({});
  const [generatedGrowGuideLinks, setGeneratedGrowGuideLinks] = useState({});
  const [growGuideMessageSets, setGrowGuideMessageSets] = useState({});
  const [busyActions, setBusyActions] = useState({});
  const busyActionLocksRef = useRef({});

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrow(window.innerWidth < 720);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("query") || params.get("q") || "";
    const initialFulfillmentType = params.get("fulfillmentType") || "";

    if (initialQuery.trim()) {
      setQuery(initialQuery.trim());
    }

    if (
      fulfillmentTypes.some((option) => option.value === initialFulfillmentType)
    ) {
      setFulfillmentType(initialFulfillmentType);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadOrders();
    }, 200);

    return () => clearTimeout(timeout);
  }, [status, fulfillmentType, query]);

  async function loadOrders() {
    setMessage("Loading orders...");
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (fulfillmentType) params.set("fulfillmentType", fulfillmentType);
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/dashboard/orders?${params.toString()}`, {
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(
        [payload?.error, payload?.details].filter(Boolean).join(" ") ||
          "Orders could not be loaded."
      );
      return;
    }

    setItems(payload.items || []);
    setSummary(payload.summary || { total: 0 });
    setMessage("");
  }

  async function runBusyAction(actionKey, loadingMessage, action) {
    if (busyActionLocksRef.current[actionKey]) {
      return;
    }

    busyActionLocksRef.current[actionKey] = true;
    setBusyActions((current) => ({ ...current, [actionKey]: true }));
    if (loadingMessage) {
      setMessage(loadingMessage);
    }

    try {
      await Promise.all([
        action(),
        new Promise((resolve) => setTimeout(resolve, 650)),
      ]);
    } finally {
      setBusyActions((current) => {
        const next = { ...current };
        delete next[actionKey];
        return next;
      });
      delete busyActionLocksRef.current[actionKey];
    }
  }

  async function updateItem(item, overrides = {}) {
    if (updatingItemIds[item.id]) return;
    const draft = editing[item.id] || {};
    const fulfillmentStatus =
      overrides.fulfillmentStatus || draft.fulfillmentStatus || item.fulfillmentStatus;
    setMessage("Updating order item...");
    setUpdatingItemIds((current) => ({ ...current, [item.id]: true }));

    const [response] = await Promise.all([
      fetch("/api/dashboard/orders", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          fulfillmentStatus,
          fulfillmentNotes:
            overrides.fulfillmentNotes !== undefined
              ? overrides.fulfillmentNotes
              : draft.fulfillmentNotes !== undefined
                ? draft.fulfillmentNotes
                : item.fulfillmentNotes || "",
          trackingReference:
            overrides.trackingReference !== undefined
              ? overrides.trackingReference
              : draft.trackingReference !== undefined
                ? draft.trackingReference
                : item.trackingReference || "",
        }),
      }),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
    const payload = await response.json().catch(() => ({}));
    setUpdatingItemIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });

    if (!response.ok) {
      setMessage(
        [payload?.error, payload?.details].filter(Boolean).join(" ") ||
          "Order item could not be updated."
      );
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? payload.item : entry))
    );
    setEditing((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setMessage("Order item updated.");
  }

  async function confirmLittleOrchardPayment(item, fulfillmentStatus) {
    if (!item.orderCode) return;
    const actionKey = `confirm-payment:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const paymentMethod = paymentMethods[item.orderCode] || "";
    const cashTenderedRaw = cashTenderedByOrder[item.orderCode] || "";

    if (!paymentMethod) {
      setMessage("Choose the payment method before confirming payment.");
      return;
    }

    await runBusyAction(actionKey, "Confirming Little Orchard payment...", async () => {
      const response = await fetch("/api/plant-shop/orders/confirm-payment", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderCode: item.orderCode,
          paymentMethod,
          fulfillmentStatus,
          cashTendered: paymentMethod === "cash" ? cashTenderedRaw : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const conflictText = Array.isArray(payload.conflicts)
          ? payload.conflicts
              .map(
                (conflict) =>
                  `${conflict.productTitle} ${conflict.variation}: ordered ${conflict.orderedQuantity}, available ${conflict.availableQuantity}`
              )
              .join("; ")
          : "";

        setMessage(
          [payload.error || "Payment could not be confirmed.", conflictText]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }

      setMessage(payload.message || "Payment confirmed.");
      await loadOrders();
    });
  }

  async function addAdHocOrderItem(item) {
    if (!item.orderCode) return;
    const actionKey = `add-ad-hoc-item:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const draft = adHocItemDrafts[item.orderCode] || {};
    const productTitle = String(draft.productTitle || "").trim();
    const sizeLabel = String(draft.sizeLabel || "").trim();
    const quantity = Number(draft.quantity || 1);
    const unitPrice = Number(draft.unitPrice || 0);

    if (!productTitle) {
      setMessage("Enter the item name before adding it to the order.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setMessage("Enter a valid item price.");
      return;
    }

    await runBusyAction(actionKey, "Adding item to order...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add-little-orchard-order-item",
          orderCode: item.orderCode,
          productTitle,
          sizeLabel,
          quantity,
          unitPrice,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Item could not be added."
        );
        return;
      }

      setAdHocItemDrafts((current) => ({
        ...current,
        [item.orderCode]: {
          productTitle: "",
          sizeLabel: "",
          quantity: 1,
          unitPrice: "",
        },
      }));
      setMessage(payload.message || "Item added to order.");
      await loadOrders();
    });
  }

  async function addCatalogOrderItem(item) {
    if (!item.orderCode) return;
    const actionKey = `add-catalog-item:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const draft = catalogItemDrafts[item.orderCode] || {};
    const catalogKey =
      draft.catalogKey || littleOrchardCatalogChoices[0]?.key || "";
    const [productId, sizeOptionId] = String(catalogKey).split("::");
    const quantity = Number(draft.quantity || 1);

    if (!productId || !sizeOptionId) {
      setMessage("Choose the shop item to add.");
      return;
    }

    await runBusyAction(actionKey, "Adding shop item to order...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add-little-orchard-catalog-order-item",
          orderCode: item.orderCode,
          productId,
          sizeOptionId,
          quantity,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Shop item could not be added."
        );
        return;
      }

      setCatalogItemDrafts((current) => ({
        ...current,
        [item.orderCode]: {
          catalogKey: littleOrchardCatalogChoices[0]?.key || "",
          quantity: 1,
        },
      }));
      setMessage(payload.message || "Shop item added to order.");
      await loadOrders();
    });
  }

  async function updateLittleOrchardPaymentAllocations(item) {
    if (!item.id || !item.orderCode) return;
    const actionKey = `payment-allocations:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const paymentAllocations =
      paymentAllocationDrafts[item.orderCode] || getPaymentAllocations(item);

    await runBusyAction(actionKey, "Updating payment allocations...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-little-orchard-payment-allocations",
          id: item.id,
          paymentAllocations,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Payment allocations could not be updated."
        );
        return;
      }

      setMessage(payload.message || "Payment allocations updated.");
      await loadOrders();
    });
  }

  function toggleAccordion(orderCode, section) {
    setExpandedAccordions((current) => {
      const currentSection = current[orderCode];

      return {
        ...current,
        [orderCode]: currentSection === section ? "" : section,
      };
    });
  }

  async function removeLittleOrchardOrderItem(entry) {
    const actionKey = `remove-order-item:${entry.id}`;
    if (busyActionLocksRef.current[actionKey]) return;

    const confirmed = confirmTypedDelete(
      `Delete ${getOrderItemTitle(entry)} from this customer's order and receipt?`
    );

    if (!confirmed) return;

    try {
      exportBeforeDelete({
        title: `Order item deletion export - ${getOrderItemTitle(entry)}`,
        filename: makeDeletionExportFilename([
          "Order Item",
          entry.orderCode,
          entry.recipientName,
          getOrderItemTitle(entry),
          entry.sizeLabel,
        ]),
        record: entry,
      });
      setMessage("Record downloaded as a PDF. Deletion will continue now.");
    } catch {
      setMessage("The PDF record could not be created. Deletion was cancelled.");
      return;
    }

    await runBusyAction(actionKey, "PDF downloaded. Removing item from order...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "remove-little-orchard-order-item",
          id: entry.id,
          confirmation: "delete",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Item could not be removed."
        );
        return;
      }

      setMessage(payload.message || "Item removed from order.");
      await loadOrders();
    });
  }

  async function deleteLittleOrchardOrder(item) {
    if (!item.id || !item.orderCode) return;
    const actionKey = `delete-order:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;

    const confirmed = confirmTypedDelete(
      `Delete Little Orchard order ${item.orderCode} and its receipt record? This removes every item attached to this order.`
    );

    if (!confirmed) return;

    const orderItems = items.filter(
      (entry) =>
        entry.sourceType === "little-orchard-shop" &&
        entry.orderCode === item.orderCode
    );

    try {
      exportBeforeDelete({
        title: `Little Orchard order deletion export - ${item.orderCode}`,
        filename: makeDeletionExportFilename([
          "Little Orchard Order Receipt",
          item.orderCode,
          item.recipientName,
          item.recipientEmail,
          getLittleOrchardOrderPhone(item),
        ]),
        record: {
          orderCode: item.orderCode,
          item,
          orderItems,
        },
      });
      setMessage("Order record downloaded as a PDF. Deletion will continue now.");
    } catch {
      setMessage("The PDF order record could not be created. Deletion was cancelled.");
      return;
    }

    await runBusyAction(actionKey, "PDF downloaded. Deleting order and receipt...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete-little-orchard-order",
          id: item.id,
          confirmation: "delete",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Order could not be deleted."
        );
        return;
      }

      setMessage(payload.message || "Order and receipt deleted.");
      await loadOrders();
    });
  }

  async function updateLittleOrchardCustomerPhone(item) {
    if (!item.id || !item.orderCode) return;
    const actionKey = `customer-phone:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const phone = String(
      customerPhoneDrafts[item.orderCode] ?? getLittleOrchardOrderPhone(item)
    ).trim();

    if (!phone) {
      setMessage("Enter the customer phone number.");
      return;
    }

    await runBusyAction(actionKey, "Updating customer phone...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-little-orchard-customer-phone",
          id: item.id,
          phone,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Customer phone could not be updated."
        );
        return;
      }

      setMessage(payload.message || "Customer phone updated.");
      await loadOrders();
    });
  }

  async function updateLittleOrchardCustomerContact(item) {
    if (!item.id || !item.orderCode) return;
    const actionKey = `customer-contact:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const currentDraft = customerContactDrafts[item.orderCode] || {};
    const contact = {
      name: currentDraft.name ?? item.recipientName ?? "",
      phone: currentDraft.phone ?? getLittleOrchardOrderPhone(item),
      email: currentDraft.email ?? getLittleOrchardOrderEmail(item),
      contactMethod:
        currentDraft.contactMethod ??
        item.metadata?.plantShopContactMethod ??
        "contact",
    };

    if (!String(contact.name || "").trim()) {
      setMessage("Enter the customer name.");
      return;
    }

    await runBusyAction(actionKey, "Updating customer contact...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-little-orchard-customer-contact",
          id: item.id,
          contact,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Customer contact could not be updated."
        );
        return;
      }

      setMessage(payload.message || "Customer contact updated.");
      await loadOrders();
      setExpandedAccordions((current) => ({
        ...current,
        [item.orderCode]: "",
      }));
    });
  }

  async function updateLittleOrchardCustomerNotes(item, notes) {
    if (!item.id || !item.orderCode) return;
    const actionKey = `customer-notes:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;

    await runBusyAction(actionKey, "Updating customer notes...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-little-orchard-customer-notes",
          id: item.id,
          customerNotes: notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Customer notes could not be updated."
        );
        return;
      }

      setMessage(payload.message || "Customer notes updated.");
      setCustomerNotesDrafts((current) => {
        const next = { ...current };
        delete next[item.orderCode];
        return next;
      });
      await loadOrders();
    });
  }

  async function requestMailingAddressUpdate(item) {
    const actionKey = `mailing-address:${item.id}`;
    if (busyActionLocksRef.current[actionKey]) return;

    await runBusyAction(
      actionKey,
      "Sending mailing address update request...",
      async () => {
        const response = await fetch("/api/dashboard/orders", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "request-mailing-address-update",
            id: item.id,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(
            [payload?.error, payload?.details].filter(Boolean).join(" ") ||
              "Mailing address update request could not be sent."
          );
          return;
        }

        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? payload.item : entry))
        );
        setMessage("Mailing address update request sent.");
      }
    );
  }

  async function sendCustomerEmailFromWebsite({
    item,
    customerEmail,
    subject,
    message,
  }) {
    const actionKey = `send-email:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;

    if (!customerEmail) {
      setMessage("This order does not have a customer email address.");
      return;
    }

    await runBusyAction(actionKey, "Sending customer email...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send-little-orchard-customer-email",
          id: item.id,
          subject,
          message,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details, payload?.message]
            .filter(Boolean)
            .join(" ") || "Customer email could not be sent."
        );
        return;
      }

      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? payload.item : entry))
      );
      setMessage(payload.message || "Customer email sent.");
    });
  }

  async function generateGrowGuideLink({ orderItem, orderCode }) {
    if (!orderItem?.id || !orderCode) return;
    const actionKey = `grow-guide-link:${orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;

    await runBusyAction(actionKey, "Generating tracked grow guide link...", async () => {
      const response = await fetch("/api/dashboard/grow-guide-links", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fulfillmentItemId: orderItem.id,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.link?.linkUrl) {
        setMessage(
          [payload?.error, payload?.details].filter(Boolean).join(" ") ||
            "Grow guide link could not be generated."
        );
        return;
      }

      setGeneratedGrowGuideLinks((current) => ({
        ...current,
        [orderCode]: payload.link,
      }));
      setMessage(payload.message || "Tracked grow guide link generated.");
    });
  }

  async function recordGrowGuideConversationBlock({
    item,
    guideLink,
    selectedGuideOrderItem,
    messageSet,
    sentBy,
  }) {
    if (messageSet !== "just-bought" || !item?.id || !guideLink?.linkUrl) {
      return;
    }

    const actionKey = `grow-guide-note:${item.orderCode}:${sentBy}`;
    if (busyActionLocksRef.current[actionKey]) return;

    await runBusyAction(
      actionKey,
      "Creating grow guide conversation block...",
      async () => {
        const response = await fetch("/api/dashboard/orders", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "record-grow-guide-message-conversation",
            id: item.id,
            messageSet,
            sentBy,
            productTitle:
              guideLink.productTitle ||
              selectedGuideOrderItem?.productTitle ||
              item.productTitle,
            guideSlug: guideLink.guideSlug,
            guideLinkUrl: guideLink.linkUrl,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(
            [payload?.error, payload?.details].filter(Boolean).join(" ") ||
              "Grow guide conversation block could not be created."
          );
          return;
        }

        setMessage(payload.message || "Grow guide conversation block created.");
      }
    );
  }

  const visibleSummary = useMemo(
    () =>
      statusOptions
        .map((option) => ({ label: option, value: summary[option] || 0 }))
        .filter((item) => item.value > 0),
    [summary]
  );
  const orderCards = useMemo(() => {
    const groups = [];
    const littleOrchardGroups = new Map();

    for (const item of items) {
      if (item.sourceType !== "little-orchard-shop" || !item.orderCode) {
        groups.push({
          key: item.id,
          primary: item,
          items: [item],
          isLittleOrchardOrder: false,
        });
        continue;
      }

      const key = `little-orchard-${item.orderCode}`;
      const existing = littleOrchardGroups.get(key);

      if (existing) {
        existing.items.push(item);
      } else {
        const group = {
          key,
          primary: item,
          items: [item],
          isLittleOrchardOrder: true,
        };

        littleOrchardGroups.set(key, group);
        groups.push(group);
      }
    }

    return groups;
  }, [items]);

  return (
    <section style={styles.stack}>
      <div style={isNarrow ? styles.toolbarNarrow : styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order, SKU, recipient, product..."
          style={styles.input}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={styles.select}
        >
          <option value="">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={fulfillmentType}
          onChange={(event) => setFulfillmentType(event.target.value)}
          style={styles.select}
        >
          {fulfillmentTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.summary}>
        <strong>Total: {summary.total || 0}</strong>
        {visibleSummary.map((item) => (
          <span key={item.label}>
            {item.label}: {item.value}
          </span>
        ))}
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.grid}>
        {orderCards.map((group) => {
          const item = group.primary;
          const orderItems = group.items;
          const draft = editing[item.id] || {};
          const currentStatus =
            draft.fulfillmentStatus || item.fulfillmentStatus || "PENDING";
          const orderQuantity = orderItems.reduce(
            (sum, entry) => sum + Number(entry.quantity || 0),
            0
          );
          const orderTotal = orderItems.reduce(
            (sum, entry) => sum + Number(entry.lineTotal || 0),
            0
          );
          const selectedPaymentMethod = paymentMethods[item.orderCode] || "";
          const cashTenderedValue = Number(
            cashTenderedByOrder[item.orderCode] || 0
          );
          const cashChangeDue =
            selectedPaymentMethod === "cash" &&
            Number.isFinite(cashTenderedValue)
              ? cashTenderedValue - orderTotal
              : null;
          const adHocDraft = adHocItemDrafts[item.orderCode] || {
            productTitle: "",
            sizeLabel: "",
            quantity: 1,
            unitPrice: "",
          };
          const catalogDraft = catalogItemDrafts[item.orderCode] || {
            catalogKey: littleOrchardCatalogChoices[0]?.key || "",
            quantity: 1,
          };
          const guideEligibleOrderItems = orderItems.filter((entry) =>
            getGrowGuideLabelForOrderItem(entry)
          );
          const guideDraftItemId =
            growGuideDrafts[item.orderCode] ||
            guideEligibleOrderItems[0]?.id ||
            "";
          const selectedGuideOrderItem =
            guideEligibleOrderItems.find((entry) => entry.id === guideDraftItemId) ||
            guideEligibleOrderItems[0] ||
            null;
          const generatedGrowGuideLink =
            generatedGrowGuideLinks[item.orderCode] ||
            item.metadata?.lastGrowGuideLink ||
            null;
          const growGuideMessageSet =
            growGuideMessageSets[item.orderCode] || "just-bought";
          const preparedGrowGuideMessage = generatedGrowGuideLink
            ? buildGrowGuideCustomerMessage({
                item: selectedGuideOrderItem || item,
                guideLink: generatedGrowGuideLink,
                messageSet: growGuideMessageSet,
              })
            : "";
          const growGuideBusy = Boolean(
            busyActions[`grow-guide-link:${item.orderCode}`]
          );
          const selectedCatalogChoice =
            littleOrchardCatalogChoices.find(
              (choice) => choice.key === catalogDraft.catalogKey
            ) || littleOrchardCatalogChoices[0];
          const customerPhone = getLittleOrchardOrderPhone(item);
          const customerEmail = getLittleOrchardOrderEmail(item);
          const socialContacts = getLittleOrchardSocialContacts(item);
          const cashierLink = getCashierLink(item);
          const receiptLink = getReceiptLink(item);
          const order = item.invitationOrder;
          const customerName =
            item.recipientName || order?.purchaserName || "No customer name";
          const selectedMessageTemplate =
            messageTemplateByOrder[item.orderCode] ||
            (item.fulfillmentStatus === "READY"
              ? "ready"
              : item.metadata?.paymentStatus === "PAYMENT_CONFIRMED"
                ? "receipt"
                : "payment");
          const preparedCustomerMessage = buildCustomerMessage({
            item,
            orderTotal,
            template: selectedMessageTemplate,
          });
          const confirmPaymentBusy = Boolean(
            busyActions[`confirm-payment:${item.orderCode}`]
          );
          const whatsappBusy = Boolean(
            busyActions[`whatsapp:${item.orderCode}`]
          );
          const emailBusy = Boolean(busyActions[`email:${item.orderCode}`]);
          const sendEmailBusy = Boolean(
            busyActions[`send-email:${item.orderCode}`]
          );
          const copyBusy = Boolean(busyActions[`copy:${item.orderCode}`]);
          const receiptBusy = Boolean(
            busyActions[`receipt:${item.orderCode}`]
          );
          const customerPhoneBusy = Boolean(
            busyActions[`customer-phone:${item.orderCode}`]
          );
          const customerContactBusy = Boolean(
            busyActions[`customer-contact:${item.orderCode}`]
          );
          const customerNotesBusy = Boolean(
            busyActions[`customer-notes:${item.orderCode}`]
          );
          const customerPhoneDraft =
            customerPhoneDrafts[item.orderCode] ?? customerPhone;
          const customerContactDraft = customerContactDrafts[item.orderCode] || {};
          const contactDraftName =
            customerContactDraft.name ?? customerName ?? "";
          const contactDraftPhone =
            customerContactDraft.phone ?? customerPhone ?? "";
          const contactDraftEmail =
            customerContactDraft.email ?? customerEmail ?? "";
          const contactDraftMethod =
            customerContactDraft.contactMethod ??
            item.metadata?.plantShopContactMethod ??
            "contact";
          const customerNotesDraft =
            customerNotesDrafts[item.orderCode] ??
            item.metadata?.customerNotes ??
            "";
          const isPhysicalInvitationOrder =
            item.fulfillmentType === "physical" &&
            item.sourceType === "physical-invitation";
          const physicalInvitationAddress =
            item.metadata?.invitationMailingAddress || null;
          const hasPhysicalInvitationAddress = Boolean(
            formatAddress(physicalInvitationAddress)
          );
          const paymentAllocations =
            paymentAllocationDrafts[item.orderCode] ||
            getPaymentAllocations(item);
          const paidTotal = Object.values(paymentAllocations).reduce(
            (sum, amount) => sum + Number(amount || 0),
            0
          );
          const customerOwes = getCustomerOwesAmount({ item, orderTotal });
          const isPaidComplete = customerOwes <= 0;
          const expandedSection = expandedAccordions[item.orderCode] || "";
          const paymentAllocationBusy = Boolean(
            busyActions[`payment-allocations:${item.orderCode}`]
          );
          const canEditOrder =
            currentStatus !== "FULFILLED" && customerOwes > 0;
          const itemsAccordionPanel = (
            <div style={styles.accordionPanel}>
              <div style={styles.orderItemList}>
                {orderItems.map((entry) => (
                  <div key={entry.id} style={styles.orderItemRow}>
                    <div style={styles.minWidthZero}>
                      <strong style={styles.breakText}>
                        {getOrderItemTitle(entry)}
                      </strong>
                      <div style={{ ...styles.muted, ...styles.breakText }}>
                        SKU: {entry.sku || entry.productSku || "No SKU"}
                      </div>
                      <div style={{ ...styles.muted, ...styles.breakText }}>
                        {isNurseryStockRequest(entry)
                          ? `Requested item: ${getRequestedItemLabel(entry)}`
                          : [entry.sizeLabel, entry.purchaseModeLabel]
                              .filter(Boolean)
                              .join(" - ")}
                      </div>
                    </div>
                    <div style={styles.orderItemMeta}>
                      <span>Qty {entry.quantity}</span>
                      <span>{formatMoney(entry)}</span>
                      {canEditOrder ? (
                        <button
                          type="button"
                          onClick={() => removeLittleOrchardOrderItem(entry)}
                          disabled={Boolean(
                            busyActions[`remove-order-item:${entry.id}`]
                          )}
                          style={styles.inlineDangerButton}
                        >
                          {busyActions[`remove-order-item:${entry.id}`]
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {canEditOrder ? (
                <>
                  <div style={styles.adHocItemPanel}>
                    <strong>Add Item - from store inventory</strong>
                    <div style={styles.adHocItemGrid}>
                      <label style={styles.label}>
                        Shop item
                        <select
                          value={catalogDraft.catalogKey}
                          onChange={(event) =>
                            setCatalogItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                catalogKey: event.target.value,
                              },
                            }))
                          }
                          style={styles.selectWide}
                        >
                          {littleOrchardCatalogChoices.map((choice) => (
                            <option key={choice.key} value={choice.key}>
                              {choice.label} -{" "}
                              {formatMoneyValue(
                                choice.currencyCode,
                                choice.price
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={styles.label}>
                        Qty
                        <input
                          type="number"
                          min="1"
                          value={catalogDraft.quantity ?? 1}
                          onChange={(event) =>
                            setCatalogItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                quantity: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        />
                      </label>
                      <div style={styles.pricePreview}>
                        {selectedCatalogChoice
                          ? formatMoneyValue(
                              selectedCatalogChoice.currencyCode,
                              Number(catalogDraft.quantity || 1) *
                                selectedCatalogChoice.price
                            )
                          : "Choose item"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addCatalogOrderItem(item)}
                      disabled={Boolean(
                        busyActions[`add-catalog-item:${item.orderCode}`]
                      )}
                      style={styles.secondaryButton}
                    >
                      {busyActions[`add-catalog-item:${item.orderCode}`]
                        ? "Adding shop item..."
                        : "Add shop item to this order"}
                    </button>
                  </div>
                  <div style={styles.adHocItemPanel}>
                    <strong>Add Item - manual</strong>
                    <div style={styles.adHocItemGrid}>
                      <label style={styles.label}>
                        Item name
                        <input
                          value={adHocDraft.productTitle}
                          onChange={(event) =>
                            setAdHocItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                productTitle: event.target.value,
                              },
                            }))
                          }
                          placeholder="Example: Rare herb cutting"
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Size / note
                        <input
                          value={adHocDraft.sizeLabel}
                          onChange={(event) =>
                            setAdHocItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                sizeLabel: event.target.value,
                              },
                            }))
                          }
                          placeholder="Optional"
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Qty
                        <input
                          type="number"
                          min="1"
                          value={adHocDraft.quantity ?? 1}
                          onChange={(event) =>
                            setAdHocItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                quantity: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Price
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={adHocDraft.unitPrice}
                          onChange={(event) =>
                            setAdHocItemDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                unitPrice: event.target.value,
                              },
                            }))
                          }
                          placeholder="JMD"
                          style={styles.input}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => addAdHocOrderItem(item)}
                      disabled={Boolean(
                        busyActions[`add-ad-hoc-item:${item.orderCode}`]
                      )}
                      style={styles.secondaryButton}
                    >
                      {busyActions[`add-ad-hoc-item:${item.orderCode}`]
                        ? "Adding item..."
                        : "Add manual item"}
                    </button>
                  </div>
                </>
              ) : (
                <div style={styles.muted}>
                  Add Item is locked after the order is fulfilled or the customer
                  no longer owes a balance.
                </div>
              )}
              <button
                type="button"
                style={styles.closeAccordionButton}
                onClick={() => toggleAccordion(item.orderCode, "items")}
              >
                Close Items
              </button>
            </div>
          );
          const deliveryAccordionPanel = (
            <div style={styles.accordionPanel}>
              <div style={isNarrow ? styles.detailGridNarrow : styles.detailGrid}>
                <Info
                  label="Delivery or pickup"
                  value={
                    item.metadata?.pickupLocationLabel ||
                    item.shippingMethod ||
                    "Not selected"
                  }
                />
                <Info
                  label="Delivery service"
                  value={
                    item.selectedCourier?.name ||
                    item.selectedCourierName ||
                    "Not selected"
                  }
                />
                <Info
                  label="Tracking information"
                  value={item.trackingReference || "Not recorded"}
                />
              </div>
              {order?.deliverySelection ? (
                <pre style={styles.pre}>
                  {JSON.stringify(order.deliverySelection, null, 2)}
                </pre>
              ) : null}
              <div style={styles.controls}>
                <label style={styles.label}>
                  Tracking / delivery reference
                  <input
                    value={
                      draft.trackingReference !== undefined
                        ? draft.trackingReference
                        : item.trackingReference || ""
                    }
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          trackingReference: event.target.value,
                        },
                      }))
                    }
                    style={styles.input}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void updateItem(item)}
                  disabled={Boolean(updatingItemIds[item.id])}
                  style={{
                    ...styles.button,
                    ...(updatingItemIds[item.id] ? styles.loadingButton : {}),
                  }}
                >
                  {updatingItemIds[item.id]
                    ? "Updating fulfillment..."
                    : "Update fulfillment"}
                </button>
              </div>
              <button
                type="button"
                style={styles.closeAccordionButton}
                onClick={() => toggleAccordion(item.orderCode, "delivery")}
              >
                Close Delivery
              </button>
            </div>
          );
          const messageAccordionPanel = (
            <div style={styles.accordionPanel}>
              <div style={styles.communicationGrid}>
                <div style={styles.messageTemplateList}>
                  {customerMessageTemplates.map((template) => (
                    <label
                      key={`${item.orderCode}-${template.value}`}
                      style={styles.messageTemplateOption}
                    >
                      <input
                        type="radio"
                        name={`customer-message-template-${item.orderCode}`}
                        value={template.value}
                        checked={selectedMessageTemplate === template.value}
                        onChange={() =>
                          setMessageTemplateByOrder((current) => ({
                            ...current,
                            [item.orderCode]: template.value,
                          }))
                        }
                      />
                      <span>{template.label}</span>
                    </label>
                  ))}
                </div>
                {customerPhone ? (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    disabled={whatsappBusy}
                    onClick={() =>
                      runBusyAction(
                        `whatsapp:${item.orderCode}`,
                        "Preparing WhatsApp message...",
                        async () => {
                          openWhatsAppMessage(customerPhone, preparedCustomerMessage);
                          setMessage("WhatsApp message prepared.");
                        }
                      )
                    }
                  >
                    {whatsappBusy
                      ? "Preparing WhatsApp..."
                      : "Prepare selected WhatsApp message"}
                  </button>
                ) : null}
                {customerEmail ? (
                  <button
                    type="button"
                    style={styles.primarySmallButton}
                    disabled={sendEmailBusy}
                    onClick={() =>
                      sendCustomerEmailFromWebsite({
                        item,
                        customerEmail,
                        subject: `Little Orchard order ${item.orderCode}`,
                        message: preparedCustomerMessage,
                      })
                    }
                  >
                    {sendEmailBusy
                      ? "Sending email..."
                      : "Send selected email from website"}
                  </button>
                ) : null}
                <button
                  type="button"
                  style={styles.secondaryButton}
                  disabled={copyBusy}
                  onClick={async () => {
                    await runBusyAction(
                      `copy:${item.orderCode}`,
                      "Copying selected customer message...",
                      async () => {
                        const copied = await copyMessageToClipboard(
                          preparedCustomerMessage
                        );
                        setMessage(
                          copied
                            ? "Selected customer message copied."
                            : "Message could not be copied automatically."
                        );
                      }
                    );
                  }}
                >
                  {copyBusy
                    ? "Copying message..."
                    : "Copy selected message for other channel"}
                </button>
              </div>
              <button
                type="button"
                style={styles.closeAccordionButton}
                onClick={() => toggleAccordion(item.orderCode, "message")}
              >
                Close Send Message
              </button>
            </div>
          );
          const activitiesAccordionPanel = (
            <div style={styles.accordionPanel}>
              {Array.isArray(item.activities) && item.activities.length ? (
                <div style={styles.activityList}>
                  {item.activities.map((activity) => (
                    <div key={activity.id} style={styles.activityItem}>
                      <div style={styles.recipientHeader}>
                        <strong style={styles.breakText}>
                          {activity.stageLabel || activity.stageKey}
                        </strong>
                        <span style={styles.muted}>
                          {formatDate(activity.completedAt)}
                        </span>
                      </div>
                      <div style={{ ...styles.muted, ...styles.breakText }}>
                        {(activity.updateType || "manual").toUpperCase()}
                        {activity.source ? ` - ${activity.source}` : ""}
                        {activity.staffUserName
                          ? ` - ${activity.staffUserName}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={styles.muted}>
                  No activity records have been saved for this order yet.
                </span>
              )}
              <button
                type="button"
                style={styles.closeAccordionButton}
                onClick={() => toggleAccordion(item.orderCode, "activities")}
              >
                Close Activity Records
              </button>
            </div>
          );

          if (group.isLittleOrchardOrder) {
            return (
              <article
                key={group.key}
                style={{
                  ...styles.customerCard,
                  borderColor: statusColor(currentStatus),
                }}
              >
                <div style={isNarrow ? styles.customerHeaderNarrow : styles.customerHeader}>
                  <div style={styles.customerAvatar}>
                    {item.metadata?.customerProfileImageUrl ? (
                      <img
                        src={item.metadata.customerProfileImageUrl}
                        alt=""
                        style={styles.customerAvatarImage}
                      />
                    ) : (
                      getCustomerInitials(customerName)
                    )}
                  </div>
                  <div style={styles.minWidthZero}>
                    <div style={styles.customerNameRow}>
                      <strong
                        style={
                          isNarrow ? styles.customerNameNarrow : styles.customerName
                        }
                      >
                        {customerName}
                      </strong>
                      {item.metadata?.followUpDue ? (
                        <span style={styles.followUpDot} aria-label="Follow-up due" />
                      ) : null}
                    </div>
                    <div style={styles.customerSubline}>
                      {customerPhone || "No phone"} -{" "}
                      {(item.metadata?.plantShopContactMethod || "contact")
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </div>
                    <div style={styles.customerSubline}>
                      {customerEmail || "No email"}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={styles.textLinkButton}
                    onClick={() => toggleAccordion(item.orderCode, "contact")}
                  >
                    adjust
                  </button>
                </div>
                {expandedSection === "contact" ? (
                  <div style={styles.accordionPanel}>
                    <div style={isNarrow ? styles.detailGridNarrow : styles.detailGrid}>
                      <label style={styles.label}>
                        Customer name
                        <input
                          value={contactDraftName}
                          onChange={(event) =>
                            setCustomerContactDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                name: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Contact number
                        <input
                          type="tel"
                          value={contactDraftPhone}
                          onChange={(event) =>
                            setCustomerContactDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                phone: event.target.value,
                              },
                            }))
                          }
                          placeholder="Include country and area code"
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Email
                        <input
                          type="email"
                          value={contactDraftEmail}
                          onChange={(event) =>
                            setCustomerContactDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                email: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.label}>
                        Preferred channel
                        <select
                          value={contactDraftMethod}
                          onChange={(event) =>
                            setCustomerContactDrafts((current) => ({
                              ...current,
                              [item.orderCode]: {
                                ...(current[item.orderCode] || {}),
                                contactMethod: event.target.value,
                              },
                            }))
                          }
                          style={styles.selectWide}
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="phone_call">Phone call / SMS</option>
                          <option value="contact">Contact</option>
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      disabled={customerContactBusy}
                      onClick={() => updateLittleOrchardCustomerContact(item)}
                    >
                      {customerContactBusy ? "Saving contact..." : "Save contact information"}
                    </button>
                    <button
                      type="button"
                      style={styles.closeAccordionButton}
                      onClick={() => toggleAccordion(item.orderCode, "contact")}
                    >
                      Close Contact
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  style={styles.notesRow}
                  onClick={() => toggleAccordion(item.orderCode, "notes")}
                >
                  <span>NOTES</span>
                  <strong>add / remove</strong>
                </button>
                {expandedSection === "notes" ? (
                  <div style={styles.accordionPanel}>
                    <label style={styles.label}>
                      Customer notes
                      <textarea
                        value={customerNotesDraft}
                        onChange={(event) =>
                          setCustomerNotesDrafts((current) => ({
                            ...current,
                            [item.orderCode]: event.target.value,
                          }))
                        }
                        rows={5}
                        placeholder="Record useful details from the customer conversation."
                        style={styles.textarea}
                      />
                    </label>
                    <div style={styles.inlineActionRow}>
                      <button
                        type="button"
                        style={styles.primarySmallButton}
                        disabled={customerNotesBusy}
                        onClick={() =>
                          updateLittleOrchardCustomerNotes(
                            item,
                            customerNotesDraft
                          )
                        }
                      >
                        {customerNotesBusy ? "Saving notes..." : "Save notes"}
                      </button>
                      <button
                        type="button"
                        style={styles.inlineDangerButton}
                        disabled={customerNotesBusy}
                        onClick={() => updateLittleOrchardCustomerNotes(item, "")}
                      >
                        Remove notes
                      </button>
                    </div>
                    <button
                      type="button"
                      style={styles.closeAccordionButton}
                      onClick={() => toggleAccordion(item.orderCode, "notes")}
                    >
                      Close Notes
                    </button>
                  </div>
                ) : null}

                <div style={isNarrow ? styles.orderBlockNarrow : styles.orderBlock}>
                  <div style={isNarrow ? styles.orderBlockHeaderNarrow : styles.orderBlockHeader}>
                    <div style={styles.minWidthZero}>
                      <strong style={styles.orderTitleStack}>
                        <span>Little Orchard Order</span>
                        <span style={styles.orderNumberLine}>{item.orderCode}</span>
                      </strong>
                      <div style={styles.customerSubline}>
                        {formatDate(item.createdAt).toUpperCase()} - ORDER CREATED
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...styles.orderStatusBlock,
                        ...(isNarrow ? styles.orderStatusBlockNarrow : {}),
                        ...styles.orderStatusButton,
                      }}
                      onClick={() => toggleAccordion(item.orderCode, "status")}
                    >
                      <strong style={{ color: statusColor(currentStatus) }}>
                        {currentStatus}
                      </strong>
                      <span>{item.fulfillmentType}</span>
                    </button>
                  </div>

                  {expandedSection === "status" ? (
                    <div style={styles.accordionPanel}>
                      <strong>Update fulfillment status</strong>
                      <div style={styles.statusChoiceGrid}>
                        {statusOptions.map((option) => (
                          <div key={option} style={styles.statusChoiceRow}>
                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                borderColor: statusColor(option),
                                color: statusColor(option),
                              }}
                              disabled={Boolean(updatingItemIds[item.id])}
                              onClick={() =>
                                void updateItem(item, {
                                  fulfillmentStatus: option,
                                })
                              }
                            >
                              {option}
                            </button>
                            <button
                              type="button"
                              style={styles.secondaryButton}
                              disabled={Boolean(updatingItemIds[item.id])}
                              onClick={async () => {
                                await updateItem(item, {
                                  fulfillmentStatus: option,
                                });
                                setMessageTemplateByOrder((current) => ({
                                  ...current,
                                  [item.orderCode]:
                                    option === "READY"
                                      ? "ready"
                                      : option === "CANCELED" ||
                                          option === "REFUNDED"
                                        ? "cancelled"
                                        : item.metadata?.paymentStatus ===
                                            "PAYMENT_CONFIRMED"
                                          ? "receipt"
                                          : "payment",
                                }));
                                toggleAccordion(item.orderCode, "delivery");
                              }}
                            >
                              {option} + Notify
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        style={styles.closeAccordionButton}
                        onClick={() => toggleAccordion(item.orderCode, "status")}
                      >
                        Close Status
                      </button>
                    </div>
                  ) : null}

                  <div style={isNarrow ? styles.orderDateGridNarrow : styles.orderDateGrid}>
                    <Info label="Record created" value={formatDate(item.createdAt)} />
                    <Info label="Record last updated" value={formatDate(item.updatedAt)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.orderCode, "payment")}
                    style={
                      expandedSection === "payment"
                        ? isNarrow
                          ? styles.paymentSummaryButtonActiveNarrow
                          : styles.paymentSummaryButtonActive
                        : isNarrow
                          ? styles.paymentSummaryButtonNarrow
                          : styles.paymentSummaryButton
                    }
                  >
                    <span style={isNarrow ? styles.customerOwesSummaryNarrow : undefined}>
                      <strong>Customer owes</strong>
                      <span
                        style={
                          isPaidComplete
                            ? styles.customerOwesComplete
                            : styles.customerOwesDue
                        }
                      >
                        {formatMoneyValue(item.currencyCode, customerOwes)}
                      </span>
                    </span>
                    <span style={isNarrow ? styles.totalSummaryNarrow : styles.totalSummary}>
                      <strong>TOTAL</strong>
                      <span>{formatMoneyValue(item.currencyCode, orderTotal)}</span>
                    </span>
                  </button>

                  {expandedSection === "payment" ? (
                    <div style={styles.accordionPanel}>
                      <div style={styles.paymentAllocationList}>
                        {paymentAllocationOptions.map((option) => (
                          <label key={option.value} style={styles.paymentAllocationRow}>
                            <span>
                              <strong>{option.label}</strong>
                              <small>{item.currencyCode || "JMD"}</small>
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentAllocations[option.value] ?? 0}
                              onChange={(event) =>
                                setPaymentAllocationDrafts((current) => ({
                                  ...current,
                                  [item.orderCode]: {
                                    ...paymentAllocations,
                                    [option.value]: event.target.value,
                                  },
                                }))
                              }
                              style={styles.amountInput}
                            />
                          </label>
                        ))}
                      </div>
                      <div style={styles.paymentTotalsRow}>
                        <span>Recorded received: {formatMoneyValue(item.currencyCode, paidTotal)}</span>
                        <span>Customer owes: {formatMoneyValue(item.currencyCode, customerOwes)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateLittleOrchardPaymentAllocations(item)}
                        disabled={paymentAllocationBusy}
                        style={styles.secondaryButton}
                      >
                        {paymentAllocationBusy
                          ? "Saving payment amounts..."
                          : "Save payment amounts"}
                      </button>
                      {item.metadata?.paymentStatus !== "PAYMENT_CONFIRMED" ? (
                        <div style={styles.paymentConfirmPanel}>
                          <label style={styles.label}>
                            Confirm payment method
                            <select
                              value={selectedPaymentMethod}
                              onChange={(event) =>
                                setPaymentMethods((current) => ({
                                  ...current,
                                  [item.orderCode]: event.target.value,
                                }))
                              }
                              style={styles.selectWide}
                            >
                              <option value="">Choose method</option>
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank transfer</option>
                              <option value="remittance">Remittance</option>
                              <option value="other">Other</option>
                            </select>
                          </label>
                          {selectedPaymentMethod === "cash" ? (
                            <div style={styles.cashTenderPanel}>
                              <label style={styles.label}>
                                Cash received
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={cashTenderedByOrder[item.orderCode] || ""}
                                  onChange={(event) =>
                                    setCashTenderedByOrder((current) => ({
                                      ...current,
                                      [item.orderCode]: event.target.value,
                                    }))
                                  }
                                  placeholder={formatMoneyValue(
                                    item.currencyCode,
                                    orderTotal
                                  )}
                                  style={styles.input}
                                />
                              </label>
                              <div
                                style={
                                  cashChangeDue !== null && cashChangeDue < 0
                                    ? styles.warningText
                                    : styles.muted
                                }
                              >
                                Change to return:{" "}
                                {cashChangeDue === null ||
                                !Number.isFinite(cashChangeDue)
                                  ? "Enter cash received"
                                  : formatMoneyValue(
                                      item.currencyCode,
                                      Math.max(0, cashChangeDue)
                                    )}
                              </div>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              confirmLittleOrchardPayment(item, currentStatus)
                            }
                            disabled={confirmPaymentBusy}
                            style={styles.primarySmallButton}
                          >
                            {confirmPaymentBusy
                              ? "Confirming payment..."
                              : "Confirm payment + update fulfillment"}
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        style={styles.closeAccordionButton}
                        onClick={() => toggleAccordion(item.orderCode, "payment")}
                      >
                        Close Customer owes
                      </button>
                    </div>
                  ) : null}

                  <div style={isNarrow ? styles.orderTabsNarrow : styles.orderTabs}>
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.orderCode, "items")}
                      style={
                        expandedSection === "items"
                          ? styles.orderTabButtonActive
                          : styles.orderTabButton
                      }
                    >
                      ITEMS ({orderQuantity})
                    </button>
                    {isNarrow && expandedSection === "items"
                      ? itemsAccordionPanel
                      : null}
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.orderCode, "delivery")}
                      style={
                        expandedSection === "delivery"
                          ? styles.orderTabButtonActive
                          : styles.orderTabButton
                      }
                    >
                      DELIVERY
                    </button>
                    {isNarrow && expandedSection === "delivery"
                      ? deliveryAccordionPanel
                      : null}
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.orderCode, "message")}
                      style={
                        expandedSection === "message"
                          ? styles.orderTabButtonActive
                          : styles.orderTabButton
                      }
                    >
                      SEND MESSAGE
                    </button>
                    {isNarrow && expandedSection === "message"
                      ? messageAccordionPanel
                      : null}
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.orderCode, "activities")}
                      style={
                        expandedSection === "activities"
                          ? styles.orderTabButtonActive
                          : styles.orderTabButton
                      }
                    >
                      ACTIVITY RECORDS
                    </button>
                    {isNarrow && expandedSection === "activities"
                      ? activitiesAccordionPanel
                      : null}
                    {!isNarrow ? (
                      <>
                        {cashierLink ? (
                          <a
                            href={cashierLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.orderTabLink}
                          >
                            CASHIER ORDER LINK
                          </a>
                        ) : null}
                        {receiptLink ? (
                          <a
                            href={receiptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.orderTabLink}
                          >
                            RECEIPT LINK
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteLittleOrchardOrder(item)}
                          disabled={Boolean(
                            busyActions[`delete-order:${item.orderCode}`]
                          )}
                          style={styles.orderDeleteButton}
                        >
                          {busyActions[`delete-order:${item.orderCode}`]
                            ? "DELETING..."
                            : "DELETE ORDER / RECEIPT"}
                        </button>
                      </>
                    ) : null}
                  </div>

                  {!isNarrow && expandedSection === "items" ? (
                    <div style={styles.accordionPanel}>
                      <div style={styles.orderItemList}>
                        {orderItems.map((entry) => (
                          <div key={entry.id} style={styles.orderItemRow}>
                            <div style={styles.minWidthZero}>
                              <strong style={styles.breakText}>
                                {getOrderItemTitle(entry)}
                              </strong>
                              <div style={{ ...styles.muted, ...styles.breakText }}>
                                SKU: {entry.sku || entry.productSku || "No SKU"}
                              </div>
                              <div style={{ ...styles.muted, ...styles.breakText }}>
                                {isNurseryStockRequest(entry)
                                  ? `Requested item: ${getRequestedItemLabel(entry)}`
                                  : [entry.sizeLabel, entry.purchaseModeLabel]
                                      .filter(Boolean)
                                      .join(" - ")}
                              </div>
                            </div>
                            <div style={styles.orderItemMeta}>
                              <span>Qty {entry.quantity}</span>
                              <span>{formatMoney(entry)}</span>
                              {canEditOrder ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeLittleOrchardOrderItem(entry)
                                  }
                                  disabled={Boolean(
                                    busyActions[`remove-order-item:${entry.id}`]
                                  )}
                                  style={styles.inlineDangerButton}
                                >
                                  {busyActions[`remove-order-item:${entry.id}`]
                                    ? "Removing..."
                                    : "Remove"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                      {canEditOrder ? (
                        <>
                          <div style={styles.adHocItemPanel}>
                            <strong>Add Item - from store inventory</strong>
                            <div style={styles.adHocItemGrid}>
                              <label style={styles.label}>
                                Shop item
                                <select
                                  value={catalogDraft.catalogKey}
                                  onChange={(event) =>
                                    setCatalogItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        catalogKey: event.target.value,
                                      },
                                    }))
                                  }
                                  style={styles.selectWide}
                                >
                                  {littleOrchardCatalogChoices.map((choice) => (
                                    <option key={choice.key} value={choice.key}>
                                      {choice.label} -{" "}
                                      {formatMoneyValue(
                                        choice.currencyCode,
                                        choice.price
                                      )}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label style={styles.label}>
                                Qty
                                <input
                                  type="number"
                                  min="1"
                                  value={catalogDraft.quantity ?? 1}
                                  onChange={(event) =>
                                    setCatalogItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        quantity: event.target.value,
                                      },
                                    }))
                                  }
                                  style={styles.input}
                                />
                              </label>
                              <div style={styles.pricePreview}>
                                {selectedCatalogChoice
                                  ? formatMoneyValue(
                                      selectedCatalogChoice.currencyCode,
                                      Number(catalogDraft.quantity || 1) *
                                        selectedCatalogChoice.price
                                    )
                                  : "Choose item"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => addCatalogOrderItem(item)}
                              disabled={Boolean(
                                busyActions[`add-catalog-item:${item.orderCode}`]
                              )}
                              style={styles.secondaryButton}
                            >
                              {busyActions[`add-catalog-item:${item.orderCode}`]
                                ? "Adding shop item..."
                                : "Add shop item to this order"}
                            </button>
                          </div>
                          <div style={styles.adHocItemPanel}>
                            <strong>Add Item - manual</strong>
                            <div style={styles.adHocItemGrid}>
                              <label style={styles.label}>
                                Item name
                                <input
                                  value={adHocDraft.productTitle}
                                  onChange={(event) =>
                                    setAdHocItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        productTitle: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Example: Rare herb cutting"
                                  style={styles.input}
                                />
                              </label>
                              <label style={styles.label}>
                                Size / note
                                <input
                                  value={adHocDraft.sizeLabel}
                                  onChange={(event) =>
                                    setAdHocItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        sizeLabel: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Optional"
                                  style={styles.input}
                                />
                              </label>
                              <label style={styles.label}>
                                Qty
                                <input
                                  type="number"
                                  min="1"
                                  value={adHocDraft.quantity ?? 1}
                                  onChange={(event) =>
                                    setAdHocItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        quantity: event.target.value,
                                      },
                                    }))
                                  }
                                  style={styles.input}
                                />
                              </label>
                              <label style={styles.label}>
                                Price
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={adHocDraft.unitPrice}
                                  onChange={(event) =>
                                    setAdHocItemDrafts((current) => ({
                                      ...current,
                                      [item.orderCode]: {
                                        ...(current[item.orderCode] || {}),
                                        unitPrice: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="JMD"
                                  style={styles.input}
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => addAdHocOrderItem(item)}
                              disabled={Boolean(
                                busyActions[`add-ad-hoc-item:${item.orderCode}`]
                              )}
                              style={styles.secondaryButton}
                            >
                              {busyActions[`add-ad-hoc-item:${item.orderCode}`]
                                ? "Adding item..."
                                : "Add manual item"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={styles.muted}>
                          Add Item is locked after the order is fulfilled or the
                          customer no longer owes a balance.
                        </div>
                      )}
                      <button
                        type="button"
                        style={styles.closeAccordionButton}
                        onClick={() => toggleAccordion(item.orderCode, "items")}
                      >
                        Close Items
                      </button>
                    </div>
                  ) : null}

                  {!isNarrow && expandedSection === "delivery"
                    ? deliveryAccordionPanel
                    : null}

                  {!isNarrow && expandedSection === "message" ? (
                    <div style={styles.accordionPanel}>
                      <div style={styles.communicationGrid}>
                        <div style={styles.messageTemplateList}>
                          {customerMessageTemplates.map((template) => (
                            <label
                              key={`${item.orderCode}-${template.value}`}
                              style={styles.messageTemplateOption}
                            >
                              <input
                                type="radio"
                                name={`customer-message-template-${item.orderCode}`}
                                value={template.value}
                                checked={selectedMessageTemplate === template.value}
                                onChange={() =>
                                  setMessageTemplateByOrder((current) => ({
                                    ...current,
                                    [item.orderCode]: template.value,
                                  }))
                                }
                              />
                              <span>{template.label}</span>
                            </label>
                          ))}
                        </div>
                        {customerPhone ? (
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            disabled={whatsappBusy}
                            onClick={() =>
                              runBusyAction(
                                `whatsapp:${item.orderCode}`,
                                "Preparing WhatsApp message...",
                                async () => {
                                  openWhatsAppMessage(
                                    customerPhone,
                                    preparedCustomerMessage
                                  );
                                  setMessage("WhatsApp message prepared.");
                                }
                              )
                            }
                          >
                            {whatsappBusy
                              ? "Preparing WhatsApp..."
                              : "Prepare selected WhatsApp message"}
                          </button>
                        ) : null}
                        {customerEmail ? (
                          <button
                            type="button"
                            style={styles.primarySmallButton}
                            disabled={sendEmailBusy}
                            onClick={() =>
                              sendCustomerEmailFromWebsite({
                                item,
                                customerEmail,
                                subject: `Little Orchard order ${item.orderCode}`,
                                message: preparedCustomerMessage,
                              })
                            }
                          >
                            {sendEmailBusy
                              ? "Sending email..."
                              : "Send selected email from website"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          disabled={copyBusy}
                          onClick={async () => {
                            await runBusyAction(
                              `copy:${item.orderCode}`,
                              "Copying selected customer message...",
                              async () => {
                                const copied = await copyMessageToClipboard(
                                  preparedCustomerMessage
                                );
                                setMessage(
                                  copied
                                    ? "Selected customer message copied."
                                    : "Message could not be copied automatically."
                                );
                              }
                            );
                          }}
                        >
                          {copyBusy
                            ? "Copying message..."
                            : "Copy selected message for other channel"}
                        </button>
                      </div>
                      <button
                        type="button"
                        style={styles.closeAccordionButton}
                        onClick={() => toggleAccordion(item.orderCode, "message")}
                      >
                        Close Send Message
                      </button>
                    </div>
                  ) : null}

                  {!isNarrow && expandedSection === "activities" ? (
                    <div style={styles.accordionPanel}>
                      {Array.isArray(item.activities) && item.activities.length ? (
                        <div style={styles.activityList}>
                          {item.activities.map((activity) => (
                            <div key={activity.id} style={styles.activityItem}>
                              <div style={styles.recipientHeader}>
                                <strong style={styles.breakText}>
                                  {activity.stageLabel || activity.stageKey}
                                </strong>
                                <span style={styles.muted}>
                                  {formatDate(activity.completedAt)}
                                </span>
                              </div>
                              <div style={{ ...styles.muted, ...styles.breakText }}>
                                {(activity.updateType || "manual").toUpperCase()}
                                {activity.source ? ` - ${activity.source}` : ""}
                                {activity.staffUserName
                                  ? ` - ${activity.staffUserName}`
                                  : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={styles.muted}>
                          No activity records have been saved for this order yet.
                        </span>
                      )}
                      <button
                        type="button"
                        style={styles.closeAccordionButton}
                        onClick={() => toggleAccordion(item.orderCode, "activities")}
                      >
                        Close Activity Records
                      </button>
                    </div>
                  ) : null}

                  {isNarrow ? (
                    <div style={styles.orderLinksNarrow}>
                      {cashierLink ? (
                        <a
                          href={cashierLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.orderTabLink}
                        >
                          CASHIER ORDER LINK
                        </a>
                      ) : null}
                      {receiptLink ? (
                        <a
                          href={receiptLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.orderTabLink}
                        >
                          RECEIPT LINK
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteLittleOrchardOrder(item)}
                        disabled={Boolean(
                          busyActions[`delete-order:${item.orderCode}`]
                        )}
                        style={styles.orderDeleteButton}
                      >
                        {busyActions[`delete-order:${item.orderCode}`]
                          ? "DELETING..."
                          : "DELETE ORDER / RECEIPT"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          }

          return (
            <article key={group.key} style={styles.card}>
              <div style={isNarrow ? styles.cardHeaderNarrow : styles.cardHeader}>
                <div style={styles.minWidthZero}>
                  <strong style={styles.breakText}>
                    {group.isLittleOrchardOrder
                      ? `Little Orchard order ${item.orderCode || ""}`.trim()
                      : item.productTitle}
                  </strong>
                  <div style={styles.muted}>
                    {group.isLittleOrchardOrder
                      ? [
                          item.recipientName || "No customer name",
                          `${orderItems.length} item${orderItems.length === 1 ? "" : "s"}`,
                        ].join(" - ")
                      : [item.sizeLabel, item.purchaseModeLabel]
                          .filter(Boolean)
                          .join(" - ") || "Order item"}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    color: statusColor(currentStatus),
                    borderColor: statusColor(currentStatus),
                  }}
                >
                  {currentStatus}
                </span>
              </div>

              <div style={isNarrow ? styles.detailGridNarrow : styles.detailGrid}>
                <Info label="Order" value={item.orderCode || "No order code"} />
                <Info label="Fulfillment" value={item.fulfillmentType} />
                <Info
                  label="Current stage"
                  value={item.currentStageLabel || item.fulfillmentStatus}
                />
                <Info
                  label="Courier"
                  value={
                    item.selectedCourier?.name ||
                    item.selectedCourierName ||
                    "Not selected"
                  }
                />
                <Info
                  label="Shipping method"
                  value={item.shippingMethod || "Not selected"}
                />
                <Info label="SKU" value={item.sku || item.productSku || "No SKU"} />
                <Info label="Quantity" value={orderQuantity} />
                <Info
                  label="Total"
                  value={
                    group.isLittleOrchardOrder
                      ? formatMoneyValue(item.currencyCode, orderTotal)
                      : formatMoney(item)
                  }
                />
                <Info
                  label="Customer"
                  value={item.recipientName || order?.purchaserName || "No name"}
                />
                <Info
                  label="Payment method"
                  value={item.metadata?.paymentMethodLabel || "Not confirmed"}
                />
                <Info
                  label="Receipt code"
                  value={item.metadata?.receiptCode || "Not generated"}
                />
                <Info
                  label="Estimated delivery"
                  value={formatDate(item.estimatedDeliveryAt)}
                />
                <Info
                  label="Remaining"
                  value={formatDuration(item.estimatedRemainingSeconds)}
                />
                <Info label="Created" value={formatDate(item.createdAt)} />
              </div>

              {group.isLittleOrchardOrder ? (
                <div style={styles.section}>
                  <strong>Order items</strong>
                  <div style={styles.orderItemList}>
                    {orderItems.map((entry) => (
                      <div key={entry.id} style={styles.orderItemRow}>
                        <div style={styles.minWidthZero}>
                          <strong style={styles.breakText}>
                            {getOrderItemTitle(entry)}
                          </strong>
                          <div style={{ ...styles.muted, ...styles.breakText }}>
                            {isNurseryStockRequest(entry)
                              ? `Requested item: ${getRequestedItemLabel(entry)}`
                              : [entry.sizeLabel, entry.purchaseModeLabel]
                                  .filter(Boolean)
                                  .join(" - ")}
                          </div>
                        </div>
                        <div style={styles.orderItemMeta}>
                          <span>Qty {entry.quantity}</span>
                          <span>{formatMoney(entry)}</span>
                          {item.metadata?.paymentStatus !==
                          "PAYMENT_CONFIRMED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                removeLittleOrchardOrderItem(entry)
                              }
                              disabled={Boolean(
                                busyActions[`remove-order-item:${entry.id}`]
                              )}
                              style={styles.inlineDangerButton}
                            >
                              {busyActions[`remove-order-item:${entry.id}`]
                                ? "Removing..."
                                : "Remove from receipt"}
                            </button>
                          ) : null}
                        </div>
                        {entry.purchaseModeId === "nursery-stock-request" ? (
                          <div style={styles.warningText}>
                            Nursery stock request: request fee is JMD 0.
                            Nursery availability and final product price must
                            be confirmed by a representative.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {item.sourceType === "little-orchard-shop" ? (
                <div style={styles.section}>
                  <strong>Little Orchard payment</strong>
                  <div style={styles.recipientMeta}>
                    <span>
                      Payment: {item.metadata?.paymentStatus || "AWAITING_PAYMENT"}
                    </span>
                    <span>
                      Inventory applied:{" "}
                      {item.metadata?.inventoryApplied ? "Yes" : "No"}
                    </span>
                    {cashierLink ? (
                      <a
                        href={cashierLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cashier order link
                      </a>
                    ) : null}
                    {receiptLink ? (
                      <a
                        href={receiptLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Receipt link
                      </a>
                    ) : null}
                  </div>
                  {item.purchaseModeId === "nursery-stock-request" ? (
                    <div style={styles.warningText}>
                      Nursery stock request: request fee is JMD 0. Nursery
                      availability and final product price must be confirmed by
                      a representative.
                    </div>
                  ) : null}
                  {item.metadata?.paymentStatus !== "PAYMENT_CONFIRMED" ? (
                    <div style={styles.adHocItemPanel}>
                      <strong>Add item from shop</strong>
                      <div style={styles.adHocItemGrid}>
                        <label style={styles.label}>
                          Shop item
                          <select
                            value={catalogDraft.catalogKey}
                            onChange={(event) =>
                              setCatalogItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  catalogKey: event.target.value,
                                },
                              }))
                            }
                            style={styles.selectWide}
                          >
                            {littleOrchardCatalogChoices.map((choice) => (
                              <option key={choice.key} value={choice.key}>
                                {choice.label} -{" "}
                                {formatMoneyValue(
                                  choice.currencyCode,
                                  choice.price
                                )}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={styles.label}>
                          Qty
                          <input
                            type="number"
                            min="1"
                            value={catalogDraft.quantity ?? 1}
                            onChange={(event) =>
                              setCatalogItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  quantity: event.target.value,
                                },
                              }))
                            }
                            style={styles.input}
                          />
                        </label>
                        <div style={styles.pricePreview}>
                          {selectedCatalogChoice
                            ? formatMoneyValue(
                                selectedCatalogChoice.currencyCode,
                                Number(catalogDraft.quantity || 1) *
                                  selectedCatalogChoice.price
                              )
                            : "Choose item"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCatalogOrderItem(item)}
                        disabled={Boolean(
                          busyActions[`add-catalog-item:${item.orderCode}`]
                        )}
                        style={styles.secondaryButton}
                      >
                        {busyActions[`add-catalog-item:${item.orderCode}`]
                          ? "Adding shop item..."
                          : "Add shop item to this order"}
                      </button>
                    </div>
                  ) : null}
                  {item.metadata?.paymentStatus !== "PAYMENT_CONFIRMED" ? (
                    <div style={styles.adHocItemPanel}>
                      <strong>Add typed item</strong>
                      <div style={styles.adHocItemGrid}>
                        <label style={styles.label}>
                          Item name
                          <input
                            value={adHocDraft.productTitle}
                            onChange={(event) =>
                              setAdHocItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  productTitle: event.target.value,
                                },
                              }))
                            }
                            placeholder="Example: Rare herb cutting"
                            style={styles.input}
                          />
                        </label>
                        <label style={styles.label}>
                          Size / note
                          <input
                            value={adHocDraft.sizeLabel}
                            onChange={(event) =>
                              setAdHocItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  sizeLabel: event.target.value,
                                },
                              }))
                            }
                            placeholder="Optional"
                            style={styles.input}
                          />
                        </label>
                        <label style={styles.label}>
                          Qty
                          <input
                            type="number"
                            min="1"
                            value={adHocDraft.quantity ?? 1}
                            onChange={(event) =>
                              setAdHocItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  quantity: event.target.value,
                                },
                              }))
                            }
                            style={styles.input}
                          />
                        </label>
                        <label style={styles.label}>
                          Price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={adHocDraft.unitPrice}
                            onChange={(event) =>
                              setAdHocItemDrafts((current) => ({
                                ...current,
                                [item.orderCode]: {
                                  ...(current[item.orderCode] || {}),
                                  unitPrice: event.target.value,
                                },
                              }))
                            }
                            placeholder="JMD"
                            style={styles.input}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => addAdHocOrderItem(item)}
                        disabled={Boolean(
                          busyActions[`add-ad-hoc-item:${item.orderCode}`]
                        )}
                        style={styles.secondaryButton}
                      >
                        {busyActions[`add-ad-hoc-item:${item.orderCode}`]
                          ? "Adding item..."
                          : "Add item to this order"}
                      </button>
                    </div>
                  ) : null}
                  {item.metadata?.paymentStatus !== "PAYMENT_CONFIRMED" ? (
                    <div style={styles.paymentConfirmPanel}>
                      <label style={styles.label}>
                        Payment method
                        <select
                          value={selectedPaymentMethod}
                          onChange={(event) =>
                            setPaymentMethods((current) => ({
                              ...current,
                              [item.orderCode]: event.target.value,
                            }))
                          }
                          style={styles.selectWide}
                        >
                          <option value="">Choose method</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="remittance">Remittance</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      {selectedPaymentMethod === "cash" ? (
                        <div style={styles.cashTenderPanel}>
                          <label style={styles.label}>
                            Cash received
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={cashTenderedByOrder[item.orderCode] || ""}
                              onChange={(event) =>
                                setCashTenderedByOrder((current) => ({
                                  ...current,
                                  [item.orderCode]: event.target.value,
                                }))
                              }
                              placeholder={formatMoneyValue(
                                item.currencyCode,
                                orderTotal
                              )}
                              style={styles.input}
                            />
                          </label>
                          <div
                            style={
                              cashChangeDue !== null && cashChangeDue < 0
                                ? styles.warningText
                                : styles.muted
                            }
                          >
                            Change to return:{" "}
                            {cashChangeDue === null ||
                            !Number.isFinite(cashChangeDue)
                              ? "Enter cash received"
                              : formatMoneyValue(
                                  item.currencyCode,
                                  Math.max(0, cashChangeDue)
                                )}
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          confirmLittleOrchardPayment(item, currentStatus)
                        }
                        disabled={confirmPaymentBusy}
                        style={styles.primarySmallButton}
                      >
                        {confirmPaymentBusy
                          ? "Confirming payment..."
                          : "Confirm payment + update fulfillment"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {item.sourceType === "little-orchard-shop" ? (
                <div style={styles.section}>
                  <strong>Customer communication</strong>
                  <div style={styles.recipientMeta}>
                    {customerPhone ? (
                      <span>WhatsApp: {customerPhone}</span>
                    ) : null}
                    {customerEmail ? <span>Email: {customerEmail}</span> : null}
                    {socialContacts.map((contact) => (
                      <span key={contact}>{contact}</span>
                    ))}
                    {!customerPhone &&
                    !customerEmail &&
                    socialContacts.length === 0 ? (
                      <span>No customer contact method recorded.</span>
                    ) : null}
                  </div>
                  {item.metadata?.customerNotes ? (
                    <div style={styles.notePanel}>
                      <strong>Customer notes</strong>
                      <span>{item.metadata.customerNotes}</span>
                    </div>
                  ) : null}
                  <div style={styles.inlineEditRow}>
                    <input
                      type="tel"
                      value={customerPhoneDraft}
                      onChange={(event) =>
                        setCustomerPhoneDrafts((current) => ({
                          ...current,
                          [item.orderCode]: event.target.value,
                        }))
                      }
                      placeholder="Customer phone, include country code"
                      style={styles.inlineInput}
                    />
                    <button
                      type="button"
                      style={styles.secondarySmallButton}
                      disabled={customerPhoneBusy}
                      onClick={() => updateLittleOrchardCustomerPhone(item)}
                    >
                      {customerPhoneBusy ? "Saving..." : "Save number"}
                    </button>
                  </div>
                  <div style={styles.communicationGrid}>
                    <div style={styles.messageTemplateList}>
                      {customerMessageTemplates.map((template) => (
                        <label
                          key={`${item.orderCode}-${template.value}`}
                          style={styles.messageTemplateOption}
                        >
                          <input
                            type="radio"
                            name={`customer-message-template-${item.orderCode}`}
                            value={template.value}
                            checked={selectedMessageTemplate === template.value}
                            onChange={() =>
                              setMessageTemplateByOrder((current) => ({
                                ...current,
                                [item.orderCode]: template.value,
                              }))
                            }
                          />
                          <span>{template.label}</span>
                        </label>
                      ))}
                    </div>
                    {customerPhone ? (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={whatsappBusy}
                        onClick={() =>
                          runBusyAction(
                            `whatsapp:${item.orderCode}`,
                            "Preparing WhatsApp message...",
                            async () => {
                              openWhatsAppMessage(
                                customerPhone,
                                preparedCustomerMessage
                              );
                              setMessage("WhatsApp message prepared.");
                            }
                          )
                        }
                      >
                        {whatsappBusy
                          ? "Preparing WhatsApp..."
                          : "Prepare selected WhatsApp message"}
                      </button>
                    ) : null}
                    {customerEmail ? (
                      <>
                        <button
                          type="button"
                          style={styles.primarySmallButton}
                          disabled={sendEmailBusy}
                          onClick={() =>
                            sendCustomerEmailFromWebsite({
                              item,
                              customerEmail,
                              subject: `Little Orchard order ${item.orderCode}`,
                              message: preparedCustomerMessage,
                            })
                          }
                        >
                          {sendEmailBusy
                            ? "Sending email..."
                            : "Send selected email from website"}
                        </button>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          disabled={emailBusy}
                          onClick={() =>
                            runBusyAction(
                              `email:${item.orderCode}`,
                              "Opening Gmail compose fallback...",
                              async () => {
                                openEmailMessage(
                                  customerEmail,
                                  `Little Orchard order ${item.orderCode}`,
                                  preparedCustomerMessage
                                );
                                setMessage(
                                  "Gmail compose opened. Gmail controls which logged-in address sends it."
                                );
                              }
                            )
                          }
                        >
                          {emailBusy
                            ? "Opening Gmail..."
                            : "Open Gmail compose fallback"}
                        </button>
                        {receiptLink ? (
                          <a
                            href={receiptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.linkButton}
                            onClick={(event) => {
                              if (receiptBusy) {
                                event.preventDefault();
                                return;
                              }

                              setBusyActions((current) => ({
                                ...current,
                                [`receipt:${item.orderCode}`]: true,
                              }));
                              setMessage("Opening receipt / status...");
                              window.setTimeout(() => {
                                setBusyActions((current) => {
                                  const next = { ...current };
                                  delete next[`receipt:${item.orderCode}`];
                                  return next;
                                });
                              }, 650);
                            }}
                          >
                            {receiptBusy ? "Opening receipt..." : "Open receipt"}
                          </a>
                        ) : null}
                      </>
                    ) : null}
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      disabled={copyBusy}
                      onClick={async () => {
                        await runBusyAction(
                          `copy:${item.orderCode}`,
                          "Copying selected customer message...",
                          async () => {
                            const copied = await copyMessageToClipboard(
                              preparedCustomerMessage
                            );
                            setMessage(
                              copied
                                ? "Selected customer message copied."
                                : "Message could not be copied automatically."
                            );
                          }
                        );
                      }}
                    >
                      {copyBusy
                        ? "Copying message..."
                        : "Copy selected message for other channel"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={styles.section}>
                <strong>{item.ticketRecipients?.length ? "Purchaser" : "Recipient"}</strong>
                <div style={styles.breakText}>
                  {item.recipientName || order?.purchaserName || "No name"}
                </div>
                <div style={{ ...styles.muted, ...styles.breakText }}>
                  {item.recipientEmail || order?.purchaserEmail || "No email"}
                </div>
                {item.ticketAttendeeName ? (
                  <div style={styles.muted}>
                    {item.ticketAttendeeName} add-on
                    {item.ticketCode ? ` - ${item.ticketCode}` : ""}
                  </div>
                ) : null}
                {Array.isArray(item.metadata?.attendees) &&
                item.metadata.attendees.length ? (
                  <div style={styles.packageList}>
                    <strong>Package attendees</strong>
                    {item.metadata.attendees.map((attendee, index) => (
                      <div
                        key={`${attendee.ticketCode || attendee.name || "attendee"}-${index}`}
                        style={styles.breakText}
                      >
                        {attendee.name || `Attendee ${index + 1}`}
                        {attendee.isPlusOneTicket ? " (plus one)" : ""}
                        {attendee.ticketCode ? ` - ${attendee.ticketCode}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}
                {item.metadata?.physicalInvitationFulfillmentDetails ? (
                  <div style={styles.packageList}>
                    <strong>Package contents</strong>
                    <div style={{ ...styles.muted, ...styles.preLine }}>
                      {item.metadata.physicalInvitationFulfillmentDetails}
                    </div>
                  </div>
                ) : null}
              </div>

              {item.ticketRecipients?.length ? (
                <div style={styles.section}>
                  <strong>Ticket owners / recipients</strong>
                  <div style={styles.recipientList}>
                    {item.ticketRecipients.map((recipient, index) => (
                      <div
                        key={`${recipient.ticketCode || "ticket"}-${index}`}
                        style={styles.recipientCard}
                      >
                        <div
                          style={
                            isNarrow
                              ? styles.recipientHeaderNarrow
                              : styles.recipientHeader
                          }
                        >
                          <strong style={styles.breakText}>
                            {recipient.ownerName || `Recipient ${index + 1}`}
                          </strong>
                          <span style={{ ...styles.muted, ...styles.breakText }}>
                            {recipient.ticketLabel || recipient.sizeLabel || "Ticket"}
                          </span>
                        </div>
                        <div style={styles.recipientMeta}>
                          {recipient.ownerEmail ? (
                            <span>Email: {recipient.ownerEmail}</span>
                          ) : null}
                          {recipient.ownerPhone ? (
                            <span>Phone: {recipient.ownerPhone}</span>
                          ) : null}
                          {recipient.ticketCode ? (
                            <span>Ticket: {recipient.ticketCode}</span>
                          ) : null}
                          {recipient.purchaseModeLabel ? (
                            <span>Invitation: {recipient.purchaseModeLabel}</span>
                          ) : null}
                          {recipient.invitationMailingAddress ? (
                            <span>
                              Physical invitation address:{" "}
                              {formatAddress(recipient.invitationMailingAddress)}
                            </span>
                          ) : null}
                          {recipient.ticketOwnerPaymentMode ? (
                            <span>
                              Add-on handling: {recipient.ticketOwnerPaymentMode}
                            </span>
                          ) : null}
                          {Number(recipient.ticketOwnerAddonBudget || 0) > 0 ? (
                            <span>
                              Add-on budget:{" "}
                              {item.currencyCode || "USD"}{" "}
                              {Number(
                                recipient.ticketOwnerAddonBudget || 0
                              ).toLocaleString()}
                            </span>
                          ) : null}
                          {recipient.mealLabel ? (
                            <span>Meal: {recipient.mealLabel}</span>
                          ) : null}
                          {recipient.wantsExtraFood ? (
                            <span>May order extra food at event</span>
                          ) : null}
                          {recipient.mealNotes ? (
                            <span>Meal notes: {recipient.mealNotes}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {order?.deliverySelection || isPhysicalInvitationOrder ? (
                <div style={styles.section}>
                  <strong>Delivery / Pickup</strong>
                  {isPhysicalInvitationOrder ? (
                    <div style={styles.packageList}>
                      <Info
                        label="Courier"
                        value={
                          item.selectedCourier?.name ||
                          item.selectedCourierName ||
                          "Not selected"
                        }
                      />
                      {item.selectedCourier?.contactInfo ||
                      item.courierContactInfo ? (
                        <pre style={styles.pre}>
                          {JSON.stringify(
                            item.selectedCourier?.contactInfo ||
                              item.courierContactInfo,
                            null,
                            2
                          )}
                        </pre>
                      ) : null}
                      <Info
                        label="Shipping method"
                        value={item.shippingMethod || "Not selected"}
                      />
                      <Info
                        label="Tracking number"
                        value={item.trackingReference || "Not recorded"}
                      />
                      {hasPhysicalInvitationAddress ? (
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          Physical invitation address:{" "}
                          {formatAddress(physicalInvitationAddress)}
                        </div>
                      ) : (
                        <div style={styles.warningText}>
                          Mailing address is missing or incomplete.
                        </div>
                      )}
                      {item.metadata?.mailingAddressUpdateRequestedAt ? (
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          Address update requested:{" "}
                          {formatDate(
                            item.metadata.mailingAddressUpdateRequestedAt
                          )}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void requestMailingAddressUpdate(item)}
                        disabled={
                          !item.recipientEmail ||
                          Boolean(busyActions[`mailing-address:${item.id}`])
                        }
                        style={styles.secondaryButton}
                      >
                        {busyActions[`mailing-address:${item.id}`]
                          ? "Sending address request..."
                          : "Request mailing address update"}
                      </button>
                      {!item.recipientEmail ? (
                        <div style={styles.warningText}>
                          Recipient email is missing, so no update request can be
                          sent.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {order?.deliverySelection ? (
                    <pre style={styles.pre}>
                      {JSON.stringify(order.deliverySelection, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {Array.isArray(item.activities) && item.activities.length ? (
                <div style={styles.section}>
                  <strong>Fulfillment activity</strong>
                  <div style={styles.activityList}>
                    {item.activities.map((activity) => (
                      <div key={activity.id} style={styles.activityItem}>
                        <div style={styles.recipientHeader}>
                          <strong style={styles.breakText}>
                            {activity.stageLabel || activity.stageKey}
                          </strong>
                          <span style={styles.muted}>
                            {formatDate(activity.completedAt)}
                          </span>
                        </div>
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          {(activity.updateType || "manual").toUpperCase()}
                          {activity.source ? ` - ${activity.source}` : ""}
                          {activity.staffUserName
                            ? ` - ${activity.staffUserName}`
                            : ""}
                        </div>
                        {activity.notes ? (
                          <div style={{ ...styles.muted, ...styles.preLine }}>
                            {activity.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={styles.controls}>
                <label style={styles.label}>
                  Fulfillment status
                  <select
                    value={currentStatus}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          fulfillmentStatus: event.target.value,
                        },
                      }))
                    }
                    style={styles.selectWide}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Tracking / delivery reference
                  <input
                    value={
                      draft.trackingReference !== undefined
                        ? draft.trackingReference
                        : item.trackingReference || ""
                    }
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          trackingReference: event.target.value,
                        },
                      }))
                    }
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Fulfillment notes
                  <textarea
                    value={
                      draft.fulfillmentNotes !== undefined
                        ? draft.fulfillmentNotes
                        : cleanFulfillmentNotesForDisplay(item.fulfillmentNotes)
                    }
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          fulfillmentNotes: event.target.value,
                        },
                      }))
                    }
                    rows={3}
                    style={styles.textarea}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void updateItem(item)}
                  disabled={Boolean(updatingItemIds[item.id])}
                  style={{
                    ...styles.button,
                    ...(updatingItemIds[item.id] ? styles.loadingButton : {}),
                  }}
                >
                  {updatingItemIds[item.id]
                    ? "Updating fulfillment..."
                    : "Update fulfillment"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!items.length && !message ? (
        <div style={styles.empty}>No fulfillment order items found.</div>
      ) : null}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.minWidthZero}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.breakText}>{value || "Not set"}</strong>
    </div>
  );
}

const styles = {
  stack: {
    display: "grid",
    gap: "16px",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) repeat(2, minmax(150px, 190px))",
    gap: "10px",
  },
  toolbarNarrow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "10px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
  },
  select: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    background: "#fffdfa",
  },
  selectWide: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    background: "#fffdfa",
    width: "100%",
  },
  summary: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    padding: "12px",
  },
  message: {
    color: "#2f6f46",
    fontWeight: 800,
  },
  grid: {
    display: "grid",
    gap: "14px",
  },
  customerCard: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "0",
    display: "grid",
    gap: "0",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  customerHeader: {
    alignItems: "start",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "96px minmax(0, 1fr) auto",
    padding: "20px 36px 10px",
  },
  customerHeaderNarrow: {
    alignItems: "start",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "52px minmax(0, 1fr) auto",
    padding: "14px 14px 10px",
  },
  customerAvatar: {
    alignItems: "center",
    aspectRatio: "1",
    background: "#f5f2ee",
    border: "2px solid #241f1a",
    borderRadius: "50%",
    color: "#241f1a",
    display: "flex",
    fontSize: "28px",
    fontWeight: 900,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  customerAvatarImage: {
    height: "100%",
    objectFit: "cover",
    width: "100%",
  },
  customerNameRow: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  customerName: {
    fontSize: "clamp(30px, 5vw, 44px)",
    fontWeight: 400,
    letterSpacing: "0.18em",
    lineHeight: 1,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  customerNameNarrow: {
    fontSize: "clamp(23px, 8vw, 30px)",
    fontWeight: 500,
    letterSpacing: "0.08em",
    lineHeight: 1.05,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  customerSubline: {
    color: "rgba(32, 28, 29, 0.36)",
    fontSize: "18px",
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  followUpDot: {
    background: "#c9211b",
    borderRadius: "50%",
    boxShadow: "0 0 0 4px rgba(201, 33, 27, 0.14)",
    flex: "0 0 auto",
    height: "10px",
    width: "10px",
  },
  textLinkButton: {
    background: "transparent",
    border: 0,
    color: "#241f1a",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "4px",
    textDecoration: "underline",
  },
  notesRow: {
    alignItems: "center",
    background: "#fffdfa",
    border: 0,
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    color: "#241f1a",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    justifyContent: "space-between",
    padding: "14px 48px",
    textAlign: "left",
  },
  orderBlock: {
    background: "#e3faef",
    borderTop: "1px solid rgba(47, 122, 70, 0.16)",
    display: "grid",
    gap: "0",
    padding: "10px 48px 18px",
  },
  orderBlockNarrow: {
    background: "#e3faef",
    borderTop: "1px solid rgba(47, 122, 70, 0.16)",
    display: "grid",
    gap: "0",
    padding: "12px 18px 16px",
  },
  orderBlockHeader: {
    alignItems: "start",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "minmax(0, 1fr) auto",
  },
  orderBlockHeaderNarrow: {
    display: "grid",
    gap: "8px",
  },
  orderTitleStack: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  orderNumberLine: {
    display: "block",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  orderStatusBlock: {
    color: "rgba(32, 28, 29, 0.42)",
    display: "grid",
    fontSize: "18px",
    justifyItems: "end",
    lineHeight: 1.2,
    textAlign: "right",
    textTransform: "capitalize",
  },
  orderStatusBlockNarrow: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    justifyItems: "start",
    marginTop: "4px",
    paddingTop: "10px",
    textAlign: "left",
    width: "100%",
  },
  orderStatusButton: {
    background: "transparent",
    border: 0,
    cursor: "pointer",
    padding: 0,
  },
  statusChoiceGrid: {
    display: "grid",
    gap: "10px",
  },
  statusChoiceRow: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  },
  orderDateGrid: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: "8px",
    paddingTop: "8px",
  },
  orderDateGridNarrow: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginTop: "10px",
    paddingTop: "10px",
  },
  paymentSummaryButton: {
    alignItems: "end",
    background: "transparent",
    border: 0,
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    color: "#241f1a",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    justifyContent: "space-between",
    marginTop: "8px",
    padding: "8px 0",
    textAlign: "left",
  },
  paymentSummaryButtonNarrow: {
    alignItems: "start",
    background: "transparent",
    border: 0,
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    color: "#241f1a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: "12px",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginTop: "8px",
    padding: "10px 0",
    textAlign: "left",
  },
  paymentSummaryButtonActive: {
    alignItems: "end",
    background: "rgba(47, 122, 70, 0.12)",
    border: 0,
    borderTop: "1px solid rgba(47, 122, 70, 0.2)",
    borderRadius: "6px",
    color: "#241f1a",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    justifyContent: "space-between",
    marginTop: "8px",
    padding: "10px 12px",
    textAlign: "left",
  },
  paymentSummaryButtonActiveNarrow: {
    alignItems: "start",
    background: "rgba(47, 122, 70, 0.12)",
    border: 0,
    borderTop: "1px solid rgba(47, 122, 70, 0.2)",
    borderRadius: "6px",
    color: "#241f1a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: "12px",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginTop: "8px",
    padding: "10px 12px",
    textAlign: "left",
  },
  customerOwesComplete: {
    color: "rgba(32, 28, 29, 0.35)",
    display: "block",
    fontSize: "18px",
    marginTop: "8px",
  },
  customerOwesDue: {
    color: "#b3261e",
    display: "block",
    fontSize: "18px",
    fontWeight: 900,
    marginTop: "8px",
  },
  customerOwesSummaryNarrow: {
    display: "grid",
    gap: "4px",
  },
  totalSummary: {
    display: "grid",
    fontSize: "22px",
    justifyItems: "end",
    lineHeight: 1.25,
  },
  totalSummaryNarrow: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    fontSize: "22px",
    gap: "4px",
    justifyItems: "start",
    lineHeight: 1.25,
    paddingTop: "10px",
  },
  orderTabs: {
    alignItems: "center",
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
    justifyContent: "space-between",
    paddingTop: "12px",
  },
  orderTabsNarrow: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr)",
    paddingTop: "12px",
  },
  orderLinksNarrow: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "minmax(0, 1fr)",
    paddingTop: "14px",
  },
  orderTabButton: {
    background: "transparent",
    border: 0,
    color: "#241f1a",
    cursor: "pointer",
    font: "inherit",
    padding: "7px 8px",
    textAlign: "left",
  },
  orderTabButtonActive: {
    background: "rgba(47, 122, 70, 0.14)",
    border: "1px solid rgba(47, 122, 70, 0.22)",
    borderRadius: "6px",
    color: "#174d2b",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "7px 8px",
    textAlign: "left",
  },
  orderTabLink: {
    color: "#241f1a",
    font: "inherit",
    textDecoration: "none",
  },
  orderDeleteButton: {
    background: "transparent",
    border: 0,
    color: "#9f1f19",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: 0,
    textAlign: "left",
    textDecoration: "underline",
  },
  accordionPanel: {
    background: "rgba(255, 253, 250, 0.74)",
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "12px",
    padding: "14px 0",
  },
  closeAccordionButton: {
    background: "rgba(32, 28, 29, 0.06)",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "6px",
    color: "#241f1a",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    marginTop: "4px",
    padding: "11px 12px",
    width: "100%",
  },
  paymentAllocationList: {
    display: "grid",
    gap: "8px",
  },
  paymentAllocationRow: {
    alignItems: "center",
    borderBottom: "1px solid rgba(32, 28, 29, 0.08)",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "minmax(0, 1fr) minmax(120px, 180px)",
    paddingBottom: "8px",
  },
  amountInput: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    padding: "8px 10px",
    width: "100%",
  },
  paymentTotalsRow: {
    color: "rgba(32, 28, 29, 0.7)",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 18px",
    justifyContent: "space-between",
  },
  followUpPanel: {
    background: "rgba(36, 95, 153, 0.06)",
    border: "1px solid rgba(36, 95, 153, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "4px",
    padding: "10px",
  },
  card: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "6px",
    display: "grid",
    gap: "14px",
    padding: "16px",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
    minWidth: 0,
  },
  cardHeaderNarrow: {
    alignItems: "start",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr)",
    minWidth: 0,
  },
  badge: {
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
    padding: "5px 8px",
  },
  muted: {
    color: "rgba(32, 28, 29, 0.68)",
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    minWidth: 0,
  },
  detailGridNarrow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "10px",
    minWidth: 0,
  },
  minWidthZero: {
    minWidth: 0,
  },
  breakText: {
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  infoLabel: {
    color: "rgba(32, 28, 29, 0.62)",
    display: "block",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  section: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "4px",
    paddingTop: "12px",
    minWidth: 0,
  },
  recipientList: {
    display: "grid",
    gap: "8px",
  },
  recipientCard: {
    background: "#f8f4ee",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "6px",
    display: "grid",
    gap: "6px",
    padding: "10px",
    minWidth: 0,
  },
  recipientHeader: {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
    minWidth: 0,
  },
  recipientHeaderNarrow: {
    display: "grid",
    gap: "3px",
    minWidth: 0,
  },
  recipientMeta: {
    color: "rgba(32, 28, 29, 0.74)",
    display: "grid",
    gap: "2px",
    fontSize: "14px",
    lineHeight: 1.35,
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  notePanel: {
    background: "rgba(47, 122, 70, 0.06)",
    border: "1px solid rgba(47, 122, 70, 0.14)",
    borderRadius: "6px",
    color: "rgba(32, 28, 29, 0.82)",
    display: "grid",
    fontSize: "14px",
    gap: "4px",
    lineHeight: 1.4,
    marginTop: "8px",
    overflowWrap: "anywhere",
    padding: "9px 10px",
    wordBreak: "break-word",
  },
  packageList: {
    display: "grid",
    gap: "4px",
    marginTop: "8px",
    minWidth: 0,
  },
  orderItemList: {
    display: "grid",
    gap: "10px",
  },
  orderItemRow: {
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    minWidth: 0,
    padding: "10px",
  },
  orderItemMeta: {
    color: "rgba(32, 28, 29, 0.74)",
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "14px",
    gap: "8px 14px",
  },
  inlineDangerButton: {
    background: "transparent",
    border: 0,
    color: "#9f1f19",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: 0,
    textDecoration: "underline",
  },
  activityList: {
    display: "grid",
    gap: "8px",
    minWidth: 0,
  },
  activityItem: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "4px",
    minWidth: 0,
    paddingTop: "8px",
  },
  preLine: {
    whiteSpace: "pre-line",
  },
  pre: {
    background: "#f5f2ee",
    borderRadius: "6px",
    margin: 0,
    maxHeight: "160px",
    overflow: "auto",
    padding: "10px",
    whiteSpace: "pre-wrap",
  },
  controls: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  label: {
    display: "grid",
    gap: "5px",
    fontWeight: 800,
    minWidth: 0,
  },
  textarea: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#2f7a46",
    border: 0,
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "12px 14px",
  },
  loadingButton: {
    cursor: "wait",
    opacity: 0.68,
  },
  primarySmallButton: {
    background: "#2f7a46",
    border: 0,
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    marginTop: "10px",
    padding: "10px 12px",
  },
  paymentConfirmPanel: {
    display: "grid",
    gap: "10px",
    marginTop: "10px",
  },
  adHocItemPanel: {
    background: "rgba(47, 122, 70, 0.06)",
    border: "1px solid rgba(47, 122, 70, 0.18)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    marginTop: "12px",
    padding: "12px",
  },
  adHocItemGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  },
  pricePreview: {
    alignSelf: "end",
    color: "#245f38",
    fontWeight: 900,
    padding: "10px 0",
  },
  cashTenderPanel: {
    display: "grid",
    gap: "6px",
  },
  communicationGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginTop: "8px",
  },
  growGuidePanel: {
    background: "rgba(151, 38, 66, 0.06)",
    border: "1px solid rgba(151, 38, 66, 0.18)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    marginTop: "10px",
    padding: "12px",
  },
  generatedLinkBox: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "8px",
    padding: "10px",
  },
  inlineActionRow: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  },
  inlineEditRow: {
    alignItems: "center",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    marginTop: "8px",
  },
  inlineInput: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    minWidth: 0,
    padding: "9px 10px",
    width: "100%",
  },
  messageTemplateList: {
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "4px",
    padding: "8px",
  },
  messageTemplateOption: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 700,
  },
  secondaryButton: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 122, 70, 0.42)",
    borderRadius: "6px",
    color: "#245f38",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "10px 12px",
    width: "100%",
  },
  secondarySmallButton: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 122, 70, 0.42)",
    borderRadius: "6px",
    color: "#245f38",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "9px 10px",
    whiteSpace: "nowrap",
  },
  linkButton: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(47, 122, 70, 0.42)",
    borderRadius: "6px",
    color: "#245f38",
    display: "flex",
    font: "inherit",
    fontWeight: 800,
    justifyContent: "center",
    padding: "10px 12px",
    textAlign: "center",
    textDecoration: "none",
  },
  warningText: {
    color: "#b3261e",
    fontSize: "14px",
    fontWeight: 800,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  empty: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    padding: "18px",
  },
};
