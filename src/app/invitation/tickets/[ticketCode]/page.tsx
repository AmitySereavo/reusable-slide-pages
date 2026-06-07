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

function getPaymentModeLabel(mode: string | null | undefined) {
  switch (mode) {
    case "purchaser_pays_ticket_and_addons":
      return "The purchaser will pay for this ticket and add-ons.";
    case "owner_selects_sender_pays_addons":
      return "You can select your meal/add-ons. The purchaser will be notified to pay.";
    case "owner_pays_addons":
      return "The purchaser will pay for the ticket. You will pay for your own add-ons.";
    case "owner_pays_ticket_and_addons":
      return "You will pay for your own ticket and add-ons.";
    default:
      return "Payment responsibility will be confirmed before checkout.";
  }
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

          <p style={{ margin: 0 }}>
            <strong>Payment:</strong>{" "}
            {getPaymentModeLabel(ticket.ticketOwnerPaymentMode)}
          </p>
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

              <p style={{ margin: 0 }}>
                <strong>Meal extra total:</strong>{" "}
                {formatMoney(ticket.mealExtraTotal, currencyCode)}
              </p>

              {Object.keys(mealSelection).length > 0 ? (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowX: "auto",
                    padding: 12,
                    borderRadius: 14,
                    background: "#f4f4f4",
                    fontSize: "0.85rem",
                  }}
                >
                  {JSON.stringify(mealSelection, null, 2)}
                </pre>
                ) : (
                <p style={{ margin: 0, opacity: 0.75 }}>
                  No meal selections have been added yet.
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0 }}>No meal is attached to this ticket yet.</p>
          )}

          <Link
            href={`/questionnaire/invitation?slide=meal-selection&ticketCode=${encodeURIComponent(
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