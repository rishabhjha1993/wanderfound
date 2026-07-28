import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wanderfound",
    short_name: "Wanderfound",
    description: "Turn wherever you are into a walkable, AI-generated mystery.",
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
