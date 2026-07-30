import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/sweet-pepper";
const OG_IMAGE = "/media/paralife_trees/jpg/product_bell_pepper_plant_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Sweet Pepper Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for growing bell pepper and sweet pepper plants.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Sweet Pepper Grow Guide - Para-life Trees",
    description: "Learn sunlight, water, feeding, pest care, disease prevention, and harvest timing for sweet peppers.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Sweet pepper plant" }],
  },
  twitter: { card: "summary_large_image", title: "Sweet Pepper Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function SweetPepperGrowGuidePage() {
  redirect("/questionnaire/sweet-pepper-grow-guide");
}
