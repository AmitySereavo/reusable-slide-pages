import { ThemeConfig } from "@/types/questionnaire";

export const seedTheme: ThemeConfig = {
  colors: {
    background: "#F4F0E6",
    card: "#FFFDF8",
    text: "#2F2618",
    primary: "#2F6B3B",
    primaryHover: "#25552F",
    soft: "#E6DDC8",
    border: "#CDBE97",
    disabled: "#D9D9D9",
    accent: "#8B6B2C",
    subtitle: "#6B5530",
    lineColors: {
      c1: "#2F6B3B",
      c2: "#8B6B2C",
      c3: "#6B5530",
      c4: "#25552F",
      c5: "#A47D2F",
    },
  },
  radius: {
    card: "24px",
    button: "14px",
    option: "14px",
  },
  shadow: {
    card: "0 20px 60px rgba(47, 107, 59, 0.12)",
  },
};