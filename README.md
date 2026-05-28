# Reusable Slide Pages

A reusable, registry-driven, DSL-powered slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, PostgreSQL, and reusable authentication.

The project renders interactive multi-slide experiences from plain-text DSL files instead of hardcoding every flow directly in React.

It currently acts as a shared development ground for:

- reusable slide pages
- reusable auth
- reusable lead capture
- embedded reusable auth forms inside slides
- account management
- verified account contact updates
- retained email history
- active verified email switching
- gated lead access
- temporary auth-backed lead accounts
- DB-backed marketing-question answers
- DB-backed video progress tracking
- per-video resume behavior
- URL-addressable slides
- invitation / music / event flows
- ticket and meal-selection flows
- plant shop / seed shop flows
- DB-backed nursery operations
- reusable record lists
- reusable profile blocks

Long-term, these systems should remain separable so they can become dedicated projects or standalone reusable modules.

---

## Current source of truth

Current reusable-slide-pages source of truth before the latest local README/update commit:

```txt
656074b4461874d339ded93cccd5ead50be6a10e
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

Latest local work after the source-of-truth SHA above includes:

```txt
- hamburger menu auth controls in slide flows
- login/logout moved into hamburger menu
- action-bar login/logout support
- login return-to-slide flow
- auth-login success button returns to the slide where login was clicked
- URL-addressable slides with @syncurl
- Return Home remains generic and routes through goToTarget("home")
- gated lead capture uses embedded reusable LeadCaptureForm
- gated lead form receives reusable auth routes.login
- reusable auth form shows "Already have an account? Log in" through routes.login
- gated lead success advances to a DSL confirmation slide
- duplicate gated-link clicks are reduced because form is no longer left visible after success
- DB-backed UserMarketingQuestionAnswer model
- DB-backed UserVideoProgress model
- local engagement tracking syncs into DB when a user/lead becomes known
- performance/rating slides bypass only when DB says the user already answered
- gated-access cookie can identify the temporary/lead account
- returning lead/temp account can become a normal session from signed gated cookie
- video resume is controlled per video through @videoresume
- @videoresume supports none, auto, prompt-once, prompt-every-time
- @videoresume can combine with @videogoto
- @syncurl supports refreshable deep slides such as second-video
- Clear Visitor State option exists for development/testing
```

After committing these local fixes, update this README source-of-truth SHA.

---

## Future extraction direction

This repository currently combines several systems in one development project, but the long-term direction is separation:

```txt
reusable-slide-pages
→ shared development ground / proving ground

nursery-ops
→ later extracted as its own dedicated website/app

plant shop / seed shop flows
→ later extracted as their own plant commerce website/app

invitation / music / event flows
→ later extracted as their own website/app

reusable auth
→ extracted/refined back into a robust standalone reusable auth/account system
```

Because of this, shared systems should stay reusable:

- `QuestionnaireShell`
- parser
- registry
- reusable block definitions
- data loaders
- account/auth API helpers
- `src/customerAccess`
- auth rules/config
- verification delivery layer
- verification components
- delivery attempt logging
- gated access helpers
- engagement tracking helpers
- embedded auth form renderer

Avoid hardcoding nursery, plant shop, invitation, or business-specific wording into shared systems.

Project-specific wording belongs in:

```txt
DSL files
config files
registry variables
block definitions
catalog helpers
isolated server helpers
```

Reusable behavior belongs in:

```txt
shared parser
shared shell
types
route handlers
src/customerAccess
src/lib/auth
src/lib/verification
src/lib/questionnaire
```

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
- crypto/HMAC signed gated access cookies
- Git LFS for large media when needed

---

## Supported capabilities

The project supports:

- marketing funnels
- questionnaires
- media-rich video flows
- URL-refreshable slides
- gated video access
- per-video resume behavior
- return-viewer resume prompts
- storefront pages
- delivery and pickup flows
- contact capture
- embedded reusable auth forms
- gated lead capture
- temporary auth-backed lead accounts
- marketing-question answer storage
- video progress storage
- digital downloads
- ticket / invitation flows
- ticket-owner assignment
- per-ticket meal selection
- ticket owner email delivery direction
- DB-backed nursery operations
- record lists
- reusable profile blocks
- reusable authentication
- slide-style signup and login
- slide-style account verification
- reusable auth footer inside slide flows
- password reset
- account management
- account summary cards
- update account information
- configurable name-update limits
- name-change history
- retained email history
- verified active email switching
- password updated timestamp tracking
- configurable account deletion
- account deletion verification codes
- immediate or scheduled account deletion
- dev-safe email delivery testing
- real-recipient email testing

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
- optional reusable auth UI components
- optional gated access config in registry variables
- optional marketing-question config in registry variables

Shared questionnaire route:

```txt
/questionnaire/[slug]
```

The shared shell stays generic.

---

## Active questionnaires and flows

## `self-trust`

A score-based self-trust flow.

Route:

```txt
/questionnaire/self-trust
```

---

## `garden-herbs`

A content questionnaire for garden herbs.

Route:

```txt
/questionnaire/garden-herbs
```

---

## `seed`

A plant/seed funnel with DB-backed shop catalog, delivery selection, contact capture, review order, discounts, and promotion item logic.

Route:

```txt
/questionnaire/seed
```

---

## `invitation`

A media-first invitation and storefront flow for music, event tickets/invitations, album downloads, gated second-video access, per-ticket owner details, per-ticket meal selection, and future gated download/ticket access.

Route:

```txt
/questionnaire/invitation
```

Current capabilities:

- vertical video intro slides
- video-linked progress bar
- video start timestamp through `@videostart`
- video timestamp routing through `@videogoto`
- per-video resume behavior through `@videoresume`
- URL-addressable slides through `@syncurl`
- hamburger auth menu on selected slides
- action-bar login/logout on selected slides
- login return-to-slide flow
- performance rating slide
- DB-backed marketing-question answer tracking
- answered marketing-question bypass
- embedded reusable gated lead capture form
- temporary auth-backed user creation for gated leads
- private video link emailed after lead signup
- gated lead success confirmation slide
- verification/access link verifies the lead/account email
- signed long-lived gated-access cookie after verification
- returning verified lead can become logged-in temporary account/session
- automatic lead-form bypass when known user/session exists
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

---

## `nursery-ops`

A DB-backed nursery operations flow for batches, batch subsets, transplanted individuals, record lists, and reusable block-driven profiles.

Route:

```txt
/questionnaire/nursery-ops
```

Current direction:

- DB-backed batch creation
- batch subsets
- transplanted individuals
- record lists
- reusable profile blocks
- dynamic data loading
- reusable delete confirmation
- update/cancel/return-home behavior
- avoid hardcoding nursery wording into shared shell code

---

## `generic-profile-flow`

A reusable profile-flow testbed.

Route:

```txt
/questionnaire/generic-profile-flow
```

---

## Auth slide flows

Reusable auth has been merged into reusable-slide-pages.

The goal is to let the same slide system handle signup, login, verification, password reset, account management, account deletion, and verified account-contact updates while still keeping the auth APIs and reusable auth UI components reusable.

Preferred slide-style auth routes:

```txt
/questionnaire/auth-signup
/questionnaire/auth-login
/questionnaire/auth-account
/questionnaire/auth-forgot-password
/questionnaire/auth-reset-password
/questionnaire/auth-delete-account
```

Legacy auth page routes may still exist, but slide-style auth routes are the preferred UX direction.

---

## `auth-signup`

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
- checks retained email history before allowing account creation
- blocks account creation with an email ever reserved to another account
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
- reusable auth footer appears inside the slide

Backend routes:

```txt
/api/signup
/api/signup/check-identifier
/api/verify/start
/api/verify/check
```

---

## `auth-login`

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
→ Continue
```

