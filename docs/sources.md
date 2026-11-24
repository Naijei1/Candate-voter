# Sources and coverage for THE VOTE

Checked November 3, 2026 unless a row gives its own date. Kentucky federal general election only. Nothing here is a vote recommendation.

| Field | Source | Coverage |
| --- | --- | --- |
| November nominees, party, write-in, incumbency | Kentucky Secretary of State general filing list and the Clerk of the House nominee PDF (Oct 8, 2026) | U.S. Senate and six U.S. House districts. Primary losers stay off the list. |
| Money raised, spent, cash, debts | OpenFEC candidate totals, coverage through Oct 14, 2026. Barr uses his principal Senate committee because the candidate total was a termination report. | Nominees with an FEC id. Some independents and write-ins have no total. |
| Outside spending | FEC independent expenditures in the stored 2026 snapshot | Senate committees in that snapshot. Not a full donor file. |
| Issue notes | Courier Journal questionnaire (updated Oct 29, 2026), Herald-Leader questionnaires, Booker campaign pages, Ballotpedia Candidate Connection for Christopher Campbell, official House pages, House roll call 312 (Sept 16, 2026) | 20 of 25 nominees. Five have no stored note. |
| Photos | Clerk of the House member images, saved in the repo | Andy Barr, James Comer, Brett Guthrie, Morgan McGarvey, Hal Rogers. Everyone else uses initials. |
| Campaign or office links | FEC committee website field, Courier Journal questionnaire, or the member's House site | Missing for Murphy, Loecken, Todd, Peter Williams, Serrano, Wilson, Alvarado, and Dembo. |
| News | Kentucky Lantern RSS | On the News Feed (`/news`, Reporting tab) only. `/updates` redirects to `/news`. A race page shows a story only when the headline names someone in that race. The home page does not use this feed. |
| Display type | Big Shoulders (SIL Open Font License), file `src/fonts/big-shoulders-latin.woff2`, optical size 72. Body type is Source Sans 3. | Headlines and the wordmark. Next’s font loader has no metrics for this face, so the file is stored in the repo. |
| Home video | Four credited excerpts from rural Kentucky, downtown Lexington, the FDR Presidential Library and a contemporary polling place. Per-clip sources, licenses and edits are in `data/ky-hero-film.json` and displayed on `/sources`. | Muted 25-second loop with a poster for reduced motion, Save-Data and slow connections. The requested omission of a pause control is a known gap against WCAG 2.2.2 (Pause, Stop, Hide). |
| Statewide panel (home map, Statewide tab) | Kentucky's two U.S. senators from [senate.gov](https://www.senate.gov/states/KY/intro.htm) and the Senate class lists ([Class II](https://www.senate.gov/senators/Class_II.htm), [Class III](https://www.senate.gov/senators/Class_III.htm)). Governor, Lieutenant Governor, Attorney General, Secretary of State, Treasurer, Auditor, and Agriculture Commissioner from each office's official site, party from the [certified 2023 general election results](https://elect.ky.gov/results/2020-2029/Documents/Certification%20of%20Election%20Results%20for%202023%20General%20Election%20Final.pdf), and the four-year cycle from [Kentucky Constitution Section 95](https://apps.legislature.ky.gov/law/constitution/Constitution/ViewConstitution?rsn=103). The governor's two-term limit is [Section 71](https://apps.legislature.ky.gov/law/constitution/Constitution/ViewConstitution?rsn=79); his second term is from the [Governor's Office history page](https://governor.ky.gov/about/gubernatorial-history). Checked 2026-11-19. Data in `src/lib/site/ky-statewide.ts`. | Senator photos are official portraits from the Biographical Directory of the U.S. Congress (public domain), saved in `public/photos/ky/statewide/`. State officers have no photo with a clear license, so their cards show initials. |
| Money charts (home and `/finance`) | Candidate bars: the same OpenFEC cycle totals as the "Money raised" row, through Oct 14, 2026. Group bars: stored FEC independent-expenditure totals for November nominees, summed per group. | No value is estimated. A nominee with no FEC total is listed by name under the chart, never drawn as zero. Every chart has a table version. |
| Compare the candidates (home) | Only the issue notes and House votes above, plus the ballot list. The AI reads those records and nothing else; a claim is shown only when it cites records from at least two candidates. | When the AI is off, fails, or the records are too thin, the section says so in plain words and shows each candidate's cited statements side by side. No ratings or predictions. |
| Posts on X | Official X API, env `X_BEARER_TOKEN` | Hidden when the token is unset. No account list is stored, so a token still shows no posts until handles are added from an official source. |
| Home money cards | FEC independent-expenditure totals and candidate receipt totals in the 2026 Kentucky snapshot, retrieved 2026-11-02 | November ballot candidates only. Totals, not one gift and not a donor name. |
| Results links | Kentucky State Board of Elections pages | Shown after 6 p.m. Eastern. Central counties are still open until 6 p.m. Central. This site does not copy counts. |
| Polls | None | The polls page stays empty. |
| County map | Census 2023 county boundaries, Census block assignments for the 120th Congress and the Kentucky State Board of Elections county clerk directory. Checked 2026-11-22. | Kentucky’s 120 counties, their clerks and their U.S. House districts. |
| Endorsements | None stored | Profiles say no endorsement is stored. |
| Ballot question text | None certified | `/measures/example-kentucky` is a labeled example, not a real question. |

Last-checked dates sit on the note, link, or vote they belong to.

## Colors

Brand red `#a8123e` (crimson) is used for accents: the wordmark flag, section bars, the map toggle, buttons, and the "Spent" bars. The Republican party color is a warmer red `#b8321f`, used only on party tags, so the two never read as the same thing. White text on either red, and on navy `#0b2a66`, meets WCAG AA.
