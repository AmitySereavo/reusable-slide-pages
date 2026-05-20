const KEY = "passwordResetPendingContext";

export function setPendingPasswordResetContext(context) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(context));
}

export function getPendingPasswordResetContext() {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingPasswordResetContext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}