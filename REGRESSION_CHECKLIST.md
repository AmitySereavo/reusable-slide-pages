# Reusable Slide Pages Regression Checklist

Use this checklist after auth, slide, shop, nursery, Prisma, routing, email, or account-management changes.

Current reusable-slide-pages source of truth:

```txt
e929e589466699b00e8baf1353383b1d807538da
```

Post-source-of-truth local fixes to confirm before next commit:

```txt
- /api/account/delete/start sends deletion code only
- accountDeletion email wording added in verificationContent.js
- duplicate action protection added with actionInFlightRef
- server-side deletion-code cooldown added
- stale submitError cleared on slide changes
- stale delete success error hidden
- delete success wording changes for immediate vs scheduled deletion
```

After those fixes are committed, update the README and checklist source-of-truth SHA.

---

## 1. Setup / Environment

- [ ] Confirm `.env` exists
- [ ] Confirm `DATABASE_URL` points to the intended database
- [ ] Confirm `NEXT_PUBLIC_APP_URL` is correct

Local example:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] Confirm SMTP env values exist if testing real email

```env
EMAIL_PROVIDER_MODE="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender-email@gmail.com"
SMTP_PASS="your-google-app-password"
SMTP_FROM_EMAIL="Business Name <your-sender-email@gmail.com>"
```

- [ ] Confirm dev email rewrite mode is set correctly

Safe testing:

```env
EMAIL_DEV_TEST_MODE="true"
EMAIL_DEV_TEST_INBOX="your-test-inbox@gmail.com"
```

Real-recipient testing:

```env
EMAIL_DEV_TEST_MODE="false"
```

- [ ] Restart dev server after `.env` changes
- [ ] Use the same host for login and testing

Use:

```txt
http://localhost:3000
```

Do not mix with:

```txt
http://127.0.0.1:3000
```

---

## 2. Install / Prisma / Build

Run:

```bash
npm install
npx prisma format
npx prisma db push
npx prisma generate
npm run build
```

Expected:

- [ ] Prisma format passes
- [ ] Prisma db push does not request destructive changes unexpectedly
- [ ] Prisma generate passes
- [ ] Build passes
- [ ] TypeScript passes
- [ ] Static pages generate
- [ ] Dynamic routes appear in build output

Known non-blocking warning:

```txt
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
```

- [ ] Confirm this warning does not block build

---

## 3. Core Routes Smoke Test

Run:

```bash
npm run dev
```

Test:

```txt
http://localhost:3000/
http://localhost:3000/questionnaire/self-trust
http://localhost:3000/questionnaire/garden-herbs
http://localhost:3000/questionnaire/seed
http://localhost:3000/questionnaire/invitation
http://localhost:3000/questionnaire/nursery-ops
http://localhost:3000/questionnaire/generic-profile-flow
```

Expected:

- [ ] No 404 on registered questionnaire routes
- [ ] Page shell loads
- [ ] Slides render
- [ ] Next button works
- [ ] Back button works where enabled
- [ ] App-route `@goto` targets work
- [ ] Slide-id `@goto` targets work
- [ ] External URL targets open correctly

---

## 4. DSL Registry

File:

```txt
src/config/questionnaires/registry.ts
```

Check active entries:

- [ ] `self-trust`
- [ ] `garden-herbs`
- [ ] `seed`
- [ ] `invitation`
- [ ] `nursery-ops`
- [ ] `generic-profile-flow`
- [ ] `auth-signup`
- [ ] `auth-login`
- [ ] `auth-account`
- [ ] `auth-update-info`
- [ ] `auth-forgot-password`
- [ ] `auth-reset-password`
- [ ] `auth-delete-account`

For each entry:

- [ ] `slug` matches route URL
- [ ] `dslPath` file exists
- [ ] `theme` imports correctly
- [ ] `variables` object is valid
- [ ] `dynamicVariablesEndpoint` is correct or undefined
- [ ] `overlayMode` works where used

---

## 5. Auth Signup Flow

Route:

```txt
http://localhost:3000/questionnaire/auth-signup
```

