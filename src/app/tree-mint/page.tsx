import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/tree-mint";
const OG_IMAGE = "/media/paralife_trees/jpg/product_tree_mint_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Jamaican Tree Mint Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for Costa Rican peppermint and Jamaican tree mint care.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Jamaican Tree Mint Grow Guide - Para-life Trees",
    description: "Learn containers, pruning, watering, feeding, pests, disease prevention, and harvesting tree mint.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Jamaican tree mint plant" }],
  },
  twitter: { card: "summary_large_image", title: "Jamaican Tree Mint Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function TreeMintGrowGuidePage() {
  redirect("/questionnaire/tree-mint-grow-guide");
}
