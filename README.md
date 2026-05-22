# Reusable Slide Pages

A reusable, registry-driven, DSL-powered slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, PostgreSQL, and reusable authentication.

The project renders interactive multi-slide experiences from plain-text DSL files instead of hardcoding every flow directly in React.

It supports:

- marketing funnels
- questionnaires
- media-rich video flows
- storefront pages
- delivery and pickup flows
- contact capture
- digital downloads
- ticket/invitation flows
- ticket-owner assignment
- per-ticket meal selection
- DB-backed nursery operations
- record lists
- reusable profile blocks
- reusable authentication
- slide-style signup and login
- slide-style account verification
- password reset
- configurable account deletion

---

## Current stack

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
- Twilio package installed but SMS is paused for now
- bcrypt
- Git LFS for large media when needed

---

## Source of truth

Current reusable-slide-pages source of truth:

```txt
84982038219b0129011f3d359de2622a5dd75105
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

---

## Core concept

Each slide experience is configured by:

- a DSL file
- a registry entry
- a theme
- variables
- optional dynamic variables
- optional shop catalog data
- optional delivery config
- optional meal menu config
- optional reusable block definitions
- optional downloadable file catalog entries
- optional auth behavior config

Shared questionnaire route:

```txt
/questionnaire/[slug]
```

The shared shell stays generic. Project-specific wording belongs in DSL files, config files, catalog helpers, registry variables, or isolated server helpers.

Reusable behavior belongs in the shared parser, shell, types, route handlers, or shared library helpers.

---

## Active questionnaires and flows

### `self-trust`

A score-based self-trust flow.

Route:

```txt
/questionnaire/self-trust
```

---

### `garden-herbs`

A content questionnaire for garden herbs.

Route:

```txt
/questionnaire/garden-herbs
```

---

### `seed`

A plant/seed funnel with DB-backed shop catalog, delivery selection, contact capture, review order, discounts, and promotion item logic.

Route:

```txt
/questionnaire/seed
```

---

### `invitation`

A media-first invitation and storefront flow for music, event tickets/invitations, album downloads, per-ticket owner details, per-ticket meal selection, and future gated download/ticket access.

Current capabilities:

- vertical video intro slides
- video-linked progress bar
- video start timestamp
- video timestamp routing to another slide
- performance rating slide
- WhatsApp subscription form
- invitation/event shop
- ticket/invitation purchase options
- ticket-owner details page
- generated temporary ticket codes per selected ticket
- optional ticket owner name, email, and WhatsApp/phone
- required and optional per-ticket meal support
- per-ticket meal selection instead of aggregate meal totals
- optional meal add-on pricing
- extra serving pricing support
- meal notes per ticket
- digital album purchase options
- physical-fulfillment-aware checkout routing
- contact-only routing for digital/email-only orders
- private file download API
- reusable DSL download buttons
- download started confirmation notice

Route:

```txt
/questionnaire/invitation
```

---

### `nursery-ops`

A DB-backed nursery operations flow for batches, batch subsets, transplanted individuals, record lists, and reusable block-driven profiles.

Route:

```txt
/questionnaire/nursery-ops
```

---

### `generic-profile-flow`

A reusable profile-flow testbed.

Route:

```txt
/questionnaire/generic-profile-flow
```

---

## Auth slide flows

Reusable auth has been merged into reusable-slide-pages.

The goal is to let the same slide system handle signup, login, verification, password reset, and future account management while still keeping the auth APIs reusable.

### `auth-signup`

Slide-style signup flow.

Route:

```txt
/questionnaire/auth-signup
```

Current signup flow:

```txt
Name
→ Contact
→ Password
→ Location
→ Address
→ Create account
→ Verification code panel
→ Account verified
→ Login
```

Current behavior:

- first name and last name slide
- contact slide with email and optional phone
- early existing-user check before password entry
- blocks verified existing users from continuing signup
- sends a fresh verification code for existing unverified users
- password and confirm password slide
- show/hide password toggle
- weak/medium/strong password feedback
- password requirement feedback
- confirm password cannot be pasted
- confirm password match signal
- optional country/city support by DSL field config
- optional address fields
- signup submits to `/api/signup`
- verification starts through `/api/verify/start`
- six-box code verification appears inside the slide flow
- code auto-verifies after the final digit
- resend code button with cooldown
- successful verification moves to the `signup-verified` slide

---

### `auth-login`

Slide-style login flow.

Route:

```txt
/questionnaire/auth-login
```

Current login flow:

```txt
Email or phone
→ Password
→ Log in
→ Login success
→ Dashboard
```

Current behavior:

- identifier field
- password field
- slide-style login submission
- successful login creates a session
- dashboard is accessible after login

---

### `auth-forgot-password`

Slide-style forgot-password flow.

Route:

```txt
/questionnaire/auth-forgot-password
```

Current behavior:

- user enters email or phone
- email users receive a password reset link
- phone reset code support exists in backend, but SMS is paused until later
- neutral success messaging should be used so the UI does not reveal whether an account exists

Backend route:

```txt
/api/password/forgot
```

---

### `auth-reset-password`

Slide-style password reset flow.

Route:

```txt
/questionnaire/auth-reset-password?token=<reset-token>
```

Current behavior:

- reads token from URL search params
- user enters new password
- user confirms new password
- validates password policy
- submits to `/api/password/reset`
- old sessions are revoked after password reset

Backend route:

```txt
/api/password/reset
```

---

### `auth-delete-account`

Slide-style delete account flow.

Route:

```txt
/questionnaire/auth-delete-account
```

Current direction:

- user must be logged in
- user must confirm deletion
- deletion behavior is controlled by config
- deletion can be immediate or delayed
- delayed deletion can be set to 7 days, 14 days, 30 days, or another configured period
- cancellation endpoint exists for delayed deletion

Backend routes:

```txt
/api/account/delete
/api/account/delete/cancel
```

---

## Registry architecture

Questionnaires are registered in:

```txt
src/config/questionnaires/registry.ts
```

Each registry entry can define:

- `slug`
- `name`
- `themeKey`
- `theme`
- `dslPath`
- `showStepText`
- `overlayMode`
- `variables`
- `dynamicVariablesEndpoint`

The registry loads the DSL, injects variables, parses slides, injects reusable blocks, and returns the config and theme to the shared route.

For invitation flows, the registry can inject:

```txt
shopCatalog
deliveryConfig
discountDefinitions
mealMenus
```

For auth flows, the registry can inject auth behavior variables such as:

```txt
authVerificationDelivery
authVerificationMethod
authVerificationExpiresInMinutes
authVerificationExpiresInHours
authVerificationTarget
authVerificationSuccessRedirect
authPasswordResetMethod
authPasswordResetSuccessGoto
```

---

## Auth verification config

Signup verification is config-driven.

This allows one project to use code verification while another uses link verification without changing shared component code.

Example code verification config:

```ts
variables: {
  authVerificationDelivery: "code",
  authVerificationMethod: "email",
  authVerificationExpiresInMinutes: 15,
  authVerificationExpiresInHours: null,
  authVerificationTarget: "account",
  authVerificationSuccessRedirect: "/dashboard",
}
```

Example link verification config:

```ts
variables: {
  authVerificationDelivery: "link",
  authVerificationMethod: "email",
  authVerificationExpiresInMinutes: null,
  authVerificationExpiresInHours: 24,
  authVerificationTarget: "account",
  authVerificationSuccessRedirect: "/dashboard",
}
```

Use short expiry for verification codes.

Use longer expiry for verification links when the business requires that behavior.

For production setup, confirm that external provider expiry settings match app settings where relevant.

---

## Email delivery setup

The project supports SMTP email delivery through Nodemailer.

Required environment variables for SMTP:

```env
EMAIL_PROVIDER_MODE="smtp"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender-email@gmail.com"
SMTP_PASS="your-google-app-password"
SMTP_FROM_EMAIL="Business Name <your-sender-email@gmail.com>"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