### Fresh email signup

- [ ] Open signup route
- [ ] Enter first name
- [ ] Enter last name
- [ ] Continue to contact slide
- [ ] Enter fresh email
- [ ] Continue
- [ ] Confirm it goes to password slide
- [ ] Enter weak password
- [ ] Confirm weak password feedback appears
- [ ] Enter stronger password
- [ ] Confirm password strength updates
- [ ] Confirm password requirement list updates
- [ ] Confirm show/hide password works
- [ ] Try pasting into confirm password
- [ ] Confirm paste is blocked
- [ ] Type mismatching confirm password
- [ ] Confirm “Passwords do not match yet” appears
- [ ] Type matching confirm password
- [ ] Confirm “Passwords match” appears
- [ ] Continue
- [ ] Location slide appears
- [ ] Leave country/city blank if currently optional
- [ ] Confirm Continue works when fields are optional
- [ ] Address slide appears
- [ ] Leave address blank if optional
- [ ] Click Create Account
- [ ] Account is created
- [ ] `passwordUpdatedAt` is set
- [ ] Verification code is sent
- [ ] Verification panel appears inside slide flow
- [ ] Six code boxes appear
- [ ] Enter code
- [ ] Auto-verification triggers after final digit
- [ ] Account verified slide appears
- [ ] Click Continue
- [ ] Goes to slide-style login route

Expected login route:

```txt
/questionnaire/auth-login
```

---

## 6. Existing User Signup Checks

Route:

```txt
http://localhost:3000/questionnaire/auth-signup
```

### Existing verified user

- [ ] Enter existing verified email on contact slide
- [ ] Click Continue
- [ ] Confirm flow does not continue to password
- [ ] Confirm message says account already exists
- [ ] Confirm no duplicate user is created

### Existing unverified user

- [ ] Enter existing unverified email on contact slide
- [ ] Click Continue
- [ ] Confirm fresh verification code is sent
- [ ] Confirm verification panel appears
- [ ] Enter code
- [ ] Confirm auto-verification works
- [ ] Confirm account verified slide appears

---

## 7. Verification Panel

Component files:

```txt
src/customerAccess/components/VerificationCodePanel.jsx
src/customerAccess/components/VerificationCodePanel.d.ts
```

Check filename casing:

- [ ] File is named `VerificationCodePanel.jsx`
- [ ] File is not named `verificationCodePanel.jsx`
- [ ] Import uses uppercase `V`

Import:

```ts
import VerificationCodePanel from "@/customerAccess/components/VerificationCodePanel";
```

Test:

- [ ] Six boxes render
- [ ] First box auto-focuses
- [ ] Typing one digit moves to next box
- [ ] Backspace clears current/previous box
- [ ] Arrow left/right moves between boxes
- [ ] Pasting full numeric code fills boxes
- [ ] Full pasted code auto-verifies
- [ ] Final typed digit auto-verifies
- [ ] Invalid code clears fields
- [ ] Error message displays
- [ ] Resend button works
- [ ] Resend cooldown displays
- [ ] Correct code verifies account
- [ ] Slide flow moves to `signup-verified`
- [ ] Slide version does not auto-redirect directly to `/login`

For slide version, confirm:

```tsx
routes={{}}
```

not:

```tsx
routes={{ login: "/login" }}
```

---

## 8. Verification Config

File:

```txt
src/config/questionnaires/registry.ts
```

For `auth-signup`, check code-mode variables:

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

Code mode:

- [ ] `authVerificationDelivery` is `"code"`
- [ ] Verification panel shows code boxes
- [ ] Code sends through `/api/verify/start`
- [ ] Code checks through `/api/verify/check`

Link mode, when enabled later:

- [ ] `authVerificationDelivery` is `"link"`
- [ ] Expiry uses hours when needed
- [ ] UI does not show six code boxes for link-only flow
- [ ] Link routes through `/api/verify/consume-link`

---

## 9. Verification Content

File:

```txt
src/customerAccess/config/verificationContent.js
```

Confirm these targets exist:

- [ ] `user`
- [ ] `lead`
- [ ] `passwordReset`
- [ ] `accountDeletion`

Confirm account deletion code content exists:

```js
accountDeletion: {
  code: {
    email: {
      subject: "Confirm account deletion",
      getText: ({ code }) =>
        `Use this account deletion code to confirm deleting your account: ${code}`,
      getHtml: ({ code }) =>
        `<p>Use this account deletion code to confirm deleting your account:</p><p><strong>${code}</strong></p><p>If you did not request this, do not share this code.</p>`,
    },
  },
}
```

Test:

- [ ] Signup email says account verification wording
- [ ] Lead email says confirm details wording
- [ ] Password reset email says reset password wording
- [ ] Account deletion email says account deletion wording
- [ ] Account deletion email subject is `Confirm account deletion`

---

## 10. Auth Login Flow

Route:

```txt
http://localhost:3000/questionnaire/auth-login
```

Test:

- [ ] Enter verified email
- [ ] Enter password
- [ ] Click Log In
- [ ] Login success slide appears or dashboard route is reached
- [ ] Session cookie is created
- [ ] `/dashboard` opens after login
- [ ] Refresh `/dashboard`
- [ ] User stays logged in
- [ ] Open `/api/session`
- [ ] Confirm `authenticated: true`

Invalid login:

- [ ] Enter wrong password
- [ ] Confirm error appears
- [ ] Confirm no session is created

---

## 11. Logout / Session

Routes:

```txt
/api/logout
/api/session
/dashboard
```

Test:

- [ ] Log in
- [ ] Open `/dashboard`
- [ ] Confirm dashboard loads
- [ ] Open `/api/session`
- [ ] Confirm authenticated true
- [ ] Trigger logout
- [ ] Confirm session clears
- [ ] Open `/api/session`
- [ ] Confirm authenticated false
- [ ] Open `/dashboard` again
- [ ] Confirm access is blocked or redirected

Session table:

- [ ] `Session` record is created on login
- [ ] `ipAddress` is saved when available
- [ ] `userAgent` is saved when available
- [ ] `lastUsedAt` updates where expected
- [ ] `revokedAt` is used when sessions are revoked

---

## 12. Account Hub Flow

Route:

```txt
http://localhost:3000/questionnaire/auth-account
```

Backend:

```txt
/api/account/profile
```

Test while logged in:

- [ ] Account route loads
- [ ] Current account info is available from `/api/account/profile`
- [ ] Name option opens update name slide
- [ ] Location option opens update location slide
- [ ] Address option opens update address slide
- [ ] Update password opens forgot-password/reset flow route
- [ ] Delete account opens delete account route
- [ ] Back buttons return to account hub
- [ ] No 404 on any account links

Test while logged out:

- [ ] `/api/account/profile` returns logged-out/unauthorized state
- [ ] Account route does not break
- [ ] Future improvement: account-only routes should show login prompt or redirect

---

## 13. Update Info Flow

Routes:

```txt
http://localhost:3000/questionnaire/auth-account
http://localhost:3000/questionnaire/auth-update-info
```

Backend:

```txt
/api/account/update-info
```

Test:

- [ ] Log in
- [ ] Open account hub
- [ ] Click Update Name
- [ ] Enter new name
- [ ] Save
- [ ] Success slide appears
- [ ] `/api/account/profile` shows updated name
- [ ] Click Update Location
- [ ] Update country/city
- [ ] Save
- [ ] `/api/account/profile` shows updated country/city
- [ ] Click Update Address
- [ ] Update address fields
- [ ] Save
- [ ] `/api/account/profile` shows updated address fields

Current updateable fields:

```txt
name
country
city
addressLine1
addressLine2
parishOrRegion
postalCode
```

Confirm:

- [ ] Email is not changed by update-info route
- [ ] Phone is not changed by update-info route
- [ ] Password is not changed by update-info route

---

## 14. Forgot Password Slide Flow

Route:

```txt
http://localhost:3000/questionnaire/auth-forgot-password
```

Backend:

```txt
/api/password/forgot
```

