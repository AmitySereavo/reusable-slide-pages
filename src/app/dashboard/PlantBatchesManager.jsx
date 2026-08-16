"use client";

import { useEffect, useMemo, useState } from "react";

const purposeOptions = [
  { id: "seedling-shop", label: "Seedling Shop" },
  { id: "little-orchard-shop", label: "Little Orchard Shop" },
  { id: "garden-package", label: "Garden Package" },
  { id: "callaloo", label: "Callaloo Store" },
  { id: "greenhouse-stock", label: "General Nursery Stock" },
  { id: "custom", label: "Custom Purpose" },
];

const statusOptions = ["planned", "active", "transplanted", "available", "sold_out", "cancelled"];

const startMethodOptions = [
  { id: "seedling", label: "Seed sown" },
  { id: "cutting", label: "Cutting" },
  { id: "air_layer", label: "Air layering" },
  { id: "division", label: "Division" },
  { id: "sucker", label: "Sucker" },
  { id: "grafting", label: "Grafting" },
  { id: "existing_stock", label: "Gathered from existing nursery stock" },
  { id: "other", label: "Other / custom start" },
];

const actionOptions = [
  { id: "water", label: "Water" },
  { id: "mist", label: "Mist" },
  { id: "feed", label: "Feed" },
  { id: "pest_control", label: "Pest control" },
  { id: "disease_control", label: "Disease control" },
  { id: "prune", label: "Prune" },
  { id: "pinch", label: "Pinch" },
  { id: "pot_up", label: "Pot-up" },
  { id: "transplant", label: "Transplant" },
  { id: "transplant_session", label: "Transplant session" },
  { id: "hardening", label: "Hardening" },
  { id: "move_to_sun", label: "Move to sun" },
  { id: "move_to_shade", label: "Move to shade" },
  { id: "install_support", label: "Install support" },
  { id: "pest_inspection", label: "Pest inspection" },
  { id: "disease_inspection", label: "Disease inspection" },
  { id: "harvest_ready_check", label: "Harvest ready check" },
  { id: "propagation_material_check", label: "Propagation-material check" },
  { id: "not_done_rescheduled", label: "Not done / rescheduled" },
  { id: "custom", label: "Custom action" },
];

const notDoneReasonOptions = [
  { id: "preoccupied", label: "Preoccupied / busy" },
  { id: "soil_moist", label: "Soil was already moist" },
  { id: "plant_not_ready", label: "Plant was not stage-ready" },
  { id: "weather", label: "Weather / rain issue" },
  { id: "materials_unavailable", label: "Materials unavailable" },
  { id: "custom", label: "Custom reason" },
];

const todayInputValue = new Date().toISOString().slice(0, 10);

