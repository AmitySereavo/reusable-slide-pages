export const selfTrustDsl = `
===
@id: slide1
@type: score
#[c3] Do you trust yourself?
BR
##[c2]There is no perfect answer.
Choose the number that feels 
most honest right now.
BR
@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
##1 being the lowest. 
##10 being the highest.
@store: selfScore
@back: Back
@next: Continue
@goto: slide2

===
@id: slide2
@type: score
##And how much 
#do you trust the future?
BR
## Try not to overthink it.

@feature: numberscale(1,2,3,4,5,6,[7],8,9,10)
BR
BR
Pick the number-level 
that feels true right now.
@store: futureScore
@back: Back
@next: Continue
@goto: slide3

===
@id: slide3
@type: content
BR
# [c1] [statsCount] people
## [c2] who took the time
## [c2] to respond here,
BR
## [c3] also
# chose
# [c1] [selfScore]
# for self-trust
@back: Back
@next: Continue
@goto: slide4

===
@id: slide4
@type: content
BR
# [c3] [statsCount2]
# of those people
BR
## also
# chose
# [c3] [futureScore]
BR
# for trust
# in the future
@back: Back
@next: Continue
@goto: slide5

===
@id: slide5
@type: content
BR
##A lot of 
#honest, thoughtful 
#people
BR
##land in the same place.
BR
But why?
@back: Back
@next: Continue
@goto: slide6

===
@id: slide6
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