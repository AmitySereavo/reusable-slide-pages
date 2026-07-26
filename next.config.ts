const sharedFileRouteExcludes = [
  "./.git/**/*",
  "./.next/cache/**/*",
  "./protected-media/**/*",
  "./public/media/**/*",
  "./private-downloads/**/*",
  "./node_modules/.cache/**/*",
];

const nextConfig = {
  outputFileTracingExcludes: {
    "/api/account/identity-verification/file": sharedFileRouteExcludes,
    "/api/downloads/[downloadkey]": sharedFileRouteExcludes,
  },
};

export default nextConfig;
