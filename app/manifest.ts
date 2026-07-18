import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KSolar Sales Quote",
    short_name: "KSolar",
    description: "Thailand rooftop solar rapid quoting tool for field sales.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8faf9",
    theme_color: "#0f766e",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/ksolar-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/ksolar-maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