For Gmail SMTP:

- use `smtp.gmail.com`
- use a Google App Password
- do not use `smtp@gmail.com`

---

## Dev email safety mode

The auth system supports a dev-test email rewrite mode.

Example:

```env
EMAIL_DEV_TEST_MODE="true"
EMAIL_DEV_TEST_INBOX="paralifetrees@gmail.com"
```

When dev test mode is on:

```txt
real submitted email
→ rewritten to EMAIL_DEV_TEST_INBOX
```

This is useful for testing without sending messages to real customers.

For real-recipient testing:

```env
EMAIL_DEV_TEST_MODE="false"
```

Restart the dev server after changing `.env`.

---

## WhatsApp and SMS status

Current production direction:

```txt
Email: active
WhatsApp API: staged / pending business verification
SMS: paused
```

SMS should remain visible but disabled where the UI requires that behavior.

WhatsApp Cloud API credentials will be configured later after Meta business verification and message template permission are ready.

For simple user-initiated WhatsApp contact, normal WhatsApp click-to-chat links may still be useful, but they are not a replacement for automatic verification-code delivery through the WhatsApp API.

---

## Password policy

Password behavior is config-driven by reusable auth policy files.

Current slide behavior includes:

- password field type
- show/hide password toggle
- weak/medium/strong password strength feedback
- password requirement list
- confirm password match signal
- paste blocked on confirm password
- password policy validation on the backend

