# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, guided questionnaires, media-rich slide flows, lightweight storefront flows, promotion-driven questionnaire offers, delivery / pickup selection flows, structured operational logging systems, and reusable database-backed profile views.

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
- support URL-driven discount and promo-item selection
- support questionnaire-level step-counter visibility
- support questionnaire-level overlay display mode
- support record-list slides backed by structured data
- support DSL-owned persistent utility controls such as Return Home and Cancel
- support inline choice rendering inside the text flow
- support operational form flows beyond marketing and shop use cases
- support reusable data-block rendering for DB-backed profiles
- support section-level profile actions without hardcoding questionnaire-specific UI into the shell
- support reusable progress-overlay title placement with main and supporting title text
- support reusable per-slide cancel routing
- support shared form-field clearing on submit, cancel, and return-home actions

## Current architecture

The app uses a registry-based system.

Each questionnaire is defined by:

- a DSL file path
- a theme file
- a variables object
- an optional dynamic variables endpoint
- an optional questionnaire-level `showStepText` setting
- an optional questionnaire-level `overlayMode` setting
- optional reusable block definitions
- a slug used in the route

Route:

```txt
/questionnaire/[slug]
```

The shared shell remains generic. Questionnaire-specific wording and business logic should live outside the parser and shell unless it represents a reusable platform capability.

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

### `nursery-ops`

A nursery operations flow focused on operational record capture rather than storefront or lead-funnel behavior.

Current capabilities and direction:

- create new nursery batches
- browse existing batches
- open a batch profile from a record list
- generate DB-backed batch subsets from starting container quantity
- open batch subset profiles from a record list
- record transplant operations into DB-backed transplanted individuals
- open batch-level transplanted lists and subset-level transplanted lists
- open transplanted individual profiles
- use reusable profile blocks instead of large handwritten DSL profile text
- use overlay titles to keep plant name and code visible while browsing records
- keep nursery logic isolated from shop, trust, and herb-specific business logic

Route:

```txt
/questionnaire/nursery-ops
```

## Nursery operations architecture

The nursery-ops flow is being built as a separate reusable slice inside the shared questionnaire system.

Current goals:

- support structured operational logging for nursery batches
- support batch profiles, batch-subset profiles, and transplanted-individual profiles
- support reminders and follow-up actions based on saved operational data
- support plant-reference expansion over time
- stay isolated so it can later be separated into its own project copy

### Current nursery-ops direction

The nursery system is now being shaped around:

- plant reference data
- batch creation
- batch lists
- batch profile viewing
- batch subset generation from container count
- batch subset profile viewing
- transplanted individual generation from transplant records
- transplanted individual profile viewing
- container selection
- medium selection
- location selection
- activity logging
- transplant tracking
- future per-section update flows on profiles

### Current nursery-ops UI direction

The nursery flow currently prefers:

- opaque overlays by questionnaire-level config
- hidden slide counter
- DSL-owned Return Home utility control
- DSL-owned Cancel utility control
- a shared `home` slide id convention for DSL-owned utility routing
- structured form inputs rather than long action-button stacks for operational data entry
- select menus for repeated operational values
- date inputs with better date-entry UX
- inline action rendering for profile-page actions
- real DB-backed record lists and profiles
- reusable block rendering for profile pages
- section-level Update buttons configured in block definitions rather than hardcoded in the shell
- reusable record-list behavior where clicking the record title opens the record profile
- reusable progress-overlay title placement for profile and list screens
- action-bar controls reserved for true navigation / utility behavior

### Nursery batch and individual code direction

Current code conventions in nursery-ops:

- batch code:
  - generated once on batch creation
  - uses the user-entered batch start date as part of the date code

- batch subset code:
  - `[batch code]-[padded starting container sequence]`
  - example: `AA040826-0001`

- transplanted individual code from multi-container source:
  - `[batch code]-[padded source batch container sequence]T-[padded transplant sequence]`
  - example: `AA040826-0002T-0001`

- transplanted individual code from single-container source:
  - `[batch code]T-[padded transplant sequence]`
  - example: `AA040826T-0001`

