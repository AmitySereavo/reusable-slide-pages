# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, and guided questionnaire flows. The current implementation supports multiple questionnaires through a shared parser, shared renderer, and slug-based registry system.

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
- attach questionnaire-specific variables without bloating the parser
- use different themes and color systems per questionnaire

## Current architecture

The app now uses a registry-based system.

Each questionnaire is defined by:

- a DSL file
- a theme file
- a variables object
- a slug used in the route

The route:

```txt
/questionnaire/[slug]
```

loads the matching questionnaire from the registry.

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

## DSL features currently supported

- `===` for new slide
- `BR` and `---` for spacing / breaks
- `#` for heading line styling
- `##` for subheading line styling
- normal text lines as paragraph lines
- `@feature: numberscale(...)`
- `@store:`
- `@back:`
- `@backgoto:`
- `@next:`
- `@goto:`
- `@fields:`
- `@run:`

## Line-level color support

The DSL now supports line color tokens.

Examples:

```txt
# [c1] Main heading
## [c2] Subheading
[c3] Paragraph text
```

The parser reads the color token and stores it on the section.
The actual color values come from the questionnaire theme file, not from the parser.

This keeps:

- the parser generic
- the DSL readable
- the brand colors theme-specific

## Variable replacement system

Square-bracket placeholders are now resolved from two sources:

### 1. Questionnaire variables

These come from the registry entry for a questionnaire.

Examples:

- `[plant1]`
- `[plant2]`
- `[plant3]`
- `[statsCount]`
- `[statsCount2]`

### 2. Live questionnaire answers

These come from the current questionnaire session.

Examples:

- `[selfScore]`
- `[futureScore]`
- `[fullName]`
- `[email]`
- `[phone]`

If a placeholder is not found in either source, it remains unchanged.

## Current behavior

- content is rendered in-order from the DSL
- headings and subheadings only affect the line they are written on
- text can appear above or below features depending on placement in the DSL
- back navigation follows actual visited-slide history by default
- `@backgoto:` can override default back-button navigation
- `@goto:` and `@backgoto:` can target either:
  - an internal slide id
  - or an external `http/https` URL
- external URL targets open in a new tab
- form fields are fully DSL-driven
- named actions can be triggered from slides using `@run:`
- submissions are sent through a shared submit route
- submissions are now saved to PostgreSQL through Prisma
- storage is questionnaire-agnostic using a shared submissions table with `answers` JSON
- per-line colors can now be controlled from the DSL through theme color keys

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
      gardenHerbsDsl.ts
      registry.ts
      selfTrustDsl.ts
    themes/
      gardenHerbsTheme.ts
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

### `src/config/questionnaires/registry.ts`

Central registry that maps questionnaire slug to:

- DSL
- theme
- variables

### `src/config/questionnaires/selfTrustDsl.ts`

DSL content for the self-trust questionnaire.

### `src/config/questionnaires/gardenHerbsDsl.ts`

DSL content for the garden-herbs questionnaire.

### `src/config/themes/selfTrustTheme.ts`

Theme config for the self-trust questionnaire.

### `src/config/themes/gardenHerbsTheme.ts`

Theme config for the garden-herbs questionnaire.

### `src/lib/questionnaire/parser.ts`

Parses the custom DSL into structured slide data, including:

- sections
- fields
- features
- navigation directives
- line color tokens

### `src/lib/questionnaire/engine.ts`

Handles visible slides and slide lookup helpers.

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, and action runner.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including tighter layout behavior for half-screen / medium-width views.

### `src/app/questionnaire/[slug]/page.tsx`

Loads a questionnaire by slug from the registry and renders it.

### `src/app/api/questionnaires/submit/route.ts`

Receives questionnaire form submissions and saves them to the database.

### `src/lib/prisma.ts`

Initializes the Prisma client using the PostgreSQL adapter.

### `prisma/schema.prisma`

Defines the database model for questionnaire submissions.

### `prisma.config.ts`

Prisma 7 configuration file for schema location and datasource URL.

## Current capabilities

- multi-questionnaire support through slug-based registry loading
- multi-slide questionnaire rendering
- line-by-line styled content from DSL
- inline feature rendering
- inline number scale rendering
- disabled score option support like `[7]`
- `@goto:` navigation working
- back-button history tracking
- custom back-button routing via `@backgoto:`
- external link support for `@goto:` and `@backgoto:`
- `@run:` action support
- DSL-driven form fields via `@fields:`
- questionnaire-specific variables
- live answer-based placeholder replacement
- line-level color tokens in the DSL
- form submissions sent to backend
- questionnaire submissions persisted to PostgreSQL with Prisma
- generic answer storage using `answers` JSON

## Database model

The project currently stores questionnaire submissions in a shared table.

Each submission includes:

- questionnaire slug
- optional contact fields
- WhatsApp opt-in
- all answers as JSON
- created timestamp

This allows different questionnaires to reuse the same storage system without creating a new table for every questionnaire.

## Current submission model

Submissions are saved into the `QuestionnaireSubmission` table with a shape similar to:

- `questionnaireSlug`
- `fullName`
- `email`
- `phone`
- `whatsappOptIn`
- `answers`
- `createdAt`

## What is finished

- registry-based questionnaire loading
- multiple DSL files
- multiple themes
- questionnaire-specific variables
- line-level DSL color support
- questionnaire-agnostic submission storage
- Prisma / PostgreSQL integration
- working submit route
- responsive layout improvements for narrower desktop widths

- Google Sheets sync
- live database-backed statistics for values like `[statsCount]`
- richer branching logic beyond direct `@goto:`
- admin/editor tools
- loading questionnaire content from real text files instead of TS string exports
- questionnaire definition storage in the database, if desired later
- dedicated video slide rendering support (`@type: video` content still needs renderer/type implementation)
- final copy/story refinement

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

or

```txt
http://localhost:3000/questionnaire/garden-herbs
```
