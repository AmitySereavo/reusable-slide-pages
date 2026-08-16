import type { Metadata } from "next";
import { redirect } from "next/navigation";

const PUBLIC_URL = "https://paralifetrees.com/callaloo-recipe";
const OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://paralifetrees.com"),
  title: "Callaloo Recipe - Para-life Trees",
  description:
    "A Para-life Trees Callaloo recipe page. Recipe content is being prepared.",
  alternates: {
    canonical: PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Callaloo Recipe - Para-life Trees",
    description:
      "Callaloo recipe and package support page for Para-life Trees.",
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
    title: "Callaloo Recipe - Para-life Trees",
    description:
      "Callaloo recipe and package support page for Para-life Trees.",
    images: [OG_IMAGE],
  },
};

export default function CallalooRecipePage() {
  redirect("/questionnaire/callaloo-recipe");
}
