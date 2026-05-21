export const SESSION_COOKIE_NAME = "auth_session";

const isProduction = process.env.NODE_ENV === "production";

export function buildSessionCookie(token, expiresAt) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

export function buildExpiredSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  };
}