Current behavior:

- identifier field
- password field
- slide-style login submission
- successful login creates a database-backed session
- session token is stored in HTTP-only cookie
- login page hides progress bar and slide count
- login success button says `Continue`
- if login was opened from another questionnaire slide, the success button returns to that slide
- if no return target exists, login can fall back to the account hub
- footer links include forgot password and create account

Backend route:

```txt
/api/login
```

Session helpers:

```txt
src/lib/auth/sessionServer.js
src/lib/auth/sessionCookie.js
src/lib/auth/sessionToken.js
```

Testing note:

Use the same host for login and account testing.

Use:

```txt
http://localhost:3000
```

Do not mix with:

```txt
http://127.0.0.1:3000
```

Cookies are host-specific.

---

## `auth-account`

Slide-style account management hub.

Route:

```txt
/questionnaire/auth-account
```

Current behavior:

- requires logged-in session
- logged-out users are redirected to slide-style login
- account page behaves as a hub/card page, not normal step-by-step slide
- slide count hidden
- progress bar hidden
- shows account information in card sections
- shows masked active email
- shows masked phone
- shows name
- shows location
- shows mailing address
- shows password placeholder only, never the password
- shows password last updated timestamp when available
- shows deletion status if pending/deleted
- shows remaining name-update opportunities before user submits
- provides update buttons under each relevant section
- update buttons route to focused account update slides
- delete button routes to delete account flow
- logout button calls `/api/logout` and returns to login
- footer links include dashboard and policies

Backend route:

```txt
/api/account/profile
```

Account profile endpoint returns:

```txt
id
name
email
phone
maskedEmail
maskedPhone
activeEmailAddress
emailAddresses
country
city
addressLine1
addressLine2
parishOrRegion
postalCode
emailVerifiedAt
phoneVerifiedAt
passwordUpdatedAt
createdAt
updatedAt
deletionRequestedAt
deletionScheduledAt
deletedAt
deletionStatus
```

---

## Account name update limits

Name update limits are configurable and backend-enforced.

Config lives in:

```txt
src/customerAccess/config/authRules.js
```

Example:

```js
accountInfo: {
  nameUpdate: {
    enabled: true,
    window: "forever", // "forever" | "calendarMonth" | "rollingDays" | "rollingMonths"
    maxUpdates: 2,
    rollingDays: null,
    rollingMonths: null,
  },
},
```

Examples:

```js
// 2 times forever
nameUpdate: {
  enabled: true,
  window: "forever",
  maxUpdates: 2,
  rollingDays: null,
  rollingMonths: null,
}
```

```js
// once per month
nameUpdate: {
  enabled: true,
  window: "calendarMonth",
  maxUpdates: 1,
  rollingDays: null,
  rollingMonths: null,
}
```

```js
// twice every 6 months
nameUpdate: {
  enabled: true,
  window: "rollingMonths",
  maxUpdates: 2,
  rollingDays: null,
  rollingMonths: 6,
}
```

Backend routes:

```txt
/api/account/update-info
/api/account/name-update-status
```

Prisma model:

```prisma
model UserNameChange {
  id           String   @id @default(cuid())
  userId       String
  previousName String?
  newName      String
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

Rules:

```txt
- frontend displays remaining update opportunities
- backend still enforces the limit
- only actual name changes create UserNameChange rows
- non-name account updates should not consume name-update opportunities
```

---

## Account email history and active email model

The account email system supports retained email history.

Core rules:

```txt
One account can have many email records.
Only one email is active at a time.
Every email ever attached to an account remains reserved.
A reserved email cannot create another account.
Only verified emails can become active.
The active email is used for account updates, verification, receipts, downloads, tickets, invoices, marketing, and notifications.
```

Prisma model:

```prisma
model UserEmailAddress {
  id              String    @id @default(cuid())
  userId          String
  email           String
  normalizedEmail String    @unique

  isActive        Boolean   @default(false)
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  reservedAt      DateTime  @default(now())

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isActive])
  @@index([userId, isVerified])
}
```

Important:

```txt
User.email remains for compatibility.
UserEmailAddress becomes the email ownership/history source of truth.
```

Existing accounts must be backfilled so their current `User.email` is also stored in `UserEmailAddress`.

Backfill SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "UserEmailAddress" (
  "id",
  "userId",
  "email",
  "normalizedEmail",
  "isActive",
  "isVerified",
  "verifiedAt",
  "reservedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  "email",
  lower(trim("email")),
  true,
  CASE WHEN "emailVerifiedAt" IS NOT NULL THEN true ELSE false END,
  "emailVerifiedAt",
  now(),
  now(),
  now()
FROM "User"
WHERE "email" IS NOT NULL
ON CONFLICT ("normalizedEmail") DO NOTHING;
```

Inspect email history:

```sql
SELECT
  "id",
  "userId",
  "email",
  "normalizedEmail",
  "isActive",
  "isVerified",
  "verifiedAt",
  "reservedAt",
  "createdAt"
FROM "UserEmailAddress"
ORDER BY "userId", "isActive" DESC, "createdAt" ASC;
```

---

## Account email update flow

Route in account hub:

```txt
/questionnaire/auth-account
→ Update Email
```

Current flow:

```txt
Enter new email
→ Send Verification Code
→ authverify slide
→ six code boxes
→ final digit auto-verifies
→ wrong code clears boxes
→ resend button shows cooldown
→ resend button activates after cooldown
→ successful verification activates new email
```

Backend routes:

```txt
/api/account/email-addresses
/api/account/email-addresses/request
/api/account/email-addresses/activate
/api/verify/start
/api/verify/check
```

Important target:

```txt
accountEmailUpdate
```

Verification content target:

```txt
verificationContent.targets.accountEmailUpdate.code.email
```

Rules:

```txt
- requesting a new email reserves it to the logged-in account
- if the email belongs to another account, request is blocked
- if the email already belongs to this account and is verified, it can be activated
- if the email already belongs to this account and is not verified, another code can be sent
- verification uses the reusable auth verification panel
- successful verification sets the email record verified and active
- all other email records on the same account become inactive
- User.email updates to the active email for compatibility
- old emails are never deleted
```

---

## Embedded reusable auth forms

The slide system supports embedding reusable `customerAccess` auth forms inside a questionnaire slide.

Slide type:

```txt
authform
```

Directive:

```txt
@authform:
```

Currently supported keys:

```txt
leadCapture
gatedLeadCapture
```

Purpose:

```txt
- keep form behavior inside reusable auth/customerAccess components
- avoid rebuilding auth and lead forms manually in DSL
- allow slides to contain reusable auth forms while preserving slide routing
- allow reusable auth form bottom links through routes.login/routes.signup
```

Important implementation note:

```txt
LeadCaptureForm accepts routes.
LeadCaptureForm passes routes to AuthForm.
AuthForm renders "Already have an account? Log in" when routes.login exists.
QuestionnaireShell should pass loginHref through routes.login instead of manually adding a separate link under the embedded form.
```

Example:

```txt
===
@id: whatsapp-subscription
@type: authform
@authform: gatedLeadCapture
@shownext: false
@countstep: false
@showsteptext: false
@showprogressbar: false
@goto: private-link-sent
---
BR
# [c1] Continue watching
BR
[c3] Sign up and check your email for the private link to the next video.
```

Confirmation slide after gated lead signup:

```txt
===
@id: private-link-sent
@type: content
@title: Check your email
@subtitle: Your private link is on the way.
@body: We sent a private link to your email. Open that link to verify your access and continue watching.
@showauthcontrols: true
@showreturnhome: true
@showback: false
@countstep: false
@next: Return Home
@goto: home
```

Rules:

```txt
- gatedLeadCapture success should advance to the slide configured by @goto
- do not leave the form visible after successful submit
- this prevents repeated clicking and repeated private-link emails
- already-account users should use the reusable AuthForm routes.login bottom link
```

Future possible keys:

```txt
signup
login
forgotPassword
resetPassword
accountEmailUpdate
phoneUpdate
marketingOptIn
downloadAccess
ticketAccess
```

---

## Gated lead access

Gated lead access is used when a user should provide an email before accessing a private slide or video.

Current invitation flow:

```txt
first video
→ performance rating, if not already answered
→ gatedLeadCapture form, if not already known/logged in
→ temporary auth-backed user created/found
→ Lead created/updated
→ engagement snapshot synced to DB
→ private access link emailed
→ confirmation slide
→ user clicks private link in email
→ /verify consumes token
→ User email verified
→ UserEmailAddress verified
→ Lead verified
→ signed long-lived gated-access cookie set
→ redirect to configured private slide
```

