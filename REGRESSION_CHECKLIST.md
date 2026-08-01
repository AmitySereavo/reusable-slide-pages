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
- Public custom-domain aliases still load: /gift for the giveaway and /shop for the Little Orchard Shop.
```

---

## 1A. App-wide visitor activity

```txt
- Root layout mounts ActivityTrackingProvider without breaking static/public pages.
- Public routes emit local page_view and engaged_page_view events through one visitor/session identity.
- Anonymous visitor activity remains local-only until an interest threshold is reached.
- Meaningful events such as questionnaire_answered, bookmark_created, video_progress_50, product_viewed, cart_item_added, checkout_started, and download_requested can persist through /api/visitors/activity.
- Dashboard and admin routes do not persist visitor tracking events.
- Logged-in admin/staff sessions no-op the app-wide tracker.
- Existing questionnaire engagement sync for logged-in users still works.
- Existing grow-guide tracked links still record page visits through /api/grow-guide-links/track.
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
- New shop flows should add catalog/order logic outside QuestionnaireShell whenever practical; shell changes should be limited to reusable wiring.
- DSL headings render in balanced one- or two-word lines, with `Grow Guide` kept together on its own line.
```

---

## 2A. Little Orchard Shop

```txt
- /shop redirects or rewrites to /questionnaire/little-orchard-shop.
- The shop intro shows ParaLife Trees, Little Orchard Shop, and the plant-market flyer.
- Product browse shows the current Little Orchard nursery inventory in JMD.
- Size-only duplicates are consolidated: Scallion and Lemon Balm each appear once with multiple pot-size options.
- Lychee Tree appears once with Small Lychee Tree and Large Lychee Tree options.
- Different variations retain separate SKUs, prices, and event quantity limits.
- Product quantity cannot exceed the configured event max quantity in the UI.
- Product quantity cannot exceed the selected variation's configured event quantity.
- Cart heading says Review Your Selected Items.
- Empty cart cannot be submitted.
- Cart adjust links return to the Little Orchard Shop, not invitation/music-merch shops.
- Customer name is required.
- Device selection records own_device or shared_event_device.
- WhatsApp checkout on own device does not require typed WhatsApp number.
- WhatsApp checkout on shared event device requires a customer WhatsApp number.
- Email checkout requires a valid email address.
- Consent acknowledgement is required before order submission.
- POST /api/plant-shop/orders creates fulfillment records with source little_orchard_shop.
- Email checkout sends the business notification and customer receipt where configured.
- WhatsApp checkout records the order before opening the prepared WhatsApp message.
- WhatsApp message does not include contact method or device type.
- WhatsApp message includes the secure cashier order link.
- Opening the cashier link while logged out shows only the Cashier Access Required public-safe page.
- Opening the cashier link as admin filters the Orders dashboard to the matching order.
- Submitted Little Orchard orders show Payment: AWAITING_PAYMENT and Inventory applied: No.
- Confirm Payment checks current confirmed quantities and marks inventory as applied once.
- Repeated Confirm Payment requests do not apply inventory twice.
- /admin/event-orders redirects to the protected Orders dashboard.
- Orders dashboard shows Little Orchard physical fulfillment rows with customer and product details.
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
- Side panel/account menu appears where reusable sidebars/account links are enabled.
- Logged-out menu shows Login.
- Logged-out menu shows Reset dev progress.
- Logged-in menu shows Account.
- Logged-in menu shows Answered Questions if configured/available.
- Logged-in menu shows Logout.
- Logged-in menu shows Reset dev progress.
- Logout clears session and returns user to logged-out state.
- Menu closes after clicking menu actions.
- Menu does not block video controls unexpectedly.
- Dashboard/admin links show only for users with adminLevel >= 1.
```

---

## 5. Reset dev progress / visitor state

```txt
- Reset dev progress is visible in the account side panel for dev/testing.
- Clicking Reset dev progress calls /api/questionnaires/visitor-state/clear.
- Session/auth cookie is cleared.
- gated access cookie is cleared.
- local engagement snapshot is cleared.
- local/session resume decisions are cleared.
- checkout draft and cart reservation state are cleared.
- page reloads as a fresh visitor.
- After resetting dev progress, invitation starts as a new visitor.
- After resetting dev progress from `?slide=second-video`, the URL no longer
  contains the stale `slide` parameter.
