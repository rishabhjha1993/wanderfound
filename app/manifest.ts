import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wanderfound",
    short_name: "Wanderfound",
    description: "Find your next worthwhile outing in Goa.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2eddf",
    theme_color: "#f2eddf",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
