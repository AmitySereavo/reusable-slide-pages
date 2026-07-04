const updatedDate = "July 3, 2026";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main style={styles.page}>
      <article style={styles.document}>
        <p style={styles.kicker}>Reusable Slides</p>
        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.updated}>Last updated: {updatedDate}</p>

        <Section title="Using The Platform">
          <p>
            By using this platform, you agree to provide accurate information,
            respect account and content access controls, and use purchased or
            protected content only through the access granted to you.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            Some content and purchases require an account. You are responsible for
            keeping login details secure. If an account is created automatically for
            purchase delivery, you should change the generated password after first
            login.
          </p>
        </Section>

        <Section title="Purchases, Tickets, And Digital Content">
          <p>
            Ticket, digital-content, store-credit, gift-card, merchandise, and meal
            add-on purchases are subject to the details shown during checkout.
            Digital access may require a verified email address and an active
            purchased item record.
          </p>
          <p>
            Tickets, protected media, downloads, and purchase-recipient access may
            be delivered by private links or account access. Users should not share
            private links with unauthorized persons.
          </p>
        </Section>

        <Section title="Purchasing For Others">
          <p>
            When purchasing for someone else, you must enter accurate recipient
            information. Recipients may need to accept an invitation or verify their
            email address before certain items can be assigned or delivered.
          </p>
          <p>
            Gift claims, reminders, expiration windows, store-credit returns, and
            claim requirements may vary by product and will be defined in the
            applicable checkout or account flow.
          </p>
        </Section>

        <Section title="Store Credit And Currency">
          <p>
            Store credit may have restrictions based on how it was issued. Returned
            store credit, purchased store credit, gift cards, and exchange-rate
            displays may be treated differently by product type, recipient flow, or
            shop setting.
          </p>
        </Section>

        <Section title="Content Sequences And Communications">
          <p>
            Some experiences unlock content over time through email or account-based
            sequences. A sequence may depend on email verification, link clicks,
            previous content access, tags, or timing rules configured by the site
            administrator.
          </p>
        </Section>

        <Section title="Refunds And Event Changes">
          <p>
            Refund, exchange, credit, cancellation, and event-change rules may vary
            by product, ticket, event, or promotion. When a product-specific policy
            is shown during checkout or in a receipt, that policy controls that
            purchase.
          </p>
        </Section>

        <Section title="Platform Changes">
          <p>
            This platform is actively developed. Features, dashboard tools, product
            flows, and content formats may change as the reusable slide system is
            improved.
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
