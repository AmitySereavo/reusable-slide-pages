import type { ThemeConfig } from "@/types/questionnaire";

export type ResolvedButtonStyle = {
  background: string;
  color: string;
  borderColor: string;
};

export function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (clean.length !== 6) return null;

  const num = Number.parseInt(clean, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getContrastTextColor(background: string) {
  const rgb = hexToRgb(background);

  if (!rgb) return "#FFFFFF";

  const luminance =
    (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

export function withOpacity(color: string, opacity?: number) {
  if (opacity === undefined) return color;

  const normalized = Math.max(0, Math.min(1, opacity));
  const rgb = hexToRgb(color);

  if (!rgb) return color;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${normalized})`;
}

export function resolveStyleColor(theme: ThemeConfig, styleKey?: string) {
  if (!styleKey) return null;

  if (styleKey === "primary") return theme.colors.primary;
  if (styleKey === "accent") return theme.colors.accent ?? theme.colors.primary;
  if (styleKey === "card") return theme.colors.card;
  if (styleKey === "text") return theme.colors.text;

  return theme.colors.lineColors?.[styleKey] ?? null;
}

export function resolveButtonStyle(
  theme: ThemeConfig,
  styleKey: string | undefined,
  fallback: "primary" | "secondary"
): ResolvedButtonStyle {
  if (styleKey === "secondary") {
    return {
      background: "#FFFFFF",
      color: theme.colors.text,
      borderColor: theme.colors.border,
    };
  }

  if (styleKey === "ghost") {
    return {
      background: "transparent",
      color: theme.colors.text,
      borderColor: theme.colors.border,
    };
  }

  const resolvedColor = resolveStyleColor(theme, styleKey);

  if (resolvedColor) {
    return {
      background: resolvedColor,
      color: getContrastTextColor(resolvedColor),
      borderColor: resolvedColor,
    };
  }

  if (fallback === "primary") {
    return {
      background: theme.colors.primary,
      color: getContrastTextColor(theme.colors.primary),
      borderColor: theme.colors.primary,
    };
  }

  return {
    background: "#FFFFFF",
    color: theme.colors.text,
    borderColor: theme.colors.border,
  };
}

export function shouldShowAuthFooter(slug: string) {
  return slug.startsWith("auth-");
}

export function isTransparentColor(value?: string) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "transparent" ||
    normalized === "none" ||
    normalized === "rgba(0,0,0,0)" ||
    normalized === "rgba(0, 0, 0, 0)"
  );
}