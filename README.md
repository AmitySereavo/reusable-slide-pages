# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, guided questionnaires, media-rich slide flows, lightweight storefront flows, promotion-driven questionnaire offers, and delivery / pickup selection flows. The system supports multiple questionnaires through a shared parser, shared renderer, slug-based registry system, optional questionnaire-specific dynamic variable endpoints, isolated custom business-logic modules, database-backed questionnaire content, database-backed shop catalog loading, config-backed delivery data, pre-parse DSL template resolution for richer content injection, and a reusable discount layer that can be activated from URL parameters or questionnaire-linked promotion logic.

## Current stack

- Next.js (App Router)
- React
- TypeScript
- Prisma
- PostgreSQL
- Framer Motion
- Zod
- React Hook Form

## Core concept

The app renders slide-based questionnaires from a lightweight custom DSL instead of hardcoding slide content directly in React components.

This makes it possible to:

- add or remove slides quickly
- update wording without rewriting component logic
- control slide flow using DSL directives
- define score scales inline
- define form fields inline
- define in-slide choice buttons inline
- hide navigation buttons per slide when needed
- trigger named actions from slides
- reuse the same engine for multiple brands and campaigns
- attach questionnaire-specific variables without bloating the parser
- use different themes and color systems per questionnaire
- add questionnaire-specific business logic through isolated server scripts and routes
- support image, video, and embedded media slides
- support slide-level page backgrounds and card opacity overrides
- support questionnaire-specific DSL variants without duplicating routes
- support pre-parse DSL block injection for styled, database-backed content
- support plain `.txt` DSL files instead of TS string exports
- support reusable shop slides backed by structured catalog data
- support reusable delivery slides backed by config or DB-provided delivery data
- support reusable order review flows
- support reusable discount definitions that affect shop and review totals
- support questionnaire-paired promotional items selected from real inventory
- support URL-driven discount and promo-item selection

## Current architecture

The app uses a registry-based system.

Each questionnaire is defined by:

- a DSL file path
- a theme file
- a variables object
- an optional dynamic variables endpoint
- an optional questionnaire-level `showStepText` setting
- a slug used in the route

The route:

```txt
/questionnaire/[slug]
```

loads the matching questionnaire from the registry.

The shared shell remains generic. Questionnaire-specific logic should live outside the parser and shell unless it represents a true platform capability.

Questionnaire-level shell settings, such as whether the step label should appear at all, belong in the registry config rather than in questionnaire-specific logic files.

## Active questionnaires

### `self-trust`

A self-trust / trust-in-the-future questionnaire.

Route:

```txt
/questionnaire/self-trust
```

### `garden-herbs`

A garden / herbs / companion-planting questionnaire.

Route:

```txt
/questionnaire/garden-herbs
```

### `seed`

A seed / plant-growth / follow-up funnel that now also supports:

- DB-backed shop catalog rendering
- reusable shop selection slides
- reusable delivery / pickup slides
- review flow for cart, delivery, and contact info
- URL-driven discounts
- questionnaire-paired promotion items selected from inventory
- promotion-closed fallback when no eligible promo items remain

Route:

```txt
/questionnaire/seed
```

## Seed questionnaire architecture

The seed flow is now database-backed for plant and shop content.

Instead of using config files as the source of truth for plants, the flow reads from plant tables and builds questionnaire variables from the database.

Recommended responsibilities:

- database stores plant identity, availability, questionnaire blocks, shop size options, and marketing content
- a seed campaign helper queries featured and eligible campaign plants
- a plant shop helper queries purchasable shop plants and maps them to `shopCatalog`
- the registry loads the `.txt` DSL file
- the registry resolves template variables before parsing
- the registry injects discount definitions, promotion flags, and promo-eligible item data
- the shared parser and shell render the result

### Current seed data flow

```txt
database
→ src/lib/plants/getSeedCampaignData.ts
→ src/lib/plants/getPlantShopCatalog.ts
→ src/config/questionnaires/registry.ts
→ .txt DSL
→ parser
→ QuestionnaireShell
→ /questionnaire/seed
```

### Campaign plant logic

Campaign plants are selected from plants that are:

- active
- claim eligible
- available in quantity