Test email reset:

- [ ] Enter verified email
- [ ] Submit
- [ ] Neutral success message appears
- [ ] Reset email sends
- [ ] Delivery attempt logs as sent
- [ ] Link points to reset password route
- [ ] Non-existing email still shows neutral success message
- [ ] Rate limit/cooldown works
- [ ] Back button can return to account hub when opened from account hub

Phone reset, when enabled later:

- [ ] Phone requires enabled phone channel
- [ ] SMS remains disabled while SMS is paused
- [ ] WhatsApp reset code works only when WhatsApp provider is enabled

---

## 15. Reset Password Slide Flow

Route example:

```txt
http://localhost:3000/questionnaire/auth-reset-password?token=<token>
```

Backend:

```txt
/api/password/reset
```

Test:

- [ ] Open reset route with valid token
- [ ] Enter weak password
- [ ] Confirm policy feedback appears
- [ ] Enter valid password
- [ ] Confirm password cannot be pasted into confirm field
- [ ] Enter mismatched confirm password
- [ ] Confirm Next/Submit is blocked
- [ ] Enter matching confirm password
- [ ] Submit
- [ ] Password reset success slide appears
- [ ] `passwordUpdatedAt` updates
- [ ] Old sessions are revoked
- [ ] Old password no longer works
- [ ] New password works
- [ ] Reset token cannot be reused

Invalid token:

- [ ] Expired token fails
- [ ] Used token fails
- [ ] Missing token fails gracefully

---

## 16. Account Deletion Config

File:

```txt
src/customerAccess/config/authRules.js
```

Confirm config supports:

```js
accountDeletion: {
  mode: "immediate", // "immediate" or "delayed"
  delayDays: 0,
  allowCancelBeforeDeletion: false,
  anonymizeInsteadOfDelete: false,

  requireVerificationCode: true,
  verificationExpiresInMinutes: 10,
}
```

Test these config modes with disposable accounts only:

### Immediate deletion with code

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

Expected:

- [ ] Delete requires code
- [ ] Correct code deletes account
- [ ] Session clears
- [ ] `/api/session` returns authenticated false
- [ ] Success wording says account deleted

### Delayed deletion with code

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

Expected:

- [ ] Delete requires code
- [ ] Correct code schedules deletion
- [ ] `deletionRequestedAt` is set
- [ ] `deletionScheduledAt` is set
- [ ] `deletionStatus` is `pending`
- [ ] Session clears
- [ ] Success wording says deletion scheduled

### Delayed deletion without code

```js
accountDeletion: {
  mode: "delayed",
  delayDays: 14,
  allowCancelBeforeDeletion: true,
  anonymizeInsteadOfDelete: false,
  requireVerificationCode: false,
  verificationExpiresInMinutes: 10,
}
```

Expected:

- [ ] Flow can skip code requirement when route/DSL supports it
- [ ] Account is scheduled
- [ ] Session clears
- [ ] Success wording says deletion scheduled

### Anonymize deletion

```js
accountDeletion: {
  mode: "immediate",
  delayDays: 0,
  allowCancelBeforeDeletion: false,
  anonymizeInsteadOfDelete: true,
  requireVerificationCode: true,
  verificationExpiresInMinutes: 10,
}
```

Expected:

- [ ] User record remains
- [ ] Email is cleared
- [ ] Phone is cleared
- [ ] Name becomes deleted account marker
- [ ] Address fields clear
- [ ] `deletedAt` is set
- [ ] `deletionStatus` is `deleted`
- [ ] Session clears

---

## 17. Account Delete Code Flow

Route:

```txt
http://localhost:3000/questionnaire/auth-delete-account
```

Backend routes:

```txt
/api/account/delete/start
/api/account/delete
/api/account/delete/cancel
```

Use only a disposable account.

### Send delete code

