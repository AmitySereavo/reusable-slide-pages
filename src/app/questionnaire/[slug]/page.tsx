import QuestionnaireShell from "@/components/questionnaire/QuestionnaireShell";
import { notFound } from "next/navigation";
import { getQuestionnaireBySlug } from "@/config/questionnaires/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function QuestionnairePage({ params }: Props) {
  const { slug } = await params;

  const questionnaire = getQuestionnaireBySlug(slug);

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