import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/culinary-basil";
const OG_IMAGE = "/media/paralife_trees/jpg/product_basil_italian_sweet_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Culinary Basil Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for Italian sweet basil, Genovese basil, and culinary basil care.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Culinary Basil Grow Guide - Para-life Trees",
    description: "Learn sunlight, pruning, harvesting, water, pests, and disease prevention for culinary basil.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Culinary basil plant" }],
  },
  twitter: { card: "summary_large_image", title: "Culinary Basil Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function CulinaryBasilGrowGuidePage() {
  redirect("/questionnaire/culinary-basil-grow-guide");
}