Backend routes:

```txt
/api/auth/temporary-lead-account
/api/verify/consume-link
/api/questionnaires/gated-access/status
/api/questionnaires/engagement/sync
/api/questionnaires/engagement/status
```

Verification target:

```txt
gatedLeadAccess
```

Verification content target:

```txt
verificationContent.targets.gatedLeadAccess.link.email
```

Gated access cookie helper:

```txt
src/lib/questionnaire/gatedAccessCookie.js
```

Cookie name:

```txt
questionnaire_gated_access
```

Cookie behavior:

```txt
- signed with HMAC
- HttpOnly
- sameSite lax
- secure in production
- path /
- long-lived expiry
- stores gated access state
- can include userId for temporary/lead account session bridge
- does not store raw video timestamp
```

Cookie payload may store:

```txt
target
questionnaireSlug
goto
userId
identifierHash
verifiedAt
expiresAt
```

Cookie payload should not store:

```txt
raw email
raw phone
video timestamp
```

Environment secret:

```env
GATED_SLIDE_ACCESS_SECRET="make-this-a-long-random-string"
```

Use a strong random value before production.

---

## Returning verified lead / temporary account flow

Returning verified users do not need to see the gated lead form again.

The shell checks:

```txt
/api/questionnaires/gated-access/status
```

Behavior:

```txt
User opens /questionnaire/invitation with valid signed gated-access cookie
→ shell checks gated-access status
→ status can create/refresh a normal auth session for the temporary lead user
→ shell loads DB engagement status
→ answered marketing questions are skipped based on DB records
→ gated lead form is bypassed based on known user/session access
```

Important correction:

```txt
The cookie should not decide whether a marketing question is skipped.
Marketing question skip should come from UserMarketingQuestionAnswer.
```

---

## Marketing-question answer tracking

Marketing questions can be tracked per user.

Purpose:

```txt
- do not show the same rating/marketing slide again after the user answered
- let users later review or update answered questions
- keep the rule DB-backed instead of cookie-backed
```

Prisma model:

```prisma
model UserMarketingQuestionAnswer {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  questionnaireSlug String
  slideId           String
  questionKey       String
  answer            Json
  source            String?
  answeredAt        DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([userId, questionnaireSlug, questionKey])
  @@index([userId])
  @@index([questionnaireSlug])
  @@index([slideId])
  @@index([answeredAt])
}
```

Registry example:

```ts
variables: {
  marketingQuestions: {
    skipWhenLoggedIn: true,
    skipSlideIds: ["performance-rating"],
    skipTarget: "second-video",
    answeredQuestionsTarget: "/questionnaire/auth-account?section=answered-questions",
  },
}
```

Behavior:

```txt
anonymous visitor answers marketing question
→ answer is stored locally
→ if user signs up as lead/temp account, local answer syncs to DB
→ when user returns, shell loads DB answer status
→ slide is skipped if its slideId is already answered
```

---

## Video progress tracking

Video progress is tracked locally first, then synced to DB when the user becomes known.

Prisma model:

```prisma
model UserVideoProgress {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  questionnaireSlug   String
  slideId             String
  lastPositionSeconds Int      @default(0)
  durationSeconds     Int?
  watchedAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([userId, questionnaireSlug, slideId])
  @@index([userId])
  @@index([questionnaireSlug])
  @@index([slideId])
  @@index([watchedAt])
}
```

Backend routes:

```txt
/api/questionnaires/engagement/sync
/api/questionnaires/engagement/status
```

Local helper:

```txt
src/lib/questionnaire/engagementTracking.ts
```

Rules:

```txt
- anonymous video progress is saved locally first
- local progress syncs to DB once user/lead/temp account exists
- DB progress becomes source of truth for known users
- gated cookie does not store timestamps
- per-video resume behavior is controlled by the video slide's @videoresume directive
```

---

## Video timestamp and resume system

The video timestamp system uses DSL directives.

Start a video at a configured timestamp:

```txt
@videostart: 14:18
```

Route to another slide at a video timestamp:

```txt
@videogoto: 00:45|performance-rating
```

Use video progress mode:

```txt
@progressmode: video
```

Control autoplay:

```txt
@autoplay: true
```

Control resume behavior:

```txt
@videoresume: none
@videoresume: auto
@videoresume: prompt-once
@videoresume: prompt-every-time
```

Resume modes:

```txt
none
→ no saved progress behavior; use @videostart only

auto
→ automatically start this video from its own saved DB timestamp if available

prompt-once
→ ask once per session for this specific video slide only

prompt-every-time
→ ask every time the user lands on this specific video slide
```

Important:

```txt
Resume mode is per video slide.
A decision on video 1 should not control video 2.
Each video uses its own saved UserVideoProgress row.
```

Example:

```txt
===
@id: home
@type: media
@media: /media/invitation/intro.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@progressmode: video
@videogoto: 00:45|performance-rating
@videoresume: prompt-once
@showauthcontrols: true
@countstep: false
@showsteptext: false
@showprogressbar: true
```

Example second video:

```txt
===
@id: second-video
@type: media
@media: /media/invitation/private-video.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@progressmode: video
@videostart: 14:18
@videoresume: auto
@syncurl: true
@showreturnhome: true
@showauthcontrols: true
@countstep: false
@showsteptext: false
@showprogressbar: true
```

Expected combined behavior:

```txt
first video has @videoresume: prompt-once and @videogoto
→ returning user clicks Continue from where I stopped
→ video seeks to its saved timestamp
→ if playback reaches @videogoto, shell routes forward
→ marketing slide is skipped if DB says answered
→ gated lead form is skipped if user/session exists
→ second video has @videoresume: auto
→ second video starts from its own saved timestamp
```

---

## URL-addressable slides

Slides can opt into URL syncing.

Directive:

```txt
@syncurl: true
```

Purpose:

```txt
- allow refresh to return to a deep slide instead of restarting at slide 1
- support private/deep video slides
- keep the behavior opt-in per slide
```

Example:

```txt
===
@id: second-video
@type: media
@mediatype: video
@syncurl: true
@showreturnhome: true
```

Behavior:

```txt
user reaches second-video
→ URL becomes /questionnaire/invitation?slide=second-video

user refreshes
→ questionnaire opens second-video

user clicks Return Home
→ existing Return Home calls goToTarget("home")
→ home does not have @syncurl
→ shell clears ?slide=second-video
```

Important:

```txt
Do not hardcode slide IDs into QuestionnaireShell.
Only the DSL decides which slides use @syncurl.
```

---

## Hamburger auth menu and visitor reset

Selected slides can show auth controls:

```txt
@showauthcontrols: true
```

The top utility auth control is a hamburger menu.

Menu behavior:

```txt
logged out
→ Login
→ Clear Visitor State

logged in
→ Account
→ Answered Questions
→ Logout
→ Clear Visitor State
```

Clear Visitor State is mostly for development/testing.

It clears:

```txt
- session/logout state
- gated access cookie
- local engagement snapshot
- local/session resume choices
- relevant readable local cookies
```

Backend route:

```txt
/api/questionnaires/visitor-state/clear
```

---

## Active email for messaging

Account messages should use the active verified email when available.

Preferred lookup:

```js
const activeEmail = await prisma.userEmailAddress.findFirst({
  where: {
    userId,
    isActive: true,
    isVerified: true,
  },
});
```

Fallback for older accounts:

```js
const emailToUse = activeEmail?.email ?? user.email;
```

Long-term direction:

```txt
Auth:
- users
- verified emails
- sessions
- temporary/claimed accounts
- consent/opt-in status later

Reusable-slide-pages:
- products
- tickets
- invitations
- meals
- orders
- invoices
- downloads
- gated slide access
- video progress
- marketing-question answers

Shared messaging:
- email sending
- WhatsApp sending later
- templates
- delivery logs
- marketing sequences
```

---

## `auth-forgot-password`

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
- back button can return to the account hub when opened from account management
- footer links include back to login and create account

Backend route:

```txt
/api/password/forgot
```

---

## `auth-reset-password`

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
- updates `passwordUpdatedAt`
- old sessions are revoked after password reset
- footer links include back to login and create account

Backend route:

```txt
/api/password/reset
```

---

## `auth-delete-account`

Slide-style delete account flow.

Route:

```txt
/questionnaire/auth-delete-account
```

Current delete-account flow when verification code is required:

```txt
Type DELETE
→ Send Delete Code
→ code email sends
→ Enter delete code
→ Complete Deletion
→ success slide
→ user is logged out
```

Current behavior:

- user must be logged in
- user must type `DELETE`
- start route sends a deletion verification code
- deletion code is stored as a bcrypt hash
- deletion code uses `target: "accountDeletion"`
- deletion code email wording is configured through `verificationContent.js`
- duplicate send protection exists in the slide action flow
- server-side cooldown prevents immediate duplicate deletion-code emails
- final delete route checks the deletion code before deleting or scheduling
- final delete route clears the session after successful deletion/scheduling
- success slide wording changes based on immediate vs scheduled deletion
- stale “You must be logged in” errors are hidden on successful deletion confirmation
- footer links include back to account and policies

Backend routes:

```txt
/api/account/delete/start
/api/account/delete
/api/account/delete/cancel
```

---

## Reusable auth footer

The reusable auth footer lives in:

```txt
src/customerAccess/components/AuthFooter.jsx
src/customerAccess/components/AuthFooter.d.ts
```

The footer uses:

```txt
src/customerAccess/config/siteConfig.js
src/customerAccess/config/siteConfig.d.ts
```

The slide shell imports and renders the reusable footer only for auth flows:

```txt
config.slug starts with "auth-"
```

The footer is intentionally part of `src/customerAccess` so the slide system builds on reusableAuth instead of creating a separate one-off footer inside `QuestionnaireShell`.

Footer behavior by flow:

```txt
auth-login
→ Forgot password?
→ Create account

auth-signup
→ Already have an account? Log in

auth-forgot-password
→ Back to login
→ Create account

auth-reset-password
→ Back to login
→ Create account

auth-account
→ Dashboard

auth-delete-account
→ Back to account
```

All auth footers also show:

```txt
business name
privacy policy link
terms link
contact link
```

Footer routes come from:

```txt
siteConfig.routes
siteConfig.footerLinks
```

---

## Site config

Reusable auth site config:

```txt
src/customerAccess/config/siteConfig.js
```

Current structure:

