import { prisma } from "../src/lib/prisma";

const physicalFulfillmentDetails = `Formal welcoming letter acknowledging the purchaser's order requests.
Printed on thick matted paper,
title printed in metallic gold.
Signed by artist and management
and placed in black envelope.

Complimentary pendant per person.
Printed ticket per person.`;

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main() {
  const ticketProducts = await prisma.reusableShopProduct.findMany({
    where: {
      catalogKey: {
        in: ["invitationTickets", "invitationOrder"],
      },
      fulfillmentType: "ticket",
    },
    include: {
      sizeOptions: {
        include: {
          purchaseModes: true,
        },
      },
    },
  });

  for (const product of ticketProducts) {
    await prisma.reusableShopProduct.update({
      where: {
        id: product.id,
      },
      data: {
        metadata: {
          ...readRecord(product.metadata),
          physicalInvitationFulfillmentDetails: physicalFulfillmentDetails,
        },
      },
    });

    const physicalModes = product.sizeOptions.flatMap((sizeOption) =>
      sizeOption.purchaseModes.filter(
        (mode) => mode.modeId === "physical-invitation"
      )
    );

    for (const mode of physicalModes) {
      await prisma.reusableShopPurchaseMode.update({
        where: {
          id: mode.id,
        },
        data: {
          metadata: {
            ...readRecord(mode.metadata),
            physicalInvitationFulfillmentDetails: physicalFulfillmentDetails,
          },
        },
      });
    }
  }

  const physicalItems = await prisma.orderFulfillmentItem.findMany({
    where: {
      sourceType: "physical-invitation",
    },
  });

  for (const item of physicalItems) {
    const metadata = readRecord(item.metadata);
    const address = metadata.invitationMailingAddress;
    const attendees = Array.isArray(metadata.attendees) ? metadata.attendees : [];
    const attendeeNames = attendees
      .map((attendee) => readRecord(attendee).name)
      .filter(Boolean)
      .join(", ");
    const existingNotes = String(item.fulfillmentNotes ?? "")
      .split("\n")
      .filter((line) => !line.startsWith("Package contents:"))
      .join("\n")
      .trim();

    await prisma.orderFulfillmentItem.update({
      where: {
        id: item.id,
      },
      data: {
        fulfillmentNotes: [
          existingNotes,
          `Package contents: ${physicalFulfillmentDetails}`,
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: {
          ...metadata,
          invitationMailingAddress: address ?? null,
          attendees,
          peopleCount:
            typeof metadata.peopleCount === "number"
              ? metadata.peopleCount
              : attendees.length || 1,
          physicalInvitationFulfillmentDetails: physicalFulfillmentDetails,
        },
      },
    });
  }

  console.log(
    `Updated ${ticketProducts.length} ticket product record${
      ticketProducts.length === 1 ? "" : "s"
    } and ${physicalItems.length} physical order item${
      physicalItems.length === 1 ? "" : "s"
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
