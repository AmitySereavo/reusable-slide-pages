import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TicketContextRouteProps = {
  params: Promise<{
    ticketCode: string;
  }>;
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(_request: Request, { params }: TicketContextRouteProps) {
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
    return NextResponse.json(
      {
        ok: false,
        error: "Ticket not found.",
      },
      { status: 404 }
    );
  }

  const assignment = {
    ticketCode: ticket.ticketCode,
    lineKey:
      ticket.lineKey ||
      `${ticket.productId}::${ticket.sizeOptionId}::${ticket.ticketIndex}`,
    productId: ticket.productId,
    sizeOptionId: ticket.sizeOptionId,
    purchaseModeId: ticket.purchaseModeId || undefined,
    ticketIndex: ticket.ticketIndex,
    ticketLabel:
      ticket.ticketLabel || `${ticket.sizeLabel} #${ticket.ticketIndex + 1}`,
    productTitle: ticket.productTitle,
    ownerName: ticket.ownerName || "",
    ownerEmail: ticket.ownerEmail || "",
    ownerPhone: "",
    purchaserContactPrefilled: false,
    isPurchaserTicket: false,
    emailTicketToOwner: true,
    ticketOwnerPaymentMode: ticket.ticketOwnerPaymentMode,
    ticketOwnerAddonBudget: asNumber(ticket.ticketOwnerAddonBudget),
    mealMode:
      ticket.mealMode === "required" || ticket.mealMode === "optional"
        ? ticket.mealMode
        : undefined,
    mealMenuId: ticket.mealMenuId || undefined,
    mealLabel: ticket.mealLabel || undefined,
    mealAddOnPrice:
      ticket.mealAddOnPrice === null || ticket.mealAddOnPrice === undefined
        ? undefined
        : asNumber(ticket.mealAddOnPrice),
    mealEnabled:
      ticket.mealMode === "required" ? true : ticket.mealEnabled === true,
    mealSelection:
      ticket.mealSelection && typeof ticket.mealSelection === "object"
        ? ticket.mealSelection
        : {},
    wantsExtraFood: ticket.wantsExtraFood === true,
    hasMealNotes: ticket.hasMealNotes === true,
    mealNotes: ticket.mealNotes || "",
  };

  return NextResponse.json({
    ok: true,
    ticketCode: ticket.ticketCode,
    orderCode: ticket.order.orderCode,
    currencyCode: ticket.order.currencyCode,
    assignment,
    answers: {
      selectedMealTicketCode: ticket.ticketCode,
      ticketOwnerPortalFlow: true,
      ticketOwnerOrderCode: ticket.order.orderCode,
      ticketOwnerPaymentMode: ticket.ticketOwnerPaymentMode,
      ticketOwnerAddonBudget: asNumber(ticket.ticketOwnerAddonBudget),
      fullName: ticket.ownerName || "",
      email: ticket.ownerEmail || "",
    },
  });
}