The featured plant is selected from that list by:

- first preferring a plant marked as featured
- otherwise falling back to the first available campaign plant

### Promo eligible item logic

The registry builds `promoEligibleItems` by intersecting:

- campaign plants returned by `getSeedCampaignData.ts`
- products that actually exist in the live in-stock shop catalog returned by `getPlantShopCatalog.ts`

This means:

- sold-out items naturally drop out
- non-purchasable items do not get paired to the questionnaire
- the questionnaire can default to the first valid eligible item
- a URL item param can request a specific eligible item by slug
- if no eligible promo items remain, the flow can route to a promotion-closed slide

## Discount system

The project now includes a reusable discount layer.

Current capabilities:

- URL-based discount activation through query params
- questionnaire-linked promotion discount logic
- order-wide percentage discounts
- order-wide fixed-amount discounts
- product-scoped discounts
- size-option-scoped discounts
- discounted line totals on review
- discounted grand total including delivery
- review rendering of discount labels and discount totals

### Current discount activation sources

The current shell can activate discounts from:

- `?discount=CODE`
- `?promo=CODE`
- `?code=CODE`

For the seed questionnaire, the shell can also build a questionnaire promotion discount automatically when:

- a paired promo item exists
- the customer has entered a phone number

Current note:

- this is only gated by phone-number entry right now
- verified-phone requirements are intended to be added later when the reusable auth / lead system is mounted on top

### Current promotion item selection sources

The current shell can choose a paired questionnaire promo item from URL params:

- `?item=slug`
- `?plant=slug`
- `?promoItem=slug`

Behavior:

- if no promo item slug is supplied, the first eligible item is used
- if a slug is supplied and matches an eligible item, that item is used
- if the slug is not eligible, the first eligible item is used
- if the eligible list is empty, the flow can route to a closed-promotion slide

## DSL file format

The system uses plain text DSL files instead of TypeScript string exports.

Examples:

```txt
src/config/questionnaires/selfTrustDsl.txt
src/config/questionnaires/gardenHerbsDsl.txt
src/config/questionnaires/seedDsl.txt
src/config/questionnaires/seedDsl2.txt
```

These files contain raw DSL only.

Do not wrap them in:

```ts
export const ...
```

and do not surround them with backticks.

## DSL features currently supported

- `===` for new slide
- `BR` and `---` for spacing / breaks
- `#` for heading line styling
- `##` for subheading line styling
- normal text lines as paragraph lines
- `// ...` and `:: ...` comment/header lines are ignored by the parser
- `@feature: numberscale(...)`
- `@store:`
- `@back:`
- `@backgoto:`
- `@showback:`
- `@shownext:`
- `@countstep:`
- `@showsteptext:`
- `@next:`
- `@goto:`
- `@fields:`
- `@choices:`
- `@when:`
- `@backwhen:`
- `@showif:`
- `@run:`
- `@buttonstyle:`
- `@backstyle:`
- `@nextstyle:`
- `@media:`
- `@embed:`
- `@mediatype:`
- `@mediaaspect:`
- `@autoplay:`
- `@pagebgcolor:`
- `@pagebgimage:`
- `@pagebgsize:`
- `@pagebgposition:`
- `@cardopacity:`
- `@catalog:`
- `@shopmode:`
- `@deliverygoto:`
- `@reviewgoto:`
- `@deliveryconfig:`
- `@completioncheck:`
- `@gotoifcomplete:`
- `@gotoifincomplete:`
- `@contactmode:`

## Supported slide types

Current shared slide types include:

- `content`
- `score`
- `choice`
- `form`
- `contact`
- `media`
- `video`
- `shop`
- `delivery`

## Shop slide architecture

The reusable `shop` slide type is designed around:

- product panel
- size rows as actual orderable units
- optional purchase modes per size row
- live cart total on the bottom action button
- review mode that shows selected rows only
- discount-aware review totals

### Shop data shape

The shared renderer expects a structured `shopCatalog` object in questionnaire variables.

High-level shape:

- `currencyCode`
- `weightUnit`
- `products[]`
- `products[].id`
- optional `products[].slug`
- `products[].sizeOptions[]`
- optional `products[].sizeOptions[].purchaseModes[]`

