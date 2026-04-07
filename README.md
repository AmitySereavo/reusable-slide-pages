# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, guided questionnaires, media-rich slide flows, lightweight storefront flows, promotion-driven questionnaire offers, and delivery / pickup selection flows.

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
- add questionnaire-specific business logic through isolated server helpers
- support image, video, and embedded media slides
- support slide-level page backgrounds and card opacity overrides
- support questionnaire-specific DSL variants without duplicating routes
- support pre-parse DSL block injection for richer content
- support reusable shop slides backed by structured catalog data
- support reusable delivery slides backed by config or DB-provided delivery data
- support reusable order review flows
- support reusable discount definitions that affect shop and review totals
- support questionnaire-paired promotional items selected from real inventory
- support URL-driven discount and promo-item selection
- support slide-level overlay background and overlay text color control

## Current architecture

The app uses a registry-based system.

Each questionnaire is defined by:

- a DSL file path
- a theme file
- a variables object
- an optional dynamic variables endpoint
- an optional questionnaire-level `showStepText` setting
- a slug used in the route

Route:

```txt
/questionnaire/[slug]
```

The shared shell remains generic. Questionnaire-specific logic should live outside the parser and shell unless it represents a reusable platform capability.

## Active questionnaires

### `self-trust`

Route:

```txt
/questionnaire/self-trust
```

### `garden-herbs`

Route:

```txt
/questionnaire/garden-herbs
```

### `seed`

A seed / plant-growth / follow-up funnel that supports:

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

The seed flow is database-backed for plant and shop content.

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

The featured plant is selected by:

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

The project includes a reusable discount layer.

Current capabilities:

- URL-based discount activation through query params
- questionnaire-linked promotion discount logic
- order-wide percentage discounts
- order-wide fixed-amount discounts
- product-scoped discounts
- size-option-scoped discounts
- discounted line totals on review
- discounted grand total including delivery

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

Do not wrap them in:

```ts
export const ...
```

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
- `@progressoverlaybg:`
- `@actionbarbg:`
- `@progressoverlaytextcolor:`
- `@actionbartextcolor:`
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

- `content`
- `score`
- `choice`
- `form`
- `contact`
- `media`
- `video`
- `shop`
- `delivery`

## Visibility and routing behavior

### `@showif:`

Slides can be shown or hidden with:

```txt
@showif:
- someField|eq|true
```

`@showif:` is evaluated against the merged runtime context, which means it can read:

- questionnaire variables
- dynamic questionnaire variables
- live answers

This allows visibility rules based on runtime variables such as `promotionClosed`, not only form answers.

### `@when:` and `@backwhen:`

Conditional next and back routing are evaluated in the questionnaire shell against the merged runtime context.

## Overlay system

The shell now uses a full-card stage layout.

That means:

- the slide body fills the full card area
- progress UI overlays on top of the slide body
- the action bar overlays on top of the slide body
- image / video / page background styling can visually fill the whole card
- content scrolls inside the same full-height stage

### Overlay styling directives

Per slide, you can control overlay appearance with:

```txt
@progressoverlaybg: rgba(255,255,255,0.92)
@actionbarbg: rgba(255,255,255,0.94)
@progressoverlaytextcolor: #1f1f1f
@actionbartextcolor: #1f1f1f
```

Transparent example:

```txt
@progressoverlaybg: transparent
@actionbarbg: transparent
@progressoverlaytextcolor: #ffffff
@actionbartextcolor: #ffffff
```

Typical use:

- transparent overlays on media-heavy slides
- opaque overlays on shop, delivery, review, and contact slides
- brand-specific overlay colors per questionnaire or per slide

### Action bar button order

The shell now renders action controls in a consistent order:

1. choice buttons
2. next / continue button
3. back button

### Action bar button sizing

Action bar buttons now use the same width rule so that:

- choice buttons
- next buttons
- back buttons

all align consistently inside the action area.

## Shop slide architecture

The reusable `shop` slide type is designed around:

- product panel
- size rows as actual orderable units
- optional purchase modes per size row
- live cart total on the action button
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

### Contact completion behavior

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

## Promotion flow behavior in `seed`

At the current repo state, the seed DSL includes:

- promotion-closed entry slide
- intro content
- seed reveal content
- plant info content
- updates intro
- care tips
- pickup / delivery intro step
- delivery selection
- contact details
- review order
- confirmation message
- plant collection policy
- plant shop

Current flow notes:

- `promotion-closed` can appear first through `@showif:` when `promotionClosed === true`
- `intro` only appears when `promotionClosed === false`
- `pickup-location` routes to either:
  - `promotion-closed`
  - `delivery-options`

- the review slide uses the shared `shop` renderer in review mode
- the review slide routes to `confirmation-message`
- `promotion-closed` offers a path to visit the store
- older switch-offer special-case flow is no longer the active direction

## Line-level color support

The DSL supports line color tokens.

Examples:

```txt
# [c1] Main heading
## [c2] Subheading
[c3] Paragraph text
```

The parser reads the color token and stores it on the section. Actual color values come from the questionnaire theme.

## DSL examples

### Basic content slide

