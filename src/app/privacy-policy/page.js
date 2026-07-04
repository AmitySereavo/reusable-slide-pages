const updatedDate = "July 3, 2026";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main style={styles.page}>
      <article style={styles.document}>
        <p style={styles.kicker}>Reusable Slides</p>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.updated}>Last updated: {updatedDate}</p>

        <Section title="What We Collect">
          <p>
            We collect information you enter into the platform, including your name,
            email address, phone number, location, account details, ticket-owner
            details, purchase-recipient details, meal selections, questionnaire
            answers, and support-related information.
          </p>
          <p>
            We also store activity created by your use of the site, including login
            status, email verification status, purchased items, tickets, receipts,
            video progress, content unlocks, email-sequence events, and download
            entitlements.
          </p>
        </Section>

        <Section title="How We Use Information">
          <p>
            We use information to create and manage accounts, process purchases,
            deliver protected digital content, send ticket and recipient links,
            manage store credit and gift claims, personalize user flows, improve the
            platform, and provide customer support.
          </p>
          <p>
            If you sign up for a lead-nurturing or content sequence, we use your
            account tags and email activity to decide when to send the next message
            or unlock the next piece of content.
          </p>
        </Section>

        <Section title="Purchases For Others">
          <p>
            When a purchaser adds someone as a recipient, we store the recipient's
            name and email address so the recipient can confirm the relationship and
            receive eligible tickets, gifts, or product access. Physical delivery
            details may be requested before physical products are fulfilled.
          </p>
        </Section>

        <Section title="Email And Messaging">
          <p>
            We send operational emails such as verification links, password reset
            messages, ticket access, purchase-recipient invitations, protected media
            links, and purchase confirmations. We may also send marketing or nurture
            emails when the user has entered a flow that expects those messages.
          </p>
        </Section>

        <Section title="Who Can See The Data">
          <p>
            Authorized administrators can review user and lead records in order to
            operate the site, support customers, understand purchases, and improve
            the experience. We do not sell personal information.
          </p>
        </Section>

        <Section title="Data Protection">
          <p>
            We use account access controls, password hashing, verification links,
            protected media checks, and admin-only dashboard sections to reduce
            unauthorized access. No system is perfect, so users should keep account
            credentials private and report suspicious activity.
          </p>
        </Section>

        <Section title="Your Choices">
          <p>
            You can update account information, request password resets, unsubscribe
            from non-operational email sequences where available, or contact support
            about account and data questions. Operational emails may still be sent
            when needed to provide account, purchase, verification, or security
            services.
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>{title}</h2>
      <div style={styles.copy}>{children}</div>
    </section>
  );
}

const styles = {
  page: {
    background: "#f5f2ee",
    color: "#201c1d",
    minHeight: "100vh",
    padding: "40px 16px",
  },
  document: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "820px",
    padding: "clamp(22px, 5vw, 48px)",
  },
  kicker: {
    color: "#2f7440",
    fontWeight: 900,
    margin: 0,
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(32px, 6vw, 52px)",
    lineHeight: 1,
    margin: "10px 0",
  },
  updated: {
    color: "#6b625c",
    margin: "0 0 28px",
  },
  section: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    padding: "22px 0 0",
    marginTop: "22px",
  },
  heading: {
    fontSize: "20px",
    margin: "0 0 10px",
  },
  copy: {
    color: "#4d4540",
    fontSize: "16px",
    lineHeight: 1.65,
  },
};
