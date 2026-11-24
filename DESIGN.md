# THE VOTE

THE VOTE is a guide to Kentucky’s U.S. Senate and House races. Lead with the race, person, filing or source the reader came for. Use the district map, election film and attributed portraits as the main images.

## Paper, ink and color

Use the theme in `src/app/globals.css`. Light pages are cool white `#f7f8fb`, cards are white, ink is `#0a1633`, and metadata is `#4a5470`. Navy `#0b2a66` identifies links, the state mark and the selected segment. Dark pages are `#071533`, cards `#0a1a3a`, raised surfaces `#102552`, ink white and metadata `#c9d3e6`. Deep navy `#041038` carries the dark masthead. Crimson `#a8123e` marks primary actions, the flag and the dark selected segment. White text sits on that fill. Dark text and icons that would fail on navy use `#ff8095`. The pressed crimson is `#7d0d2e`.

Keep Republican `#b8321f` and Democratic `#1d4ed8` distinct from the brand. Candidate cards use a solid tag with white caps (`DEM`, `REP`, `KP`, `Write-in`). Status lines use the party ink, lighter in dark mode (`#b9d0ff`, `#ffc4ae`). Elsewhere, spell the party name. Finance charts identify their series in words and retain the opposition hatch. The default map is neutral cool `#c9d3e6` (dark `#22375e`) with white borders and darkens to navy `#0b2a66` (dark `#8fb4ff`) on hover or focus. Do not paint the default map by party.

## Hero backdrop

Light mode uses a white masthead and navy ink. Dark mode uses deep navy with one static crimson diagonal wash, CSS only, with no motion. Keep the high-priority poster, film and contrast overlay. The film’s reduced-motion fallback stays. There is no pause control and no ZIP field in the hero.

## Type and measure

Newsreader 700 sets the article title (40–56px) and section title. Newsreader 600 sets the candidate name (24px). Source Sans 3 sets reading text (18px), controls (16–18px) and supporting text (14–16px). Use tabular numerals for financial figures, dates in the feed and table cells. Big Shoulders at 800 belongs to THE VOTE and the hero’s “Vote.” All three faces use next/font, Latin preload and swap. Load Newsreader as static 600 and 700, not the variable optical axis.

Align the masthead, hero copy, sections and footer to the 1120px wrapper with at least 16px on each side. Give an interior page 48px above the title, 32px on phones. The ballot and chat have a narrower reading measure. Use 4, 8, 12, 16, 24, 32, 48, 64 and 96px for spacing. Keep a label close to its value and use larger gaps between races. Fixed bars include space for the device’s safe area.

## Tokens

`globals.css` names the scale so new rules use it: `--space-1` to `--space-9` (4 to 96px), `--step--1` to `--step-4` (14px to the fluid 40–72px title), `--radius-*`, `--line-strong` (ink mixed at 22% with `color-mix`, so dark mode follows), and `--focus-ring` / `--focus-halo`. Headings balance their lines and reading text uses `text-wrap: pretty`. Table cells, `time` and `.num` use tabular numerals. `.flow` spaces a column of mixed content and gives a new section 48px. `.link-quiet` is the muted utility link (Report an error). `details.more` is the native disclosure for long record lists.

## Focus

Keyboard focus is a 3px ring 2px off the element. Buttons and form controls add a 2px halo in the surface colour, so the ring separates from crimson, navy and the film. On the masthead, footer, hero, results bar and Races in focus the ring is white with a deep-navy halo. Map districts keep their path-shaped focus.

## Surfaces and controls

- Use 1px rules at 10% ink for card boundaries. A full-width ink rule opens a group of races or a home section. Light cards carry a two-layer shadow (`0 1px 2px` and `0 8px 24px` at 6% ink). Dark cards use the 10% white hairline and no shadow.
- Use 16px corners for cards, a full pill for segments, follow and profile actions, and a tag clipped at the photo’s top-right (`0 0 0 8px`).
- Segmented controls are a full-width pill, about 48px, on track `#e8ecf4` (dark `#0e2148`). The selected segment is a navy fill with white text in light mode and a crimson fill with white text in dark mode. It slides in 160ms. There is no underline indicator.
- Give each action group one crimson primary and a quiet, bordered secondary. Keep text and focus visible over the hero film. Standalone actions have a 44px minimum target. Keep inline source links underlined.
- Show a sourced photograph in a shared 4:3 frame, `object-position: center 20%`, with one grade (`contrast(1.08) saturate(1.06)`) and a dark scrim in dark mode. Do not tint the photograph by party. Initials use the same frame on `#e8ecf4`. Keep the credit inside the card. The card shows the solid party tag, the name, one status line, one sourced sentence and an outlined “View profile” pill. The whole card links to the profile. Primary vote totals stay on the profile.
- Give profiles a portrait beside the name, race and actions. Separate facts with hairlines. In the feed, keep source and date together beneath the summary. Give finance figures a common right edge.
- Keep the Kentucky shape intact. Use the projected interior point for each label. Keyboard focus outlines the district path. Reserve the map and live-label space before interaction.

## Records and race pages

A race page leads with its certification line, the actions and the November candidates. Certified primary tables follow. On a profile, career, education, results, social accounts and votes are hairline rows with a lead column (year or vote) on a shared subgrid, and the source on one muted line. A list longer than eight rows shows six and keeps the rest, server-rendered, behind “Show all (N)”. In a narrow container (side-by-side compare) the lead sits above the fact. Dates do not break across lines.

## Interaction and copy

Hover and press use 160ms and `cubic-bezier(0.22, 1, 0.36, 1)`. On hover-capable inputs a linked card rises 2px, a candidate image scales to 1.02 inside its frame, and action links draw an underline. Keep keyboard focus independent of hover. Reduced motion removes translation, zoom, transitions and smooth scrolling. The film keeps its existing poster fallback.

The map has Congressional, Statewide and County segments. The News Feed uses two segments. The selected fill slides in 160ms. District maps have 44px zoom controls; they do not autoplay. Candidate race links jump to headings and give press feedback. A linked card settles back to its resting position on press. The state header is the silhouette, the state name and an outlined Follow pill. Dated facts (general election, certification deadline, terms begin) come from the election calendar with their source links. They are not a margin or results strip.

When a reader chooses a race in Follow the money, each visible bar moves from the previous row’s proportion to the new one in 360ms. The final tabular amount moves up slightly and gains opacity over 320ms in a fixed column. Use the same easing as the controls. Render the actual values on the server. Initial loads, scrolling and the all-races finance page show settled figures. Reduced motion switches every state immediately.

Use sentence case and source names. Keep the official results link, and keep totals and positions traceable to their records. Avoid promotional badges, placeholder portraits, gradients on type, colored glows, automatic reveals and unsourced statistics.

## Sources

The 2026 design pass used these as references, not as code: the react-components-for-claude-code index (Motion-Primitives, Animata and Cult UI disclosure, tab and skeleton patterns, rebuilt in CSS), the taste-skill system rules (one button pair, one card recipe, 16px reading text, two boxes deep at most), the unslop “20 UI tricks” checklist, Sara Soueidan’s focus-indicator guide and MDN on `text-wrap`. Rejected: effect components (spotlights, marquees, number tickers), entrance animations, View Transitions and Newsreader’s optical-size axis (131.8 KB against 22.5 KB). Notices are in `THIRD_PARTY_NOTICES.md`.