Password fields are supported in DSL forms:

```txt
@fields:
- password|password|Password|required|Enter password
- confirmPassword|password|Confirm password|required|Type password again
```

---

## Account deletion config

Account deletion should be business-configurable.

Config lives in:

```txt
src/customerAccess/config/authRules.js
```

Example delayed deletion:

```js
accountDeletion: {
  mode: "delayed",
  delayDays: 30,
  allowCancelBeforeDeletion: true,
  anonymizeInsteadOfDelete: false,
}
```

Example immediate deletion:

```js
accountDeletion: {
  mode: "immediate",
  delayDays: 0,
  allowCancelBeforeDeletion: false,
  anonymizeInsteadOfDelete: false,
}
```

Example anonymize instead of hard delete:

```js
accountDeletion: {
  mode: "delayed",
  delayDays: 14,
  allowCancelBeforeDeletion: true,
  anonymizeInsteadOfDelete: true,
}
```

Supported intended options:

```txt
mode: "immediate" | "delayed"
delayDays: number
allowCancelBeforeDeletion: boolean
anonymizeInsteadOfDelete: boolean
```

The `User` model should support deletion scheduling fields:

```prisma
deletionRequestedAt DateTime?
deletionScheduledAt DateTime?
deletedAt           DateTime?
deletionStatus      String?
```

After schema changes, run:

```bash
npx prisma format
npx prisma db push
npx prisma generate
npm run build
```

Do not run `prisma migrate reset` against a Supabase database unless data loss is acceptable.

---

## DSL file format

DSL files are plain text files.

Examples:

```txt
src/config/questionnaires/selfTrustDsl.txt
src/config/questionnaires/gardenHerbsDsl.txt
src/config/questionnaires/seedDsl.txt
src/config/questionnaires/seedDsl2.txt
src/config/questionnaires/invitationDsl.txt
src/config/questionnaires/nurseryOpsDsl.txt
src/config/questionnaires/authSignupDsl.txt
src/config/questionnaires/authLoginDsl.txt
src/config/questionnaires/authForgotPasswordDsl.txt
src/config/questionnaires/authResetPasswordDsl.txt
src/config/questionnaires/authDeleteAccountDsl.txt
```

Slides are separated with:

```txt
===
```

Do not wrap DSL files in TypeScript exports.

---

## Supported slide types

Current slide types include:

```txt
content
score
choice
form
contact
media
video
shop
tickets
meal
delivery
recordlist
authverify
```

---

## Supported form field types

Current form field types include:

```txt
text
email
tel
password
number
date
checkbox
textarea
select
```

---

## Supported DSL directives

Current DSL directives include:

