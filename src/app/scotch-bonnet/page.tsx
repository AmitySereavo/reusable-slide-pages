import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/scotch-bonnet";
const OG_IMAGE = "/media/paralife_trees/jpg/product_scotch_bonnet_plant_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Scotch Bonnet Pepper Seedling Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for transplanting, spacing, feeding, pest care, disease control, and harvesting Scotch bonnet pepper seedlings.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Scotch Bonnet Pepper Seedling Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, feed, protect, and harvest Scotch bonnet pepper seedlings.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Scotch bonnet pepper plant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scotch Bonnet Pepper Seedling Grow Guide - Para-life Trees",
    description:
      "A practical Scotch bonnet pepper seedling guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function ScotchBonnetGrowGuidePage() {
  redirect("/questionnaire/scotch-bonnet-grow-guide");
}
