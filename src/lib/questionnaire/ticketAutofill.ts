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

    if (assignment.isPurchaserTicket === false) {
      return assignment;
    }

    if (assignment.purchaserContactPrefilled === true) {
      return assignment;
    }

    return {
      ...assignment,
      ownerName: purchaserName,
      ownerEmail: purchaserEmail,
      ownerPhone: purchaserPhone,
      purchaserContactPrefilled: true,
      isPurchaserTicket: assignment.isPurchaserTicket ?? true,
      emailTicketToOwner:
        assignment.isPurchaserTicket === true
          ? false
          : assignment.emailTicketToOwner ?? true,
    };
  });
}
