export function formatCurrency(amount: number, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}

export function formatWeight(weight: number, weightUnit = "lb") {
  return `${weight.toLocaleString()} ${weightUnit}`;
}
