export type MapView = "congressional" | "statewide" | "county";

export function parseMapView(value: string | null | undefined): MapView {
  return value === "statewide" || value === "county" ? value : "congressional";
}
