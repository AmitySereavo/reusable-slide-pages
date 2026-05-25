import type { ReactNode } from "react";

type AuthMessageType = "error" | "info" | "success";

type LeadCaptureSubmitArgs = {
  formData: Record<string, unknown>;
  config: Record<string, unknown>;
  routes: Record<string, string>;
  setMessage: (message: string) => void;
  setMessageType: (type: AuthMessageType) => void;
  pendingVerificationContext?: Record<string, unknown> | null;
};

type LeadCaptureFormProps = {
  businessName?: string;
  footerLinks?: Record<string, string>;
  routes?: Record<string, string>;
  title?: string;
  subtitle?: string;
  config?: Record<string, unknown>;
  auxiliaryLinks?: ReactNode[];
  onSubmit?: (args: LeadCaptureSubmitArgs) => void | Promise<void>;
};

export default function LeadCaptureForm(
  props: LeadCaptureFormProps
): JSX.Element;