### Shop flow behavior

Browse mode:

- product panel shows image + title

- tapping `See details` expands the panel

- expanded rows show:
  - checkbox
  - size label
  - dynamic price
  - quantity adjustment

- optional purchase mode radio choices appear per size row

- total updates live

Review mode:

- only selected rows render
- remove button replaces checkbox
- weight is shown on review only
- line discount metadata can appear on review
- delivery fee is included in the final total
- discount total is included in the final total
- total order weight is shown on review only

### Current shop catalog source

The `seed` questionnaire injects `shopCatalog` through:

```txt
src/lib/plants/getPlantShopCatalog.ts
```

That helper reads from:

- `Plant`
- `PlantShopSizeOption`
- `PlantShopSizeOptionPurchaseMode`

It only includes items that are:

- active
- visible in the plant shop
- purchasable
- backed by at least one active size option with stock available

## Delivery slide architecture

The reusable `delivery` slide type supports:

- stable pickup locations
- pop-up shop pickup
- delivery to address
- country select
- region select
- address form fields
- computed delivery fee
- conditional routing to contact info or review

### Current delivery data source

The current delivery step is config-backed for development and app-building speed.

Source:

```txt
src/config/delivery/deliveryConfig.ts
```

This config currently provides:

- countries
- region options per country
- stable pickup locations with next pickup windows
- pop-up shop locations with dates
- delivery fees by region

This is intended to be swapped to DB-backed data later without changing the delivery slide behavior.

### Delivery flow behavior

Delivery method options:

- pickup at a stable location
- pickup at next pop-up shop
- deliver to my address

For delivery:

- country is selected from:
  - Jamaica
  - USA
  - Canada
  - UAE

- region list changes by selected country

- address fields are collected

- delivery fee is calculated from selected country + region

### Contact skip / completion behavior

The delivery slide can conditionally route based on contact completeness using:

- `@completioncheck: contact`
- `@gotoifcomplete: ...`
- `@gotoifincomplete: ...`

Current contact rules:

- delivery orders require:
  - `fullName`
  - `phone`

- pickup orders require:
  - `fullName`
  - and at least one of:
    - `phone`
    - `email`

### Review page behavior

The review stage currently supports:

- order summary
- delivery / pickup summary
- contact summary
- adjust links that route back to:
  - `delivery-options`
  - `contact-details`

## Promotion flow behavior in `seed`

At the current repo state, the seed DSL includes:

- intro content
- seed reveal content
- plant info content
- updates intro
- care tips
- pickup / delivery intro step
- lead/contact capture
- delivery selection
- order contact details
- review order
- confirmation message
- promotion-closed fallback
- plant collection policy
- plant shop

Current flow notes:

- `pickup-location` is now a content step that sends the user to `delivery-options`
- `contact-details` uses `@when:` rules to route either to:
  - `promotion-closed`
  - `review-order`

- the review slide uses the shared `shop` renderer in review mode
- the review slide currently routes to `confirmation-message`
- `promotion-closed` offers a path to visit the store
- some older slides such as `switch-offer` and `switch-seed-form` still exist in the DSL file, but the newer flow no longer depends on them

## Line-level color support

The DSL supports line color tokens.

Examples:

```txt
# [c1] Main heading
## [c2] Subheading
[c3] Paragraph text
```

The parser reads the color token and stores it on the section. The actual color values come from the questionnaire theme file, not from the parser.

This keeps:

- the parser generic
- the DSL readable
- the brand colors theme-specific

## DSL comments and readable slide IDs

The DSL supports lightweight comment/header lines that are ignored by the parser.

Examples:

```txt
// INTRO QUESTION
:: RESULTS SECTION
```

This makes large questionnaire files easier to scan and edit.

Recommended practice:

- use descriptive slide ids instead of numbered ids
- prefer ids like `self-trust-score`, `future-trust-score`, `contact-form`
- avoid renumbering-based ids like `slide8`, `slide9`, `slide10`

## DSL examples

### 1. Basic content slide

