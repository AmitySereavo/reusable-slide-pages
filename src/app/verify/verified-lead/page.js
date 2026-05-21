"use client";

import AuthShell from "@/customerAccess/components/AuthShell";

export default function VerifiedLeadPage() {
  return (
    <AuthShell
      title="You're confirmed"
      subtitle="Your contact details have been verified successfully."
      message="Thanks for confirming your details. You’re now on the list, and we’ll keep you updated."
      messageType="success"
    >
      <div className="auth-form" />
    </AuthShell>
  );
}