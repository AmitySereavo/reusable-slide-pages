"use client";

import { useState } from "react";

export default function ReceiptLookupClient() {
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Looking up receipt...");

    const response = await fetch("/api/plant-shop/receipt-lookup", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identity, code }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok || !payload.receiptUrl) {
      setMessage(payload.error || "Receipt was not found.");
      return;
    }

    window.location.href = payload.receiptUrl;
  }

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <p style={eyebrowStyle}>Little Orchard Shop</p>
        <h1 style={titleStyle}>Find Your Receipt</h1>
        <p style={supportStyle}>
          Enter any one piece of information you gave while making your order.
          Then enter the receipt lookup code from the cashier, or your full
          receipt/order number.
        </p>
        <form onSubmit={submitLookup} style={formStyle}>
          <label style={labelStyle}>
            Name, email, or contact number
            <input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="Example: Janet Brown, janet@email.com, or 8763727415"
              required
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Receipt lookup code or receipt/order number
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Example: 0427"
              required
              style={inputStyle}
            />
          </label>
          <button type="submit" disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? "Checking..." : "Open receipt"}
          </button>
        </form>
        {message ? <p style={messageStyle}>{message}</p> : null}
      </section>
    </main>
  );
}

const pageStyle = {
  background: "#F6F0E3",
  color: "#28231F",
  minHeight: "100vh",
  padding: "22px",
};

const panelStyle = {
  background: "#FFFDF8",
  border: "1px solid #CDBEA7",
  borderRadius: "18px",
  boxShadow: "0 24px 70px rgba(53, 94, 59, 0.16)",
  margin: "0 auto",
  maxWidth: "640px",
  padding: "24px",
};

const eyebrowStyle = {
  color: "#7B3F2A",
  fontSize: "14px",
  fontWeight: 800,
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  color: "#355E3B",
  fontSize: "38px",
  lineHeight: 1.05,
  margin: 0,
};

const supportStyle = {
  color: "rgba(40, 35, 31, 0.72)",
  fontSize: "17px",
  lineHeight: 1.5,
};

const formStyle = {
  display: "grid",
  gap: "14px",
};

const labelStyle = {
  display: "grid",
  gap: "6px",
  fontWeight: 800,
};

const inputStyle = {
  border: "1px solid rgba(32, 28, 29, 0.16)",
  borderRadius: "8px",
  font: "inherit",
  padding: "12px",
};

const buttonStyle = {
  background: "#355E3B",
  border: 0,
  borderRadius: "14px",
  color: "#FFFFFF",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 800,
  padding: "14px 18px",
};

const messageStyle = {
  color: "#7B3F2A",
  fontWeight: 800,
};
