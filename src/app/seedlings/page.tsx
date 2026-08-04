import type { Metadata } from "next";
import { redirect } from "next/navigation";

const SEEDLING_PUBLIC_URL =
  "https://littleorchardnursery.paralifetrees.com/seedlings";
const SEEDLING_OG_IMAGE = "/media/paralife_trees/little-orchard-shop-share.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
  title: "Seedling Shop - Para-life Trees",
  description:
    "Pre-order dated seedling and cutting batches from Para-life Trees.",
  alternates: {
    canonical: SEEDLING_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Seedling Shop - Para-life Trees",
    description:
      "Pre-order dated seedling and cutting batches from Para-life Trees.",
    url: SEEDLING_PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: SEEDLING_OG_IMAGE,
        width: 637,
        height: 637,
        alt: "Little Orchard Shop share image with potted plants and Para-life Trees branding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seedling Shop - Para-life Trees",
    description:
      "Pre-order dated seedling and cutting batches from Para-life Trees.",
    images: [SEEDLING_OG_IMAGE],
  },
};

export default function SeedlingsPage() {
  redirect("/questionnaire/seedling-shop");
}