```js
export const siteConfig = {
  businessName: "Reusable Auth-Lead Capture system",
  footerLinks: {
    privacy: "/privacy-policy",
    terms: "/terms",
    contact: "/contact",
  },
  routes: {
    login: "/questionnaire/auth-login",
    signup: "/questionnaire/auth-signup",
    verify: "/verify",
    dashboard: "/dashboard",
    verifiedLead: "/verify/verified-lead",
    verifyLinkSent: "/verify/link-sent",
    forgotPassword: "/questionnaire/auth-forgot-password",
    forgotPasswordCode: "/forgot-password/code",
    resetPassword: "/questionnaire/auth-reset-password",
    account: "/questionnaire/auth-account",
    deleteAccount: "/questionnaire/auth-delete-account",
  },
};
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
- `blocks`

The registry loads the DSL, injects variables, parses slides, injects reusable blocks, and returns the config and theme to the shared route.

For invitation flows, the registry can inject:

```txt
shopCatalog
deliveryConfig
discountDefinitions
mealMenus
gatedAccess
marketingQuestions
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

---

## Verification content config

Verification message wording is configured in:

```txt
src/customerAccess/config/verificationContent.js
```

The delivery helper resolves content using:

```txt
target
delivery
channel
```

Example target paths:

```txt
verificationContent.targets.user.code.email
verificationContent.targets.lead.code.email
verificationContent.targets.passwordReset.link.email
verificationContent.targets.accountDeletion.code.email
verificationContent.targets.accountEmailUpdate.code.email
verificationContent.targets.gatedLeadAccess.link.email
```

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

Safe testing:

```env
EMAIL_DEV_TEST_MODE="true"
EMAIL_DEV_TEST_INBOX="paralifetrees@gmail.com"
```

When dev test mode is on:

```txt
real submitted email
→ rewritten to EMAIL_DEV_TEST_INBOX
```

For real-recipient testing:

```env
EMAIL_DEV_TEST_MODE="false"
```

Restart the dev server after changing `.env`.

Expected dev-safe delivery log:

```txt
provider: smtp
mode: smtp
ok: true
rewritten: true
to: EMAIL_DEV_TEST_INBOX
originalTo: real-user@example.com
```

Expected real-recipient delivery log:

```txt
provider: smtp
mode: smtp
ok: true
rewritten: false
to: real-user@example.com
originalTo: real-user@example.com
```

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
- password update timestamp tracking through `passwordUpdatedAt`

Password fields are supported in DSL forms:

```txt
@fields:
- password|password|Password|required|Enter password
- confirmPassword|password|Confirm password|required|Type password again
```

---

## Password updated tracking

The `User` model supports:

```prisma
passwordUpdatedAt DateTime?
```

This field should be set:

```txt
on signup
on password reset
on future logged-in password change
```

Password display rule:

```txt
Never show the password.
Only show last updated date/time.
```

---

## Account deletion config

Account deletion is business-configurable.

Config lives in:

```txt
src/customerAccess/config/authRules.js
```

Example immediate deletion with code verification:

```js
accountDeletion: {
  mode: "immediate",
  delayDays: 0,
  allowCancelBeforeDeletion: false,
  anonymizeInsteadOfDelete: false,

  requireVerificationCode: true,
  verificationExpiresInMinutes: 10,
}
```

Example delayed deletion with code verification:

```js
accountDeletion: {
  mode: "delayed",
  delayDays: 30,
  allowCancelBeforeDeletion: true,
  anonymizeInsteadOfDelete: false,

  requireVerificationCode: true,
  verificationExpiresInMinutes: 10,
}
```

Example anonymize instead of hard delete:

```js
accountDeletion: {
  mode: "delayed",
  delayDays: 14,
  allowCancelBeforeDeletion: true,
  anonymizeInsteadOfDelete: true,

  requireVerificationCode: true,
  verificationExpiresInMinutes: 10,
}
```

Supported intended options:

```txt
mode: "immediate" | "delayed"
delayDays: number
allowCancelBeforeDeletion: boolean
anonymizeInsteadOfDelete: boolean
requireVerificationCode: boolean
verificationExpiresInMinutes: number
```

---

## User model account fields

The `User` model supports account profile fields:

```prisma
name              String?
country           String?
city              String?
addressLine1      String?
addressLine2      String?
parishOrRegion    String?
postalCode        String?
email             String?
phone             String?
emailVerifiedAt   DateTime?
phoneVerifiedAt   DateTime?
passwordUpdatedAt DateTime?
```

Deletion-related fields:

```prisma
deletionRequestedAt DateTime?
deletionScheduledAt DateTime?
deletedAt           DateTime?
deletionStatus      String?
```

Account relations include:

```prisma
sessions                  Session[]
verificationCodes         VerificationCode[]
verificationTokens        VerificationToken[]
passwordResetTokens       PasswordResetToken[]
passwordResetChallenges   PasswordResetAccessGrant[]
nameChanges               UserNameChange[]
emailAddresses            UserEmailAddress[]
marketingQuestionAnswers  UserMarketingQuestionAnswer[]
videoProgressRecords      UserVideoProgress[]
```

---

## Verification token model

The `VerificationToken` model supports link verification and gated access redirect behavior.

Required fields include:

```prisma
identifier
tokenHash
target
successRedirect
expiresAt
consumedAt
userId
```

`successRedirect` is needed for flows such as:

```txt
gatedLeadAccess
→ /questionnaire/invitation?leadAccess=verified&goto=second-video
```

---

## Prisma / database commands

After schema changes, run:

```bash
npx prisma format
npx prisma db push
npx prisma generate
npm run build
```

Do not run this against Supabase unless data loss is acceptable:

```bash
npx prisma migrate reset
```

If Prisma reports drift on Supabase, do not reset the public schema. Use careful `db push` for additive changes, or baseline migration history separately.

After auth/session/schema changes during development, restart cleanly:

