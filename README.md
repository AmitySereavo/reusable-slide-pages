# Reusable Slide Pages

Reusable Slide Pages is a registry-driven, DSL-powered slide-funnel system built
with Next.js App Router, React, TypeScript, Prisma, PostgreSQL, and reusable
authentication.

The project renders interactive multi-slide experiences from plain-text DSL
files. Shared behavior belongs in the shell, parser, registry, typed config, and
server routes; project-specific wording belongs in DSL files, config files, and
database-backed records.

## Core System

Current reusable foundations:

- `/questionnaire/[slug]` shared slide route
- `QuestionnaireShell` reusable runtime
- plain-text DSL parser
- registry-backed themes, variables, catalogs, delivery config, meal menus, and
  reusable blocks
- reusable left/right sidebars
- URL-addressable slides through `@syncurl`
- media/video slides with progress tracking, resume behavior, seek controls, and
  footer-edge progress placement
- reusable footer content labels, footer actions, and expandable text panels
- balanced DSL heading rendering that keeps headings to one- or two-word lines
  and keeps `Grow Guide` together as its own line
- timed text parsing with `[00:00.000 --> 00:00.000]` ranges
- reusable auth, account, verification, and gated-access helpers
- signup-slide tagging for tag-triggered email sequences
- account email history and verified email switching
- protected download API for private files
- reusable shop/cart engine with database-backed inventory support
- app-wide visitor activity tracker with one anonymous visitor/session identity,
  local-first interest thresholds, and shared event helpers for navigation,
  questionnaires, video, products, cart, checkout, downloads, and CRM actions
- verified purchase-for-others recipient flow
- database-backed digital/physical order fulfillment items
- ticket assignment and meal-selection primitives
- account/shop currency display with USD, JMD, and GBP support
- admin-gated dashboard surfaces for projects, people, orders, tickets,
  inventory, affiliates, discount codes, currencies, and email sequences
- shared email sender for auth, ticket, album, recipient, password-reset, and
  sequence emails
- protected website-operation email templates that are editable in the
  dashboard and tagged `Permanent Website Op`
- affiliate application flow with applicant email verification, admin approval
  review, typed status confirmation, approval email, password setup link, and
  affiliated-product commission preview
- centralized nursery production-planning rules for operating days,
  propagation multipliers, Garden Package store-demand planning, and shared
  dashboard calendars

Project-specific flows such as invitation, Escape album, nursery operations,
plant/seed shop, and profile forms should remain separable from the shared
runtime.

## Documentation Map

- [DSL_FILES_README.md](DSL_FILES_README.md): DSL files, active questionnaire
  flows, slide directives, media/download rules, and project-specific flow notes.
- [SHOPS_README.md](SHOPS_README.md): reusable shop, cart, ticket, gift,
  recipient, inventory, currency, and store-credit behavior.
- [ORDER_FULFILLMENT_README.md](ORDER_FULFILLMENT_README.md): configurable
  courier selection, shipment workflows, manual confirmation sliders,
  automatic tracking updates, and fulfillment activity history.
- [EMAIL_SEQUENCES_README.md](EMAIL_SEQUENCES_README.md): email sequence
  architecture, operational templates, lead nurture scheduling, and admin usage.
- [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md): manual regression checks
  for build, auth, media, shops, tickets, meals, dashboard, and account flows.
- [Project Notes.txt](Project%20Notes.txt): next-step planning and deferred
  product decisions.

## Source Of Truth

Current reusable-slide-pages source of truth before the next local
README/update commit:

```txt
912cd1604251c044828c04721ee3e321ada282f6
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

After committing the next local changes, update this README source-of-truth SHA.

## Separation Rules

Keep reusable behavior in:

- `src/components/questionnaire/QuestionnaireShell.tsx`
- `src/components/activity`
- `src/lib/activity`
- `src/lib/questionnaire`
- `src/lib/auth`
- `src/lib/verification`
- `src/customerAccess`
- shared route handlers
- shared types
- parser and registry helpers

Keep project-specific behavior in:

- DSL files
- registry entries and variables
- catalog/database records
- config files
- isolated server helpers

Avoid hardcoding nursery, plant shop, invitation, album, or business-specific
wording into reusable shell code.

## Current Stack

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- Framer Motion
- Zod
- React Hook Form
- Nodemailer
- Resend
- Twilio package installed, with SMS still paused for now
- bcrypt
- crypto/HMAC signed gated-access cookies
- protected download route helpers

## Dashboard

Local dashboard index route:

```txt
/dashboard
```

The dashboard index is intentionally lightweight. Heavy admin sections live on
separate routes so each section loads its own data only when an admin visits it:

- `/dashboard/projects`: project/DSL builder
- `/dashboard/people`: leads, accounts, purchases, content activity, answers,
  and email engagement
- `/dashboard/affiliates`: affiliate applications, email verification status,
  approval review, affiliate level/scope settings, account setup email, and
  affiliated product previews
- `/dashboard/orders`: digital/physical order fulfillment items, recipient
  details, fulfillment status, notes, selected courier, tracking/delivery
  references, and delivery/pickup support actions
- `/dashboard/today-tomorrow`: immediate deliveries, seed sowing, propagation,
  transplant, and people follow-up due today or tomorrow
- `/dashboard/upcoming-deliveries`: delivery planning across shops and recurring
  paid-confirmed customer commitments
- `/dashboard/store-production`: store-created production targets for future
  inventory, separate from customer orders. Garden Package store-generated
  targets are currently paused while the recurring store-order rules are being
  refined.
- `/dashboard/upcoming-seed-sowing`: seed sowing calculated from customer and
  store-production demand
- `/dashboard/upcoming-propagation`: non-seed propagation such as cuttings, air
  layers, suckers, grafts, divisions, and custom starts
- `/dashboard/upcoming-transplant`: transplant tasks calculated from production
  timelines
- `/dashboard/plant-production-timeline`: reusable day-slot plant production
  timelines for each plant type and propagation method
- `/dashboard/tickets`: reusable ticket publishing
- `/dashboard/inventory`: reusable inventory management
- `/dashboard/discount-codes`: cash/percentage discounts, eligibility rules,
  spend thresholds, and usage limits
- `/dashboard/currencies`: currency exchange-rate settings
- `/dashboard/email-sequences`: email sequences and protected
  website-operation email templates

The dashboard requires a logged-in user with `adminLevel >= 1`. The first
user-created account is assigned admin level 1 by the signup route.

Dashboard API routes also require admin level 1:

- `/api/dashboard/projects`
- `/api/dashboard/people`
- `/api/dashboard/affiliates`
- `/api/dashboard/orders`
- `/api/dashboard/production-planning`
- `/api/dashboard/plant-production-timeline`
- `/api/dashboard/inventory`
- `/api/dashboard/discount-codes`
- `/api/dashboard/currencies`
- `/api/dashboard/email-sequences`

## Nursery Production Planning

The nursery production-planning system is designed around the principle that
the nursery should not wait for sales before producing plants. Shops can create
recurring store demand, and customer orders create additional customer demand.
Both demand sources should eventually feed the same production calendar.

The current implementation adds the first shared production-planning layer:

- `src/lib/nursery/productionRules.ts`: central production settings for
  operating days, propagation multipliers, and Garden Package recurring targets.
- `src/lib/nursery/gardenPackageProduction.ts`: Garden Package store-demand
  planner that reverse-schedules the next monthly test target from the current
  largest Garden Package bill of materials.
- `/api/dashboard/production-planning`: admin-only API returning batch
  production-planning tasks. Garden Package store-production blocks currently
  return an empty paused payload so temporary store-generated package orders do
  not crowd the task dashboards while the store-order rules are being refined.
- `/dashboard/plant-production-timeline` and
  `/api/dashboard/plant-production-timeline`: admin-only editor and API for
  reusable plant production timeline day slots.
- Dashboard planning views combine customer-order planning and batch production
  planning. Store-generated Garden Package planning remains available in code
  but is paused at the API response until the recurring store-order workflow is
  fine-tuned.

Current nursery operating schedule defaults:

- Seed sowing: Saturday
- Transplanting: Sunday
- Delivery: Monday and Friday

These defaults live in `nurseryOperatingSchedule` inside
`src/lib/nursery/productionRules.ts`. They are centralized so future admin
editing can update one shared source instead of changing individual calculators.

Current propagation safety multipliers:

- Seed: 10 seeds per mature plant required
- Cutting: 5 cuttings per mature plant required
- Air layer: 5 air layers per mature plant required
- Division: 2 divisions per mature plant required
- Sucker: 2 suckers/slips per mature plant required
- Grafting: 3 grafts per mature plant required
- Other/custom: 5 starts per mature plant required

These are global defaults. Future Plant Profiles should be able to override the
global multiplier where a plant has unusually poor or unusually reliable
propagation.

### Plant Profiles And Production Timelines

The current production planner uses temporary profile heuristics in
`gardenPackageProduction.ts` to classify Garden Package items as seed, cutting,
air-layer, sucker/slip, or grafting production. This keeps the system useful now
while leaving room for the intended full Plant Profile administration layer.

The intended architecture is:

```txt
Plant Profile
→ Propagation Recipe
→ Production Requirement
→ Batch
→ Calendar Event
→ Inventory Stage
→ Shop Allocation
→ Sale / Reallocation / Disposition
```

Plant Profiles should become the source of truth for:

- supported propagation methods
- propagation duration
- germination/rooting estimates
- watering schedules
- feeding schedules and strengths
- transplant timing
- maturity timing
- shop eligibility
- maximum inventory age
- disposition rules
- plant-level multiplier overrides

Plant production timelines are now modeled as day-slot calendars per plant type
and propagation method. The default production cycle is 90 days:

```txt
Plant -> Propagation method -> Day 1..Day 90 -> zero or more actions
```

Each scheduled action stores:

- day number
- action type
- treatment / product where relevant
- optional instruction
- quantity
- strength
- application method
- stage-check requirement
- optional notes

Days with no actions should not create notifications. If a batch-level action is
rescheduled later, only that action should move; other timeline events remain on
their original relative days unless an admin intentionally edits them.

Timeline wording must stay generic because one timeline is reused across many
batches and shops. For example, a timeline can say `check transplant readiness`,
but it must not name a specific batch such as `Rosemary Batch A`. Specific batch
names, actual completion dates, and rescheduled dates belong to batch records
created from the timeline.

The Plant Production Timeline dashboard stores maintenance-loop fields after
the main production cycle, but the maintenance editor is currently hidden while
the first 90-day workflow is being tested.

The Plant Production Timeline dashboard can import the
`ParaLife_Plant_Propagation_to_Maturity_Recipes_Draft_v0.2_Feed_Detail.pdf` draft as
editable seed data. The imported draft stores profile metadata such as
scientific name, common names, propagation method, multiplier text, timing
estimates, warnings, common problems, and notes. Timeline day ranges from the PDF
are expanded into individual day-action rows. Feed-detail lines are stored as
treatment/product, strength, dose/quantity, application method, and notes. The
import skips timelines that already have actions unless the admin explicitly
chooses replacement.

Local maintenance scripts:

- `scripts/importPlantRecipeDraft.ts`: imports the bundled draft data into the
  Plant Production Timeline tables; pass `--replace` only when intentionally
  refreshing draft actions for matching plant production timelines.
- `scripts/countPlantRecipes.ts`: reports recipe/action totals.
- `scripts/checkPlantRecipeDraftImport.ts`: compares imported draft timeline
  action counts against the source draft data.
- `scripts/removeDuplicatePlantRecipeActions.ts`: deletes exact duplicate action
  rows only after explicit approval.

Planned timeline actions should remain separate from actual production records so
the nursery can compare plans with real germination, rooting, transplant, loss,
maintenance, and maturity history over time.

### Garden Package Store Production

The first recurring store-production implementation is the Garden Package Shop.
The current rule is:

- produce 1 largest Garden Package per month
- keep a rolling twelve-month plan
- start the first target about three months from the current date
- read the actual current largest package bill of materials from
  `src/lib/inventory/unifiedInventory.ts`
- include visible items, hidden package components, and zero-inventory package
  items because all package components create future production demand

The Garden Package bill of materials distinguishes:

- mature quantity required for the package
- propagation quantity required after safety multipliers
- propagation method
- production source (`Store Package`)
- target package month
- sowing/propagation date
- transplant date
- target ready/delivery date

Seed-grown items appear in Upcoming Seed Sowing. Non-seed items appear in
Upcoming Propagation. Transplant tasks appear in Upcoming Transplant. Paid
customer delivery commitments appear in Upcoming Deliveries. Monthly
store-created package targets appear in Store Production so store inventory work
does not get mixed into real customer delivery commitments. The Today and
Tomorrow dashboard section combines immediate seed sowing, propagation,
transplant, delivery, and people follow-up work.

Customer orders should only feed delivery and production planning after payment
is confirmed. Admins can mark a payment confirmation as test mode from the
orders dashboard. Test confirmations are stored with
`transactionMode: admin_test` and `isAdminTestTransaction: true`; planning views
label them as admin tests so they are not mistaken for real deliveries or future
profit/loss revenue.

### Inventory Lifecycle

The production-planning goal is continuous plant movement:

- Seedling Shop
- General Nursery
- Garden Ready
- Garden Package allocation
- Near-Harvest-Ready inventory
- customer reservation
- discount or promotional stage
- lead magnet / complimentary gift
- giveaway
- manual hold or other disposition

Plants should not remain indefinitely in a shop stage. Future Plant Profiles
should define maximum shop duration and disposition rules so aging inventory can
be discounted, reallocated, moved into packages, given away, or otherwise
cleared without blocking new production cycles.

Plant Batch records may generate matching unified inventory rows for the shop or
purpose they feed. Those generated inventory rows use
`metadata.source = seedling-production-batch` and keep the source
`seedlingBatchId`, so deleting the batch also removes the generated inventory
row. The reverse is intentionally not true: deleting a generated inventory row
or removing one of its shop tags must not delete the Plant Batch. Instead, the
batch is preserved and its linked shop/purpose metadata is updated so the item
is no longer shown under that shop's inventory. If no shop remains linked, the
batch falls back to General Nursery Stock.

Plant Batch titles must use the canonical plant name from Plant Production
Timeline. Do not put differentiators such as `Started 2026-08-09`, `Batch`,
purpose/shop, quantity, or same-day count in the title unless a specific display
section explicitly needs that wording. Those differentiators belong in separate
batch fields and metadata so multiple batches of the same plant remain easy to
scan without creating duplicate plant names.

Batch-generated inventory is visible to admins in Inventory, but its shop listing
starts hidden by default; admins must explicitly show the item in a shop before
customers can see or order it. Future quantity loss/damage adjustments on the
batch should update the generated inventory quantities rather than creating a
second inventory source.

Seedling Shop batch sync may create or refresh the current dated batches from
the seedling templates, but it must not deactivate older batch-generated
inventory rows that are still assigned to Seedling Shop. Every Plant Batch with a
Seedling Shop purpose should remain visible in the Seedling Shop inventory list
until an admin intentionally changes its shop assignment, hides it from the
inventory relationship, cancels/sells out the batch, or deletes the batch.

When future changes alter production rules, scheduling behavior, shop lifecycle,
database structure, or production architecture, update this README in the same
implementation.

## Affiliate Workflow

Public affiliate applications start at:

```txt
/affiliate
```

The `/affiliate` shortcut opens the `affiliate-sign-up` DSL flow. Applicants
enter contact details, social links, stores of interest, up to three relevant
products when the selected shop type needs product selection, audience details,
and an elevator pitch. Store/product options come from the dynamic endpoint:

```txt
/api/questionnaires/affiliate-sign-up/catalog
```

Affiliate submissions are stored as `QuestionnaireSubmission` records with the
slug `affiliate-sign-up`. On submission, the requester receives an email
verification link. Clicking the link marks the application's
`affiliateEmailVerification` block as verified.

Admins review applications at:

```txt
/dashboard/affiliates
```

Changing review status requires a typed uppercase confirmation:

- `APPROVE` for approved
- `DECLINE` for declined
- `PAUSE` for paused
- `PENDING` for pending review

When an application is newly approved, the system creates or updates the user
record for the applicant, sends an approval email, and includes a password setup
link. After setting the password, the applicant is routed toward login with the
account page as the next destination so they can update their name/details.

The dashboard side panel includes `View Affiliated Products`, which opens:

```txt
/dashboard/affiliates?view=products
```

That view shows approved affiliates, matching products, commission percentage,
estimated JMD commission amount, product links, and associated links when those
links are available in inventory metadata. Affiliate commission defaults can be
set by shop in `src/lib/affiliates/storeCommissionSettings.ts`, while
item-level commission overrides live in unified inventory item metadata under
`affiliateCommission`.

Protected website-operation emails are seeded into Email Sequences with the
metadata tag `Permanent Website Op`. They are editable but not exposed through
a delete UI/endpoint. If an admin leaves the saved subject/body blank, the
sender falls back to the default text in:

```txt
src/lib/verification/websiteOperationEmailTemplates.js
```

Email wording for email-channel website operations should live in those saved
records/defaults, not in the older verification content config. SMS/WhatsApp
content still uses the existing verification content config until those
channels receive editable operation-message templates.

## Protected Media Rule

Public, ungated media that should load directly from deployed pages belongs in
`public/media/...` and is addressed from DSL files with paths such as
`/media/plant_signup/01_what_plant_480p.mp4`. On GitHub/Vercel deploys, those
files must be committed to the repository. Large public MP4 files are tracked
with Git LFS; see `.gitattributes` for the active patterns, including
`public/media/plant_signup/*.mp4`.

Paid media files must not be placed in `public/`.

Anything under `public/` can be accessed directly by URL. Paid album files,
ticket files, lyric videos, WAV files, MP3 files, written lyrics, and ZIP
packages should live outside the public web root and be streamed through a
server route that checks entitlement first. The current protected download route
serves cataloged files from `protected-media/` and `private-downloads/` through
`/api/downloads/[downloadkey]`.

## Build And Dev Commands

```bash
npm run build
npm run dev
npx prisma generate
npx prisma db push
npx prisma format
```

Clean local dev restart:

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next
npx prisma generate
npm run dev
```

## Current Priorities

1. Keep shared shell features reusable and project wording in DSL/config/catalog
   records.
2. Continue improving dashboard authoring for DSLs, tickets, inventory, and
   currency settings.
3. Move purchased-item grants to payment-completed webhooks when real payment
   processing is added.
4. Continue creating server-authoritative order, payment, inventory, and
   fulfillment records so cart selections become auditable admin work queues.
5. Continue moving website-operation email copy into protected editable
   templates and keep the old verification content config for non-email
   channels only until those channels are migrated.
6. Build configurable courier selection, fulfillment-stage workflows, manual
   confirmation sliders, automatic scan/API updates, and fulfillment activity
   history for physical orders.
7. Continue separating reusable systems from project-specific flows.
