import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/black-pepper";
const OG_IMAGE = "/media/paralife_trees/jpg/product_black_pepper_plant_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Black Pepper Plant Grow Guide - Para-life Trees",
  description:
    "A Para-life Trees grow guide for black pepper vines, including support, shade, drainage, feeding, pest care, and harvest expectations.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Black Pepper Plant Grow Guide - Para-life Trees",
    description:
      "Learn how to grow Piper nigrum vines with support, filtered light, steady moisture, drainage, and long-term harvest expectations.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Black pepper plant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Pepper Plant Grow Guide - Para-life Trees",
    description:
      "A practical black pepper vine guide for home gardeners and small farmers.",
    images: [OG_IMAGE],
  },
};

export default function BlackPepperGrowGuidePage() {
  redirect("/questionnaire/black-pepper-grow-guide");
}