- After resetting dev progress from invitation second video, the first video
  loads and the second video is gated again.
- After resetting dev progress, gated form appears again when the flow reaches it.
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
- Signup slides can pass @signuptags and @signupsource.
- Signup-created users receive UserTag records for configured signup tags.
- Tag-added email sequences can target those signup tags with a Has tag condition.
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
- Ticket store can select verified purchase-for-someone recipients.
- Ticket details pulls ticket owner name/email from ticket-store recipient allocation.
- Recipient-owned ticket rows are not overwritten by purchaser contact autofill.
- Purchaser can review who each ticket was purchased for before checkout.
- Purchaser can mark "this is my ticket."
- Purchaser-owned tickets show the account/contact holder name even when they are not first in the list.
- Recipient-owned tickets selected from verified recipients do not expose editable owner email fields.
- Manually entered non-recipient guest tickets can still show editable owner name/email fields where supported.
- Ticket owner name can be edited only when the ticket owner is not locked from a verified recipient.
- Ticket owner email can be edited only when the ticket owner is not locked from a verified recipient.
- Ticket owner phone/WhatsApp can be edited.
- Individual ticket can be marked for email delivery.
- Purchaser ticket can avoid same "you received a ticket" email behavior.
- Ticket details does not show the removed "Email all tickets to owners" bulk button.
- Ticket details does not show invitation-format upsell controls; physical invitation upsell belongs later under My Tickets/purchased tickets.
- Ticket codes remain stable after refresh once generated for a cart line/ticket index.
- If one ticket email is wrong/missing, user can return and fix/send only that ticket later.
- Required meal ticket forces meal selection.
- Optional meal ticket can skip or select.
- Meal add-on totals calculate per ticket.
- Meal pricing displays in the active account/shop currency, not hardcoded USD.
- Meal menu option prices are converted from the menu base currency before display.
- Included meal segments allow included serving counts before charging extras.
- Paid meal segments charge from the first selected serving.
- Paid meal segments have a visibly different background/shade from included segments.
- Invitation menu order is base, main, side, drink, dessert, snack, alcoholic beverage.
- Invitation dessert, snack, and alcoholic-beverage segments are paid add-ons.
- Extra food option calculates correctly.
- Meal notes save per ticket.
```

---

## 19. Shop / checkout flow

```txt
- Shop browse still loads catalog.
- Ticket store and music/merch store both write to the shared orderCart.
- Ticket store checkout button shows full shared cart total.
- Music/merch checkout button shows full shared cart total.
- Cart side panel shows full shared cart total in the selected currency.
- Product quantity updates still work.
- Product size options still work.
- Purchase mode selection still works.
- Selecting/unselecting a product checkbox updates the shared cart directly.
- Product browse flow does not require a separate Add to cart button.
- Inventory reservation is based on selected cart lines.
- Reservation countdown appears in cart/review after items are in cart.
- Reservation countdown does not cover left/right side panels.
- Expired reservation message appears after countdown reaches zero.
- Review order still shows correct selected lines.
- Delivery fee still calculates when required.
- Delivery fee displays in the selected/account currency.
- Discount definitions still apply.
- Digital/email-only orders can route without physical delivery.
- Physical orders still require delivery/pickup/contact details as configured.
- If shared cart contains ticket lines, checkout routes through ticket details before delivery/contact/review.
- Non-ticket digital cart lines create OrderFulfillmentItem records after order submission.
- Non-ticket physical cart lines create OrderFulfillmentItem records after order submission.
- Ticket-only cart lines do not create duplicate fulfillment records as digital/physical items.
- Ticket add-on cart lines preserve attendee relationship on fulfillment records when available.
```

---

## 19A. Purchase for others / verified recipients

```txt
- Account side panel includes Purchase for others.
- Purchase for others slide lets logged-in user enter recipient name and email.
- Recipient count is limited to 12 per purchaser account.
- Submitting recipient sends an acceptance email link.
- Acceptance page loads pending invite by token.
- Acceptance page prefills name from purchaser-entered name.
- Recipient can correct name before accepting.
- Recipient can accept without phone or mailing address.
- Acceptance page clearly says phone/address are optional now but required before physical products can be received.
- Accepted recipient becomes VERIFIED.
- VERIFIED recipient appears in the store purchase-for-someone select menu.
- PENDING recipient does not appear in the store purchase-for-someone select menu.
- Store hides purchase-for-someone section when purchaser has no verified recipients.
- Music/merch store hides purchase-for-someone section when entered from ticket details Choose add ons.
- Purchase-for-someone section shows "You can add up to [n] people for this item."
- Store credit note is neutral text, not red.
- Returned store credit restriction appears as a separate spaced line.
- Allocation summary says "of this item" for purchaser and recipient quantities.
- Max-order wording says "Maximum [n] of this item per order."
- Recipient quantity controls update main item quantity.
- Main item quantity cannot decrease below all recipient-reserved quantities.
```

---

## 19B. Currency, store credit, and inventory dashboard

```txt
- Account side panel shows purchased store credit balance.
- Account side panel shows returned store credit balance.
- Account currency selector updates account preferred currency.
- Guest shop currency selector updates shop/cart display currency.
- USD, JMD, and GBP are available.
- Ticket meal selection and cart meal summaries reflect the selected/account currency.
- Dashboard currency section can show/edit exchange rates.
- /dashboard is a lightweight section index and does not mount every manager at once.
- /dashboard/people loads leads/accounts only when the People page is visited.
- /dashboard/projects, /dashboard/tickets, /dashboard/inventory,
  /dashboard/currencies, and /dashboard/email-sequences load their own sections.