Current sequence rules:

- sequence numbers are intended to stay permanently attached to the record
- deleting a record should not renumber earlier or later records
- record-list card counts can reflect persistent sequence identity instead of visual position

### Nursery batch / profile behavior direction

Current intended behavior:

- if a batch has 2 or more starting containers:
  - batch profile shows `View Subsets`
  - each batch subset profile owns its own `Record Transplant`
  - each batch subset profile can show `View Transplants` when children exist

- if a batch has 1 starting container:
  - batch profile can own transplant actions directly

- batch profile can show `View Transplants` when at least one transplant exists

- transplanted lists can be viewed at the batch level or nested under the source batch subset when relevant

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
- if no eligible promo items remain, the flow can route to a closed-promotion slide

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
src/config/questionnaires/nurseryOpsDsl.txt
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
- `@title:`
- `@subtitle:`
- `@titleplacement:`
- `@back:`
- `@backgoto:`
- `@showback:`
- `@shownext:`
- `@countstep:`
- `@showsteptext:`
- `@showreturnhome:`
- `@showcancel:`
- `@cancelgoto:`
- `@next:`
- `@goto:`
- `@fields:`
- `@choices:`
- `@choiceplacement:`
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
- `@source:`
- `@titlefield:`
- `@subtitlefield:`
- `@metafields:`
- `@emptytext:`
- `@block:`
- `@blocksource:`

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

## Form field capabilities

Current form rendering supports:

- text-style inputs
- email inputs
- telephone inputs
- number inputs
- textarea inputs
- checkbox inputs
- date inputs
- select inputs

Current nursery direction uses form fields more heavily than pinned action-button groups for repeated operational values.

### Current reusable field direction

The system now supports or is being shaped to support reusable field behaviors such as:

- questionnaire-driven date fields
- questionnaire-driven select menus
- shared date-entry helpers such as `Use today`
- select-based structured values for repeated operational data
- shared dimension-unit inputs where one unit selector can apply to multiple dimensions
- future update forms that reuse the same field layer as creation flows
- shared form-field clearing so form values do not linger after submit, cancel, or return-home actions

## Record list architecture

The shared system supports reusable `recordlist` slides backed by structured variable data.

Current capabilities:

- read record items from a configured data source key
- choose title, subtitle, and meta fields through the DSL
- select a record into a stored answer field
- render a selected state with different tone and border treatment
- open a record profile by clicking the record title
- preserve the action bar for navigation or future search/panel actions
- keep record-list behavior reusable across brands and DSL files

Current direction:

- record title click opens the configured profile target
- selected record tone is visual, separate from profile opening
- future action-bar controls can be used for search / filter / panel actions
- record counts remain visible as a compact count indicator on the card
- individual and transplanted record cards can use persistent sequence-based count display rather than array position

## Reusable data-block architecture

The shared system now supports reusable block-driven profile rendering.

Current goals:

- avoid large handwritten profile text blocks in DSL
- let the DSL select a block
- let the registry or dynamic data loader supply the source record
- let reusable block configs define sections, rows, formatting, and actions
- let the shared condition engine decide row and action visibility
- let the shared shell render the result without profile-specific wording hardcoded into it

Current target pattern:

```txt
DSL selects block
→ registry or data loader supplies source record
→ reusable block config defines sections, rows, actions, and conditions
→ shared engine evaluates conditions
→ shared shell renders the block
```

### Current block capabilities

- block-level record sourcing
- reusable row definitions
- row formatting
- action visibility through shared conditions
- section-level Update actions
- delete actions configured from block metadata rather than shell-specific knowledge

### Current block direction

The preferred naming direction is generic:

- `selectedRecord`
- `sourceKey`
- `block`
- `section`
- `row`
- `action`

instead of questionnaire-specific shell naming.

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

### Current direction for conditions

The existing condition system is also the intended base for reusable data-driven UI behavior such as:

- showing or hiding profile actions
- showing or hiding data rows
- gating buttons based on record values
- showing or hiding section-level Update actions
- future reusable block-level visibility rules

