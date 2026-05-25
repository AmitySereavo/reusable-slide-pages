# Reusable Slide Pages

A reusable, registry-driven, DSL-powered slide-funnel system built with Next.js App Router, React, TypeScript, Prisma, PostgreSQL, and reusable authentication.

The project renders interactive multi-slide experiences from plain-text DSL files instead of hardcoding every flow directly in React.

It currently acts as a shared development ground for:

- reusable slide pages
- reusable auth
- account management
- verified account contact updates
- retained email history
- gated lead access
- embedded reusable auth forms inside slides
- plant shop / seed shop flows
- invitation / music / event flows
- DB-backed nursery operations
- reusable record lists
- reusable profile blocks

Long-term, these systems should remain separable so they can become dedicated projects or standalone reusable modules.

---

## Current source of truth

Current reusable-slide-pages source of truth before latest local gated-access/resume-prompt updates:

```txt
aac40de69b14385179acd4e497c54b566eb18553
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

Latest local updates after the checkpoint above:

```txt
- embedded authform slide type added
- LeadCaptureForm can be embedded inside questionnaire slides
- invitation lead capture now uses reusable auth/customerAccess form
- gated lead capture creates/fetches a temporary auth-backed user
- gated lead capture creates/updates Lead records
- private access/verification link is emailed to the submitted email
- gatedLeadAccess verification link verifies Lead/User/UserEmailAddress
- long-lived signed gated-access cookie is set after verification
- returning verified users can skip the lead form
- returning verified users are shown a Continue Watching choice slide
- Continue Watching resumes the second video from saved browser position when available
- Start From Beginning returns to the first video
- when the first video reaches its existing @videogoto point, verified users bypass the lead form and go directly to the second video
- second video timestamp is controlled by existing @videostart, not new DSL directives
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
- gated video access
- return-viewer resume prompts
- storefront pages
- delivery and pickup flows
- contact capture
- embedded reusable auth forms
- gated lead capture
- temporary auth-backed lead accounts
- digital downloads
- ticket / invitation flows
- ticket-owner assignment
- per-ticket meal selection
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

Current capabilities:

