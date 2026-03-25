# Reusable Slide Pages

A reusable, config-driven questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, and Prisma.

This project is being built to power interactive multi-slide experiences for different brands and use cases. The current implementation is focused on a self-trust questionnaire, but the architecture is being shaped so the same engine can be reused for future questionnaires, funnels, and guided lead capture flows.

## Current stack

- Next.js (App Router)
- React
- TypeScript
- Prisma
- Framer Motion
- Zod
- React Hook Form

## Core concept

The app renders slide-based questionnaires from a lightweight custom DSL instead of hardcoding slide content directly in React components.

This makes it possible to:

- add or remove slides quickly
- update wording without rewriting component logic
- control slide flow using `@goto:`
- define score scales inline with `@feature:`
- define form fields inline with `@fields:`
- reuse the same engine for multiple brands and campaigns

## Current project direction

The current questionnaire is a self-trust / trust-in-the-future flow.

The DSL currently supports:

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

The questionnaire shell now renders content in order, so text can appear above or below features depending on where it is placed in the DSL.

## Current folder structure

```txt
src/
  app/
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
    questionnaire/
      engine.ts
      parser.ts
  types/
    questionnaire.ts
prisma/
  schema.prisma
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

Main slide renderer and navigation controller.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell.

### `src/config/themes/selfTrustTheme.ts`

Theme values for colors and UI styling.

## Current capabilities

- multi-slide questionnaire rendering
- line-by-line styled content from DSL
- inline feature rendering
- inline number scale rendering
- disabled score option support like `[7]`
- `@goto:` navigation working
- back-button history tracking
- placeholder dynamic text replacement:
  - `[statsCount]`
  - `[statsCount2]`
  - `[selfScore]`
  - `[futureScore]`

- DSL-driven form fields via `@fields:`

## Placeholder data currently hardcoded

In `QuestionnaireShell.tsx`, these values are still placeholders:

- `statsCount`
- `statsCount2`

These are currently hardcoded for design/testing and should later be replaced with database-driven values.

## What is not finished yet

- form submission to database
- Google Sheets sync
- WhatsApp integration
- action hooks like `@run: submitLead`
- database-backed statistics for `[statsCount]`
- full branching logic beyond direct `@goto:`
- admin/editor tools
- final copy/story refinement

## Next recommended steps

1. Add `@run:` support in the DSL
2. Create a submit handler for form slides
3. Save responses to Postgres with Prisma
4. Mirror responses to Google Sheets
5. Replace placeholder stats with live counts
6. Add conditional branching rules if needed
7. Clean up or remove any remaining deprecated files
8. Refine questionnaire copy and story logic
9. Add support for loading questionnaire content from real text files instead of TS string exports if desired

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000/questionnaire/self-trust
```
