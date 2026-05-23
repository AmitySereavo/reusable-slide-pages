import { siteConfig } from "@/customerAccess/config/siteConfig";

function getFooterLinks(variant) {
  if (variant === "auth-login") {
    return [
      {
        label: "Forgot password?",
        href: siteConfig.routes.forgotPassword,
      },
      {
        label: "Create account",
        href: siteConfig.routes.signup,
      },
    ];
  }

  if (variant === "auth-signup") {
    return [
      {
        label: "Already have an account? Log in",
        href: siteConfig.routes.login,
      },
    ];
  }

  if (variant === "auth-forgot-password" || variant === "auth-reset-password") {
    return [
      {
        label: "Back to login",
        href: siteConfig.routes.login,
      },
      {
        label: "Create account",
        href: siteConfig.routes.signup,
      },
    ];
  }

  if (variant === "auth-account") {
    return [
      {
        label: "Dashboard",
        href: siteConfig.routes.dashboard,
      },
    ];
  }

  if (variant === "auth-delete-account") {
    return [
      {
        label: "Back to account",
        href: siteConfig.routes.account || "/questionnaire/auth-account",
      },
    ];
  }

  return [
    {
      label: "Log in",
      href: siteConfig.routes.login,
    },
    {
      label: "Create account",
      href: siteConfig.routes.signup,
    },
  ];
}

export default function AuthFooter({
  variant = "default",
  classNames = {},
}) {
  const primaryLinks = getFooterLinks(variant);

  return (
    <footer className={classNames.footer || ""}>
      <div className={classNames.primaryLinks || ""}>
        {primaryLinks.map((link) => (
          <a key={`${variant}-${link.href}`} href={link.href} className={classNames.link || ""}>
            {link.label}
          </a>
        ))}
      </div>

      <div className={classNames.businessName || ""}>
        {siteConfig.businessName}
      </div>

      <div className={classNames.policyLinks || ""}>
        <a href={siteConfig.footerLinks.privacy} className={classNames.policyLink || ""}>
          Privacy Policy
        </a>
        <span className={classNames.policyDivider || ""}>•</span>
        <a href={siteConfig.footerLinks.terms} className={classNames.policyLink || ""}>
          Terms
        </a>
        <span className={classNames.policyDivider || ""}>•</span>
        <a href={siteConfig.footerLinks.contact} className={classNames.policyLink || ""}>
          Contact
        </a>
      </div>
    </footer>
  );
}