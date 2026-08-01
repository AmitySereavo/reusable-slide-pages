import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/eggplant";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Eggplant Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for transplanting, feeding, watering, pest care, disease prevention, and harvesting eggplant seedlings.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Eggplant Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, feed, protect, and harvest eggplant seedlings.",
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
    title: "Eggplant Grow Guide - Para-life Trees",
    description:
      "A practical eggplant guide for home gardeners, containers, and small farms.",
    images: [OG_IMAGE],
  },
};

export default function EggplantGrowGuidePage() {
  redirect("/questionnaire/eggplant-grow-guide");
}
