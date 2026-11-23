# THE VOTE

THE VOTE is a guide to Kentucky’s U.S. Senate and House races. Lead with the race, person, filing or source the reader came for. Use the district map, election film and attributed portraits as the main images.

## Paper, ink and color

Use the theme in `src/app/globals.css`. The page is warm paper `#f8f7f3`, cards are white, body ink is `#122033`, and metadata uses `#505961`. Navy `#142b49` identifies links and selected views. Deep navy `#0b1a2a` carries the masthead and footer. Crimson `#a8123e` marks primary actions, the flag and selected navigation. Its pressed or hover companion is `#7d0d2e`.

Keep Republican `#b8321f` and Democratic `#1d4ed8` distinct from the brand. Spell out the affiliation. For small party labels use dark party ink (`#8a2412` or `#1a3a6b`) on a pale party tint (`#fbe7e1` or `#e4eaf6`). Finance charts identify their series in words and retain the opposition hatch. Districts with data use `#bec9c4` and darken to navy on interaction.

## Hero backdrop

A single static radial wash of crimson over deep navy fills the hero before its media paints. Keep the high-priority poster, film and contrast overlay above it. The wash uses CSS alone.

## Type and measure

Newsreader regular sets the article title (40–72px), section title (28–40px), candidate name (24–32px) and filing headline (24px). Source Sans 3 sets reading text (18px), controls (16–18px) and supporting text (14–16px). Use tabular numerals for financial figures, dates in the feed and table cells. Big Shoulders at 800 belongs to THE VOTE and the hero’s “Vote.” All three faces use next/font, Latin preload and swap.

Align the masthead, hero copy, sections and footer to the 1120px wrapper with at least 16px on each side. Give an interior page 48px above the title, 32px on phones. The ballot and chat have a narrower reading measure. Use 4, 8, 12, 16, 24, 32, 48, 64 and 96px for spacing. Keep a label close to its value and use larger gaps between races. Fixed bars include space for the device’s safe area.

## Tokens

`globals.css` names the scale so new rules use it: `--space-1` to `--space-9` (4 to 96px), `--step--1` to `--step-4` (14px to the fluid 40–72px title), `--radius-*`, `--line-strong` (ink mixed at 22% with `color-mix`, so dark mode follows), and `--focus-ring` / `--focus-halo`. Headings balance their lines and reading text uses `text-wrap: pretty`. Table cells, `time` and `.num` use tabular numerals. `.flow` spaces a column of mixed content and gives a new section 48px. `.link-quiet` is the muted utility link (Report an error). `details.more` is the native disclosure for long record lists.

## Focus

Keyboard focus is a 3px ring 2px off the element. Buttons and form controls add a 2px halo in the surface colour, so the ring separates from crimson, navy and the film. On the masthead, footer, hero, results bar and Races in focus the ring is white with a deep-navy halo. Map districts keep their path-shaped focus.

## Surfaces and controls

- Use 1px rules at 10% ink for card boundaries. A full-width ink rule opens a group of races or a home section. Shadows belong to floating sheets or fixed navigation and stay faint.
- Use 4px corners for metadata, 8px for controls, 10px for a segmented control’s outer edge and 12–16px for cards. A segment’s inner corners fit inside its frame.
- Give each action group one crimson primary and a quiet, bordered secondary. Keep text and focus visible over the hero film. Standalone actions have a 44px minimum target. Keep inline source links underlined.
- Show a real candidate photograph in a 4:5 frame, or set the person’s initials in serif type on neutral paper in the same footprint. Keep credits with the portrait. A candidate card names party, person, office and seat status. The whole card links to the profile.
- Give profiles a portrait beside the name, race and actions. Separate facts with hairlines. In the feed, keep source and date together beneath the summary. Give finance figures a common right edge.
- Keep the Kentucky shape intact. Use the projected interior point for each label. Keyboard focus outlines the district path. Reserve the map and live-label space before interaction.

## Records and race pages

A race page leads with its certification line, the actions and the November candidates. Certified primary tables follow. On a profile, career, education, results, social accounts and votes are hairline rows with a lead column (year or vote) on a shared subgrid, and the source on one muted line. A list longer than eight rows shows six and keeps the rest, server-rendered, behind “Show all (N)”. In a narrow container (side-by-side compare) the lead sits above the fact. Dates do not break across lines.

## Interaction and copy

Hover and press use 160ms and `cubic-bezier(0.22, 1, 0.36, 1)`. On hover-capable inputs a linked card rises 2px, a candidate image scales to 1.02 inside its frame, and action links draw an underline. Keep keyboard focus independent of hover. Reduced motion removes translation, zoom, transitions and smooth scrolling. The film keeps its existing poster fallback.

The map has Congressional, Statewide and County segments. The News Feed uses two segments. Its white indicator slides under the selected label in 160ms. Candidate race links jump to headings and give press feedback. A linked card settles back to its resting position on press.

When a reader chooses a race in Follow the money, each visible bar moves from the previous row’s proportion to the new one in 360ms. The final tabular amount moves up slightly and gains opacity over 320ms in a fixed column. Use the same easing as the controls. Render the actual values on the server. Initial loads, scrolling and the all-races finance page show settled figures. Reduced motion switches every state immediately.

Use sentence case and source names. Keep the official results link, and keep totals and positions traceable to their records. Avoid promotional badges, placeholder portraits, gradients on type, colored glows, automatic reveals and unsourced statistics.

## Sources

The 2026 design pass used these as references, not as code: the react-components-for-claude-code index (Motion-Primitives, Animata and Cult UI disclosure, tab and skeleton patterns, rebuilt in CSS), the taste-skill system rules (one button pair, one card recipe, 16px reading text, two boxes deep at most), the unslop “20 UI tricks” checklist, Sara Soueidan’s focus-indicator guide and MDN on `text-wrap`. Rejected: effect components (spotlights, marquees, number tickers), entrance animations, View Transitions and Newsreader’s optical-size axis (131.8 KB against 22.5 KB). Notices are in `THIRD_PARTY_NOTICES.md`.
