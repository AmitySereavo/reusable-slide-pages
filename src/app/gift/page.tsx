import type { Metadata } from "next";
import { redirect } from "next/navigation";

const GIFT_PUBLIC_URL = "https://littleorchardnursery.paralifetrees.com/gift";
const GIFT_OG_IMAGE = "/icons/paralife_trees_logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
  title: "Claim a Free Plant - Para-life Trees",
  description:
    "Sign up with Para-life Trees and The Farm at Little Orchard to claim a free plant and receive garden updates.",
  alternates: {
    canonical: GIFT_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Claim a Free Plant - Para-life Trees",
    description:
      "Sign up with Para-life Trees and The Farm at Little Orchard to claim a free plant and receive garden updates.",
    url: GIFT_PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: GIFT_OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Para-life Trees logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Claim a Free Plant - Para-life Trees",
    description:
      "Sign up to claim a free plant and receive garden updates.",
    images: [GIFT_OG_IMAGE],
  },
};

export default function GiftPage() {
  redirect("/questionnaire/home-gardener-plant-giveaway");
}