That means future database-backed profile and summary sections should build on the existing rule system rather than introducing DSL-specific shell logic.

## Overlay system

The shell uses a full-card stage layout.

That means:

- the slide body fills the full card area
- progress UI overlays on top of the slide body
- the action bar overlays on top of the slide body
- image / video / page background styling can visually fill the whole card
- content scrolls inside the same full-height stage

### Overlay styling sources

Overlay styling can now come from two places:

#### 1. Slide-level DSL directives

```txt
@progressoverlaybg: rgba(255,255,255,0.92)
@actionbarbg: rgba(255,255,255,0.94)
@progressoverlaytextcolor: #1f1f1f
@actionbartextcolor: #1f1f1f
```

#### 2. Questionnaire-level registry config

A questionnaire can define:

- `overlayMode: "transparent"`
- `overlayMode: "opaque"`

This lets a project set a default overlay behavior in:

```txt
src/config/questionnaires/registry.ts
```

without repeating the same overlay directives on every slide.

### Current overlay behavior

- slide-level overlay directives override questionnaire-level defaults
- questionnaire-level `overlayMode` provides the fallback behavior
- media slides still retain media-appropriate fallback behavior when needed
- progress-overlay utility controls are clickable
- slides can render their title in the progress overlay through `@titleplacement: progress_overlay`
- overlay title support can keep record context visible while the user scrolls

### Action bar button order

The shell renders action controls in a consistent order:

1. choice buttons
2. next / continue button
3. back button

### Action bar button sizing

Action bar buttons use the same width rule so that:

- choice buttons
- next buttons
- back buttons

all align consistently inside the action area.

## Shared utility controls

The shared questionnaire shell supports DSL-owned persistent utility controls such as:

- Return Home
- Cancel

Current direction:

- utility control visibility is owned by the current slide DSL, not the registry
- `@showreturnhome: true` displays Return Home on that slide
- `@showcancel: true` displays Cancel on that slide
- `Return Home` routes to the shared `home` slide id convention
- `Return Home` clears all DSL-declared form-field answers before routing
- `Cancel` clears all DSL-declared form-field answers before routing
- `@cancelgoto:` can send Cancel to the appropriate lobby or parent slide
- future DSL files should use `@id: home` for the first/home slide when this feature is needed

These are especially useful in operational systems such as `nursery-ops`.

## Questionnaire-level display controls

The registry can control questionnaire-level visual behavior such as:

- `showStepText`
- `overlayMode`

Examples:

- `showStepText: false` hides the `Slide X of Y` counter
- `overlayMode: "opaque"` makes non-slide-specific overlays opaque by default

This allows project-level UX control without polluting every DSL file.

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

### Record list example

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
@showreturnhome: true
@showcancel: true
@cancelgoto: home
@back: Back
@next: Search
@goto: batch-profile
```

Current behavior:

- selecting a card stores the selected record value
- clicking the record title can open the configured record profile target
- the selected card tone is independent from profile opening
- the action bar can remain available for future search / panel actions

### Block-driven profile example

```txt
===
@id: batch-profile
@type: content
@source: nurseryBatches
@block: batchProfile
@titleplacement: progress_overlay
@title: Batch Profile
@subtitle: [selectedBatchPlantName] - [selectedBatchCode]
@showreturnhome: true
@showcancel: true
@cancelgoto: batches-list
@back: Back to Batches
---
[c3] Summary appears below.
@shownext: false
```

### Inline action example

```txt
===
@id: batch-profile
@type: content
@showreturnhome: true
@showcancel: true
@back: Back to Batches
---
# [c2] Batch
# [c2] Profile
[c3] Profile summary appears here.
@choiceplacement: inline
@choices:
- transplant|Record Transplant|transplant-details|c1
- batch-activity|Log Batch Activity|activity-batch-select|c2
@shownext: false
```

### Overlay title example

```txt
@titleplacement: progress_overlay
@title: Transplanted Profile
@subtitle: Dill - BA041026T-0002
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

### Utility control convention example

