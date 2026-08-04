"use client";

import { useState } from "react";

const adminLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/people", label: "People" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/tickets", label: "Tickets" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/discount-codes", label: "Discount Codes" },
  { href: "/dashboard/currencies", label: "Currencies" },
  { href: "/dashboard/identity-verifications", label: "ID Verifications" },
  { href: "/dashboard/email-sequences", label: "Email Sequences" },
  { href: "/shop", label: "Little Orchard Shop" },
  { href: "/gardenpackage", label: "Garden Package" },
  { href: "/seedlings", label: "Seedling Shop" },
  { href: "/questionnaire/invitation", label: "Invitation" },
  { href: "/questionnaire/ticket-purchase-assistant", label: "Ticket Assistant" },
  { href: "/questionnaire/escape-album", label: "Escape Album" },
  { href: "/questionnaire/itasl", label: "ITASL Sequence" },
];

const accountLinks = [
  { href: "/questionnaire/auth-account", label: "Account" },
  { href: "/questionnaire/auth-account?slide=purchased-items", label: "Purchased Items" },
  { href: "/questionnaire/auth-account?slide=my-tickets", label: "My Tickets" },
  { href: "/questionnaire/auth-account?slide=receipts", label: "Receipts" },
  { href: "/questionnaire/invitation?slide=review-order", label: "Cart" },
];

export default function DashboardSidePanels({ adminLevel }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <>
      <div style={toggleRowStyle}>
        <button
          type="button"
          aria-label="Open dashboard navigation"
          onClick={() => setLeftOpen((open) => !open)}
          style={toggleButtonStyle}
        >
          <img src="/icons/ui/sidebar-left.svg" alt="" style={toggleIconStyle} />
        </button>
        <button
          type="button"
          aria-label="Open account navigation"
          onClick={() => setRightOpen((open) => !open)}
          style={toggleButtonStyle}
        >
          <img src="/icons/ui/sidebar-right.svg" alt="" style={toggleIconStyle} />
        </button>
      </div>

      {leftOpen || rightOpen ? (
        <button
          type="button"
          aria-label="Close dashboard side panel"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
          style={backdropStyle}
        />
      ) : null}

      {leftOpen ? (
        <aside style={{ ...panelStyle, left: 0 }}>
          <strong style={panelTitleStyle}>Admin level {adminLevel}</strong>
          <nav style={linkListStyle}>
            {adminLinks.map((link) => (
              <a key={link.href} href={link.href} style={linkStyle}>
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}

      {rightOpen ? (
        <aside style={{ ...panelStyle, right: 0 }}>
          <strong style={panelTitleStyle}>Account</strong>
          <nav style={linkListStyle}>
            {accountLinks.map((link) => (
              <a key={link.href} href={link.href} style={linkStyle}>
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}
    </>
  );
}

const toggleRowStyle = {
  position: "fixed",
  top: "16px",
  left: "16px",
  right: "16px",
  zIndex: 440,
  display: "flex",
  justifyContent: "space-between",
  pointerEvents: "none",
};

const toggleButtonStyle = {
  width: "42px",
  height: "42px",
  border: "1px solid rgba(32, 28, 29, 0.16)",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.9)",
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.12)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  pointerEvents: "auto",
};

const toggleIconStyle = {
  width: "21px",
  height: "21px",
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  border: 0,
  background: "transparent",
  cursor: "default",
};

const panelStyle = {
  position: "fixed",
  top: 0,
  bottom: 0,
  zIndex: 420,
  width: "min(320px, 86vw)",
  padding: "72px 14px 18px",
  background: "rgba(255, 255, 255, 0.98)",
  boxShadow: "0 16px 44px rgba(0, 0, 0, 0.2)",
  overflowY: "auto",
};

const panelTitleStyle = {
  display: "block",
  borderBottom: "1px solid rgba(32, 28, 29, 0.1)",
  padding: "8px 10px 12px",
};

const linkListStyle = {
  display: "grid",
  gap: "6px",
  marginTop: "10px",
};

const linkStyle = {
  color: "#201c1d",
  fontSize: "14px",
  fontWeight: 800,
  padding: "10px",
  textDecoration: "none",
};
