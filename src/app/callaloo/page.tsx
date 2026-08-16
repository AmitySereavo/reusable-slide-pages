import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://paralifetrees.com/callaloo";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://paralifetrees.com"),
  title: "Callaloo Package - Para-life Trees",
  description:
    "A Para-life Trees Callaloo package page. Content, recipe details, and package specifics are being prepared.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Callaloo Package - Para-life Trees",
    description:
      "Callaloo package, recipe, and affiliate-share page for Para-life Trees.",
    url: PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Para-life Trees",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Callaloo Package - Para-life Trees",
    description:
      "Callaloo package, recipe, and affiliate-share page for Para-life Trees.",
    images: [OG_IMAGE],
  },
};

export default function CallalooPage() {
  redirect("/questionnaire/callaloo");
}

