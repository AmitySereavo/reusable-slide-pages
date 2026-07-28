import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/green-onion";
const OG_IMAGE = "/media/paralife_trees/jpg/product_green_onion_scallion_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Scallion / Green Onion Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for transplanting, spacing, watering, feeding, pest care, disease control, and harvesting scallion or green onion plants.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Scallion / Green Onion Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, water, feed, protect, and harvest scallion or green onion plants.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Scallion / green onion plant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scallion / Green Onion Grow Guide - Para-life Trees",
    description:
      "A practical scallion and green onion guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function GreenOnionGrowGuidePage() {
  redirect("/questionnaire/green-onion-grow-guide");
}
