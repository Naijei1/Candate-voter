export type MapView = "congressional" | "statewide";

export function parseMapView(value: string | null | undefined): MapView {
  return value === "statewide" ? "statewide" : "congressional";
}
