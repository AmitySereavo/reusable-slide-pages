function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function greetingText(recipientName) {
  const name = String(recipientName ?? "").trim();

  return name ? `Hi ${name},\n\n` : "";
}

function greetingHtml(recipientName) {
  const name = String(recipientName ?? "").trim();

  return name ? `<p>Hi ${escapeHtml(name)},</p>` : "";
}

export const verificationContent = {
  defaults: {
    code: {
      email: {
        subject: "Your verification code",
        getText: ({ code }) => `Your verification code is: ${code}`,
        getHtml: ({ code }) =>
          `<p>Your verification code is: <strong>${code}</strong></p>`,
      },
      sms: {
        getText: ({ code }) => `Your verification code is: ${code}`,
      },
      whatsapp: {
        getText: ({ code }) => `Your verification code is: ${code}`,
      },
    },

    link: {
      email: {
        subject: "Verify your details",
        getText: ({ verifyUrl }) =>
          `Use this link to verify your details: ${verifyUrl}`,
        getHtml: ({ verifyUrl }) =>
          `<p>Use this link to verify your details:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      },
      sms: {
        getText: ({ verifyUrl }) =>
          `Use this link to verify your details: ${verifyUrl}`,
      },
      whatsapp: {
        getText: ({ verifyUrl }) =>
          `Use this link to verify your details: ${verifyUrl}`,
      },
    },
  },

  targets: {
    user: {
      code: {
        email: {
          subject: "Verify your account",
          getText: ({ code }) =>
            `Use this verification code to finish setting up your account: ${code}`,
          getHtml: ({ code }) =>
            `<p>Use this verification code to finish setting up your account:</p><p><strong>${code}</strong></p>`,
        },
        sms: {
          getText: ({ code }) =>
            `Use this verification code to finish setting up your account: ${code}`,
        },
        whatsapp: {
          getText: ({ code }) =>
            `Use this verification code to finish setting up your account: ${code}`,
        },
      },
      link: {
        email: {
          subject: "Verify your account",
          getText: ({ verifyUrl }) =>
            `Use this link to finish setting up your account: ${verifyUrl}`,
          getHtml: ({ verifyUrl }) =>
            `<p>Use this link to finish setting up your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        },
        sms: {
          getText: ({ verifyUrl }) =>
            `Use this link to finish setting up your account: ${verifyUrl}`,
        },
        whatsapp: {
          getText: ({ verifyUrl }) =>
            `Use this link to finish setting up your account: ${verifyUrl}`,
        },
      },
    },

    lead: {
      code: {
        email: {
          subject: "Confirm your details",
          getText: ({ code }) =>
            `Please confirm your details using this verification code: ${code}`,
          getHtml: ({ code }) =>
            `<p>Please confirm your details using this verification code:</p><p><strong>${code}</strong></p>`,
        },
        sms: {
          getText: ({ code }) =>
            `Please confirm your details using this verification code: ${code}`,
        },
        whatsapp: {
          getText: ({ code }) =>
            `Please confirm your details using this verification code: ${code}`,
        },
      },
      link: {
        email: {
          subject: "Confirm your details",
          getText: ({ verifyUrl }) =>
            `Please confirm your details using this link: ${verifyUrl}`,
          getHtml: ({ verifyUrl }) =>
            `<p>Please confirm your details using this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        },
        sms: {
          getText: ({ verifyUrl }) =>
            `Please confirm your details using this link: ${verifyUrl}`,
        },
        whatsapp: {
          getText: ({ verifyUrl }) =>
            `Please confirm your details using this link: ${verifyUrl}`,
        },
      },
    },//end of lead

    accountEmailUpdate: {
      code: {
        email: {
          subject: "Confirm your new email address",
          getText: ({ code }) =>
            `Use this code to confirm your new email address: ${code}`,
          getHtml: ({ code }) =>
            `<p>Use this code to confirm your new email address:</p><p><strong>${code}</strong></p><p>If you did not request this, do not share this code.</p>`,
        },
      },
    },
    ticketOwnerAccess: {
      link: {
        email: {
          subject: ({ ticketCount }) =>
            Number(ticketCount) > 1
              ? "Your ticket access links"
              : "Your ticket access link",
          getText: ({
            verifyUrl,
            recipientName,
            ticketSummary,
            mealEditDeadlineLabel,
            loginUrl,
            forgotPasswordUrl,
            temporaryPassword,
            accountWasCreated,
            temporaryPasswordWasIssued,
          }) =>
            `${greetingText(recipientName)}You have ticket access for the event.\n\n${ticketSummary || ""}\n\nUse this private link to view your ticket and meal details: ${verifyUrl}${
              loginUrl
                ? temporaryPassword && (accountWasCreated || temporaryPasswordWasIssued)
                  ? `\n\n${
                      accountWasCreated
                        ? "We created an account for you so your ticket stays connected to your email."
                        : "We issued a fresh temporary password for your account."
                    }\nLogin URL: ${loginUrl}\nTemporary password: ${temporaryPassword}\n\nPlease change this password to something you will remember after you log in.`
                  : `\n\nThis ticket is connected to an existing account. Log in with your account to access it: ${loginUrl}${
                      forgotPasswordUrl
                        ? `\nForgot your password? Reset it here: ${forgotPasswordUrl}`
                        : ""
                    }`
                : ""
            }${
              mealEditDeadlineLabel
                ? `\n\nMeal edits are available until ${mealEditDeadlineLabel}.`
                : ""
            }\n\nIf you did not expect this ticket, you can ignore this email.`,
          getHtml: ({
            verifyUrl,
            recipientName,
            ticketSummaryHtml,
            mealEditDeadlineLabel,
            loginUrl,
            forgotPasswordUrl,
            temporaryPassword,
            accountWasCreated,
            temporaryPasswordWasIssued,
          }) =>
            `${greetingHtml(recipientName)}<p>You have ticket access for the event.</p>${
              ticketSummaryHtml || ""
            }<p>Use this private link to view your ticket and meal details:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>${
              loginUrl
                ? temporaryPassword && (accountWasCreated || temporaryPasswordWasIssued)
                  ? `<p>${
                      accountWasCreated
                        ? "We created an account for you so your ticket stays connected to your email."
                        : "We issued a fresh temporary password for your account."
                    }</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</p><p>Please change this password to something you will remember after you log in.</p>`
                  : `<p>This ticket is connected to an existing account. Log in with your account to access it: <a href="${loginUrl}">${loginUrl}</a></p>${
                      forgotPasswordUrl
                        ? `<p>Forgot your password? Reset it here: <a href="${forgotPasswordUrl}">${forgotPasswordUrl}</a></p>`
                        : ""
                    }`
                : ""
            }${
              mealEditDeadlineLabel
                ? `<p>Meal edits are available until ${escapeHtml(mealEditDeadlineLabel)}.</p>`
                : ""
            }<p>If you did not expect this ticket, you can ignore this email.</p>`,
        },
      },
    },
    gatedLeadAccess: {
      link: {
        email: {
          subject: "Your private video link",
          getText: ({ verifyUrl, recipientName }) =>
            `${greetingText(recipientName)}Use this private link to continue watching: ${verifyUrl}`,
          getHtml: ({ verifyUrl, recipientName }) =>
            `${greetingHtml(recipientName)}<p>Use this private link to continue watching:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
        },
        sms: {
          getText: ({ verifyUrl }) =>
            `Use this private link to continue watching: ${verifyUrl}`,
        },
        whatsapp: {
          getText: ({ verifyUrl }) =>
            `Use this private link to continue watching: ${verifyUrl}`,
        },
      },
    },
    escapeAlbumAccess: {
      link: {
        email: {
          subject: "Your Escape album access",
          getText: ({
            verifyUrl,
            recipientName,
            loginUrl,
            forgotPasswordUrl,
            temporaryPassword,
            accountWasCreated,
            temporaryPasswordWasIssued,
          }) =>
            `${greetingText(recipientName)}Your Escape album access is ready.\n\nOpen the album here: ${verifyUrl}${
              temporaryPassword && (accountWasCreated || temporaryPasswordWasIssued)
                ? `\n\n${
                    accountWasCreated
                      ? "We created an account for you so your album stays connected to your email."
                      : "We issued a fresh temporary password for your account."
                  }\nLogin URL: ${loginUrl}\nTemporary password: ${temporaryPassword}\n\nPlease change this password to something you will remember after you log in.`
                : `\n\nLog in with your existing account to access the album: ${loginUrl}${
                    forgotPasswordUrl
                      ? `\nForgot your password? Reset it here: ${forgotPasswordUrl}`
                      : ""
                  }`
            }\n\nIf you did not expect this email, you can ignore it.`,
          getHtml: ({
            verifyUrl,
            recipientName,
            loginUrl,
            forgotPasswordUrl,
            temporaryPassword,
            accountWasCreated,
            temporaryPasswordWasIssued,
          }) =>
            `${greetingHtml(recipientName)}<p>Your Escape album access is ready.</p><p>Open the album here: <a href="${verifyUrl}">${verifyUrl}</a></p>${
              temporaryPassword && (accountWasCreated || temporaryPasswordWasIssued)
                ? `<p>${
                    accountWasCreated
                      ? "We created an account for you so your album stays connected to your email."
                      : "We issued a fresh temporary password for your account."
                  }</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</p><p>Please change this password to something you will remember after you log in.</p>`
                : `<p>Log in with your existing account to access the album: <a href="${loginUrl}">${loginUrl}</a></p>${
                    forgotPasswordUrl
                      ? `<p>Forgot your password? Reset it here: <a href="${forgotPasswordUrl}">${forgotPasswordUrl}</a></p>`
                      : ""
                  }`
            }<p>If you did not expect this email, you can ignore it.</p>`,
        },
      },
    },
    
    passwordReset: {
      code: {
        email: {
          subject: "Your password reset code",
          getText: ({ code }) =>
            `Use this code to continue resetting your password: ${code}`,
          getHtml: ({ code }) =>
            `<p>Use this code to continue resetting your password:</p><p><strong>${code}</strong></p>`,
        },
        sms: {
          getText: ({ code }) =>
            `Use this code to continue resetting your password: ${code}`,
        },
        whatsapp: {
          getText: ({ code }) =>
            `Use this code to continue resetting your password: ${code}`,
        },
      },
      link: {
        email: {
          subject: "Reset your password",
          getText: ({ verifyUrl }) =>
            `Use this link to reset your password: ${verifyUrl}`,
          getHtml: ({ verifyUrl }) =>
            `<p>Use this link to reset your password:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        },
        sms: {
          getText: ({ verifyUrl }) =>
            `Use this link to reset your password: ${verifyUrl}`,
        },
        whatsapp: {
          getText: ({ verifyUrl }) =>
            `Use this link to reset your password: ${verifyUrl}`,
        },
      },
        },//end of passwordReset

    accountDeletion: {
      code: {
        email: {
          subject: "Confirm account deletion",
          getText: ({ code }) =>
            `Use this account deletion code to confirm deleting your account: ${code}`,
          getHtml: ({ code }) =>
            `<p>Use this account deletion code to confirm deleting your account:</p><p><strong>${code}</strong></p><p>If you did not request this, do not share this code.</p>`,
        },
        sms: {
          getText: ({ code }) =>
            `Use this account deletion code to confirm deleting your account: ${code}`,
        },
        whatsapp: {
          getText: ({ code }) =>
            `Use this account deletion code to confirm deleting your account: ${code}`,
        },
      },
      link: {
        email: {
          subject: "Confirm account deletion",
          getText: ({ verifyUrl }) =>
            `Use this link to confirm deleting your account: ${verifyUrl}`,
          getHtml: ({ verifyUrl }) =>
            `<p>Use this link to confirm deleting your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you did not request this, do not click this link.</p>`,
        },
        sms: {
          getText: ({ verifyUrl }) =>
            `Use this link to confirm deleting your account: ${verifyUrl}`,
        },
        whatsapp: {
          getText: ({ verifyUrl }) =>
            `Use this link to confirm deleting your account: ${verifyUrl}`,
        },
      },
    },//end of accountDeletion

  },//end of targets

};//end of verificationContent