```txt
// INTRO QUESTION
===
@id: intro-question
@type: content
---
BR
## [c2] Do you
# [c3] Trust yourself?
BR
[c2] Not only when life is going smoothly.
[c3] Not just when someone reassures you.
@back: Back
@next: Continue
@goto: self-trust-score
```

### 2. Score slide with `@feature: numberscale(...)`

```txt
// SELF TRUST SCORE
===
@id: self-trust-score
@type: score
# How much
# [c2] would you say
# you trust yourself?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
[c2] on a scale of 1 to 10?
## [c3] 1 being NO trust at all.
## [c3] 10 being COMPLETE trust.
@store: selfScore
@back: Back
@next: Continue
@goto: future-trust-score
```

### 3. Choice slide with `@choices:`

```txt
// INTRO QUESTION
===
@id: intro-question
@type: choice
# Do you trust yourself?
BR
@store: trustLevel
@choices:
- completely|Yes, I trust myself completely|share-your-wisdom
- somewhat|I trust myself somewhat|self-trust-score
- no|No, I don't trust myself at all|self-trust-score
@showback: false
@shownext: false
```

Choice line format:

```txt
- value|Button label|optional-goto|optional-style-key
```

### 4. Form slide with `@fields:`

```txt
// CONTACT FORM
===
@id: contact-form
@type: form
# Stay connected
## Where should we send your next step?
@fields:
- fullName|text|Full name|required|Full name
- email|email|Email address|required|Email address
- phone|tel|Phone number|optional|Phone number
- whatsappOptIn|checkbox|I'm okay with being contacted on WhatsApp|optional
@run: submitLead
@back: Back
@next: Continue
```

Field line format:

```txt
- name|type|label|required-or-optional|placeholder
```

### 5. Shop slide

```txt
===
@id: plant-shop
@type: shop
@store: orderCart
@catalog: shopCatalog
@shopmode: browse
@deliverygoto: delivery-options
@next: Checkout

# [c1] Choose your plants
[c3] Tap a product to see sizes and details.
```

### 6. Delivery slide with contact skip behavior

```txt
===
@id: delivery-options
@type: delivery
@store: deliverySelection
@deliveryconfig: deliveryConfig
@completioncheck: contact
@gotoifcomplete: review-order
@gotoifincomplete: contact-details
@back: Back
@next: Continue

# [c1] Choose delivery or pickup
[c3] Select how you want to receive your order.
```

### 7. Review shop slide

```txt
===
@id: review-order
@type: shop
@store: orderCart
@catalog: shopCatalog
@shopmode: review
@back: Back
@next: Continue

# [c1] Review your order
[c3] Check your selected items before confirmation.
```

### 8. Placeholder usage

Square-bracket placeholders can pull from questionnaire variables, dynamic questionnaire variables, or live answers.

```txt
# [selfScoreMatchCount]
# [choose:selfScoreMatchCount|1=person|default=people]
## also chose
# [selfScore]
```

### 9. Dynamic text selection with `choose:`

Format:

```txt
[choose:sourceKey|match=value|default=fallback]
```

### 10. Direct routing with `@goto:` and `@backgoto:`

```txt
@back: Watch the video
@backgoto: https://www.instagram.com/reel/EXAMPLE/
@next: Continue
@goto: next-slide
```

### 11. Conditional next routing with `@when:`

```txt
@when:
- selfScore|in|2,3|low-self-trust-path
- selfScore|in|4,5,6|mid-self-trust-path
- selfScore|in|7,8,9|high-self-trust-path
- selfScore|eq|10|full-self-trust-path
```

### 12. Conditional back routing with `@backwhen:`

```txt
@backwhen:
- futureScore|lte|3|low-future-trust-review
- futureScore|gte|8|high-future-trust-review
```

### 13. Hide Back and/or Next buttons

```txt
@showback: false
@shownext: false
```

### 14. Slides that should appear but not count toward progress

```txt
@countstep: false
```

### 15. Hide step text for a specific slide

```txt
@showsteptext: false
```

### 16. Media slide using a local file

```txt
===
@id: coach-message-video
@type: media
@mediatype: video
@media: /media/coach-message.mp4
@mediaaspect: vertical
@autoplay: true
---
## [c3] Watch this first
[c3] Then continue below.
```

