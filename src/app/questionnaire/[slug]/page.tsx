import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QuestionnaireShell from "@/components/questionnaire/QuestionnaireShell";
import { getQuestionnaireBySlug } from "@/config/questionnaires/registry";

const PLANT_GIVEAWAY_SLUG = "home-gardener-plant-giveaway";
const PLANT_GIVEAWAY_PUBLIC_URL =
  "https://littleorchardnursery.paralifetrees.com/gift";
const PLANT_GIVEAWAY_OG_IMAGE = "/icons/paralife_trees_og.png";

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
