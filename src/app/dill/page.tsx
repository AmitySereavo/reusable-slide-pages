import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/dill";
const OG_IMAGE = "/media/paralife_trees/jpg/product_dill_still.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Dill Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for growing dill leaves, flowers, and seed heads.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Dill Grow Guide - Para-life Trees",
    description: "Learn spacing, watering, feeding, bolting, pests, diseases, and harvesting dill.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Dill plant" }],
  },
  twitter: { card: "summary_large_image", title: "Dill Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function DillGrowGuidePage() {
  redirect("/questionnaire/dill-grow-guide");
}
