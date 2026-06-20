"use client";

import { useEffect, useState } from "react";

const fieldStyle = {
  width: "100%",
  minHeight: 44,
  border: "1px solid rgba(32, 28, 29, 0.18)",
  borderRadius: 10,
  padding: "10px 12px",
  font: "inherit",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "grid",
  gap: 7,
  fontSize: 13,
  fontWeight: 700,
};

const helperStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.68,
  fontWeight: 400,
};

export default function AcceptPurchaseRecipientClient({ token }) {
  const [form, setForm] = useState({
    confirmedName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    parishOrRegion: "",
    postalCode: "",
  });
  const [status, setStatus] = useState(null);
  const [invite, setInvite] = useState(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoadingInvite(false);
      return;
    }

    let isMounted = true;

    async function loadInvite() {
      setIsLoadingInvite(true);

      try {
        const response = await fetch(
          `/api/account/purchase-recipients/accept?token=${encodeURIComponent(
            token
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Could not load this invite.");
        }

        if (isMounted) {
          const recipient = data?.recipient || null;
          setInvite(recipient);
          setForm((prev) => ({
            ...prev,
            confirmedName:
              recipient?.confirmedName || recipient?.recipientName || "",
            phone: recipient?.phone || "",
            addressLine1: recipient?.addressLine1 || "",
            addressLine2: recipient?.addressLine2 || "",
            parishOrRegion: recipient?.parishOrRegion || "",
            postalCode: recipient?.postalCode || "",
          }));
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not load this invite.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingInvite(false);
        }
      }
    }

    void loadInvite();

    return () => {
      isMounted = false;
    };
  }, [token]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/account/purchase-recipients/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          ...form,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not accept this invite.");
      }

      setStatus({
        type: "success",
        text:
          data?.message ||
          "Invite accepted. The purchaser can now select your name in the store.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not accept this invite.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#faf8f2",
        color: "#201c1d",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(100%, 520px)",
          display: "grid",
          gap: 22,
          padding: 24,
          border: "1px solid rgba(32, 28, 29, 0.12)",
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>
            Accept purchase recipient invite
          </h1>
          <p style={{ margin: "8px 0 0", lineHeight: 1.5, opacity: 0.76 }}>
            Confirm that this person may buy selected items for you. Your name
            is prefilled from what they entered, and you can correct it before
            accepting.
          </p>
        </div>

        {!token ? (
          <div style={{ color: "#b42318" }}>
            This invite link is missing its token.
          </div>
        ) : null}

        {isLoadingInvite ? (
          <div style={{ lineHeight: 1.5, opacity: 0.72 }}>Loading invite...</div>
        ) : null}

        {invite?.purchaser ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(47, 111, 62, 0.08)",
              lineHeight: 1.45,
            }}
          >
            {invite.purchaser.name || invite.purchaser.email || "The purchaser"}{" "}
            asked to add you to their verified recipient list.
          </div>
        ) : null}

        <label style={labelStyle}>
          Your name
          <input
            style={fieldStyle}
            value={form.confirmedName}
            onChange={(event) =>
              updateField("confirmedName", event.target.value)
            }
            placeholder="Your correct name"
          />
          <p style={helperStyle}>
            This can stay as-is if the purchaser entered it correctly.
          </p>
        </label>

        <section
          style={{
            display: "grid",
            gap: 14,
            padding: "18px 0 0",
            borderTop: "1px solid rgba(32, 28, 29, 0.12)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.25 }}>
              Optional delivery details
            </h2>
            <p style={{ margin: "7px 0 0", lineHeight: 1.5, opacity: 0.72 }}>
              You do not need to enter these details to accept. They must be
              updated before any physical product can be shipped or delivered
              to you.
            </p>
          </div>

          <label style={labelStyle}>
            Contact number
            <input
              style={fieldStyle}
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Optional for now"
            />
          </label>

          <label style={labelStyle}>
            Mailing address
            <input
              style={fieldStyle}
              value={form.addressLine1}
              onChange={(event) =>
                updateField("addressLine1", event.target.value)
              }
              placeholder="Address line 1"
            />
          </label>

          <input
            style={fieldStyle}
            value={form.addressLine2}
            onChange={(event) => updateField("addressLine2", event.target.value)}
            placeholder="Apartment, unit, landmark"
          />
          <input
            style={fieldStyle}
            value={form.parishOrRegion}
            onChange={(event) =>
              updateField("parishOrRegion", event.target.value)
            }
            placeholder="Parish / region"
          />
          <input
            style={fieldStyle}
            value={form.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            placeholder="Postal code"
          />
        </section>

        {status ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background:
                status.type === "success"
                  ? "rgba(47, 111, 62, 0.1)"
                  : "rgba(180, 35, 24, 0.08)",
              color: status.type === "success" ? "#2f6f3e" : "#b42318",
              lineHeight: 1.45,
            }}
          >
            {status.text}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!token || isLoadingInvite || isSubmitting}
          style={{
            minHeight: 48,
            border: "none",
            borderRadius: 12,
            background: "#2f6f3e",
            color: "#ffffff",
            font: "inherit",
            fontWeight: 800,
            cursor:
              !token || isLoadingInvite || isSubmitting
                ? "not-allowed"
                : "pointer",
            opacity: !token || isLoadingInvite || isSubmitting ? 0.55 : 1,
          }}
        >
          {isSubmitting ? "Accepting..." : "Accept Invite"}
        </button>
      </form>
    </main>
  );
}
