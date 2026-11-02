export const koboToNaira = (kobo: number): string => {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(naira);
};

export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
};
/** Convert decimal NGN to integer kobo without rounding a floating-point value. */
export const parseNairaToKobo = (input: string): number | null => {
  if (!/^(0|[1-9]\d*)(\.\d{0,2})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
};
