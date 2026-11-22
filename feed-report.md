# THE VOTE feed slice

## News Feed · done

- Decodes the complete WHATWG named and numeric reference set. Reporting matches 2026 Kentucky federal candidate names or contests and uses publication dates. Eligible lead images and credits come from the feed.
- FEC filing cards use the receipt date, then the dated FEC document image number. Cycle and outside-spending aggregates carry their own coverage where recorded. Undated aggregates omit the date. Candidate names and initials come from the FEC candidate–committee link.
- Candidate filtering works in both lanes. Dated press and filing cards appear in date order. The 160 ms entry animation is disabled under reduced motion. Compare calls the tab News.
- Added Rep. Brett Guthrie’s official RSS. Skipped X because a keyless official feed was unavailable. Other member RSS URLs were unavailable or outside the November candidate roster. Publisher and States Newsroom photos are credited with their original stories. Third-party photos without matching reuse rights are omitted.

## Ask · done

- The race picker leads with What to know, Where they differ and Where they agree. Its selection sets the follow-up context.
- Named same-race comparisons reuse the Compare service and its evidence, citations and limits. Cross-race questions return cited records and links grouped by race. Existing no-endorsement checks and source allowlists apply. Answer citations use plain links.
- The Barr and Booker request passed a route-level test using validated comparison output. Cross-race and records-only paths were exercised locally. No live Bedrock comparison was run.

## Finance · partially done

- All seven races show a headline from FEC campaign receipts with its coverage date. Five have verified candidate-level outside totals in the new snapshot. The public FEC pages for Districts 1 and 5 did not return usable totals during retrieval. Those headlines show outside amounts only if the existing finance store supplies them.
- Added filing-period charts with accessible source tables. The snapshot contains 113 current Form 3 records covering 18 candidates, including 17 with enough points for a chart. The page also reads newer filing periods from the existing FEC totals worker.
- Added top contributing committees for 11 candidates with verified Schedule A periods. Each breakdown is restricted to the displayed filing period, aggregates Form 3 Schedule A committee receipts by committee and reconciles to the filing. Memo entries and individual receipts were excluded. Where a period could not be verified or yielded no committee receipts, the list is omitted.
- Human FEC links replace the raw candidate-totals API URL. The profile header shares the compact finance formatter.

## Credibility · done

- Added Updated and Sources lines to Candidates, News, Finance and both race views. Applied Official record, Candidate says, Reporting and AI summary where those records are shown.
- Feed cards link to the contact correction form with the record attached. The form uses the existing corrections endpoint. Expanded the glossary. The non-endorsement sentence remains in Terms and was removed from the footer and general Ask presentation.

## Sources checked Nov 22, 2026

- [WHATWG HTML named references](https://html.spec.whatwg.org/entities.json)
- [Kentucky Lantern RSS](https://kentuckylantern.com/feed/), [States Newsroom republication guidelines](https://statesnewsroom.com/republishing-guidelines/) and linked RSS lead images
- [Office of Rep. Brett Guthrie RSS](https://guthrie.house.gov/news/rss.aspx)
- [FEC Kentucky candidate directory](https://www.fec.gov/data/candidates/?election_year=2026&state=KY), principal committee links, [committee filings](https://www.fec.gov/data/committee/C00467571/?cycle=2026&tab=filings), [FEC electronic Form 3 and Schedule A](https://docquery.fec.gov/dcdev/posted/2042009.fec) and [independent expenditures](https://www.fec.gov/data/independent-expenditures/)
- [Kentucky Secretary of State 2026 general candidate list](https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3), [Clerk of the House nominee list](https://clerk.house.gov/member_info/electionInfo/2026/120-nominations.pdf) and the comparison records already stored in the repo

## Files changed

- Data — `data/html-character-references.json`, `data/ky-news-snapshot.json`, `data/ky-fec-feed-finance.json`
- Pages — `src/app/{ask,candidates,contact,finance,news,sources}/page.tsx`, `src/app/news/news.module.css`, `src/app/candidates/[candidateId]/page.tsx`, `src/app/races/[raceId]/{page.tsx,compare/page.tsx}`, `src/app/api/compare/route.ts`
- Components — `src/components/SiteFooter.tsx`, `src/components/chat/{ChatComposer,ChatMessageList,ChatPage,ChatShell,CitationCard}.tsx`, `src/components/home/{CompareSection,HomeNewsFeed}.tsx`, `src/components/site/{CompareBoard,CorrectionForm,DatasetUpdated,FeedCard,FeedCorrection,FilingCharts,MoneyCharts}.tsx`
- Server logic — `src/lib/chat/{compare,handler,notes}.ts`, `src/lib/compare/{live,service,summarize}.ts`, `src/lib/finance/{map,model,read}.ts`, `src/lib/site/{fec-reports,html-entities,ky-ballot,ky-candidate-mentions,ky-news,money-charts,today}.ts`
- Tests — `test/{chat-ui,chat,clarity,feed-news,the-vote-review-fixes,today}.test.ts`. Updated presentation expectations for dated aggregate cards, the footer, the alignment notice and compact Ask record details.

## Operator steps

- No new AWS resources, environment variables or npm dependencies. The existing FEC totals worker continues using `FEC_API_KEY`. Next.js consumes the stored records and curated snapshots without a key. Serve Ask and corrections with the existing Amplify Bedrock and DynamoDB configuration.
- The local AWS profile lacks DynamoDB access. Browser verification used the sourced fallback. Corrections were exercised with the existing endpoint mocked in the browser.

## Verification

- Node 22 passed 302 tests. Lint and the production build passed with six existing image warnings.
- Chromium and axe checked 13 public paths and filter variants at 320 px and 1440 px. All returned HTTP 200, with zero axe violations and no horizontal overflow.
- Browser checks passed for candidate filtering, reduced motion, the feed correction form and Ask race selection.
- The requested report directory rejected writes in this session. This copy is in the worktree.
