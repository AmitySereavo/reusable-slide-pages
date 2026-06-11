import type { ShopCatalog } from "@/types/questionnaire";

export function getInvitationShopCatalog(): ShopCatalog {
  return {
    currencyCode: "USD",
    weightUnit: "lb",
    products: [
      {
        id: "ranny-williams-july-1-event",
        slug: "ranny-williams-july-1-event",
        fulfillmentType: "ticket",
        title: "Amity Sereavo Live",
        imageUrl: "/media/invitation/ranny-williams-ticket.png",
        eventVenueLabel: "Ranny Williams Entertainment Centre",
        eventAddress: "36 Hope Road, Kingston 6, Jamaica",
        eventDateLabel: "July 1",
        eventTimeLabel: "7:00 PM",
        description:
        "Kingston, Jamaica · Ranny Williams Entertainment Centre · Select your invitation type.",
        detailsDescription:
          "Select your invitation type.\n\nEligible invitations include meal selection.\n\nYou will choose meal details for each ticket owner on the ticket details page.",
        sizeOptions: [
          {
            id: "ranny-williams-general-email-invitation",
            label: "General Admission Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 25,
            weight: 0,
            mealSelection: {
              mode: "required",
              menuId: "vegan-event-menu",
              label: "Included vegan meal",
            },
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
          {
            id: "ranny-williams-general-physical-invitation",
            label: "Physical-General Admission Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 33,
            weight: 0,
            mealSelection: {
              mode: "required",
              menuId: "vegan-event-menu",
              label: "Included vegan meal",
            },
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "ranny-williams-vip-email-invitation",
            label: "VIP Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 50,
            weight: 0,
            mealSelection: {
              mode: "required",
              menuId: "vegan-event-menu",
              label: "Included vegan meal",
            },
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
          {
            id: "ranny-williams-vip-physical-invitation",
            label: "Physical-VIP Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 58,
            weight: 0,
            mealSelection: {
              mode: "required",
              menuId: "vegan-event-menu",
              label: "Included vegan meal",
            },
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
        ],
      },
      {
        id: "phoenix-toronto-event",
        slug: "phoenix-toronto-event",
        fulfillmentType: "ticket",
        title: "Amity Sereavo Live, Toronto",
        imageUrl: "/media/invitation/phoenix-toronto-ticket.png",
         eventVenueLabel: "Phoenix Concert Theatre",
        eventAddress: "410 Sherbourne Street, Toronto, Ontario, Canada",
        eventDateLabel: "July 7",
        eventTimeLabel: "6:00 PM",
         description:
          "Toronto, Canada · Date TBA · Select your invitation type. Email confirmation and access details will be sent after purchase.",
        detailsDescription:
          "Select your invitation type.\n\nEligible invitations include meal selection.\n\nYou will choose meal details for each ticket owner on the ticket details page.",
                
sizeOptions: [
          {
            id: "phoenix-toronto-general-email-invitation",
            label: "General Admission Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 35,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
          {
            id: "phoenix-toronto-general-physical-invitation",
            label: "Physical-General Admission Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 43,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "phoenix-toronto-vip-email-invitation",
            label: "VIP Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 70,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
          {
            id: "phoenix-toronto-vip-physical-invitation",
            label: "Physical-VIP Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 78,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
        ],
      },
      {
        id: "escape-album-digital",
        slug: "escape-album-digital",
        fulfillmentType: "digital",
        title: "Escape Album — Digital Download",
        imageUrl: "/media/invitation/Escape album artwork 640 by 640.jpg",
        description:
          "Get secure email access to download the full Escape album.\n\nBoth MP3 and WAV download links will be available after purchase.",
        sizeOptions: [
          {
            id: "escape-album-full-download",
            label: "Full Album Download",
            price: 12,
            weight: 0,
            purchaseModes: [
              {
                id: "download-access",
                label: "Email secure download access",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
        ],
      },
    ],
  };
}