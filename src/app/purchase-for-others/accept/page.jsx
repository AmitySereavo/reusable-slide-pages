import AcceptPurchaseRecipientClient from "./AcceptPurchaseRecipientClient";

export const metadata = {
  title: "Accept Purchase Recipient Invite",
};

export default async function AcceptPurchaseRecipientPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return <AcceptPurchaseRecipientClient token={token} />;
}
