"use client";

import LeadCaptureForm from "@/customerAccess/components/LeadCaptureForm";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { readLocalEngagementSnapshot } from "@/lib/questionnaire/engagementTracking";
import styles from "../QuestionnaireShell.module.css";

type AuthFormSlideRendererProps = {
  formKey?: string;
  title?: string;
  subtitle?: string;
  questionnaireSlug: string;
  answers: QuestionnaireAnswers;
  loginHref?: string;
  onSuccess: () => void;
};

export default function AuthFormSlideRenderer({
  formKey,
  title,
  subtitle,
  questionnaireSlug,
  answers,
  loginHref,
  onSuccess,
}: AuthFormSlideRendererProps) {
  const isGatedLeadCapture = formKey === "gatedLeadCapture";

  if (formKey !== "leadCapture" && formKey !== "gatedLeadCapture") {
    return (
      <p className={styles.formError}>
        Unsupported auth form: {formKey || "missing"}
      </p>
    );
  }

  return (
    <div className={styles.authFormEmbedFullBleed}>
      <LeadCaptureForm
        title={title || "Stay connected"}
        routes={loginHref ? { login: loginHref } : {}}
        subtitle={
          subtitle ||
          (isGatedLeadCapture
            ? "Sign up and check your email for the private link to continue watching."
            : undefined)
        }
        config={{
          mode: "lead-capture",
          target: isGatedLeadCapture ? "gatedLeadAccess" : "lead",
          fields: {
            fullName: { visible: true, required: true },
            identifier: {
              visible: true,
              required: true,
              allow: isGatedLeadCapture ? ["email"] : ["email", "phone"],
              helpText: isGatedLeadCapture
                ? "Use your email so we can send the private video link."
                : "Use your email or WhatsApp number. If using phone, include country code and area code.",
            },
            updatesOptIn: {
              visible: true,
              required: false,
              defaultValue: true,
            },
          },
          verification: {
            required: false,
            autoStart: false,
            method: "email",
            delivery: "link",
            redirectToVerifyPage: false,
            successRedirect: null,
            verifiedContentRedirect: null,
            expiresInMinutes: 15,
            expiresInHours: 24,
            promptForPhoneChannel: false,
            defaultPhoneChannel: "whatsapp",
            phoneChannelOptions: ["whatsapp", "sms"],
            phoneChannelLabel: "Send verification by",
          },
          submit: {
            endpoint: isGatedLeadCapture
              ? "/api/auth/temporary-lead-account"
              : "/api/questionnaires/submit",
            method: "POST",
            buttonLabel: isGatedLeadCapture
              ? "Email My Private Link"
              : "Stay Connected",
            successMessage: isGatedLeadCapture
              ? "Check your email for the private link to continue watching."
              : "Your info was submitted.",
            successRedirect: null,
            redirectDelayMs: 0,
          },
        }}
        onSubmit={async ({
          formData,
          setMessage,
          setMessageType,
        }: {
          formData: Record<string, unknown>;
          setMessage: (message: string) => void;
          setMessageType: (type: "error" | "info" | "success") => void;
        }) => {
          const identifier = String(formData.identifier ?? "").trim();
          const isEmail = identifier.includes("@");

          const endpoint = isGatedLeadCapture
            ? "/api/auth/temporary-lead-account"
            : "/api/questionnaires/submit";

          const payload = isGatedLeadCapture
            ? {
                questionnaireSlug,
                source: "invitation-lead-gate",
                goto: "second-video",
                fullName: String(formData.fullName ?? "").trim(),
                identifier,
                updatesOptIn: formData.updatesOptIn === true,
                answers: {
                  ...answers,
                  gatedLeadCapture: formData,
                },
                engagementSnapshot:
                  readLocalEngagementSnapshot(questionnaireSlug),
              }
            : {
                questionnaireSlug,
                fullName: String(formData.fullName ?? "").trim(),
                email: isEmail ? identifier : "",
                phone: isEmail ? "" : identifier,
                whatsappOptIn: formData.updatesOptIn === true,
                answers: {
                  ...answers,
                  leadCapture: formData,
                },
              };

          const response = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            setMessage(
              data?.details ||
                data?.error ||
                "Your information could not be submitted."
            );
            setMessageType("error");
            return;
          }

          setMessage(
            data?.message ||
              (isGatedLeadCapture
                ? "Check your email for the private link to continue watching."
                : "Your info was submitted.")
          );
          setMessageType("success");

          window.setTimeout(() => {
            onSuccess();
          }, 700);
        }}
      />
    </div>
  );
}