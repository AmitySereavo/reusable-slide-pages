import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/parsley";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Parsley Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for parsley leaf production and home garden care.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Parsley Grow Guide - Para-life Trees",
    description: "Learn parsley transplanting, watering, feeding, pest care, disease prevention, and harvesting.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Para-life Trees logo" }],
  },
  twitter: { card: "summary_large_image", title: "Parsley Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function ParsleyGrowGuidePage() {
  redirect("/questionnaire/parsley-grow-guide");
}
