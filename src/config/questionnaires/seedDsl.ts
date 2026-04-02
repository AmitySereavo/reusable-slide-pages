export const seedDsl = `
===
// INTRO
@id: intro
@type: content

@pagebgcolor: #ffffff
@pagebgimage: /media/background/young-plant.jpg
@pagebgsize: contain
@pagebgposition: bottom center
@cardopacity: 0.80
---
BR
## [c2] A
# [c1] Seed
BR
## [c2] has been 
# [c3] Planted
# [c2] For You!
[c1] but
[c1] it has not been 
## [c1] watered yet.
---
@choices:
- reveal-seed|What type did I get?|seed-reveal|c1
@showback: false
@shownext: false

===
// SEED REVEAL
@id: seed-reveal
@type: content

[c2] It's a
# [c1] Spinach 
## seed.
BR
## [c4] 3 spinach plants
## [c4] in your garden

BR

[c3] can keep fresh greens 
[c3] on the table, weekly,
[c3] for a family of 3.

---
@choices:
- tell-me-more|Tell me more|plant-info|c1
- skip-the-info|I know enough|will-it-grow|c3
@showback: false
@shownext: false

===
// PLANT INFO
@id: plant-info
@type: content
---
BR
# [c1] 3 Spinach 
# [c1] Planted
[c1] in your garden
---
[c3] would save you
# [c4] $4000 
## [c4] per month
---
[c3] if the same amount harvested,
[c3] were to be bought
[c3] at the supermarket.
BR
---
@choices:
- tell-me-more|Seems Healthy!|will-it-grow|c1
@back: Back
@shownext: false

===
// WILL IT GROW
@id: will-it-grow
@type: content
---
BR
[c1] A spinach seed
[c1] has been planted for you.
BR
## [c1] but
---
# Not All
# Seeds Grow
---
@back: Back
@next: Will Mine Grow?

===
// WEEKLY UPDATES INTRO
@id: updates-intro
@type: content
BR
[c1] once-a-week
 ## [c1] you'll receive 
---

#Photo & Video
#Updates
---
[c1] of the

## [c1] real-life growth

BR
## [c2] up until the day you collect
## [c2] your plant.
BR
[c1] That way, you can see the actual progress.


---
@back: Back
@next: OK

===
// CARE TIPS 
@id: care-tips
@type: content
---
## you'll also get
# [c1] Plant Care 
## [c1] tips & guidance
BR
[c2] to 
## ensure you are 
# [c1] prepared
## to grow your plant
[c1] to the
## [c1] next level,
[c1] when you receive it.

---
@choices:
- sounds-good|Sounds good|pickup-location|c4
@back: Back
@shownext: false

===
// PICKUP LOCATION
@id: pickup-location
@type: form
---
BR
# [c1] Collect
# [c1] your plant
[c3] at one of our
# Pop-up shops
## or 
# [c3] Pickup locations.
BR
## [c1] What location would
## [c1] work best for you?
BR
@fields:
- pickupSovereignLiguanea|checkbox|Sovereign Centre Liguanea|optional
- pickupSovereignPortmore|checkbox|Sovereign Centre Portmore|optional
- pickupDevonHouse|checkbox|Devon House|optional
- wantDelivery|checkbox|Get it delivered|optional
---

[c3] P.S. If you have already
[c3] claimed a plant through this portal,
[c3] you might not be able to claim another.
---
@back: Back
@next: Continue
@goto: switch-offer

===
// SWITCH OFFER
@id: switch-offer
@type: content


[c2] Before you enter your contact details,
 BR
## you now have the
## [c1] opportunity
to
# [c1] Switch
[c2] your
# [c1] Spinach seed
## for another type of
## plant seed.
BR
## [c1] Do you want to switch?
[c2] (This is your one and only chance).
---
@choices:
- change-plant|Change plant|switch-seed-form|c2
- keep-my-plant|Keep my plant|contact-details|primary
@back: Back
@shownext: false

===
// SWITCH SEED FORM
@id: switch-seed-form
@type: form
---
BR
# Choose the seed
# you would rather get.
BR
## Select the one
## you want us
## to grow for you.
BR
@fields:
- switchToCallaloo|checkbox|Callaloo seed|optional
- switchToLettuce|checkbox|Lettuce seed|optional
- switchToTomato|checkbox|Tomato seed|optional
- switchToPepper|checkbox|Sweet pepper seed|optional
- keepSpinachAfterAll|checkbox|No, keep my spinach seed|optional
---
@back: Back
@next: Continue
@goto: contact-details

===
// CONTACT DETAILS
@id: contact-details
@type: form
---
BR
## We will send you
## photo and video updates
of
# [c1] Your Plant
##via
## [c1] WhatsApp or Email
BR
## Enter the best number
## for updates below.
BR
@fields:
- fullName|text|Full name|optional|Full name
- phone|tel|WhatsApp number|optional|Include country code and area code
- whatsappOptIn|checkbox|Send me updates on WhatsApp|optional
---
//@run: submitLead
@back: Back
@next: Continue
@goto: confirmation-message

===
// CONFIRMATION MESSAGE
@id: confirmation-message
@type: content

@pagebgcolor: #ffffff
@pagebgimage: /media/background/watered-plant.jpg
@pagebgsize: cover
@pagebgposition: bottom center
@cardopacity: 0.60
---
BR
##[c2]the
# [c3] Seed
## [c2]Has been 
# [c1] Watered.
---
[c2] You will recieve the first 
[c2] photo or video update
[c2] within 24 hours.
---
#[c1]What Next?

@choices:
- go-plant-shop|Grow another seed|plant-shop|c1
- plant-collection-policy|Read plant collection policy|plant-collection-policy|c2
@showback: false
@shownext: false

===
// PLANT SHOP
@id: plant-shop
@type: form
---
BR
## [c1] Plant Shop
# [c1] Opening Soon.
BR
//@fields:
//- chooseWatchGrowth|checkbox|Watch the growth|optional
//- chooseSkipWait|checkbox|Skip the wait and get a 1 month old plant now|optional
//- chooseWatchGrowthAndBuyAnother|checkbox|Watch the growth and buy another plant|optional
---
//@run: submitLead
@back: Back
@next: Check out
@goto: checkout

===
// PLANT COLLECTION POLICY
@id: plant-collection-policy
@type: content
---
## [c1] Our plant professionals 
## [c1] will inspect and ensure
## [c1] that plants are 
BR

## [c1] healthy, disease-free 
## [c1] and in a condition to be transported 
## [c1] to clients.
BR
Clients have 14 business days
after this official inspection,
to collect their plant(s).
BR
After that grace period, 
BR
## [c1] a $100(JMD) per day, per plant 
## [c1] storage fee will be applied, 
## [c1] for another 30 days.
BR
If client fails to collect plant(s)
at the end of the 30 days,
BR
the plant(s) will be sold
to recoup expenses.
BR
## [c1] The grace period and storage fees
## [c1] also apply to free and complimentary gifted plants

---

@choices:
- visit-plant-shop|Vist Plant Shop|plant-shop|c1
@back: BACK
@shownext: false

`;