```txt
@id:
@type:
@title:
@subtitle:
@titleplacement:
@store:
@source:
@block:
@blocksource:
@titlefield:
@subtitlefield:
@metafields:
@emptytext:
@feature:
@fields:
@choices:
@choiceplacement:
@downloadbuttons:
@when:
@backwhen:
@showif:
@run:
@downloadkey:
@back:
@backgoto:
@showback:
@shownext:
@countstep:
@showsteptext:
@showreturnhome:
@showcancel:
@cancelgoto:
@next:
@goto:
@buttonstyle:
@backstyle:
@nextstyle:
@media:
@embed:
@mediatype:
@mediaaspect:
@autoplay:
@progressmode:
@videostart:
@videogoto:
@pagebgcolor:
@pagebgimage:
@pagebgsize:
@pagebgposition:
@cardopacity:
@progressoverlaybg:
@actionbarbg:
@progressoverlaytextcolor:
@actionbartextcolor:
@catalog:
@shopmode:
@ticketgoto:
@mealgoto:
@mealmenu:
@deliverygoto:
@contactgoto:
@reviewgoto:
@deliveryconfig:
@completioncheck:
@gotoifcomplete:
@gotoifincomplete:
@contactmode:
```

---

## Basic DSL examples

### Content slide

```txt
===
@id: intro
@type: content
---
BR
# [c1] Welcome
[c3] This is a reusable slide.
@next: Continue
@goto: next-slide
```

---

### Score slide

```txt
===
@id: performance-rating
@type: score
---
# [c1] How would you rate the performance?
@feature: numberscale(1,2,[3],4,5)
@store: performanceRating
@when:
- performanceRating|in|3,4,5|subscribe
- performanceRating|in|1,2|low-rating-choice
@next: Continue
```

---

### Choice slide

```txt
===
@id: low-rating-choice
@type: choice
---
# [c2] What do you want to do then?
@store: lowRatingDecision
@choices:
- exit|Exit|exit-page|c2
- continue|Continue Watching|subscribe|c1
@shownext: false
```

---

### Form slide

```txt
===
@id: contact-details
@type: form
@contactmode: order
---
# [c1] Contact Details
@fields:
- fullName|text|Full name|required|Full name
- email|email|Email address|required|Email address
- phone|tel|Phone number|optional|Optional
@run: submitLead
@next: Review Order
@goto: review-order
```

---

### Password form slide

```txt
===
@id: signup-password
@type: form
@shownext: true
@next: Continue
@goto: signup-location
@back: Back
---
BR
# [c1] Create a password
BR
[c3] Type your password twice. For safety, confirm password cannot be pasted.
@fields:
- password|password|Password|required|Enter password
- confirmPassword|password|Confirm password|required|Type password again
```

---

### Auth verification slide

```txt
===
@id: signup-verify
@type: authverify
@shownext: false
---
BR
# [c1] Check your email
BR
[c3] Enter the verification code we sent to your email.
```

---

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

---

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

---

## Route targets

DSL `@goto:` supports slide IDs and app routes.

Slide ID example:

```txt
@goto: signup-password
```

App route example:

```txt
@goto: /questionnaire/auth-login
```

External URL example:

```txt
@goto: https://example.com
```

---

## Slide action runs

The shell supports action names through:

```txt
@run:
```

Current action names include:

```txt
submitLead
createNurseryBatch
logNurseryActivity
recordNurseryTransplant
checkSignupIdentifier
submitSignup
submitLogin
submitForgotPassword
submitResetPassword
submitDeleteAccount
```

---

## Auth API routes

Current auth API routes include:

```txt
/api/signup
/api/signup/check-identifier
/api/login
/api/logout
/api/session
/api/verify/start
/api/verify/check
/api/verify/consume-link
/api/password/forgot
/api/password/verify-code
/api/password/reset
/api/account/delete
/api/account/delete/cancel
```

---

## Media and video slide system

Media slides support images, videos, and embeds.

Basic video slide:

```txt
===
@id: home
@type: media
@media: /media/invitation/YYSSLYX.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@countstep: false
@showback: false
@next: Get Tickets
@goto: invitation-shop
```

### Video progress mode

A video slide can replace the normal slide progress bar with a video-linked progress bar:

```txt
@progressmode: video
```

This lets the progress control represent video progress and scrub the video position.

### Video start timestamp

A video can start at a configured timestamp:

