# Regression Checklist

Use this checklist after every auth, account, email, delivery, questionnaire, shop, invitation, nursery-ops, or schema change.

This project is currently focused on:

- reusable slide pages
- reusable auth
- account management
- retained email history
- active verified email selection
- configurable account update rules
- email-first production readiness
- DB-backed nursery operations
- plant shop / seed shop flows
- invitation / ticket / music flows
- future extraction into separate apps/modules

---

## Current source of truth

Current reusable-slide-pages working checkpoint before latest local account/email/login fixes:

```txt
3bb431e4acc8d0ff21a16497b43afe7ba92bbe05
```

Reusable auth source merged into this project:

```txt
2aa462dfcfa090eefa0a3b38d08000d722c43419
```

After committing the latest local fixes, update this section with the new commit SHA.

Latest local account/auth changes to verify:

```txt
- auth-account hides slide count and progress bar
- auth-login hides slide count and progress bar
- login success routes to /questionnaire/auth-account
- account hub includes logout button
- configurable name-update limits
- UserNameChange history
- name-update remaining count display
- UserEmailAddress history
- historical email reservation
- signup blocks reserved historical emails
- account profile returns active email and email history
- account email update flow
- email update uses authverify / VerificationCodePanel
- email update resend-code cooldown
- email update auto-verifies after final digit
- successful email verification activates the new email
- old emails remain stored in UserEmailAddress
```

---

## Required commands before commit

Run from project root:

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

If Prisma reports drift on Supabase, do not reset the public schema. Use careful additive `db push`, manual SQL, or baseline migration history separately.

---

## Environment check

Before testing email delivery, confirm `.env` is set correctly.

### Required app URL

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Restart dev server after changing `.env`:

```bash
Ctrl + C
npm run dev
```

---

## SMTP email environment

For SMTP email:

```env
EMAIL_PROVIDER_MODE="smtp"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender-email@gmail.com"
SMTP_PASS="your-google-app-password"
SMTP_FROM_EMAIL="Business Name <your-sender-email@gmail.com>"
```

Confirm:

- `SMTP_HOST` is exactly `smtp.gmail.com`
- `SMTP_USER` is the sender Gmail account
- `SMTP_PASS` is a Google App Password, not the normal Gmail password
- the App Password belongs to the same Google account in `SMTP_USER`
- `SMTP_FROM_EMAIL` matches the sender account
- dev server was restarted after `.env` changes

---

## Dev-safe email rewrite

For safe testing:

```env
EMAIL_DEV_TEST_MODE="true"
EMAIL_DEV_TEST_INBOX="paralifetrees@gmail.com"
```

Expected dev-safe delivery log:

```txt
provider: smtp
mode: smtp
ok: true
rewritten: true
to: paralifetrees@gmail.com
originalTo: customer@example.com
```

For real-recipient testing:

```env
EMAIL_DEV_TEST_MODE="false"
```

Expected real-recipient delivery log:

```txt
provider: smtp
mode: smtp
ok: true
rewritten: false
to: customer@example.com
originalTo: customer@example.com
```

Confirm:

- `EMAIL_DEV_TEST_MODE="true"` rewrites outgoing email to `EMAIL_DEV_TEST_INBOX`
- `EMAIL_DEV_TEST_MODE="false"` sends to the real entered email
- dev server was restarted after changing the env value
- delivery attempt is logged
- `originalTo` stores the submitted address
- `to` stores the final delivery address
- `rewritten` value is correct

---

## Host consistency check

Always test auth on one host.

Use:

```txt
http://localhost:3000
```

Do not log in on:

```txt
http://127.0.0.1:3000
```

and then test account on:

```txt
http://localhost:3000
```

Cookies are host-specific.

---

## Core route smoke test

Confirm these routes load:

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

Expected:

- pages load without server error
- shared questionnaire route resolves all registered slugs
- no missing DSL file error
- no parser crash
- no missing registry entry error

---

## Build check

Run:

```bash
npm run build
```

Confirm:

- build completes
- no TypeScript errors
- no route validator syntax errors
- no Prisma client errors
- no missing generated Prisma types
- no missing imports
- no unused hard build blocker

