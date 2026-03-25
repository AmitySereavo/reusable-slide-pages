import { Slide, QuestionnaireAnswers } from "@/types/questionnaire";

export function getVisibleSlides(
  slides: Slide[],
  answers: QuestionnaireAnswers
) {
  return slides.filter((slide) => {
    if (!slide.showIf) return true;
    const answer = answers[slide.showIf.field];
    return slide.showIf.in.includes(answer);
  });
}

export function getSlideIndexById(slides: Slide[], id: string) {
  return slides.findIndex((slide) => slide.id === id);
}