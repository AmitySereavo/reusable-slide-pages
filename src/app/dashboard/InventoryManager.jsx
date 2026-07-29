"use client";

import { useEffect, useMemo, useState } from "react";

const shopOptions = [
  { id: "little-orchard-shop", label: "Little Orchard Shop" },
  { id: "music-merch-shop", label: "Music + Merch Store" },
  { id: "ticket-add-ons", label: "Ticket Add-ons" },
  { id: "invitation-tickets", label: "Invitation Tickets" },
  { id: "combined-order", label: "Combined Order" },
];

const flowSteps = [
  { id: "identity", title: "Inventory Identity" },
  { id: "shops", title: "Shops and Categories" },
  { id: "quantity", title: "Quantity" },
  { id: "options", title: "Purchase Options" },
  { id: "review", title: "Review" },
];

const commonVariationTitles = [
  "Default",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
  "Extra Extra Large",
  "Black",
  "White",
  "Blue",
  "Red",
  "Yellow",
  "Seedling",
  "Four-inch pot",
  "Six-inch pot",
  "Package",
  "Bundle",
];

const emptyForm = {
  id: "",
  sku: "",
  slug: "",
  title: "",
  description: "",
  detailsDescription: "",
  imageUrl: "",
  previewImageUrl: "",
  fulfillmentType: "physical",
  active: true,
  quantityOnHand: 0,
  quantityReserved: 0,
  quantityAvailable: 0,
  shopTags: ["little-orchard-shop"],
  categoryTags: ["Uncategorized"],
  optionId: "default",
  optionSku: "",
  optionLabel: "Default option",
  optionPrice: 0,
};

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [bookmarkedStepIndex, setBookmarkedStepIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filterShop, setFilterShop] = useState("all");
  const [editingItemId, setEditingItemId] = useState("");
  const [editingSection, setEditingSection] = useState("");
  const [editDrafts, setEditDrafts] = useState({});
  const [draggingItemId, setDraggingItemId] = useState("");
  const [dragOverItemId, setDragOverItemId] = useState("");
  const [isCompactView, setIsCompactView] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState({});
  const [showInventoryImages, setShowInventoryImages] = useState(true);
  const [visibilityView, setVisibilityView] = useState("all");
  const [listArrangementDrafts, setListArrangementDrafts] = useState({});

  const activeStep = flowSteps[stepIndex] || flowSteps[0];

  const filteredItems = useMemo(() => {
    const shopFilteredItems =
      filterShop === "all"
        ? items
        : items.filter((item) =>
            normalizeArray(item.shopTags).includes(filterShop)
          );
    const visibleItems =
      filterShop === "all" || visibilityView === "all"
        ? shopFilteredItems
        : shopFilteredItems.filter((item) => {
            const listing = getShopListing(item, filterShop);
            const isHidden = listing?.active === false;

            return visibilityView === "hidden" ? isHidden : !isHidden;
          });

    const draftIds =
      filterShop === "all" ? [] : normalizeArray(listArrangementDrafts[filterShop]);
    const draftIndex = new Map(
      draftIds.map((itemId, index) => [String(itemId), index])
    );

    return [...visibleItems].sort((first, second) => {
      const firstDraftIndex = draftIndex.get(String(first.id));
      const secondDraftIndex = draftIndex.get(String(second.id));
      const firstSort =
        typeof firstDraftIndex === "number"
          ? firstDraftIndex
          : 100000 + getInventorySortValue(first, filterShop);
      const secondSort =
        typeof secondDraftIndex === "number"
          ? secondDraftIndex
          : 100000 + getInventorySortValue(second, filterShop);

      return (
        firstSort - secondSort ||
        String(first.title || "").localeCompare(String(second.title || ""))
      );
    });
  }, [filterShop, items, listArrangementDrafts, visibilityView]);
  const canArrangeShopList = filterShop !== "all" && filteredItems.length > 1;
  const hasListArrangementDraft =
    filterShop !== "all" && Array.isArray(listArrangementDrafts[filterShop]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    function updateCompactView() {
      setIsCompactView(window.innerWidth < 760);
    }

    updateCompactView();
    window.addEventListener("resize", updateCompactView);

    return () => window.removeEventListener("resize", updateCompactView);
  }, []);

  async function loadItems() {
    setStatus("Loading unified inventory...");
    const response = await fetch("/api/dashboard/inventory/unified");
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.error || "Inventory could not be loaded.");
      return;
    }

    setItems(payload.items || []);
    setStatus("");
  }

  async function syncLittleOrchardConfig() {
    setIsSaving(true);
    setStatus("Syncing Little Orchard catalog into unified inventory...");
    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-little-orchard-config" }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Little Orchard catalog could not be synced.");
      return;
    }

    setItems(payload.items || []);
    setStatus("Little Orchard catalog synced into unified inventory.");
  }

  async function syncNurseryPriceList() {
    setIsSaving(true);
    setStatus("Adding nursery price list items to unified inventory...");
    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-nursery-price-list" }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Nursery price list could not be added.");
      return;
    }

    setItems(payload.items || []);
    setStatus("Nursery price list added to unified inventory.");
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleShop(shopId, checked) {
    setForm((current) => {
      const nextShopTags = checked
        ? Array.from(new Set([...current.shopTags, shopId]))
        : current.shopTags.filter((tag) => tag !== shopId);

      return {
        ...current,
        shopTags: nextShopTags.length ? nextShopTags : current.shopTags,
      };
    });
  }

  function editItem(item) {
    const options = normalizeArray(item.options);
    const firstOption = options[0] || {};

    setForm({
      ...emptyForm,
      id: item.id || "",
      sku: item.sku || "",
      slug: item.slug || "",
      title: item.title || "",
      description: item.description || "",
      detailsDescription: item.detailsDescription || "",
      imageUrl: item.imageUrl || "",
      previewImageUrl: item.previewImageUrl || "",
      fulfillmentType: item.fulfillmentType || "physical",
      active: item.active !== false,
      quantityOnHand: item.quantityOnHand ?? 0,
      quantityReserved: item.quantityReserved ?? 0,
      quantityAvailable: item.quantityAvailable ?? 0,
      shopTags: normalizeArray(item.shopTags).length
        ? normalizeArray(item.shopTags)
        : ["little-orchard-shop"],
      categoryTags: normalizeArray(item.categoryTags).length
        ? normalizeArray(item.categoryTags)
        : ["Uncategorized"],
      optionId: firstOption.id || "default",
      optionSku: firstOption.sku || "",
      optionLabel: firstOption.label || "Default option",
      optionPrice: firstOption.price ?? 0,
    });
    setStepIndex(0);
    document.getElementById("dashboard-inventory-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function beginInlineEdit(item, section = "identity") {
    setEditingItemId(item.id);
    setEditingSection(section);
    setEditDrafts((current) => ({
      ...current,
      [item.id]: makeItemDraft(item),
    }));
  }

  function updateInlineDraft(itemId, key, value) {
    setEditDrafts((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        [key]: value,
      },
    }));
  }

  function toggleInlineShop(itemId, shopId, checked) {
    setEditDrafts((current) => {
      const draft = current[itemId] || {};
      const currentShopTags = normalizeArray(draft.shopTags);
      const nextShopTags = checked
        ? Array.from(new Set([...currentShopTags, shopId]))
        : currentShopTags.filter((tag) => tag !== shopId);

      return {
        ...current,
        [itemId]: {
          ...draft,
          shopTags: nextShopTags.length ? nextShopTags : currentShopTags,
        },
      };
    });
  }

  async function saveInlineDraft(item) {
    const draft = editDrafts[item.id] || makeItemDraft(item);
    const categoryTags = normalizeCategoryTags(draft.categoryTagsText);
    const shopTags = normalizeArray(draft.shopTags);
    const quantityOnHand = Number(draft.quantityOnHand || 0);
    const quantityReserved = Number(draft.quantityReserved || 0);
    const quantityAvailable = Number(draft.quantityAvailable || 0);
    const originalPrice = toPositiveNumber(draft.originalPrice);
    const discountedPrice = toOptionalPositiveNumber(draft.discountedPrice);
    const optionLabel = draft.useCustomVariationTitle
      ? draft.customVariationTitle || draft.variationTitle || "Default"
      : draft.variationTitle || "Default";
    const baseMetadata =
      item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    const nextMetadata = {
      ...baseMetadata,
      category: categoryTags[0] || "Uncategorized",
      variationTitle: draft.variationTitle || "Default",
      useCustomVariationTitle: Boolean(draft.useCustomVariationTitle),
      customVariationTitle: draft.useCustomVariationTitle
        ? draft.customVariationTitle || ""
        : "",
      originalPrice,
      discountedPrice,
      weight: draft.weight || "",
      dimensions: draft.dimensions || "",
      productionDate: draft.productionDate || "",
      availabilityDate: draft.availabilityDate || "",
      priceIncreaseDate: draft.priceIncreaseDate || "",
      expiryDate: draft.expiryDate || "",
    };
    const shopListings = shopTags.map((shopId) => {
      const existingListing = getShopListing(item, shopId);
      const primaryCategory = categoryTags[0] || "Uncategorized";

      return {
        ...existingListing,
        shopKey: shopId,
        shopLabel: getShopLabel(shopId),
        categoryKey: slugify(primaryCategory),
        categoryLabel: primaryCategory,
        active: existingListing?.active !== false,
        sortOrder:
          typeof existingListing?.sortOrder === "number"
            ? existingListing.sortOrder
            : getInventorySortValue(item, shopId),
      };
    });

    setIsSaving(true);
    setStatus(`Saving ${draft.title || item.title}...`);

    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-item",
        id: item.id,
        sku: draft.sku,
        slug: item.slug || draft.title,
        title: draft.title,
        description: draft.description,
        detailsDescription: item.detailsDescription,
        imageUrl: draft.imageUrl,
        previewImageUrl: item.previewImageUrl,
        fulfillmentType: item.fulfillmentType,
        active: item.active,
        quantityOnHand,
        quantityReserved,
        quantityAvailable,
        shopTags,
        categoryTags,
        shopListings,
        options: updatePrimaryOption(
          normalizeArray(item.options),
          quantityOnHand,
          quantityReserved,
          quantityAvailable,
          optionLabel,
          discountedPrice || originalPrice,
          draft.weight
        ),
        metadata: nextMetadata,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Inventory item could not be saved.");
      return;
    }

    setItems(payload.items || []);
    setEditingItemId("");
    setStatus("Inventory item updated.");
  }

  function stageListArrangement(nextItems, arrangedItemName = "Item") {
    if (filterShop === "all") {
      setStatus("Select a shop before arranging its storefront list.");
      return;
    }

    setListArrangementDrafts((current) => ({
      ...current,
      [filterShop]: nextItems.map((item) => item.id),
    }));
    setStatus(
      `Draft only: ${arrangedItemName} moved. Publish the list arrangement when ready.`
    );
  }

  async function publishListArrangement() {
    if (filterShop === "all") {
      setStatus("Select a shop before publishing a list arrangement.");
      return;
    }

    const draftIds = normalizeArray(listArrangementDrafts[filterShop]);

    if (!draftIds.length) {
      setStatus("Arrange the list before publishing it.");
      return;
    }

    const scrollTop = window.scrollY;
    setIsSaving(true);
    setStatus(`Publishing list arrangement for ${getShopLabel(filterShop)}...`);
    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder-shop-items",
        shopKey: filterShop,
        orderedIds: draftIds,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "List arrangement could not be published.");
      return;
    }

    setItems(payload.items || []);
    setListArrangementDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[filterShop];
      return nextDrafts;
    });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollTop });
    });
    setStatus(
      `Published: list arrangement is now live in ${getShopLabel(filterShop)}.`
    );
  }

  async function toggleShopVisibility(item) {
    if (filterShop === "all") {
      setStatus("Select a shop before changing storefront visibility.");
      return;
    }

    const currentListing = getShopListing(item, filterShop);
    const nextActive = currentListing?.active === false;
    const categoryTags = normalizeArray(item.categoryTags);
    const primaryCategory = categoryTags[0] || "Uncategorized";
    const shopListings = normalizeArray(item.shopListings);
    const hasCurrentListing = Boolean(currentListing);
    const nextShopListings = hasCurrentListing
      ? shopListings.map((listing) =>
          listing &&
          typeof listing === "object" &&
          listing.shopKey === filterShop
            ? { ...listing, active: nextActive }
            : listing
        )
      : [
          ...shopListings,
          {
            shopKey: filterShop,
            shopLabel: getShopLabel(filterShop),
            categoryKey: slugify(primaryCategory),
            categoryLabel: primaryCategory,
            active: nextActive,
            sortOrder: getInventorySortValue(item, filterShop),
          },
        ];

    setIsSaving(true);
    setStatus(
      `${nextActive ? "Showing" : "Hiding"} ${item.title} in ${getShopLabel(
        filterShop
      )}...`
    );

    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-item",
        id: item.id,
        sku: item.sku,
        slug: item.slug || item.title,
        title: item.title,
        description: item.description,
        detailsDescription: item.detailsDescription,
        imageUrl: item.imageUrl,
        previewImageUrl: item.previewImageUrl,
        fulfillmentType: item.fulfillmentType,
        active: item.active,
        quantityOnHand: item.quantityOnHand,
        quantityReserved: item.quantityReserved,
        quantityAvailable: item.quantityAvailable,
        shopTags: normalizeArray(item.shopTags),
        categoryTags,
        shopListings: nextShopListings,
        options: normalizeArray(item.options),
        metadata: getItemMetadata(item),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Shop visibility could not be updated.");
      return;
    }

    setItems(payload.items || []);
    setStatus(
      `${item.title} is now ${
        nextActive ? "visible" : "hidden"
      } in ${getShopLabel(filterShop)}.`
    );
  }

  function moveShopItem(itemId, direction) {
    if (!canArrangeShopList) {
      setStatus("Select one shop before arranging inventory.");
      return;
    }

    const currentIndex = filteredItems.findIndex((item) => item.id === itemId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= filteredItems.length) {
      return;
    }

    const nextItems = [...filteredItems];
    const [movedItem] = nextItems.splice(currentIndex, 1);
    nextItems.splice(nextIndex, 0, movedItem);
    stageListArrangement(nextItems, movedItem.title || "Item");
  }

  function moveShopItemToPosition(itemId, rawPosition) {
    if (!canArrangeShopList) {
      setStatus("Select one shop before arranging inventory.");
      return;
    }

    const requestedPosition = Number(rawPosition);

    if (!Number.isFinite(requestedPosition)) {
      return;
    }

    const currentIndex = filteredItems.findIndex((item) => item.id === itemId);
    const nextIndex = Math.min(
      filteredItems.length - 1,
      Math.max(0, Math.floor(requestedPosition) - 1)
    );

    if (currentIndex < 0 || currentIndex === nextIndex) {
      return;
    }

    const nextItems = [...filteredItems];
    const [movedItem] = nextItems.splice(currentIndex, 1);
    nextItems.splice(nextIndex, 0, movedItem);
    stageListArrangement(nextItems, movedItem.title || "Item");
  }

  function handleDrop(targetItemId, event) {
    const sourceItemId =
      event?.dataTransfer?.getData("text/plain") || draggingItemId;

    if (!sourceItemId || sourceItemId === targetItemId) {
      setDraggingItemId("");
      setDragOverItemId("");
      return;
    }

    const fromIndex = filteredItems.findIndex(
      (item) => item.id === sourceItemId
    );
    const toIndex = filteredItems.findIndex((item) => item.id === targetItemId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingItemId("");
      setDragOverItemId("");
      return;
    }

    const nextItems = [...filteredItems];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    setDraggingItemId("");
    setDragOverItemId("");
    stageListArrangement(nextItems, movedItem.title || "Item");
  }

  async function saveItem(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving unified inventory item...");

    const primaryCategory = form.categoryTags[0] || "Uncategorized";
    const shopListings = form.shopTags.map((shopId) => ({
      shopKey: shopId,
      shopLabel: getShopLabel(shopId),
      categoryKey: slugify(primaryCategory),
      categoryLabel: primaryCategory,
      active: true,
      sortOrder: 0,
    }));

    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-item",
        ...form,
        quantityOnHand: Number(form.quantityOnHand),
        quantityReserved: Number(form.quantityReserved),
        quantityAvailable: Number(form.quantityAvailable),
        shopListings,
        options: [
          {
            id: form.optionId,
            sku: form.optionSku,
            label: form.optionLabel,
            price: Number(form.optionPrice),
            quantityOnHand: Number(form.quantityOnHand),
            quantityReserved: Number(form.quantityReserved),
            quantityAvailable: Number(form.quantityAvailable),
          },
        ],
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Inventory item could not be saved.");
      return;
    }

    setItems(payload.items || []);
    setStatus("Inventory item saved.");
  }

  function resetForm() {
    setForm(emptyForm);
    setStepIndex(0);
  }

  function toggleItemExpanded(itemId) {
    setExpandedItemIds((current) => {
      const nextExpanded = current[itemId] !== true;

      if (!nextExpanded && editingItemId === itemId) {
        setEditingItemId("");
        setEditingSection("");
      }

      return {
        ...current,
        [itemId]: nextExpanded,
      };
    });
  }

  return (
    <section id="dashboard-inventory" style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.h2}>Inventory</h2>
          <p style={styles.copy}>
            One inventory table for all shops. Items appear in shops through
            shop tags and category tags, while quantity stays shared.
          </p>
        </div>
        <div style={styles.actions}>
          <select
            value={filterShop}
            onChange={(event) => setFilterShop(event.target.value)}
            style={styles.input}
          >
            <option value="all">All shops</option>
            {shopOptions.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setShowInventoryImages((current) => !current)}
          >
            {showInventoryImages ? "Hide Images" : "Show Images"}
          </button>
          {filterShop !== "all" ? (
            <button
              type="button"
              style={{
                ...styles.primaryCompactButton,
                ...(!hasListArrangementDraft
                  ? styles.primaryCompactButtonDisabled
                  : null),
              }}
              disabled={isSaving || !hasListArrangementDraft}
              onClick={publishListArrangement}
            >
              Publish List Arrangement
            </button>
          ) : null}
          {filterShop !== "all" ? (
            <div style={styles.visibilityFilters} aria-label="Inventory view">
              <label style={styles.visibilityFilterOption}>
                <input
                  type="checkbox"
                  checked={visibilityView === "visible"}
                  onChange={() => setVisibilityView("visible")}
                />
                Showing in shop
              </label>
              <label style={styles.visibilityFilterOption}>
                <input
                  type="checkbox"
                  checked={visibilityView === "hidden"}
                  onChange={() => setVisibilityView("hidden")}
                />
                Hidden
              </label>
              <label style={styles.visibilityFilterOption}>
                <input
                  type="checkbox"
                  checked={visibilityView === "all"}
                  onChange={() => setVisibilityView("all")}
                />
                Show all
              </label>
            </div>
          ) : null}
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={isSaving}
            onClick={syncLittleOrchardConfig}
          >
            Sync Little Orchard Catalog
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={isSaving}
            onClick={syncNurseryPriceList}
          >
            Add Nursery Price List
          </button>
        </div>
      </div>

      {status ? (
        <p
          role="status"
          style={{
            ...styles.statusNotice,
            ...(status.startsWith("Published:")
              ? styles.statusNoticeSuccess
              : null),
          }}
        >
          {status}
        </p>
      ) : null}

      <div style={styles.panel}>
        <h3 style={styles.h3}>All Inventory</h3>
        <p style={styles.copy}>
          {filterShop === "all"
            ? "Select a shop to arrange its storefront list."
            : "Use the visibility view to focus the list. Arrange with drag, U/D, or the position number. Publish when ready."}
        </p>
        {filteredItems.length ? (
          <div style={styles.inventoryList}>
            {filteredItems.map((item, index) => {
              const categories = normalizeArray(item.categoryTags);
              const options = normalizeArray(item.options);
              const priceInfo = getInventoryPriceInfo(item, options);
              const soldQuantity = getSoldQuantity(item);
              const damagedQuantity = getDamagedQuantity(item);
              const variationInfo = getVariationInfo(item, options);
              const isItemExpanded = expandedItemIds[item.id] === true;
              const selectedShopListing =
                filterShop === "all" ? null : getShopListing(item, filterShop);
              const isHiddenInSelectedShop =
                filterShop !== "all" && selectedShopListing?.active === false;

              return (
                <article
                  key={item.id}
                  draggable={canArrangeShopList}
                  style={{
                    ...styles.inventoryRow,
                    ...(isCompactView ? styles.inventoryRowCompact : null),
                    ...(draggingItemId === item.id
                      ? styles.inventoryRowDragging
                      : null),
                    ...(dragOverItemId === item.id
                      ? styles.inventoryRowDropTarget
                      : null),
                  }}
                  onDragStart={(event) => {
                    if (!canArrangeShopList) {
                      event.preventDefault();
                      return;
                    }

                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", item.id);
                    setDraggingItemId(item.id);
                  }}
                  onDragEnter={() => {
                    if (canArrangeShopList && draggingItemId !== item.id) {
                      setDragOverItemId(item.id);
                    }
                  }}
                  onDragOver={(event) => {
                    if (canArrangeShopList) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDragEnd={() => {
                    setDraggingItemId("");
                    setDragOverItemId("");
                  }}
                  onDrop={(event) => handleDrop(item.id, event)}
                >
                  <div
                    style={{
                      ...styles.inventoryRecordTop,
                      ...(isCompactView ? styles.inventoryRecordTopCompact : null),
                      ...(!showInventoryImages
                        ? styles.inventoryRecordTopNoImage
                        : null),
                    }}
                  >
                    {showInventoryImages && item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        style={{
                          ...styles.recordImage,
                          ...(isCompactView ? styles.recordImageCompact : null),
                        }}
                      />
                    ) : showInventoryImages ? (
                      <span
                        style={{
                          ...styles.recordImagePlaceholder,
                          ...(isCompactView
                            ? styles.recordImagePlaceholderCompact
                            : null),
                        }}
                      >
                        {getInitials(item.title)}
                      </span>
                    ) : null}
                    <div
                      style={{
                        ...styles.recordTitleBlock,
                        ...(isCompactView ? styles.recordTitleBlockCompact : null),
                      }}
                    >
                      <strong
                        style={{
                          ...styles.recordTitle,
                          ...(isCompactView ? styles.recordTitleCompact : null),
                        }}
                      >
                        {item.title}
                      </strong>
                      <span
                        style={{
                          ...styles.recordMeta,
                          ...(isCompactView ? styles.recordMetaCompact : null),
                        }}
                      >
                        {[item.fulfillmentType, ...categories]
                          .filter(Boolean)
                          .join(", ") || "Inventory item"}
                      </span>
                      <span
                        style={{
                          ...styles.recordSku,
                          ...(isCompactView ? styles.recordSkuCompact : null),
                        }}
                      >
                        {item.sku || item.slug}
                      </span>
                      {isHiddenInSelectedShop ? (
                        <span style={styles.hiddenBadge}>
                          Hidden in {getShopLabel(filterShop)}
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        ...styles.recordHeaderActions,
                        ...(isCompactView
                          ? styles.recordHeaderActionsCompact
                          : null),
                      }}
                    >
                      {canArrangeShopList && !isCompactView ? (
                        <span style={styles.topOrderControls}>
                          <button
                            type="button"
                            style={{
                              ...styles.visibilityButton,
                              ...(isHiddenInSelectedShop
                                ? styles.visibilityButtonHidden
                                : null),
                            }}
                            disabled={isSaving}
                            onClick={() => toggleShopVisibility(item)}
                          >
                            {isHiddenInSelectedShop ? "Show" : "Hide"}
                          </button>
                          <button
                            type="button"
                            style={styles.iconMoveButton}
                            disabled={isSaving || index === 0}
                            onClick={() => moveShopItem(item.id, -1)}
                            title="Move up"
                          >
                            U
                          </button>
                          <input
                            key={`${filterShop}-${item.id}-${index}-desktop-position`}
                            type="number"
                            min="1"
                            max={filteredItems.length}
                            defaultValue={index + 1}
                            disabled={isSaving}
                            style={styles.positionInput}
                            title="List position"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                moveShopItemToPosition(
                                  item.id,
                                  event.currentTarget.value
                                );
                              }
                            }}
                            onBlur={(event) =>
                              moveShopItemToPosition(
                                item.id,
                                event.currentTarget.value
                              )
                            }
                          />
                          <button
                            type="button"
                            style={styles.iconMoveButton}
                            disabled={isSaving || index === filteredItems.length - 1}
                            onClick={() => moveShopItem(item.id, 1)}
                            title="Move down"
                          >
                            D
                          </button>
                          <span
                            style={styles.dragHandle}
                            title="Click and hold the card, then drag to arrange"
                          >
                            Drag
                          </span>
                        </span>
                      ) : !isCompactView ? (
                        <span style={styles.reorderHint}>Select shop to arrange</span>
                      ) : null}
                      <button
                        type="button"
                        style={styles.editLinkButton}
                        onClick={() =>
                          editingItemId === item.id && editingSection === "identity"
                            ? setEditingItemId("")
                            : beginInlineEdit(item, "identity")
                        }
                      >
                        {editingItemId === item.id && editingSection === "identity"
                          ? "Close"
                          : "Edit"}
                      </button>
                    </div>
                  </div>

                  {isCompactView ? (
                    <div style={styles.mobileOrderRow}>
                      {canArrangeShopList ? (
                        <span style={styles.topOrderControlsCompact}>
                          <button
                            type="button"
                            style={{
                              ...styles.visibilityButton,
                              ...(isHiddenInSelectedShop
                                ? styles.visibilityButtonHidden
                                : null),
                            }}
                            disabled={isSaving}
                            onClick={() => toggleShopVisibility(item)}
                          >
                            {isHiddenInSelectedShop ? "Show" : "Hide"}
                          </button>
                          <button
                            type="button"
                            style={styles.iconMoveButton}
                            disabled={isSaving || index === 0}
                            onClick={() => moveShopItem(item.id, -1)}
                            title="Move up"
                          >
                            U
                          </button>
                          <input
                            key={`${filterShop}-${item.id}-${index}-mobile-position`}
                            type="number"
                            min="1"
                            max={filteredItems.length}
                            defaultValue={index + 1}
                            disabled={isSaving}
                            style={styles.positionInput}
                            title="List position"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                moveShopItemToPosition(
                                  item.id,
                                  event.currentTarget.value
                                );
                              }
                            }}
                            onBlur={(event) =>
                              moveShopItemToPosition(
                                item.id,
                                event.currentTarget.value
                              )
                            }
                          />
                          <button
                            type="button"
                            style={styles.iconMoveButton}
                            disabled={isSaving || index === filteredItems.length - 1}
                            onClick={() => moveShopItem(item.id, 1)}
                            title="Move down"
                          >
                            D
                          </button>
                          <span
                            style={styles.dragHandle}
                            title="Click and hold the card, then drag to arrange"
                          >
                            Drag
                          </span>
                        </span>
                      ) : (
                        <span style={styles.reorderHint}>Select shop to arrange</span>
                      )}
                    </div>
                  ) : null}

                    <button
                      type="button"
                      style={styles.expandDetailsButton}
                      onClick={() => toggleItemExpanded(item.id)}
                    >
                      {isItemExpanded ? "Hide Details" : "Show Details"}
                    </button>

                  {isItemExpanded ? (
                    <>
                      <div
                        style={{
                          ...styles.recordSection,
                          ...(isCompactView ? styles.recordSectionCompact : null),
                        }}
                      >
                        <span
                          style={{
                            ...styles.recordSectionLabel,
                            ...(isCompactView
                              ? styles.recordSectionLabelCompact
                              : null),
                          }}
                        >
                          Shops:
                        </span>
                        <span
                          style={{
                            ...styles.recordSectionText,
                            ...(isCompactView
                              ? styles.recordSectionTextCompact
                              : null),
                          }}
                        >
                          {getShopSummary(item) || "No shop tags"}
                        </span>
                        <button
                          type="button"
                          style={styles.editLinkButton}
                          onClick={() => beginInlineEdit(item, "shops")}
                        >
                          Edit
                        </button>
                      </div>

                      <div
                        style={{
                          ...styles.recordSection,
                          ...(isCompactView ? styles.recordSectionCompact : null),
                        }}
                      >
                        <span
                          style={{
                            ...styles.recordSectionLabel,
                            ...(isCompactView
                              ? styles.recordSectionLabelCompact
                              : null),
                          }}
                        >
                          Quantity:
                        </span>
                        <span
                          style={{
                            ...styles.recordStats,
                            ...(isCompactView ? styles.recordStatsCompact : null),
                          }}
                        >
                          <span>Available: {item.quantityAvailable ?? 0}</span>
                          <span>Sold: {soldQuantity}</span>
                          <span>Damaged/Missing: {damagedQuantity}</span>
                        </span>
                        <button
                          type="button"
                          style={styles.editLinkButton}
                          onClick={() => beginInlineEdit(item, "quantity")}
                        >
                          Edit
                        </button>
                      </div>

                      <div
                        style={{
                          ...styles.recordSection,
                          ...(isCompactView ? styles.recordSectionCompact : null),
                        }}
                      >
                        <span
                          style={{
                            ...styles.recordSectionLabel,
                            ...(isCompactView
                              ? styles.recordSectionLabelCompact
                              : null),
                          }}
                        >
                          Price:
                        </span>
                        <span
                          style={{
                            ...styles.recordStats,
                            ...(isCompactView ? styles.recordStatsCompact : null),
                          }}
                        >
                          <span>Original: {formatJmd(priceInfo.originalPrice)}</span>
                          <span>
                            Discounted:{" "}
                            {priceInfo.discountedPrice
                              ? formatJmd(priceInfo.discountedPrice)
                              : "Not set"}
                          </span>
                        </span>
                        <button
                          type="button"
                          style={styles.editLinkButton}
                          onClick={() => beginInlineEdit(item, "pricing")}
                        >
                          Edit
                        </button>
                      </div>

                      <div
                        style={{
                          ...styles.recordVariationGrid,
                          ...(isCompactView
                            ? styles.recordVariationGridCompact
                            : null),
                        }}
                      >
                        <span>
                          <span
                            style={{
                              ...styles.recordSectionLabel,
                              ...(isCompactView
                                ? styles.recordSectionLabelCompact
                                : null),
                            }}
                          >
                            Variation title:
                          </span>
                          <strong>{variationInfo.variationTitle}</strong>
                        </span>
                        <span>
                          <span
                            style={{
                              ...styles.recordSectionLabel,
                              ...(isCompactView
                                ? styles.recordSectionLabelCompact
                                : null),
                            }}
                          >
                            Custom variation title:
                          </span>
                          <strong>
                            {variationInfo.useCustomVariationTitle
                              ? variationInfo.customVariationTitle
                              : "Not used"}
                          </strong>
                        </span>
                        <button
                          type="button"
                          style={styles.editLinkButton}
                          onClick={() => beginInlineEdit(item, "variation")}
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  ) : null}

                  {isItemExpanded && editingItemId === item.id ? (
                    <InlineInventoryEditor
                      draft={editDrafts[item.id] || makeItemDraft(item)}
                      itemId={item.id}
                      section={editingSection}
                      isSaving={isSaving}
                      onUpdate={updateInlineDraft}
                      onToggleShop={toggleInlineShop}
                      onSave={() => saveInlineDraft(item)}
                    />
                  ) : null}

                  {isItemExpanded ? (
                  <div
                    style={{
                      ...styles.recordFooter,
                      ...(isCompactView ? styles.recordFooterCompact : null),
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        ...styles.footerTextButton,
                        ...(isCompactView ? styles.footerTextButtonCompact : null),
                      }}
                      onClick={() => beginInlineEdit(item, "adCopy")}
                    >
                      Ad Copy
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.footerTextButton,
                        ...(isCompactView ? styles.footerTextButtonCompact : null),
                      }}
                      onClick={() => beginInlineEdit(item, "delivery")}
                    >
                      Delivery Info
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.footerTextButton,
                        ...(isCompactView ? styles.footerTextButtonCompact : null),
                      }}
                      onClick={() => beginInlineEdit(item, "dates")}
                    >
                      Dates
                    </button>
                  </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p style={styles.empty}>
            No unified inventory records yet. Sync Little Orchard plants or add a
            new item below.
          </p>
        )}
      </div>

      <form
        id="dashboard-inventory-form"
        style={styles.panel}
        onSubmit={saveItem}
      >
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.h3}>Add Inventory DSL Flow</h3>
            <p style={styles.copy}>
              Step {stepIndex + 1} of {flowSteps.length}: {activeStep.title}
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setBookmarkedStepIndex(stepIndex);
              setStatus(`Bookmarked: ${activeStep.title}`);
            }}
          >
            Bookmark Step
          </button>
        </div>

        <div style={styles.stepTabs}>
          {flowSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              style={{
                ...styles.stepTab,
                ...(index === stepIndex ? styles.stepTabActive : null),
              }}
              onClick={() => setStepIndex(index)}
            >
              {step.title}
              {index === bookmarkedStepIndex ? " *" : ""}
            </button>
          ))}
        </div>

        <div style={styles.flowPanel}>
          {activeStep.id === "identity" ? (
            <>
              <div style={styles.twoColumns}>
                <Field label="Title" value={form.title} onChange={(value) => updateForm("title", value)} />
                <Field label="SKU" value={form.sku} onChange={(value) => updateForm("sku", value)} />
              </div>
              <Field label="Slug" value={form.slug} onChange={(value) => updateForm("slug", value)} />
              <Field label="Image URL" value={form.imageUrl} onChange={(value) => updateForm("imageUrl", value)} />
              <label style={styles.label}>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={4}
                  style={{ ...styles.input, resize: "vertical" }}
                />
              </label>
            </>
          ) : null}

          {activeStep.id === "shops" ? (
            <>
              <div style={styles.shopGrid}>
                {shopOptions.map((shop) => (
                  <label key={shop.id} style={styles.shopToggle}>
                    <input
                      type="checkbox"
                      checked={form.shopTags.includes(shop.id)}
                      onChange={(event) => toggleShop(shop.id, event.target.checked)}
                    />
                    {shop.label}
                  </label>
                ))}
              </div>
              <Field
                label="Category tags, comma separated"
                value={form.categoryTags.join(", ")}
                onChange={(value) =>
                  updateForm(
                    "categoryTags",
                    value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                  )
                }
              />
            </>
          ) : null}

          {activeStep.id === "quantity" ? (
            <div style={styles.twoColumns}>
              <Field label="Quantity on hand" type="number" value={form.quantityOnHand} onChange={(value) => updateForm("quantityOnHand", value)} />
              <Field label="Quantity reserved" type="number" value={form.quantityReserved} onChange={(value) => updateForm("quantityReserved", value)} />
              <Field label="Quantity available" type="number" value={form.quantityAvailable} onChange={(value) => updateForm("quantityAvailable", value)} />
              <label style={styles.label}>
                Fulfillment type
                <select
                  value={form.fulfillmentType}
                  onChange={(event) => updateForm("fulfillmentType", event.target.value)}
                  style={styles.input}
                >
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                  <option value="ticket">Ticket</option>
                </select>
              </label>
            </div>
          ) : null}

          {activeStep.id === "options" ? (
            <div style={styles.twoColumns}>
              <Field label="Option ID" value={form.optionId} onChange={(value) => updateForm("optionId", value)} />
              <Field label="Option SKU" value={form.optionSku} onChange={(value) => updateForm("optionSku", value)} />
              <Field label="Option label" value={form.optionLabel} onChange={(value) => updateForm("optionLabel", value)} />
              <Field label="Price" type="number" value={form.optionPrice} onChange={(value) => updateForm("optionPrice", value)} />
            </div>
          ) : null}

          {activeStep.id === "review" ? (
            <div style={styles.reviewList}>
              <span><strong>Item:</strong> {form.title || "Not entered"}</span>
              <span><strong>Shops:</strong> {form.shopTags.map(getShopLabel).join(", ")}</span>
              <span><strong>Categories:</strong> {form.categoryTags.join(", ")}</span>
              <span><strong>Available:</strong> {form.quantityAvailable}</span>
              <span><strong>Option:</strong> {form.optionLabel} at JMD {Number(form.optionPrice || 0).toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          {stepIndex < flowSteps.length - 1 ? (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() =>
                setStepIndex((current) =>
                  Math.min(flowSteps.length - 1, current + 1)
                )
              }
            >
              Next
            </button>
          ) : (
            <button type="submit" disabled={isSaving} style={styles.primaryButton}>
              {isSaving ? "Saving..." : "Save Inventory"}
            </button>
          )}
          <button type="button" style={styles.secondaryButton} onClick={resetForm}>
            New Item
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.label}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function InlineInventoryEditor({
  draft,
  itemId,
  section,
  isSaving,
  onUpdate,
  onToggleShop,
  onSave,
}) {
  return (
    <div style={styles.inlineEditor}>
      <strong style={styles.inlineEditorTitle}>
        {getEditorSectionTitle(section)}
      </strong>

      {section === "identity" ? (
        <>
          <div style={styles.inlineEditorGrid}>
            <Field
              label="Item title"
              value={draft.title}
              onChange={(value) => onUpdate(itemId, "title", value)}
            />
            <label style={styles.label}>
              SKU
              <input
                value={draft.sku}
                onChange={(event) => onUpdate(itemId, "sku", event.target.value)}
                style={styles.input}
              />
              <span style={styles.inlineHelper}>
                Change SKU only when you are sure. Existing orders may reference
                it.
              </span>
            </label>
            <Field
              label="Image URL"
              value={draft.imageUrl}
              onChange={(value) => onUpdate(itemId, "imageUrl", value)}
            />
          </div>
          <label style={styles.label}>
            Categories, comma separated one-word tags
            <input
              value={draft.categoryTagsText}
              onChange={(event) =>
                onUpdate(itemId, "categoryTagsText", event.target.value)
              }
              style={styles.input}
            />
            <span style={styles.inlineHelper}>
              Example: Herbs, Seasoning, Perennial. Longer phrases are split
              into one-word tags when saved.
            </span>
          </label>
        </>
      ) : null}

      {section === "shops" ? (
        <div style={styles.inlineSection}>
          <div style={styles.shopGrid}>
            {shopOptions.map((shop) => (
              <label key={shop.id} style={styles.shopToggle}>
                <input
                  type="checkbox"
                  checked={normalizeArray(draft.shopTags).includes(shop.id)}
                  onChange={(event) =>
                    onToggleShop(itemId, shop.id, event.target.checked)
                  }
                />
                {shop.label}
              </label>
            ))}
          </div>
          <span style={styles.inlineHelper}>
            Add or remove the shops where this item should appear.
          </span>
        </div>
      ) : null}

      {section === "quantity" ? (
        <div style={styles.inlineEditorGrid}>
          <Field
            label="Quantity on hand"
            type="number"
            value={draft.quantityOnHand}
            onChange={(value) => onUpdate(itemId, "quantityOnHand", value)}
          />
          <Field
            label="Quantity reserved"
            type="number"
            value={draft.quantityReserved}
            onChange={(value) => onUpdate(itemId, "quantityReserved", value)}
          />
          <Field
            label="Quantity available"
            type="number"
            value={draft.quantityAvailable}
            onChange={(value) => onUpdate(itemId, "quantityAvailable", value)}
          />
        </div>
      ) : null}

      {section === "pricing" ? (
        <div style={styles.inlineSection}>
          <div style={styles.inlineEditorGrid}>
            <Field
              label="Original price"
              type="number"
              value={draft.originalPrice}
              onChange={(value) => onUpdate(itemId, "originalPrice", value)}
            />
            <Field
              label="Discounted price"
              type="number"
              value={draft.discountedPrice}
              onChange={(value) => onUpdate(itemId, "discountedPrice", value)}
            />
          </div>
          <span style={styles.inlineHelper}>
            Leave discounted price blank when the shop should show only one
            price.
          </span>
        </div>
      ) : null}

      {section === "variation" ? (
        <div style={styles.inlineSection}>
          <div style={styles.inlineEditorGrid}>
            <label style={styles.label}>
              Variation title
              <select
                value={draft.variationTitle}
                onChange={(event) =>
                  onUpdate(itemId, "variationTitle", event.target.value)
                }
                style={styles.input}
              >
                {commonVariationTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.shopToggle}>
              <input
                type="checkbox"
                checked={Boolean(draft.useCustomVariationTitle)}
                onChange={(event) =>
                  onUpdate(
                    itemId,
                    "useCustomVariationTitle",
                    event.target.checked
                  )
                }
              />
              Use custom variation title
            </label>
            {draft.useCustomVariationTitle ? (
              <Field
                label="Custom variation title"
                value={draft.customVariationTitle}
                onChange={(value) =>
                  onUpdate(itemId, "customVariationTitle", value)
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {section === "delivery" ? (
        <div style={styles.inlineEditorGrid}>
          <Field
            label="Weight"
            value={draft.weight}
            onChange={(value) => onUpdate(itemId, "weight", value)}
          />
          <Field
            label="Dimensions"
            value={draft.dimensions}
            onChange={(value) => onUpdate(itemId, "dimensions", value)}
          />
        </div>
      ) : null}

      {section === "dates" ? (
        <div style={styles.inlineEditorGrid}>
          <Field
            label="Production date"
            type="date"
            value={draft.productionDate}
            onChange={(value) => onUpdate(itemId, "productionDate", value)}
          />
          <Field
            label="Availability date"
            type="date"
            value={draft.availabilityDate}
            onChange={(value) => onUpdate(itemId, "availabilityDate", value)}
          />
          <Field
            label="Price increase date"
            type="date"
            value={draft.priceIncreaseDate}
            onChange={(value) => onUpdate(itemId, "priceIncreaseDate", value)}
          />
          <Field
            label="Expiry date"
            type="date"
            value={draft.expiryDate}
            onChange={(value) => onUpdate(itemId, "expiryDate", value)}
          />
        </div>
      ) : null}

      {section === "adCopy" ? (
      <label style={styles.label}>
        Description
        <textarea
          value={draft.description}
          onChange={(event) =>
            onUpdate(itemId, "description", event.target.value)
          }
          rows={3}
          style={{ ...styles.input, resize: "vertical" }}
        />
      </label>
      ) : null}

      <div style={styles.actions}>
        <button
          type="button"
          disabled={isSaving}
          style={styles.primaryButton}
          onClick={onSave}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getEditorSectionTitle(section) {
  const titles = {
    identity: "Edit product identity",
    shops: "Edit shops",
    quantity: "Edit quantity",
    pricing: "Edit price",
    variation: "Edit variation",
    delivery: "Edit delivery info",
    dates: "Edit dates",
    adCopy: "Edit ad copy",
  };

  return titles[section] || "Edit inventory item";
}

function makeItemDraft(item) {
  const metadata = getItemMetadata(item);
  const options = normalizeArray(item.options);
  const primaryOption = options[0] || {};
  const priceInfo = getInventoryPriceInfo(item, options);
  const variationInfo = getVariationInfo(item, options);

  return {
    title: item.title || "",
    sku: item.sku || "",
    imageUrl: item.imageUrl || "",
    description: item.description || "",
    quantityOnHand: item.quantityOnHand ?? 0,
    quantityReserved: item.quantityReserved ?? 0,
    quantityAvailable: item.quantityAvailable ?? 0,
    shopTags: normalizeArray(item.shopTags).length
      ? normalizeArray(item.shopTags)
      : ["little-orchard-shop"],
    categoryTagsText: normalizeCategoryTags(
      normalizeArray(item.categoryTags).join(", ")
    ).join(", "),
    variationTitle: variationInfo.variationTitle || "Default",
    useCustomVariationTitle: Boolean(variationInfo.useCustomVariationTitle),
    customVariationTitle: variationInfo.customVariationTitle || "",
    originalPrice: priceInfo.originalPrice || Number(primaryOption.price || 0),
    discountedPrice: priceInfo.discountedPrice || "",
    weight: metadata.weight || primaryOption.weight || "",
    dimensions: metadata.dimensions || "",
    productionDate: normalizeDateInput(metadata.productionDate),
    availabilityDate: normalizeDateInput(metadata.availabilityDate),
    priceIncreaseDate: normalizeDateInput(metadata.priceIncreaseDate),
    expiryDate: normalizeDateInput(metadata.expiryDate),
  };
}

function normalizeCategoryTags(value) {
  const seen = new Set();

  return String(value || "")
    .split(",")
    .flatMap((part) => part.split(/\s+|&|\/|\+/))
    .map((tag) => tag.replace(/[^a-z0-9-]/gi, "").trim())
    .filter((tag) => !["and", "or", "the", "for"].includes(tag.toLowerCase()))
    .filter(Boolean)
    .map((tag) => tag.slice(0, 1).toUpperCase() + tag.slice(1).toLowerCase())
    .filter((tag) => {
      const key = tag.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function getShopListing(item, shopId) {
  return (
    normalizeArray(item.shopListings).find(
      (listing) =>
        listing && typeof listing === "object" && listing.shopKey === shopId
    ) || null
  );
}

function getInventorySortValue(item, shopId) {
  if (shopId === "all") {
    return 999999;
  }

  const listing = getShopListing(item, shopId);
  const sortOrder = Number(listing?.sortOrder);

  return Number.isFinite(sortOrder) ? sortOrder : 999999;
}

function updatePrimaryOption(
  options,
  quantityOnHand,
  quantityReserved,
  quantityAvailable,
  optionLabel,
  price,
  weight
) {
  const normalizedOptions = normalizeArray(options);
  const nextOption = {
    ...(normalizedOptions[0] || {}),
    id: normalizedOptions[0]?.id || slugify(optionLabel || "default"),
    label: optionLabel || "Default",
    price: toPositiveNumber(price),
    weight: weight || undefined,
    quantityOnHand,
    quantityReserved,
    quantityAvailable,
    metadata:
      normalizedOptions[0]?.metadata &&
      typeof normalizedOptions[0].metadata === "object"
        ? {
            ...normalizedOptions[0].metadata,
            eventQuantityAvailable: quantityAvailable,
          }
        : {
            eventQuantityAvailable: quantityAvailable,
          },
  };

  if (!normalizedOptions.length) {
    return [nextOption];
  }

  return [nextOption, ...normalizedOptions.slice(1)];
}

function getItemMetadata(item) {
  return item.metadata && typeof item.metadata === "object" ? item.metadata : {};
}

function getShopSummary(item) {
  const listings = normalizeArray(item.shopListings);
  const shopTags = normalizeArray(item.shopTags);

  return shopTags
    .map((shopId) => {
      const listing = listings.find(
        (entry) =>
          entry && typeof entry === "object" && entry.shopKey === shopId
      );
      const position = Number(listing?.sortOrder);
      const positionText = Number.isFinite(position) ? `(${position + 1})` : "";

      return `${getShopLabel(shopId)}${positionText}`;
    })
    .join(", ");
}

function getInventoryPriceInfo(item, options) {
  const metadata = getItemMetadata(item);
  const prices = normalizeArray(options)
    .map((option) => Number(option?.price || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const optionPrice = prices.length ? Math.min(...prices) : 0;
  const originalPrice = toPositiveNumber(metadata.originalPrice || optionPrice);
  const discountedPrice = toOptionalPositiveNumber(metadata.discountedPrice);

  return {
    originalPrice,
    discountedPrice,
  };
}

function getVariationInfo(item, options) {
  const metadata = getItemMetadata(item);
  const labels = normalizeArray(options)
    .map((option) => String(option?.label || "").trim())
    .filter(Boolean);
  const variationTitle =
    String(metadata.variationTitle || labels[0] || "Default").trim() ||
    "Default";
  const useCustomVariationTitle = Boolean(metadata.useCustomVariationTitle);
  const customVariationTitle = String(
    metadata.customVariationTitle || (useCustomVariationTitle ? variationTitle : "")
  ).trim();

  return {
    variationTitle,
    useCustomVariationTitle,
    customVariationTitle,
  };
}

function getSoldQuantity(item) {
  const metadata = getItemMetadata(item);
  const sold = Number(metadata.soldQuantity || metadata.quantitySold || 0);

  return Number.isFinite(sold) ? sold : 0;
}

function getDamagedQuantity(item) {
  const metadata = getItemMetadata(item);
  const damaged = Number(
    metadata.damagedQuantity ||
      metadata.missingQuantity ||
      metadata.quantityDamaged ||
      0
  );

  return Number.isFinite(damaged) ? damaged : 0;
}

function formatJmd(value) {
  return `JMD $${Number(value || 0).toLocaleString()}`;
}

function toPositiveNumber(value) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalPositiveNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : "";
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.slice(0, 10);
}

function getShopLabel(value) {
  return shopOptions.find((shop) => shop.id === value)?.label || value;
}

function getInitials(value) {
  return String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const styles = {
  section: {
    display: "grid",
    gap: "16px",
    marginTop: "24px",
  },
  sectionHeader: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
  },
  panelHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
  },
  h2: {
    fontSize: "22px",
    margin: 0,
  },
  h3: {
    fontSize: "17px",
    margin: 0,
  },
  copy: {
    margin: "4px 0 0",
    opacity: 0.7,
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "16px",
  },
  inventoryList: {
    display: "grid",
    gap: "10px",
  },
  inventoryRow: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "0",
    cursor: "grab",
    display: "grid",
    gap: "0",
    padding: "18px 42px 12px",
    textAlign: "left",
  },
  inventoryRowCompact: {
    padding: "14px 12px",
  },
  inventoryRowDragging: {
    borderColor: "#2f6f3e",
    boxShadow: "0 8px 20px rgba(47, 111, 62, 0.16)",
    opacity: 0.72,
  },
  inventoryRowDropTarget: {
    borderColor: "#9c2440",
    boxShadow: "inset 0 0 0 2px rgba(156, 36, 64, 0.18)",
  },
  dragHandle: {
    alignItems: "center",
    color: "#b6b0ad",
    display: "grid",
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "2px",
    justifyItems: "center",
    textTransform: "uppercase",
  },
  inventoryRecordTop: {
    alignItems: "center",
    borderBottom: "1px solid rgba(32, 28, 29, 0.14)",
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "138px minmax(0, 1fr) auto",
    paddingBottom: "10px",
  },
  inventoryRecordTopCompact: {
    alignItems: "start",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
  },
  inventoryRecordTopNoImage: {
    gridTemplateColumns: "minmax(0, 1fr) auto",
  },
  recordImage: {
    aspectRatio: "1",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "10px",
    objectFit: "cover",
    width: "138px",
  },
  recordImageCompact: {
    borderRadius: "8px",
    gridColumn: "1 / -1",
    maxHeight: "220px",
    width: "100%",
  },
  recordImagePlaceholder: {
    alignItems: "center",
    aspectRatio: "1",
    background: "#f3efe7",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "10px",
    display: "grid",
    fontSize: "34px",
    fontWeight: 900,
    justifyItems: "center",
    width: "138px",
  },
  recordImagePlaceholderCompact: {
    borderRadius: "8px",
    fontSize: "32px",
    gridColumn: "1 / -1",
    width: "100%",
  },
  recordTitleBlock: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  recordTitleBlockCompact: {
    gridColumn: "1",
  },
  recordHeaderActions: {
    alignItems: "end",
    display: "grid",
    gap: "10px",
    justifyItems: "end",
  },
  recordHeaderActionsCompact: {
    alignSelf: "start",
    gridColumn: "2",
    gridRow: "2",
  },
  topOrderControls: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "end",
  },
  mobileOrderRow: {
    borderBottom: "1px solid rgba(32, 28, 29, 0.14)",
    padding: "10px 0",
  },
  topOrderControlsCompact: {
    alignItems: "center",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(58px, auto) 42px 74px 42px minmax(0, 1fr)",
    width: "100%",
  },
  visibilityButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 900,
    padding: "8px 10px",
    textTransform: "uppercase",
  },
  visibilityButtonHidden: {
    background: "#9c2440",
  },
  reorderHint: {
    color: "#9c2440",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  expandDetailsButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 800,
    marginTop: "10px",
    padding: "9px 12px",
    textAlign: "left",
    width: "100%",
  },
  recordTitle: {
    fontSize: "42px",
    fontWeight: 500,
    letterSpacing: "8px",
    lineHeight: 1,
    overflowWrap: "anywhere",
  },
  recordTitleCompact: {
    fontSize: "24px",
    letterSpacing: "1px",
    lineHeight: 1.08,
  },
  recordMeta: {
    color: "#b6b0ad",
    fontSize: "29px",
    fontWeight: 900,
    lineHeight: 1.05,
    textTransform: "uppercase",
  },
  recordMetaCompact: {
    fontSize: "15px",
    lineHeight: 1.15,
  },
  recordSku: {
    color: "#b6b0ad",
    fontSize: "24px",
  },
  recordSkuCompact: {
    fontSize: "14px",
  },
  hiddenBadge: {
    background: "#fff0f3",
    border: "1px solid rgba(156, 36, 64, 0.24)",
    borderRadius: "999px",
    color: "#9c2440",
    fontSize: "12px",
    fontWeight: 900,
    justifySelf: "start",
    padding: "4px 8px",
    textTransform: "uppercase",
  },
  editLinkButton: {
    background: "transparent",
    border: "none",
    color: "#000000",
    cursor: "pointer",
    font: "inherit",
    fontSize: "15px",
    fontWeight: 900,
    padding: "4px",
    textDecoration: "underline",
    textTransform: "uppercase",
  },
  recordSection: {
    alignItems: "start",
    borderBottom: "1px solid rgba(32, 28, 29, 0.14)",
    display: "grid",
    gap: "8px 18px",
    gridTemplateColumns: "minmax(130px, auto) minmax(0, 1fr) auto",
    padding: "10px 0",
  },
  recordSectionCompact: {
    gap: "5px",
    gridTemplateColumns: "1fr auto",
  },
  recordSectionLabel: {
    color: "#b6b0ad",
    display: "block",
    fontSize: "26px",
    fontWeight: 500,
    lineHeight: 1.15,
    textTransform: "uppercase",
  },
  recordSectionLabelCompact: {
    fontSize: "16px",
  },
  recordSectionText: {
    fontSize: "26px",
    lineHeight: 1.25,
  },
  recordSectionTextCompact: {
    fontSize: "18px",
    gridColumn: "1 / -1",
  },
  recordStats: {
    display: "grid",
    fontSize: "26px",
    gap: "10px",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    lineHeight: 1.2,
  },
  recordStatsCompact: {
    fontSize: "18px",
    gap: "5px",
    gridColumn: "1 / -1",
    gridTemplateColumns: "1fr",
  },
  recordVariationGrid: {
    borderBottom: "1px solid rgba(32, 28, 29, 0.14)",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    padding: "14px 0",
  },
  recordVariationGridCompact: {
    gridTemplateColumns: "1fr",
  },
  recordFooter: {
    alignItems: "center",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr)) auto",
    paddingTop: "14px",
  },
  recordFooterCompact: {
    gridTemplateColumns: "1fr",
  },
  footerTextButton: {
    background: "transparent",
    border: "none",
    color: "#000000",
    cursor: "pointer",
    font: "inherit",
    fontSize: "26px",
    padding: "4px 8px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  footerTextButtonCompact: {
    borderBottom: "1px solid rgba(32, 28, 29, 0.12)",
    fontSize: "18px",
    padding: "10px 0",
  },
  moveButtons: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "end",
  },
  positionLabel: {
    color: "#67594c",
    display: "grid",
    fontSize: "11px",
    fontWeight: 800,
    gap: "3px",
    textTransform: "uppercase",
  },
  positionInput: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    fontSize: "17px",
    fontWeight: 800,
    padding: "6px 10px",
    textAlign: "center",
    width: "92px",
  },
  iconMoveButton: {
    alignItems: "center",
    background: "#000000",
    border: "none",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    display: "grid",
    fontSize: "17px",
    fontWeight: 900,
    height: "32px",
    justifyItems: "center",
    lineHeight: 1,
    width: "32px",
  },
  inlineEditor: {
    background: "#f8f6f1",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    gridColumn: "1 / -1",
    padding: "12px",
  },
  inlineEditorTitle: {
    color: "#2f2a24",
    fontSize: "16px",
    textTransform: "uppercase",
  },
  inlineEditorGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  inlineSection: {
    display: "grid",
    gap: "8px",
  },
  inlineHelper: {
    color: "#67594c",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1.35,
  },
  thumbnail: {
    aspectRatio: "1",
    borderRadius: "8px",
    objectFit: "cover",
    width: "56px",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    aspectRatio: "1",
    background: "#f3efe7",
    borderRadius: "8px",
    display: "grid",
    fontWeight: 800,
    justifyItems: "center",
    width: "56px",
  },
  itemText: {
    display: "grid",
    gap: "3px",
    minWidth: 0,
  },
  quantityBlock: {
    display: "grid",
    justifyItems: "end",
  },
  stepTabs: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  stepTab: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "999px",
    cursor: "pointer",
    font: "inherit",
    fontSize: "12px",
    fontWeight: 800,
    padding: "8px 10px",
  },
  stepTabActive: {
    background: "#2f6f3e",
    borderColor: "#2f6f3e",
    color: "#ffffff",
  },
  flowPanel: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "12px",
    paddingTop: "12px",
  },
  twoColumns: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  shopGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  shopToggle: {
    alignItems: "center",
    background: "#f8f6f1",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "6px",
    display: "flex",
    gap: "8px",
    padding: "10px",
  },
  reviewList: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "6px",
    padding: "12px",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 700,
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    padding: "9px 10px",
    width: "100%",
  },
  actions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  visibilityFilters: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "6px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "8px 10px",
  },
  visibilityFilterOption: {
    alignItems: "center",
    display: "flex",
    fontSize: "13px",
    fontWeight: 800,
    gap: "5px",
  },
  primaryButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  primaryCompactButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  primaryCompactButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.45,
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 14px",
  },
  smallButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    padding: "7px 9px",
  },
  statusNotice: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 111, 62, 0.22)",
    borderLeft: "6px solid #2f6f3e",
    borderRadius: "8px",
    color: "#2f2a24",
    fontSize: "15px",
    fontWeight: 800,
    margin: 0,
    padding: "12px 14px",
  },
  statusNoticeSuccess: {
    background: "#e9f8ee",
    borderColor: "rgba(47, 111, 62, 0.36)",
    boxShadow: "0 8px 22px rgba(47, 111, 62, 0.12)",
  },
  empty: {
    margin: 0,
    opacity: 0.68,
  },
};