Known possible non-blocking warning:

```txt
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
```

Confirm it does not block build.

If generated `.next` files cause stale errors, stop dev server and clear `.next`:

```bash
rm -rf .next
npm run build
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

---

# Auth Signup Regression

## Fresh email signup

Test:

```txt
/questionnaire/auth-signup
```

Steps:

- enter a fresh name
- enter a fresh email
- enter password and confirm password
- complete optional location/address fields
- submit signup
- confirm verification starts
- confirm verification code is sent
- confirm six code boxes appear
- enter the code
- confirm code auto-verifies after final digit
- confirm signup reaches verified/success slide
- confirm user can log in afterward

Expected:

- account is created
- first email is stored on `User.email`
- first email is also stored in `UserEmailAddress`
- first email is active
- first email becomes verified after code verification
- password is hashed
- `passwordUpdatedAt` is set
- verification code is hashed in the database
- raw code is not stored in database

---

## Existing verified email signup

Steps:

- use an email already attached to a verified account
- try to sign up again

Expected:

- signup blocks the user
- message says user/account already exists
- no duplicate account is created
- no duplicate `UserEmailAddress` row is created

---

## Existing unverified email signup

Steps:

- create a user but do not verify them
- go back to signup
- enter the same email again

Expected:

- signup does not hard-block immediately
- app starts verification again
- user receives a fresh code
- user can complete verification
- existing user record is reused
- no duplicate user is created

---

## Historical reserved email signup

Steps:

- log in to an account
- update active email to a new verified email
- log out
- try to create another account using the previous email

Expected:

- signup blocks the email
- message indicates the email is already attached to an account
- previous email remains reserved to the original user
- no new user is created with that historical email

Check database:

```sql
SELECT
  "userId",
  "email",
  "normalizedEmail",
  "isActive",
  "isVerified",
  "verifiedAt",
  "createdAt"
FROM "UserEmailAddress"
ORDER BY "userId", "isActive" DESC, "createdAt" ASC;
```

Expected:

- old email exists
- old email has same original `userId`
- old email is not deleted
- old email cannot be used by another user

---

## Signup verification resend

Steps:

- start signup verification
- click resend immediately
- wait for cooldown
- click resend again

Expected:

- immediate resend is blocked or countdown is shown
- resend button shows cooldown
- resend button activates after countdown
- newest code is accepted
- older code should no longer be accepted if replaced

---

## Signup verification delivery failure

Steps:

- temporarily break SMTP config
- restart dev server
- create a signup

Expected:

- account may be created
- verification-start returns a visible error
- UI shows the verification-send error
- user is not silently moved forward as if a code was sent
- restore SMTP config after test

---

# Auth Login Regression

## Login with verified email

Route:

```txt
/questionnaire/auth-login
```

Steps:

- enter verified email
- enter correct password
- submit

Expected:

- login succeeds
- session is created
- HTTP-only cookie is set
- login success slide appears
- progress bar is hidden
- slide count is hidden
- success button says account-related wording
- success button routes to:

```txt
/questionnaire/auth-account
```

---

## Login with unverified email

Steps:

- attempt login with unverified email account

Expected:

- login is blocked
- user is told to verify email first
- no session is created

---

## Login with wrong password

Steps:

- enter valid email
- enter wrong password

Expected:

- login is blocked
- no session is created
- generic invalid credentials message appears
- no sensitive detail is leaked

---

## Login route session check

After successful login:

- open `/questionnaire/auth-account` in the same host
- refresh page

Expected:

- account page loads
- user is not told they are logged out
- `/api/account/profile` returns user profile
- session cookie is recognized

If account says user is logged out:

- confirm same host was used
- confirm login fetch uses `credentials: "same-origin"`
- confirm session cookie exists
- confirm `auth_session` path is `/`
- confirm database `Session` row exists and is not revoked/expired

---

# Auth Account Regression

## Account hub load

Route:

```txt
/questionnaire/auth-account
```

Expected when logged in:

- account hub loads
- slide count hidden
- progress bar hidden
- account cards display
- masked email displays
- masked phone displays if present
- name displays
- location displays
- mailing address displays
- password card does not show password
- password card shows only last updated timestamp if available
- logout button displays
- delete account button displays

Expected when logged out:

- user is not allowed to manage account
- user is routed to login or shown a clear login-required message
- no protected account data leaks

---

## Account logout button

Steps:

- log in
- open `/questionnaire/auth-account`
- click logout

Expected:

- `/api/logout` is called
- current session is revoked
- cookie is cleared
- user is sent back to `/questionnaire/auth-login`
- refreshing `/questionnaire/auth-account` does not show account data

Database check:

```sql
SELECT
  "id",
  "userId",
  "revokedAt",
  "expiresAt",
  "createdAt"
