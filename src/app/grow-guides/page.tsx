import type { Metadata } from "next";
import GrowGuidesSearch, { type GrowGuideSummary } from "./GrowGuidesSearch";

const guides: GrowGuideSummary[] = [
  {
    href: "/lettuce",
    title: "Lettuce Seedling Grow Guide",
    description: "Transplanting, spacing, watering, pests, harvesting, and weekly care.",
    image: "/media/paralife_trees/png/product_lettuce_seedlings_generated.png",
  },
  {
    href: "/cabbage",
    title: "Cabbage Seedling Grow Guide",
    description:
      "Transplanting, spacing, watering, feeding, pests, diseases, head formation, and harvest.",
    image: "/media/paralife_trees/png/product_cabbage_seedlings_generated.png",
    keywords: ["caribbean queen cabbage", "brassica", "seedling"],
  },
  {
    href: "/lemon-balm",
    title: "Lemon Balm Seedling Grow Guide",
    description: "Container care, trimming, leaf quality, pests, disease prevention, and harvest.",
    image: "/media/paralife_trees/jpg/product_lemon_balm_still.jpg",
  },
  {
    href: "/black-pepper",
    title: "Black Pepper Plant Grow Guide",
    description: "Support, filtered light, drainage, vine training, disease prevention, and harvest expectations.",
    image: "/media/paralife_trees/jpg/product_black_pepper_plant_still.jpg",
  },
  {
    href: "/green-onion",
    title: "Scallion / Green Onion Grow Guide",
    description: "Transplanting, spacing, watering, feeding, pests, diseases, and harvest timing.",
    image: "/media/paralife_trees/jpg/product_green_onion_scallion_still.jpg",
  },
  {
    href: "/scotch-bonnet",
    title: "Scotch Bonnet Pepper Seedling Grow Guide",
    description: "Transplanting, sun, feeding, pests, diseases, flowering, fruiting, and harvest.",
    image: "/media/paralife_trees/jpg/product_scotch_bonnet_plant_still.jpg",
  },
  {
    href: "/slicing-tomato",
    title: "Slicing Tomato Seedling Grow Guide",
    description: "Transplanting, staking, spacing, feeding, pest care, disease prevention, and harvest.",
    image: "/media/paralife_trees/jpg/product_tomato_seedling_slicing_still.jpg",
  },
  {
    href: "/sweet-pepper",
    title: "Sweet Pepper Grow Guide",
    description: "Sun, drainage, feeding, blossom care, pest control, diseases, and harvest.",
    image: "/media/paralife_trees/jpg/product_bell_pepper_plant_still.jpg",
    keywords: ["bell pepper", "capsicum", "seedling"],
  },
  {
    href: "/culinary-basil",
    title: "Culinary Basil Grow Guide",
    description: "Transplanting, sunlight, pruning, harvesting, pest care, and leaf quality.",
    image: "/media/paralife_trees/jpg/product_basil_italian_sweet_still.jpg",
    keywords: ["italian sweet basil", "genovese basil", "herb"],
  },
  {
    href: "/dill",
    title: "Dill Grow Guide",
    description: "Cooler growing conditions, spacing, watering, harvesting leaves and seed heads.",
    image: "/media/paralife_trees/jpg/product_dill_still.jpg",
    keywords: ["herb", "seed", "seed head"],
  },
  {
    href: "/tree-mint",
    title: "Jamaican Tree Mint Grow Guide",
    description: "Tree mint care, containers, pruning, heat, water, pests, and harvesting.",
    image: "/media/paralife_trees/jpg/product_tree_mint_still.jpg",
    keywords: ["costa rican peppermint", "jamaican peppermint", "tree mint"],
  },
  {
    href: "/mint",
    title: "Peppermint, Spearmint and Black Mint Grow Guide",
    description: "Mint container control, sunlight, trimming, harvesting, water, pests, and leaf quality.",
    image: "/media/paralife_trees/jpg/product_spearmint_still.jpg",
    keywords: ["peppermint", "spearmint", "black mint", "mint"],
  },
  {
    href: "/cilantro",
    title: "Cilantro Grow Guide",
    description: "Leaf harvest, coriander seed, bolting, cooler weather, pests, and transplanting.",
    image: "/icons/paralife_trees_logo.png",
    keywords: ["coriander", "herb", "bolting"],
  },
  {
    href: "/parsley",
    title: "Parsley Grow Guide",
    description: "Transplanting, leaf harvest, watering, feeding, pests, diseases, and containers.",
    image: "/icons/paralife_trees_logo.png",
    keywords: ["herb", "leaf harvest"],
  },
  {
    href: "/rosemary",
    title: "Rosemary Grow Guide",
    description: "Drainage, pruning, sunlight, root rot prevention, pest care, and harvest.",
    image: "/icons/paralife_trees_logo.png",
    keywords: ["herb", "woody herb", "root rot"],
  },
  {
    href: "/marigold",
    title: "Marigold Grow Guide",
    description: "Sun, spacing, deadheading, pest observation, flowering, seed saving, and containers.",
    image: "/icons/paralife_trees_logo.png",
    keywords: ["flower", "ornamental", "companion plant"],
  },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://growguide.paralifetrees.com"),
  title: "Grow Guides - Para-life Trees",
  description:
    "Para-life Trees grow guides for seedlings, herbs, trees, and garden plants.",
  alternates: {
    canonical: "https://growguide.paralifetrees.com",
  },
  icons: {
    icon: "/icons/paralife_trees_logo.png",
    apple: "/icons/paralife_trees_logo.png",
  },
  openGraph: {
    title: "Grow Guides - Para-life Trees",
    description:
      "Practical plant care guides from Para-life Trees for home gardeners and small farmers.",
    url: "https://growguide.paralifetrees.com",
    siteName: "Para-life Trees Grow Guides",
    type: "website",
    images: [
      {
        url: "/icons/paralife_trees_logo.png",
        width: 1024,
        height: 1024,
        alt: "Para-life Trees logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grow Guides - Para-life Trees",
    description:
      "Practical plant care guides from Para-life Trees for home gardeners and small farmers.",
    images: ["/icons/paralife_trees_logo.png"],
  },
};

export default function GrowGuidesHubPage() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.brand}>Para-life Trees</div>
        <h1 style={styles.title}>Grow Guides</h1>
        <p style={styles.copy}>
          Practical care guides for seedlings, herbs, trees, and garden plants.
        </p>
        <a
          href="https://wa.me/18763727415?text=I%20need%20help%20with%20a%20plant."
          target="_blank"
          rel="noreferrer"
          style={styles.whatsapp}
        >
          WhatsApp 1 (876) 372-7415
        </a>
      </section>

      <GrowGuidesSearch guides={guides} />
    </main>
  );
}

const styles = {
  page: {
    background: "#F6F0E3",
    color: "#241F1A",
    minHeight: "100vh",
    padding: "32px 18px 48px",
  },
  hero: {
    margin: "0 auto",
    maxWidth: "920px",
    textAlign: "center" as const,
  },
  brand: {
    color: "#7B3F2A",
    fontWeight: 800,
    marginBottom: "6px",
  },
  title: {
    color: "#2F6F3E",
    fontSize: "clamp(40px, 8vw, 72px)",
    lineHeight: 1,
    margin: 0,
  },
  copy: {
    color: "#5E5144",
    fontSize: "clamp(18px, 2.6vw, 24px)",
    lineHeight: 1.45,
    margin: "18px auto",
    maxWidth: "680px",
  },
  whatsapp: {
    color: "#2F6F3E",
    display: "inline-block",
    fontWeight: 700,
    textDecoration: "none",
  },
};
