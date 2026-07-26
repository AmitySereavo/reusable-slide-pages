const staticAssetExcludes = [
  "./.git/**/*",
  "./.next/cache/**/*",
  "./public/media/**/*",
  "./node_modules/.cache/**/*",
];

const nextConfig = {
  outputFileTracingExcludes: {
    "/*": staticAssetExcludes,
    "/api/account/identity-verification/file": [
      ...staticAssetExcludes,
      "./protected-uploads/**/*",
    ],
    "/api/downloads/*": [
      ...staticAssetExcludes,
      "./public/**/*",
    ],
  },
};

export default nextConfig;
