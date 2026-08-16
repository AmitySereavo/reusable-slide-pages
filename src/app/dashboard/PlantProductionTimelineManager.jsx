"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const propagationMethods = [
  ["seed", "Seed"],
  ["cutting", "Cutting"],
  ["air-layer", "Air layer"],
  ["division", "Division"],
  ["sucker", "Sucker"],
  ["grafting", "Grafting"],
  ["other", "Other"],
];

const actionTypes = [
  "Water",
  "Mist",
  "Sow",
  "Set cutting",
  "Feed",
  "Pest control",
  "Disease control",
  "Prune",
  "Pinch",
  "Pot-up",
  "Transplant",
  "Hardening",
  "Move to sun",
  "Move to shade",
  "Install support",
  "Pest inspection",
  "Disease inspection",
  "Harvest ready check",
  "Propagation-material check",
  "Other",
];

const feedTreatments = [
  "Seedling Booster",
  "Rooting Solution",
  "20-20-20 Everyday Feed",
  "MacroGro Complete",
  "Other",
];

const pestControlTreatments = [
  "Soap water",
  "Alcohol",
  "Neem",
  "Manual removal",
  "Other",
];

const emptyAction = {
  actionType: "Water",
  treatment: "",
  instruction: "",
  quantity: "",
  strength: "",
  applicationMethod: "",
  stageCheckRequired: false,
  shopAction: "",
  notes: "",
};

const optionalTextButtonStyle = {
  background: "#fff",
  border: "1px solid rgba(32, 28, 29, 0.18)",
  borderRadius: "6px",
  color: "#201c1d",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 900,
  padding: "9px 10px",
};

