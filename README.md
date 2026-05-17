# Reusable Slide Pages

A reusable, registry-driven, DSL-powered slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

The project renders interactive multi-slide experiences from plain-text DSL files instead of hardcoding every flow directly in React. It supports marketing funnels, questionnaires, media-rich video flows, storefront pages, delivery/pickup flows, contact capture, digital downloads, ticket/invitation flows, ticket-owner assignment, per-ticket meal selection, DB-backed nursery operations, record lists, and reusable profile blocks.

## Current stack

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- Framer Motion
- Zod
- React Hook Form
- Git LFS for large media when needed

## Core concept

Each slide experience is configured by:

- a DSL file
- a registry entry
- a theme
- variables
- optional dynamic variables
- optional shop catalog data
- optional delivery config
- optional meal menu config
- optional reusable block definitions
- optional downloadable file catalog entries

Shared route:

```txt
/questionnaire/[slug]
```

The shared shell stays generic. Project-specific wording belongs in DSL files, config files, catalog helpers, registry variables, or isolated server helpers.

Reusable behavior belongs in the shared parser, shell, types, route handlers, or shared library helpers.

## Active questionnaires

### `self-trust`

A score-based self-trust flow.

Route:

```txt
/questionnaire/self-trust
```

### `garden-herbs`

A content questionnaire for garden herbs.

Route:

```txt
/questionnaire/garden-herbs
```

### `seed`

A plant/seed funnel with DB-backed shop catalog, delivery selection, contact capture, review order, discounts, and promotion item logic.

Route:

```txt
/questionnaire/seed
```

### `invitation`

A media-first invitation and storefront flow for music, event tickets/invitations, album downloads, per-ticket owner details, per-ticket meal selection, and future gated download/ticket access.

Current capabilities:

- vertical video intro slides
- video-linked progress bar
- video start timestamp
- video timestamp routing to another slide
- performance rating slide
- WhatsApp subscription form
- invitation/event shop
- ticket/invitation purchase options
- ticket-owner details page
- generated temporary ticket codes per selected ticket
- optional ticket owner name, email, and WhatsApp/phone
- required and optional per-ticket meal support
- per-ticket meal selection instead of aggregate meal totals
- optional meal add-on pricing
- extra serving pricing support
- meal notes per ticket
- digital album purchase options
- physical-fulfillment-aware checkout routing
- contact-only routing for digital/email-only orders
- private file download API
- reusable DSL download buttons
- download started confirmation notice

Route:

```txt
/questionnaire/invitation
```

### `nursery-ops`

A DB-backed nursery operations flow for batches, batch subsets, transplanted individuals, record lists, and reusable block-driven profiles.

Route:

```txt
/questionnaire/nursery-ops
```

### `generic-profile-flow`

A reusable profile-flow testbed.

Route:

```txt
/questionnaire/generic-profile-flow
```

## Registry architecture

Questionnaires are registered in:

```txt
src/config/questionnaires/registry.ts
```

Each registry entry can define:

- `slug`
- `name`
- `themeKey`
- `theme`
- `dslPath`
- `showStepText`
- `overlayMode`
- `variables`
- `dynamicVariablesEndpoint`

The registry loads the DSL, injects variables, parses slides, injects reusable blocks, and returns the config and theme to the shared route.

For invitation flows, the registry can inject:

```txt
shopCatalog
deliveryConfig
discountDefinitions
mealMenus
```

## DSL file format

DSL files are plain text files.

Examples:

```txt
src/config/questionnaires/selfTrustDsl.txt
src/config/questionnaires/gardenHerbsDsl.txt
src/config/questionnaires/seedDsl.txt
src/config/questionnaires/seedDsl2.txt
src/config/questionnaires/invitationDsl.txt
src/config/questionnaires/nurseryOpsDsl.txt
```

Slides are separated with:

```txt
===
```

Do not wrap DSL files in TypeScript exports.

## Supported slide types

- `content`
- `score`
- `choice`
- `form`
- `contact`
- `media`
- `video`
- `shop`
- `tickets`
- `meal`
- `delivery`
- `recordlist`

## Supported DSL directives

Current DSL directives include:

