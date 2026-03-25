# Reusable Slide Pages

A reusable, DSL-driven questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, and Prisma.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, and guided lead capture flows. The current implementation is a self-trust / trust-in-the-future questionnaire, but the engine is designed to support additional questionnaires over time.

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
- trigger named actions from slides
- reuse the same engine for multiple brands and campaigns

## Current questionnaire

The active questionnaire is a self-trust / trust-in-the-future flow.

It currently supports:

- score slides
- content/story slides
- form/contact slides
- inline dynamic text replacement
- DSL-driven navigation
- DSL-driven form submission hooks

## DSL features currently supported

- `===` for new slide
- `BR` and `---` for spacing / breaks
- `#` for heading line styling
- `##` for subheading line styling
- normal text lines as paragraph lines
- `@feature: numberscale(...)`
- `@store:`
- `@back:`
- `@next:`
- `@goto:`
- `@fields:`
- `@run:`

## Current behavior

- content is rendered in-order from the DSL
- headings and subheadings only affect the line they are written on
- text can appear above or below features depending on placement in the DSL
- back navigation follows actual visited-slide history
- form fields are fully DSL-driven
- named actions can be triggered from slides using `@run:`
- the current form flow can submit questionnaire leads to the backend
- questionnaire submissions are now saved to PostgreSQL through Prisma

## Current folder structure

```txt
src/
  app/
    api/
      questionnaires/
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
    questionnaires/
      selfTrustDsl.ts
      selfTrustFromDsl.ts
    themes/
      selfTrustTheme.ts
  lib/
    prisma.ts
    questionnaire/
      engine.ts
      parser.ts
  types/
    questionnaire.ts
prisma/
  migrations/
  schema.prisma
prisma.config.ts
```

## Important files

### `src/config/questionnaires/selfTrustDsl.ts`

Contains the questionnaire content in DSL form.

### `src/config/questionnaires/selfTrustFromDsl.ts`

Parses the DSL into slide objects for the app.

### `src/lib/questionnaire/parser.ts`

Parses the custom DSL into structured slide data.

### `src/lib/questionnaire/engine.ts`

Handles visible slides and slide lookup helpers.

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main slide renderer, answer state manager, navigation controller, and form submission trigger point for DSL actions.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell.

### `src/config/themes/selfTrustTheme.ts`

Theme values for colors and UI styling.

### `src/app/api/questionnaires/submit/route.ts`

Receives questionnaire form submissions and saves them to the database.

### `src/lib/prisma.ts`

Initializes the Prisma client for the app.

### `prisma/schema.prisma`

Defines the Prisma data model for stored questionnaire submissions.

### `prisma.config.ts`

Prisma 7 configuration file for schema location and datasource URL.

## Current capabilities

- multi-slide questionnaire rendering
- line-by-line styled content from DSL
- inline feature rendering
- inline number scale rendering
- disabled score option support like `[7]`
- `@goto:` navigation working
- back-button history tracking
- `@run:` action support
- DSL-driven form fields via `@fields:`
- form submissions sent to backend
- questionnaire submissions persisted to PostgreSQL with Prisma
- placeholder dynamic text replacement:
  - `[statsCount]`
  - `[statsCount2]`
  - `[selfScore]`
  - `[futureScore]`

## Placeholder data still hardcoded

In `src/components/questionnaire/QuestionnaireShell.tsx`, these values are still placeholders:

- `statsCount`
- `statsCount2`

These are currently hardcoded for testing/design and should later be replaced with database-driven values.

## What is not finished yet

- Google Sheets sync
- live database-backed stats for `[statsCount]`
- richer branching logic beyond direct `@goto:`
- admin/editor tools
- loading questionnaire content from real text files instead of TS string exports
- cleanup of any remaining deprecated files if needed
- final copy/story refinement

## Current database model

The project currently stores questionnaire submissions with fields such as:

- questionnaire slug
- full name
- email
- phone
- WhatsApp opt-in
- self-trust score
- future-trust score
- created timestamp

## Local development

Install dependencies:

```bash
npm install
```

Set up your environment variables in `.env`:

```env
DATABASE_URL="your_postgres_connection_string"
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Run the dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000/questionnaire/self-trust
```

## Suggested next steps

1. Mirror submissions to Google Sheets
2. Replace placeholder stats with live database counts
3. Add richer branching rules if needed
4. Continue cleaning any deprecated or unused files
5. Refine questionnaire copy and story flow
6. Move DSL content into real text files later if desired
