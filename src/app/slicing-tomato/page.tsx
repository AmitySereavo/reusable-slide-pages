import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/slicing-tomato";
const OG_IMAGE = "/media/paralife_trees/jpg/product_tomato_seedling_slicing_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Slicing Tomato Seedling Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees guide for transplanting, spacing, feeding, pest care, disease control, staking, and harvesting slicing tomato seedlings.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Slicing Tomato Seedling Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, stake, feed, protect, and harvest slicing tomato seedlings.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Slicing tomato seedling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slicing Tomato Seedling Grow Guide - Para-life Trees",
    description:
      "A practical slicing tomato seedling guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function SlicingTomatoGrowGuidePage() {
  redirect("/questionnaire/slicing-tomato-grow-guide");
}
