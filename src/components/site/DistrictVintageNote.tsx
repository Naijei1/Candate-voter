import { CD119_CONGRESS, CD119_SOURCE } from "@/lib/geo/cd119";

/** Shown wherever district shapes or ZIP districts appear. */
export function DistrictVintageNote() {
  return (
    <p>
      House district shapes in this app are {CD119_SOURCE} ({CD119_CONGRESS}th Congress). ZIP
      lookup uses the Census TIGERweb current congressional layer, which targets the 120th
      Congress. Those maps can disagree after a redraw. Use them to open a contest, then read the
      race page. A ZIP match is not a confirmed personal ballot.
    </p>
  );
}
