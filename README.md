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
- ticket owner portals
- digital album/download deliverables
- plant shop / seed shop flows
- DB-backed nursery operations
- reusable record lists
- reusable profile blocks

Long-term, these systems should remain separable so they can become dedicated projects or standalone reusable modules.

---

## Current source of truth

Current reusable-slide-pages source of truth before the next local README/update commit:

```txt
912cd1604251c044828c04721ee3e321ada282f6
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

After committing the next local changes, update this README source-of-truth SHA.

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

album / music deliverables
→ later extracted as part of the music/event website or as reusable digital-deliverable infrastructure

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
- private download route helpers

Avoid hardcoding nursery, plant shop, invitation, album, or business-specific wording into shared systems.

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
- private download route for protected files
- Git LFS for large media when needed

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

The shared shell stays generic. The DSL and registry decide the experience.

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

A media-first invitation and storefront flow for music, event tickets/invitations, album downloads, gated second-video access, per-ticket owner details, per-ticket meal selection, and ticket owner portals.

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
- event-card shop layout
- ticket-owner details page
- generated temporary ticket codes per selected ticket
- optional ticket owner name, email, and WhatsApp/phone
- required and optional per-ticket meal support
- per-ticket meal selection instead of aggregate meal totals
- optional meal add-on pricing
- extra serving pricing support
- meal notes per ticket
- permanent ticket owner portal links
- ticket owner add-on budget messaging
- over-budget add-on detection
- digital album purchase options
- physical-fulfillment-aware checkout routing
- contact-only routing for digital/email-only orders
- private file download API
- reusable DSL download buttons
- download started confirmation notice

---

### `escape-album`

Planned dedicated album deliverable flow for purchasers of the Escape album digital download.

Route target:

```txt
/questionnaire/escape-album
```

This should be a separate DSL flow, not part of the invitation checkout DSL.

Recommended DSL path:

```txt
src/config/questionnaires/escapeAlbumDsl.txt
```

Purpose:

```txt
purchaser buys Escape Album — Digital Download
→ system confirms account/session ownership
→ email sends link to album deliverable flow
→ user opens /questionnaire/escape-album
→ user watches lyric videos
→ user reads written lyrics
→ user downloads one song or the full album in MP3 or WAV
```

Base album structure:

```txt
10 songs × 2 slides each = 20 song slides

Each song has:
1. lyric video media slide
2. written lyrics slide
```

Additional slide:

```txt
download-format slide
→ lets user choose MP3 or WAV
```

Total expected base flow:

```txt
21 slides
```

The same download-format slide should be reusable for:

```txt
Download this song
Download full album
```

The download-format slide should use context to decide which existing download key to trigger.

---

## Escape album song list

Current visible song/video names from the working folder:

```txt
01-good-morning
02-life-good
03-work-hard
04-income
05-mystical-feeling
06-close-to-me
07-constantly
08-judgement
09-not-misled
10-cant-let-you-go
```

Bonus / non-song item:

```txt
amity-sereavo-speaks
```

The bonus item should be kept separate from the 10-song album sequence unless the DSL intentionally adds a bonus section.

---

## Private media storage rule

Paid media files must not be placed in `public/`.

Anything in `public/` can be accessed directly by URL if someone knows the path.

Paid album files, lyric videos, WAV files, MP3 files, written lyrics, and full-album ZIP packages should live outside the public web root.

Recommended local development structure:

```txt
protected-media/
  escape/
    videos/
      vertical/
      horizontal/
    audio/
      mp3/
      wav/
    lyrics/
    covers/
    downloads/
      full-album/
    bonus/
      videos/
```

Recommended full paths:

```txt
protected-media/escape/videos/vertical/
protected-media/escape/videos/horizontal/
protected-media/escape/audio/mp3/
protected-media/escape/audio/wav/
protected-media/escape/lyrics/
protected-media/escape/covers/
protected-media/escape/downloads/full-album/
protected-media/escape/bonus/videos/
```

Recommended song file names:

```txt
protected-media/escape/videos/vertical/01-good-morning.mp4
protected-media/escape/videos/vertical/02-life-good.mp4
protected-media/escape/videos/vertical/03-work-hard.mp4
protected-media/escape/videos/vertical/04-income.mp4
protected-media/escape/videos/vertical/05-mystical-feeling.mp4
protected-media/escape/videos/vertical/06-close-to-me.mp4
protected-media/escape/videos/vertical/07-constantly.mp4
protected-media/escape/videos/vertical/08-judgement.mp4
protected-media/escape/videos/vertical/09-not-misled.mp4
protected-media/escape/videos/vertical/10-cant-let-you-go.mp4

