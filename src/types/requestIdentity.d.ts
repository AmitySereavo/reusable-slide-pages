declare module "@/lib/security/requestIdentity" {
  export type RequestIdentity = {
    deviceKey: string;
    ipHash: string | null;
    ipAddress: string | null;
    userAgent: string;
    acceptLanguage: string;
    platform: string;
    location: {
      city: string | null;
      region: string | null;
      country: string | null;
      timezone: string | null;
    };
  };

  export function getRequestIdentity(): Promise<RequestIdentity>;
}
