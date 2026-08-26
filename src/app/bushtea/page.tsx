import type { Metadata } from "next";
import { redirect } from "next/navigation";

const SHOP_PUBLIC_URL = "https://paralifetrees.com/bushtea";
const SHOP_OG_IMAGE = "/media/paralife_trees/png/product_guava_leaves_dried.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://paralifetrees.com"),
  title: "Bush Tea Shop - Para-life Trees",
  description:
    "Order harvested-to-order bush tea products from Para-life Trees, starting with dried guava leaves.",
  alternates: {
    canonical: SHOP_PUBLIC_URL,
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Bush Tea Shop - Para-life Trees",
    description:
      "Harvested-to-order bush tea products from Para-life Trees.",
    url: SHOP_PUBLIC_URL,
    siteName: "Para-life Trees",
    type: "website",
    images: [
      {
        url: SHOP_OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Dried guava leaves for bush tea",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bush Tea Shop - Para-life Trees",
    description: "Order harvested-to-order bush tea products.",
    images: [SHOP_OG_IMAGE],
  },
};

export default async function BushTeaShopPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  redirect(`/questionnaire/bush-tea${queryString ? `?${queryString}` : ""}`);
}
