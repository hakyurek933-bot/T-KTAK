import type { MetadataRoute } from "next";

/** PWA bildirimi: "Ana ekrana ekle" ile uygulama gibi kurulur. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taktik — Yerli kısa video",
    short_name: "Taktik",
    description: "Kısa video paylaş, keşfet ve mesajlaş. Yerli TikTok.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b12",
    theme_color: "#0b0b12",
    lang: "tr",
    dir: "ltr",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
