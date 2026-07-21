export type EmailMessageResult = {
  ok?: boolean;
  status?: string;
  provider?: string;
  mode?: string;
  error?: unknown;
};

export function sendEmailMessage(input: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  purpose?: string;
}): Promise<EmailMessageResult>;
