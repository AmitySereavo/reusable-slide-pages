# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, and guided questionnaire flows. The current implementation supports multiple questionnaires through a shared parser, shared renderer, slug-based registry system, optional questionnaire-specific dynamic variable endpoints, and isolated custom business-logic modules.

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

## Current architecture

The app uses a registry-based system.

Each questionnaire is defined by:

- a DSL file
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

This makes it easier to:

- insert new slides in the middle
- move slides around
- keep `@goto:` targets readable
- maintain long questionnaire files over time

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

The third part is optional. If included, clicking that choice button routes immediately to that target.

The fourth part is optional. If included, it styles that choice button using a style key such as:

- `primary`
- `secondary`
- `ghost`
- `accent`
- theme line color keys like `c1`, `c2`, `c3`

Examples:

```txt
@choices:
- yes|Yes, continue|next-slide|primary
- no|No, exit|exit-slide|secondary
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

### 5. Placeholder usage

Square-bracket placeholders can pull from questionnaire variables, dynamic questionnaire variables, or live answers.

```txt
# [selfScoreMatchCount]
# [choose:selfScoreMatchCount|1=person|default=people]
## also chose
# [selfScore]
```

### 6. Dynamic text selection with `choose:`

The `choose:` token allows conditional text replacement based on an answer or variable value.

Format:

```txt
[choose:sourceKey|match=value|default=fallback]
```

Examples:

```txt
[choose:selfScoreMatchCount|1=person|default=people]
```

```txt
[choose:selfScoreMatchCount|0=|1=a few|2=a few|3=a few|4=some|default=A lot of]
```

```txt
[choose:score|1=dog|2=birds|3=shoes|default=items]
```

The first matching key is used. If no explicit key matches and `default` exists, `default` is used.

You can also reference a value key from inside a `choose:` result using `$`.

Example:

```txt
[choose:selfScoreMatchCount|0=A few|1=Some|2=Some|default=$selfScoreMatchCount]
```

### 7. Direct routing with `@goto:` and `@backgoto:`

```txt
@back: Watch the video
@backgoto: https://www.instagram.com/reel/EXAMPLE/
@next: Continue
@goto: next-slide
```

Targets can be:

- an internal slide id
- an external `http/https` URL

External URLs open in a new tab.

### 8. Conditional next routing with `@when:`

```txt
@when:
- selfScore|in|2,3|low-self-trust-path
- selfScore|in|4,5,6|mid-self-trust-path
- selfScore|in|7,8,9|high-self-trust-path
- selfScore|eq|10|full-self-trust-path
```

These rules can now evaluate against the merged questionnaire context, not just raw answers.

### 9. Conditional back routing with `@backwhen:`

```txt
@backwhen:
- futureScore|lte|3|low-future-trust-review
- futureScore|gte|8|high-future-trust-review
```

### 10. Hide Back and/or Next buttons

```txt
@showback: false
@shownext: false
```

Use cases:

- starting slide that only uses `@choices:`
- ending slide with no navigation buttons
- slides where only one nav button should appear

Examples:

```txt
@showback: false
```

```txt
@shownext: false
```

### 11. Slides that should appear but not count toward progress

Use:

```txt
@countstep: false
```

This keeps the slide visible in the questionnaire flow, but removes it from the `Slide X of Y` count and progress calculation.

Use this for:

- emotional bridge slides
- extra explanation slides
- detour slides reached through routing
- bonus slides that should appear without making the questionnaire feel longer

Example:

```txt
===
@id: same-place-message
@type: content
@countstep: false
---
BR
## A lot of
# Honest,
# [c2] Thoughtful
# persons
```

This slide still appears, but it does not increase the progress count.

### 12. Hide step text for a specific slide

Use:

```txt
@showsteptext: false
```

This hides the `Slide X of Y` text for that slide only.

Example:

```txt
===
@id: same-place-message
@type: content
@countstep: false
@showsteptext: false
---
BR
## A lot of
# Honest,
# [c2] Thoughtful
# persons
```

This slide still appears, but:

- it does not count toward progress
- it does not show the `Slide X of Y` label

### 13. When to use `@showif:` vs `@countstep: false`

These are different tools.

Use `@showif:` when a slide should only exist for some users.

Example:

```txt
@showif:
- selfScoreAndFutureScoreMatchCount|in|0,1
```

If the condition is not met, the slide is removed from the visible flow entirely.

Use `@countstep: false` when a slide should still appear, but should not count toward the progress display.

In short:

- `@showif:` = conditional existence
- `@countstep: false` = visible, but not counted
- `@showsteptext: false` = visible, but hides the step label only

### 14. Hide branch-only slides from users who should not see them

```txt
@showif:
- trustLevel|eq|completely
```

or

```txt
@showif:
- selfScore|in|7,8,9,10
```

or using a dynamic variable:

```txt
@showif:
- selfScoreAndFutureScoreMatchCount|in|0,1
```

This is useful for:

- optional branch slides
- route-specific explanation slides
- making the visible slide count more accurate for each user

### 15. Button styling directives

You can set default button styles per slide:

```txt
@buttonstyle: c2
@backstyle: secondary
@nextstyle: c3
```

These style keys are applied in the renderer and can be overridden per choice line.

## Variable replacement system

Square-bracket placeholders are resolved from three sources.

### 1. Questionnaire variables

These come from the registry entry for a questionnaire.

Examples:

- `[plant1]`
- `[plant2]`
- `[plant3]`

### 2. Dynamic questionnaire variables

These come from an optional questionnaire-specific endpoint and are merged into the runtime context.

Examples:

- `[selfScoreMatchCount]`
- `[selfScoreAndFutureScoreMatchCount]`
- `[futureScoreMatchCount]`

### 3. Live questionnaire answers

These come from the current questionnaire session.

Examples:

- `[selfScore]`
- `[futureScore]`
- `[fullName]`
- `[email]`
- `[phone]`

If a placeholder is not found in any source, it remains unchanged.

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
- choice-button groups can be rendered inside a slide via `@choices:`
- choice buttons can store a selected value using `@store:`
- choice buttons can optionally route directly using per-choice `goto`
- choice buttons can be styled per slide or per choice
- conditional next-button routing can be defined with `@when:`
- conditional back-button routing can be defined with `@backwhen:`
- `@when:` and `@backwhen:` are evaluated in the questionnaire shell against the merged runtime context:
  - live answers
  - static questionnaire variables
  - dynamic questionnaire variables

- previously stored values such as scores can be reused by later slides
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

## Current folder structure

```txt
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
    questionnaires/
      gardenHerbsDsl.ts
      registry.ts
      selfTrustDsl.ts
    themes/
      gardenHerbsTheme.ts
      selfTrustTheme.ts
  lib/
    googleSheets.ts
    prisma.ts
    questionnaire/
      custom/
        selfTrustStats.ts
        selfTrustSyntheticData.ts
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
- optional dynamic variables endpoint
- optional questionnaire-level `showStepText` setting

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
- choices
- features
- navigation directives
- line color tokens
- conditional route rules
- visibility rules
- ignored DSL comment/header lines
- per-slide nav visibility flags
- per-slide button style directives
- per-slide progress-count flags
- per-slide step-text visibility flags