```txt
@id:
@type:
@title:
@subtitle:
@titleplacement:
@store:
@source:
@block:
@blocksource:
@titlefield:
@subtitlefield:
@metafields:
@emptytext:
@feature:
@fields:
@choices:
@choiceplacement:
@downloadbuttons:
@when:
@backwhen:
@showif:
@run:
@downloadkey:
@back:
@backgoto:
@showback:
@shownext:
@countstep:
@showsteptext:
@showreturnhome:
@showcancel:
@cancelgoto:
@next:
@goto:
@buttonstyle:
@backstyle:
@nextstyle:
@media:
@embed:
@mediatype:
@mediaaspect:
@autoplay:
@progressmode:
@videostart:
@videogoto:
@pagebgcolor:
@pagebgimage:
@pagebgsize:
@pagebgposition:
@cardopacity:
@progressoverlaybg:
@actionbarbg:
@progressoverlaytextcolor:
@actionbartextcolor:
@catalog:
@shopmode:
@ticketgoto:
@mealgoto:
@mealmenu:
@deliverygoto:
@contactgoto:
@reviewgoto:
@deliveryconfig:
@completioncheck:
@gotoifcomplete:
@gotoifincomplete:
@contactmode:
```

## Basic DSL examples

### Content slide

```txt
===
@id: intro
@type: content
---
BR
# [c1] Welcome
[c3] This is a reusable slide.
@next: Continue
@goto: next-slide
```

### Score slide

```txt
===
@id: performance-rating
@type: score
---
# [c1] How would you rate the performance?
@feature: numberscale(1,2,[3],4,5)
@store: performanceRating
@when:
- performanceRating|in|3,4,5|subscribe
- performanceRating|in|1,2|low-rating-choice
@next: Continue
```

### Choice slide

```txt
===
@id: low-rating-choice
@type: choice
---
# [c2] What do you want to do then?
@store: lowRatingDecision
@choices:
- exit|Exit|exit-page|c2
- continue|Continue Watching|subscribe|c1
@shownext: false
```

### Form slide

```txt
===
@id: contact-details
@type: form
@contactmode: order
---
# [c1] Contact Details
@fields:
- fullName|text|Full name|required|Full name
- email|email|Email address|required|Email address
- phone|tel|Phone number|optional|Optional
@run: submitLead
@next: Review Order
@goto: review-order
```

### Date field example

```txt
===
@id: activity-date
@type: form
# Choose the date
@fields:
- opsActivityDate|date|Activity date|required|Select date
@back: Back
@next: Continue
```

### Select field example

```txt
===
@id: container-choice
@type: form
# Select the container
@fields:
- opsContainerType|select|Starting container|required|Select container|2.5 inch pot,4 inch pot,6 inch pot,8x16 tray,cup,grow bag,bucket,other
@back: Back
@next: Continue
```

## Media and video slide system

Media slides support images, videos, and embeds.

Basic video slide:

```txt
===
@id: home
@type: media
@media: /media/invitation/YYSSLYX.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@countstep: false
@showback: false
@next: Get Tickets
@goto: invitation-shop
```

### Video progress mode

A video slide can replace the normal slide progress bar with a video-linked progress bar:

```txt
@progressmode: video
```

This lets the progress control represent video progress and scrub the video position.

### Video start timestamp

A video can start at a configured timestamp:

```txt
@videostart: 00:12
```

Supported formats:

```txt
12
00:12
01:05
01:02:30
```

### Video timestamp routing

A video can route to another slide when it crosses a timestamp:

```txt
@videogoto: 00:45|performance-rating
```

The route can trigger again if the user returns to the video slide and the video crosses the timestamp again.

### Video button routing

The same video slide can still have a normal action button:

```txt
@next: Get Tickets
@goto: invitation-shop
```

This means the video can automatically route to a rating slide at a timestamp while the button routes to the shop.

## Shop system

The reusable `shop` slide renders a structured `shopCatalog`.

The catalog supports:

- products
- product images
- product descriptions
- product fulfillment type
- size/order options
- optional purchase modes
- optional meal requirements on size options or purchase modes
- line quantities
- review mode
- discounts
- conditional ticket/details, meal, delivery, contact, and review routing

Basic shop slide:

