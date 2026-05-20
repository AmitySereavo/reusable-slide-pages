const PENDING_VERIFICATION_CONTEXT_KEY = "pendingVerificationContext";

export function setPendingVerificationContext(context) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    PENDING_VERIFICATION_CONTEXT_KEY,
    JSON.stringify(context || {})
  );
}

export function getPendingVerificationContext() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PENDING_VERIFICATION_CONTEXT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingVerificationContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_VERIFICATION_CONTEXT_KEY);
}

export function hasPendingVerificationContext() {
  return !!getPendingVerificationContext();
}