- Dashboard/admin side panel links use separate dashboard section pages, not
  hash anchors.
- Shop products load from DB-backed reusable inventory when available.
- Dashboard inventory section can seed/load product records.
- Dashboard tickets section can author reusable ticket products and optional paid upgrades.
- Product SKUs and variant SKUs remain visible where expected.
- Store-credit products appear in music/merch catalog.
- Digital gift card product appears in music/merch catalog.
```

---

## 19C. Orders and fulfillment dashboard

```txt
- /dashboard/orders loads only for users with adminLevel >= 1.
- /api/dashboard/orders returns 403 for non-admin users.
- Orders dashboard lists digital and physical fulfillment records.
- Orders dashboard does not list pure ticket access rows as fulfillment items.
- Search filters by order code, product title, SKU, recipient name, and recipient email.
- Fulfillment type filter can show all, digital, or physical items.
- Status filter can show PENDING, PROCESSING, READY, FULFILLED, CANCELED, and REFUNDED.
- Updating fulfillment status persists to OrderFulfillmentItem.
- Updating fulfillment notes persists to OrderFulfillmentItem.
- Updating tracking/delivery reference persists to OrderFulfillmentItem.
- Marking an item FULFILLED sets fulfilledAt.
- Moving an item away from FULFILLED clears fulfilledAt.
- Existing orders with no non-ticket digital/physical lines can leave Orders empty without an error.
- Future courier selection must load from store/destination/product rules and persist selected courier to the order.
- Future physical order views should display courier, tracking number, courier contact, shipping method, fulfillment stage, estimated delivery date, and estimated remaining time.
- Future manual fulfillment stages must use a hold-and-drag confirmation slider, record staff/timestamp/notes/files, and avoid single-click completion controls.
- Future automatic fulfillment updates from scanners, courier APIs, customs integrations, and tracking systems must record timestamp and update source.
- Future fulfillment activity history must show complete admin history and simplified customer milestone history.
- Future generated workflows must follow ORDER_FULFILLMENT_README.md and vary by product type, shipping type, destination, courier, government/customs requirements, and delivery method.
- Future customer portal fulfillment timelines must show completed, current, and upcoming steps, possession/status context, action required, and simplified milestone history.
- Future customer confirmation should allow receipt confirmation, optional received-item photos/comments, issue reporting, and configured reward handling.
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
- All email-channel website operation sends use sendEmailMessage.
- Auth verification, password reset, ticket owner access, album access, and purchase-recipient invite emails use shared sender path.
- Email-channel wording comes from protected website-operation Email Sequence records when available.
- If a protected website-operation saved subject/body is blank, sender falls back to websiteOperationEmailTemplates.js defaults.
- Email-channel website operations do not fall back to old verificationContent email copy.
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

```sql
SELECT
  "id",
  "email",
  "name",
  "createdBy",
  "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 20;
```