protected-media/escape/videos/horizontal/01-good-morning.mp4
protected-media/escape/videos/horizontal/02-life-good.mp4
protected-media/escape/videos/horizontal/03-work-hard.mp4
protected-media/escape/videos/horizontal/04-income.mp4
protected-media/escape/videos/horizontal/05-mystical-feeling.mp4
protected-media/escape/videos/horizontal/06-close-to-me.mp4
protected-media/escape/videos/horizontal/07-constantly.mp4
protected-media/escape/videos/horizontal/08-judgement.mp4
protected-media/escape/videos/horizontal/09-not-misled.mp4
protected-media/escape/videos/horizontal/10-cant-let-you-go.mp4

protected-media/escape/audio/mp3/01-good-morning.mp3
protected-media/escape/audio/mp3/02-life-good.mp3
protected-media/escape/audio/mp3/03-work-hard.mp3
protected-media/escape/audio/mp3/04-income.mp3
protected-media/escape/audio/mp3/05-mystical-feeling.mp3
protected-media/escape/audio/mp3/06-close-to-me.mp3
protected-media/escape/audio/mp3/07-constantly.mp3
protected-media/escape/audio/mp3/08-judgement.mp3
protected-media/escape/audio/mp3/09-not-misled.mp3
protected-media/escape/audio/mp3/10-cant-let-you-go.mp3

protected-media/escape/audio/wav/01-good-morning.wav
protected-media/escape/audio/wav/02-life-good.wav
protected-media/escape/audio/wav/03-work-hard.wav
protected-media/escape/audio/wav/04-income.wav
protected-media/escape/audio/wav/05-mystical-feeling.wav
protected-media/escape/audio/wav/06-close-to-me.wav
protected-media/escape/audio/wav/07-constantly.wav
protected-media/escape/audio/wav/08-judgement.wav
protected-media/escape/audio/wav/09-not-misled.wav
protected-media/escape/audio/wav/10-cant-let-you-go.wav

protected-media/escape/lyrics/01-good-morning.txt
protected-media/escape/lyrics/02-life-good.txt
protected-media/escape/lyrics/03-work-hard.txt
protected-media/escape/lyrics/04-income.txt
protected-media/escape/lyrics/05-mystical-feeling.txt
protected-media/escape/lyrics/06-close-to-me.txt
protected-media/escape/lyrics/07-constantly.txt
protected-media/escape/lyrics/08-judgement.txt
protected-media/escape/lyrics/09-not-misled.txt
protected-media/escape/lyrics/10-cant-let-you-go.txt
```

Full album packages:

```txt
protected-media/escape/downloads/full-album/escape-album-mp3.zip
protected-media/escape/downloads/full-album/escape-album-wav.zip
```

Bonus video:

```txt
protected-media/escape/bonus/videos/amity-sereavo-speaks-vertical.mp4
```

Recommended `.gitignore` entry:

```txt
protected-media/
```

Private files should not be committed to Git unless intentionally tracked with a secure/private strategy.

---

## Private download access

The browser should never link directly to protected media files.

The DSL should trigger download keys. The server-side download route should:

```txt
receive download key
→ check logged-in user/session
→ check purchase/entitlement
→ resolve the private file path
→ stream the file
```

Existing download-key pattern for Escape album:

```txt
escape-song-01-mp3
escape-song-01-wav
escape-song-02-mp3
escape-song-02-wav
escape-song-03-mp3
escape-song-03-wav
escape-song-04-mp3
escape-song-04-wav
escape-song-05-mp3
escape-song-05-wav
escape-song-06-mp3
escape-song-06-wav
escape-song-07-mp3
escape-song-07-wav
escape-song-08-mp3
escape-song-08-wav
escape-song-09-mp3
escape-song-09-wav
escape-song-10-mp3
escape-song-10-wav
escape-album-mp3
escape-album-wav
```

The project should reuse the existing download feature instead of building a new one.

Required reusable enhancement:

```txt
download this song
→ store download request context
→ go to format-choice slide
→ choose MP3/WAV
→ call existing download key

download full album
→ store album request context
→ go to format-choice slide
→ choose MP3/WAV
→ call existing download key
```

Do not create a separate one-off Escape album downloader.

---

## Album deliverable action-bar behavior

On each song media slide:

```txt
Back
Next
Download this song
Download full album
```

Behavior:

```txt
Back
→ previous slide