FROM "Session"
ORDER BY "createdAt" DESC
LIMIT 10;
```

Expected:

- current session has `revokedAt` set after logout

---

# Name Update Regression

## Name update remaining count

Route:

```txt
/questionnaire/auth-account
```

Expected:

- name card shows remaining update opportunities
- if limit is active, user sees how many name updates remain
- if limit is reached, update button is disabled or backend blocks update
- message is visible before submit, not only after error

Backend route:

```txt
/api/account/name-update-status
```

Expected response includes:

```txt
enabled
canUpdate
used
remaining
maxUpdates
ruleLabel
window
windowStart
```

---

## Name update success

Steps:

- log in
- open account
- update name to a genuinely different name

Expected:

- name updates
- `UserNameChange` row is created
- remaining count decreases by 1
- account page reflects new remaining count

Database check:

```sql
SELECT
  "userId",
  "previousName",
  "newName",
  "createdAt"
FROM "UserNameChange"
ORDER BY "createdAt" DESC;
```

---

## Name update without name change

Steps:

- submit the same name again
- update only location/address

Expected:

- no name update opportunity is consumed
- no `UserNameChange` row is created
- non-name fields still update

---

## Name update limit reached

Steps:

- set config to a small limit
- use up all allowed name updates
- try updating name again

Expected:

- frontend warns user before submit
- backend still blocks direct API attempt
- response includes code like:

```txt
NAME_UPDATE_LIMIT_REACHED
```

- account data remains unchanged

Backend route:

```txt
/api/account/update-info
```

---

## Name update window behavior

Test each configured window when relevant:

```txt
forever
calendarMonth
rollingDays
rollingMonths
```

Expected:

- `forever` counts all history rows
- `calendarMonth` counts rows from first day of current month
- `rollingDays` counts rows inside configured day range
- `rollingMonths` counts rows inside configured month range

---

# Account Email History Regression

## Existing account email backfill

Run backfill once for existing users:

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

Confirm:

```sql
SELECT
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

Expected:

- every existing `User.email` has a matching `UserEmailAddress`
- active email row has `isActive = true`
- verified status matches `User.emailVerifiedAt`
- no duplicate normalized email rows

---

## Account profile email history

Route:

```txt
/api/account/profile
```

Expected profile response includes:

```txt
email
maskedEmail
activeEmailAddress
emailAddresses
```

Expected:

- active email comes from active `UserEmailAddress` when available
- `maskedEmail` matches active email
- each email history row has its own `isVerified`
- account card does not use global `User.emailVerifiedAt` to claim every email is verified
- inactive old emails remain visible or retrievable where UI supports it

---

## Request new account email

Route:

```txt
/questionnaire/auth-account
→ Update Email
```

Backend route:

```txt
/api/account/email-addresses/request
```

Steps:

- log in
- enter a new email address
- click Send Verification Code

Expected:

- email is reserved in `UserEmailAddress`
- email has `isVerified = false`
- email has `isActive = false`
- code is sent to the new email
- user lands on authverify code slide
- six code boxes appear
- resend button appears with cooldown

Database check:

```sql
SELECT
  "userId",
  "email",
  "normalizedEmail",
  "isActive",
  "isVerified",
  "verifiedAt",
  "createdAt"
FROM "UserEmailAddress"
WHERE "normalizedEmail" = lower(trim('new-email@example.com'));
```

---

## New account email cannot belong to another user

Steps:

- log in as User A
- try to add an email already reserved to User B

Expected:

- request is blocked
- no verification code is sent
- no ownership changes
- no active email changes

---

## Existing same-account unverified email request

