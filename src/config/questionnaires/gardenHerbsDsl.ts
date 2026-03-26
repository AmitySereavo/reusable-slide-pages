export const gardenHerbsDsl = `
===
@id: slide1
@type: score
# Do you cook with herbs,
# spices or seasonings
# from your own garden?
BR
## Choose the number that feels most true.
@feature: numberscale(1,2,3,4,5,6,7,8,9,10)
BR
## 1 means hardly ever.
## 10 means very often.
@store: gardenCookingScore
@back: Back
@next: Continue
@goto: slide2

===
@id: slide2
@type: score
# Would you say
# what's grown at home
# is more flavourful
# than store bought?
BR
## Pick the number that feels most honest.
@feature: numberscale(1,2,3,4,5,6,7,8,9,10)
BR
## 1 means not really.
## 10 means definitely.
@store: flavourScore
@back: Back
@next: Continue
@goto: slide3

===
@id: slide3
@type: score
# How many times per month
# do you reap ingredients
# from your garden?
BR
## More than:
@feature: numberscale(1,2,3,4,5,6,7,8,9,10)
BR
## Choose the number that is closest.
@store: harvestFrequency
@back: Back
@next: Continue
@goto: slide4

===
@id: slide4
@type: form
# Do you own any plants
# on this list?
BR
## Select as many as you own.
@fields:
- ownPlant1|checkbox|[plant1]|optional
- ownPlant2|checkbox|[plant2]|optional
- ownPlant3|checkbox|[plant3]|optional
- ownPlant4|checkbox|[plant4]|optional
- ownPlant5|checkbox|[plant5]|optional
@back: Back
@next: Continue
@goto: slide5

===
@id: slide5
@type: content
# [plant1] is good for...
# [plant2] is good for...
BR
## Great choices.
@back: Back
@next: Continue
@goto: slide6

===
@id: slide6
@type: content
# But with those selections,
# you haven't selected [plant3]
BR
## [plant3] is good for...
## and it's a good companion
## for [plant1].
@back: Back
@next: Continue
@goto: slide7

===
@id: slide7
@type: form
# Do you currently have [plant3]?
@fields:
- hasPlant3|checkbox|Yes, I currently have [plant3]|optional
@back: Back
@next: Continue
@goto: slide8

===
@id: slide8
@type: form
# If not,
# is [plant3] something
# you'd like to have,
# to enhance your garden
# and dinners?
@fields:
- wantsPlant3|checkbox|Yes, I'd like to have [plant3]|optional
@back: Back
@next: Continue
@goto: slide9

===
@id: slide9
@type: form
# First, get the care guide
# for [plant3]
BR
## to know how ready you are
## to nurture such a plant.
BR
## Should it be sent to your email
## or to your WhatsApp?
@fields:
- sendByEmail|checkbox|Send it to my email|optional
- sendByWhatsapp|checkbox|Send it to my WhatsApp|optional
- fullName|text|Full name|required|Full name
- email|email|Email address|optional|Email address
- phone|tel|WhatsApp number|optional|WhatsApp number
@back: Back
@next: Continue
@goto: slide10

===
@id: slide10
@type: content
# [plant3] sells for
# $700 to $1500
# at popular plant
# and garden stores.
BR
## ParaLife Trees'
## most recent price
## is $850.
@back: Back
@next: Continue
@goto: slide11

===
@id: slide11
@type: form
# Would you like it
# right now for $500?
@fields:
- buyPlant3Now|checkbox|Yes, I want [plant3] for $500|optional
@run: submitLead
@back: Back
@next: Continue
`;