import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type TicketOwnerPageProps = {
  params: Promise<{
    ticketCode: string;
  }>;
};

function formatMoney(value: unknown, currencyCode: string) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatMealLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMealSelectionLines(input: Record<string, unknown>) {
  return Object.entries(input).flatMap(([groupKey, groupValue]) => {
    if (!groupValue || typeof groupValue !== "object" || Array.isArray(groupValue)) {
      return [];
    }

    return Object.entries(groupValue as Record<string, unknown>)
      .map(([optionKey, quantity]) => {
        const amount = Number(quantity ?? 0);

        if (!Number.isFinite(amount) || amount <= 0) {
          return null;
        }

        return `${formatMealLabel(groupKey)}: ${formatMealLabel(optionKey)} × ${amount}`;
      })
      .filter(Boolean) as string[];
  });
}

function getAddonBudget(value: unknown) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export default async function TicketOwnerPage({ params }: TicketOwnerPageProps) {
  const { ticketCode } = await params;

  const ticket = await prisma.invitationOrderTicket.findUnique({
    where: {
      ticketCode,
    },
    include: {
      order: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  await prisma.invitationOrderTicket.update({
    where: {
      id: ticket.id,
    },
    data: {
      portalLastAccessAt: new Date(),
    },
  });

  const currencyCode = ticket.order.currencyCode || "USD";
  const mealSelection =
    ticket.mealSelection && typeof ticket.mealSelection === "object"
      ? ticket.mealSelection
      : {};

  const purchaserName = ticket.order.purchaserName?.trim() || "the purchaser";
  const ticketOwnerName = ticket.ownerName?.trim() || "the ticket owner";
  const addonBudget = getAddonBudget(ticket.ticketOwnerAddonBudget);
  const mealSelectionLines = getMealSelectionLines(
    mealSelection as Record<string, unknown>
  );
  const purchaserSelectedAddons =
    ticket.ticketOwnerPaymentMode === "purchaser_pays_ticket_and_addons";
  const ticketOwnerCanSelectAddons =
    ticket.ticketOwnerPaymentMode === "owner_selects_sender_pays_addons";
  const mealExtraTotal = Number(ticket.mealExtraTotal ?? 0);
  const overBudgetAmount =
    ticketOwnerCanSelectAddons && addonBudget > 0
      ? Math.max(0, mealExtraTotal - addonBudget)
      : 0;
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 18px",
        background: "#f7f3ec",
        color: "#1f1f1f",
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            padding: 22,
            borderRadius: 22,
            background: "#ffffff",
            boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
            display: "grid",
            gap: 12,
          }}
        >
          <p style={{ margin: 0, opacity: 0.72 }}>Ticket owner portal</p>

          <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.1 }}>
            {ticket.ticketLabel || ticket.sizeLabel || "Your ticket"}
          </h1>

          <p style={{ margin: 0 }}>
            <strong>Ticket code:</strong> {ticket.ticketCode}
          </p>

          <p style={{ margin: 0 }}>
            <strong>Event item:</strong> {ticket.productTitle}
          </p>

          {ticket.ownerName || ticket.ownerEmail ? (
            <p style={{ margin: 0 }}>
              <strong>Assigned to:</strong>{" "}
              {[ticket.ownerName, ticket.ownerEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          <div style={{ margin: 0, display: "grid", gap: 6 }}>
            <strong>Payment:</strong>

            {purchaserSelectedAddons ? (
              <span>
                {purchaserName} selected the add-ons for this ticket.
              </span>
            ) : ticketOwnerCanSelectAddons && addonBudget > 0 ? (
              <span>
                <>
                  Add-ons up to {formatMoney(addonBudget, currencyCode)} was paid for by{" "}
                  {purchaserName}.
                  <br />
                  Any selections over this budget, you will pay for.
                </>
              </span>
            ) : ticketOwnerCanSelectAddons ? (
              <span>Select your add-ons, then go to cart.</span>
            ) : (
              <span>Payment responsibility will be confirmed before checkout.</span>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 22,
            borderRadius: 22,
            background: "#ffffff",
            boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
            display: "grid",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Meal / add-ons</h2>

          {ticket.mealMode ? (
            <>
              <p style={{ margin: 0 }}>
                <strong>Meal option:</strong> {ticket.mealLabel || ticket.mealMode}
              </p>

              {mealSelectionLines.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 14,
                    borderRadius: 16,
                    background: "#f4f4f4",
                  }}
                >
                  {mealSelectionLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, opacity: 0.75 }}>
                  No meal selections have been added yet.
                </p>
              )}

              {purchaserSelectedAddons ? (
                <p style={{ margin: 0, opacity: 0.78 }}>
                  Only {purchaserName} can make changes to this order.
                </p>
              ) : null}
            </>
          ) : (
            <p style={{ margin: 0 }}>No meal is attached to this ticket yet.</p>
          )}
          
                    {ticketOwnerCanSelectAddons ? (
            <Link
              href={`/questionnaire/ticket-shop?slide=meal-selection&ticketCode=${encodeURIComponent(
                ticket.ticketCode
              )}&ticketOwner=1`}
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 999,
                background: "#1f1f1f",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Select or adjust meal
            </Link>
          ) : null}

          {overBudgetAmount > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                borderRadius: 16,
                background: "#fff6e5",
                border: "1px solid #e6b85c",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>
                You are over {purchaserName}&apos;s add-on budget by{" "}
                {formatMoney(overBudgetAmount, currencyCode)}.
              </p>

              <p style={{ margin: 0 }}>
                You can ask {purchaserName} to increase the budget, or go to
                cart and pay the difference.
              </p>

              <Link
                href={`/questionnaire/ticket-shop?slide=review-order&ticketCode=${encodeURIComponent(
                  ticket.ticketCode
                )}&ticketOwner=1&addonOverage=${encodeURIComponent(
                  String(overBudgetAmount)
                )}`}
                style={{
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: 999,
                  background: "#1f1f1f",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Go to cart
              </Link>
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: 22,
            borderRadius: 22,
            background: "#ffffff",
            boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
            display: "grid",
            gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Order</h2>
          <p style={{ margin: 0 }}>
            <strong>Order code:</strong> {ticket.order.orderCode}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Order status:</strong> {ticket.order.status}
          </p>
        </div>
      </section>
    </main>
  );
}