Steps:

- request a new email
- do not verify it
- go back and request the same email again

Expected:

- no duplicate `UserEmailAddress` row
- a new code can be sent after cooldown
- user can continue verification

---

## Existing same-account verified email request

Steps:

- try to add an email already verified on the same account

Expected:

- route tells user it is already verified
- user should be able to activate it
- no duplicate row is created
- no unnecessary verification code is required

---

## Account email verification with authverify

Slide type:

```txt
@type: authverify
```

Target:

```txt
accountEmailUpdate
```

Steps:

- request new email update
- enter received code

Expected:

- code boxes auto-focus
- full pasted code is supported
- final digit auto-submits
- wrong code clears boxes
- error message appears
- resend button shows countdown
- resend button activates after cooldown
- newest code works
- successful verification activates the email
- user is routed to account saved / account hub as configured

---

## Account email verification backend

Backend route:

```txt
/api/verify/check
```

Expected when `latestRecord.target === "accountEmailUpdate"`:

- finds matching `UserEmailAddress`
- sets all user emails inactive
- sets selected email verified
- sets selected email active
- updates `User.email`
- updates `User.emailVerifiedAt`
- deletes consumed verification code
- returns success message

Expected database result:

```sql
SELECT
  "userId",
  "email",
  "isActive",
  "isVerified",
  "verifiedAt"
FROM "UserEmailAddress"
WHERE "userId" = 'USER_ID_HERE'
ORDER BY "isActive" DESC, "createdAt" ASC;
```

Only one email should have:

```txt
isActive = true
```

The new verified email should have:

```txt
isVerified = true
verifiedAt not null
```

---

## Previous email remains reserved

After updating active email:

Expected:

- previous email still exists in `UserEmailAddress`
- previous email has same `userId`
- previous email is inactive
- previous email remains verified if it was verified
- previous email cannot be used to create another account

---

## Activate existing verified email

Backend route:

```txt
/api/account/email-addresses/activate
```

Steps:

- log in
- select a saved verified email
- activate it

Expected:

- selected email becomes active
- all other emails become inactive
- `User.email` updates to selected email
- `User.emailVerifiedAt` remains set
- inactive emails remain stored
- unverified emails cannot be activated

---

# Verification Panel Regression

The reusable verification panel should support:

- six separate boxes
- numeric input
- auto-focus first input
- auto-advance on digit
- backspace navigation
- arrow key navigation
- paste full code
- auto-verify after final digit
- manual verify button
- resend code button
- resend cooldown countdown
- retry-after seconds from backend
- error display
- clear boxes after failed attempt
- success callback routing

Test in:

```txt
auth-signup
account email update
```

Expected:

- signup verification routes to signup verified slide
- account email update verification routes to account saved/account hub
- same component behavior works in both flows

---

# Forgot Password Regression

## Forgot password by email

Route:

```txt
/questionnaire/auth-forgot-password
```

Steps:

- enter verified email
- submit

Expected:

- neutral success message appears
- password reset email is sent
- delivery attempt is logged
- reset token is hashed in DB
- raw reset token is not stored in DB
- cooldown blocks immediate repeat request

---

## Reset password

Route:

```txt
/questionnaire/auth-reset-password?token=<token>
```

Steps:

- open reset link
- enter new password
- confirm password
- submit

Expected:

- password policy is enforced
- password updates
- `passwordUpdatedAt` updates
- reset token is consumed
- old sessions are revoked
- user can log in with new password
- old password no longer works

---

# Account Deletion Regression

## Start account deletion

Route:

```txt
/questionnaire/auth-delete-account
```

Steps:

- log in
- type DELETE
- start deletion

Expected:

- deletion code is created
- deletion code is hashed
- deletion email sends
- target is `accountDeletion`
- duplicate clicking is blocked by client action lock
- server cooldown blocks immediate duplicate sends
- user remains logged in while waiting for code

---

## Complete account deletion

Steps:

- enter deletion code
- submit

Expected for immediate deletion:

- account is deleted or marked deleted according to config
- session is cleared
- user cannot access auth-account
- success slide does not show stale login-required error

Expected for delayed deletion:

