import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getShopDisplayName } from "@/config/shopIdentities";

const SHOP_PUBLIC_URL = "https://littleorchardnursery.paralifetrees.com/shop";
const SHOP_OG_IMAGE = "/media/paralife_trees/little-orchard-shop-share.png";
const SHOP_NAME = getShopDisplayName("little-orchard-shop");
const SHOP_TITLE = `${SHOP_NAME} - Para-life Trees`;
const SHOP_DESCRIPTION = `Order plants and nursery items from ${SHOP_NAME} by Para-life Trees.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
  title: SHOP_TITLE,
  description: SHOP_DESCRIPTION,
  alternates: {
    canonical: SHOP_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: SHOP_TITLE,
    description: SHOP_DESCRIPTION,
    url: SHOP_PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: SHOP_OG_IMAGE,
        width: 637,
        height: 637,
        alt: `${SHOP_NAME} share image with potted plants and Para-life Trees branding`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHOP_TITLE,
    description: `Order plants and nursery items from ${SHOP_NAME}.`,
    images: [SHOP_OG_IMAGE],
  },
};

export default function ShopPage() {
  redirect("/questionnaire/little-orchard-shop");
}
