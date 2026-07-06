# Email Sequences

Email Sequences is the reusable system for scheduled marketing/nurture emails
and protected website-operation emails.

## Developer Notes

Core files:

- `src/lib/verification/emailSequences.js`
- `src/lib/verification/emailMessage.js`
- `src/lib/verification/websiteOperationEmailTemplates.js`
- `src/app/api/dashboard/email-sequences/route.ts`
- `src/app/dashboard/EmailSequenceManager.jsx`
- `prisma/schema.prisma`

Core models:

- `EmailSequence`
- `EmailSequenceStep`
- `EmailSequenceStepCondition`
- `EmailSequenceEnrollment`
- `EmailSequenceJob`
- `EmailSequenceEvent`
- `UserTag`

Sequence triggers currently include signup, tag-added/manual tag, and website
operation keys. Tag-based sequences can be targeted with `has_tag` conditions.
Signup slides can set tags through DSL directives such as:

```txt
@signuptags: itasl-lead
@signupsource: invitation
```

For email-verified nurture flows, signup should create the tag, while email
verification starts tag-triggered sequence enrollment. This keeps protected or
lead-nurture emails from going out before the email address is verified.

The ITASL lead nurture sequence uses:

```txt
sequenceKey: itasl-lead-nurture
metadata.dripSequenceKey: itasl
triggerEvent: tag_added
tag condition: itasl-lead
```

Each sent drip email can unlock a slide before or while sending. Engagement
events such as enrolled, sent, opened, clicked, slide unlocked, and slide opened
are stored in `EmailSequenceEvent` where available.

Sequence slide links include `sequenceJobId`, `unlockKey`, and
`dripSequenceKey`. For lead-nurture content such as ITASL, the link can create
a normal session for the job's attached temporary/lead user without requiring
the recipient to enter a password first. This lets activity collect under the
same email-backed account while the UI can continue prompting the lead to set
their own memorable password later.

The first device that opens a private sequence job link is recorded as an
authorized device for that specific email job. Later opens from a different
device are paused and recorded as `sequence_link_device_blocked`, with
available device, IP hash, user-agent, language/platform, and location headers
stored in event metadata. The visitor can verify the new device by receiving a
fresh link at the original recipient email address, or sign up as a lead with
their own email address.

The in-memory due-job timer is useful in local/dev mode, but production should
use a persistent scheduler or cron worker that calls the due email job runner.
The dashboard "Send due emails" action should remain available as a manual
backup.

## Website Operation Emails

Protected website-operation emails are system-critical messages, not ordinary
marketing campaigns. They include examples such as:

- auth/account verification
- password reset
- account email update
- account deletion
- purchase-recipient invitation
- ticket owner access
- Escape album access
- gated/private video access
- lead confirmation

These records are tagged with `Permanent Website Op`. They should be editable
from the dashboard but not deletable through normal admin UI.

If an admin leaves a protected operation email subject or body blank, the sender
must fall back to defaults in:

```txt
src/lib/verification/websiteOperationEmailTemplates.js
```

Do not add new hardcoded email-channel wording to older verification-content
config. Email-channel wording should flow through the saved operation email
record or the protected default fallback.

## Admin Guide

Open:

```txt
/dashboard/email-sequences
```

Admins can:

- create or edit email sequences.
- set trigger events.
- add subject, preview, body, CTA label, and CTA URL.
- configure timing such as immediate, delay, or scheduled time.
- set local/user timezone behavior where supported.
- add conditions such as tag targeting, previous email activity, or clicked
  link behavior.
- inspect saved sequences and send due emails manually.

For lead nurturing:

1. Create or use a signup slide with the correct tag.
2. Verify the email address.
3. Confirm the user appears in People with the tag.
4. Confirm the sequence enrollment/job is created.
5. Use the due-email runner or scheduled worker to send the pending email.
6. Confirm the slide link opens the correct content.

For protected website operation messages:

1. Find records tagged `Permanent Website Op`.
2. Edit wording as needed.
3. Leave subject/body populated for custom wording.
4. Leave subject/body blank only if the protected default fallback should be
   used.

## Regression Checks

- New signup through invitation receives the `itasl-lead` tag.
- ITASL sequence enrollment happens after email verification, not before.
- The first ITASL email is scheduled after verification according to its step
  timing.
- Admin can manually send due emails from the dashboard.
- Protected website-operation emails cannot be deleted from the dashboard.
- Blank protected operation subject/body falls back to default template text.
- Open/click/slide events are visible in the People dashboard where recorded.