```txt
===
@id: invitation-shop
@type: shop
@store: orderCart
@catalog: shopCatalog
@shopmode: browse
@ticketgoto: ticket-details
@mealgoto: meal-selection
@deliverygoto: delivery-options
@contactgoto: contact-details
@reviewgoto: review-order
@next: Checkout
```

Shop browse routing for invitation-style flows:

```txt
Shop → Ticket Details
```

The ticket details slide then controls whether the user selects meals, continues to delivery, continues to contact details, or reaches review order.

## Fulfillment model

The shop catalog separates product category from fulfillment need.

Product fulfillment types:

```ts
"physical" | "digital" | "ticket";
```

Physical fulfillment is determined by:

- physical product type
- or a selected purchase mode with `requiresPhysicalFulfillment: true`

This supports:

- digital album only
- email-only ticket
- email-only invitation
- ticket plus physical ticket
- invitation plus physical invitation
- physical products
- mixed carts

Example ticket/invitation purchase modes:

```ts
purchaseModes: [
  {
    id: "email-only",
    label: "Email invitation only",
    priceAdjustment: 0,
    requiresPhysicalFulfillment: false,
  },
  {
    id: "email-plus-physical",
    label: "Email invitation + physical invitation",
    priceAdjustment: 8,
    requiresPhysicalFulfillment: true,
  },
];
```

This lets the same reusable system support different event wording:

- ticket
- invitation
- request invitation
- physical ticket
- physical invitation

## Ticket details system

The reusable `tickets` slide creates one ticket assignment panel for every selected ticket/invitation quantity.

Ticket assignment data is derived from selected shop lines and stored in:

```txt
ticketAssignments
```

Each generated ticket assignment supports:

- temporary generated ticket code
- product and ticket label
- ticket owner name
- ticket owner email
- ticket owner WhatsApp/phone
- required meal status
- optional meal add-on status
- selected meal data
- per-ticket meal notes

Current ticket code behavior:

- generated in the frontend from selected cart line data
- stable during the checkout session
- intended to be replaced or persisted by database-backed ticket codes after order/payment submission

Example ticket details slide:

```txt
===
@id: ticket-details
@type: tickets
@store: ticketAssignments
@mealgoto: meal-selection
@deliverygoto: delivery-options
@contactgoto: contact-details
@reviewgoto: review-order
@back: Back
@next: Continue
---
BR
# [c1] Ticket Details
BR
[c2] Add the ticket owner's details if you want each person to receive their own ticket or meal link.
[c3] Name, email, and WhatsApp are optional.
```

Current intended flow:

```txt
Shop
→ Ticket Details
→ Select meal for a specific ticket when needed
→ Ticket Details
→ Delivery / Contact / Review
```

Meal selection is entered from each ticket panel, not as one long aggregate meal page.

Future ticket-owner access direction:

- ticket purchaser can enter owner name/email/phone per ticket
- system can later email each ticket owner their own meal-access link
- owner can verify by code
- owner sees only their own ticket details
- owner can choose or update their meal before the meal cutoff date
- after cutoff, meal editing should lock
- additional meal charges can route to a payment step

## Meal selection system

Meal selection is per ticket, not aggregate across the whole order.

This solves the serving/chef pairing problem.

Instead of only knowing:

```txt
Plain rice × 2
Rice and peas × 1
Stew peas × 2
Curry chickpeas × 1
```

the system can preserve:

```txt
Ticket 1 / John Brown
Base: Plain rice
Main: Curry chickpeas
Side: Plantain

Ticket 2 / Marsha Green
Base: Rice and peas
Main: Stew peas
Side: Potato salad
```

Meal config lives in:

```txt
src/config/meals/mealMenus.ts
```

Reusable ticket helpers live in:

```txt
src/lib/questionnaire/tickets.ts
```

Meal menu options can include optional pricing:

```ts
{
  id: "plain-rice",
  label: "Plain rice",
  price: 3,
}
```

Meal groups can define included servings:

```ts
{
  id: "base",
  label: "Choose your base",
  required: true,
  includedServings: 1,
  options: [
    { id: "plain-rice", label: "Plain rice", price: 3 },
    { id: "rice-and-peas", label: "Rice and peas", price: 4 },
  ],
}
```

