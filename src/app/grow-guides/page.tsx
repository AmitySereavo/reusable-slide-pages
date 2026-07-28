import type { Metadata } from "next";
import Link from "next/link";

const guides = [
  {
    href: "/lettuce",
    title: "Lettuce Seedling Grow Guide",
    description: "Transplanting, spacing, watering, pests, harvesting, and weekly care.",
    image: "/media/paralife_trees/png/product_lettuce_seedlings_generated.png",
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

      <section style={styles.grid} aria-label="Available grow guides">
        {guides.map((guide) => (
          <Link key={guide.href} href={guide.href} style={styles.card}>
            <img src={guide.image} alt="" style={styles.image} />
            <span style={styles.cardTitle}>{guide.title}</span>
            <span style={styles.cardCopy}>{guide.description}</span>
            <span style={styles.cardAction}>Open guide</span>
          </Link>
        ))}
      </section>
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
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    margin: "34px auto 0",
    maxWidth: "980px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.82)",
    border: "1px solid rgba(123, 63, 42, 0.25)",
    borderRadius: "8px",
    color: "inherit",
    display: "grid",
    gap: "10px",
    padding: "14px",
    textDecoration: "none",
  },
  image: {
    aspectRatio: "4 / 3",
    borderRadius: "6px",
    objectFit: "cover" as const,
    width: "100%",
  },
  cardTitle: {
    color: "#2F6F3E",
    fontSize: "1.25rem",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  cardCopy: {
    color: "#5E5144",
    lineHeight: 1.4,
  },
  cardAction: {
    color: "#7B3F2A",
    fontWeight: 800,
    marginTop: "4px",
  },
};
