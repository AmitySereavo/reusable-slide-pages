declare module "@/customerAccess/components/verificationCodePanel.jsx" {
  import type { ComponentType } from "react";

  export type VerificationPendingContext = {
    identifier: string;
    delivery?: "code" | "link";
    method?: string;
    target?: string | null;
    successRedirect?: string | null;
    expiresInMinutes?: number;
    expiresInHours?: number;
    phoneChannel?: string | null;
  };

  export type VerificationCodePanelMessage = {
    message: string;
    type: "error" | "info" | "success";
  };

  export type VerificationCodePanelProps = {
    pendingContext: VerificationPendingContext | null;
    routes?: {
      login?: string;
    };
    classNames?: {
      form?: string;
      helpText?: string;
      codeGroup?: string;
      codeBox?: string;
      primaryButton?: string;
      secondaryButton?: string;
    };
    onVerified?: (payload: {
      data: unknown;
      identifier: string;
    }) => void;
    onMessage?: (payload: VerificationCodePanelMessage) => void;
    autoSend?: boolean;
  };

  const VerificationCodePanel: ComponentType<VerificationCodePanelProps>;

  export default VerificationCodePanel;
}
