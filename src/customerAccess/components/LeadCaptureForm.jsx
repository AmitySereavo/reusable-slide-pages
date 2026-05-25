import AuthForm from "./AuthForm";
import { quickLeadConfig } from "../config/quickLeadConfig";
import { siteConfig } from "../config/siteConfig";

export default function LeadCaptureForm({
  businessName = siteConfig.businessName,
  footerLinks = siteConfig.footerLinks,
  routes,
  title = "Stay Updated",
  subtitle,
  config = quickLeadConfig,
  onSubmit,
  auxiliaryLinks,
}) {
  return (
    <AuthForm
      businessName={businessName}
      config={config}
      footerLinks={footerLinks}
      routes={routes}
      title={title}
      subtitle={subtitle || `Join the list for updates from ${businessName}`}
      onSubmit={onSubmit}
      auxiliaryLinks={auxiliaryLinks}
    />
  );
}