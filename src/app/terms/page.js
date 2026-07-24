const updatedDate = "July 23, 2026";

export const metadata = {
  title: "Terms of Service | Para-life Trees",
};

export default function TermsPage() {
  return (
    <main style={styles.page}>
      <article style={styles.document}>
        <p style={styles.kicker}>Para-life Trees</p>
        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.brandLine}>The Farm at Little Orchard</p>
        <p style={styles.updated}>Last updated: {updatedDate}</p>

        <Section title="Using This Website">
          <p>
            By using the Para-life Trees and The Farm at Little Orchard website,
            giveaway forms, shop flows, order-status pages, and related links,
            you agree to provide accurate information and use the site for
            genuine plant, order, pickup, delivery, and gardening-interest
            purposes.
          </p>
        </Section>

        <Section title="Plant Orders">
          <p>
            Plant photos, descriptions, sizes, prices, and quantities are shown
            to help customers choose. Availability may change quickly during
            events. An order is not fully secured until payment is confirmed by
            authorized staff.
          </p>
          <p>
            Nursery stock requests may show a zero price because availability,
            final price, delivery timing, or pickup arrangements must be
            confirmed by a representative before payment is finalized.
          </p>
        </Section>

        <Section title="Payment And Confirmation">
          <p>
            Accepted payment methods may include cash, card, bank transfer,
            remittance, or another method agreed with staff. Payment confirmation
            must be recorded by authorized staff before items are treated as
            secured.
          </p>
        </Section>

        <Section title="Pickup And Delivery">
          <p>
            Event pickup is available only during the stated event period. Once
            an event has passed, event pickup may be disabled and customers may
            need to use another pickup point, paid delivery, or nursery stock
            follow-up.
          </p>
          <p>
            Delivery may require a valid address, phone contact, and additional
            delivery fees. Pickup and delivery details may be adjusted by staff
            when necessary to complete the order.
          </p>
        </Section>

        <Section title="Giveaway Participation">
          <p>
            Giveaway sign-up does not guarantee that a specific plant will be
            received. Answers help shape what Para-life Trees and Little Orchard
            grow, source, or offer whenever practical. Additional conditions may
            apply to promotional plant offers.
          </p>
        </Section>

        <Section title="Communications">
          <p>
            If you choose to receive messages by WhatsApp, email, phone call, or
            SMS, we may contact you about orders, pickup, delivery, plant
            availability, giveaway updates, care guidance, and relevant offers.
            You may ask us to stop promotional messages.
          </p>
        </Section>

        <Section title="Changes And Corrections">
          <p>
            We may correct product details, prices, stock counts, pickup
            information, or order records when errors, testing, event movement,
            or stock changes require it.
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
