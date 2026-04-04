export const seedDslVersions = {
  v1: "src/config/questionnaires/seedDsl.txt",
  v2: "src/config/questionnaires/seedDsl2.txt",
} as const;

export type SeedDslVersionKey = keyof typeof seedDslVersions;