Next
→ written lyrics slide for the same song

Download this song
→ download-format slide
→ MP3/WAV choice downloads the current song

Download full album
→ download-format slide
→ MP3/WAV choice downloads full album package
```

On each written lyrics slide:

```txt
Back
Next
Download this song
Download full album
```

Behavior:

```txt
Back
→ song media slide

Next
→ next song media slide

Download this song
→ download-format slide
→ MP3/WAV choice downloads the current song

Download full album
→ download-format slide
→ MP3/WAV choice downloads full album package
```

For the last lyrics slide:

```txt
Next
→ album complete / thank you / download full album slide
```

---

## Album deliverable access control

The Escape album deliverable flow should be gated.

Access rules:

```txt
User must be logged in
User must own/purchase Escape Album — Digital Download
If access passes → show /questionnaire/escape-album
If access fails → redirect to login, purchase page, or access denied page
```

The purchase product is currently part of the invitation shop catalog:

```txt
Escape Album — Digital Download
```

After purchase, the email should include a link to the deliverable flow:

```txt
/questionnaire/escape-album
```

The email should not include raw file links.

---

## Event and shop card layout direction

Event/invitation products should use a rich event card layout.

Collapsed event card should show:

```txt
hero image
event title
Venue:
Address:
Date:
Show starts at:
See details
```

Expanded event card should show:

```txt
hero image
event title
Venue:
Address:
Date:
Show starts at:

description/instructions

ticket options

Hide details
```

The `Hide details` button belongs at the bottom of the expanded card, after the ticket list.

It should not appear inside every ticket row.

Normal non-event products should use a simpler product-card layout:

```txt
image + title on the same line
description across the full width under image/title
See details
```

Event-specific metadata belongs in the invitation shop catalog helper, not in `QuestionnaireShell`.

Invitation shop catalog helper:

```txt
src/lib/invitation/getInvitationShopCatalog.ts
```

Current event products:

```txt
ranny-williams-july-1-event
phoenix-toronto-event
```

Recommended event metadata fields:

```ts
eventVenueLabel;
eventAddress;
eventDateLabel;
eventTimeLabel;
detailsDescription;
```

Example details description:

```txt
Select your invitation type.

Eligible invitations include meal selection.

You will choose meal details for each ticket owner on the ticket details page.
```

Use newline spacing in data:

```ts
detailsDescription:
  "Select your invitation type.\n\nEligible invitations include meal selection.\n\nYou will choose meal details for each ticket owner on the ticket details page.",
```

CSS should preserve spacing:

```css
white-space: pre-line;
```

---

## Ticket owner portal

Ticket owner portal route:

```txt
/invitation/tickets/[ticketCode]
```

Purpose:

```txt
ticket owner opens permanent ticket link
→ sees ticket details
→ sees event item
→ sees payment/add-on responsibility
→ sees meal selections
→ can select or adjust meal when allowed
→ over-budget add-ons can route to cart/payment
```

Payment modes:

```txt
purchaser_pays_ticket_and_addons
owner_selects_sender_pays_addons
owner_pays_addons
owner_pays_ticket_and_addons
```

Current public-facing behavior:

```txt
purchaser_pays_ticket_and_addons
→ purchaser controls add-ons
→ ticket owner sees details only

owner_selects_sender_pays_addons
→ ticket owner selects meal/add-ons
→ purchaser may cover a configured budget
→ ticket owner pays anything over budget
```

Exact budget wording target:

```txt
Add-ons up to $20.00 was paid for by Jarret Swaby.
Any selections over this budget, you will pay for.
```

Ticket owner meal selections are saved to:

```txt
/api/invitation/tickets/[ticketCode]/context
```

The frontend must save latest ticket assignments before returning to the portal.

---

## Ticket and meal selection direction

Tickets are assigned per selected event invitation.

Each ticket can have:

```txt
ticketCode
ownerName
ownerEmail
ownerPhone
ticketOwnerPaymentMode
ticketOwnerAddonBudget
mealMode
mealMenuId
mealLabel
mealEnabled
mealSelection
wantsExtraFood
hasMealNotes
mealNotes
mealExtraTotal
```

Meal selections should be per ticket, not aggregate only.

Ticket owners should only edit tickets they are allowed to edit.

Purchasers can manage all tickets for an order.

---

## Auth slide flows

Reusable auth has been merged into reusable-slide-pages.

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

```txt
Use the same host for login and account testing.

