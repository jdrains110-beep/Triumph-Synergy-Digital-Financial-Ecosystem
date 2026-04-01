export const SUPPORTED_LOCALES = ["en", "es", "fr", "pt", "hi", "zh"];
export const DEFAULT_LOCALE = "en";

type ResolveParams = {
  cookieLocale?: string;
  acceptLanguage?: string | null;
  country?: string | null;
};

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  AR: "es",
  BO: "es",
  BR: "pt",
  CL: "es",
  CO: "es",
  EC: "es",
  ES: "es",
  FR: "fr",
  GT: "es",
  HN: "es",
  IN: "hi",
  MX: "es",
  NI: "es",
  PA: "es",
  PE: "es",
  PY: "es",
  SV: "es",
  UY: "es",
  VE: "es",
  PT: "pt",
  TW: "zh",
  HK: "zh",
  CN: "zh",
  SG: "zh",
};

const normalizeLocale = (value?: string | null) =>
  value?.toLowerCase().split(/[._-]/)[0];

const fromAcceptLanguage = (acceptLanguage?: string | null) => {
  if (!acceptLanguage) {
    return null;
  }
  return (
    acceptLanguage
      .split(",")
      .map((entry) => entry.trim().split(";")[0])
      .map(normalizeLocale)
      .find((loc) => loc && SUPPORTED_LOCALES.includes(loc)) || null
  );
};

export const resolveLocale = ({
  cookieLocale,
  acceptLanguage,
  country,
}: ResolveParams) => {
  const cookieCandidate = normalizeLocale(cookieLocale);
  if (cookieCandidate && SUPPORTED_LOCALES.includes(cookieCandidate)) {
    return cookieCandidate;
  }

  const headerCandidate = fromAcceptLanguage(acceptLanguage);
  if (headerCandidate && SUPPORTED_LOCALES.includes(headerCandidate)) {
    return headerCandidate;
  }

  const countryCandidate = normalizeLocale(country);
  if (countryCandidate) {
    const mapped = COUNTRY_LOCALE_MAP[countryCandidate.toUpperCase()];
    if (mapped && SUPPORTED_LOCALES.includes(mapped)) {
      return mapped;
    }
  }

  return DEFAULT_LOCALE;
};
