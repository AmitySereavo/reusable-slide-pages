import AuthForm from "./AuthForm";
import { accountSignupConfig } from "../config/accountSignupConfig";
import { siteConfig } from "../config/siteConfig";

export default function SignupForm({
  businessName = siteConfig.businessName,
  routes = {
    login: siteConfig.routes.login,
    verify: siteConfig.routes.verify,
  },
  footerLinks = siteConfig.footerLinks,
}) {
  return (
    <AuthForm
      businessName={businessName}
      config={accountSignupConfig}
      routes={routes}
      footerLinks={footerLinks}
      title="Create Your Account"
      subtitle={`Sign up to continue using ${businessName}`}
    />
  );
}