import {
  clearAllReadableCookies,
  clearLocalEngagementSnapshot,
  clearResumeDecision,
} from "@/lib/questionnaire/engagementTracking";

type ClearVisitorStateParams = {
  questionnaireSlug: string;
};

export async function clearQuestionnaireVisitorState({
  questionnaireSlug,
}: ClearVisitorStateParams) {
  await fetch("/api/questionnaires/visitor-state/clear", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => null);

  clearLocalEngagementSnapshot(questionnaireSlug);
  clearResumeDecision(questionnaireSlug);
  clearAllReadableCookies();

  window.localStorage.removeItem(`questionnaire:${questionnaireSlug}:answers`);
  window.sessionStorage.removeItem(
    `questionnaire:${questionnaireSlug}:resumeDecision`
  );
}