export default function PlantProductionTimelineManager() {
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [plantKey, setPlantKey] = useState(searchParams.get("plantKey") || "");
  const [method, setMethod] = useState(searchParams.get("method") || "seed");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [newDrafts, setNewDrafts] = useState({});
  const [addingDays, setAddingDays] = useState({});
  const [hideInactiveDays, setHideInactiveDays] = useState(false);
  const [replaceExistingImport, setReplaceExistingImport] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStatus("");

      const params = new URLSearchParams();
      if (plantKey) params.set("plantKey", plantKey);
      params.set("method", method);

      const response = await fetch(`/api/dashboard/plant-production-timeline?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setStatus(data.error || "Could not load plant production timelines.");
        setLoading(false);
        return;
      }

      setCatalog(data.catalog || []);
      setRecipe(data.recipe || null);
      if (!plantKey && data.recipe?.plantKey) {
        setPlantKey(data.recipe.plantKey);
      }
      setDrafts(
        Object.fromEntries(
          (data.recipe?.actions || []).map((action) => [action.id, normalizeAction(action)])
        )
      );
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [plantKey, method]);

  const selectedPlant = useMemo(
    () => catalog.find((plant) => plant.key === plantKey) || catalog[0],
    [catalog, plantKey]
  );
  const selectedMethodLabel =
    propagationMethods.find(([value]) => value === method)?.[1] || method;

  const actionsByDay = useMemo(() => {
    const grouped = new Map();
    for (const action of recipe?.actions || []) {
      const day = Number(action.dayNumber || 1);
      grouped.set(day, [...(grouped.get(day) || []), action]);
    }
    return grouped;
  }, [recipe]);

  async function reload(message) {
    const params = new URLSearchParams();
    if (plantKey) params.set("plantKey", plantKey);
    params.set("method", method);

    const response = await fetch(`/api/dashboard/plant-production-timeline?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok) {
      setCatalog(data.catalog || []);
      setRecipe(data.recipe || null);
      setDrafts(
        Object.fromEntries(
          (data.recipe?.actions || []).map((action) => [
            action.id,
            normalizeAction(action),
          ])
        )
      );
      setStatus(message || "Saved.");
    } else {
      setStatus(data.error || "Could not refresh production timeline.");
    }
  }

  async function saveAction(dayNumber, actionId) {
    if (!recipe?.id) return;

    const draft = actionId ? drafts[actionId] : newDrafts[dayNumber] || emptyAction;

    const response = await fetch("/api/dashboard/plant-production-timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-action",
        id: actionId,
        recipeId: recipe.id,
        dayNumber,
        ...draft,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.error || "Could not save action.");
      return;
    }

    if (!actionId) {
      setNewDrafts((prev) => ({ ...prev, [dayNumber]: { ...emptyAction } }));
      setAddingDays((prev) => ({ ...prev, [dayNumber]: false }));
    }
    await reload(`Day ${dayNumber} action saved.`);
  }

  async function deleteAction(actionId) {
    const response = await fetch("/api/dashboard/plant-production-timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-action", actionId }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.error || "Could not delete action.");
      return;
    }

    await reload("Action deleted.");
  }

  async function importDraftRecipes() {
    setStatus("Importing draft plant production timelines...");
    const response = await fetch("/api/dashboard/plant-production-timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import-draft-recipes",
        replaceExisting: replaceExistingImport,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.error || "Draft production timelines could not be imported.");
      return;
    }

    await reload(
      `Imported ${data.importedRecipes || 0} timeline(s), skipped ${data.skippedRecipes || 0}, and created ${data.importedActions || 0} action(s).`
    );
  }

  const cycleLength = Math.max(1, Number(recipe?.cycleLengthDays || 90));
  const recipeDays = Array.from({ length: cycleLength }, (_, index) => index + 1);
  const visibleRecipeDays = hideInactiveDays
    ? recipeDays.filter((day) => (actionsByDay.get(day) || []).length > 0)
    : recipeDays;

  useEffect(() => {
    if (!hideInactiveDays || visibleRecipeDays.includes(expandedDay)) return;
    setExpandedDay(visibleRecipeDays[0] || null);
  }, [expandedDay, hideInactiveDays, visibleRecipeDays]);

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Plant Production Timeline</h2>
          <p style={styles.copy}>
            Build reusable day-by-day production timelines. Batches can later use
            these generic timelines to create their own reminders without moving
            unrelated actions.
          </p>
        </div>
      </div>

      <div style={styles.controls}>
        <label style={styles.label}>
          Plant type
          <select
            value={plantKey || selectedPlant?.key || ""}
            onChange={(event) => {
              setPlantKey(event.target.value);
              setExpandedDay(1);
            }}
            style={styles.select}
          >
            {catalog.map((plant) => (
              <option key={plant.key} value={plant.key}>
                {plant.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Propagation method
          <select
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              setExpandedDay(1);
            }}
            style={styles.select}
          >
            {propagationMethods.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section style={styles.importPanel}>
        <div>
          <strong>Draft PDF timelines</strong>
          <p style={styles.copy}>
            Import the propagation-to-maturity draft into the Plant Production
            Timeline database. Existing filled timelines are skipped unless replace is
            selected.
          </p>
        </div>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={replaceExistingImport}
            onChange={(event) => setReplaceExistingImport(event.target.checked)}
          />
          Replace existing timeline actions
        </label>
        <button type="button" onClick={importDraftRecipes} style={styles.primaryButton}>
          Import draft timelines
        </button>
      </section>

      {status ? <p style={styles.status}>{status}</p> : null}

      {loading ? (
        <p style={styles.copy}>Loading plant production timeline...</p>
      ) : recipe ? (
        <>
          <RecipeProfileSummary recipe={recipe} />

          <div style={styles.explainer}>
            <strong>How this works</strong>
            <p>
              Days with no actions stay quiet. If one action is delayed, reschedule
              that action later when batch-level reminders are added; the other
              timeline days stay in place. Keep timeline wording reusable: write
              "check transplant readiness" instead of naming a specific batch.
            </p>
          </div>

          <div style={styles.stickyTimelineContext}>
            <span style={styles.contextEyebrow}>Current production timeline</span>
            <strong style={styles.contextTitle}>{selectedPlant?.name || recipe.plantName}</strong>
            <span style={styles.contextMeta}>
              {selectedMethodLabel} propagation
            </span>
          </div>

          <div style={styles.dayLegend}>
            <span style={getLegendItemStyle("#b42318")}>
              Transplant / pot-up
            </span>
            <span style={getLegendItemStyle("#d7a700")}>
              Feeding / plant food
            </span>
            <span style={getLegendItemStyle("#30693d")}>
              Propagation
            </span>
            <span style={getLegendItemStyle("#2f80bd")}>
              Watering
            </span>
          </div>

          <div style={styles.timelineToolbar}>
            <button
              type="button"
              onClick={() => setHideInactiveDays((value) => !value)}
              style={
                hideInactiveDays
                  ? styles.activeToggleButton
                  : styles.secondaryButton
              }
            >
              {hideInactiveDays ? "Show all days" : "Hide non-activated days"}
            </button>
            {hideInactiveDays ? (
              <span style={styles.muted}>
                Showing {visibleRecipeDays.length} active day(s).
              </span>
            ) : null}
          </div>

          <RecipeDayList
            title="90-day production calendar"
            days={visibleRecipeDays}
            actionsByDay={actionsByDay}
            expandedDay={expandedDay}
            setExpandedDay={setExpandedDay}
            drafts={drafts}
            setDrafts={setDrafts}
            newDrafts={newDrafts}
            setNewDrafts={setNewDrafts}
            addingDays={addingDays}
            setAddingDays={setAddingDays}
            saveAction={saveAction}
            deleteAction={deleteAction}
          />
        </>
      ) : (
        <p style={styles.copy}>
          No plant types were found in the production catalog yet. Import the
          draft PDF timelines or add plant types to the production catalog.
        </p>
      )}
    </section>
  );
}

function RecipeProfileSummary({ recipe }) {
  const profile = recipe?.profileMetadata || {};
  const rows = [
    ["Scientific name", profile.scientificName],
    ["Category", profile.category],
    ["Common names", profile.commonNames],
    ["Multiplier", profile.multiplierText],
    ["Germination/rooting", profile.germinationRooting],
    ["Planning estimate", profile.planningEstimate],
    ["Pot-up/transplant", profile.potUpTransplant],
    ["Garden-ready", profile.gardenReady],
    ["Near harvest/mature", profile.nearHarvestMature],
    ["Support", profile.support],
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <section style={styles.profilePanel}>
      <div style={styles.cardHeader}>
        <strong>Plant profile draft</strong>
        {recipe.sourceLabel ? <span>{recipe.sourceLabel}</span> : null}
      </div>
      <div style={styles.profileGrid}>
        {rows.map(([label, value]) => (
          <div key={label} style={styles.profileCell}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {profile.packageWarnings || profile.commonProblems || profile.notes ? (
        <div style={styles.warningGrid}>
          {profile.packageWarnings ? (
            <p>
              <strong>Warning:</strong> {profile.packageWarnings}
            </p>
          ) : null}
          {profile.commonProblems ? (
            <p>
              <strong>Common problems:</strong> {profile.commonProblems}
            </p>
          ) : null}
          {profile.notes ? (
            <p>
              <strong>Notes:</strong> {profile.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RecipeDayList({
  title,
  description,
  days,
  actionsByDay,
  expandedDay,
  setExpandedDay,
  drafts,
  setDrafts,
  newDrafts,
  setNewDrafts,
  addingDays,
  setAddingDays,
  saveAction,
  deleteAction,
}) {
  return (
    <section style={styles.daySection}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {description ? <p style={styles.copy}>{description}</p> : null}
      <div style={styles.dayGrid}>
        {days.map((day) => {
          const actions = actionsByDay.get(day) || [];
          const isOpen = expandedDay === day;
          const newDraft = newDrafts[day] || emptyAction;
          const isAddingAction = Boolean(addingDays[day]);

          return (
            <article key={day} style={getDayCardStyle(actions)}>
              <button
                type="button"
                onClick={() => setExpandedDay(isOpen ? null : day)}
                style={{
                  ...styles.dayHeader,
                  ...getDayHeaderStyle(actions, isOpen),
                }}
              >
                <span>Day {day}</span>
                <span style={styles.dayMeta}>
                  {actions.length ? `${actions.length} action(s)` : "No actions"}
                </span>
              </button>

              {isOpen ? (
                <div style={styles.dayBody}>
                  {actions.length ? (
                    actions.map((action) => (
                      <ActionEditor
                        key={action.id}
                        action={drafts[action.id] || normalizeAction(action)}
                        onChange={(next) =>
                          setDrafts((prev) => ({ ...prev, [action.id]: next }))
                        }
                        onSave={() => saveAction(day, action.id)}
                        onDelete={() => deleteAction(action.id)}
                      />
                    ))
                  ) : (
                    <p style={styles.muted}>No notification will be created for this day.</p>
                  )}

                  {isAddingAction ? (
                    <div style={styles.addAction}>
                      <strong>New action for Day {day}</strong>
                      <ActionFields
                        action={newDraft}
                        onChange={(next) =>
                          setNewDrafts((prev) => ({ ...prev, [day]: next }))
                        }
                      />
                      <div style={styles.actionButtons}>
                        <button
                          type="button"
                          onClick={() => saveAction(day)}
                          style={styles.primaryButton}
                        >
                          Save new action
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAddingDays((prev) => ({ ...prev, [day]: false }))
                          }
                          style={styles.secondaryButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setAddingDays((prev) => ({ ...prev, [day]: true }))
                      }
                      style={styles.secondaryButton}
                    >
                      Add action
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ActionEditor({ action, onChange, onSave, onDelete }) {
  return (
    <div style={styles.actionCard}>
      <ActionFields action={action} onChange={onChange} />
      <div style={styles.actionButtons}>
        <button type="button" onClick={onSave} style={styles.primaryButton}>
          Save action
        </button>
        <button type="button" onClick={onDelete} style={styles.dangerButton}>
          Delete action
        </button>
      </div>
    </div>
  );
}

function ActionFields({ action, onChange }) {
  const update = (key, value) => onChange({ ...action, [key]: value });
  const fieldVisibility = getActionFieldVisibility(action.actionType);
  const treatmentOptions = getTreatmentOptions(action.actionType);

  function updateActionType(value) {
    const visibility = getActionFieldVisibility(value);
    const nextTreatmentOptions = getTreatmentOptions(value);
    onChange({
      ...action,
      actionType: value,
      treatment: nextTreatmentOptions.length ? nextTreatmentOptions[0] : "",
      quantity: visibility.quantity ? action.quantity : "",
      strength: visibility.strength ? action.strength : "",
      applicationMethod: visibility.applicationMethod
        ? action.applicationMethod
        : "",
      shopAction: "",
      stageCheckRequired: visibility.stageCheck ? action.stageCheckRequired : false,
    });
  }

  return (
    <div style={styles.formGrid}>
      <label style={styles.label}>
        Action type
        <select
          value={action.actionType}
          onChange={(event) => updateActionType(event.target.value)}
          style={styles.select}
        >
          {actionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
          {!actionTypes.includes(action.actionType) ? (
            <option value={action.actionType}>{action.actionType}</option>
          ) : null}
        </select>
      </label>
      {fieldVisibility.treatment ? (
        <label style={styles.label}>
          Treatment / product
          <select
            value={action.treatment || treatmentOptions[0] || ""}
            onChange={(event) => update("treatment", event.target.value)}
            style={styles.select}
          >
            {treatmentOptions.map((treatment) => (
              <option key={treatment} value={treatment}>
                {treatment}
              </option>
            ))}
            {action.treatment && !treatmentOptions.includes(action.treatment) ? (
              <option value={action.treatment}>{action.treatment}</option>
            ) : null}
          </select>
        </label>
      ) : null}
      {fieldVisibility.quantity ? (
        <label style={styles.label}>
          Quantity
          <input
            value={action.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            placeholder={getActionPlaceholder(action.actionType, "quantity")}
            style={styles.input}
          />
        </label>
      ) : null}
      {fieldVisibility.strength ? (
        <label style={styles.label}>
          Strength
          <input
            value={action.strength}
            onChange={(event) => update("strength", event.target.value)}
            placeholder="1/4 strength"
            style={styles.input}
          />
        </label>
      ) : null}
      {fieldVisibility.applicationMethod ? (
        <label style={styles.label}>
          Application method
          <input
            value={action.applicationMethod}
            onChange={(event) => update("applicationMethod", event.target.value)}
            placeholder={getActionPlaceholder(action.actionType, "applicationMethod")}
            style={styles.input}
          />
        </label>
      ) : null}
      <div style={{ ...styles.label, gridColumn: "1 / -1" }}>
        {action.instruction ? (
          <>
            <span>Instruction</span>
            <textarea
              value={action.instruction}
              onChange={(event) => update("instruction", event.target.value)}
              placeholder="Check transplant readiness."
              rows={3}
              style={styles.textarea}
            />
            <button
              type="button"
              onClick={() => update("instruction", "")}
              style={styles.smallTextButton}
            >
              Remove instruction
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => update("instruction", "Check readiness.")}
            style={optionalTextButtonStyle}
          >
            Add instruction
          </button>
        )}
      </div>
      <div style={{ ...styles.label, gridColumn: "1 / -1" }}>
        {action.notes ? (
          <>
            <span>Notes</span>
            <textarea
              value={action.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={2}
              style={styles.textarea}
            />
            <button
              type="button"
              onClick={() => update("notes", "")}
              style={styles.smallTextButton}
            >
              Remove note
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => update("notes", " ")}
            style={optionalTextButtonStyle}
          >
            Add note
          </button>
        )}
      </div>
      {fieldVisibility.stageCheck ? (
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={Boolean(action.stageCheckRequired)}
            onChange={(event) =>
              update("stageCheckRequired", event.target.checked)
            }
          />
          Stage check required
        </label>
      ) : null}
    </div>
  );
}

function normalizeAction(action) {
  const normalized = normalizeActionTypeAndTreatment(action);
  return {
    actionType: normalized.actionType,
    treatment: normalized.treatment,
    instruction: action?.instruction || "",
    quantity: action?.quantity || "",
    strength: action?.strength || "",
    applicationMethod: action?.applicationMethod || "",
    stageCheckRequired: Boolean(action?.stageCheckRequired),
    shopAction: "",
    notes: action?.notes || "",
  };
}

function normalizeActionTypeAndTreatment(action) {
  const rawType = String(action?.actionType || "Other").trim();
  const lowerType = rawType.toLowerCase();
  const rawTreatment = String(action?.treatment || "").trim();
  const instruction = String(action?.instruction || "");
  const lowerInstruction = instruction.toLowerCase();

  if (lowerType === "watering check") return { actionType: "Water", treatment: "" };

  if (
    lowerType.includes("seedling booster") ||
    lowerInstruction.includes("seedling booster")
  ) {
    return { actionType: "Feed", treatment: rawTreatment || "Seedling Booster" };
  }

  if (
    lowerType.includes("rooting solution") ||
    lowerInstruction.includes("rooting solution")
  ) {
    return { actionType: "Feed", treatment: rawTreatment || "Rooting Solution" };
  }

  if (
    lowerType.includes("plant food") ||
    lowerInstruction.includes("macrogro") ||
    lowerInstruction.includes("macro grow") ||
    lowerInstruction.includes("20-20")
  ) {
    return {
      actionType: "Feed",
      treatment: rawTreatment || (lowerInstruction.includes("20-20") ? "20-20-20 Everyday Feed" : "MacroGro Complete"),
    };
  }

  if (lowerType.includes("pest")) {
    return { actionType: "Pest inspection", treatment: rawTreatment };
  }

  if (lowerType.includes("disease")) {
    return { actionType: "Disease inspection", treatment: rawTreatment };
  }

  if (lowerType.includes("shop entry") || lowerType.includes("shop exit")) {
    return { actionType: "Harvest ready check", treatment: rawTreatment };
  }

  if (lowerType === "harvest check") {
    return { actionType: "Harvest ready check", treatment: rawTreatment };
  }

  return { actionType: rawType || "Other", treatment: rawTreatment };
}

function getDayActionTone(actions) {
  const types = actions.map((action) => String(action.actionType || "").toLowerCase());

  if (types.some((type) => type.includes("transplant") || type.includes("pot-up"))) {
    return "transplant";
  }
  if (
    types.some(
      (type) =>
        type.includes("feed") ||
        type.includes("food") ||
        type.includes("booster") ||
        type.includes("rooting")
    )
  ) {
    return "feeding";
  }
  if (types.some((type) => type.includes("sow") || type.includes("cutting"))) {
    return "propagation";
  }
  if (types.some((type) => type.includes("water") || type.includes("mist"))) {
    return "watering";
  }
  if (types.some((type) => type.includes("pest") || type.includes("disease"))) {
    return "inspection";
  }
  if (types.some((type) => type.includes("shop") || type.includes("harvest"))) {
    return "shop";
  }

  return actions.length ? "active" : "empty";
}

function getActionFieldVisibility(actionType) {
  const type = String(actionType || "").toLowerCase();
  const isWater = type.includes("water") || type.includes("mist");
  const isFeeding =
    type.includes("feed") ||
    type.includes("food") ||
    type.includes("booster") ||
    type.includes("rooting");
  const isPestControl = type.includes("pest control") || type.includes("disease control");
  const isPropagation = type.includes("sow") || type.includes("cutting");
  const isMove =
    type.includes("transplant") ||
    type.includes("pot-up") ||
    type.includes("hardening") ||
    type.includes("move") ||
    type.includes("support");
  const isCheck =
    type.includes("check") ||
    type.includes("pest") ||
    type.includes("disease") ||
    type.includes("harvest");
  return {
    treatment: isFeeding || isPestControl,
    quantity: isWater || isFeeding || isPropagation || isMove || isPestControl,
    strength: isFeeding,
    applicationMethod: isWater || isFeeding || isPropagation || isMove || isPestControl,
    stageCheck: isCheck || isMove,
  };
}

function getTreatmentOptions(actionType) {
  const type = String(actionType || "").toLowerCase();

  if (
    type.includes("feed") ||
    type.includes("food") ||
    type.includes("booster") ||
    type.includes("rooting")
  ) {
    return feedTreatments;
  }

  if (type.includes("pest control") || type.includes("disease control")) {
    return pestControlTreatments;
  }

  return [];
}

function getActionPlaceholder(actionType, field) {
  const type = String(actionType || "").toLowerCase();

  if (field === "quantity") {
    if (type.includes("water") || type.includes("mist")) return "10 mL per plant";
    if (type.includes("pest control") || type.includes("disease control")) {
      return "Amount used";
    }
    if (type.includes("sow")) return "10 seeds per mature plant";
    if (type.includes("cutting")) return "5 cuttings per mature plant";
    if (type.includes("transplant") || type.includes("pot-up")) {
      return "Number of plants";
    }
    return "Quantity";
  }

  if (field === "applicationMethod") {
    if (type.includes("water") || type.includes("mist")) {
      return "Foliar spray, root-zone watering, bottom watering";
    }
    if (
      type.includes("feed") ||
      type.includes("food") ||
      type.includes("booster") ||
      type.includes("rooting")
    ) {
      return "Foliar feed, root-zone drench, soil drench";
    }
    if (type.includes("sow")) return "Seed tray, seed roll, direct sow";
    if (type.includes("cutting")) return "Tray, water propagation, potting medium";
    return "Application method";
  }

  return "";
}

function getDayCardStyle(actions) {
  const tone = getDayActionTone(actions);
  const toneStyles = {
    transplant: {
      background: "#fff1f1",
      border: "1px solid rgba(166, 24, 24, 0.42)",
      borderLeft: "4px solid #b42318",
    },
    feeding: {
      background: "#fff8d8",
      border: "1px solid rgba(154, 117, 0, 0.4)",
      borderLeft: "4px solid #d7a700",
    },
    propagation: {
      background: "#eef8ef",
      border: "1px solid rgba(48, 105, 61, 0.34)",
      borderLeft: "4px solid #30693d",
    },
    watering: {
      background: "#eef7ff",
      border: "1px solid rgba(43, 97, 154, 0.32)",
      borderLeft: "4px solid #2f80bd",
    },
    inspection: {
      background: "#fff4e6",
      border: "1px solid rgba(168, 94, 24, 0.34)",
      borderLeft: "4px solid #b85c00",
    },
    shop: {
      background: "#f1efff",
      border: "1px solid rgba(92, 72, 170, 0.32)",
      borderLeft: "4px solid #6750a4",
    },
    active: {
      background: "#f7f4ef",
      border: "1px solid rgba(32, 28, 29, 0.18)",
      borderLeft: "4px solid #6b625c",
    },
    empty: {},
  };

  return {
    ...styles.dayCard,
    ...(toneStyles[tone] || {}),
  };
}

function getDayHeaderStyle(actions, isOpen) {
  if (!actions.length) return { background: isOpen ? "#f7f4ef" : "#fffdfa" };

  const tone = getDayActionTone(actions);
  const backgrounds = {
    transplant: isOpen ? "#ffd9d9" : "#fff1f1",
    feeding: isOpen ? "#ffef99" : "#fff8d8",
    propagation: isOpen ? "#dceddf" : "#eef8ef",
    watering: isOpen ? "#dcefff" : "#eef7ff",
    inspection: isOpen ? "#ffe0bd" : "#fff4e6",
    shop: isOpen ? "#e2ddff" : "#f1efff",
    active: isOpen ? "#ebe5dd" : "#f7f4ef",
  };

  return { background: backgrounds[tone] || "#fffdfa" };
}

function getLegendItemStyle(color) {
  return {
    ...styles.legendItem,
    border: `1px solid ${color}`,
    borderLeft: `4px solid ${color}`,
  };
}

const styles = {
  shell: {
    display: "grid",
    gap: "16px",
  },
  header: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    padding: "18px",
  },
  title: {
    fontSize: "22px",
    margin: 0,
  },
  copy: {
    color: "#6b625c",
    lineHeight: 1.5,
    margin: "8px 0 0",
  },
  controls: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  importPanel: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    padding: "14px",
  },
  explainer: {
    background: "#eef6f0",
    border: "1px solid rgba(48, 105, 61, 0.18)",
    borderRadius: "8px",
    padding: "14px",
  },
  profilePanel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "14px",
  },
  cardHeader: {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
  },
  profileGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  profileCell: {
    background: "#f7f4ef",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "6px",
    display: "grid",
    gap: "4px",
    padding: "10px",
  },
  warningGrid: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    color: "#4d463f",
    display: "grid",
    gap: "8px",
    lineHeight: 1.45,
    paddingTop: "10px",
  },
  label: {
    color: "#201c1d",
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 800,
  },
  select: {
    background: "#fff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    color: "#201c1d",
    font: "inherit",
    padding: "10px 12px",
  },
  input: {
    background: "#fff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    color: "#201c1d",
    font: "inherit",
    padding: "10px 12px",
  },
  textarea: {
    background: "#fff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    color: "#201c1d",
    font: "inherit",
    padding: "10px 12px",
    resize: "vertical",
  },
  status: {
    background: "#fff7dc",
    border: "1px solid rgba(130, 95, 20, 0.18)",
    borderRadius: "6px",
    margin: 0,
    padding: "10px 12px",
  },
  daySection: {
    display: "grid",
    gap: "10px",
  },
  dayLegend: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  stickyTimelineContext: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderLeft: "4px solid #30693d",
    borderRadius: "8px",
    display: "grid",
    gap: "3px",
    padding: "10px 12px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  contextEyebrow: {
    color: "#6b625c",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
  },
  contextTitle: {
    color: "#201c1d",
    fontSize: "16px",
    lineHeight: 1.2,
  },
  contextMeta: {
    color: "#6b625c",
    fontSize: "13px",
    fontWeight: 800,
  },
  timelineToolbar: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    padding: "10px 12px",
  },
  legendItem: {
    background: "#fffdfa",
    borderRadius: "999px",
    color: "#201c1d",
    fontSize: "12px",
    fontWeight: 800,
    padding: "7px 10px",
  },
  sectionTitle: {
    fontSize: "18px",
    margin: "8px 0 0",
  },
  dayGrid: {
    display: "grid",
    gap: "8px",
  },
  dayCard: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  dayHeader: {
    alignItems: "center",
    border: 0,
    borderBottom: "1px solid rgba(32, 28, 29, 0.08)",
    color: "#201c1d",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontWeight: 900,
    justifyContent: "space-between",
    padding: "12px 14px",
    textAlign: "left",
    width: "100%",
  },
  dayMeta: {
    color: "#6b625c",
    fontSize: "12px",
    fontWeight: 800,
  },
  dayBody: {
    display: "grid",
    gap: "12px",
    padding: "14px",
  },
  muted: {
    color: "#6b625c",
    margin: 0,
  },
  actionCard: {
    background: "#f7f4ef",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  addAction: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  formGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  checkboxLabel: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontWeight: 800,
  },
  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  primaryButton: {
    background: "#30693d",
    border: "1px solid #30693d",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "10px 12px",
  },
  secondaryButton: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    color: "#201c1d",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "10px 12px",
  },
  activeToggleButton: {
    background: "#201c1d",
    border: "1px solid #201c1d",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "10px 12px",
  },
  smallTextButton: {
    background: "transparent",
    border: 0,
    color: "#6b251f",
    cursor: "pointer",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 900,
    justifySelf: "start",
    padding: "2px 0",
    textDecoration: "underline",
  },
  dangerButton: {
    background: "#fff",
    border: "1px solid rgba(160, 23, 23, 0.3)",
    borderRadius: "6px",
    color: "#a01717",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "10px 12px",
  },
};