### `src/lib/questionnaire/engine.ts`

Handles visible slides and slide lookup helpers.

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, dynamic variable loader, step counter, and action runner.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including pinned bottom action areas and scrollable slide content regions.

### `src/app/questionnaire/[slug]/page.tsx`

Loads a questionnaire by slug from the registry and renders it.

### `src/app/api/questionnaires/submit/route.ts`

Receives questionnaire form submissions and saves them to the database.

### `src/app/api/questionnaires/self-trust/stats/route.ts`

Returns dynamic self-trust statistics used by the self-trust questionnaire.

### `src/lib/questionnaire/custom/selfTrustStats.ts`

Contains self-trust-specific counting and deduplication rules for dynamic self-trust statistics.

### `src/lib/questionnaire/custom/selfTrustSyntheticData.ts`

Contains synthetic self-trust response data for testing realistic count scenarios.

### `src/lib/googleSheets.ts`

Mirrors saved submissions to a Google Sheets webhook when configured.

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
- dynamic questionnaire variables from questionnaire-specific endpoints
- live answer-based placeholder replacement
- conditional text replacement with `choose:`
- nested variable references in `choose:` results using `$variableName`
- line-level color tokens in the DSL
- descriptive slide ids for easier long-form maintenance
- parser support for ignored DSL comment/header lines
- in-slide choice buttons via `@choices:`
- per-slide and per-choice button style support
- conditional routing via `@when:`
- conditional back routing via `@backwhen:`
- visibility rules via `@showif:`
- per-slide nav visibility via `@showback:` and `@shownext:`
- progress-count exclusions via `@countstep: false`
- per-slide step-label visibility via `@showsteptext: false`
- routing decisions based on merged runtime context
- form submissions sent to backend
- questionnaire submissions persisted to PostgreSQL with Prisma
- generic answer storage using `answers` JSON
- live self-trust statistics backed by the database
- optional synthetic self-trust statistics mode for testing
- optional Google Sheets mirroring for saved submissions
- per-questionnaire Google Sheets tabs plus a shared master submissions tab

## Database model

The project stores questionnaire submissions in a shared table.

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

## Conditional routing examples

Route rules can send the user to different slides based on any previously stored answer or variable available in the merged runtime context.

Example:

```txt
@when:
- selfScore|in|2,3|low-self-trust-path
- selfScore|in|4,5,6|mid-self-trust-path
- selfScore|in|7,8,9|high-self-trust-path
- selfScore|eq|10|full-self-trust-path
```

Dynamic-variable example:

```txt
@when:
- selfScoreAndFutureScoreMatchCount|in|0,1|same-place-message
```

Supported operators:

- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `between`
- `in`

These rules are evaluated against the merged runtime context, so any later slide can route based on values gathered earlier in the questionnaire or loaded dynamically.

## Visibility and progress count

Progress count is based on the currently visible slides that are still marked as countable.

If a slide only applies to some users, add `@showif:` so it is removed from the visible flow entirely.

If a slide should still appear but should not make the questionnaire feel longer, use:

```txt
@countstep: false
```

If a slide should still appear but should hide the `Slide X of Y` label, use:

```txt
@showsteptext: false
```

This keeps progress behavior flexible without removing the slide itself from the experience.

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

This is useful when the real database is empty or too small to test realistic scenarios.

## What is not finished yet

- richer feature types beyond the current number scale
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

## Deployment notes

For Vercel deployments:

- ensure `DATABASE_URL` points to a hosted PostgreSQL database, not `localhost`
- if using Supabase with Vercel, prefer the session pooler connection string when direct connection fails
- set `GOOGLE_SHEETS_WEBHOOK_URL` and `GOOGLE_SHEETS_WEBHOOK_SECRET` in Vercel only if you want mirror writes there
- set `SELF_TRUST_STATS_MODE` to `real` or `synthetic` depending on the behavior you want
- the project uses `postinstall` to generate Prisma Client during install