Meal requirement can be attached to a size option or purchase mode:

```ts
mealSelection: {
  mode: "required",
  menuId: "vegan-event-menu",
  label: "Included vegan meal",
}
```

Optional paid meal add-on:

```ts
mealSelection: {
  mode: "optional",
  menuId: "vegan-event-menu",
  label: "Add vegan meal",
  price: 15,
}
```

Current meal behavior:

- required meal tickets always require meal selection
- optional meal tickets can show an add-meal checkbox
- meal selection edits the selected ticket only
- per-ticket notes are supported
- customer can indicate they may want extra food at the event
- extra servings can be priced from the meal menu config
- review can display ticket meals and meal add-on / extra serving totals

## Invitation shop catalog

Invitation shop data lives in:

```txt
src/lib/invitation/getInvitationShopCatalog.ts
```

The invitation catalog can include:

- event products
- ticket products
- invitation products
- album download options
- email-only fulfillment
- physical invitation fulfillment
- album-only products
- album add-on options inside event products
- ticket options with required meals
- ticket options with optional paid meals

Current intended product shape:

```txt
Event product
→ General Admission Invitation
→ VIP Invitation
→ Escape Album Digital Download
```

The album can also exist as a separate product so users can purchase it without buying an event ticket/invitation.

## Contact and delivery behavior

Every order should collect contact information.

Invitation-style orders:

```txt
Shop → Ticket Details → Contact Details → Review Order
```

Invitation-style orders with physical fulfillment:

```txt
Shop → Ticket Details → Delivery Options → Contact Details if needed → Review Order
```

Invitation-style orders with meals:

```txt
Shop
→ Ticket Details
→ Select meal for ticket
→ Ticket Details
→ Delivery / Contact / Review
```

Digital or email-only orders without ticket details:

```txt
Shop → Contact Details → Review Order
```

Orders with physical fulfillment:

```txt
Shop → Delivery Options → Contact Details if needed → Review Order
```

The reusable delivery slide supports:

- pickup at configured locations
- pop-up/event pickup
- delivery to address
- country selection
- region selection
- address fields
- computed delivery fee
- conditional routing based on contact completeness

Digital orders do not need address/phone unless the DSL requires it.

## Review order behavior

The review screen conditionally displays summary details.

Current behavior:

- contact information remains visible after submission
- delivery fee only shows when delivery applies
- discount total only shows when a discount exists
- total order weight only shows when at least one selected line has real weight
- zero-weight physical items such as tickets/invitations do not display meaningless weight
- order line weights are hidden when weight is `0`
- ticket meals can be summarized per ticket
- meal add-ons / extra servings can be displayed as an additional meal total
- total due always shows

Meal add-on total is currently calculated and displayed in the review meal summary. A later step should fully merge meal add-on totals into the main order grand total and payment amount.

## Download system

The project supports reusable private downloads without third-party hosting.

Files are stored outside `public`:

```txt
private-downloads/
```

Example:

```txt
private-downloads/Good Morning.mp3
```

The browser cannot directly access this folder. Downloads are served through:

```txt
src/app/api/downloads/[downloadKey]/route.ts
```

Download catalog:

```txt
src/config/downloads/downloadCatalog.ts
```

Example catalog item:

```ts
{
  key: "escape-album-mp3",
  filePath: "private-downloads/Good Morning.mp3",
  fileName: "Good Morning.mp3",
  contentType: "audio/mpeg",
}
```

The API route serves:

```txt
/api/downloads/escape-album-mp3
```

The route is dynamic because the URL key selects the catalog item.

### Download buttons in DSL

A slide can show multiple download buttons in the action bar:

```txt
@downloadbuttons:
- escape-album-mp3|Download MP3|c1
- escape-album-wav|Download WAV|c3
```

The shell opens downloads in a new tab and shows a confirmation notice on the current slide.

Example download slide:

```txt
===
@id: escape-album-download
@type: content
@countstep: false
@showback: true
@shownext: false
@back: Back
---
BR
# [c1] Escape Album
# [c3] Digital Download
BR
[c2] Download the album in the format you want.
[c2] MP3 and WAV access will stay available from this page after purchase.

@downloadbuttons:
- escape-album-mp3|Download MP3|c1
- escape-album-wav|Download WAV|c3
```