- [ ] Log in with disposable account
- [ ] Open delete account route
- [ ] Type anything other than `DELETE`
- [ ] Confirm error appears
- [ ] Type `DELETE`
- [ ] Click Send Delete Code once
- [ ] Exactly one email is sent
- [ ] Slide moves to `delete-account-code`
- [ ] Email subject says `Confirm account deletion`
- [ ] Email body says account deletion code, not generic verification code
- [ ] VerificationCode record has `target: accountDeletion`
- [ ] VerificationCode record has `userId`
- [ ] VerificationCode record has bcrypt-hashed code
- [ ] VerificationCode expires according to config

### Duplicate-send protection

- [ ] Click Send Delete Code once
- [ ] Confirm only one email arrives
- [ ] Immediately try to request another code
- [ ] Server cooldown blocks duplicate request
- [ ] Error mentions wait time
- [ ] No second email arrives inside cooldown window

Current intended protections:

```txt
QuestionnaireShell actionInFlightRef
/api/account/delete/start cooldown
AUTH_RULES.verification.resendCooldownSeconds
```

### Complete deletion

- [ ] Enter wrong code
- [ ] Confirm invalid code error appears
- [ ] Attempts increment
- [ ] Enter correct code
- [ ] Confirm account is deleted or scheduled based on config
- [ ] Account deletion code records are cleared
- [ ] Session clears
- [ ] `/api/session` returns authenticated false
- [ ] Success slide appears

### Success slide wording

Immediate deletion expected:

```txt
Account deleted
Your account has been deleted and you have been logged out.
```

Scheduled deletion expected:

```txt
Deletion scheduled
Your account is scheduled for deletion. You have been logged out.
```

Confirm:

- [ ] No stale “You must be logged in” error appears on success slide
- [ ] No stale error appears after account deletion success
- [ ] `deleteAccountStatus` is stored in answers
- [ ] `deleteAccountMessage` is stored in answers
- [ ] `deleteAccountScheduledAt` is stored in answers when scheduled

---

## 18. Cancel Delete Flow

Backend:

```txt
/api/account/delete/cancel
```

For delayed deletion only:

- [ ] Create disposable account
- [ ] Schedule deletion
- [ ] Confirm `deletionStatus` is `pending`
- [ ] Log back in if cancellation is allowed
- [ ] Call cancellation route/flow
- [ ] `deletionRequestedAt` clears
- [ ] `deletionScheduledAt` clears
- [ ] `deletionStatus` clears
- [ ] Account remains usable

Future UI:

- [ ] Add cancellation button to account hub when `deletionStatus` is `pending`
- [ ] Hide cancellation button when cancellation is not allowed
- [ ] Show scheduled deletion date

---

## 19. Legacy Auth Pages

Legacy routes still exist:

```txt
/signup
/login
/verify
/forgot-password
/forgot-password/code
/reset-password
/dashboard
```

Test:

- [ ] `/signup` still loads
- [ ] `/login` still loads
- [ ] `/verify` still loads
- [ ] `/forgot-password` still loads
- [ ] `/reset-password` still loads
- [ ] `/dashboard` still loads for logged-in users
- [ ] Legacy `/verify` still uses `VerificationCodePanel`
- [ ] Legacy verification code behavior still works

Preferred UX direction:

```txt
/questionnaire/auth-signup
/questionnaire/auth-login
/questionnaire/auth-account
/questionnaire/auth-forgot-password
/questionnaire/auth-reset-password
```

---

## 20. Email Delivery Attempts

Check delivery attempt records after email actions.

Expected actions that create delivery attempts:

- [ ] Signup verification code
- [ ] Resend verification code
- [ ] Password reset link
- [ ] Account deletion code
- [ ] Future invoice email
- [ ] Future marketing sequence email

Check fields:

- [ ] channel
- [ ] provider
- [ ] mode
- [ ] status
- [ ] ok
- [ ] to
- [ ] originalTo
- [ ] rewritten
- [ ] providerMessageId
- [ ] target
- [ ] purpose
- [ ] metadata

Expected SMTP success:

```txt
provider: smtp
mode: smtp
status: sent
ok: true
```

Expected dev rewrite:

```txt
rewritten: true
originalTo: real user email
to: EMAIL_DEV_TEST_INBOX
```

