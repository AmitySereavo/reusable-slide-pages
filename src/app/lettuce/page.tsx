import type { Metadata } from "next";
import { redirect } from "next/navigation";

const LETTUCE_PUBLIC_URL = "https://growguide.paralifetrees.com/lettuce";
const LETTUCE_OG_IMAGE = "/media/paralife_trees/png/product_lettuce_seedlings_generated.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Lettuce Seedling Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees grow guide for transplanting, spacing, watering, feeding, pest control, and harvesting lettuce seedlings.",
  alternates: {
    canonical: LETTUCE_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Lettuce Seedling Grow Guide - Para-life Trees",
    description:
      "Learn how to transplant, water, feed, protect, and harvest lettuce seedlings with Para-life Trees.",
    url: LETTUCE_PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: LETTUCE_OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Lettuce seedlings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lettuce Seedling Grow Guide - Para-life Trees",
    description:
      "A practical lettuce seedling guide for home gardeners and small farmers.",
    images: [LETTUCE_OG_IMAGE],
  },
};

export default function LettuceGrowGuidePage() {
  redirect("/questionnaire/lettuce-grow-guide");
}