### 17. Media slide using an embed

```txt
===
@id: coach-embed
@type: media
@mediatype: video
@embed: https://www.youtube.com/embed/VIDEO_ID
@mediaaspect: horizontal
---
## [c3] Watch this message
```

### 18. Slide-level page background

```txt
@pagebgcolor: #0f172a
@pagebgimage: /media/backgrounds/hero.jpg
@pagebgsize: cover
@pagebgposition: center
```

### 19. Slide-level card opacity

```txt
@cardopacity: 0.72
```

### 20. Button styling directives

```txt
@buttonstyle: c2
@backstyle: secondary
@nextstyle: c3
```

### 21. Pre-parse styled content blocks

For questionnaires that need styled, content-rich dynamic sections, the raw DSL can include block placeholders that are resolved before parsing.

Example:

```txt
===
@id: seed-reveal
@type: content
---
[seedRevealBlock]
---
@choices:
- tell-me-more|Tell me more|plant-info|c1
- skip-the-info|I know enough|will-it-grow|c3
```

## Variable replacement system

There are two useful stages of replacement.

### 1. Pre-parse DSL template replacement

This is used when a variable must inject real DSL structure before parsing.

Example use cases:

- plant-specific reveal blocks
- plant-specific info blocks
- rich questionnaire-specific DSL snippets

### 2. Runtime text replacement in the shell

Square-bracket placeholders are also resolved at render time from three sources:

- questionnaire variables
- dynamic questionnaire variables
- live questionnaire answers

If a placeholder is not found in any source, it remains unchanged.

## Choice and field label replacement

Dynamic text replacement is not limited to normal section text.

The shell also supports placeholders in:

- choice labels
- form field labels
- form field placeholders

This is especially useful for DB-backed questionnaires such as `seed`, where the active plant or alternate plant names may vary by campaign.

## Media behavior

The shared renderer supports:

- local images from `public/...`
- local videos from `public/...`
- embedded media via `@embed:`
- horizontal, vertical, and square media presentation
- full-card media mode for media slides
- autoplay support for local and embedded video
- inline YouTube embed parameter handling for mobile-friendly playback
- tap-to-play / tap-to-pause local video behavior
- local video sound toggle button
- centered play overlay when local video is paused or stopped
- action bar slide-away behavior for vertical videos while playing

For committed static assets, store files in:

```txt
public/
```

and reference them like:

```txt
/media/coach-message.mp4
/media/backgrounds/hero.jpg
```

Do not prefix them with `public/` in the DSL.

## Current behavior

- content is rendered in-order from the DSL
- headings and subheadings only affect the line they are written on
- text can appear above or below features depending on placement in the DSL
- back navigation follows actual visited-slide history by default
- `@backgoto:` can override default back-button navigation
- `@goto:` and `@backgoto:` can target either an internal slide id or an external `http/https` URL
- external URL targets open in a new tab
- form fields are fully DSL-driven
- choice-button groups can be rendered inside a slide via `@choices:`
- choice buttons can store a selected value using `@store:`
- choice buttons can optionally route directly using per-choice `goto`
- choice buttons can be styled per slide or per choice
- conditional next-button routing can be defined with `@when:`
- conditional back-button routing can be defined with `@backwhen:`
- `@when:` and `@backwhen:` are evaluated in the questionnaire shell against the merged runtime context
- `@showback:` and `@shownext:` can hide nav buttons per slide
- `@showif:` controls slide visibility through the visibility engine
- `@countstep: false` can keep a slide visible while excluding it from step count and progress calculation
- `@showsteptext: false` can hide the `Slide X of Y` label for a specific slide
- progress count is based on visible slides that are still marked as countable
- named actions can be triggered from slides using `@run:`
- submissions are sent through a shared submit route
- submissions are saved to PostgreSQL through Prisma
- storage is questionnaire-agnostic using a shared submissions table with `answers` JSON
- per-line colors can be controlled from the DSL through theme color keys
- dynamic questionnaire variables can be loaded from questionnaire-specific endpoints without polluting the shared parser
- slide-level page backgrounds can override the outer page wrapper
- slide-level card opacity can override card background transparency
- the system loads questionnaire DSL from `.txt` files
- the system supports DB-backed shop catalog rendering
- the system supports reusable delivery / pickup selection slides
- the review flow can surface delivery and contact summaries with adjust links
- discount codes can be applied from URL params
- review totals can include both discount and delivery fee
- the seed flow can pair to a real inventory-backed promotional item
- the seed flow can auto-seed a paired item into `orderCart` when the order is empty
- the seed flow can fall back to a promotion-closed screen if no eligible promotional items remain
- the seed flow can activate a questionnaire promotion discount after phone number entry
- future verified-phone discount gating is intended to be layered in later through the reusable auth / lead system

