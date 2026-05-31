export function buildQuestionnaireLoginHref(returnTo: string) {
  return `/questionnaire/auth-login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getSearchParamString(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  key: string
) {
  const value = searchParams.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

export function readLoginReturnToFromSearch(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
) {
  return getSearchParamString(searchParams, "returnTo");
}