```sql
SELECT
  "id",
  "userId",
  "itemKey",
  "sourceType",
  "sourceId",
  "createdAt"
FROM "UserPurchasedItem"
ORDER BY "createdAt" DESC
LIMIT 20;
```

```sql
SELECT
  "userId",
  "tagKey",
  "source",
  "createdAt"
FROM "UserTag"
ORDER BY "createdAt" DESC
LIMIT 20;
```

```sql
SELECT
  "sequenceKey",
  "name",
  "triggerEvent",
  "metadata",
  "updatedAt"
FROM "EmailSequence"
WHERE "metadata" ->> 'systemTag' = 'Permanent Website Op'
ORDER BY "sequenceKey";
```

```sql
SELECT
  "id",
  "orderCode",
  "productTitle",
  "sku",
  "fulfillmentType",
  "quantity",
  "currencyCode",
  "lineTotal",
  "recipientName",
  "recipientEmail",
  "ticketAttendeeName",
  "fulfillmentStatus",
  "trackingReference",
  "fulfilledAt",
  "createdAt"
FROM "OrderFulfillmentItem"
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## 25. Admin dashboard

```txt
- /dashboard redirects non-logged-in users to /login.
- /dashboard is accessible to logged-in users with adminLevel >= 1.
- /dashboard is not accessible to logged-in users with adminLevel 0.
- /api/dashboard/projects returns 403 for non-admin users.
- /api/dashboard/orders returns 403 for non-admin users.
- /api/dashboard/inventory returns 403 for non-admin users.
- /api/dashboard/currencies returns 403 for non-admin users.
- /api/dashboard/email-sequences returns 403 for non-admin users.
- Admin dashboard header shows the active admin level.
- Project name updates slug safely.
- Theme preset selector updates generated registry snippet.
- Adding each supported slide type creates a slide in the slide list.
- Selecting a slide exposes fields relevant to that slide type.
- Generated DSL updates after editing slide fields.
- Media / Video - Music exposes lyrics / annotated text panel option.
- Enabling lyrics / annotated text panel emits @textpanel, @textsource, @textmode, and textpanel footer action.
- Song mode audio URL emits @textpanelsongmedia when provided.
- Lines mode audio URL emits @textpanellinesmedia when provided.
- Save DSL File creates a new src/config/questionnaires/*Dsl.txt file for a new slug.
- Save DSL File refuses to overwrite an existing DSL file.
- Saved DSL parses through the existing parser.
- Registry snippet is generated but registry.ts is not edited automatically.
- Email Sequences section loads protected Permanent Website Op records.
- Orders dashboard loads fulfillment records without mounting on the dashboard index.
- Orders dashboard can update fulfillment status, notes, and tracking reference.
- EMAIL_SEQUENCES_README.md documents developer and admin usage.
- Protected website operation records show a Permanent Website Op badge.
- Protected website operation records can be edited and saved.
- No delete UI/endpoint is exposed for protected website operation records.
- Send due emails button still runs due sequence jobs for admin users.
```

---

## 26. Reusable sidebars, footer controls, and text panel shell

```txt
- Left sidebar toggle appears when media/video slides or album downloads exist.
- Left sidebar lists video/media slide URLs.
- Left sidebar includes full-album WAV/MP3 download actions when album download requests exist.
- Right sidebar toggle appears with account links.
- Sidebars sit above footer and action bar z-index.
- Sidebars take full viewport height on desktop.
- Sidebar toggle icons remain clickable when sidebars are open.
- Media/video top edge touches the viewport top behind fixed toggles.
- Footer/action bar width respects desktop sidebar gutters.
- Footer content label displays @footercontentlabel text.
- If no textpanel footer action exists, content label does not open a panel.
- If textpanel footer action exists, clicking content label expands/retracts footer panel.
- Footer panel is scrollable with mouse wheel, scrollbar drag, trackpad, and touch.
- Sticky headings stay under footer controls and are pushed away by the next heading.
- `@footertransparentuntilexpanded: true` makes the collapsed footer transparent
  and restores panel background when expanded.
- Footer previous/next transport actions show as disabled when their target
  slide is unavailable or drip-locked.
- Video footer-edge progress bars are thin, have no visible knob, and remain
  draggable/clickable.
- Vertical video footer-edge progress spans the video frame width instead of the
  full footer width.
```

---

## 27. Escape album purchase access and protected downloads

```txt
- /questionnaire/escape-album starts at purchased-access/login slide for users without entitlement.
- Login slide has actual email/identifier and password fields.
- Successful login updates session state and continues to album content.
- User without escape-album purchased item remains gated.
- User with escape-album purchased item reaches Good Morning video.
- Invitation ticket shop remains ticket-focused.
- Album can be added as a ticket purchase option without creating ticket owner or meal work for the album line.
- Album order creates or reuses a user by entered email.
- New algorithm-created account stores User.createdBy = algorithm.
- Algorithm-created account email includes album URL and generated password.
- Existing-account purchase does not send a password and prompts login instead.
- Purchased album grants UserPurchasedItem itemKey escape-album.
- Protected Escape video, lyrics, song, and full-album download keys require session + entitlement.
- Unauthorized protected download requests do not reveal private file paths or all download keys.
- Download format slide can download current song MP3/WAV.
- Sidebar full-album downloads can download album MP3/WAV.
```

---

## 28. Timed lyrics / annotated text modes

```txt
- Timed lyric lines parse [00:01.251 --> 00:04.192] prefixes.
- Timed prefixes are not displayed as lyric text.
- Clicking footer content label opens lyrics/text panel.
- Footer mode toggle appears beside WAV/MP3 when a textpanel action exists.
- Mode toggle cycles Lines, Song, Learn, Shop.
- Lines mode: clicking a timed line seeks to the start and pauses at the end timestamp.
- Song mode: clicking a timed line seeks to the start and continues playback.
- Lines mode uses @textpanellinesmedia when configured.
- Lines mode falls back to @textpanelsongmedia when lines media is absent.
- Song mode uses @textpanelsongmedia when configured.
- Modes fall back to current video/mp4 when no alternate audio is configured.
- Learn mode shows definition/language/culture annotations and hides product annotations.
- Shop mode shows product annotations.
- Annotation popovers still work inside timed lyric lines.
- Good Morning timed lyrics still preserve ohayo/bonjour/product/video annotations.
```

---

## 29. Timed text sync authoring

```txt
- Adding syncText=1 to the questionnaire URL shows the sync authoring controls.
- Sync controls are hidden without syncText=1.
- Spacebar starts recording the current lyric line.
- Spacebar again stops that same lyric line and records the end timestamp.
- Recording does not assume the next line start from the previous line end.
- After stopping a line, the sync cursor advances to the next lyric line.
- Current sync line is highlighted.
- Current sync line scrolls into view while syncing.
- Reset clears recorded timings and returns to line 1.
- Generated timestamped textarea preserves headings and lyric line text.
- Generated timestamps use mm:ss.mmm format.
- Before production/admin release, sync save route must be restricted to main admin.
```

---

## 30. Custom lyric phrase to merch starter

```txt
- Shop mode allows selecting lyric text in the panel.
- Selecting text in non-Shop modes does not show the custom merch action.
- Selected lyric text is trimmed and normalized.
- Custom merch action appears after text selection in Shop mode.
- Clicking custom merch action stores customLyricMerchPhrase.
- Clicking custom merch action stores customLyricMerchTrack.
- Clicking custom merch action sets customLyricMerchSignature.
- Footer panel closes after starting custom merch flow.
- User is routed to custom-lyric-merch slide.
- Custom Lyric Merch slide displays the selected phrase via [customLyricMerchPhrase].
- Custom Lyric Merch slide shows first item type options.
- Future cart/order metadata must preserve phrase, source track, item choice, and signature setting.
```

---

## 31. Final smoke test before commit

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
- Reset dev progress resets visitor to fresh state.
- Reset dev progress clears stale URL slide params and returns invitation to the
  first video.
- /dashboard requires admin level 1.
- Dashboard can generate DSL for a media/video slide with text panel enabled.
- Dashboard Email Sequences shows Permanent Website Op templates.
- Dashboard Orders shows digital/physical fulfillment items or a clean empty
  state when no fulfillment items exist.
- Website operation email defaults are available if edited subject/body is blank.
- Escape album gate blocks users without purchased item.
- Escape album opens for users with purchased item.
- Good Morning lyrics panel opens from footer content label.
- Lines and Song modes play timed lyrics.
- Learn and Shop modes change annotation behavior.
- Shop mode selected phrase routes to custom-lyric-merch.
```
