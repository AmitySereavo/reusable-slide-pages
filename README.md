# Reusable Slide Pages

A reusable, registry-driven, DSL-powered questionnaire / slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL.

This project powers interactive multi-slide experiences that can be reused across different brands, campaigns, lead funnels, guided questionnaires, and media-rich slide flows. The system supports multiple questionnaires through a shared parser, shared renderer, slug-based registry system, optional questionnaire-specific dynamic variable endpoints, and isolated custom business-logic modules.

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

These rules can evaluate against the merged questionnaire context, not just raw answers.

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

### 11. Slides that should appear but not count toward progress

Use:

```txt
@countstep: false
```

This keeps the slide visible in the questionnaire flow, but removes it from the `Slide X of Y` count and progress calculation.

### 12. Hide step text for a specific slide

Use:

```txt
@showsteptext: false
```

This hides the `Slide X of Y` text for that slide only.

### 13. Media slide using a local file

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

### 14. Media slide using an embed

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

### 15. Slide-level page background

```txt
@pagebgcolor: #0f172a
@pagebgimage: /media/backgrounds/hero.jpg
@pagebgsize: cover
@pagebgposition: center
```

These values apply to the outer page wrapper for that slide.

### 16. Slide-level card opacity

```txt
@cardopacity: 0.72
```

This adjusts the card background opacity for that slide. Use a value from `0` to `1`.

### 17. Button styling directives

You can set default button styles per slide:

```txt
@buttonstyle: c2
@backstyle: secondary
@nextstyle: c3
```

## Variable replacement system

Square-bracket placeholders are resolved from three sources.

### 1. Questionnaire variables

These come from the registry entry for a questionnaire.

### 2. Dynamic questionnaire variables

These come from an optional questionnaire-specific endpoint and are merged into the runtime context.

### 3. Live questionnaire answers

These come from the current questionnaire session.

If a placeholder is not found in any source, it remains unchanged.

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

For committed static assets, store files in `public/` and reference them like:

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

## Current folder structure

```txt
public/
  media/
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

### `src/components/questionnaire/QuestionnaireShell.tsx`

Main questionnaire renderer, answer state manager, navigation controller, variable replacer, dynamic variable loader, step counter, action runner, media renderer, and slide-level visual override handler.

### `src/components/questionnaire/QuestionnaireShell.module.css`

Styles for the questionnaire shell, including pinned bottom action areas, media overlays, and scrollable slide content regions.

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
- commit static assets in `public/` when they are part of the experience
- the project uses `postinstall` to generate Prisma Client during install
