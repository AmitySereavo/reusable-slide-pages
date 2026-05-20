import AuthForm from "./AuthForm";
import { quickLeadConfig } from "../config/quickLeadConfig";
import { siteConfig } from "../config/siteConfig";

export default function LeadCaptureForm({
  businessName = siteConfig.businessName,
  footerLinks = siteConfig.footerLinks,
  title = "Stay Updated",
  subtitle,
}) {
  return (
    <AuthForm
      businessName={businessName}
      config={quickLeadConfig}
      footerLinks={footerLinks}
      title={title}
      subtitle={subtitle || `Join the list for updates from ${businessName}`}
    />
  );
}