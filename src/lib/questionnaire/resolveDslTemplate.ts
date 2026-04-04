export function resolveDslTemplate(
  dsl: string,
  variables?: Record<string, string | number>
) {
  if (!variables) return dsl;

  return dsl.replace(/\[([^\]]+)\]/g, (match, key) => {
    const value = variables[key];

    if (value === undefined || value === null) {
      return match;
    }

    return String(value);
  });
}