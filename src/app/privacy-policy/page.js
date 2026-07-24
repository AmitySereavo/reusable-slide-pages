const updatedDate = "July 23, 2026";

export const metadata = {
  title: "Privacy Policy | Para-life Trees",
};

export default function PrivacyPolicyPage() {
  return (
    <main style={styles.page}>
      <article style={styles.document}>
        <p style={styles.kicker}>Para-life Trees</p>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.brandLine}>The Farm at Little Orchard</p>
        <p style={styles.updated}>Last updated: {updatedDate}</p>

        <Section title="What We Collect">
          <p>
            We collect the information you enter into our giveaway, shop, order,
            pickup, and delivery forms. This may include your name, phone number,
            WhatsApp number, email address, pickup choice, delivery address,
            order details, plant preferences, gardening answers, and consent
            choices.
          </p>
          <p>
            We may also record basic activity connected to the plant shop, such
            as which product photos were viewed or which product quantities were
            adjusted. This helps us understand demand and prepare better stock.
          </p>
        </Section>

        <Section title="How We Use Information">
          <p>
            We use your information to record plant orders, send receipts,
            confirm payment, prepare pickup or delivery, contact you about plant
            availability, send giveaway updates, and share care guidance or
            related Para-life Trees and Little Orchard offers when you choose to
            receive them.
          </p>
        </Section>

        <Section title="WhatsApp, Email, And Phone Contact">
          <p>
            If you choose WhatsApp, email, phone call, or SMS, we use that method
            to follow up about your order, giveaway participation, pickup
            instructions, delivery progress, payment instructions, and relevant
            plant-care or promotional messages. You can ask us to stop marketing
            messages at any time.
          </p>
        </Section>

        <Section title="Orders And Pickup">
          <p>
            Order records may be visible to authorized Para-life Trees or Little
            Orchard staff so they can prepare plants, confirm payment, manage
            inventory, and assist you at an event or pickup point.
          </p>
        </Section>

        <Section title="Sharing">
          <p>
            We do not sell your personal information. We may share limited order
            or delivery details with people helping us fulfill your order, such
            as staff, pickup partners, couriers, or service providers who help
            operate the website or messaging systems.
          </p>
        </Section>

        <Section title="Data Care">
          <p>
            We use reasonable administrative and technical safeguards to protect
            your information. No online system is perfect, so please avoid
            sharing private order-status links publicly.
          </p>
        </Section>

        <Section title="Your Choices">
          <p>
            You may contact Para-life Trees to update contact details, ask about
            an order, request changes to marketing preferences, or ask questions
            about how your information is used.
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
    background: "#F6F0E3",
    color: "#201c1d",
    minHeight: "100vh",
    padding: "40px 16px",
  },
  document: {
    background: "#fffdfa",
    border: "1px solid rgba(156, 121, 55, 0.32)",
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
    color: "#355E3B",
    fontSize: "clamp(32px, 6vw, 52px)",
    lineHeight: 1,
    margin: "10px 0 4px",
  },
  brandLine: {
    color: "#7B3F2A",
    fontWeight: 800,
    margin: "0 0 8px",
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
