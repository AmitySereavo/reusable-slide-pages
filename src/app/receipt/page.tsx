import type { Metadata } from "next";
import ReceiptLookupClient from "./ReceiptLookupClient";

export const metadata: Metadata = {
  title: "Little Orchard Receipt Lookup",
  description:
    "Look up your Little Orchard Shop receipt with your name or email and receipt code.",
};

export default function ReceiptLookupPage() {
  return <ReceiptLookupClient />;
}
