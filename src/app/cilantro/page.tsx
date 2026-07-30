import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://growguide.paralifetrees.com/cilantro";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Cilantro Grow Guide - Para-life Trees",
  description: "A Para-life Trees guide for growing cilantro leaves and coriander seeds.",
  alternates: { canonical: PUBLIC_URL },
  icons: { icon: "/icons/paralife_trees_logo.png", apple: "/icons/paralife_trees_logo.png" },
  openGraph: {
    title: "Cilantro Grow Guide - Para-life Trees",
    description: "Learn cilantro sunlight, water, bolting, pest care, diseases, harvesting, and coriander seed production.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1024, height: 1024, alt: "Para-life Trees logo" }],
  },
  twitter: { card: "summary_large_image", title: "Cilantro Grow Guide - Para-life Trees", images: [OG_IMAGE] },
};

export default function CilantroGrowGuidePage() {
  redirect("/questionnaire/cilantro-grow-guide");
}
