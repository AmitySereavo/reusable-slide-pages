import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/wax-apple";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Wax Apple Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for planting, watering, feeding, pruning, and fruiting wax apple / wax jambu trees in Jamaica.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Wax Apple Grow Guide - Para-life Trees",
    description:
      "Learn how to establish, water, feed, prune, and fruit wax apple / wax jambu trees.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Para-life Trees logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wax Apple Grow Guide - Para-life Trees",
    description:
      "A practical wax apple / wax jambu tree guide for home gardens and small growers in Jamaica.",
    images: [OG_IMAGE],
  },
};

export default function WaxAppleGrowGuidePage() {
  redirect("/questionnaire/wax-apple-grow-guide");
}