## Adding a new questionnaire project

With the current architecture, adding a new questionnaire usually does **not** require creating a new route file.

The shared route:

```txt
/questionnaire/[slug]
```

already loads questionnaires from the registry.

### Minimum files to add

For a new questionnaire project, add:

```txt
src/config/questionnaires/<projectDsl>.txt
src/config/themes/<projectTheme>.ts
```

Then add a new entry in:

```txt
src/config/questionnaires/registry.ts
```

### What goes in each file

#### `src/config/questionnaires/<projectDsl>.txt`

This is the questionnaire DSL file in plain text format.

Use this file for:

- slide content
- `@goto:` navigation
- `@choices:`
- `@fields:`
- `@when:`
- `@backwhen:`
- `@showif:`
- media directives
- styling directives such as page background and card opacity
- shop / delivery slide wiring

#### `src/config/themes/<projectTheme>.ts`

This is the theme file for the questionnaire.

Use this file for:

- brand colors
- line color mappings for `[c1]`, `[c2]`, `[c3]`, etc.
- card/button radius
- shadow values

#### `src/config/questionnaires/registry.ts`

This is where the questionnaire is registered.

A registry entry defines:

- slug
- name
- theme
- `dslPath`
- variables
- optional `dynamicVariablesEndpoint`
- `showStepText`

### Simple questionnaire flow

If the questionnaire is static or only needs simple variables, the normal process is:

1. create the `.txt` DSL file
2. create the theme file
3. add the registry entry

### DB-backed questionnaire flow

If the questionnaire needs database-driven content, add server-side helpers such as:

```txt
src/lib/<feature>/get<MyQuestionnaire>Data.ts
```

Then use that helper from the registry to build the variables before parsing the DSL.

Recommended flow:

1. query the database
2. build questionnaire variables
3. load the raw `.txt` DSL
4. resolve DSL template placeholders
5. parse the resolved DSL
6. render the questionnaire through the shared shell

### Pre-parse styled content blocks

If a questionnaire needs rich styled content blocks from the database, use placeholders such as:

```txt
[myStyledBlock]
```

inside the `.txt` DSL and resolve them before parsing with:

```txt
src/lib/questionnaire/resolveDslTemplate.ts
```

This is useful when the injected content needs to behave like real DSL, including:

- headings
- subheadings
- paragraph lines
- `BR`
- `---`
- line color tokens

### Multiple DSL versions for one questionnaire

If a questionnaire needs multiple versions, create a local version map such as:

```txt
src/config/questionnaires/<projectDslVersions>.ts
```

This lets one slug keep the same route while switching between DSL versions such as:

- `v1`
- `v2`
- `v3`

### Existing shared files you usually do not need to duplicate

These shared files already support all questionnaire projects:

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
```

## Plant catalog database direction

The plant side of the system is intended to be the source of truth for plant-related flows.

Current DB-backed plant responsibilities include:

- plant identity
- visibility in claim flow
- visibility in plant shop
- featured claim plant
- switch-eligible claim plants
- inventory quantity
- marketing copy
- questionnaire content blocks
- shop size options
- optional purchase modes per size option
- offer modes such as:
  - claim free
  - switch free
  - watch from seed
  - growth updates
  - buy mature now
  - reserve mature
  - watch circumposing

## Prisma models currently relevant to plant shop

Current plant shop schema direction includes:

- `Plant`
- `PlantInventory`
- `PlantMarketingContent`
- `PlantQuestionnaireContent`
- `PlantOfferMode`
- `PlantChannelSetting`
- `PlantShopSizeOption`
- `PlantShopSizeOptionPurchaseMode`

### Important note on questionnaire content fields

Do not rely on removed temporary questionnaire content fields such as:

- `growthIntroLine1`
- `growthIntroLine2`

New logic should use the remaining supported questionnaire content fields only, such as:

- `seedRevealBlock`
- `plantInfoBlock`
- `updatesIntroBlock`
- `careTipsBlock`
- `confirmationBlock`

## Current folder structure

```txt
public/
  media/