Use:
http://localhost:3000

Do not mix with:
http://127.0.0.1:3000

Cookies are host-specific.
```

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

Important:

```txt
User.email remains for compatibility.
UserEmailAddress becomes the email ownership/history source of truth.
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

## Marketing-question answer tracking

Marketing questions can be tracked per user.

Purpose:

```txt
- do not show the same rating/marketing slide again after the user answered
- let users later review or update answered questions
- keep the rule DB-backed instead of cookie-backed
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

For auth flows, the registry can inject auth behavior variables.

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

```txt
- use smtp.gmail.com
- use a Google App Password
- do not use smtp@gmail.com
```

---

## Dev email safety mode

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

## Account deletion config

Account deletion is business-configurable.

Config lives in:

```txt
src/customerAccess/config/authRules.js
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

Backend routes:

```txt
/api/account/delete/start
/api/account/delete
/api/account/delete/cancel
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
src/config/questionnaires/escapeAlbumDsl.txt
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

## Common DSL directives

Content and identity:

```txt
@id:
@type:
@title:
@subtitle:
@body:
@countstep:
@showsteptext:
@showprogressbar:
@syncurl:
```

Navigation:

```txt
@next:
@back:
@goto:
@showback:
@shownext:
@showreturnhome:
@returnhome:
```

Media:

```txt
@media:
@mediatype:
@mediaaspect:
@autoplay:
@progressmode:
@videostart:
@videogoto:
@videoresume:
```

Choices:

```txt
@store:
@choiceplacement:
@choices:
```

Downloads:

```txt
@downloadkey:
@downloadbuttons:
```

Planned dynamic download choice support:

```txt
@downloadrequestkey:
@downloadrequests:
@downloadformats:
```

Auth:

```txt
@showauthcontrols:
@authform:
```

Forms:

```txt
@fields:
```

Conditions:

```txt
@when:
@backwhen:
@showif:
```

---

## Existing download feature

The project already has a download feature.

Do not build a second downloader for the Escape album.

The existing system should remain responsible for:

```txt
download key
→ access check
→ file resolution
→ file streaming/download
```

The album deliverable flow only needs to choose which existing download key to call.

Existing simple DSL download buttons:

```txt
@downloadbuttons:
- escape-album-mp3|Download MP3|c1
- escape-album-wav|Download WAV|c2
```

Planned dynamic pattern:

```txt
song slide
→ stores albumDownloadRequest = song-01 or album
→ routes to download-format slide
→ user chooses MP3 or WAV
→ shell builds existing download key
→ existing download API streams protected file
```

---

## Protected downloads and entitlement

Paid files require access checks.

Rules:

```txt
- user must be logged in or have valid claim/access session
- user must own the purchased product or entitlement
- protected files must not live in public/
- download API must resolve private file path server-side
- raw private file paths must never be exposed to the browser
```

Future entitlement helpers should answer:

```txt
Does this user own Escape Album — Digital Download?
Does this user own this ticket?
Does this user own this gated deliverable?
```

---

## Repository workflow for ChatGPT-assisted changes

Before proposing code changes:

```txt
1. Read example_ChatGPT_workflow.txt.
2. Treat the user-provided SHA as source of truth.
3. Inspect the relevant files at that SHA.
4. Inspect README.md when the change affects architecture or patterns.
5. Give exact file paths.
6. Give exact placement.
7. Prefer exact find/replace blocks.
8. Keep reusable behavior in shared systems.
9. Keep product/project wording in DSL/config/catalog helpers.
10. Do not guess file locations.
```

Response format for code changes:

```txt
File:
path/to/file

Find:
exact existing block

Replace with:
exact new block

Run:
npm run build
```

Avoid:

```txt
- vague placement like "near the top"
- hardcoding project-specific wording into QuestionnaireShell
- creating duplicate systems when one already exists
- putting private paid files in public/
```

---

## Build and test commands

Common commands:

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

---

## Current next development priorities

Immediate priorities:

```txt
1. Finalize event/shop card layout.
2. Keep event metadata in getInvitationShopCatalog.
3. Fix normal product card layout.
4. Register escape-album deliverable DSL.
5. Reuse existing download feature for Escape album.
6. Add dynamic download-choice context if needed.
7. Keep album media private in protected-media/.
8. Add entitlement check before serving album downloads.
9. Email album deliverable link after purchase.
10. Continue keeping shared shell reusable.
```

Do not continue building album deliverable access with public file links.
