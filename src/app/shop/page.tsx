import type { Metadata } from "next";
import { redirect } from "next/navigation";

const SHOP_PUBLIC_URL = "https://littleorchardnursery.paralifetrees.com/shop";
const SHOP_OG_IMAGE = "/media/paralife_trees/little-orchard-shop-share.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
  title: "Little Orchard Shop - Para-life Trees",
  description:
    "Order plants and nursery items from Little Orchard Shop by Para-life Trees.",
  alternates: {
    canonical: SHOP_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Little Orchard Shop - Para-life Trees",
    description:
      "Order plants and nursery items from Little Orchard Shop by Para-life Trees.",
    url: SHOP_PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: SHOP_OG_IMAGE,
        width: 637,
        height: 637,
        alt: "Little Orchard Shop share image with potted plants and Para-life Trees branding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Little Orchard Shop - Para-life Trees",
    description:
      "Order plants and nursery items from Little Orchard Shop.",
    images: [SHOP_OG_IMAGE],
  },
};

export default function ShopPage() {
  redirect("/questionnaire/little-orchard-shop");
}
