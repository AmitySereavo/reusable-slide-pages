export const selfTrustDsl = `
// INTRO QUESTION
===
@id: intro-question
@type: content
---
BR
[c2] Do you
# [c2] Trust yourself?
BR
[c3] Not only when
[c3] life is going smoothly.
[c2] Not just when someone reassures you.
BR
[c3] but
# [c3] Truly?
BR
[c2] In your decisions.
## [c2] In your direction.
[c3] In the way you move through life?
BR
@next: Give your answer
@goto:
@showback: false

===
// SELF TRUST SCORE
@id: self-trust-score
@type: score

# How much
# [c2] would you say
# you trust yourself?
[c2] On a scale of 1 to 10
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR

[c2] 1 being NO TRUST at all.
[c2] 10 being COMPLETE TRUST.
@store: selfScore
@back: Back
@next: Continue
@goto:

// FUTURE TRUST SCORE
===
@id: future-trust-score
@type: score
[c2] and
# [c2] How much
## [c3] would you say you
# Trust the future?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
@store: futureScore
@back: Back
@next: Continue
@goto:

// RESULTS SELF TRUST
===
@id: results-self-trust
@type: content
---
BR
# [c2] [statsCount]
# [c2] people
[c2] who took the time
[c2] to answer these questions
---
BR
## [c3] also chose
# [c3] [selfScore]
[c2] for
# [c3] Self-Trust
@back: Back
@next: Continue
@goto:

// RESULTS FUTURE TRUST
===
@id: results-future-trust
@type: content
BR
# [c2] [statsCount2]
## [c2] of those people
# [c3] also chose
# [c3] [futureScore]
BR
[c2] in
## [c2] trusting the
# [c2] Future

@back: Back
@next: Continue
@goto: same-place-message

@when:
- selfScore|in|1,2,3|same-place-message
- selfScore|in|4,5,6|same-place-message
- selfScore|in|7,8,9|self-trust-changes-everything
- selfScore|eq|10|self-trust-changes-everything

// SAME PLACE MESSAGE
===
@id: same-place-message
@type: content
---
BR
## A lot of
# Honest,
# [c2] Thoughtful
# persons
BR
## land in the same place...
BR
BR
[c3] But why though?
@back: Back
@next: Why?
@goto:

// SELF TRUST CHANGES EVERYTHING
===
@id: self-trust-changes-everything
@type: content
---
BR
[c2] is it true that
# [c2] Self-trust
# [c3] changes everything?
---
BR
[c2] It affects how you handle pressure,
## [c2] how you respond to uncertainty,
BR
## [c3] how you care for your body,
[c2] how you show up in business,
## [c2] in love,
## [c3] and in everyday life?
@showback: false
@next: True
@goto: self-trust-force-question

// SELF TRUST FORCE QUESTION
===
@id: self-trust-force-question
@type: content
---
BR
# [c2] Would
# [c2] you agree
# [c2] that
# [c3] Self-Trust
## is a
# Powerful
# Force?

@back: No, I don't
@backgoto: dont-value-self-trust
@next: Yes, I Agree
@goto:

// ALIGNED PEOPLE MESSAGE
===
@id: aligned-people-message
@type: content
## Yes, and
BR
# Many People
## who are now
BR
# Confident
# [c2] Grounded,
## and fully
# [c3] Aligned
BR
## [c3] did not begin there...
@back: Back
@next: Continue Reading...
@goto: were-once-stuck-message

// WHERE ONCE STUCK MESSAGE
===
@id: were-once-stuck-message
@type: content
---
BR
# Many of them
# [c2] were once
BR
## [c3] anxious,
## [c1] uncertain,
## [c2] emotionally overwhelmed,
BR
# STUCK...
@back: Back
@next: Tell me more...
@goto:

// PULLED BACK QUESTION
===
@id: pulled-back-question
@type: content
---
## Have you ever
# [c2] sensed
## [c2] that
# [c2] something
# Keeps Pulling
## [c3] you back
## [c2] from the
# life you want
# [c2] to create?
BR
@store: feltHeldBack
@choices:
- Can relate | Yes, I can relate | stuck-score
- No, can't relate | No, I Have Never Felt That Way | help-others-with-freedom

@back: Back
@shownext: false

// FREEDOM SCORE
===
@id: freedom-score
@type: score
---
BR
# How Free
## do
# you feel?
## Right now?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
[c2] 1 means NOT free at all.
[c2] 10 means you are ABSOLUTELY free.
@store: freedomScore
@when:
- freedomScore|in|1,2,3,4,5,6,7|stuck-score
- freedomScore|in|8,9,10|many-have-been-there
@back: Back
@next: Continue
@goto:

// STUCK SCORE
===
@id: stuck-score
@type: score

---
BR
## What level of
# Stuck
## would you say
## [c3] you are at?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
[c2] 1 Being NOT stuck at all
[c2] 10 Being EXTREMELY stuck

@store: stuckScore
@when:
- stuckScore|in|1,2,3|freedom-score
- stuckScore|in|4,5,6,7,8,9,10|many-have-been-there
@back: Back
@next: Continue
@goto:

// MANY HAVE BEEN THERE
===
@id: many-have-been-there
@type: content
---
BR
# [c2] Many people
# [c3] who we admire
# [c2] have been there.
BR
## [c2] They have felt stuck,
## [c3] overwhelmed,
## [c3] and held back.
BR
[c2] But...
@back: Back
@next: Then what?
@goto: something-changed

// SOMETHING CHANGED
===
@id: something-changed
@type: content
---
BR
[c2] then
# [c3] something
# [c3] changed.
BR
## [c2] They made an inner shift.
BR
[c2] To become the
## [c3] structured people
[c2] we know them to be
@back: Back
@next: Continue Reading...
@goto: shift-process-question

// SHIFT PROCESS QUESTION
===
@id: shift-process-question
@type: content
---
BR
[c2] But, what was the
# [c2] process
## that allowed
# [c3] That Shift
## [c2] to happen?
---
[c3] And is this Kind of
# [c3] Transformation
[c2] only for a
## [c2] certain kind
## of people?
@back: Back
@next: Learn More
@goto: transformation-truth

// TRANSFORMATION TRUTH
===
@id: transformation-truth
@type: content
---
BR
# Truth is,
## those who experienced
[c2] the most
# [c2] Powerful Transformations
---
were the
# furthest away
## from who they
## [c3] wanted to become.
@back: Back
@next: The shift is possible!
@goto: shift-is-possible

// SHIFT IS POSSIBLE
===
@id: shift-is-possible
@type: content
---
BR
## [c2] Yes,
# [c2] The Shift
# Is possible!
---
## The process can be learned.
BR
[c3] And
## [c3] with the right support,
BR
# [c2] It can be embodied.
---
@choices:
- Watch the video | Watch the video | https://www.instagram.com/reel/DVwZ7xGDcEZ/
- continue reading | Or Continue reading... | coach-message
@showback: false
@shownext: false
@goto:

// COACH MESSAGE
===
@id: coach-message
@type: video
## [c3] What my clients often gain is something deeper:
a new relationship with themselves,
BR
although they begin these sessions, only for relief
from anxiety, overwhelm, or inner conflict...
---
BR
## [c2] I help people uncover and shift the subconscious patterns
## [c2] influencing how they think, feel, react, and choose-
BR
[c2] so they can experience greater emotional safety,
[c2] deeper self-trust, & a more grounded,
[c2] intentional way of being.
BR
---
## [c3] I do this through hypnotherapy and life coaching.
BR
clients become more emotionally regulated.
More able to set boundaries without guilt.
More able to take action
without constantly second-guessing themselves.
BR
---
## [c3] This is not about becoming someone else.
[c2] it's about releasing the patterns that have kept you
[c2] disconnected from who you really are.
BR
BR
- Stacy Henry-Carr, Hypnotherapist & Life Coach.
@back: Back
@next: See how it works
@goto:

// PRE CONTACT FORM
===
@id: pre-contact-form
@type: form
---
BR
[c2] a client has permitted us
## [c3] to send you their
# Recording
## [c2] of an
# [c3] Actual Session.
BR
[c2] so that
[c2] you can observe what it's like
BR

[c3] to work with
## [c3] Stacy Henry-Carr

@next: Send me the recording
@back: Back
@goto: contact-form

===
// CONTACT FORM
@id: contact-form
@type: form
---
[c3] You will also receive a PDF
[c3] containing
## [c3] 2 perspectives you can use right now
[c3] to

BR

## [c2] 2X and maintain
## [c2] your self-trust.
BR

[c3] Be Bold
# [c3] Introduce Yourself
[c2] &
[c3] let us know how to reach you.
BR
@fields:
- fullName|text|Full name|required|Full name
- email|email|Email address|required|Email address
- phone|tel|Phone number|optional|Phone number
- whatsappOptIn|checkbox|I'm okay with being contacted on WhatsApp|optional
---
@run: submitLead
@back: Back
@next: Send the items
@goto: confirmation-page

===
// CONFIRMATION PAGE
@id: confirmation-page
@type: content
---
BR
## [c3] Check your email
[c2] for
BR
## [c3] Stacy-Henry-Carr's
# [c3] Client Session
## [c3] Recording
BR
[c2] and the link to her
# [c2] 2X Self Trust
## [c2] PDF

@showback: false
@shownext: false

// UNINTERESTED EXIT
===
@id: uninterested-exit
@type: content
---
BR
## [c3] Find the path
## [c3] that suits you

@showback: false
@shownext: false

// SHARE YOUR WISDOM
===
@showif:
- selfScore|in|9,10
@id: share-your-wisdom
@type: content
---
BR
# Awesome.
BR
## Would you mind sharing
## what you know?
BR
## To help others reach
## your level of self-trust?
@choices:
- Sure | Sure | self-trust-score
- No, I don't | No, I don't | uninterested-exit
@back: Back
@next: Continue
@goto: self-trust-score

// DON'T VALUE SELF TRUST
===
@id: dont-value-self-trust
@type: content
---
BR
If you don't value self-trust,
then these pages
are not for you.
@back: Back
@next: Exit
@goto: uninterested-exit

// HELP OTHERS WITH FREEDOM
===
@id: help-others-with-freedom
@type: content
---
BR
# would you
## like to
# help others
# experience
## the freedom
you feel?
BR
Maybe you have a friend who could use some support?
Maybe this is something
that will keep you in alignment
with your current position?
BR
do you wish to continue?

@choices:
- No | No, I don't | uninterested-exit

@back: Back
@next: Yes, I would love to
@goto: freedom-score
`;