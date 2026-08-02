import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/orange-ortanique";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Orange / Ortanique Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for planting, watering, feeding, pruning, pest care, and fruiting orange and ortanique citrus trees.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Orange / Ortanique Grow Guide - Para-life Trees",
    description:
      "Learn how to plant, feed, prune, protect, and fruit orange and ortanique citrus trees.",
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
    title: "Orange / Ortanique Grow Guide - Para-life Trees",
    description:
      "A practical citrus guide for home gardeners and small growers in Jamaica.",
    images: [OG_IMAGE],
  },
};

export default function OrangeOrtaniqueGrowGuidePage() {
  redirect("/questionnaire/orange-ortanique-grow-guide");
}
