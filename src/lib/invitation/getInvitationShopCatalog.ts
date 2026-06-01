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
        title: "Amity Sereavo Live — Ranny Williams Entertainment Centre",
        imageUrl: "/media/invitation/ranny-williams-ticket.jpg",
        description:
        "Kingston, Jamaica · July 1 · Select your invitation type. Eligible invitations include meal selection. You will choose meal details for each ticket owner on the ticket details page.",
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
        title: "Amity Sereavo Live — Phoenix Concert Theatre, Toronto",
        imageUrl: "/media/invitation/phoenix-toronto-ticket.jpg",
        description:
          "Toronto, Canada · Date TBA · Select your ticket option. Email confirmation and access details will be sent after purchase.",
        sizeOptions: [
          {
            id: "phoenix-toronto-general-ticket",
            label: "General Admission Ticket",
            price: 35,
            weight: 0,
            purchaseModes: [
              {
                id: "email-only",
                label: "Email ticket only",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              {
                id: "email-plus-physical",
                label: "Email ticket + physical ticket",
                priceAdjustment: 8,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "phoenix-toronto-vip-ticket",
            label: "VIP Ticket",
            price: 70,
            weight: 0,
            purchaseModes: [
              {
                id: "email-only",
                label: "Email ticket only",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              {
                id: "email-plus-physical",
                label: "Email ticket + physical ticket",
                priceAdjustment: 8,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "phoenix-toronto-escape-album-download",
            label: "Escape Album Digital Download",
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
      {
        id: "escape-album-digital",
        slug: "escape-album-digital",
        fulfillmentType: "digital",
        title: "Escape Album — Digital Download",
        imageUrl: "/media/invitation/escape-album-cover.jpg",
        description:
          "Get secure email access to download the full Escape album. Both MP3 and WAV download links will be available after purchase.",
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