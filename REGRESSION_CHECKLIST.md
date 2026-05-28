# Regression Checklist

## 1. General build and startup

```txt
- npm run build completes without TypeScript errors.
- npx prisma generate completes after schema changes.
- npx prisma db push completes after additive schema changes.
- npm run dev starts cleanly after deleting .next when auth/session/schema files changed.
- No stale Prisma client errors appear after restart.
- Questionnaire pages load from /questionnaire/[slug].
- Existing flows still load: invitation, auth-login, auth-account, nursery-ops, seed.
```

---

## 2. Reusable shell / DSL safety

```txt
- QuestionnaireShell has no hardcoded invitation-only slide behavior.
- Nursery-specific wording is not added to shared shell code.
- Invitation-specific wording is kept in invitation DSL/config.
- Reusable behavior stays in parser, shared shell, src/lib, or src/customerAccess.
- New DSL directives are parser-supported and type-supported.
- Existing directives still work: @goto, @showreturnhome, @showauthcontrols, @videostart, @videogoto, @autoplay.
```

---

## 3. Auth login and return-to-slide flow

```txt
- Login button appears where @showauthcontrols or action-bar auth controls are enabled.
- Clicking Login from first video opens /questionnaire/auth-login with returnTo.
- Clicking Login from second video opens /questionnaire/auth-login with returnTo.
- After successful login, login success button says Continue.
- Continue returns to the exact questionnaire page/slide where Login was clicked.
- loginReturnSlide is handled once and does not trap the user on the old slide.
- After returning from login, video @videogoto still advances normally.
- Auth-login page has no slide count.
- Auth-login page has no progress bar.
- Auth-login fallback still goes to account/home when no returnTo exists.
```

---

## 4. Hamburger auth menu

```txt
- Hamburger menu appears on slides with @showauthcontrols: true.
- Logged-out menu shows Login.
- Logged-out menu shows Clear Visitor State.
- Logged-in menu shows Account.
- Logged-in menu shows Answered Questions if configured/available.
- Logged-in menu shows Logout.
- Logged-in menu shows Clear Visitor State.
- Logout clears session and returns user to logged-out state.
- Menu closes after clicking menu actions.
- Menu does not block video controls unexpectedly.
```

---

## 5. Clear Visitor State

```txt
- Clear Visitor State is visible in development/testing menu.
- Clicking Clear Visitor State calls /api/questionnaires/visitor-state/clear.
- Session/auth cookie is cleared.
- gated access cookie is cleared.
- local engagement snapshot is cleared.
- local/session resume decisions are cleared.
- page reloads as a fresh visitor.
- After clearing visitor state, invitation starts as a new visitor.
- After clearing visitor state, gated form appears again when the flow reaches it.
```

---

## 6. Embedded reusable auth form

```txt
- authform slide renders embedded LeadCaptureForm.
- gatedLeadCapture uses reusable customerAccess LeadCaptureForm.
- Form fields are rendered by reusable AuthForm, not rebuilt manually in QuestionnaireShell.
- routes.login is passed into LeadCaptureForm/AuthForm.
- "Already have an account? Log in" appears on gated lead form.
- Login link routes to auth-login with returnTo back to the current questionnaire slide.
- Non-gated lead forms still work.
- Unsupported authform keys show a helpful unsupported-form message.
```

---

## 7. Gated lead signup and confirmation slide

```txt
- Logged-out user reaches gatedLeadCapture form.
- User can enter name and email.
- Submit creates or fetches temporary auth-backed user.
- Submit creates or updates Lead row.
- Submit creates/updates UserEmailAddress row.
- Submit sends private access verification link.
- Submit syncs local engagement snapshot into DB.
- After successful submit, user is routed to the DSL @goto confirmation slide.
- Form is no longer visible after successful submit.
- User cannot keep clicking the same form to send repeated links.
- Confirmation slide tells user to check email.
- Confirmation slide Return Home works.
```

---

## 8. Gated verification link

```txt
- Private link email is received in dev-safe or real-recipient mode as configured.
- Clicking private link calls /api/verify/consume-link.
- Token verifies the target gatedLeadAccess.
- User.emailVerifiedAt is updated where applicable.
- UserEmailAddress is marked verified.
- Lead is marked verified.
- Long-lived signed gated access cookie is set.
- Redirect goes to the configured private slide/link.
- Invalid/expired/consumed tokens show correct failure behavior.
- Re-clicking consumed token does not create duplicate unexpected state.
```

---

## 9. Gated cookie and temporary account session bridge