- `deletionRequestedAt` set
- `deletionScheduledAt` set
- `deletionStatus` set
- session is cleared or behavior matches config
- account hub shows pending deletion if user remains logged in before logout

---

## Cancel account deletion

Route:

```txt
/api/account/delete/cancel
```

Test only if config allows cancellation.

Expected:

- pending deletion is cleared
- deletion status updates
- user can continue using account

---

# Reusable Auth Footer Regression

Check auth footer appears in:

```txt
/questionnaire/auth-login
/questionnaire/auth-signup
/questionnaire/auth-forgot-password
/questionnaire/auth-reset-password
/questionnaire/auth-account
/questionnaire/auth-delete-account
```

Expected footer links:

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

Expected policy links:

```txt
Privacy Policy
Terms
Contact
```

---

# DSL / Parser Regression

Check parser supports:

```txt
@countstep:
@showsteptext:
@showprogressbar:
@shownext:
@showback:
@backgoto:
@goto:
@run:
@type: authverify
@type: accountsummary
```

Expected:

- unknown valid directives do not crash
- account hub hides progress UI
- login hides progress UI
- normal questionnaire flows still show progress where configured
- `authverify` routes based on slide `@goto`
- signup authverify still works
- account email authverify works

---

# Questionnaire Shell Regression

Confirm shared shell still works for:

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
accountsummary
```

Expected:

- no auth-specific wording hardcoded into normal slides
- no nursery-specific wording hardcoded into shared shell
- no plant-shop-specific wording hardcoded into shared shell
- accountsummary remains isolated to account hub behavior
- authverify remains reusable across flows

---

# Invitation Regression

Route:

```txt
/questionnaire/invitation
```

Test:

- intro media loads
- video autoplay behavior works where allowed
- video progress mode works
- video timestamp routing works
- performance rating works
- shop opens
- ticket products can be selected
- digital products can be selected
- ticket details route works
- ticket owners can be entered
- meal selection appears when needed
- review route works
- download buttons still trigger downloads
- private download API still works
- no account/auth changes broke invitation flow

---

# Shop / Seed Regression

Routes:

```txt
/questionnaire/seed
/questionnaire/invitation
```

Test:

- shop catalog loads
- products render
- product images render
- size options render
- quantities update
- purchase modes update
- discounts still calculate
- delivery route appears when physical items exist
- contact route appears for digital/contact-only flows
- review page totals are correct
- cart state persists across relevant slides

---

# Delivery Regression

Test delivery flows where available.

Expected:

- country/region options load
- delivery rates calculate
- pickup options display
- popup pickup options display
- stable pickup options display
- review page reflects delivery method
- delivery fee is included in total
- non-physical items do not force delivery

---

# Ticket / Meal Regression

Route:

```txt
/questionnaire/invitation
```

Test:

- ticket lines create ticket assignments
- ticket codes generate
- ticket owner fields display
- owner name/email/phone save in answers
- required meal tickets force meal selection
- optional meal tickets allow enabling/disabling meal
- meal options update ticket assignment
- extra serving pricing works
- meal notes save
- review page shows meal summary

---

# Nursery Ops Regression

Route:

```txt
/questionnaire/nursery-ops
```

Test:

- dynamic variables endpoint loads
- existing batches list loads
- create batch works
- batch code uses intended date logic
- batch profile loads
- batch subsets list loads
- transplanted individuals list loads
- View Transplants button appears only when transplants exist
- profile blocks render
- update buttons navigate correctly
- cancel returns to correct lobby/list
- return home clears relevant form fields where configured
- delete record confirmation works
- no account/auth changes broke nursery ops

---

# Generic Profile Flow Regression

Route:

```txt
/questionnaire/generic-profile-flow
```

Expected:

- generic record names remain generic
- selected record behavior works
- reusable blocks render
- no nursery-specific assumptions are required
- no account/auth changes broke generic profile behavior

---

# File / Download Regression

Test download flows where configured.

Expected:

- download buttons render from DSL
- download action starts
- download notice appears
- MP3/WAV or other files download
- popup-blocker edge cases are handled with clear message
- private download route still respects access rules
- no auth/account changes broke download behavior

---

# Database Integrity Checks

## Sessions

```sql
SELECT
  "id",
  "userId",
  "expiresAt",
  "lastUsedAt",
  "revokedAt",
  "createdAt"
