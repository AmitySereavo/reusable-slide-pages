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

  },//end of targets

};//end of verificationContent