Expected account deletion metadata:

```txt
target: accountDeletion
purpose: account-deletion
contentChannel: email
```

---

## 21. Shop / Invitation Flow

Route:

```txt
http://localhost:3000/questionnaire/invitation
```

Test:

- [ ] Intro media slide loads
- [ ] Video plays
- [ ] Video progress bar works
- [ ] Video timestamp route works if configured
- [ ] Shop opens
- [ ] Product details expand/collapse
- [ ] Ticket/invitation item can be selected
- [ ] Quantity can be changed
- [ ] Purchase mode can be selected
- [ ] Digital-only item routes without delivery
- [ ] Physical item routes to delivery
- [ ] Mixed cart routes to delivery
- [ ] Review order works
- [ ] Download buttons work for configured keys
- [ ] Download notice appears

---

## 22. Ticket Details Flow

Route:

```txt
http://localhost:3000/questionnaire/invitation
```

Test:

- [ ] Select ticket/invitation product
- [ ] Continue to ticket details
- [ ] Correct number of ticket assignment panels appears
- [ ] Temporary ticket code appears for each ticket
- [ ] Ticket owner name can be entered
- [ ] Ticket owner email can be entered
- [ ] Ticket owner WhatsApp/phone can be entered
- [ ] “Select meal for this ticket” appears where required
- [ ] Selecting meal returns to same ticket details flow
- [ ] Each ticket keeps its own meal selection
- [ ] Optional meal add-on can be selected if configured
- [ ] Meal notes save per ticket
- [ ] Continue routes correctly to delivery/contact/review

---

## 23. Meal Selection Flow

Test:

- [ ] Meal menu loads
- [ ] Required meal sections are enforced
- [ ] Optional sections are optional
- [ ] Meal choice stores against selected ticket
- [ ] Returning to ticket details shows selected meal
- [ ] Changing meal updates only that ticket
- [ ] Required meals block checkout until completed
- [ ] Optional add-on pricing updates order totals where configured

---

## 24. Delivery Flow

Test:

- [ ] Delivery options load
- [ ] Pickup option works
- [ ] Delivery option works
- [ ] Delivery fee calculates correctly
- [ ] Total updates with delivery fee
- [ ] Physical products require delivery/pickup
- [ ] Digital-only products skip delivery
- [ ] Mixed cart requires delivery/pickup

---

## 25. Download API

Route:

```txt
/api/downloads/[downloadkey]
```

Test:

- [ ] Valid download key starts download
- [ ] Invalid key returns safe error
- [ ] Missing file returns safe error
- [ ] Private path is not exposed unnecessarily
- [ ] Browser download starts
- [ ] Download notice appears on slide
- [ ] MP3/WAV keys work if configured

Known warning:

- [ ] NFT warning still non-blocking

---

## 26. Nursery Ops Flow

Route:

```txt
http://localhost:3000/questionnaire/nursery-ops
```

Test:

- [ ] Nursery ops route loads
- [ ] Dynamic batches load
- [ ] Existing batches list appears
- [ ] Batch profile opens
- [ ] Batch subsets naming appears correctly
- [ ] View Transplants button appears only when transplants exist
- [ ] Record transplant works
- [ ] Create batch works
- [ ] Batch code uses user-entered start date where expected
- [ ] Log activity works
- [ ] Delete record confirmation works
- [ ] Cancel returns to expected previous lobby
- [ ] Return Home goes to home slide
- [ ] Update routes correctly
- [ ] Clear-form-fields behavior works on Cancel/Return Home/Submit where intended

---

## 27. Reusable Blocks / Record Lists

Test:

- [ ] Data blocks render
- [ ] Block source variables resolve
- [ ] Title fields resolve
- [ ] Subtitle fields resolve
- [ ] Meta fields resolve
- [ ] Empty text appears when source list is empty
- [ ] Goto actions work
- [ ] Delete actions work where configured
- [ ] Dynamic variables refresh after delete where configured

---

## 28. Form Field Types

Test every field type:

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

Expected:

