import { Suspense } from "react";
import VerifyPageClient from "./VerifyPageClient";

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}>Loading verification...</main>}>
      <VerifyPageClient />
    </Suspense>
  );
}