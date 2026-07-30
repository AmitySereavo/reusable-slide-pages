import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/mint";
const OG_IMAGE = "/media/paralife_trees/jpg/product_spearmint_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Mint Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for peppermint, spearmint, and black mint.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Mint Grow Guide - Para-life Trees",
    description: "Learn sunlight, containers, pruning, harvesting, pests, and leaf care for common mints.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Spearmint plant" }],
  },
  twitter: { card: "summary_large_image", title: "Mint Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function MintGrowGuidePage() {
  redirect("/questionnaire/mint-grow-guide");
}