FROM "Session"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Confirm:

- login creates sessions
- logout revokes session
- expired/revoked sessions do not authenticate

---

## Users

```sql
SELECT
  "id",
  "email",
  "emailVerifiedAt",
  "phone",
  "phoneVerifiedAt",
  "name",
  "passwordUpdatedAt",
  "createdAt",
  "updatedAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Confirm:

- active `User.email` matches active `UserEmailAddress`
- `emailVerifiedAt` is set when active email is verified
- `passwordUpdatedAt` is set after signup/reset

---

## Email history

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
  "createdAt",
  "updatedAt"
FROM "UserEmailAddress"
ORDER BY "userId", "isActive" DESC, "createdAt" ASC;
```

Confirm:

- all user emails are stored
- only one active email per user
- old emails remain reserved
- verified status is per email
- no duplicate normalized emails exist

---

## Name changes

```sql
SELECT
  "id",
  "userId",
  "previousName",
  "newName",
  "createdAt"
FROM "UserNameChange"
ORDER BY "createdAt" DESC;
```

Confirm:

- only actual name changes create rows
- update limits count correct rows

---

## Verification codes

```sql
SELECT
  "id",
  "identifier",
  "target",
  "userId",
  "attempts",
  "expiresAt",
  "createdAt"
FROM "VerificationCode"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Confirm:

- code is hashed
- target is correct
- account email update uses `accountEmailUpdate`
- account deletion uses `accountDeletion`
- consumed codes are deleted
- expired codes are cleaned

---

## Delivery attempts

```sql
SELECT
  "id",
  "channel",
  "deliveryType",
  "target",
  "destination",
  "ok",
  "status",
  "provider",
  "mode",
  "to",
  "originalTo",
  "rewritten",
  "createdAt"
FROM "VerificationDeliveryAttempt"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Confirm:

- every verification send logs a delivery attempt
- dev-safe rewrite is correctly recorded
- real-recipient sends are correctly recorded
- provider message id is saved where available
- errors are normalized

---

# Security Checks

Confirm:

- passwords are hashed
- verification codes are hashed
- reset tokens are hashed
- session tokens are hashed
- cookies are HTTP-only
- secure cookie flag is used in production
- sameSite is set
- no raw verification code is stored
- no raw reset token is stored
- deleted/scheduled deletion accounts cannot continue normally
- logged-out users cannot access account data
- historical reserved emails cannot create new accounts
- unverified email cannot become active
- backend enforces name-update limit
- frontend warnings are convenience only, not the source of truth

---

# Production Readiness Checklist

Before production:

- set correct business name
- set correct footer links
- add Privacy Policy page
- add Terms page
- add Contact page
- set production `NEXT_PUBLIC_APP_URL`
- configure SMTP sender
- test SMTP sender
- disable dev-safe rewrite if customers should receive email
- run real-recipient email delivery test
- confirm active email is used for account messages
- confirm email history is backfilled
- confirm historical emails are reserved
- confirm verification expiry matches business rules
- confirm name-update limit matches business rules
- confirm account deletion policy matches business rules
- confirm delete-code expiry matches business rules
- confirm WhatsApp/SMS settings are disabled or configured
- confirm database backups exist
- confirm Prisma schema is synced
- confirm test accounts are removed
- confirm no console-only verification mode is active
- confirm no secret values are committed

---

# Final Commit Checklist

Before committing:

```bash
npm run build
```

Then:

```bash
git status
git add .
git commit -m "feat: add reusable account email history and account hub updates"
```

After commit:

```txt
- copy commit SHA
- share new SHA as source of truth
- update README.md source-of-truth section
- update REGRESSION_CHECKLIST.md source-of-truth section
```

Final manual checks before sharing SHA:

- app builds
- signup works
- login works
- auth-account loads after login
- logout works
- name update warning works
- email update verification works
- old email remains in `UserEmailAddress`
- historical email signup is blocked
- password reset works
- account deletion works
- nursery ops still loads
- invitation flow still loads
- seed/shop flow still loads
