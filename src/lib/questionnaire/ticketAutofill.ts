import type { QuestionnaireAnswers, TicketAssignments } from "@/types/questionnaire";

export function prefillFirstTicketFromContact(
  assignments: TicketAssignments,
  answers: QuestionnaireAnswers
): TicketAssignments {
  if (!assignments.length) {
    return assignments;
  }

  const purchaserName = String(answers.fullName ?? "").trim();
  const purchaserEmail = String(answers.email ?? "").trim();
  const purchaserPhone = String(answers.phone ?? "").trim();

  if (!purchaserName && !purchaserEmail && !purchaserPhone) {
    return assignments;
  }

  return assignments.map((assignment, index) => {
    if (index !== 0) {
      return assignment;
    }

    return {
      ...assignment,
      ownerName: assignment.ownerName?.trim() || purchaserName,
      ownerEmail: assignment.ownerEmail?.trim() || purchaserEmail,
      ownerPhone: assignment.ownerPhone?.trim() || purchaserPhone,
      isPurchaserTicket: assignment.isPurchaserTicket ?? true,
      emailTicketToOwner:
        assignment.isPurchaserTicket === true
          ? false
          : assignment.emailTicketToOwner ?? true,
    };
  });
}