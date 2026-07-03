"use client";

import { useEffect, useMemo, useState } from "react";

const emptyCondition = {
  conditionType: "always",
  operator: "is",
  referenceKey: "",
  value: "",
  lookbackAmount: 7,
  lookbackUnit: "days",
};

const emptyStep = {
  stepKey: "welcome",
  name: "Welcome email",
  subject: "Welcome",
  previewText: "",
  fromName: "",
  fromEmail: "",
  replyToEmail: "",
  bodyText: "Thanks for signing up. We are glad you are here.",
  ctaLabel: "",
  ctaUrl: "",
  sendTimingMode: "immediate",
  delayAmount: 0,
  delayUnit: "minutes",
  sendAtLocalTime: "",
  timezoneMode: "user",
  activityDelayAmount: 1,
  activityDelayUnit: "days",
  skipIfAlreadySent: true,
  requirePreviousStep: false,
  active: true,
  conditions: [{ ...emptyCondition }],
};

const emptyForm = {
  sequenceKey: "new-user-welcome",
  name: "New user welcome sequence",
  description: "",
  active: false,
  audience: "all_users",
  triggerEvent: "signup",
  defaultTimezone: "user",
  sendWindowStart: "09:00",
  sendWindowEnd: "",
  consentRequired: true,
  unsubscribeGroup: "marketing",
  metadata: {},
  steps: [{ ...emptyStep }],
};

const conditionLabels = {
  always: "Always send",
  opened_email: "Opened a specific email",
  did_not_open_email: "Did not open a specific email",
  clicked_link: "Clicked a specific link",
  did_not_click_link: "Did not click a specific link",
  purchased_item: "Purchased an item",
  has_not_purchased_item: "Has not purchased an item",
  completed_slide: "Completed a slide",
  answered_question: "Answered a question",
  has_tag: "Has tag",
  does_not_have_tag: "Does not have tag",
};

export default function EmailSequenceManager() {
  const [sequences, setSequences] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingDue, setIsSendingDue] = useState(false);

  useEffect(() => {
    loadSequences();
  }, []);

  const activeSteps = useMemo(
    () => form.steps.filter((step) => step.active !== false),
    [form.steps]
  );

  async function loadSequences() {
    setStatus("Loading email sequences...");

    const response = await fetch("/api/dashboard/email-sequences");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      setStatus(payload?.error || "Email sequences could not be loaded.");
      return;
    }

    setSequences(payload.sequences || []);
    setStatus("");
  }

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateStep(index, key, value) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, currentIndex) =>
        currentIndex === index ? { ...step, [key]: value } : step
      ),
    }));
  }

  function updateCondition(stepIndex, conditionIndex, key, value) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, currentStepIndex) =>
        currentStepIndex === stepIndex
          ? {
              ...step,
              conditions: step.conditions.map((condition, currentConditionIndex) =>
                currentConditionIndex === conditionIndex
                  ? { ...condition, [key]: value }
                  : condition
              ),
            }
          : step
      ),
    }));
  }

  function addStep() {
    const nextNumber = form.steps.length + 1;

    setForm((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          ...emptyStep,
          stepKey: `email-${nextNumber}`,
          name: `Email ${nextNumber}`,
          sendTimingMode: "delay",
          delayAmount: 1,
          delayUnit: "days",
          requirePreviousStep: true,
          conditions: [{ ...emptyCondition }],
        },
      ],
    }));
  }

  function removeStep(index) {
    setForm((current) => ({
      ...current,
      steps: current.steps.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function addCondition(stepIndex) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, currentIndex) =>
        currentIndex === stepIndex
          ? {
              ...step,
              conditions: [...step.conditions, { ...emptyCondition }],
            }
          : step
      ),
    }));
  }

  function removeCondition(stepIndex, conditionIndex) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, currentStepIndex) =>
        currentStepIndex === stepIndex
          ? {
              ...step,
              conditions: step.conditions.filter(
                (_, currentConditionIndex) =>
                  currentConditionIndex !== conditionIndex
              ),
            }
          : step
      ),
    }));
  }

