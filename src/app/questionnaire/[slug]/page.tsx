import { notFound } from "next/navigation";
import QuestionnaireShell from "@/components/questionnaire/QuestionnaireShell";
import { getQuestionnaireBySlug } from "@/config/questionnaires/registry";

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