```txt
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

### Score slide

```txt
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

### Choice slide

```txt
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

### Form slide

```txt
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

### Shop slide

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

### Delivery slide

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

### Review slide

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

### Overlay example

```txt
@progressoverlaybg: rgba(255,255,255,0.92)
@actionbarbg: rgba(255,255,255,0.94)
@progressoverlaytextcolor: #1f1f1f
@actionbartextcolor: #1f1f1f
```

### Media slide

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

### Slide-level page background

```txt
@pagebgcolor: #0f172a
@pagebgimage: /media/backgrounds/hero.jpg
@pagebgsize: cover
@pagebgposition: center
```

## Current behavior

- content is rendered in-order from the DSL
- headings and subheadings only affect the line they are written on
- form fields are fully DSL-driven
- choice-button groups can be rendered inline from `@choices:`
- choice buttons can store a value with `@store:`
- choice buttons can optionally route directly using per-choice `goto`
- back navigation follows actual visited-slide history by default
- `@backgoto:` can override back-button navigation
- `@goto:` and `@backgoto:` can target either a slide id or external URL
- external URL targets open in a new tab
- `@showif:` controls slide visibility through the visibility engine
- `@countstep: false` can keep a slide visible while excluding it from progress count
- `@showsteptext: false` can hide the `Slide X of Y` label for a specific slide
- named actions can be triggered from slides using `@run:`
- submissions are saved to PostgreSQL through Prisma
- dynamic questionnaire variables can be loaded from questionnaire-specific endpoints
- slide-level page backgrounds can visually fill the full card stage
- progress and action overlays now sit on top of the slide body
- overlay background and text colors can be controlled per slide
- the system supports DB-backed shop catalog rendering
- the system supports reusable delivery / pickup selection slides
- the review flow can surface delivery and contact summaries with adjust links
- discount codes can be applied from URL params
- review totals can include both discount and delivery fee
- the seed flow can pair to a real inventory-backed promotional item
- the seed flow can auto-seed a paired item into `orderCart` when the order is empty
- the seed flow can fall back to a promotion-closed screen if no eligible promotional items remain
- the seed flow can activate a questionnaire promotion discount after phone number entry

## Adding a new questionnaire

With the current architecture, adding a new questionnaire usually does not require a new route file.

The shared route:

```txt
/questionnaire/[slug]
```

already loads questionnaires from the registry.

### Minimum files to add

```txt
src/config/questionnaires/<projectDsl>.txt
src/config/themes/<projectTheme>.ts
```

Then add a new entry in:

```txt
src/config/questionnaires/registry.ts
```

### Existing shared files

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

## Prisma models currently relevant

- `Plant`
- `PlantInventory`
- `PlantMarketingContent`
- `PlantQuestionnaireContent`
- `PlantOfferMode`
- `PlantChannelSetting`
- `PlantShopSizeOption`
- `PlantShopSizeOptionPurchaseMode`

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
    plants/
      getPlantShopCatalog.ts
      getSeedCampaignData.ts
    prisma.ts
    questionnaire/
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
- optional questionnaire-level `showStepText`

For `seed`, this is also where the app loads:

- DB-backed campaign variables
- DB-backed `shopCatalog`
- config-backed `deliveryConfig`
- shared `discountDefinitions`
- `promoEligibleItems`
- promotion availability flags
- promotion discount settings
- active DSL version

### `src/lib/plants/getSeedCampaignData.ts`

Builds variables for the active seed campaign.

Current responsibilities:

- choose the featured plant
- build `campaignPlants`
- expose the values needed by the DSL template and runtime renderer

### `src/lib/plants/getPlantShopCatalog.ts`

Builds the shared `shopCatalog` object.

Current responsibilities:

- query visible, purchasable plants
- include active in-stock size options
- include optional purchase modes
- include product slug for URL-based promo-item matching
- map DB records to the generic shop catalog shape used by the shared renderer

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
- overlay background directives
- overlay text-color directives
- conditional route rules
- visibility rules

### `src/lib/questionnaire/engine.ts`

Handles slide visibility.

It now evaluates visibility rules against the merged runtime context so DSL `@showif:` can react to runtime variables such as `promotionClosed`.

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, URL discount reader, promotion-item selector, seeded promo-item cart initializer, step counter, media renderer, shop renderer, delivery renderer, review-summary renderer, and slide-stage overlay handler.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including:

- full-card slide stage
- overlay progress area
- overlay action bar
- scrollable slide content region
- shop panel UI
- delivery selection UI
- review summary cards

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

## Current project direction

This repository is currently focused on:

**A reusable slide-based questionnaire system with a shared DSL engine, media support, DB-backed plant catalog content, reusable shop and delivery flows, discount-aware promotion logic, and full-card overlay-based slide presentation.**

Practical direction:

- keep the shared questionnaire shell generic
- keep questionnaire-specific business rules outside the parser where possible
- treat shop, delivery, review, discount, and overlay styling as reusable platform capabilities
- use real inventory-backed items for questionnaire promotions
- use URL params for discount and paired-item selection where appropriate
- layer verified phone/email discount eligibility later through the reusable auth + lead system
