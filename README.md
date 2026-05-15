# Reusable Slide Pages

A reusable, registry-driven, DSL-powered slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

The project renders interactive multi-slide experiences from plain-text DSL files instead of hardcoding every flow directly in React. It supports marketing funnels, questionnaires, media-rich video flows, storefront pages, delivery/pickup flows, contact capture, digital downloads, ticket/invitation flows, DB-backed nursery operations, record lists, and reusable profile blocks.

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

A media-first invitation and storefront flow for music, event tickets/invitations, album downloads, and future gated download access.

Current capabilities:

- vertical video intro slides
- video-linked progress bar
- video start timestamp
- video timestamp routing to another slide
- performance rating slide
- WhatsApp subscription form
- invitation/event shop
- ticket/invitation purchase options
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
- line quantities
- review mode
- discounts
- conditional delivery/contact routing

Basic shop slide:

```txt
===
@id: invitation-shop
@type: shop
@store: orderCart
@catalog: shopCatalog
@shopmode: browse
@deliverygoto: delivery-options
@contactgoto: contact-details
@reviewgoto: review-order
@next: Checkout
```

Shop browse routing:

- if the selected cart requires physical fulfillment, the shop goes to `@deliverygoto`
- if not, it goes to `@contactgoto`
- if no contact target exists, it can fall back to `@reviewgoto`

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

Digital or email-only orders:

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
- total due always shows

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
src/config/questionnaires/registry.ts
src/config/questionnaireBlocks.ts
src/config/downloads/downloadCatalog.ts
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
- digital album downloads
- secure download pages
- reusable storefronts
- fulfillment-aware checkout
- DB-backed operational tools
- reusable profile and record systems

The major rule remains:

Reusable capability goes into shared parser, shell, route, type, or library layers.

Project-specific wording, products, events, files, prices, and media paths belong in DSL/config/catalog files.

```

```
