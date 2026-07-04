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
- timed text parsing with `[00:00.000 --> 00:00.000]` ranges
- reusable auth, account, verification, and gated-access helpers
- signup-slide tagging for tag-triggered email sequences
- account email history and verified email switching
- protected download API for private files
- reusable shop/cart engine with database-backed inventory support
- verified purchase-for-others recipient flow
- ticket assignment and meal-selection primitives
- account/shop currency display with USD, JMD, and GBP support
- admin-gated dashboard surfaces for projects, tickets, inventory, currencies,
  and email sequences
- shared email sender for auth, ticket, album, recipient, password-reset, and
  sequence emails
- protected website-operation email templates that are editable in the
  dashboard and tagged `Permanent Website Op`

Project-specific flows such as invitation, Escape album, nursery operations,
plant/seed shop, and profile forms should remain separable from the shared
runtime.

## Documentation Map

- [DSL_FILES_README.md](DSL_FILES_README.md): DSL files, active questionnaire
  flows, slide directives, media/download rules, and project-specific flow notes.
- [SHOPS_README.md](SHOPS_README.md): reusable shop, cart, ticket, gift,
  recipient, inventory, currency, and store-credit behavior.
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
- `/dashboard/tickets`: reusable ticket publishing
- `/dashboard/inventory`: reusable inventory management
- `/dashboard/currencies`: currency exchange-rate settings
- `/dashboard/email-sequences`: email sequences and protected
  website-operation email templates

The dashboard requires a logged-in user with `adminLevel >= 1`. The first
user-created account is assigned admin level 1 by the signup route.

Dashboard API routes also require admin level 1:

- `/api/dashboard/projects`
- `/api/dashboard/people`
- `/api/dashboard/inventory`
- `/api/dashboard/currencies`
- `/api/dashboard/email-sequences`

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

Paid media files must not be placed in `public/`.

Anything under `public/` can be accessed directly by URL. Paid album files,
ticket files, lyric videos, WAV files, MP3 files, written lyrics, and ZIP
packages should live outside the public web root and be streamed through a
server route that checks entitlement first.

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
4. Continue moving website-operation email copy into protected editable
   templates and keep the old verification content config for non-email
   channels only until those channels are migrated.
5. Continue separating reusable systems from project-specific flows.