```txt
===
@id: home
@type: content
---
# [c2] Home
[c3] Choose what you want to do.

===
@id: batches-list
@type: recordlist
@showreturnhome: true
@showcancel: true
@cancelgoto: home
```

## Current behavior

- content is rendered in-order from the DSL
- headings and subheadings only affect the line they are written on
- form fields are DSL-driven
- date and select inputs can now be driven from the DSL field layer
- choice-button groups can be rendered inline from `@choices:`
- `@choiceplacement: inline` can place choice buttons in the content flow instead of the action bar
- choice buttons can store a value with `@store:`
- choice buttons can optionally route directly using per-choice `goto`
- back navigation follows actual visited-slide history by default
- `@backgoto:` can override back-button navigation
- `@goto:` and `@backgoto:` can target either a slide id or external URL
- external URL targets open in a new tab
- `@showif:` controls slide visibility through the visibility engine
- `@countstep: false` can keep a slide visible while excluding it from progress count
- `@showsteptext: false` can hide the `Slide X of Y` label for a specific slide
- DSL-owned utility controls can be displayed per slide with `@showreturnhome` and `@showcancel`
- `@cancelgoto:` can route Cancel to a specific lobby or parent slide
- Return Home, Cancel, and submit flows can clear DSL-declared form fields before routing
- named actions can be triggered from slides using `@run:`
- submissions are saved to PostgreSQL through Prisma
- dynamic questionnaire variables can be loaded from questionnaire-specific endpoints
- slide-level page backgrounds can visually fill the full card stage
- progress and action overlays now sit on top of the slide body
- overlay background and text colors can be controlled per slide
- questionnaire-level overlay mode can control default overlay opacity
- slides can move title and supporting text into the progress overlay
- the system supports DB-backed shop catalog rendering
- the system supports reusable delivery / pickup selection slides
- the review flow can surface delivery and contact summaries with adjust links
- discount codes can be applied from URL params
- review totals can include both discount and delivery fee
- the seed flow can pair to a real inventory-backed promotional item
- the seed flow can auto-seed a paired item into `orderCart` when the order is empty
- the seed flow can fall back to a promotion-closed screen if no eligible promotional items remain
- the seed flow can activate a questionnaire promotion discount after phone number entry
- the nursery flow can use questionnaire-level opaque overlays and hidden step text for operational UX
- the nursery flow can render record lists from live DB-backed batch, batch-subset, and transplanted-individual data
- the nursery flow can open profiles from record title clicks
- batch profile content can be rendered from reusable block definitions
- batch subset profile content can be rendered from reusable block definitions
- transplanted individual profile content can be rendered from reusable block definitions
- section-level Update buttons can be declared in block configs without hardcoding section UI into the shell

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

## Nursery operations database direction

Current nursery direction includes:

- plant reference data
- batch records
- batch subset records
- transplanted individual records
- container data
- medium data
- location data
- activity logs
- transplant data
- reminders
- future section-level update flows

The nursery project is being kept structurally separate from the seed storefront/catalog logic so it can later be split into its own project copy.

## Prisma models currently relevant

### Storefront / seed side

- `Plant`
- `PlantInventory`
- `PlantMarketingContent`
- `PlantQuestionnaireContent`
- `PlantOfferMode`
- `PlantChannelSetting`
- `PlantShopSizeOption`
- `PlantShopSizeOptionPurchaseMode`

### Nursery direction

- `PlantType`
- `PlantBatch`
- `PlantUnit`
- `Container`
- `GrowingMedium`
- `Location`
- `PlantActivity`
- `PlantMedia`
- `Reminder`

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
        nursery-ops/
          batches/
            route.ts
          create-batch/
            route.ts
          log-activity/
            route.ts
          record-transplant/
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
    questionnaireBlocks/
      batchProfile.ts
      index.ts
    questionnaires/
      gardenHerbsDsl.txt
      nurseryOpsDsl.txt
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
- optional questionnaire-level `overlayMode`
- optional reusable `blocks`

For `seed`, this is also where the app loads:

