export type AuthSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  adminLevel: number;
};

export type AuthSession = {
  id: string;
  userId: string;
  user: AuthSessionUser;
};

export function createSession(userId: string): Promise<{ expiresAt: Date }>;
export function getSessionFromCookie(): Promise<AuthSession | null>;
export function requireUser(): Promise<AuthSessionUser | null>;
export function touchSession(sessionId: string): Promise<void>;
export function revokeSessionByToken(token: string): Promise<void>;
export function clearSessionCookie(): Promise<void>;
export function logoutCurrentSession(): Promise<void>;