function editSequence(sequence) {
    setForm({
      sequenceKey: sequence.sequenceKey || "",
      name: sequence.name || "",
      description: sequence.description || "",
      active: sequence.active === true,
      audience: sequence.audience || "all_users",
      triggerEvent:
        sequence.triggerEvent === "manual_tag"
          ? "tag_added"
          : sequence.triggerEvent || "signup",
      defaultTimezone: sequence.defaultTimezone || "user",
      sendWindowStart: sequence.sendWindowStart || "",
      sendWindowEnd: sequence.sendWindowEnd || "",
      consentRequired: sequence.consentRequired !== false,
      unsubscribeGroup: sequence.unsubscribeGroup || "",
      metadata: sequence.metadata || {},
      steps: (sequence.steps || []).map((step) => ({
        stepKey: step.stepKey || "",
        name: step.name || "",
        subject: step.subject || "",
        previewText: step.previewText || "",
        fromName: step.fromName || "",
        fromEmail: step.fromEmail || "",
        replyToEmail: step.replyToEmail || "",
        bodyText: step.bodyText || "",
        ctaLabel: step.ctaLabel || "",
        ctaUrl: step.ctaUrl || "",
        sendTimingMode: step.sendTimingMode || "delay",
        delayAmount: step.delayAmount ?? 0,
        delayUnit: step.delayUnit || "minutes",
        sendAtLocalTime: step.sendAtLocalTime || "",
        timezoneMode: step.timezoneMode || "user",
        activityDelayAmount: step.activityDelayAmount ?? 1,
        activityDelayUnit: step.activityDelayUnit || "days",
        skipIfAlreadySent: step.skipIfAlreadySent !== false,
        requirePreviousStep: step.requirePreviousStep !== false,
        active: step.active !== false,
        conditions: step.conditions?.length
          ? step.conditions.map((condition) => ({
              conditionType: condition.conditionType || "always",
              operator: condition.operator || "is",
              referenceKey: condition.referenceKey || "",
              value: condition.value || "",
              lookbackAmount: condition.lookbackAmount ?? 7,
              lookbackUnit: condition.lookbackUnit || "days",
            }))
          : [{ ...emptyCondition }],
      })),
    });
    setStatus(`Editing ${sequence.name}`);
  }

  async function saveSequence(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving email sequence...");

    const response = await fetch("/api/dashboard/email-sequences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    const payload = await readJsonResponse(response);

    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Email sequence could not be saved.");
      return;
    }

    setStatus("Email sequence saved.");
    setForm(emptyForm);
    await loadSequences();
  }

  async function sendDueEmails() {
    setIsSendingDue(true);
    setStatus("Sending due sequence emails...");

    const response = await fetch("/api/dashboard/email-sequences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "send-due",
        limit: 25,
      }),
    });
    const payload = await readJsonResponse(response);

    setIsSendingDue(false);

    if (!response.ok) {
      setStatus(payload?.error || "Due sequence emails could not be sent.");
      return;
    }

    setStatus(
      `Sequence runner finished. ${payload.processed || 0} due job${
        payload.processed === 1 ? "" : "s"
      } checked.`
    );
  }

  return (
    <section id="dashboard-email-sequences" style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Email Sequences</h2>
          <p style={helperStyle}>
            Plan welcome emails, follow-up timing, user-local sending windows,
            and open/click/purchase conditions before the delivery worker is
            wired in.
          </p>
        </div>
        <span style={badgeStyle}>
          {activeSteps.length} active step{activeSteps.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={gridStyle}>
        <form onSubmit={saveSequence} style={formStyle}>
          <div style={twoColumnStyle}>
            <label style={fieldStyle}>
              Sequence key
              <input
                value={form.sequenceKey}
                onChange={(event) => updateForm("sequenceKey", event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              Sequence name
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={fieldStyle}>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={2}
              style={inputStyle}
            />
          </label>

          <div style={twoColumnStyle}>
            <label style={fieldStyle}>
              Trigger event
              <select
                value={form.triggerEvent}
                onChange={(event) => updateForm("triggerEvent", event.target.value)}
                style={inputStyle}
              >
                <option value="signup">Signup</option>
                <option value="purchase">Purchase</option>
                <option value="ticket_purchase">Ticket purchase</option>
                <option value="album_purchase">Album purchase</option>
                <option value="tag_added">Tag added</option>
              </select>
            </label>
            <label style={fieldStyle}>
              Audience
              <select
                value={form.audience}
                onChange={(event) => updateForm("audience", event.target.value)}
                style={inputStyle}
              >
                <option value="all_users">All users</option>
                <option value="new_accounts">New accounts</option>
                <option value="purchasers">Purchasers</option>
                <option value="ticket_buyers">Ticket buyers</option>
                <option value="album_buyers">Album buyers</option>
                <option value="tagged_users">Tagged users</option>
              </select>
            </label>
          </div>

          <div style={threeColumnStyle}>
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm("active", event.target.checked)}
              />
              Active
            </label>
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={form.consentRequired}
                onChange={(event) =>
                  updateForm("consentRequired", event.target.checked)
                }
              />
              Requires marketing consent
            </label>
            <label style={fieldStyle}>
              Unsubscribe group
              <input
                value={form.unsubscribeGroup}
                onChange={(event) =>
                  updateForm("unsubscribeGroup", event.target.value)
                }
                style={inputStyle}
              />
            </label>
          </div>

          <div style={threeColumnStyle}>
            <label style={fieldStyle}>
              Timezone mode
              <select
                value={form.defaultTimezone}
                onChange={(event) =>
                  updateForm("defaultTimezone", event.target.value)
                }
                style={inputStyle}
              >
                <option value="user">User&apos;s local time</option>
                <option value="sequence">Sequence timezone</option>
                <option value="site">Site/account timezone</option>
              </select>
            </label>
            <label style={fieldStyle}>
              Send window starts
              <input
                type="time"
                value={form.sendWindowStart}
                onChange={(event) =>
                  updateForm("sendWindowStart", event.target.value)
                }
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              Send window ends
              <input
                type="time"
                value={form.sendWindowEnd}
                onChange={(event) =>
                  updateForm("sendWindowEnd", event.target.value)
                }
                style={inputStyle}
              />
            </label>
          </div>

          <div style={stepsHeaderStyle}>
            <h3 style={subTitleStyle}>Sequence emails</h3>
            <button type="button" onClick={addStep} style={secondaryButtonStyle}>
              Add email
            </button>
          </div>

          <div style={stepStackStyle}>
            {form.steps.map((step, stepIndex) => (
              <div key={`${step.stepKey}-${stepIndex}`} style={stepCardStyle}>
                <div style={stepsHeaderStyle}>
                  <strong>Email {stepIndex + 1}</strong>
                  {form.steps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeStep(stepIndex)}
                      style={linkButtonStyle}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div style={twoColumnStyle}>
                  <label style={fieldStyle}>
                    Step key
                    <input
                      value={step.stepKey}
                      onChange={(event) =>
                        updateStep(stepIndex, "stepKey", event.target.value)
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    Step name
                    <input
                      value={step.name}
                      onChange={(event) =>
                        updateStep(stepIndex, "name", event.target.value)
                      }
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={fieldStyle}>
                  Subject
                  <input
                    value={step.subject}
                    onChange={(event) =>
                      updateStep(stepIndex, "subject", event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  Preview text
                  <input
                    value={step.previewText}
                    onChange={(event) =>
                      updateStep(stepIndex, "previewText", event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <div style={threeColumnStyle}>
                  <label style={fieldStyle}>
                    Send timing
                    <select
                      value={step.sendTimingMode}
                      onChange={(event) =>
                        updateStep(stepIndex, "sendTimingMode", event.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="immediate">Immediately</option>
                      <option value="delay">Delay after trigger</option>
                      <option value="scheduled_time">At a set time</option>
                      <option value="after_activity">After user activity</option>
                    </select>
                  </label>
                  <label style={fieldStyle}>
                    Delay amount
                    <input
                      type="number"
                      min="0"
                      value={step.delayAmount}
                      onChange={(event) =>
                        updateStep(stepIndex, "delayAmount", Number(event.target.value))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    Delay unit
                    <select
                      value={step.delayUnit}
                      onChange={(event) =>
                        updateStep(stepIndex, "delayUnit", event.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </label>
                </div>

                <div style={threeColumnStyle}>
                  <label style={fieldStyle}>
                    Send at time
                    <input
                      type="time"
                      value={step.sendAtLocalTime}
                      onChange={(event) =>
                        updateStep(stepIndex, "sendAtLocalTime", event.target.value)
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    Timezone for this email
                    <select
                      value={step.timezoneMode}
                      onChange={(event) =>
                        updateStep(stepIndex, "timezoneMode", event.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="user">User&apos;s local time</option>
                      <option value="sequence">Sequence timezone</option>
                      <option value="site">Site/account timezone</option>
                    </select>
                  </label>
                  <label style={checkboxStyle}>
                    <input
                      type="checkbox"
                      checked={step.requirePreviousStep}
                      onChange={(event) =>
                        updateStep(
                          stepIndex,
                          "requirePreviousStep",
                          event.target.checked
                        )
                      }
                    />
                    Requires previous email
                  </label>
                </div>

                <div style={twoColumnStyle}>
                  <label style={fieldStyle}>
                    CTA label
                    <input
                      value={step.ctaLabel}
                      onChange={(event) =>
                        updateStep(stepIndex, "ctaLabel", event.target.value)
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    CTA URL
                    <input
                      value={step.ctaUrl}
                      onChange={(event) =>
                        updateStep(stepIndex, "ctaUrl", event.target.value)
                      }
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={fieldStyle}>
                  Email body text
                  <textarea
                    value={step.bodyText}
                    onChange={(event) =>
                      updateStep(stepIndex, "bodyText", event.target.value)
                    }
                    rows={5}
                    style={inputStyle}
                  />
                </label>

                <div style={stepsHeaderStyle}>
                  <strong>Conditions</strong>
                  <button
                    type="button"
                    onClick={() => addCondition(stepIndex)}
                    style={secondaryButtonStyle}
                  >
                    Add condition
                  </button>
                </div>

                <div style={conditionStackStyle}>
                  {step.conditions.map((condition, conditionIndex) => (
                    <div
                      key={`${step.stepKey}-condition-${conditionIndex}`}
                      style={conditionCardStyle}
                    >
                      <label style={fieldStyle}>
                        Condition
                        <select
                          value={condition.conditionType}
                          onChange={(event) =>
                            updateCondition(
                              stepIndex,
                              conditionIndex,
                              "conditionType",
                              event.target.value
                            )
                          }
                          style={inputStyle}
                        >
                          {Object.entries(conditionLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div style={threeColumnStyle}>
                        <label style={fieldStyle}>
                          Email / link / item key
                          <input
                            value={condition.referenceKey}
                            onChange={(event) =>
                              updateCondition(
                                stepIndex,
                                conditionIndex,
                                "referenceKey",
                                event.target.value
                              )
                            }
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Value
                          <input
                            value={condition.value}
                            onChange={(event) =>
                              updateCondition(
                                stepIndex,
                                conditionIndex,
                                "value",
                                event.target.value
                              )
                            }
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Activity lookback
                          <input
                            type="number"
                            min="0"
                            value={condition.lookbackAmount}
                            onChange={(event) =>
                              updateCondition(
                                stepIndex,
                                conditionIndex,
                                "lookbackAmount",
                                Number(event.target.value)
                              )
                            }
                            style={inputStyle}
                          />
                        </label>
                      </div>

                      {step.conditions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeCondition(stepIndex, conditionIndex)}
                          style={linkButtonStyle}
                        >
                          Remove condition
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={isSaving} style={primaryButtonStyle}>
            {isSaving ? "Saving..." : "Save email sequence"}
          </button>
        </form>

        <aside style={listStyle}>
          <div style={stepsHeaderStyle}>
            <h3 style={subTitleStyle}>Saved sequences</h3>
            <button
              type="button"
              onClick={sendDueEmails}
              disabled={isSendingDue}
              style={secondaryButtonStyle}
            >
              {isSendingDue ? "Sending..." : "Send due emails"}
            </button>
          </div>
          {sequences.length ? (
            sequences.map((sequence) => (
              <button
                key={sequence.id}
                type="button"
                onClick={() => editSequence(sequence)}
                style={sequenceButtonStyle}
              >
                <strong>{sequence.name}</strong>
                {sequence.metadata?.systemTag ? (
                  <span style={protectedBadgeStyle}>
                    {sequence.metadata.systemTag}
                  </span>
                ) : null}
                <span>{sequence.triggerEvent}</span>
                <span>
                  {sequence.steps?.length ?? 0} email
                  {(sequence.steps?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                  {sequence.active ? "active" : "draft"}
                </span>
                <SequenceRecipientActivity sequence={sequence} />
              </button>
            ))
          ) : (
            <p style={helperStyle}>No sequences saved yet.</p>
          )}

          {status ? <p style={statusStyle}>{status}</p> : null}
        </aside>
      </div>
    </section>
  );
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.ok
        ? "The server returned an unreadable response."
        : text.slice(0, 240) || "The server returned an error.",
    };
  }
}

function SequenceRecipientActivity({ sequence }) {
  const recipients = Array.isArray(sequence.recipientActivity)
    ? sequence.recipientActivity
    : [];
  const sentCount = recipients.reduce(
    (sum, recipient) => sum + Number(recipient.sentCount || 0),
    0
  );
  const openedCount = recipients.reduce(
    (sum, recipient) => sum + Number(recipient.openedCount || 0),
    0
  );
  const clickedCount = recipients.reduce(
    (sum, recipient) => sum + Number(recipient.clickedCount || 0),
    0
  );
  const failedCount = recipients.reduce(
    (sum, recipient) => sum + Number(recipient.failedCount || 0),
    0
  );

  return (
    <div style={recipientActivityStyle}>
      <div style={recipientSummaryStyle}>
        <span>{recipients.length} recipients</span>
        <span>{sentCount} sent</span>
        <span>{openedCount} opened</span>
        <span>{clickedCount} clicked</span>
        <span>{failedCount} bounced/failed</span>
      </div>

      {recipients.length ? (
        <div style={recipientListStyle}>
          {recipients.slice(0, 8).map((recipient) => (
            <div key={recipient.enrollmentId} style={recipientRowStyle}>
              <strong>{recipient.recipientEmail}</strong>
              <span>{recipient.recipientName || "No name saved"}</span>
              <span>Sent: {formatDateTime(recipient.lastSentAt)}</span>
              <span>Opened: {formatDateTime(recipient.lastOpenedAt)}</span>
              <span>Clicked: {formatDateTime(recipient.lastClickedAt)}</span>
              <span>
                Bounced/failed: {formatDateTime(recipient.lastFailedAt)}
              </span>
            </div>
          ))}
          {recipients.length > 8 ? (
            <span style={helperStyle}>
              Showing 8 of {recipients.length} recipients.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

const sectionStyle = {
  background: "#fffdfa",
  border: "1px solid rgba(32, 28, 29, 0.12)",
  borderRadius: "8px",
  marginTop: "22px",
  maxWidth: "100%",
  overflow: "hidden",
  padding: "18px",
};

const headerStyle = {
  alignItems: "flex-start",
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  justifyContent: "space-between",
  marginBottom: "16px",
};

const titleStyle = {
  fontSize: "22px",
  margin: 0,
};

const subTitleStyle = {
  fontSize: "16px",
  margin: 0,
};

const helperStyle = {
  fontSize: "14px",
  lineHeight: 1.45,
  margin: "6px 0 0",
  opacity: 0.72,
};

const badgeStyle = {
  background: "#e9f6ed",
  border: "1px solid rgba(39, 112, 62, 0.18)",
  borderRadius: "999px",
  color: "#27703e",
  fontSize: "12px",
  fontWeight: 800,
  padding: "6px 10px",
  whiteSpace: "nowrap",
};

const protectedBadgeStyle = {
  background: "#f2efe8",
  border: "1px solid rgba(32, 28, 29, 0.14)",
  borderRadius: "999px",
  color: "#5f5547",
  display: "inline-flex",
  fontSize: "11px",
  fontWeight: 900,
  padding: "4px 8px",
  width: "fit-content",
};

const gridStyle = {
  alignItems: "start",
  display: "grid",
  gap: "18px",
  gridTemplateColumns: "minmax(0, 1fr)",
  minWidth: 0,
};

const formStyle = {
  display: "grid",
  gap: "14px",
};

const twoColumnStyle = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  minWidth: 0,
};

const threeColumnStyle = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  minWidth: 0,
};

const fieldStyle = {
  display: "grid",
  gap: "6px",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.35,
  minWidth: 0,
};

const checkboxStyle = {
  alignItems: "flex-start",
  display: "flex",
  gap: "8px",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.35,
  minWidth: 0,
  paddingTop: "28px",
};

const inputStyle = {
  border: "1px solid rgba(32, 28, 29, 0.18)",
  borderRadius: "6px",
  boxSizing: "border-box",
  font: "inherit",
  fontSize: "14px",
  lineHeight: 1.35,
  minWidth: 0,
  padding: "9px 10px",
  width: "100%",
};

const stepsHeaderStyle = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "space-between",
};

const stepStackStyle = {
  display: "grid",
  gap: "12px",
};

const stepCardStyle = {
  background: "#f9f7f3",
  border: "1px solid rgba(32, 28, 29, 0.12)",
  borderRadius: "8px",
  display: "grid",
  gap: "12px",
  minWidth: 0,
  padding: "14px",
};

const conditionStackStyle = {
  display: "grid",
  gap: "10px",
};

const conditionCardStyle = {
  background: "#ffffff",
  border: "1px solid rgba(32, 28, 29, 0.1)",
  borderRadius: "8px",
  display: "grid",
  gap: "10px",
  minWidth: 0,
  padding: "12px",
};

const listStyle = {
  background: "#f9f7f3",
  border: "1px solid rgba(32, 28, 29, 0.12)",
  borderRadius: "8px",
  display: "grid",
  gap: "10px",
  padding: "14px",
};

const sequenceButtonStyle = {
  background: "#ffffff",
  border: "1px solid rgba(32, 28, 29, 0.12)",
  borderRadius: "8px",
  color: "inherit",
  cursor: "pointer",
  display: "grid",
  gap: "4px",
  padding: "12px",
  textAlign: "left",
};

const recipientActivityStyle = {
  borderTop: "1px solid rgba(32, 28, 29, 0.1)",
  display: "grid",
  gap: "8px",
  marginTop: "8px",
  paddingTop: "8px",
};

const recipientSummaryStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 10px",
  fontSize: "12px",
  fontWeight: 800,
  opacity: 0.78,
};

const recipientListStyle = {
  display: "grid",
  gap: "6px",
};

const recipientRowStyle = {
  background: "#fbfaf7",
  border: "1px solid rgba(32, 28, 29, 0.08)",
  borderRadius: "6px",
  display: "grid",
  gap: "2px",
  fontSize: "12px",
  lineHeight: 1.35,
  padding: "8px",
};

const primaryButtonStyle = {
  background: "#27703e",
  border: "none",
  borderRadius: "6px",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 800,
  minHeight: "42px",
  padding: "10px 14px",
};

const secondaryButtonStyle = {
  background: "#ffffff",
  border: "1px solid rgba(32, 28, 29, 0.16)",
  borderRadius: "6px",
  color: "inherit",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 800,
  padding: "7px 10px",
};

const linkButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#5f4937",
  cursor: "pointer",
  font: "inherit",
  fontSize: "13px",
  fontWeight: 800,
  padding: 0,
  textDecoration: "underline",
};

const statusStyle = {
  fontSize: "13px",
  lineHeight: 1.45,
  margin: 0,
};
