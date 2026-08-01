export type ClientDeviceProfile = {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  softwareType: string;
  browser: string;
  os: string;
  platform: string;
  userAgent: string;
  language: string;
  languages: string[];
  timezone: string;
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  touch: {
    enabled: boolean;
    maxTouchPoints: number;
  };
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

function detectBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/SamsungBrowser\//i.test(userAgent)) return "Samsung Internet";
  if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) return "Opera";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/CriOS\//i.test(userAgent) || /Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "Unknown browser";
}

function detectOs(userAgent: string, platform: string) {
  const combined = `${userAgent} ${platform}`;

  if (/Android/i.test(combined)) return "Android";
  if (/iPhone|iPad|iPod/i.test(combined)) return "iOS / iPadOS";
  if (/Windows/i.test(combined)) return "Windows";
  if (/Macintosh|Mac OS/i.test(combined)) return "macOS";
  if (/Linux/i.test(combined)) return "Linux";
  return "Unknown OS";
}

function detectDeviceType(userAgent: string, maxTouchPoints: number) {
  const width = typeof window !== "undefined" ? window.innerWidth : 0;
  const height = typeof window !== "undefined" ? window.innerHeight : 0;
  const smallestSide = Math.min(width || 0, height || 0);

  if (/iPad|Tablet/i.test(userAgent)) return "tablet";
  if (/Mobile|iPhone|iPod|Android/i.test(userAgent) && smallestSide < 768) {
    return "mobile";
  }
  if (maxTouchPoints > 1 && smallestSide >= 768) return "tablet";
  if (width || height) return "desktop";
  return "unknown";
}

export function getClientDeviceProfile(): ClientDeviceProfile | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const userAgent = navigator.userAgent || "";
  const platform =
    // userAgentData is intentionally read defensively because it is browser-specific.
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    "";
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent, platform);
  const deviceType = detectDeviceType(userAgent, maxTouchPoints);
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone";

  return {
    deviceType,
    softwareType: `${browser} on ${os}`,
    browser,
    os,
    platform,
    userAgent,
    language: navigator.language || "",
    languages: Array.from(navigator.languages || []),
    timezone,
    screen: {
      width: Number(window.screen?.width || 0),
      height: Number(window.screen?.height || 0),
      pixelRatio: Number(window.devicePixelRatio || 1),
    },
    viewport: {
      width: Number(window.innerWidth || 0),
      height: Number(window.innerHeight || 0),
    },
    touch: {
      enabled: maxTouchPoints > 0,
      maxTouchPoints,
    },
    hardwareConcurrency: navigator.hardwareConcurrency || undefined,
    deviceMemory:
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ||
      undefined,
  };
}
