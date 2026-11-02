export const FONTS = {
  Satoshi: {
    Light: "Satoshi-Light",
    Regular: "Satoshi-Regular",
    Medium: "Satoshi-Medium",
    Bold: "Satoshi-Bold",
    Black: "Satoshi-Black",
    Italic: "Satoshi-Italic",
  },
  SpaceMono: "SpaceMono",
} as const;

export const DEFAULT_FONT = FONTS.Satoshi.Regular;

export type FontFamily =
  (typeof FONTS.Satoshi)[keyof typeof FONTS.Satoshi] | typeof FONTS.SpaceMono;

/** Explicit font families override the default; size, color and weight utilities still compose. */
export const defaultFontClassName = (className = "") =>
  /(?:^|\s)(?:[\w-]+:)*font-(?:satoshi(?:-[\w]+)?|sans|serif|mono|\[[^\]]+\])(?:\s|$)/.test(
    className,
  )
    ? className
    : `font-sans ${className}`.trim();