```txt
- Returning visitor with valid gated cookie can be recognized.
- /api/questionnaires/gated-access/status returns access state.
- If gated cookie has userId and no active session, a normal session is created.
- Temporary/lead user is treated as logged in after session bridge.
- Hamburger menu changes to logged-in state after session bridge.
- Gated lead form is bypassed for known/logged-in user.
- Cookie does not store raw email.
- Cookie does not store raw phone.
- Cookie does not store video timestamp.
```

---

## 10. Marketing-question tracking

```txt
- Anonymous visitor can answer performance/rating slide.
- Answer is stored locally before signup.
- On lead signup, local answer syncs to UserMarketingQuestionAnswer.
- SQL shows UserMarketingQuestionAnswer row.
- Returning known user loads answeredQuestionSlideIds from DB.
- Performance/rating slide is skipped only if DB says that slide/question was answered.
- Cookie alone does not skip performance/rating slide.
- Logged-in user who has not answered still sees the marketing question.
- User can later access answered questions from menu/target when implemented.
```

---

## 11. Video progress local tracking

```txt
- Anonymous video progress is written locally after the threshold, not immediately at 0.
- Local storage records questionnaireSlug, slideId, lastPositionSeconds, durationSeconds, watchedAt.
- Progress below threshold does not overwrite meaningful saved progress.
- Each video slide has its own local progress record.
- Local progress survives refresh before signup.
```

---

## 12. Video progress DB sync

```txt
- Lead signup syncs local video progress into UserVideoProgress.
- Logged-in user progress syncs periodically while watching.
- SQL shows UserVideoProgress rows.
- Each video slide has its own UserVideoProgress row.
- Updating progress on video 1 does not overwrite video 2.
- Updating progress on video 2 does not overwrite video 1.
- DB lastPositionSeconds increases after continued watching.
- DB progress becomes source of truth for known users.
```

---

## 13. Per-video `@videoresume`

```txt
- Parser accepts @videoresume: none.
- Parser accepts @videoresume: auto.
- Parser accepts @videoresume: prompt-once.
- Parser accepts @videoresume: prompt-every-time.
- Invalid/missing @videoresume safely behaves like none.
- @videoresume is only meaningful for @mediatype: video slides.
```

## 13A. `@videoresume: none`

```txt
- Video uses configured @videostart.
- Video does not show resume prompt.
- Video does not auto-seek to saved DB progress.
```

## 13B. `@videoresume: auto`

```txt
- Video automatically starts from its own saved DB timestamp when available.
- If no DB timestamp exists, video uses @videostart.
- No prompt is shown.
- Autoplay still follows @autoplay.
```

## 13C. `@videoresume: prompt-once`

```txt
- Prompt appears once per session for that specific video slide only.
- Prompt does not control any other video slide.
- Clicking Continue seeks immediately to that video’s saved timestamp.
- Clicking Start from beginning uses that video’s configured @videostart.
- Returning to the same video in the same session does not prompt again.
- A different video with prompt-once can still show its own prompt.
```

## 13D. `@videoresume: prompt-every-time`

```txt
- Prompt appears every time user lands on that video slide if saved timestamp exists.
- Continue seeks to that video’s saved timestamp.
- Start from beginning uses that video’s configured @videostart.
- Prompt behavior does not affect other videos.
```

---

## 14. Video seek and autoplay behavior

```txt
- Continue button on resume prompt sends a seconds-based seek request.
- Video seeks immediately after clicking Continue.
- Video does not remain at 0 after Continue.
- Existing percent-based progress-bar seeking still works.
- @autoplay: true attempts to play after resume seek.
- Browser autoplay restrictions are handled gracefully.
- Mute button still works.
- Play overlay still works.
- Vertical video playing state still updates action bar visibility if used.
```

---

## 15. `@videogoto` combined with `@videoresume`

```txt
- First video can use @videoresume: prompt-once and @videogoto together.
- User clicks Continue and video resumes from saved timestamp.
- If playback reaches @videogoto timestamp, route fires.
- If saved timestamp is before @videogoto, video continues until route point.
- If saved timestamp is after @videogoto, confirm route behavior is acceptable or add seek-crossing handling if needed.
- After route, next slide loads correctly.
- Next video with @videoresume: auto starts from its own saved timestamp.
```

---

## 16. URL-addressable slides with `@syncurl`

```txt
- Parser accepts @syncurl: true.
- Slide with @syncurl updates URL to ?slide=<slideId>.
- Refresh on ?slide=<slideId> opens that slide.
- Non-sync slides remove old ?slide value.
- Home/first slide does not need @syncurl.
- Return Home calls existing goToTarget("home") flow.
- Return Home clears ?slide when home does not have @syncurl.
- Deep private video slide can use @syncurl and @showreturnhome together.
```

---

## 17. Invitation gated video flow

