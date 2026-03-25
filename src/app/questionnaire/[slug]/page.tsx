import QuestionnaireShell from "@/components/questionnaire/QuestionnaireShell";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { selfTrustFromDslConfig } from "@/config/questionnaires/selfTrustFromDsl";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function QuestionnairePage({ params }: Props) {
  const { slug } = await params;

  if (slug !== "self-trust") {
    notFound();
  }

  return (
    <QuestionnaireShell
      config={selfTrustFromDslConfig}
      theme={selfTrustTheme}
    />
  );
}