```bash
Ctrl + C
rmdir /s /q .next
npx prisma generate
npm run dev
```

PowerShell:

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next
npx prisma generate
npm run dev
```

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
src/config/questionnaires/authAccountDsl.txt
src/config/questionnaires/authUpdateInfoDsl.txt
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
authform
accountsummary
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
@showprogressbar:
@showreturnhome:
@showcancel:
@showauthcontrols:
@syncurl:
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
@videoresume:
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
@authform:
```

---

## Basic DSL examples

## Account summary hub

```txt
===
@id: account-home
@type: accountsummary
@shownext: false
@countstep: false
@showsteptext: false
@showprogressbar: false
```

The `accountsummary` renderer handles:

```txt
account cards
masked values
email history display
update buttons
logout button
logged-out redirect
delete account link
```

---

## Login slide without progress UI

```txt
===
@id: login
@type: form
@shownext: true
@next: Log In
@goto: login-submitting
@run: submitLogin
@countstep: false
@showsteptext: false
@showprogressbar: false
---
BR
# [c1] Log in
BR
[c3] Enter your email or phone number and password.
@fields:
- identifier|text|Email or phone|required|Email or phone number
- password|password|Password|required|Password
```

---

## Account email update with authverify

```txt
===
@id: account-update-email
@type: form
@shownext: true
@next: Send Verification Code
@goto: account-update-email-code
@showback: true
@back: Back
@backgoto: account-home
@run: requestAccountEmailUpdate
---
BR
# [c1] Add or update email
BR
[c3] Enter the new email address. We will send a code before it becomes your active email.
@fields:
- accountEmailAddress|email|New email address|required|you@example.com

===
@id: account-update-email-code
@type: authverify
@shownext: false
@showback: true
@back: Back
@backgoto: account-update-email
@goto: account-saved
---
BR
# [c1] Verify new email
BR
[c3] Enter the newest code we sent to your new email address.
```

---

## Embedded gated lead form

```txt
===
@id: whatsapp-subscription
@type: authform
@authform: gatedLeadCapture
@shownext: false
@countstep: false
@showsteptext: false
@showprogressbar: false
@showauthcontrols: true
@goto: private-link-sent
---
BR
# [c1] Continue watching
BR
[c3] Sign up and check your email for the private link to the next video.
```

---

## Gated lead confirmation slide

```txt
===
@id: private-link-sent
@type: content
@title: Check your email
@subtitle: Your private link is on the way.
@body: We sent a private link to your email. Open that link to verify your access and continue watching.
@showauthcontrols: true
@showreturnhome: true
@showback: false
@countstep: false
@next: Return Home
@goto: home
```

---

## Video slide with resume and URL sync

```txt
===
@id: second-video
@type: media
@media: /media/invitation/private-video.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@progressmode: video
@videostart: 14:18
@videoresume: auto
@syncurl: true
@showreturnhome: true
@showauthcontrols: true
@countstep: false
@showsteptext: false
```

---

## Delete account flow

```txt
===
@id: delete-account-warning
@type: form
@shownext: true
@next: Send Delete Code
@goto: delete-account-code
@showback: true
@back: Back to Account
@backgoto: /questionnaire/auth-account
@run: startDeleteAccount
---
BR
# [c1] Delete account
BR
[c3] Type DELETE to confirm. We will send a verification code before completing the deletion.
@fields:
- deleteConfirmation|text|Type DELETE to confirm|required|DELETE
```

---

## Dynamic variables

A registry entry can define:

```ts
dynamicVariablesEndpoint: "/api/questionnaires/nursery-ops/data";
```

The shared route loads dynamic variables and merges them into questionnaire variables before rendering.

Use this for DB-backed flows such as:

```txt
nursery batches
batch subsets
transplanted individuals
shop catalog data
ticket data later
```

---

## Reusable record lists

Record list slide type:

```txt
recordlist
```

Supported directives:

```txt
@source:
@titlefield:
@subtitlefield:
@metafields:
@emptytext:
@store:
@goto:
```

Example:

```txt
===
@id: existing-batches
@type: recordlist
@source: nurseryBatches
@titlefield: plantName
@subtitlefield: code
@metafields: startDate,status
@emptytext: No batches created yet.
@store: opsSelectedBatchCode
@goto: batch-profile
```

Behavior:

```txt
- list records from dynamic variables
- store selected record id/code/value
- go to target slide
- profile blocks can use selected record context
```

---

## Reusable profile blocks

Blocks are defined in registry/config, not hardcoded in the shell.

Block actions can route to other slides.

Supported ideas:

```txt
rows
sections
section actions
profile actions
showIf rules
selected source records
```

Use blocks for reusable profile screens such as:

```txt
batch profile
batch subset profile
transplanted individual profile
ticket profile later
order profile later
```

---

## Shop / ticket / meal flow

The invitation and plant shop flows share reusable commerce pieces.

Supported concepts:

```txt
ShopCatalog
ShopCart
ShopResolvedCartLine
DeliverySelection
MealMenu
TicketAssignment
TicketAssignments
TicketMealSelection
MealSelections
DiscountDefinition
```

Ticket flow supports:

```txt
- product purchase modes with fulfillment type
- ticket product type
- generated temporary ticket codes
- owner name
- owner email
- owner phone
- purchaser ticket marker
- email this ticket to owner
- meal mode required/optional
- meal menu id
- meal label
- meal add-on price
- wants extra food
- meal notes
- per-ticket meal selections
```

Current direction:

