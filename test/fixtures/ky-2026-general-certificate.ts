import { KY_FEDERAL_RACES } from "../../src/lib/site/certified-results";
import { kyBallot } from "../../src/lib/site/ky-ballot";
import certifications from "./ky-sbe-certifications.json";

const [banner2024, houseTitle, districtTitle] = certifications.general.text.split("\n");
const [countyRow] = certifications.general.text.split("\n").slice(-2);
const [firstCounty, ...voteCells] = countyRow.split(" ");
const countyVotes = voteCells.map((cell) => Number(cell.replaceAll(",", "")));
const banner = banner2024.replace("2024", "2026");
const districtNumbers = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];

function formatVotes(values: number[]) {
  return values.map((value) => value.toLocaleString("en-US")).join(" ");
}

// Synthetic test fixture derived from the real 2024 general table layout.
export function generalCertificateFixture(omittedCandidate?: string) {
  const pages = KY_FEDERAL_RACES.map((raceId, district) => {
    const nominees = kyBallot(raceId)!.people.filter(
      (person) => person.role === "nominee" && person.name !== omittedCandidate,
    );
    const candidateHeaders = nominees.flatMap(({ name }) => {
      const surnameStart = name.lastIndexOf(" ");
      return [name.slice(0, surnameStart), name.slice(surnameStart + 1).toUpperCase()];
    });
    const title = district
      ? [houseTitle, districtTitle.replace("3rd", districtNumbers[district])]
      : ["United States Senator"];
    const countyCount = district ? 1 : 120;
    const votes = countyVotes.slice(0, nominees.length);
    const rows = Array.from({ length: countyCount }, (_, index) => {
      const county = index === 0 ? firstCounty : `Test County ${String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26)}`;
      return `${county} ${formatVotes(votes)}`;
    });
    return [
      banner, ...title, nominees.map(({ party }) => party).join(" "), ...candidateHeaders,
      ...rows, `Total Votes ${formatVotes(votes.map((value) => value * countyCount))}`,
    ].join("\n");
  });
  return ["Official 2026 General Election Results\n", ...pages].join("\f");
}
