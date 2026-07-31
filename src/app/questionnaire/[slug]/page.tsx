import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QuestionnaireShell from "@/components/questionnaire/QuestionnaireShell";
import { getQuestionnaireBySlug } from "@/config/questionnaires/registry";
import { getAdminSession } from "@/lib/auth/adminGuard";

const PLANT_GIVEAWAY_SLUG = "home-gardener-plant-giveaway";
const LITTLE_ORCHARD_SHOP_SLUG = "little-orchard-shop";
const PLANT_GIVEAWAY_PUBLIC_URL =
  "https://littleorchardnursery.paralifetrees.com/gift";
const LITTLE_ORCHARD_SHOP_PUBLIC_URL =
  "https://littleorchardnursery.paralifetrees.com/shop";
const PLANT_GIVEAWAY_OG_IMAGE = "/icons/paralife_trees_og.png";
const LITTLE_ORCHARD_SHOP_OG_IMAGE =
  "/media/paralife_trees/little-orchard-shop-share.png";
const ADMIN_ONLY_QUESTIONNAIRE_SLUGS = new Set([
  "project-docs",
  "test-package-shop",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug === PLANT_GIVEAWAY_SLUG) {
    const title = "Para-life Trees Plant Giveaway";
    const description =
      "Sign up for the Little Orchard home gardener plant giveaway from Para-life Trees.";

    return {
      metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
      title,
      description,
      alternates: {
        canonical: PLANT_GIVEAWAY_PUBLIC_URL,
      },
      icons: {
        icon: "/icons/paralife_trees_logo.png",
        apple: "/icons/paralife_trees_logo.png",
      },
      openGraph: {
        title,
        description,
        url: PLANT_GIVEAWAY_PUBLIC_URL,
        siteName: "Para-life Trees",
        type: "website",
        images: [
          {
            url: PLANT_GIVEAWAY_OG_IMAGE,
            width: 1200,
            height: 630,
            alt: "Para-life Trees home gardener plant giveaway",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [PLANT_GIVEAWAY_OG_IMAGE],
      },
    };
  }

  if (slug === LITTLE_ORCHARD_SHOP_SLUG) {
    const title = "Little Orchard Shop - Para-life Trees";
    const description =
      "Order plants and nursery items from Little Orchard Shop by Para-life Trees.";

    return {
      metadataBase: new URL("https://littleorchardnursery.paralifetrees.com"),
      title,
      description,
      alternates: {
        canonical: LITTLE_ORCHARD_SHOP_PUBLIC_URL,
      },
      icons: {
        icon: "/icons/paralife_trees_logo.png",
        apple: "/icons/paralife_trees_logo.png",
      },
      openGraph: {
        title,
        description,
        url: LITTLE_ORCHARD_SHOP_PUBLIC_URL,
        siteName: "Para-life Trees",
        type: "website",
        images: [
          {
            url: LITTLE_ORCHARD_SHOP_OG_IMAGE,
            width: 637,
            height: 637,
            alt: "Little Orchard Shop share image with potted plants and Para-life Trees branding",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [LITTLE_ORCHARD_SHOP_OG_IMAGE],
      },
    };
  }

  const questionnaire = await getQuestionnaireBySlug(slug);

  if (!questionnaire) {
    return {};
  }

  return {
    title: questionnaire.config.name || questionnaire.config.slug,
  };
}

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (ADMIN_ONLY_QUESTIONNAIRE_SLUGS.has(slug)) {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      notFound();
    }
  }

  const questionnaire = await getQuestionnaireBySlug(slug);

  if (!questionnaire) {
    notFound();
  }

  return (
    <QuestionnaireShell
      config={questionnaire.config}
      theme={questionnaire.theme}
    />
  );
}
