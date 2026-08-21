# DSL Files

Reusable Slide Pages uses plain-text DSL files to define questionnaire and slide
flows. The shared shell stays generic; each DSL controls slide order, copy,
media, actions, routing, and feature flags.

DSL files live in:

```txt
src/config/questionnaires/
```

Primary registry wiring lives in:

```txt
src/config/questionnaires/registry.ts
```

## Active Flow Examples

### `invitation`

Route:

```txt
/questionnaire/invitation
```

DSL path:

```txt
src/config/questionnaires/invitationDsl.txt
```

Current responsibilities:

- media-first event invitation flow
- gated lead capture and private video access
- next-step URL links into the standalone ticket and music/merch shops

The invitation DSL should stay focused on lead capture, signup, video access,
and navigation to related flows. Do not place ticket-shop or music/merch checkout
slides back inside `invitationDsl.txt`; connect those flows by URL.

### `ticket-shop`

Route:

```txt
/questionnaire/ticket-shop
```

DSL path:

```txt
src/config/questionnaires/ticketShopDsl.txt
```

Current responsibilities:

- ticket storefront
- verified recipient purchase-for-someone selection
- ticket details generated from ticket-store recipient allocation
- stable per-ticket selection codes
- per-ticket meal selection
- meal segments with `included` or `pay` billing behavior
- review order, contact, delivery/pickup, and checkout preparation

### `music-merch-shop`

Route:

```txt
/questionnaire/music-merch-shop
```

DSL path:

```txt
src/config/questionnaires/musicMerchShopDsl.txt
```

Current responsibilities:

- album, music, merch, and event add-on storefront
- shared cart through `orderCart`
- review order, contact, delivery/pickup, and checkout preparation

### `artist-booking`

Route:

```txt
/questionnaire/artist-booking
```

DSL path:

```txt
src/config/questionnaires/artistBookingDsl.txt
```

Current responsibilities:

- first-step booking filter for private 1-50 person bookings versus public,
  ticketed or open-attendance events
- private-event qualification path with occasion, guest count, surprise,
  requested songs, date, location, artiste role, budget, travel, and final
  confirmation
- public-event qualification path with promoter/contact info, event details,
  attendance, tickets, production, sponsors, promotion/media, budget, travel,
  and final confirmation
- generic `submitLead` storage of the booking request before showing the
  received page

Ticket shop meal config is currently sourced from:

```txt
src/config/meals/mealMenus.ts
```

For the current ticket menu:

- `base`, `main`, `side`, and `drink` are included segments.
- `dessert`, `snack`, and `alcoholic-beverage` are paid add-on segments.
- `drink` appears before `dessert`.

### `escape-album`

Route:

```txt
/questionnaire/escape-album
```

DSL path:

```txt
src/config/questionnaires/escapeAlbumDsl.txt
```

Current responsibilities:

- purchased-access login slide
- media/video song slides
- footer content label that toggles timed text/lyrics panel
- MP3/WAV download-format slide
- Lines, Song, Learn, and Shop text modes
- alternate audio source support for Song and Lines modes
- custom lyric phrase-to-merch starter flow
- purchased item entitlement check through `UserPurchasedItem`

### Account/Auth DSLs

Examples:

```txt
authLoginDsl.txt
authAccountDsl.txt
authSignupDsl.txt
authResetPasswordDsl.txt
```

These flows should keep account copy and account navigation in DSL/config while
reusing shared auth, verification, and account APIs.

## Core Slide Directives

Common slide metadata:

```txt
@id:
@type:
@title:
@subtitle:
@body:
@next:
@goto:
@back:
@backgoto:
@shownext:
@showback:
@showprogressbar:
@countstep:
@syncurl:
```

Media:

```txt
@media:
@mediatype:
@mediaaspect:
@autoplay:
@videostart:
@videogoto:
@videoresume:
@progressmode:
@progressplacement:
```

Shops, tickets, meals:

```txt
@type: shop
@store:
@catalog:
@shopmode:
@ticketgoto:
@mealgoto:
@deliverygoto:
@contactgoto:
@reviewgoto:

@type: tickets
@type: meal
@mealmenu:
```

Footer/text panel:

```txt
@footercontentlabel:
@footeraction:
@textpanel:
@textsource:
@textpanelmode:
@textpanelsongmedia:
@textpanellinesmedia:
```

Downloads:

```txt
@downloadkey:
@downloadbuttons:
@downloadrequestkey:
@downloadrequests:
@downloadformats:
```

Auth/forms/conditions:

```txt
@showauthcontrols:
@authform:
@signuptags:
@signupsource:
@fields:
@when:
@backwhen:
@showif:
```

Signup/account flows can tag users when they sign up through a specific slide:

```txt
@signuptags: escape-good-morning, warm-lead
@signupsource: escape-album-good-morning
```

Those tags are stored as `UserTag` records and can trigger Email Sequences
using the `Tag added` trigger with a `Has tag` condition. Keep tags reusable and
project-readable; avoid one-off code branches for campaign-specific signup
routing.

## Timed Text

Timed lyrics or annotated text can use:

```txt
[00:12.340 --> 00:15.100] lyric or annotated text line
```

Mode behavior:

```txt
Lines -> play only the clicked timestamp range
Song  -> play from the clicked timestamp onward
Learn -> show learning, definition, or cultural annotations
Shop  -> show product-forward annotations and custom phrase-to-merch entry
```

If `@textpanelsongmedia` or `@textpanellinesmedia` is configured, timed text
playback uses those media files for the matching modes. Otherwise playback
falls back to the current media/video file.

## Downloads And Protected Files

Paid files must stay outside `public/`.

Recommended local protected structure:

```txt
protected-media/
  escape/
    videos/
    audio/
      mp3/
      wav/
    lyrics/
    covers/
    downloads/
```

The DSL should select a download key. The download route should resolve the
private file path server-side after checking access.

Do not create duplicate downloader systems for one project. Reuse:

```txt
/api/downloads/[downloadkey]
```

## Authoring Rule

Reusable behavior belongs in shared code. Project wording, sequence decisions,
and campaign-specific flows belong in DSL/config/database records.

DSL headings should be written to read well as short display lines. The runtime
balances heading text into one- or two-word lines and keeps the phrase
`Grow Guide` together on its own line. If a thought needs to read as a longer
sentence, put it in `@subtitle`, `@body`, or a subheading/text section instead
of making it the heading.

Website-operation email wording belongs in protected Email Sequence records
tagged `Permanent Website Op` or in their shared default template file. Do not
add email-channel wording for auth, ticket, album, password-reset, or recipient
operations into DSL files or the shared shell.