```txt
@videostart: 00:12
```

Supported formats:

```txt
12
00:12
01:05
01:02:30
```

### Video timestamp routing

A video can route to another slide when it crosses a timestamp:

```txt
@videogoto: 00:45|performance-rating
```

The route can trigger again if the user returns to the video slide and the video crosses the timestamp again.

---

## Shop system

The reusable `shop` slide renders a structured `shopCatalog`.

The catalog supports:

- products
- product images
- product descriptions
- product fulfillment type
- size/order options
- optional purchase modes
- optional meal requirements on size options or purchase modes
- line quantities
- review mode
- discounts
- conditional ticket/details, meal, delivery, contact, and review routing

Basic shop slide:

```txt
===
@id: invitation-shop
@type: shop
@store: orderCart
@catalog: shopCatalog
@shopmode: browse
@ticketgoto: ticket-details
@mealgoto: meal-selection
@deliverygoto: delivery-options
@contactgoto: contact-details
@reviewgoto: review-order
@next: Checkout
```

Shop browse routing for invitation-style flows:

```txt
Shop → Ticket Details
```

The ticket details slide then controls whether the user selects meals, continues to delivery, continues to contact details, or reaches review order.

---

## Fulfillment model

The shop catalog separates product category from fulfillment need.

Product fulfillment types:

```ts
"physical" | "digital" | "ticket";
```

Physical fulfillment is determined by:

- physical product type
- or a selected purchase mode with `requiresPhysicalFulfillment: true`

This supports:

- digital album only
- email-only ticket
- email-only invitation
- ticket plus physical ticket
- invitation plus physical invitation
- physical products
- mixed carts

---

## Ticket details system

The reusable `tickets` slide creates one ticket assignment panel for every selected ticket/invitation quantity.

Ticket assignment data is derived from selected shop lines and stored in:

```txt
ticketAssignments
```

Each generated ticket assignment supports:

- temporary generated ticket code
- product and ticket label
- ticket owner name
- ticket owner email
- ticket owner WhatsApp/phone
- required meal status
- optional meal add-on status
- selected meal data
- per-ticket meal notes

Current intended flow:

```txt
Shop
→ Ticket Details
→ Select meal for a specific ticket when needed
→ Ticket Details
→ Delivery / Contact / Review
```

Meal selection is entered from each ticket panel, not as one long aggregate meal page.

Future ticket-owner access direction:

- ticket purchaser can enter owner name/email/phone per ticket
- system can later email each ticket owner their own meal-access link
- owner can verify by code
- owner sees only their own ticket details
- owner can choose or update their meal before the meal cutoff date
- after cutoff, meal editing should lock
- additional meal charges can route to a payment step

---

## Meal selection system

Meal selection is per ticket, not aggregate across the whole order.

This solves the serving/chef pairing problem.

Instead of only knowing:

```txt
Plain rice × 2
Rice and peas × 1
Stew peas × 2
Curry chickpeas × 1
```

the system can preserve:

```txt
Ticket 1 / John Brown
Base: Plain rice
Main: Curry chickpeas
Side: Plantain

Ticket 2 / Mary Green
Base: Rice and peas
Main: Stew peas
Side: Salad
```

This is important for event kitchens, packaged meals, assigned servings, and individual owner access.

---

## Delivery system

The delivery system supports:

- pickup at stable locations
- pickup at popup/event locations
- delivery by country/region/parish
- delivery fee calculation
- physical-fulfillment-aware routing
- mixed-cart delivery requirements

Delivery config is injected through registry variables.

---

## Downloads

The project supports private downloads through:

```txt
/api/downloads/[downloadkey]
```

Download buttons can be configured in DSL:

```txt
@downloadbuttons:
- album-mp3|Download MP3
- album-wav|Download WAV
```

Download keys should map to a server-side download catalog. Do not expose private file paths directly in the DSL.

---

## Nursery operations

The nursery operations flow supports:

- plant types
- plants
- batches
- batch subsets
- transplanted individuals
- locations
- containers
- growing media
- reminders
- activities
- media records
- reusable profile blocks
- dynamic DB-backed record lists
- delete record actions with confirmation

