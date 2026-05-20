import Link from "next/link";
import "../styles/auth.css";
import { siteConfig } from "../config/siteConfig";

export default function AuthShell({
  businessName = siteConfig.businessName,
  title = "Get Started",
  subtitle = "",
  message = "",
  messageType = "error",
  footerLinks = siteConfig.footerLinks,
  children,
  bottomLinks,
  auxiliaryLinks = [],
}) {
  const messageClassName = message
    ? `auth-message auth-message-${messageType}`
    : "";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        {children}

        {message ? <p className={messageClassName}>{message}</p> : null}

        {auxiliaryLinks?.length ? (
          <div className="auth-switch">
            {auxiliaryLinks.map((link, index) => (
              <div key={`${link.href}-${index}`}>
                <Link href={link.href}>{link.label}</Link>
              </div>
            ))}
          </div>
        ) : null}

        {bottomLinks ? (
          <div className="auth-switch">
            {bottomLinks.prefix}{" "}
            <Link href={bottomLinks.href}>{bottomLinks.label}</Link>
          </div>
        ) : null}

        <div className="auth-footer">
          <p>{businessName}</p>
          <div className="auth-footer-links">
            <Link href={footerLinks.privacy}>Privacy Policy</Link>
            <Link href={footerLinks.terms}>Terms</Link>
            <Link href={footerLinks.contact}>Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}