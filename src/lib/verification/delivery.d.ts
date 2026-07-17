export function sendVerificationDelivery(input: {
  identifier: string;
  delivery: "code" | "link";
  phoneChannel?: string | null;
  code?: string | null;
  verifyUrl?: string | null;
  target?: string | null;
  successRedirect?: string | null;
  verificationCodeId?: string | null;
  verificationTokenId?: string | null;
  contextMetadata?: Record<string, unknown> | null;
}): Promise<Record<string, unknown>>;