Key route:

```txt
/questionnaire/nursery-ops
```

Dynamic data endpoint:

```txt
/api/questionnaires/nursery-ops/batches
```

Nursery operation routes include:

```txt
/api/questionnaires/nursery-ops/create-batch
/api/questionnaires/nursery-ops/log-activity
/api/questionnaires/nursery-ops/record-transplant
```

---

## Prisma and database

Prisma schema:

```txt
prisma/schema.prisma
```

Prisma client helper:

```txt
src/lib/prisma.ts
```

Common commands:

```bash
npx prisma format
npx prisma db push
npx prisma generate
npm run build
```

For this project, prefer `prisma db push` when syncing the current schema to the existing Supabase database.

Do not run:

```bash
npx prisma migrate reset
```

against the shared Supabase database unless all data can be lost.

---

## Development commands

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Prisma sync:

```bash
npx prisma format
npx prisma db push
npx prisma generate
```

---

## Current build note

The build may show a Turbopack NFT warning related to:

```txt
./next.config.ts
./src/app/api/downloads/[downloadkey]/route.ts
```

Current status:

```txt
Build passes.
Warning is not blocking.
```

This warning should be cleaned up later by reducing dynamic file tracing or scoping filesystem operations more tightly.

---

## Testing URLs

Core questionnaire routes:

```txt
http://localhost:3000/questionnaire/self-trust
http://localhost:3000/questionnaire/garden-herbs
http://localhost:3000/questionnaire/seed
http://localhost:3000/questionnaire/invitation
http://localhost:3000/questionnaire/nursery-ops
http://localhost:3000/questionnaire/generic-profile-flow
```

Auth slide routes:

```txt
http://localhost:3000/questionnaire/auth-signup
http://localhost:3000/questionnaire/auth-login
http://localhost:3000/questionnaire/auth-forgot-password
http://localhost:3000/questionnaire/auth-reset-password
http://localhost:3000/questionnaire/auth-delete-account
```

Legacy auth page routes still exist:

```txt
http://localhost:3000/signup
http://localhost:3000/login
http://localhost:3000/verify
http://localhost:3000/forgot-password
http://localhost:3000/reset-password
http://localhost:3000/dashboard
```

The slide-style auth routes are the preferred UX direction.

---

## Auth flow test order

### Signup

```txt
/questionnaire/auth-signup
→ enter name
→ enter fresh email
→ continue
→ enter password
→ confirm password
→ optional location
→ optional address
→ create account
→ code sends
→ verification panel appears
→ enter code
→ auto-verifies
→ account verified slide
→ continue to login
```

### Existing verified user

```txt
/questionnaire/auth-signup
→ enter existing verified email
→ should stop on contact slide
→ should show account already exists
```

### Existing unverified user

```txt
/questionnaire/auth-signup
→ enter existing unverified email
→ should send fresh verification code
→ should move to verification panel
```

### Login

```txt
/questionnaire/auth-login
→ enter identifier
→ enter password
→ submit
→ login success
```

### Forgot password

```txt
/questionnaire/auth-forgot-password
→ enter verified email
→ reset link sends
```

### Reset password

```txt
/questionnaire/auth-reset-password?token=<token>
→ enter new password
→ confirm new password
→ submit
→ password changed
→ login with new password
```

### Delete account

Only test with a disposable account.

```txt
/questionnaire/auth-delete-account
→ confirm deletion
→ account is deleted or scheduled based on config
```

---

## Git workflow notes

Recommended workflow:

```bash
git status
npm run build
git add .
git commit -m "your commit message"
```

Keep source-of-truth commit SHAs updated after clean build checkpoints.

---

## Current direction

Near-term priorities:

1. Stabilize slide-style auth flows.
2. Ensure `/signup`, `/login`, `/forgot-password`, and `/reset-password` can route into the slide-style versions when ready.
3. Finish account deletion flow UX.
4. Add cancellation UI for delayed deletion.
5. Document production email and WhatsApp setup.
6. Clean up Turbopack NFT warning.
7. Continue reusable-slide and reusable-auth development separately, then merge improvements carefully.
