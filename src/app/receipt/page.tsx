import type { Metadata } from "next";
import ReceiptLookupClient from "./ReceiptLookupClient";

export const metadata: Metadata = {
  title: "Receipt Lookup",
  description: "Look up your shop receipt with your name or email and receipt code.",
};

export default function ReceiptLookupPage() {
  return <ReceiptLookupClient />;
}
