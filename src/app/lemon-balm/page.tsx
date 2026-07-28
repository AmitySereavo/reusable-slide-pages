import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/lemon-balm";
const OG_IMAGE = "/media/paralife_trees/jpg/product_lemon_balm_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Lemon Balm Seedling Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees grow guide for transplanting, spacing, watering, feeding, pruning, pest control, and harvesting lemon balm.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Lemon Balm Seedling Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, water, feed, trim, protect, and harvest lemon balm seedlings.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Lemon balm plant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lemon Balm Seedling Grow Guide - Para-life Trees",
    description:
      "A practical lemon balm seedling guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function LemonBalmGrowGuidePage() {
  redirect("/questionnaire/lemon-balm-grow-guide");
}