prisma/
  schema.prisma
  seed.ts
src/
  app/
    api/
      questionnaires/
        self-trust/
          stats/
            route.ts
        submit/
          route.ts
    questionnaire/
      [slug]/
        page.tsx
  components/
    questionnaire/
      QuestionnaireShell.tsx
      QuestionnaireShell.module.css
  config/
    delivery/
      deliveryConfig.ts
    discounts/
      discountDefinitions.ts
    questionnaires/
      gardenHerbsDsl.txt
      registry.ts
      seedDsl.txt
      seedDsl2.txt
      seedDslVersions.ts
      selfTrustDsl.txt
    themes/
      gardenHerbsTheme.ts
      seedTheme.ts
      selfTrustTheme.ts
  lib/
    googleSheets.ts
    plants/
      getPlantShopCatalog.ts
      getSeedCampaignData.ts
    prisma.ts
    questionnaire/
      custom/
        selfTrustStats.ts
        selfTrustSyntheticData.ts
      delivery.ts
      engine.ts
      loadDslText.ts
      parser.ts
      resolveDslTemplate.ts
      shop.ts
  types/
    questionnaire.ts
package.json
prisma.config.ts
```

## Important files

### `src/config/questionnaires/registry.ts`

Central registry that maps questionnaire slug to:

- DSL path
- theme
- variables
- optional dynamic variables endpoint
- optional questionnaire-level `showStepText` setting

For `seed`, this is also the place that loads:

- DB-backed campaign variables
- DB-backed `shopCatalog`
- config-backed `deliveryConfig`
- shared `discountDefinitions`
- `promoEligibleItems`
- promotion availability flags
- promotion discount settings
- active DSL version

### `src/config/questionnaires/seedDslVersions.ts`

Local map of the available `seed` DSL versions.

Use this when you want `/questionnaire/seed` to keep the same route while switching which DSL version powers the flow.

### `src/lib/plants/getSeedCampaignData.ts`

Builds the variables for the active seed campaign from the database.

Current responsibilities:

- choose the featured plant
- build `campaignPlants`
- expose the values needed by the DSL template and runtime renderer

### `src/lib/plants/getPlantShopCatalog.ts`

Builds the shared `shopCatalog` object from plant shop tables.

Current responsibilities:

- query visible, purchasable plants
- include active in-stock size options
- include optional purchase modes
- include product slug for URL-based promo-item matching
- map DB records to the generic shop catalog shape used by the shared renderer

### `src/config/delivery/deliveryConfig.ts`

Development-time config source for:

- stable pickup stops
- pop-up shop dates
- countries
- regions
- delivery rates

This can later be replaced by DB-backed logic without changing delivery slide behavior.

### `src/config/discounts/discountDefinitions.ts`

Current config source for reusable discount definitions.

This is where general discount codes such as URL-applied codes are defined.

### `src/lib/questionnaire/loadDslText.ts`

Loads raw `.txt` DSL files from disk.

This is the bridge that lets questionnaires use plain text DSL files instead of TS string exports.

### `src/lib/questionnaire/resolveDslTemplate.ts`

Resolves placeholders in the raw DSL string before parsing.

Use this when questionnaire variables must inject actual DSL structure rather than plain text.

### `src/lib/questionnaire/parser.ts`

Parses the custom DSL into structured slide data, including:

- sections
- fields
- choices
- features
- navigation directives
- media directives
- page background directives
- card opacity directives
- line color tokens
- conditional route rules
- visibility rules
- ignored DSL comment/header lines
- per-slide nav visibility flags
- per-slide button style directives
- per-slide progress-count flags
- per-slide step-text visibility flags
- shop directives
- delivery directives
- conditional completion-check routing directives
- contact mode directives

### `src/lib/questionnaire/shop.ts`

Shared helpers for:

- catalog normalization
- discount definition normalization
- discount lookup by code
- cart normalization
- line selection
- purchase mode selection
- quantity updates
- line discount application
- discounted order summary calculation
- total weight calculation

### `src/lib/questionnaire/delivery.ts`

Shared helpers for:

- delivery config lookup
- delivery selection normalization
- delivery fee calculation
- delivery completeness checks

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, dynamic variable loader, URL discount reader, promotion-item selector, seeded promo-item cart initializer, step counter, action runner, media renderer, shop renderer, delivery renderer, review-summary renderer, and slide-level visual override handler.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including:

- pinned bottom action areas
- media overlays
- scrollable slide content regions
- shop panel UI
- delivery selection UI
- review summary cards

### `prisma/schema.prisma`

Contains the database schema, including questionnaire submissions and plant-related tables.

### `prisma/seed.ts`

Seeds the plant tables, questionnaire content blocks, shop size options, and optional purchase modes.

## Optional Google Sheets mirror

You can mirror saved questionnaire submissions to Google Sheets by setting:

```env
GOOGLE_SHEETS_WEBHOOK_URL="YOUR_APPS_SCRIPT_WEB_APP_URL"
GOOGLE_SHEETS_WEBHOOK_SECRET="YOUR_SHARED_SECRET"
```

If `GOOGLE_SHEETS_WEBHOOK_URL` is not set, the app will skip the mirror and continue saving to PostgreSQL only.

## Synthetic self-trust stats mode

For the self-trust questionnaire, you can switch the stats source between real database submissions and synthetic testing data.

Use:

```env
SELF_TRUST_STATS_MODE="real"
```

or:

```env
SELF_TRUST_STATS_MODE="synthetic"
```

## Local development

Install dependencies:

```bash
npm install
```

Set up your environment variables in:

```txt
.env
```

Example:

```env
DATABASE_URL="your_postgres_connection_string"
GOOGLE_SHEETS_WEBHOOK_URL="YOUR_APPS_SCRIPT_WEB_APP_URL"
GOOGLE_SHEETS_WEBHOOK_SECRET="YOUR_SHARED_SECRET"
SELF_TRUST_STATS_MODE="real"
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Or push the schema:

```bash
npx prisma db push
```

Seed the plant tables:

```bash
npm run prisma:seed
```

Run the dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000/questionnaire/self-trust
http://localhost:3000/questionnaire/garden-herbs
http://localhost:3000/questionnaire/seed
```

Examples for the seed questionnaire:

```txt
http://localhost:3000/questionnaire/seed
http://localhost:3000/questionnaire/seed?discount=WELCOME25
http://localhost:3000/questionnaire/seed?item=peppermint
http://localhost:3000/questionnaire/seed?item=rosemary&discount=WELCOME25
```

## Deployment notes

For Vercel deployments:

- ensure the database environment variable is set in Vercel
- ensure Prisma Client is generated during build
- keep `prisma.config.ts` aligned with the deployed database connection
- if using Supabase with Vercel, prefer the connection setup that matches your runtime and migration needs
- set `GOOGLE_SHEETS_WEBHOOK_URL` and `GOOGLE_SHEETS_WEBHOOK_SECRET` in Vercel only if you want mirror writes there
- set `SELF_TRUST_STATS_MODE` to `real` or `synthetic` depending on the behavior you want
- commit static assets in `public/` when they are part of the experience
- the project uses `postinstall` to generate Prisma Client during install

## Current project direction

This repository is currently focused on:

**A reusable slide-based questionnaire system with a shared DSL engine, media support, DB-backed plant catalog content, reusable shop and delivery flows, and a discount-aware promotion layer for questionnaire-linked storefront offers.**

Practical direction:

- keep the shared questionnaire shell generic
- keep questionnaire-specific business rules outside the parser where possible
- treat the shop, delivery, review, and discount layers as reusable platform capabilities
- use real inventory-backed items for questionnaire promotions
- use URL params for discount and paired-item selection where appropriate
- layer verified phone/email discount eligibility later through the reusable auth + lead system
