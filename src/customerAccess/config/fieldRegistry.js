import { AUTH_RULES } from "./authRules";

export const fieldRegistry = {
  firstName: {
    name: "firstName",
    label: "First Name",
    type: "text",
    placeholder: "Enter your first name",
    validation: {
      minLength: 2,
      maxLength: 50,
    },
  },

  lastName: {
    name: "lastName",
    label: "Last Name",
    type: "text",
    placeholder: "Enter your last name",
    validation: {
      minLength: 2,
      maxLength: 50,
    },
  },

  fullName: {
    name: "fullName",
    label: "Full Name",
    type: "text",
    placeholder: "Enter your full name",
    validation: {
      minLength: 2,
      maxLength: 100,
    },
  },

  identifier: {
    name: "identifier",
    label: "Email or Phone Number",
    type: "text",
    placeholder: "Enter your email or phone number",
    validation: {
      identifier: true,
      minPhoneLength: AUTH_RULES.phone.minLength,
    
    },
  },

  email: {
    name: "email",
    label: "Email Address",
    type: "email",
    placeholder: "Enter your email address",
    validation: {
      email: true,
    },
  },

  phone: {
    name: "phone",
    label: "Phone Number",
    type: "text",
    placeholder: "Enter your phone number",
    validation: {
      phone: true,
      minLength: AUTH_RULES.phone.minLength,
      maxLength: AUTH_RULES.phone.maxLength,
    },
  },

  phoneVerificationChannel: {
    name: "phoneVerificationChannel",
    label: "Send verification code by",
    type: "radio",
    options: [
      { label: "WhatsApp", value: "whatsapp" },
      { label: "SMS", value: "sms" },
    ],
  },

  password: {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
  },

  confirmPassword: {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password",
    placeholder: "Re-enter your password",
  },

  country: {
    name: "country",
    label: "Country",
    type: "text",
    placeholder: "Enter your country",
    validation: {
      minLength: 2,
      maxLength: 60,
    },
  },

  city: {
    name: "city",
    label: "City",
    type: "text",
    placeholder: "Enter your city",
    validation: {
      minLength: 2,
      maxLength: 60,
    },
  },

  addressLine1: {
    name: "addressLine1",
    label: "Address Line 1",
    type: "text",
    placeholder: "Enter your address",
    validation: {
      minLength: 5,
      maxLength: 120,
    },
  },

  addressLine2: {
    name: "addressLine2",
    label: "Address Line 2",
    type: "text",
    placeholder: "Apartment, suite, etc. (optional)",
    validation: {
      maxLength: 120,
    },
  },

  postalCode: {
    name: "postalCode",
    label: "Postal Code",
    type: "text",
    placeholder: "Enter your postal code",
    validation: {
      minLength: 3,
      maxLength: 20,
    },
  },

  businessName: {
    name: "businessName",
    label: "Business Name",
    type: "text",
    placeholder: "Enter your business name",
    validation: {
      minLength: 2,
      maxLength: 100,
    },
  },

  preferredContactMethod: {
    name: "preferredContactMethod",
    label: "Preferred Contact Method",
    type: "select",
    options: [
      { label: "Email", value: "email" },
      { label: "Phone", value: "phone" },
      { label: "WhatsApp", value: "whatsapp" },
    ],
  },

  updatesOptIn: {
    name: "updatesOptIn",
    label: "Send me updates",
    type: "checkbox",
  },

  idPhoto: {
    name: "idPhoto",
    label: "Upload ID Photo",
    type: "file",
    accept: "image/*",
  },
};