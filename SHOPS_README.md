# Reusable Slides Shops

Reusable Slides supports storefronts that share a cart while allowing different
shop slides to show different catalogs. The invitation flow now uses this to
keep ticket purchasing separate from music and merchandise browsing, while the
cart can still review all selected items together.

## General Users

Users can browse a shop slide, open product details, choose product variants,
adjust quantities, and continue to cart review.

Some products can be purchased for other people. Purchase-for-someone now uses
the account's verified recipient list instead of free-entering names during a
rushed checkout moment.

Recipient setup happens from:

```txt
account side panel -> Purchase for others
```

The purchaser enters a recipient name and email address. The recipient receives
an email link and must accept before the purchaser can select that recipient in
the store. The recipient name is prefilled from what the purchaser entered, but
the recipient can correct it. Phone and mailing address are optional during
acceptance, but must be updated before any physical product can be received.

When a verified recipient is selected in the store, the user can still set:

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

Purchased store credit may be used for eligible gifts. Returned store credit
cannot be used to purchase for someone else.

Ticket products use the same verified-recipient selector as music and merch.
Ticket details pulls owner name/email from the ticket-store purchase-for-someone
allocation, so the purchaser mainly reviews and adjusts ticket ownership there.
Recipient-owned ticket email addresses are locked in ticket details so the
purchaser cannot accidentally change a verified recipient's email during
checkout.

The ticket store and music/merch store share the same cart. The checkout button
on either shop should show the full shared cart total, not only the visible
catalog's subtotal.

Ticket meal pricing respects the active account/shop currency. Meal menu prices
are currently authored in USD and converted to the selected/account currency for
display and totals. Meal segments can be configured as included or paid add-on
segments. Paid segments charge from the first selected serving; included
segments allow the configured included serving count before extra-serving
pricing applies.

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
- meal segment billing mode for ticket menus: `included` or `pay`
- ticket upgrades such as meet-and-greet as admin-authored purchase modes, not
  one-off hardcoded options

Current testing values for the invitation music and merch shop:

- max per order: 12
- max per recipient: 2
- maximum recipients per item: 4

Current verified-recipient account value:

- maximum verified recipients per purchaser account: 12

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
- `src/lib/shop/getReusableShopCatalog.ts`
- `src/config/questionnaires/invitationDsl.txt`
- `src/config/meals/mealMenus.ts`
- `src/app/dashboard/TicketManager.jsx`

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

Verified recipients are stored in the database using `PurchaseRecipient`.
Important states:

- `PENDING`: purchaser added the name/email and an invite was sent.
- `VERIFIED`: recipient accepted and can be selected in the store.
- `EXPIRED`: invite expired before acceptance.
- `REMOVED`: reserved for future recipient removal behavior.

Important routes:

- `GET /api/account/purchase-recipients`
- `POST /api/account/purchase-recipients`
- `GET /api/account/purchase-recipients/accept?token=...`
- `POST /api/account/purchase-recipients/accept`
- `/purchase-for-others/accept?token=...`

Quantity rules are enforced in `src/lib/questionnaire/shop.ts` so cart state
remains consistent even if UI behavior changes. The main product quantity is
clamped by product order limits and by recipient-reserved quantities. Recipient
quantity is clamped by recipient limits.

Ticket products now reuse this product/recipient quantity system. When ticket
cart lines include `purchaseRecipients`, ticket assignments are generated with
recipient owner name/email already filled in. The first purchaser-owned ticket
can still autofill from contact/account details, but recipient-owned ticket
slots are not overwritten by purchaser autofill.

Ticket assignment codes use a stable selection-time block once generated. A
separate database-created/finalized timestamp block should be added when real
order finalization writes server-authoritative tickets.