### Download confirmation

After a user clicks a download button, the shell shows a notice such as:

```txt
Download MP3 started. If the download did not appear, check your browser downloads or try again.
```

The notice confirms that the download request was triggered. Browsers and security scanners may handle the actual file saving outside React’s control.

### Download security direction

The current system is a reusable direct-download foundation.

Future secure purchase-gated downloads should add:

- order token
- email verification
- purchase lookup
- token expiration
- download permission checks
- per-song pages
- album package downloads
- individual MP3/WAV downloads

Future secure URL shape:

```txt
/api/downloads/escape-album-mp3?token=securePurchaseToken
```

## Private downloads folder

Private download files should live at the project root:

```txt
reusable-slide-pages/
  private-downloads/
    Good Morning.mp3
  src/
  public/
  package.json
```

Recommended `.gitignore`:

```gitignore
private-downloads/*
!private-downloads/.gitkeep
```

Keep a placeholder file:

```txt
private-downloads/.gitkeep
```

Do not commit real MP3/WAV/ZIP files unless intentionally using Git LFS.

## Discounts

The reusable discount system supports:

- URL-based discounts
- order-wide percentage discounts
- order-wide fixed discounts
- product-scoped discounts
- size-option-scoped discounts
- promotion-driven discounts
- discount-aware line totals
- discount-aware review totals

Supported URL params:

```txt
?discount=CODE
?promo=CODE
?code=CODE
```

## Delivery config

Delivery data source:

```txt
src/config/delivery/deliveryConfig.ts
```

It provides:

- countries
- region options
- stable pickup locations
- pop-up shop locations
- delivery zone rates

## Nursery operations

The nursery operations flow supports:

- DB-backed batch lists
- DB-backed batch subset lists
- DB-backed transplanted individual lists
- batch profile blocks
- batch subset profile blocks
- transplanted individual profile blocks
- batch creation
- transplant logging
- activity logging
- delete actions configured through block metadata
- progress overlay title/subtitle for profile context
- cancel and return-home utility controls
- hidden step text
- opaque overlay mode

Nursery dynamic endpoint:

```txt
/api/questionnaires/nursery-ops/batches
```

Nursery action endpoints include:

```txt
/api/questionnaires/nursery-ops/create-batch
/api/questionnaires/nursery-ops/log-activity
/api/questionnaires/nursery-ops/record-transplant
```

## Record lists

The reusable `recordlist` slide supports:

- source-backed items
- configured title field
- configured subtitle field
- configured meta fields
- selected state
- record opening
- empty text

Example:

```txt
===
@id: batches-list
@type: recordlist
@store: opsSelectedBatchCode
@source: nurseryBatches
@titlefield: code
@subtitlefield: plantName
@metafields: startDate,quantityAlive,intendedUse
@emptytext: No batches available yet.
@next: Search
@goto: batch-profile
```

## Block-driven profiles

Reusable blocks are built in:

```txt
src/config/questionnaireBlocks.ts
```

A DSL slide can select a block:

```txt
@block: batchProfile
```

The shared shell renders the block without hardcoding profile content.

Block capabilities:

- section rows
- row formatting
- row visibility
- section actions
- delete actions
- update buttons
- selected record context

## Styling and overlays

The shell uses a full-card stage layout.

Features:

- progress overlay
- action bar overlay
- media slides with full-stage video/image rendering
- per-slide page background
- per-slide card opacity
- slide-level overlay colors
- questionnaire-level overlay mode
- progress overlay title placement

Example:

```txt
@progressoverlaybg: rgba(255,255,255,0.92)
@actionbarbg: rgba(255,255,255,0.94)
@progressoverlaytextcolor: #1f1f1f
@actionbartextcolor: #1f1f1f
```

Questionnaire-level config:

```ts
showStepText: false;
overlayMode: "opaque";
```

## Utility controls

Slides can show persistent utility controls:

```txt
@showreturnhome: true
@showcancel: true
@cancelgoto: home
```

Behavior:

- Return Home routes to the `home` slide
- Cancel can route to `@cancelgoto`
- both clear DSL-declared form fields before routing
- useful for operational flows and nested profile flows

## Form fields

Supported fields:

- text
- email
- tel
- number
- date
- checkbox
- textarea
- select

Example select:

```txt
@fields:
- opsContainerType|select|Starting container|required|Select container|2.5 inch pot,4 inch pot,6 inch pot,8x16 tray,cup,grow bag,bucket,other
```

## Conditions and routing

Conditional visibility:

```txt
@showif:
- field|eq|true
```

Conditional next routing:

```txt
@when:
- score|gte|3|next-slide
```

Conditional back routing:

```txt
@backwhen:
- mode|eq|edit|profile-slide
```

Supported operators include:

```txt
eq
neq
gt
gte
lt
lte
between
in
```

## External routing

`@goto:` and `@backgoto:` can target either:

- slide ids
- external URLs

External URLs open in a new tab.

## Adding a new questionnaire

Minimum files:

```txt
src/config/questionnaires/<projectDsl>.txt
src/config/themes/<projectTheme>.ts
```

Then add a registry entry in:

```txt
src/config/questionnaires/registry.ts
```

If the questionnaire needs a shop catalog, create a project catalog helper and inject it from the registry.

Example:

```txt
src/lib/invitation/getInvitationShopCatalog.ts
```

If the questionnaire needs downloads, add download catalog items in:

```txt
src/config/downloads/downloadCatalog.ts
```

Then reference those keys from the DSL using:

```txt
@downloadbuttons:
- download-key|Button Label|styleKey
```

If the questionnaire needs meal menus, add a meal menu config and inject it from the registry:

```txt
src/config/meals/mealMenus.ts
```

If the questionnaire needs ticket assignment behavior, use:

```txt
@type: tickets
@store: ticketAssignments
```

and route to it from the shop with:

```txt
@ticketgoto: ticket-details
```

## Important shared files

```txt
src/app/questionnaire/[slug]/page.tsx
src/components/questionnaire/QuestionnaireShell.tsx
src/components/questionnaire/QuestionnaireShell.module.css
src/lib/questionnaire/parser.ts
src/lib/questionnaire/engine.ts
src/lib/questionnaire/resolveDslTemplate.ts
src/lib/questionnaire/loadDslText.ts
src/lib/questionnaire/shop.ts
src/lib/questionnaire/delivery.ts
src/lib/questionnaire/tickets.ts
src/lib/questionnaire/meals.ts
src/config/questionnaires/registry.ts
src/config/questionnaireBlocks.ts
src/config/downloads/downloadCatalog.ts
src/config/meals/mealMenus.ts
src/app/api/downloads/[downloadKey]/route.ts
```

## Development workflow with ChatGPT

Preferred collaboration style:

- user applies code locally in VS Code
- ChatGPT gives path-first edits
- ChatGPT does not push to GitHub unless explicitly asked
- user commits and pushes locally
- user shares the new SHA after push
- ChatGPT treats the latest shared SHA as source of truth
- if local files are ahead of GitHub, user can paste/upload the current file section

## Git and media notes

Large media files should not be committed as normal Git files.

For video or audio:

- use Git LFS intentionally, or
- keep files local/private, or
- host externally later if needed

Recommended for private downloadable files:

```gitignore
private-downloads/*
!private-downloads/.gitkeep
```

Recommended for local media too large for GitHub:

```gitignore
public/media/invitation/*.mp4
```

If using Git LFS:

```bash
git lfs install
git lfs track "public/media/invitation/*.mp4"
git add .gitattributes
```

## Current direction

The project is moving toward a reusable platform for:

- branded slide funnels
- media-first storytelling
- video-driven routing
- performance rating flows
- ticket/invitation sales
- ticket-owner assignment
- per-ticket meal selection
- ticket-owner gated access
- digital album downloads
- secure download pages
- reusable storefronts
- fulfillment-aware checkout
- DB-backed operational tools
- reusable profile and record systems

The major rule remains:

Reusable capability goes into shared parser, shell, route, type, or library layers.

Project-specific wording, products, events, files, prices, meals, and media paths belong in DSL/config/catalog files.
