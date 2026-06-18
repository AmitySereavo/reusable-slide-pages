# Reusable Slides Shops

Reusable Slides supports storefronts that share a cart while allowing different
shop slides to show different catalogs. The invitation flow now uses this to
keep ticket purchasing separate from music and merchandise browsing, while the
cart can still review all selected items together.

## General Users

Users can browse a shop slide, open product details, choose product variants,
adjust quantities, and continue to cart review.

Some products can be purchased for other people. When that option is enabled,
the user can add recipients with:

- recipient name
- recipient email address
- optional note
- recipient-specific quantity

Recipient quantities reserve items for those recipients. Any product quantity
above the recipient-reserved total belongs to the account holder or purchaser.

Example:

- product quantity: 5
- recipient A quantity: 2
- recipient B quantity: 1
- account holder quantity: 2

The main product quantity cannot be reduced below the total reserved for
recipients.

Store credit is not selected on product browse screens. Store credit should be
selected in the cart or payment step, and only for enabled items being purchased
for the account holder.

## Admins

Admins should eventually manage shop products from a dashboard instead of
editing project files.

The product dashboard should support:

- product title, description, and storefront category
- product media upload
- SKU and variant SKU management
- digital, physical, or ticket fulfillment type
- variant labels, prices, and weights
- storefront placement across multiple shop slides
- purchase with store credit enablement
- purchase for others enablement
- maximum number of recipients per item
- minimum and maximum quantity per order
- minimum and maximum quantity per recipient
- event pickup, delivery, digital access, or other fulfillment settings

Current testing values for the invitation music and merch shop:

- max per order: 12
- max per recipient: 2
- maximum recipients per item: 4

## Developers

Shop slides are configured in DSL using:

```txt
@type: shop
@store: orderCart
@catalog: musicMerchShopCatalog
@shopmode: browse
```

The cart/review slide can use a combined catalog:

```txt
@type: shop
@store: orderCart
@catalog: orderCatalog
@shopmode: review
```

Important files:

- `src/types/questionnaire.ts`
- `src/lib/questionnaire/shop.ts`
- `src/components/questionnaire/QuestionnaireShell.tsx`
- `src/lib/invitation/getInvitationShopCatalog.ts`
- `src/config/questionnaires/invitationDsl.txt`

Core product fields include:

- `id`
- `sku`
- `slug`
- `fulfillmentType`
- `enableStoreCreditPurchase`
- `enablePurchaseForOthers`
- `maxPurchaseForOthers`
- `minOrderQuantity`
- `maxOrderQuantity`
- `minRecipientQuantity`
- `maxRecipientQuantity`
- `sizeOptions`

Recipient data is stored on each cart line as `purchaseRecipients`.

Quantity rules are enforced in `src/lib/questionnaire/shop.ts` so cart state
remains consistent even if UI behavior changes. The main product quantity is
clamped by product order limits and by recipient-reserved quantities. Recipient
quantity is clamped by recipient limits.

Future ticket work should reuse this product/recipient quantity system where it
fits, so purchasing multiple tickets can become cleaner and less tied to a
ticket-only flow.
