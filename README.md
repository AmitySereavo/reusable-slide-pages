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
- account email history and verified email switching
- protected download API for private files
- reusable shop/cart engine with database-backed inventory support
- verified purchase-for-others recipient flow
- ticket assignment and meal-selection primitives
- account/shop currency display with USD, JMD, and GBP support
- dashboard surfaces for projects, tickets, inventory, and currencies

Project-specific flows such as invitation, Escape album, nursery operations,
plant/seed shop, and profile forms should remain separable from the shared
runtime.

## Documentation Map

- [DSL_FILES_README.md](DSL_FILES_README.md): DSL files, active questionnaire
  flows, slide directives, media/download rules, and project-specific flow notes.
- [SHOPS_README.md](SHOPS_README.md): reusable shop, cart, ticket, gift,
  recipient, inventory, currency, and store-credit behavior.
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

Local dashboard route:

```txt
/dashboard
```

Dashboard sections currently include:

- project/DSL builder
- reusable ticket publishing
- reusable inventory management
- currency exchange-rate settings

The dashboard is intentionally ungated in local development. Restore
main-admin-only access before production launch.

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
3. Restore main-admin access control to dashboard/admin tools before production.
4. Move purchased-item grants to payment-completed webhooks when real payment
   processing is added.
5. Continue separating reusable systems from project-specific flows.
