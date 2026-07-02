export const PERMANENT_WEBSITE_OP_TAG: string;

export const permanentWebsiteOperationSequences: Array<{
  sequenceKey: string;
  name: string;
  description: string;
  triggerEvent: string;
  stepKey: string;
  subject: string;
  bodyText: string;
}>;

export function getWebsiteOperationEmailTemplate(sequenceKey: string): {
  sequenceKey: string;
  name: string;
  description: string;
  triggerEvent: string;
  stepKey: string;
  subject: string;
  bodyText: string;
} | null;
