import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/marigold";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Marigold Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for growing marigold flowers in gardens and containers.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Marigold Grow Guide - Para-life Trees",
    description: "Learn marigold sunlight, spacing, watering, pests, flowering, deadheading, and seed saving.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Para-life Trees logo" }],
  },
  twitter: { card: "summary_large_image", title: "Marigold Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function MarigoldGrowGuidePage() {
  redirect("/questionnaire/marigold-grow-guide");
}
