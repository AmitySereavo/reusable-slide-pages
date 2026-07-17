import { prisma } from "../src/lib/prisma";

type TicketRow = {
  id: string;
  lineKey: string | null;
  productId: string;
  sizeOptionId: string;
  ticketCode: string;
  ticketIndex: number | null;
  ticketLabel: string | null;
  sizeLabel: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  purchaseModeId: string | null;
  purchaseModeLabel: string | null;
  invitationMailingAddress: unknown;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeInvitationMailingAddress(value: unknown) {
  const record = readRecord(value);
  const address = {
    addressLine1: cleanText(record.addressLine1),
    addressLine2: cleanText(record.addressLine2),
    city: cleanText(record.city),
    region: cleanText(record.region),
    postalCode: cleanText(record.postalCode),
    country: cleanText(record.country),
  };

  return Object.values(address).some(Boolean) ? address : null;
}

function formatInvitationMailingAddress(address: unknown) {
  const normalized = normalizeInvitationMailingAddress(address);

  if (!normalized) {
    return "";
  }

  return [
    normalized.addressLine1,
    normalized.addressLine2,
    normalized.city,
    normalized.region,
    normalized.postalCode,
    normalized.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function findAssignmentSnapshot(
  snapshots: unknown[],
  ticket: TicketRow,
  fallbackIndex: number
) {
  const byLineAndIndex = snapshots.find((snapshot) => {
    const record = readRecord(snapshot);
    return (
      cleanText(record.lineKey) === cleanText(ticket.lineKey) &&
      Number(record.ticketIndex ?? -1) === Number(ticket.ticketIndex ?? -2)
    );
  });

  return readRecord(
    byLineAndIndex ??
      snapshots.find((snapshot) => {
        const record = readRecord(snapshot);
        return cleanText(record.ticketCode) === cleanText(ticket.ticketCode);
      }) ??
      snapshots[fallbackIndex]
  );
}

function getTicketAddress(ticket: TicketRow, snapshot: Record<string, unknown>) {
  return (
    normalizeInvitationMailingAddress(ticket.invitationMailingAddress) ??
    normalizeInvitationMailingAddress(snapshot.invitationMailingAddress)
  );
}

function isPhysicalInvitation(ticket: TicketRow, snapshot: Record<string, unknown>) {
  return (
    ticket.purchaseModeId === "physical-invitation" ||
    cleanText(snapshot.invitationDeliveryMode) === "physical" ||
    Boolean(getTicketAddress(ticket, snapshot))
  );
}

function readFulfillmentDetails(
  hostSnapshot: Record<string, unknown>,
  orderSnapshots: unknown[]
) {
  const direct = cleanText(hostSnapshot.physicalInvitationFulfillmentDetails);

  if (direct) {
    return direct;
  }

  const fromAnySnapshot = orderSnapshots
    .map((snapshot) =>
      cleanText(readRecord(snapshot).physicalInvitationFulfillmentDetails)
    )
    .find(Boolean);

  return fromAnySnapshot || "";
}

async function main() {
  const orders = await prisma.invitationOrder.findMany({
    include: {
      tickets: {
        orderBy: [{ lineKey: "asc" }, { ticketIndex: "asc" }, { createdAt: "asc" }],
      },
      fulfillmentItems: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let deleted = 0;
  let created = 0;

  for (const order of orders) {
    const snapshots = readArray(order.ticketAssignmentsSnapshot);
    const physicalItems = order.fulfillmentItems.filter(
      (item) => item.sourceType === "physical-invitation"
    );

    if (physicalItems.length) {
      await prisma.orderFulfillmentItem.deleteMany({
        where: {
          id: {
            in: physicalItems.map((item) => item.id),
          },
        },
      });
      deleted += physicalItems.length;
    }

    const physicalTickets = order.tickets
      .map((ticket, index) => ({
        ticket,
        snapshot: findAssignmentSnapshot(snapshots, ticket as TicketRow, index),
        index,
      }))
      .filter(({ ticket, snapshot }) =>
        isPhysicalInvitation(ticket as TicketRow, snapshot)
      );
    const consumedTicketIds = new Set<string>();

    for (const { ticket, snapshot, index } of physicalTickets) {
      if (consumedTicketIds.has(ticket.id)) {
        continue;
      }

      const lineTickets = physicalTickets.filter(
        (candidate) => candidate.ticket.lineKey === ticket.lineKey
      );
      const ticketIndex = Number(ticket.ticketIndex ?? index);
      const plusOne = lineTickets.find((candidate) => {
        if (candidate.ticket.id === ticket.id || consumedTicketIds.has(candidate.ticket.id)) {
          return false;
        }

        const candidateSnapshot = candidate.snapshot;
        const explicitHostIndex = Number(candidateSnapshot.plusOneHostTicketIndex);
        const candidateIsPlusOne =
          candidateSnapshot.isPlusOneTicket === true ||
          Number.isFinite(explicitHostIndex);

        if (candidateIsPlusOne) {
          return explicitHostIndex === ticketIndex;
        }

        return (
          !cleanText(candidate.ticket.ownerEmail) &&
          Number(candidate.ticket.ticketIndex ?? -1) === ticketIndex + 1
        );
      });
      const packageTickets = [
        { ticket, snapshot },
        ...(plusOne ? [plusOne] : []),
      ];
      const address = getTicketAddress(ticket as TicketRow, snapshot);
      const formattedAddress = formatInvitationMailingAddress(address);
      const ticketLabel =
        cleanText(ticket.ticketLabel || ticket.sizeLabel) || "Invitation";
      const attendees = packageTickets.map(({ ticket: packageTicket, snapshot: packageSnapshot }, packageIndex) => ({
        name: cleanText(packageTicket.ownerName) || `Attendee ${packageIndex + 1}`,
        email: cleanText(packageTicket.ownerEmail) || null,
        ticketCode: packageTicket.ticketCode,
        ticketLabel:
          cleanText(packageTicket.ticketLabel || packageTicket.sizeLabel) ||
          ticketLabel,
        isPlusOneTicket:
          packageIndex > 0 || packageSnapshot.isPlusOneTicket === true,
        plusOneHostName:
          cleanText(packageSnapshot.plusOneHostName) ||
          (packageIndex > 0 ? cleanText(ticket.ownerName) || null : null),
      }));
      const attendeeNames = attendees.map((attendee) => attendee.name).join(", ");
      const fulfillmentDetails = readFulfillmentDetails(snapshot, snapshots);
      const noteParts = [
        formattedAddress
          ? `Mail physical invitation package to ${formattedAddress}.`
          : "Physical invitation selected, but no mailing address was provided.",
        attendeeNames ? `Attendees in package: ${attendeeNames}.` : "",
        fulfillmentDetails ? `Package contents: ${fulfillmentDetails}` : "",
      ].filter(Boolean);

      await prisma.orderFulfillmentItem.create({
        data: {
          invitationOrderId: order.id,
          sourceType: "physical-invitation",
          sourceId: ticket.id,
          orderCode: order.orderCode,
          lineKey: ticket.lineKey,
          productId: ticket.productId,
          productTitle: "Physical Invitation Package",
          sizeOptionId: ticket.sizeOptionId,
          sizeLabel:
            attendees.length > 1
              ? `${ticketLabel} package for ${attendees.length} attendees`
              : `${ticketLabel} package`,
          purchaseModeId: "physical-invitation",
          purchaseModeLabel:
            ticket.purchaseModeLabel ||
            "Physical Invitation (sent to a physical address)",
          sku: ticket.ticketCode,
          fulfillmentType: "physical",
          quantity: 1,
          currencyCode: order.currencyCode || "USD",
          unitPrice: 0,
          lineTotal: 0,
          recipientUserId: ticket.ownerUserId,
          recipientName: ticket.ownerName,
          recipientEmail: ticket.ownerEmail,
          recipientRole: "ticket-owner",
          ticketCode: ticket.ticketCode,
          ticketAttendeeName: attendeeNames || ticket.ownerName,
          status: "PENDING",
          fulfillmentStatus: "PENDING",
          fulfillmentNotes: noteParts.join("\n"),
          metadata: {
            invitationDeliveryMode: "physical",
            invitationMailingAddress: address,
            ticketLabel,
            attendees,
            peopleCount: attendees.length,
            physicalInvitationFulfillmentDetails: fulfillmentDetails,
          },
        },
      });

      consumedTicketIds.add(ticket.id);
      if (plusOne) {
        consumedTicketIds.add(plusOne.ticket.id);
      }
      created += 1;
    }
  }

  console.log(
    `Checked ${orders.length} orders. Deleted ${deleted} old physical invitation row${
      deleted === 1 ? "" : "s"
    }. Created ${created} grouped physical invitation package${
      created === 1 ? "" : "s"
    }.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