- vertical video intro slides
- video-linked progress bar
- video start timestamp through existing `@videostart`
- video timestamp routing through existing `@videogoto`
- performance rating slide
- embedded reusable gated lead capture form
- temporary auth-backed user creation for gated leads
- private video link emailed after lead signup
- verification/access link verifies the lead/account email
- signed long-lived gated-access cookie after verification
- returning verified viewer prompt
- continue watching from saved browser video position
- start from beginning option
- automatic lead-form bypass when access cookie exists
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
→ Account hub
```

Current behavior:

- identifier field
- password field
- slide-style login submission
- successful login creates a database-backed session
- session token is stored in HTTP-only cookie
- login success button routes to `/questionnaire/auth-account`
- login page hides progress bar and slide count
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

The account email system now supports retained email history.

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

Example:

```txt
===
@id: invitation-lead-capture
@type: authform
@authform: gatedLeadCapture
@shownext: false
@countstep: false
@showsteptext: false
@showprogressbar: false
@goto: second-video
---
BR
# [c1] Continue watching
BR
[c3] Sign up and check your email for the private link to the next video.
```

Purpose:

```txt
- keep form behavior inside reusable auth/customerAccess components
- avoid rebuilding auth and lead forms manually in DSL
- allow slides to contain reusable auth forms while preserving slide routing
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
→ performance rating
→ gatedLeadCapture form
→ temporary auth-backed user created/found
→ Lead created/updated
→ private access link emailed
→ user clicks link
→ /verify consumes token
→ User email verified
→ UserEmailAddress verified
→ Lead verified
→ signed long-lived gated-access cookie set
→ redirect to second-video
```

Backend routes:

```txt
/api/auth/temporary-lead-account
/api/verify/consume-link
/api/questionnaires/gated-access/status
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
- stores access target, not raw identity
```

Cookie payload stores:

```txt
target
questionnaireSlug
goto
identifierHash
verifiedAt
expiresAt
```

Cookie payload does not store:

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

## Returning verified viewer flow

Returning verified users do not need to see the gated lead form again.

The invitation registry config controls this through `variables.gatedAccess`.

Example:

```ts
variables: {
  gatedAccess: {
    gateSlideId: "whatsapp-subscription",
    goto: "second-video",
    resumePromptSlideId: "continue-watching-choice",
    startFromBeginningSlideId: "home",
  },
},
```

Behavior:

```txt
User opens /questionnaire/invitation with valid gated-access cookie
→ shell checks /api/questionnaires/gated-access/status
→ shell routes to continue-watching-choice
→ user chooses Continue Watching or Start From Beginning
```

Continue Watching:

```txt
continue-watching-choice
→ second-video
→ resumes from saved browser timestamp if one exists
→ otherwise uses existing @videostart on second-video
```

Start From Beginning:

```txt
continue-watching-choice
→ home / first video
→ first video plays normally
→ when existing @videogoto points to the gate slide, shell bypasses the gate
→ goes directly to second-video
→ second-video uses existing @videostart
```

Important:

```txt
No new DSL timestamp directives are needed.
Video timing stays in existing @videostart and @videogoto.
```

---

## Video timestamp system

The existing video timestamp system uses DSL directives already supported by the parser.

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

Example:

```txt
===
@id: second-video
@type: media
@media: /media/invitation/example.mp4
@mediatype: video
@mediaaspect: vertical
@autoplay: true
@progressmode: video
@videostart: 14:18
```

The media renderer applies `videoStartAtSeconds` when video metadata loads.

Resume behavior:

```txt
- saved browser timestamp is kept in localStorage
- used only when the user chooses Continue Watching
- not stored in the gated access cookie
- if no saved timestamp exists, existing @videostart is used
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

The registry loads the DSL, injects variables, parses slides, injects reusable blocks, and returns the config and theme to the shared route.

For invitation flows, the registry can inject:

```txt
shopCatalog
deliveryConfig
discountDefinitions
mealMenus
gatedAccess
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
passwordResetChallenges   PasswordResetChallenge[]
passwordResetAccessGrants PasswordResetAccessGrant[]
nameChanges               UserNameChange[]
emailAddresses            UserEmailAddress[]
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
@goto: second-video
---
BR
# [c1] Continue watching
BR
[c3] Sign up and check your email for the private link to the next video.
```

---

## Returning viewer choice slide

```txt
===
@id: continue-watching-choice
@type: choice
@store: continueWatchingChoice
@choiceplacement: inline
@shownext: false
@countstep: false
@showsteptext: false
@showprogressbar: false
---
BR
# [c1] Continue watching?
BR
[c3] You already have private access. Would you like to continue from where you left off, or start from the beginning?
@choices:
- continue|Continue watching|second-video|primary
- beginning|Start from the beginning|home|secondary
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
submitUpdateInfo
requestAccountEmailUpdate
submitForgotPassword
submitResetPassword
startDeleteAccount
submitDeleteAccount
```

Email verification for account email update is handled by the reusable `authverify` slide and `/api/verify/check`.

Gated lead access uses embedded `authform` and `/api/auth/temporary-lead-account`.

---

## Auth API routes

Current auth/account/gated API routes include:

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
/api/account/profile
/api/account/update-info
/api/account/name-update-status
/api/account/email-addresses
/api/account/email-addresses/request
/api/account/email-addresses/activate
/api/account/delete/start
/api/account/delete
/api/account/delete/cancel
/api/auth/temporary-lead-account
/api/questionnaires/gated-access/status
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

Video progress mode:

```txt
@progressmode: video
```

Video start timestamp:

```txt
@videostart: 00:12
```

Video timestamp routing:

```txt
@videogoto: 00:45|performance-rating
```

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

---

## Build and test

Run:

```bash
npm install
npx prisma format
npx prisma db push
npx prisma generate
npm run build
```

Then run dev server:

```bash
npm run dev
```

Core routes to smoke test:

```txt
http://localhost:3000/
http://localhost:3000/questionnaire/self-trust
http://localhost:3000/questionnaire/garden-herbs
http://localhost:3000/questionnaire/seed
http://localhost:3000/questionnaire/invitation
http://localhost:3000/questionnaire/nursery-ops
http://localhost:3000/questionnaire/generic-profile-flow
http://localhost:3000/questionnaire/auth-signup
http://localhost:3000/questionnaire/auth-login
http://localhost:3000/questionnaire/auth-account
http://localhost:3000/questionnaire/auth-forgot-password
http://localhost:3000/questionnaire/auth-reset-password
http://localhost:3000/questionnaire/auth-delete-account
```

Known non-blocking warning may appear:

```txt
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
```

Confirm it does not block build.

---

## Account/auth/gated regression checklist

After account/auth/gated changes, test:

```txt
- signup with fresh email
- signup blocks historical reserved email
- signup existing verified email shows already exists
- signup existing unverified email starts verification
- verification code auto-verifies after final digit
- resend code cooldown works
- login succeeds
- login success routes to auth-account
- auth-account loads after login
- auth-account does not say user is logged out after login
- logout button clears session
- auth-account redirects logged-out user to login
- name update remaining count appears
- name update limit blocks backend update
- old email is backfilled into UserEmailAddress
- new email request reserves email
- new email verification code sends
- email verification uses six-box authverify panel
- email verification activates new email
- previous email remains in UserEmailAddress
- old email cannot create a new account
- active email changes when verified email is activated
- password reset still works
- account deletion code still works
- invitation gated lead form appears for first-time viewer
- private access link is emailed after gated lead signup
- verification link verifies Lead/User/UserEmailAddress
- signed gated access cookie is set
- returning verified viewer sees continue-watching-choice
- Continue Watching goes to second-video
- Start From Beginning goes to home/first video
- first video bypasses lead form when cookie exists
- second-video uses existing @videostart
```

---

## Production readiness

Before production:

- set correct business name in config
- set correct footer links
- add Privacy Policy page
- add Terms page
- add Contact page
- set production `NEXT_PUBLIC_APP_URL`
- set production `GATED_SLIDE_ACCESS_SECRET`
- turn off dev-safe email rewrite if real recipients should receive email
- confirm SMTP sender works
- run real-recipient email delivery test
- confirm active email is used for account messages
- confirm historical emails are reserved
- confirm verification expiry matches business rules
- confirm name-update limit matches business rules
- confirm gated access cookie expiry matches business rules
- confirm account deletion policy matches business rules
- confirm delete-code expiry matches business rules
- confirm WhatsApp/SMS settings are disabled or configured
- confirm database backups exist
- confirm Prisma schema is synced
- confirm test accounts are removed
- confirm no console-only verification mode is active
- confirm no secret values are committed

---

## Security notes

Confirm:

```txt
- passwords are hashed
- verification codes are hashed
- verification tokens are hashed
- reset tokens are hashed
- session tokens are hashed
- gated access cookie is signed
- gated access cookie is HttpOnly
- gated access cookie does not contain raw email
- gated access cookie does not contain raw phone
- gated access cookie does not contain raw video timestamp
- frontend warnings are convenience only
- backend remains source of truth
```

Raw media files in `/public` are still directly accessible by URL.

The current gated access protects the slide flow, not the raw video file. For true protected media, move gated videos behind an API/media route that checks the signed cookie or session before streaming.

---

## Final commit workflow

Before committing:

```bash
npm run build
```

Then:

```bash
git status
git add .
git commit -m "feat: add gated lead access and returning viewer resume flow"
```

After commit:

```txt
- copy commit SHA
- share new SHA as source of truth
- update README.md source-of-truth section
- update REGRESSION_CHECKLIST.md source-of-truth section
```