```txt
- original purchaser can see all tickets
- original purchaser can pay for additions for invited guests
- invited guests will later receive their own portal URL
- invited guests can view/edit only their own ticket details
- temporary accounts can be created for ticket owners
- ticket-owner portal should build on reusable auth/session features
```

---

## Downloads

Private downloads use API routes rather than exposing raw private files directly.

Current ideas:

```txt
- download buttons in DSL
- catalog key maps to protected files
- per-track MP3/WAV support
- album purchase access later
- persistent emailed access links later
```

DSL example:

```txt
@downloadbuttons:
- escape-mp3|Download MP3|primary
- escape-wav|Download WAV|secondary
```

---

## Development workflow expectations

Before making changes:

```txt
1. Read README.md.
2. Read example_ChatGPT_workflow.txt.
3. Read the relevant DSL file.
4. Read the current component/API file before suggesting changes.
5. Build on existing files and patterns.
6. Do not create new one-off systems when reusable systems already exist.
```

Preferred response style for code help:

```txt
- path first
- exact replacement blocks
- one line of context above/below when possible
- avoid vague "find the section" instructions
- keep QuestionnaireShell generic
- keep DSL-specific copy in DSL/config
- prefer reusable helpers
- avoid unnecessary new DSL directives when existing ones already solve it
- avoid hardcoded invitation/nursery/shop slide IDs inside shared shell code
```

---

## Build and test commands

Install:

```bash
npm install
```

Run dev:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Prisma format:

```bash
npx prisma format
```

Push schema:

```bash
npx prisma db push
```

Generate Prisma client:

```bash
npx prisma generate
```

Common full cycle after schema changes:

```bash
npx prisma format
npx prisma db push
npx prisma generate
npm run build
npm run dev
```

---

## Regression checklist

After auth/account changes:

```txt
- signup works
- signup verification code sends
- verification auto-checks after final code digit
- wrong verification code clears the code boxes
- resend verification code cooldown works
- login works
- login success button returns to returnTo slide when returnTo exists
- auth-login has no progress bar or slide count
- auth-account requires login
- auth-account page does not show slide count or progress bar
- auth-account summary cards load
- logout works
- account deletion code sends once
- account deletion server cooldown prevents duplicate emails
- account deletion completes or schedules based on config
```

After email-history changes:

```txt
- signup creates UserEmailAddress row
- existing User.email can be backfilled into UserEmailAddress
- new email update reserves email to same account
- email already reserved to another account is blocked
- verified email can become active
- old emails remain stored
- User.email updates to active email for compatibility
```

After gated lead/access changes:

```txt
- logged-out visitor reaches gatedLeadCapture form
- reusable auth embedded form renders
- "Already have an account? Log in" appears through routes.login
- gated lead submit creates/fetches temporary auth-backed user
- gated lead submit creates/updates Lead row
- local engagement snapshot syncs after lead submit
- private access link email sends
- success advances to confirmation slide
- form is not left visible after success
- clicked private link verifies user/email/lead
- gated access cookie is set
- returning verified lead can bypass gate
- returning verified lead can become session-backed temp user
```

After marketing-question tracking changes:

```txt
- anonymous marketing answer stores locally
- lead signup syncs local answer to UserMarketingQuestionAnswer
- returning user loads DB answered slide ids
- answered marketing slide is skipped
- skip is based on DB, not cookie
```

After video tracking/resume changes:

```txt
- anonymous video progress stores locally
- known user video progress syncs to UserVideoProgress
- @videoresume: none uses @videostart only
- @videoresume: auto resumes from this video slide's saved timestamp
- @videoresume: prompt-once asks once per session for this video only
- @videoresume: prompt-every-time asks every time this video loads
- prompt continue seeks immediately to saved timestamp
- prompt start uses configured @videostart
- @videoresume can combine with @videogoto
- second video can use @videoresume: auto after first video routes forward
```

After URL-sync changes:

```txt
- slide with @syncurl updates URL to ?slide=<id>
- refresh opens the synced slide
- non-sync slides clear ?slide
- Return Home remains generic and routes through goToTarget("home")
- Return Home clears URL when home does not have @syncurl
```

After invitation ticket/meal changes:

```txt
- contact details come before ticket details
- first ticket can autofill from contact/account details
- ticket owner name/email/phone can be edited
- purchaser ticket can be marked
- email-this-ticket flags work per ticket
- email-all-tickets direction remains compatible with future backend sending
- required meal tickets require meal selection before checkout
- optional meal tickets can skip or select meal
- per-ticket meal add-on prices calculate correctly
```

---

## Known development cautions

```txt
- Restart dev server after Prisma/schema/session/auth changes.
- Clear .next after Prisma client/session shape changes.
- Do not mix localhost and 127.0.0.1 when testing cookies.
- Keep DSL-specific slide IDs out of shared shell code.
- Keep reusable auth form behavior inside src/customerAccess when possible.
- Use routes.login/routes.signup for reusable auth links.
- Do not store raw email/phone in gated cookies.
- Do not store video timestamps in gated cookies.
- Use DB records for known-user progress and answered questions.
- Use @videoresume per video instead of global resume assumptions.
```

---

## Git notes

Recommended commit style:

```bash
git add .
git commit -m "feat: add reusable gated lead access and video engagement tracking"
```

For smaller commits, prefer:

```bash
git commit -m "feat: add per-video resume and URL synced slides"
```

```bash
git commit -m "feat: sync lead engagement tracking to database"
```

```bash
git commit -m "feat: add reusable auth login links to embedded lead forms"
```
