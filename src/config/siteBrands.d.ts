export type SiteBrandKey = "paralifeTrees" | "amitySereavo";

export type SiteBrand = {
  key: SiteBrandKey;
  displayName: string;
  fromName: string;
  fromEmail: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  domains: string[];
};

export const SITE_BRANDS: Record<SiteBrandKey, SiteBrand>;

export function getSiteBrandByKey(
  brandKey?: string | null
): SiteBrand | null;

export function getSiteBrandByHost(host?: string | null): SiteBrand | null;

export function getSiteBrandByQuestionnaireSlug(
  slug?: string | null
): SiteBrand | null;

export function getEmailBrandForContext(context?: {
  brandKey?: string | null;
  questionnaireSlug?: string | null;
  request?: Request | null;
  host?: string | null;
}): SiteBrand;

export function getEmailSenderForContext(context?: {
  brandKey?: string | null;
  questionnaireSlug?: string | null;
  request?: Request | null;
  host?: string | null;
}): {
  brandKey: SiteBrandKey;
  fromName: string;
  fromEmail: string;
  displayName: string;
};

export function getSmtpConfigForFromEmail(
  fromEmail?: string | null
): SiteBrand["smtp"] | null;
