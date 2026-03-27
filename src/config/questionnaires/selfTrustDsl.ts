export const selfTrustDsl = `
// INTRO QUESTION
===
@id: intro-question
@type: choice
---
BR
## [c2] Do you 
# [c3] Trust yourself?
BR
[c2] Not only when 
## life is going smoothly.
[c3] Not just when someone reassures you.
BR
[c2] but
# [c2] Truly?
BR
[c2] In your decisions.
## [c3] In your direction.
[c2] In the way you move through life?
BR
@store: trustLevel
@choices:
- completely|Yes, I trust myself completely|share-your-wisdom
- somewhat|I trust myself somewhat|self-trust-score
- no|No, I don't trust myself at all|self-trust-score
@back: Back
@next: Continue Reading

// SHARE YOUR WISDOM
===
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
@back: Back
@next: Continue
@goto: self-trust-score

// SELF TRUST SCORE
===
@id: self-trust-score
@type: score

# How much 
# [c2] would you say
# you trust yourself?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
[c2] on a scale of 1 to 10?
## [c3] 1 being NO Trust at all.
&
## [c3] 10 being COMPLETE TRUST.
@store: selfScore
@back: Back
@next: Continue
@goto: future-trust-score

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
@goto: results-self-trust

// RESULTS SELF TRUST
===
@id: results-self-trust
@type: content
---
BR
# [c3] [statsCount] 
# [c3] people
[c2] who took the time
[c2] to answer these questions
---
BR
## [c3] also chose
# [c3] [selfScore]
[c2] for
# [c2] Self-Trust
@back: Back
@next: Continue
@goto: results-future-trust

// RESULTS FUTURE TRUST
===
@id: results-future-trust
@type: content
BR
# [c3] [statsCount2]
## [c3] of those people
# [c2] also chose
# [c2] [futureScore]
BR
[c3] in
## [c3] trusting the 
# [c3] Future

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
## a lot of
# honest, 
# [c2] thoughtful
# persons
BR
## land in the same place...
BR
BR
[c3] but why though?
@back: Back
@next: Continue
@goto: self-trust-changes-everything

// SELF TRUST CHANGES EVERYTHING
===
@id: self-trust-changes-everything
@type: content
---
BR
# [c2] Self-trust 
# [c3] changes everything.
---
BR
## It affects how you handle pressure,
[c2] how you respond to uncertainty,
BR
## [c3] how you care for your body,
[c2] how you show up in business,
## [c2] in love,
## [c3] and in everyday life.
@back: False
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
@backgoto: same-place-message
@next: Yes, I Agree
@goto: aligned-people-message

// ALIGNED PEOPLE MESSAGE
===
@id: aligned-people-message
@type: content
## And yet,
BR
# Many People 
## who now seem
BR
# Confident 
# [c2] Grounded,
## and fully
# [c3] Aligned
BR
## [c3] did not begin there...
@back: Back
@next: Continue Reading...
@goto: once-stuck-message

// ONCE STUCK MESSAGE
===
@id: once-stuck-message
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
@next: Continue
@goto: pulled-back-question

// PULLED BACK QUESTION
===
@id: pulled-back-question
@type: content
---
BR
## Have you ever
# [c2] sensed 
## [c2] that 
# [c2] something 
# keeps Pulling 
## [c3] you back
## [c2] from the 
# life you want 
# [c2] to create?
@back: No, I Have Never Felt That Way
@backgoto: you-are-free
@next: Yes, I can relate
@goto: freedom-score
===

// YOU ARE FREE
@id: you-are-free
@type: content
---
BR
# would you 
## like to 
# help others
# experience 
## the freedom
you feel?
@back: No, I don't
@backgoto: freedom-score
@next: Yes, I would love to
@goto: freedom-score

// FREEDOM SCORE
===
@id: freedom-score
@type: score
---
BR
## How 
# Free
BR
## do you feel?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10) 
BR
## 1 means NOT free at all.
&
## 10 means you are ABSOLUTELY free.
@store: freedomScore
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
BR
## would you say
## [c3] you are at?
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10) 
BR
## 1 Being NOT stuck at all
## 10 Being EXTREMELY stuck

@store: stuckScore
@back: Back
@next: Continue
@goto: inner-shift-message

// INNER SHIFT MESSAGE
===
@id: inner-shift-message
@type: content
---
BR
# [c2] Many 
# [c3] who we admire
# [c2] have been there.
BR
[c2] then 
## [c3] something changed.
BR
## [c2] They made an inner shift.
To become the 
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
# [c2] The Shift 
# Is possible!
---
## The process can be learned.
BR
[c3] And
## [c3] with the right support,
BR
# [c2] It can be embodied.

@back: Watch the video
@backgoto: https://www.instagram.com/reel/DVwZ7xGDcEZ/?igsh=d2J6c3F0aTRtOXUw
@next: Or continue reading...
@goto: coach-message
===

// COACH MESSAGE
@id: coach-message
@type: video
What my clients often gain is something deeper:
a new relationship with themselves.
BR
although they begin these sessions, only for relief
from anxiety, overwhelm, or inner conflict...
---
BR
## [c3] I help people uncover and shift the subconscious patterns
## [c3] influencing how they think, feel, react, and choose-
BR
[c2] so they can experience greater emotional safety,
[c2] deeper self-trust, & a more grounded,
[c2] intentional way of being.
BR
## [c3] I do this through hypnotherapy and life coaching.
BR
clients become more emotionally regulated.
More able to set boundaries without guilt.
More able to take action 
without constantly second-guessing themselves.
BR
## [c3] This is not about becoming someone else.
[c2] it's about releasing the patterns that have kept you
[c2] disconnected from who you really are.
BR
BR
- Stacy Henry-Carr, Hypnotherapist & Life Coach.
@back: Back
@next: See how it works
@goto:
===

// CONTACT FORM
@id: contact-form
@type: form
# Stay connected
## Where should we send your next step?
Share your details and we’ll send guidance and updates.
@fields:
- fullName|text|Full name|required|Full name
- email|email|Email address|required|Email address
- phone|tel|Phone number|optional|Phone number
- whatsappOptIn|checkbox|I'm okay with being contacted on WhatsApp|optional
@run: submitLead
@back: Back
@next: Continue
`;