export default function PlantBatchesManager() {
  const [plantCatalog, setPlantCatalog] = useState([]);
  const [batches, setBatches] = useState([]);
  const [planningBlocks, setPlanningBlocks] = useState([]);
  const [status, setStatus] = useState("Loading plant batches...");
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState("");
  const [editDrafts, setEditDrafts] = useState({});
  const [batchSearch, setBatchSearch] = useState("");
  const [form, setForm] = useState({
    cropKey: "",
    cropName: "",
    propagationType: "seedling",
    purposeKey: "seedling-shop",
    productionDate: todayInputValue,
    productionTime: "08:00",
    quantityStarted: "",
  });
  const [activityDrafts, setActivityDrafts] = useState({});
  const [taskReasonDrafts, setTaskReasonDrafts] = useState({});
  const [taskDoneDrafts, setTaskDoneDrafts] = useState({});

  useEffect(() => {
    void loadBatches();
  }, []);

  const filteredBatches = useMemo(() => {
    const query = normalizeSearchText(batchSearch);
    const matchingBatches = query
      ? batches.filter((batch) => getBatchSearchText(batch).includes(query))
      : batches;
    return [...matchingBatches].sort(compareBatchesByStartDate);
  }, [batchSearch, batches]);

  const groupedBatches = useMemo(() => {
    return filteredBatches.reduce((groups, batch) => {
      const key = batch.productionPurpose?.label || "No purpose recorded";
      groups.set(key, [...(groups.get(key) || []), batch]);
      return groups;
    }, new Map());
  }, [filteredBatches]);

  const planningByBatch = useMemo(() => {
    return planningBlocks.reduce((groups, block) => {
      if (!block.batchId) return groups;
      const current = groups.get(block.batchId) || [];
      current.push(block);
      groups.set(block.batchId, current);
      return groups;
    }, new Map());
  }, [planningBlocks]);

  async function loadBatches() {
    const [response, planningResponse] = await Promise.all([
      fetch("/api/dashboard/seedling-batches"),
      fetch("/api/dashboard/production-planning"),
    ]);
    const payload = await response.json().catch(() => ({}));
    const planningPayload = await planningResponse.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload?.error || "Plant batches could not be loaded.");
      return;
    }

    setPlantCatalog(payload.plantCatalog || []);
    setBatches(payload.batches || []);
    setPlanningBlocks(planningPayload.batchProductionPlanning?.blocks || []);
    setForm((current) => ({
      ...current,
      cropKey: current.cropKey || payload.plantCatalog?.[0]?.key || "",
      cropName: current.cropName || payload.plantCatalog?.[0]?.name || "",
    }));
    setStatus("");
  }

  async function refreshAfterMutation(payload) {
    setBatches(payload.batches || []);
    setPlantCatalog(payload.plantCatalog || plantCatalog);
    const planningResponse = await fetch("/api/dashboard/production-planning");
    const planningPayload = await planningResponse.json().catch(() => ({}));
    setPlanningBlocks(planningPayload.batchProductionPlanning?.blocks || []);
  }

  async function createBatch() {
    setIsSaving(true);
    setStatus("Creating plant batch...");
    const response = await fetch("/api/dashboard/seedling-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-batch",
        cropKey: form.cropKey,
        cropName: form.cropName,
        propagationType: form.propagationType,
        purposeKey: form.purposeKey,
        productionDate: form.productionDate || todayInputValue,
        productionTime: form.productionTime || "08:00",
        quantityStarted: Number(form.quantityStarted || 0),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Plant batch could not be created.");
      return;
    }

    await refreshAfterMutation(payload);
    setForm((current) => ({ ...current, quantityStarted: "" }));
    setShowCreateForm(false);
    setStatus(`Created: ${payload.batch?.batchName || "plant batch"}.`);
  }

  function beginEdit(batch) {
    setEditingBatchId(batch.id);
    setEditDrafts((current) => ({
      ...current,
      [batch.id]: {
        batchName: batch.batchName || "",
        purposeKey: batch.productionPurpose?.key || "seedling-shop",
        purposeConfirmation: "",
        status: batch.status || "planned",
        quantityStarted: String(batch.quantityStarted || 0),
        quantityReserved: String(batch.quantityReserved || 0),
        quantityAvailable: String(batch.quantityAvailable || 0),
      },
    }));
  }

  function updateDraft(batchId, key, value) {
    setEditDrafts((current) => ({
      ...current,
      [batchId]: {
        ...(current[batchId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveBatch(batch) {
    const draft = editDrafts[batch.id] || {};
    const currentPurposeKey = batch.productionPurpose?.key || "seedling-shop";
    const nextPurposeKey = draft.purposeKey || currentPurposeKey;
    if (nextPurposeKey !== currentPurposeKey) {
      const nextPurpose = purposeOptions.find((option) => option.id === nextPurposeKey);
      const expectedConfirmation = nextPurpose?.label || nextPurposeKey;
      if (
        String(draft.purposeConfirmation || "").trim().toLowerCase() !==
        expectedConfirmation.toLowerCase()
      ) {
        setStatus(
          `Type "${expectedConfirmation}" to confirm changing this batch purpose.`
        );
        return;
      }
    }
    setIsSaving(true);
    setStatus(`Saving ${batch.batchName}...`);
    const response = await fetch("/api/dashboard/seedling-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-batch",
        batchId: batch.id,
        batchName: draft.batchName,
        purposeKey: draft.purposeKey,
        status: draft.status,
        quantityStarted: Number(draft.quantityStarted || 0),
        quantityReserved: Number(draft.quantityReserved || 0),
        quantityAvailable: Number(draft.quantityAvailable || 0),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Plant batch could not be saved.");
      return;
    }

    await refreshAfterMutation(payload);
    setEditingBatchId("");
    setStatus(`Saved: ${payload.batch?.batchName || batch.batchName}.`);
  }

  async function deleteBatch(batch) {
    const confirmation = window.prompt(
      `Type "delete batch" to remove ${batch.batchName}.`
    );
    if (confirmation !== "delete batch") {
      setStatus("Batch deletion cancelled.");
      return;
    }

    setIsSaving(true);
    setStatus(`Deleting ${batch.batchName}...`);
    const response = await fetch("/api/dashboard/seedling-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete-batch",
        batchId: batch.id,
        confirmation,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Plant batch could not be deleted.");
      return;
    }

    await refreshAfterMutation(payload);
    setStatus(`Deleted: ${payload.deletedBatch?.batchName || batch.batchName}.`);
  }

  function updateActivityDraft(batchId, key, value) {
    setActivityDrafts((current) => ({
      ...current,
      [batchId]: {
        ...(current[batchId] || getDefaultActivityDraft(batchId)),
        [key]: value,
      },
    }));
  }

  async function recordActivity(batchId, overrideDraft = null) {
    const draft = overrideDraft || activityDrafts[batchId] || getDefaultActivityDraft();
    setIsSaving(true);
    setStatus("Recording batch activity...");
    const response = await fetch("/api/dashboard/seedling-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record-activity",
        batchId,
        actionType: draft.actionType,
        customActionTitle: draft.customActionTitle,
        performedDate: draft.performedDate || todayInputValue,
        performedTime: draft.performedTime,
        quantityTransplanted: Number(draft.quantityTransplanted || 0),
        notes: draft.notes,
        photoUrl: draft.photoUrl,
        metadata: draft.metadata || {},
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Batch activity could not be saved.");
      return;
    }

    await refreshAfterMutation(payload);
    setActivityDrafts((current) => ({
      ...current,
      [batchId]: getDefaultActivityDraft(batchId),
    }));
    setStatus(
      draft.metadata?.completionStatus === "done"
        ? "Timeline task completed and removed from upcoming care."
        : "Batch activity recorded."
    );
  }

  function updateTaskReasonDraft(taskKey, key, value) {
    setTaskReasonDrafts((current) => ({
      ...current,
      [taskKey]: {
        ...(current[taskKey] || { reason: "preoccupied", customReason: "" }),
        [key]: value,
      },
    }));
  }

  function updateTaskDoneDraft(taskKey, key, value) {
    setTaskDoneDrafts((current) => ({
      ...current,
      [taskKey]: {
        ...(current[taskKey] || getDefaultDoneDraft()),
        [key]: value,
      },
    }));
  }

  async function confirmTimelineAction(batch, action) {
    const doneDraft = taskDoneDrafts[action.key] || getDefaultDoneDraft();
    await recordActivity(batch.id, {
      ...getDefaultActivityDraft(),
      actionType: "custom",
      customActionTitle: `${action.actionType} completed`,
      performedDate: doneDraft.performedDate || todayInputValue,
      performedTime: doneDraft.performedTime || getCurrentTimeInputValue(),
      notes: [
        `Confirmed scheduled production timeline task.`,
        `Plant: ${getBatchPlantName(batch)}.`,
        `Day: ${action.actionDay}.`,
        action.treatment ? `Treatment: ${action.treatment}.` : "",
        action.instruction ? `Instruction: ${action.instruction}` : "",
        doneDraft.notes ? `Admin note: ${doneDraft.notes}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      metadata: {
        source: "plant-production-timeline",
        completionStatus: "done",
        timelineTaskKey: getTimelineTaskKey(action),
        timelineActionDate: action.actionDate,
        timelineActionDay: action.actionDay,
        timelineActionType: action.actionType,
        timelineTreatment: action.treatment || "",
        timelineInstruction: action.instruction || "",
      },
    });
  }

  async function recordTimelineNotDone(batch, action) {
    const reasonDraft =
      taskReasonDrafts[action.key] || { reason: "preoccupied", customReason: "" };
    const reasonLabel =
      reasonDraft.reason === "custom"
        ? String(reasonDraft.customReason || "").trim()
        : notDoneReasonOptions.find((option) => option.id === reasonDraft.reason)
            ?.label;

    if (!reasonLabel) {
      setStatus("Enter the reason the task was not done.");
      return;
    }

    await recordActivity(batch.id, {
      ...getDefaultActivityDraft(),
      actionType: "not_done_rescheduled",
      customActionTitle: `${action.actionType} not done`,
      performedDate: todayInputValue,
      performedTime: getCurrentTimeInputValue(),
      notes: [
        `Scheduled production timeline task was not done.`,
        `Reason: ${reasonLabel}.`,
        `Plant: ${getBatchPlantName(batch)}.`,
        `Day: ${action.actionDay}.`,
        action.treatment ? `Treatment: ${action.treatment}.` : "",
        action.instruction ? `Instruction: ${action.instruction}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  return (
    <section style={styles.stack}>
      {status ? <p role="status" style={styles.status}>{status}</p> : null}

      <section style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Plant Batches</h2>
            <p style={styles.copy}>
              Create and manage nursery batches by plant type. Every batch
              should match a plant in the Plant Production Timeline catalog.
            </p>
          </div>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? "Close add plant batch" : "Add plant batch"}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() =>
                setStatus("Add plant batch from orders will scan paid orders in the next pass.")
              }
            >
              Add plant batch from orders
            </button>
          </div>
        </div>

        {showCreateForm ? (
          <div style={styles.formGrid}>
          <label style={styles.field}>
            <span>Plant type</span>
            <select
              value={form.cropKey}
              onChange={(event) => {
                const cropKey = event.target.value;
                const plant = plantCatalog.find((item) => item.key === cropKey);
                setForm((current) => ({
                  ...current,
                  cropKey,
                  cropName: plant?.name || "",
                }));
              }}
              style={styles.input}
            >
              {plantCatalog.map((plant) => (
                <option key={plant.key} value={plant.key}>
                  {plant.name}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.field}>
            <span>Start method</span>
            <select
              value={form.propagationType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  propagationType: event.target.value,
                }))
              }
              style={styles.input}
            >
              {startMethodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.field}>
            <span>Purpose / shop fed</span>
            <select
              value={form.purposeKey}
              onChange={(event) =>
                setForm((current) => ({ ...current, purposeKey: event.target.value }))
              }
              style={styles.input}
            >
              {purposeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Field label="Production date" type="date" value={form.productionDate} onChange={(value) => setForm((current) => ({ ...current, productionDate: value }))} />
          <Field label="Production time" type="time" value={form.productionTime} onChange={(value) => setForm((current) => ({ ...current, productionTime: value }))} />
          <Field label="Quantity started" type="number" value={form.quantityStarted} onChange={(value) => setForm((current) => ({ ...current, quantityStarted: value }))} />
          <button type="button" style={styles.primaryButton} disabled={isSaving} onClick={createBatch}>
            Save plant batch
          </button>
        </div>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Plant Batch Records</h2>
            <p style={styles.copy}>
              Edit quantities, status, and purpose. Delete only for mistaken
              records.
            </p>
          </div>
          <strong style={styles.badge}>
            {filteredBatches.length === batches.length
              ? `${batches.length} batch(es)`
              : `${filteredBatches.length} of ${batches.length} batch(es)`}
          </strong>
        </div>

        <label style={styles.searchField}>
          <span>Search plant batches</span>
          <input
            type="search"
            value={batchSearch}
            onChange={(event) => setBatchSearch(event.target.value)}
            placeholder="Search by purpose/shop, plant type, or start date"
            style={styles.searchInput}
          />
        </label>

        {batches.some((batch) => batch.needsTimelineMatch) ? (
          <section style={styles.warningPanel}>
            <strong>Needs Plant Production Timeline match</strong>
            <p style={styles.copy}>
              These batch names do not currently match the central timeline
              catalog. Add the plant timeline first, then update the batch.
            </p>
            <ul style={styles.missingList}>
              {batches
                .filter((batch) => batch.needsTimelineMatch)
                .map((batch) => (
                  <li key={batch.id}>{batch.cropName || batch.batchName}</li>
                ))}
            </ul>
          </section>
        ) : null}

        {[...groupedBatches.entries()].map(([purposeLabel, purposeBatches]) => (
          <section key={purposeLabel} style={styles.group}>
            <h3 style={styles.groupTitle}>{purposeLabel}</h3>
            <div style={styles.grid}>
              {purposeBatches.map((batch) => {
                const draft = editDrafts[batch.id] || {};
                const isEditing = editingBatchId === batch.id;
                const plantName = getBatchPlantName(batch);
                const startedLabel = formatDateTime(batch.productionAt);
                const transplantedCount = Number(batch.quantityAtTransplant || 0);
                const upcomingActions = getUpcomingActionsForBatch(
                  planningByBatch.get(batch.id) || [],
                  batch
                );
                const transplantSessionCount = getTransplantSessionCount(batch);
                return (
                  <details key={batch.id} style={styles.card}>
                    <summary style={styles.batchSummary}>
                      <div>
                        <strong style={styles.cardTitle}>{plantName}</strong>
                        <div style={styles.summaryMeta}>
                          <span>{formatStartMethod(batch.propagationType)}</span>
                          <span>{formatDate(batch.productionAt)}</span>
                          <span>{batch.productionPurpose?.label || "Purpose not recorded"}</span>
                        </div>
                        {batch.needsTimelineMatch ? (
                          <p style={styles.warningText}>Needs timeline match</p>
                        ) : null}
                      </div>
                      <span style={styles.statusPill}>{formatStatus(batch.status)}</span>
                    </summary>
                    <dl style={styles.stats}>
                      <Stat label="Start date" value={startedLabel} />
                      <Stat label="Start method" value={formatStartMethod(batch.propagationType)} />
                      <Stat label="Purpose" value={batch.productionPurpose?.label || "Not recorded"} />
                      <Stat label="Estimated quantity started" value={batch.quantityStarted} />
                      {transplantSessionCount ? (
                        <Stat
                          label="Transplanted"
                          value={`${transplantedCount} across ${transplantSessionCount} session(s)`}
                        />
                      ) : null}
                    </dl>
                    <details style={styles.inlineSection}>
                      <summary style={styles.inlineSummary}>
                        Upcoming care from production timeline ({upcomingActions.length})
                      </summary>
                      {upcomingActions.length ? (
                        <div style={styles.timelineList}>
                          {upcomingActions.map((action) => (
                            <article key={action.key} style={styles.timelineItem}>
                              <div style={styles.timelineSummary}>
                                <div style={styles.taskWhenBlock}>
                                  <span style={styles.taskDueText}>
                                    {formatDueWord(action.actionDate)}
                                  </span>
                                  <span style={styles.taskDateText}>
                                    {formatDate(action.actionDate)}
                                  </span>
                                </div>
                                <div style={styles.taskNameBlock}>
                                  <strong style={styles.taskActionText}>
                                    {action.actionType}
                                  </strong>
                                  {action.treatment ? (
                                    <span style={styles.taskTreatmentText}>
                                      {action.treatment}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div style={styles.taskBody}>
                                <details style={styles.timelineDetailPanel}>
                                  <summary style={styles.inlineSummary}>Details</summary>
                                  <p style={styles.copy}>{action.instruction}</p>
                                  {action.quantityInstruction ? (
                                    <p style={styles.copy}>
                                      Quantity: {action.quantityInstruction}
                                    </p>
                                  ) : null}
                                  {action.strength ? (
                                    <p style={styles.copy}>Strength: {action.strength}</p>
                                  ) : null}
                                  {action.applicationMethod ? (
                                    <p style={styles.copy}>
                                      Application: {action.applicationMethod}
                                    </p>
                                  ) : null}
                                </details>
                                <div style={styles.taskActions}>
                                  {canConfirmTimelineAction(action) ? (
                                    <details style={styles.confirmPanel}>
                                      <summary style={styles.confirmSummary}>
                                        Confirm done
                                      </summary>
                                      <BatchTaskDoneForm
                                        draft={
                                          taskDoneDrafts[action.key] ||
                                          getDefaultDoneDraft()
                                        }
                                        isSaving={isSaving}
                                        onChange={(key, value) =>
                                          updateTaskDoneDraft(action.key, key, value)
                                        }
                                        onSave={() => confirmTimelineAction(batch, action)}
                                      />
                                    </details>
                                  ) : null}
                                  {canConfirmTimelineAction(action) ? (
                                    <details style={styles.notDonePanel}>
                                      <summary style={styles.notDoneSummary}>Not done</summary>
                                      <label style={styles.field}>
                                        <span>Reason</span>
                                        <select
                                          value={
                                            taskReasonDrafts[action.key]?.reason ||
                                            "preoccupied"
                                          }
                                          onChange={(event) =>
                                            updateTaskReasonDraft(
                                              action.key,
                                              "reason",
                                              event.target.value
                                            )
                                          }
                                          style={styles.input}
                                        >
                                          {notDoneReasonOptions.map((option) => (
                                            <option key={option.id} value={option.id}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      {(taskReasonDrafts[action.key]?.reason ||
                                        "preoccupied") === "custom" ? (
                                        <Field
                                          label="Custom reason"
                                          value={taskReasonDrafts[action.key]?.customReason || ""}
                                          onChange={(value) =>
                                            updateTaskReasonDraft(
                                              action.key,
                                              "customReason",
                                              value
                                            )
                                          }
                                        />
                                      ) : null}
                                      <button
                                        type="button"
                                        style={styles.secondaryButton}
                                        disabled={isSaving}
                                        onClick={() => recordTimelineNotDone(batch, action)}
                                      >
                                        Save not done
                                      </button>
                                    </details>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p style={styles.copy}>
                          No upcoming timeline actions are scheduled in the next
                          planning window.
                        </p>
                      )}
                    </details>
                    <details style={styles.inlineSection}>
                      <summary style={styles.inlineSummary}>Add batch activity</summary>
                      <BatchActivityForm
                        batch={batch}
                        draft={activityDrafts[batch.id] || getDefaultActivityDraft(batch.id)}
                        isSaving={isSaving}
                        onChange={(key, value) => updateActivityDraft(batch.id, key, value)}
                        onSave={() => recordActivity(batch.id)}
                      />
                    </details>
                    <details style={styles.inlineSection}>
                      <summary style={styles.inlineSummary}>
                        Batch history ({batch.activities?.length || 0})
                      </summary>
                      <BatchHistory batch={batch} />
                    </details>
                    {isEditing ? (
                      <div style={styles.editPanel}>
                        <Field label="Batch name" value={draft.batchName} onChange={(value) => updateDraft(batch.id, "batchName", value)} />
                        <label style={styles.field}>
                          <span>Purpose / shop fed</span>
                          <select value={draft.purposeKey} onChange={(event) => updateDraft(batch.id, "purposeKey", event.target.value)} style={styles.input}>
                            {purposeOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        {draft.purposeKey !== (batch.productionPurpose?.key || "seedling-shop") ? (
                          <Field
                            label={`Type "${purposeOptions.find((option) => option.id === draft.purposeKey)?.label || draft.purposeKey}" to confirm purpose change`}
                            value={draft.purposeConfirmation || ""}
                            onChange={(value) => updateDraft(batch.id, "purposeConfirmation", value)}
                          />
                        ) : null}
                        <label style={styles.field}>
                          <span>Status</span>
                          <select value={draft.status} onChange={(event) => updateDraft(batch.id, "status", event.target.value)} style={styles.input}>
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <Field label="Estimated quantity started" type="number" value={draft.quantityStarted} onChange={(value) => updateDraft(batch.id, "quantityStarted", value)} />
                        <Field label="Quantity reserved" type="number" value={draft.quantityReserved} onChange={(value) => updateDraft(batch.id, "quantityReserved", value)} />
                        <Field label="Quantity available" type="number" value={draft.quantityAvailable} onChange={(value) => updateDraft(batch.id, "quantityAvailable", value)} />
                        <div style={styles.actions}>
                          <button type="button" style={styles.primaryButton} disabled={isSaving} onClick={() => saveBatch(batch)}>
                            Save batch
                          </button>
                          <button type="button" style={styles.secondaryButton} onClick={() => setEditingBatchId("")}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div style={styles.actions}>
                      <button type="button" style={styles.secondaryButton} onClick={() => beginEdit(batch)}>
                        Edit batch
                      </button>
                      <button type="button" style={styles.dangerButton} disabled={isSaving} onClick={() => deleteBatch(batch)}>
                        Delete batch
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
        {!filteredBatches.length ? (
          <p style={styles.copy}>
            No plant batches match that search.
          </p>
        ) : null}
      </section>

    </section>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={styles.input} />
    </label>
  );
}

function BatchActivityForm({ draft, isSaving, onChange, onSave }) {
  return (
    <div style={styles.formGrid}>
      <label style={styles.field}>
        <span>Activity</span>
        <select
          value={draft.actionType}
          onChange={(event) => onChange("actionType", event.target.value)}
          style={styles.input}
        >
          {actionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {draft.actionType === "custom" ? (
        <Field
          label="Custom action title"
          value={draft.customActionTitle}
          onChange={(value) => onChange("customActionTitle", value)}
        />
      ) : null}
      <Field
        label="Activity date"
        type="date"
        value={draft.performedDate}
        onChange={(value) => onChange("performedDate", value)}
      />
      <Field
        label="Activity time"
        type="time"
        value={draft.performedTime}
        onChange={(value) => onChange("performedTime", value)}
      />
      {draft.actionType === "transplant_session" ? (
        <Field
          label="Quantity transplanted this session"
          type="number"
          value={draft.quantityTransplanted}
          onChange={(value) => onChange("quantityTransplanted", value)}
        />
      ) : null}
      <label style={styles.fieldWide}>
        <span>Notes / reason</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          style={styles.input}
        />
      </label>
      <button
        type="button"
        style={styles.primaryButton}
        disabled={isSaving}
        onClick={onSave}
      >
        Save batch activity
      </button>
    </div>
  );
}

function BatchHistory({ batch }) {
  const activities = Array.isArray(batch.activities) ? batch.activities : [];
  const transplantSessions = Array.isArray(batch.metadata?.transplantSessions)
    ? batch.metadata.transplantSessions
    : [];

  if (!activities.length && !transplantSessions.length) {
    return <p style={styles.copy}>No activity has been recorded for this batch yet.</p>;
  }

  return (
    <div style={styles.historyList}>
      {activities.map((activity) => (
        <article key={activity.id} style={styles.historyItem}>
          <div style={styles.historyHeader}>
            <div style={styles.historyTitleBlock}>
              <strong>{activity.title || formatActivityType(activity.actionType)}</strong>
              {activity.metadata?.completionStatus === "done" &&
              activity.metadata?.source === "plant-production-timeline" ? (
                <span style={styles.completedTaskPill}>
                  Completed timeline task
                </span>
              ) : null}
            </div>
            <div style={styles.historyTimeBlock}>
              <span>Task: {formatDateTime(activity.performedAt)}</span>
              {activity.enteredAt ? (
                <span>Recorded: {formatDateTime(activity.enteredAt)}</span>
              ) : null}
            </div>
          </div>
          {activity.metadata?.quantityTransplanted ? (
            <p style={styles.copy}>
              Quantity transplanted: {activity.metadata.quantityTransplanted}
            </p>
          ) : null}
          {activity.notes ? <p style={styles.copy}>{activity.notes}</p> : null}
        </article>
      ))}
    </div>
  );
}

function BatchTaskDoneForm({ draft, isSaving, onChange, onSave }) {
  return (
    <div style={styles.confirmForm}>
      <Field
        label="Date done"
        type="date"
        value={draft.performedDate}
        onChange={(value) => onChange("performedDate", value)}
      />
      <Field
        label="Time done"
        type="time"
        value={draft.performedTime}
        onChange={(value) => onChange("performedTime", value)}
      />
      <label style={styles.fieldWide}>
        <span>Notes</span>
        <textarea
          rows={3}
          value={draft.notes || ""}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Example: watered, but no germination activity was seen."
          style={styles.input}
        />
      </label>
      <button
        type="button"
        style={styles.standardPrimaryButton}
        disabled={isSaving}
        onClick={onSave}
      >
        Save done
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.statRow}>
      <dt style={styles.statLabel}>{label}</dt>
      <dd style={styles.statValue}>{value}</dd>
    </div>
  );
}

function getBatchPlantName(batch) {
  return batch.timelinePlant?.name || batch.cropName || batch.batchName || "Plant batch";
}

function getBatchSearchText(batch) {
  const purpose = batch.productionPurpose || {};
  const date = batch.productionAt ? new Date(batch.productionAt) : null;
  const rawDate = batch.productionAt ? String(batch.productionAt).slice(0, 10) : "";
  const readableDate =
    date && !Number.isNaN(date.getTime()) ? formatDate(batch.productionAt) : "";
  return normalizeSearchText(
    [
      getBatchPlantName(batch),
      batch.cropName,
      batch.cropKey,
      batch.batchName,
      batch.propagationType,
      formatStartMethod(batch.propagationType),
      purpose.label,
      purpose.key,
      purpose.shopKey,
      rawDate,
      readableDate,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function compareBatchesByStartDate(first, second) {
  const firstTime = new Date(first?.productionAt || "").getTime();
  const secondTime = new Date(second?.productionAt || "").getTime();
  const safeFirst = Number.isNaN(firstTime) ? Number.POSITIVE_INFINITY : firstTime;
  const safeSecond = Number.isNaN(secondTime) ? Number.POSITIVE_INFINITY : secondTime;
  if (safeFirst !== safeSecond) return safeFirst - safeSecond;
  return String(getBatchPlantName(first)).localeCompare(String(getBatchPlantName(second)));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTransplantSessionCount(batch) {
  const explicitSessions = Array.isArray(batch.metadata?.transplantSessions)
    ? batch.metadata.transplantSessions.length
    : 0;
  if (explicitSessions) return explicitSessions;
  if (batch.metadata?.lastTransplantSessionAt && Number(batch.quantityAtTransplant || 0) > 0) {
    return 1;
  }
  return 0;
}

function getDefaultActivityDraft() {
  return {
    actionType: "water",
    customActionTitle: "",
    performedDate: todayInputValue,
    performedTime: "",
    quantityTransplanted: "",
    notes: "",
    photoUrl: "",
  };
}

function formatActivityType(value) {
  return (
    actionOptions.find((option) => option.id === value)?.label ||
    String(value || "Activity").replace(/_/g, " ")
  );
}

function getDefaultDoneDraft() {
  return {
    performedDate: todayInputValue,
    performedTime: getCurrentTimeInputValue(),
    notes: "",
  };
}

function getUpcomingActionsForBatch(actions, batch) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const completedTaskKeys = getCompletedTimelineTaskKeys(batch);
  return [...actions]
    .filter((action) => new Date(action.actionDate).getTime() >= now.getTime())
    .filter((action) => !completedTaskKeys.has(getTimelineTaskKey(action)))
    .sort((first, second) => new Date(first.actionDate) - new Date(second.actionDate))
    .slice(0, 4);
}

function getCompletedTimelineTaskKeys(batch) {
  const keys = new Set();
  const activities = Array.isArray(batch?.activities) ? batch.activities : [];
  activities.forEach((activity) => {
    const metadata = activity?.metadata || {};
    if (
      metadata.source !== "plant-production-timeline" ||
      metadata.completionStatus !== "done"
    ) {
      return;
    }
    const taskKey = String(metadata.timelineTaskKey || "").trim();
    if (taskKey) keys.add(taskKey);
  });
  return keys;
}

function getTimelineTaskKey(action) {
  return String(action?.key || "").trim();
}

function formatStartMethod(value) {
  const option = startMethodOptions.find((item) => item.id === value);
  return option?.label || String(value || "Start method not recorded");
}

function canConfirmTimelineAction(action) {
  const target = new Date(action.actionDate);
  if (Number.isNaN(target.getTime())) return false;
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() <= today.getTime();
}

function getCurrentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

function formatStatus(value) {
  return String(value || "planned")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Jamaica",
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "Not dated";
  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeZone: "America/Jamaica",
  }).format(new Date(value));
}

function formatDueWord(value) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((target - today) / 86400000);

  if (dayDiff < 0) return "Overdue";
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return `In ${dayDiff} days`;
}

const styles = {
  stack: { display: "grid", gap: "16px" },
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
  title: { fontSize: "20px", margin: 0 },
  copy: { color: "#6b625c", lineHeight: 1.45, margin: "4px 0 0" },
  status: {
    background: "#fff7dc",
    border: "1px solid rgba(130, 95, 20, 0.18)",
    borderRadius: "6px",
    margin: 0,
    padding: "10px 12px",
  },
  formGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  field: { display: "grid", gap: "6px", fontSize: "13px", fontWeight: 800 },
  fieldWide: {
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 800,
    gridColumn: "1 / -1",
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    padding: "9px 10px",
    width: "100%",
  },
  primaryButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    justifySelf: "start",
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  secondaryButton: {
    background: "#fff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 800,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  dangerButton: {
    background: "#fff",
    border: "1px solid rgba(160, 23, 23, 0.28)",
    borderRadius: "6px",
    color: "#a01717",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  group: { display: "grid", gap: "10px" },
  groupTitle: { borderBottom: "1px solid rgba(32, 28, 29, 0.12)", margin: 0, paddingBottom: "8px" },
  grid: { display: "grid", gap: "12px" },
  card: {
    background: "#fffdfa",
    border: "1px solid rgba(91, 63, 35, 0.18)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "14px",
  },
  batchSummary: {
    alignItems: "start",
    cursor: "pointer",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    listStyle: "none",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "10px",
    justifyContent: "space-between",
  },
  cardTitle: {
    display: "block",
    fontSize: "18px",
    lineHeight: 1.2,
  },
  summaryMeta: {
    color: "#6b625c",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "0.9rem",
    gap: "6px 10px",
    lineHeight: 1.35,
    marginTop: "4px",
  },
  statusPill: {
    background: "#f1eadf",
    border: "1px solid rgba(91, 63, 35, 0.16)",
    borderRadius: "999px",
    color: "#4d463f",
    fontSize: "0.78rem",
    fontWeight: 900,
    padding: "4px 8px",
  },
  badge: {
    background: "#2f6f46",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 900,
    padding: "6px 10px",
  },
  stats: {
    display: "grid",
    gap: "0",
    margin: 0,
  },
  statRow: {
    alignItems: "baseline",
    borderTop: "1px solid rgba(91, 63, 35, 0.12)",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(110px, 0.42fr) 1fr",
    padding: "9px 0",
  },
  statLabel: {
    color: "#5f554d",
    fontWeight: 900,
  },
  statValue: {
    margin: 0,
  },
  warningPanel: {
    background: "#fff7dc",
    border: "1px solid rgba(130, 95, 20, 0.22)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    padding: "12px",
  },
  missingList: {
    margin: 0,
    paddingLeft: "20px",
  },
  warningText: {
    color: "#a01717",
    fontWeight: 900,
    margin: "6px 0 0",
  },
  inlineSection: {
    borderTop: "1px solid rgba(91, 63, 35, 0.14)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  inlineSummary: {
    color: "#2f6f46",
    cursor: "pointer",
    fontWeight: 900,
  },
  timelineList: {
    display: "grid",
    gap: "8px",
  },
  historyList: {
    display: "grid",
    gap: "10px",
  },
  historyItem: {
    borderTop: "1px solid rgba(91, 63, 35, 0.12)",
    display: "grid",
    gap: "6px",
    paddingTop: "10px",
  },
  historyHeader: {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
  },
  historyTitleBlock: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  historyTimeBlock: {
    color: "#5f554d",
    display: "grid",
    fontSize: "13px",
    gap: "2px",
    justifyItems: "end",
    lineHeight: 1.25,
  },
  completedTaskPill: {
    background: "#e6f4ec",
    border: "1px solid rgba(47, 111, 70, 0.22)",
    borderRadius: "999px",
    color: "#2f6f46",
    fontSize: "12px",
    fontWeight: 900,
    padding: "3px 8px",
  },
  timelineItem: {
    borderTop: "1px solid rgba(91, 63, 35, 0.12)",
    paddingTop: "8px",
  },
  timelineSummary: {
    alignItems: "start",
    color: "#201c1d",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "minmax(92px, 0.28fr) 1fr",
  },
  taskWhenBlock: {
    display: "grid",
    gap: "3px",
  },
  taskNameBlock: {
    display: "grid",
    gap: "3px",
  },
  taskDueText: {
    color: "#2f6f46",
    fontWeight: 900,
  },
  taskDateText: {
    color: "#6b625c",
    fontSize: "0.9rem",
  },
  taskActionText: {
    color: "#201c1d",
    fontWeight: 900,
  },
  taskTreatmentText: {
    color: "#6b625c",
    lineHeight: 1.35,
  },
  taskBody: {
    display: "grid",
    gap: "8px",
    paddingTop: "8px",
  },
  taskActions: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  confirmPanel: {
    display: "grid",
    gap: "8px",
  },
  confirmSummary: {
    background: "#2f6f3e",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  confirmForm: {
    border: "1px solid rgba(91, 63, 35, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "10px",
  },
  standardPrimaryButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  disabledActionButton: {
    background: "#f1eadf",
    border: "1px solid rgba(91, 63, 35, 0.18)",
    borderRadius: "6px",
    color: "#8a8177",
    cursor: "not-allowed",
    fontWeight: 900,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  notDonePanel: {
    display: "grid",
    gap: "8px",
  },
  notDoneSummary: {
    background: "#fff",
    border: "1px solid rgba(160, 23, 23, 0.28)",
    borderRadius: "6px",
    color: "#a01717",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: "150px",
    padding: "10px 14px",
    textAlign: "center",
  },
  editPanel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  actions: { display: "flex", flexWrap: "wrap", gap: "8px" },
};
