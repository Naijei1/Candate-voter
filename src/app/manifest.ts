import type { MetadataRoute } from "next";
import { brand } from "@/content/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    display: "browser",
    background_color: "#f3f5f7",
    theme_color: "#0b1a2a",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