```txt
- New visitor opens invitation at first video.
- First video autoplay follows @autoplay.
- First video progress bar follows video progress mode.
- At configured @videogoto, flow moves to performance/rating slide.
- If rating already answered in DB, rating slide is skipped.
- If not logged in/known, gated lead form appears.
- Gated lead form has login link.
- Gated lead form success routes to confirmation slide.
- Private link verification returns user to configured private slide.
- Returning user can bypass gate.
- Second video can refresh with ?slide=second-video.
- Second video can @videoresume: auto from its own saved timestamp.
- Return Home from second video starts whole sequence again from home.
```

---

## 18. Ticket and meal flow

```txt
- Contact details slide comes before ticket details.
- Logged-in user contact fields can autofill from account info.
- First ticket can autofill from contact details.
- Purchaser can mark "this is my ticket."
- Ticket owner name can be edited.
- Ticket owner email can be edited.
- Ticket owner phone/WhatsApp can be edited.
- Individual ticket can be marked for email delivery.
- Purchaser ticket can avoid same "you received a ticket" email behavior.
- Email all tickets action direction remains compatible with future backend sending.
- If one ticket email is wrong/missing, user can return and fix/send only that ticket later.
- Required meal ticket forces meal selection.
- Optional meal ticket can skip or select.
- Meal add-on totals calculate per ticket.
- Extra food option calculates correctly.
- Meal notes save per ticket.
```

---

## 19. Shop / checkout flow

```txt
- Shop browse still loads catalog.
- Product quantity updates still work.
- Product size options still work.
- Purchase mode selection still works.
- Review order still shows correct selected lines.
- Delivery fee still calculates when required.
- Discount definitions still apply.
- Digital/email-only orders can route without physical delivery.
- Physical orders still require delivery/pickup/contact details as configured.
```

---

## 20. Account email update flow

```txt
- Account page shows active email.
- Account page shows retained email history.
- Requesting new email reserves it to logged-in account.
- Email already reserved to another account is blocked.
- Email already attached to same account can be re-sent verification if unverified.
- Verification code sends.
- Six-box verification auto-checks after final digit.
- Wrong code clears boxes.
- Resend cooldown works.
- Successful verification activates new email.
- Other email records become inactive.
- User.email updates for compatibility.
- Old email remains stored and reserved.
```

---

## 21. Account name update limit

```txt
- Account summary shows remaining name update opportunities.
- User sees remaining opportunities before submitting name change.
- Name update allowed while under limit.
- Name update blocked at limit.
- Backend enforces limit even if frontend is bypassed.
- Non-name updates do not consume name-change opportunities.
- Actual name change creates UserNameChange row.
```

---

## 22. Account delete flow

```txt
- Delete account requires logged-in user.
- User must type DELETE.
- Start route sends deletion verification code once.
- Duplicate clicks do not send duplicate immediate emails.
- Server cooldown prevents repeated deletion code send.
- Code verification works.
- Wrong/stale code fails safely.
- Immediate delete mode logs user out.
- Delayed delete mode schedules deletion.
- Delete success slide shows correct message.
- Stale "You must be logged in" message is hidden after successful deletion.
```

---

## 23. Dev email safety

```txt
- EMAIL_DEV_TEST_MODE=true rewrites recipient to EMAIL_DEV_TEST_INBOX.
- Delivery log shows rewritten: true.
- Delivery log preserves originalTo.
- EMAIL_DEV_TEST_MODE=false sends to real recipient.
- SMTP config uses smtp.gmail.com, not smtp@gmail.com.
- Environment changes require dev server restart.
```

---

## 24. Database inspection queries

```sql
SELECT
  "userId",
  "questionnaireSlug",
  "slideId",
  "questionKey",
  "answer",
  "answeredAt",
  "updatedAt"
FROM "UserMarketingQuestionAnswer"
ORDER BY "updatedAt" DESC
LIMIT 20;
```

```sql
SELECT
  "userId",
  "questionnaireSlug",
  "slideId",
  "lastPositionSeconds",
  "durationSeconds",
  "watchedAt",
  "updatedAt"
FROM "UserVideoProgress"
ORDER BY "updatedAt" DESC
LIMIT 20;
```

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

## 25. Final smoke test before commit

```txt
- npm run build passes.
- invitation flow works as new visitor.
- gated lead form submits once and redirects to confirmation.
- email verification link grants access.
- returning viewer bypasses gate.
- marketing slide skips only after DB answer exists.
- video progress saves to DB.
- @videoresume: prompt-once works on one video only.
- @videoresume: auto works on second video.
- @syncurl refreshes deep video slide.
- Return Home clears deep slide URL.
- auth-login returnTo still works.
- Clear Visitor State resets visitor to fresh state.
```
