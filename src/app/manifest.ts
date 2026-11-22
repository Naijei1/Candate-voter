import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";
import { brand } from "@/content/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#0b1a2a",
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: withBasePath("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
