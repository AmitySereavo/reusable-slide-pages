export const HighselfTrustDsl = `

// SHARE YOUR WISDOM
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
- No, I don't | No, I don't | exit 
@back: Back
@next: Continue
@goto: self-trust-score

// Dont Value Self Trust
===
@id: dont-value-self-trust
@type: content
---
BR
If you don't value self-trust,
then these pages are not for you.
@back: Back
@next: exit
@goto:

===
// HELP OTHERS WITH FREEDOM
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
@back: No, I don't
@next: Yes, I would love to
@goto: freedom-score
`;
