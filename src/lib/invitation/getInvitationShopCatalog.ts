import type { ShopCatalog } from "@/types/questionnaire";

const ESCAPE_ALBUM_PURCHASE_MODE = {
  id: "standard-with-escape-album",
  sku: "TIX-BUNDLE-ESC-DIGITAL",
  label: "With Escape Album",
  priceAdjustment: 0,
  requiresPhysicalFulfillment: false,
  bundledCartItems: [
    {
      productId: "escape-album-digital",
      sizeOptionId: "escape-album-full-download",
      purchaseModeId: "download-access",
      quantity: 1,
    },
  ],
};

export function getInvitationShopCatalog(): ShopCatalog {
  return {
    currencyCode: "USD",
    weightUnit: "lb",
    products: [
      {
        id: "ranny-williams-july-1-event",
        sku: "EVENT-RW-JUL01",
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
            sku: "TIX-RW-GA-EMAIL",
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
                sku: "TIX-RW-GA-EMAIL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              ESCAPE_ALBUM_PURCHASE_MODE,
            ],
          },
          {
            id: "ranny-williams-general-physical-invitation",
            sku: "TIX-RW-GA-PHYSICAL",
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
                sku: "TIX-RW-GA-PHYSICAL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
              {
                ...ESCAPE_ALBUM_PURCHASE_MODE,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "ranny-williams-vip-email-invitation",
            sku: "TIX-RW-VIP-EMAIL",
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
                sku: "TIX-RW-VIP-EMAIL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              ESCAPE_ALBUM_PURCHASE_MODE,
            ],
          },
          {
            id: "ranny-williams-vip-physical-invitation",
            sku: "TIX-RW-VIP-PHYSICAL",
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
                sku: "TIX-RW-VIP-PHYSICAL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
              {
                ...ESCAPE_ALBUM_PURCHASE_MODE,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
        ],
      },
      {
        id: "phoenix-toronto-event",
        sku: "EVENT-PHX-TOR",
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
            sku: "TIX-PHX-GA-EMAIL",
            label: "General Admission Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 35,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                sku: "TIX-PHX-GA-EMAIL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              ESCAPE_ALBUM_PURCHASE_MODE,
            ],
          },
          {
            id: "phoenix-toronto-general-physical-invitation",
            sku: "TIX-PHX-GA-PHYSICAL",
            label: "Physical-General Admission Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 43,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                sku: "TIX-PHX-GA-PHYSICAL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
              {
                ...ESCAPE_ALBUM_PURCHASE_MODE,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "phoenix-toronto-vip-email-invitation",
            sku: "TIX-PHX-VIP-EMAIL",
            label: "VIP Invitation",
            description:
              "Use sent email along with your email address and ID to enter the event.",
            price: 70,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                sku: "TIX-PHX-VIP-EMAIL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              ESCAPE_ALBUM_PURCHASE_MODE,
            ],
          },
          {
            id: "phoenix-toronto-vip-physical-invitation",
            sku: "TIX-PHX-VIP-PHYSICAL",
            label: "Physical-VIP Invitation",
            description:
              "Official printed and signed letter sent to your mailing address.",
            price: 78,
            weight: 0,
            purchaseModes: [
              {
                id: "standard",
                sku: "TIX-PHX-VIP-PHYSICAL",
                label: "Standard",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: true,
              },
              {
                ...ESCAPE_ALBUM_PURCHASE_MODE,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function getMusicMerchShopCatalog(): ShopCatalog {
  return {
    currencyCode: "USD",
    weightUnit: "lb",
    products: [
      {
        id: "store-credit",
        sku: "CREDIT-STORE",
        slug: "store-credit",
        fulfillmentType: "digital",
        enableStoreCreditPurchase: false,
        enablePurchaseForOthers: false,
        minOrderQuantity: 1,
        maxOrderQuantity: 20,
        title: "Purchased Store Credit",
        imageUrl: "/media/shop/store-credit.svg",
        description:
          "Add purchased credit to your account for future reusable slides purchases. Purchased credit can be used for your own purchases and eligible purchases for others. Returned credit is separate and cannot be used to purchase for someone else.",
        sizeOptions: [
          { id: "credit-10", sku: "CREDIT-STORE-10", label: "US$10 Credit", price: 10, weight: 0 },
          { id: "credit-25", sku: "CREDIT-STORE-25", label: "US$25 Credit", price: 25, weight: 0 },
          { id: "credit-50", sku: "CREDIT-STORE-50", label: "US$50 Credit", price: 50, weight: 0 },
          { id: "credit-100", sku: "CREDIT-STORE-100", label: "US$100 Credit", price: 100, weight: 0 },
        ],
      },
      {
        id: "digital-gift-card",
        sku: "GIFT-CARD",
        slug: "digital-gift-card",
        fulfillmentType: "digital",
        enableStoreCreditPurchase: false,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Digital Gift Card",
        imageUrl: "/media/shop/gift-card.svg",
        description:
          "Send a reusable slides gift card by email. A printed physical option can be selected for pickup or delivery testing.",
        sizeOptions: [
          {
            id: "gift-card-25",
            sku: "GIFT-CARD-25",
            label: "US$25 Gift Card",
            price: 25,
            weight: 0,
            purchaseModes: [
              {
                id: "digital",
                sku: "GIFT-CARD-25-DIGITAL",
                label: "Digital delivery",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              {
                id: "physical",
                sku: "GIFT-CARD-25-PHYSICAL",
                label: "Printed physical card",
                priceAdjustment: 5,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
          {
            id: "gift-card-50",
            sku: "GIFT-CARD-50",
            label: "US$50 Gift Card",
            price: 50,
            weight: 0,
            purchaseModes: [
              {
                id: "digital",
                sku: "GIFT-CARD-50-DIGITAL",
                label: "Digital delivery",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
              {
                id: "physical",
                sku: "GIFT-CARD-50-PHYSICAL",
                label: "Printed physical card",
                priceAdjustment: 5,
                requiresPhysicalFulfillment: true,
              },
            ],
          },
        ],
      },
      {
        id: "escape-album-digital",
        sku: "ALB-ESC-DIGITAL",
        slug: "escape-album-digital",
        fulfillmentType: "digital",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Escape Album — Digital Download",
        imageUrl: "/media/invitation/Escape album artwork 640 by 640.jpg",
        description:
          "Get secure email access to download the full Escape album.\n\nBoth MP3 and WAV download links will be available after purchase.",
        sizeOptions: [
          {
            id: "escape-album-full-download",
            sku: "ALB-ESC-DIGITAL",
            label: "Full Album Download",
            price: 12,
            weight: 0,
            purchaseModes: [
              {
                id: "download-access",
                sku: "ALB-ESC-DIGITAL",
                label: "Email secure download access",
                priceAdjustment: 0,
                requiresPhysicalFulfillment: false,
              },
            ],
          },
        ],
      },
      {
        id: "escape-album-physical",
        sku: "ALB-ESC-PHYSICAL",
        slug: "escape-album-physical",
        fulfillmentType: "physical",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Escape Album - Physical Copy",
        imageUrl: "/media/shop/escape-album-physical.svg",
        description:
          "Collect a physical Escape album copy at the event. Placeholder pricing for checkout-flow testing.",
        sizeOptions: [
          {
            id: "escape-album-cd",
            sku: "ALB-ESC-CD",
            label: "CD",
            price: 20,
            weight: 0.25,
          },
          {
            id: "escape-album-vinyl",
            sku: "ALB-ESC-VINYL",
            label: "Vinyl",
            price: 35,
            weight: 1.2,
          },
        ],
      },
      {
        id: "amity-signature-tshirt",
        sku: "MERCH-TEE-AS",
        slug: "amity-signature-tshirt",
        fulfillmentType: "physical",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Amity Sereavo Signature T-Shirt",
        imageUrl: "/media/shop/amity-tshirt.svg",
        description:
          "Event merch placeholder for testing sizes, quantities, cart review, and pickup handling.",
        sizeOptions: [
          { id: "small", sku: "MERCH-TEE-AS-S", label: "Small", price: 28, weight: 0.45 },
          { id: "medium", sku: "MERCH-TEE-AS-M", label: "Medium", price: 28, weight: 0.45 },
          { id: "large", sku: "MERCH-TEE-AS-L", label: "Large", price: 28, weight: 0.45 },
          { id: "x-large", sku: "MERCH-TEE-AS-XL", label: "X-Large", price: 30, weight: 0.5 },
        ],
      },
      {
        id: "amity-tote-bag",
        sku: "MERCH-BAG-AS",
        slug: "amity-tote-bag",
        fulfillmentType: "physical",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Amity Sereavo Tote Bag",
        imageUrl: "/media/shop/amity-tote.svg",
        description:
          "Reusable merch bag placeholder for testing physical add-on ordering.",
        sizeOptions: [
          { id: "standard", sku: "MERCH-BAG-AS-STD", label: "Standard Tote", price: 22, weight: 0.4 },
        ],
      },
      {
        id: "amity-armband",
        sku: "MERCH-ARMBAND-AS",
        slug: "amity-armband",
        fulfillmentType: "physical",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Amity Sereavo Armband",
        imageUrl: "/media/shop/amity-armband.svg",
        description:
          "Armband placeholder for testing small merchandise add-ons.",
        sizeOptions: [
          { id: "one-size", sku: "MERCH-ARMBAND-AS-OS", label: "One Size", price: 12, weight: 0.1 },
        ],
      },
      {
        id: "amity-hat",
        sku: "MERCH-HAT-AS",
        slug: "amity-hat",
        fulfillmentType: "physical",
        enableStoreCreditPurchase: true,
        enablePurchaseForOthers: true,
        maxPurchaseForOthers: 4,
        minOrderQuantity: 1,
        maxOrderQuantity: 12,
        minRecipientQuantity: 1,
        maxRecipientQuantity: 2,
        title: "Amity Sereavo Hat",
        imageUrl: "/media/shop/amity-hat.svg",
        description:
          "Hat placeholder for testing merch selection and event pickup.",
        sizeOptions: [
          { id: "dad-hat", sku: "MERCH-HAT-AS-DAD", label: "Dad Hat", price: 26, weight: 0.35 },
          { id: "snapback", sku: "MERCH-HAT-AS-SNAP", label: "Snapback", price: 30, weight: 0.4 },
        ],
      },
    ],
  };
}

export function getInvitationOrderCatalog(): ShopCatalog {
  const ticketCatalog = getInvitationShopCatalog();
  const musicMerchCatalog = getMusicMerchShopCatalog();

  return {
    currencyCode: ticketCatalog.currencyCode,
    weightUnit: ticketCatalog.weightUnit,
    products: [...ticketCatalog.products, ...musicMerchCatalog.products],
  };
}
