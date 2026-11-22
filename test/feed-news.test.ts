import assert from "node:assert/strict";
import test from "node:test";
import { decodeHtmlEntities } from "../src/lib/site/html-entities";
import { parseNewsFeed } from "../src/lib/site/ky-news";
import { filingDay, filingPeriods } from "../src/lib/site/fec-reports";
import { kentuckyMoneyCards } from "../src/lib/site/today";
import { groupInitials } from "../src/components/site/FeedCard";

const LANTERN = { url: "https://kentuckylantern.com/feed/", name: "Kentucky Lantern" };

test("decodes decimal, hex and the full set of named HTML entities in plain text", () => {
  assert.equal(decodeHtmlEntities("&#8216; &rsquo; &#x1F5F3; &amp; &CounterClockwiseContourIntegral; &NotEqualTilde;"), "‘ ’ 🗳 & ∳ ≂̸");
  assert.equal(decodeHtmlEntities("&#128; &#0; &#xD800; &#99999999; &unknown; &copy"), "€ � � � &unknown; ©");
  assert.equal(decodeHtmlEntities("&notin; &notit; &amp;amp;"), "∉ ¬it; &amp;");
});

test("RSS reporting selects Kentucky races and candidates, uses published dates, and credits the lead image", () => {
  const rss = `<rss><channel>
    <item><title>Zach Dembo &amp;#8216;interview&#8217;</title><link>https://kentuckylantern.com/dembo/?x=1&amp;y=2</link>
      <pubDate>Fri, 20 Nov 2026 02:00:00 GMT</pubDate>
      <content:encoded><![CDATA[<figure><img src="https://kentuckylantern.com/lead.jpg" class="wp-post-image" /><figcaption>At the podium (Photo by Brian Simms for Kentucky Lantern)</figcaption></figure>]]></content:encoded>
    </item>
    <item><title>University policy dispute</title><link>https://kentuckylantern.com/university/</link><pubDate>Thu, 19 Nov 2026 17:00:00 GMT</pubDate></item>
    <item><title>Alaska U.S. Senate race</title><link>https://kentuckylantern.com/alaska/</link><pubDate>Thu, 19 Nov 2026 17:00:00 GMT</pubDate></item>
    <item><title>Elections in Kentucky's 2nd Congressional District</title><link>https://kentuckylantern.com/congress/</link><pubDate>Thu, 19 Nov 2026 17:00:00 GMT</pubDate></item>
    <item><title>Andy Barr</title><link>https://kentuckylantern.com/undated/</link></item>
  </channel></rss>`;
  const [dembo, district, ...others] = parseNewsFeed(rss, LANTERN, "2026-11-22");
  assert.deepEqual(dembo.personIds, ["H6KY06184"]);
  assert.equal(dembo.url, "https://kentuckylantern.com/dembo/?x=1&y=2");
  assert.equal(dembo.title, "Zach Dembo ‘interview’");
  assert.equal(dembo.date, "2026-11-19");
  assert.equal(dembo.image?.credit, "Photo by Brian Simms for Kentucky Lantern");
  assert.deepEqual(district.raceIds, ["2026-house-KY-02"]);
  assert.equal(district.image, null);
  assert.deepEqual(others, []);
});

test("FEC receipt date outranks the Docquery image date and retrieval date never substitutes", () => {
  const sourceUrl = "https://docquery.fec.gov/pdf/642/202610229941012642/202610229941012642.pdf";
  assert.equal(filingDay({ sourceUrl, receiptDate: "2026-10-24T00:00:00" }), "2026-10-24");
  assert.equal(filingDay({ sourceUrl, receiptDate: "2026-99-24" }), "2026-10-22");
  assert.equal(filingDay({ sourceUrl: "https://www.fec.gov/data/", receiptDate: null }), null);
  for (const [candidateId, name, initials] of [["H6KY05152", "Ned Pillersdorf", "NP"], ["H6KY02068", "Megan Wingfield", "MW"]]) {
    const periods = filingPeriods([], candidateId);
    assert.ok(periods.length >= 2);
    const cards = kentuckyMoneyCards({ direct: [], outside: [] }, "2026-11-22", 12, candidateId);
    assert.ok(cards.filings.length > 0);
    assert.ok(cards.filings.every((card) => card.personId === candidateId && card.date !== "2026-11-22"));
    assert.equal(cards.filings[0]?.title, `${name}’s campaign filed a report`);
    assert.equal(groupInitials(cards.filings[0]?.group ?? ""), initials);
  }
});
