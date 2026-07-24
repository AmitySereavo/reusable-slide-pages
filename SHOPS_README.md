# Reusable Slides Shops

Reusable Slides supports storefronts that share a cart while allowing different
shop slides to show different catalogs. The invitation flow now uses this to
keep ticket purchasing separate from music and merchandise browsing, while the
cart can still review all selected items together.

## General Users

Users can browse a shop slide, open product details, choose product variants,
adjust quantities, and continue to cart review.

Selecting a product checkbox updates the shared cart directly. The older
separate Add to cart button is no longer part of the browse flow.

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

After order submission, non-ticket digital and physical cart lines are copied
into database-backed fulfillment records. This gives admin a work queue for
digital delivery, physical pickup/delivery, gift cards, music, merchandise, and
ticket add-ons without treating those lines as event tickets.

The first Para-life Trees event shop flow is available as:

```txt
/shop
/questionnaire/little-orchard-shop
```

It uses `src/config/shops/littleOrchardShop.ts` for the configurable event
catalog and `src/config/questionnaires/littleOrchardShopDsl.txt` for the guided
customer flow. Orders are recorded through `POST /api/plant-shop/orders` and
written into the existing Orders dashboard as physical fulfillment items with
the shop source `little_orchard_shop`.

Little Orchard plant products use parent products with size-option variations
when plants differ only by pot size or plant size. For example, Scallion is one
product with four-inch and six-inch options, and Lychee Tree is one product with
small and large options. Each option keeps its own SKU, price, event quantity,
bundle eligibility, and nursery-availability metadata.

Little Orchard order submission records an unpaid order first. It does not mark
inventory as sold. The WhatsApp message includes a secure cashier link; public
visitors who open that link see only a safe cashier-access notice, while
authenticated admins are returned to the filtered Orders dashboard. Cashiers can
use the Little Orchard payment panel to confirm payment. Payment confirmation
checks already confirmed Little Orchard quantities, marks inventory as applied
once, and records a fulfillment activity entry.

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
- order fulfillment status, notes, tracking/delivery references, and recipient
  details from the Orders dashboard

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
- `src/config/shops/littleOrchardShop.ts`
- `src/config/questionnaires/littleOrchardShopDsl.txt`
- `src/lib/shop/getReusableShopCatalog.ts`
- `src/config/questionnaires/invitationDsl.txt`
- `src/config/meals/mealMenus.ts`
- `src/app/dashboard/TicketManager.jsx`
- `src/app/dashboard/OrdersManager.jsx`
- `src/app/api/dashboard/orders/route.ts`
- `src/app/api/invitation/orders/create/route.js`

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

Purchase recipient invite emails use the shared email sender and the protected
website-operation email template:

```txt
website-op-purchase-recipient-invite-link-email
```

That template appears in the admin Email Sequences dashboard with the
`Permanent Website Op` tag and can be updated there.

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

## Orders And Fulfillment

Digital and physical cart lines are stored in `OrderFulfillmentItem` after an
invitation order is created. Ticket lines are intentionally skipped because
ticket access is handled by the ticket assignment/ticket code system.

The long-form reusable fulfillment and shipment tracking requirements live in:

```txt
ORDER_FULFILLMENT_README.md
```

Fulfillment records include:

- source order and order code
- product, SKU, variant, and purchase mode labels
- fulfillment type: `digital` or `physical`
- quantity, currency, unit price, and line total
- purchaser or verified-recipient name/email
- attendee/ticket relationship for ticket add-ons
- fulfillment status, notes, tracking reference, and fulfilled timestamp

Admin can review and update these records from:

```txt
/dashboard/orders
```

The Orders dashboard can filter by status, fulfillment type, and text search.
Updating a fulfillment item changes both `status` and `fulfillmentStatus` so
the admin-facing state stays simple while the model remains ready for future
payment/order status separation.

Existing historical orders may not appear in Orders if they did not contain
non-ticket digital or physical cart lines when the fulfillment table was added.
Future music, merch, gift card, digital deliverable, and ticket add-on orders
should create fulfillment records automatically.

### Courier Selection And Fulfillment Workflow Requirements

During checkout, physical orders should eventually require the purchaser to
choose a preferred delivery method before payment is completed. Courier options
must be loaded dynamically from store configuration and destination rules, not
hardcoded. Selection should consider destination country, parish/state, product
restrictions, shipping method, and configured couriers such as company
delivery, DHL, FedEx, UPS, Jamaica Post, Knutsford Express, Zipmail, in-store
pickup, and other store-defined providers.

The selected courier should be saved with the order and visible throughout the
order lifecycle to administrators, fulfillment staff, customer support,
purchasers, and applicable recipients. Order views should support:

- selected courier
- tracking number
- courier contact information when available
- shipping method
- current fulfillment stage
- estimated delivery date
- estimated remaining time

Fulfillment stages must be configurable per store/workflow. Manual in-house
milestones should use a press-and-drag confirmation slider, not ordinary
buttons, dropdowns, or single-click actions. Examples include items selected,
items packaged, items labeled, package ready for pickup, courier contacted,
awaiting courier pickup, package handed to courier, government documents
prepared, and export documents submitted. Confirmation should record timestamp,
staff member, optional notes, optional uploaded photos/documents, and advance
to the next stage when configured.

Automatic stages should be completed by integrations and scans without manual
confirmation. Examples include packing-station barcode scans, QR dispatch
scans, courier pickup/sorting/transit/delivery scans, customs updates, and
carrier tracking API updates. Automatic updates should record timestamp and
source, such as courier API, barcode scanner, QR scanner, warehouse scanner, or
customs integration.

Every fulfillment update should be written to an activity history containing
stage, timestamp, update type, staff member or automated source, notes, and
uploaded files. Admins should see the complete history. Customers should see a
simplified milestone history with timestamps and whether the update came from
staff or the logistics system.
