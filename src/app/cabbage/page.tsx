import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/cabbage";
const OG_IMAGE = "/media/paralife_trees/png/product_cabbage_seedlings_generated.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Cabbage Seedling Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees grow guide for cabbage seedlings, including transplanting, spacing, watering, feeding, pest control, diseases, and harvest.",
  alternates: { canonical: PUBLIC_URL },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Cabbage Seedling Grow Guide - Para-life Trees",
    description:
      "Learn how to grow firm, clean cabbage heads with steady moisture, enough spacing, feeding, and early pest control.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Cabbage seedlings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cabbage Seedling Grow Guide - Para-life Trees",
    description:
      "A practical cabbage seedling guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function CabbageGrowGuidePage() {
  redirect("/questionnaire/cabbage-grow-guide");
}