- [ ] Required text blocks Next when empty
- [ ] Optional text allows Next when empty
- [ ] Email input works
- [ ] Tel input works
- [ ] Password input works
- [ ] Password show/hide works
- [ ] Confirm password paste is blocked
- [ ] Number input rejects invalid values
- [ ] Date input works
- [ ] Use Today button works
- [ ] Checkbox required requires checked
- [ ] Textarea works
- [ ] Select works

---

## 29. Slide Navigation

Test:

- [ ] `@goto` slide ID works
- [ ] `@goto` app route works
- [ ] `@goto` external URL works
- [ ] `@backgoto` works
- [ ] `@cancelgoto` works
- [ ] Conditional `@when` works
- [ ] Conditional `@backwhen` works
- [ ] `@shownext: false` hides Next
- [ ] `@showback: false` hides Back
- [ ] `@showreturnhome` works
- [ ] `@showcancel` works
- [ ] History stack works after routed slide navigation
- [ ] Action slides do not fall through into duplicate navigation
- [ ] `startDeleteAccount` does not run twice
- [ ] `submitDeleteAccount` does not show stale errors after success

---

## 30. UI / Responsive

Test desktop and mobile widths:

- [ ] Slides fit viewport
- [ ] Bottom action bar does not cover important fields
- [ ] Long form slides scroll
- [ ] Verification code boxes fit mobile width
- [ ] Password feedback does not overflow
- [ ] Shop cards fit mobile width
- [ ] Ticket panels fit mobile width
- [ ] Meal selection fits mobile width
- [ ] Delivery totals remain visible
- [ ] Buttons are tappable
- [ ] Disabled buttons visually appear disabled
- [ ] Focus states are visible

---

## 31. Security Checks

- [ ] Passwords are hashed with bcrypt
- [ ] Verification codes are hashed with bcrypt
- [ ] Account deletion codes are hashed with bcrypt
- [ ] Reset tokens are hashed
- [ ] Sessions use token hash
- [ ] Password reset revokes old sessions
- [ ] Account deletion clears or revokes sessions
- [ ] Rate limits apply to signup
- [ ] Rate limits apply to verification start
- [ ] Rate limits apply to verification check
- [ ] Rate limits apply to password forgot
- [ ] Rate limits apply to password reset
- [ ] Rate limits/cooldown apply to delete-code start
- [ ] Errors do not leak sensitive information
- [ ] Forgot password uses neutral messaging
- [ ] Private downloads do not expose full private paths
- [ ] Dev email rewrite is off before production
- [ ] Delete account requires logged-in session
- [ ] Delete account requires code when config requires it

---

## 32. Production Readiness

Before production:

- [ ] Set correct business name in config
- [ ] Set correct footer links
- [ ] Add Privacy Policy page
- [ ] Add Terms page
- [ ] Add Contact page
- [ ] Set production `NEXT_PUBLIC_APP_URL`
- [ ] Turn off `EMAIL_DEV_TEST_MODE`
- [ ] Confirm SMTP sender works
- [ ] Confirm verification expiry matches business rules
- [ ] Confirm account deletion policy matches business rules
- [ ] Confirm delete-code expiry matches business rules
- [ ] Confirm WhatsApp/SMS settings are disabled or configured
- [ ] Confirm database backups exist
- [ ] Confirm Prisma schema is synced
- [ ] Confirm test accounts are removed
- [ ] Confirm no console-only verification mode is active
- [ ] Confirm no secret values are committed
- [ ] Confirm account-only flows have login guard or acceptable logged-out messaging

---

## 33. Final Build / Commit

Run:

```bash
npm run build
```

Expected:

- [ ] Build passes
- [ ] TypeScript passes
- [ ] Route list includes expected auth routes
- [ ] Route list includes expected questionnaire routes
- [ ] No new blocking warnings

Then:

```bash
git status
git add .
git commit -m "docs: update reusable slide pages regression checklist"
```

After commit:

- [ ] Copy commit SHA
- [ ] Share new SHA as source of truth
- [ ] Update README source-of-truth section
- [ ] Update regression checklist source-of-truth section