- DB-backed campaign variables
- DB-backed `shopCatalog`
- config-backed `deliveryConfig`
- shared `discountDefinitions`
- `promoEligibleItems`
- promotion availability flags
- promotion discount settings
- active DSL version

For `nursery-ops`, this is where project-level visual behavior and initial variable loading remain controlled without polluting the shell with questionnaire-specific wording.

### `src/app/api/questionnaires/nursery-ops/batches/route.ts`

Loads nursery batch list data and related child-record data for dynamic questionnaire variables.

Current responsibilities:

- query live `PlantBatch` records
- include plant type and unit information
- map DB rows into reusable record-list items
- expose selected-record-friendly fields for batch profile display
- expose batch-subset fields for subset profiles
- expose transplanted-individual fields for transplanted profiles
- expose child counts and visibility signals

### `src/app/api/questionnaires/nursery-ops/create-batch/route.ts`

Creates new nursery batches.

Current responsibilities:

- validate batch creation payload
- create or reuse plant type data
- create container / medium / location records when applicable
- create the batch record
- create starting batch-subset units from container quantity
- generate persistent container codes such as `BATCHCODE-0001`
- generate batch codes using the user-entered start date
- log the initial `STARTED` activity

### `src/app/api/questionnaires/nursery-ops/record-transplant/route.ts`

Records transplant operations.

Current responsibilities:

- resolve the source batch
- optionally resolve the selected source batch subset
- create transplanted individual records
- generate transplant codes such as `BATCHCODE-0002T-0001` or `BATCHCODET-0001`
- update batch transplant quantities
- update source unit transplant state when applicable
- log the transplant activity

### `src/config/questionnaireBlocks/batchProfile.ts`

Holds the current reusable nursery profile blocks.

Current responsibilities:

- define `batchProfile`
- define `batchSubsetProfile`
- define `transplantedIndividualProfile`
- define section rows
- define block actions
- define section-level Update actions
- keep profile wording and action layout out of the shell

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
- choice placement
- features
- navigation directives
- overlay-title directives
- media directives
- page background directives
- card opacity directives
- overlay background directives
- overlay text-color directives
- conditional route rules
- visibility rules
- record-list directives
- block directives
- DSL-owned utility-control directives

### `src/lib/questionnaire/engine.ts`

Handles shared condition evaluation and slide visibility.

It evaluates visibility rules against the merged runtime context so DSL `@showif:` and block action visibility can react to runtime variables and selected record values.

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, URL discount reader, promotion-item selector, seeded promo-item cart initializer, step counter, media renderer, shop renderer, delivery renderer, review-summary renderer, record-list renderer, reusable data-block renderer, section-action renderer, delete-action handler, DSL-owned utility-control handler, form-field clearing handler, and slide-stage overlay handler.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including:

- full-card slide stage
- overlay progress area
- overlay action bar
- scrollable slide content region
- record-list card UI
- selected record card tone
- inline choice layout
- shop panel UI
- delivery selection UI
- review summary cards
- persistent utility-control layout
- progress-overlay title layout

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
http://localhost:3000/questionnaire/nursery-ops
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

**A reusable slide-based questionnaire system with a shared DSL engine, media support, DB-backed plant catalog content, reusable shop and delivery flows, discount-aware promotion logic, record-list support, reusable block-driven profile rendering, section-level block actions, DSL-owned utility controls, overlay-title placement, inline choice placement, shared form-field clearing, and operational flow support that can later be separated into project-specific copies.**

Practical direction:

- keep the shared questionnaire shell generic
- keep questionnaire-specific business rules outside the parser where possible
- treat shop, delivery, review, discount, utility controls, record lists, reusable profile blocks, section actions, overlay-title placement, and form-field clearing as reusable platform capabilities
- use real inventory-backed items for questionnaire promotions
- use URL params for discount and paired-item selection where appropriate
- layer verified phone/email discount eligibility later through the reusable auth + lead system
- build nursery-ops as an isolated operational slice that can later be separated cleanly from storefront and coaching flows
- move profile-style pages toward reusable database-backed block rendering so the shell does not need questionnaire-specific wording or field names
