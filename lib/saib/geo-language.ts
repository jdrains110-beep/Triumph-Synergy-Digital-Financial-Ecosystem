/**
 * lib/saib/geo-language.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Server-side helpers that let SAIB (and any Triumph Synergy route) detect
 * the visitor's geographic region and preferred language from incoming
 * HTTP headers, then look up the matching country name + ISO-639-1 language
 * code for SAIB's LinguaSovereign engine.
 *
 * Detection precedence (most specific → most generic):
 *   1. cf-ipcountry          — Cloudflare edge geo
 *   2. x-vercel-ip-country   — Vercel edge geo
 *   3. x-country / x-geo-country / x-real-country  — custom proxy headers
 *   4. accept-language       — browser preference (used for language only)
 *   5. SAIB_DEFAULT_REGION   — env fallback
 */

export interface RegionInfo {
  country:        string;            // ISO-3166 alpha-2, e.g. "US", "NG"
  country_name:   string;            // Human-readable, e.g. "United States"
  language:       string;            // ISO-639-1, e.g. "en", "sw"
  language_name:  string;            // Human-readable, e.g. "English"
  region_group:   RegionGroup;       // Continent / market bucket
  source:         string;            // Which header provided the country
  timezone_hint:  string | null;     // Loose UTC offset for the country
  detected_at:    number;            // Unix seconds
}

export type RegionGroup =
  | "north_america"
  | "south_america"
  | "europe"
  | "africa"
  | "middle_east"
  | "south_asia"
  | "south_east_asia"
  | "east_asia"
  | "oceania"
  | "central_asia"
  | "global";

// ── Country → primary language (used by SAIB to pick the auto-translate target)
// Covers the 60 highest-Pi-Network-population countries explicitly; others
// fall back to English so SAIB can still operate sovereignly.
const COUNTRY_TO_LANG: Record<string, string> = {
  // English
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
  ZA: "en", NG: "en", KE: "en", GH: "en", UG: "en", ZW: "en",
  PH: "en", IN: "en", PK: "en", SG: "en", MY: "ms", HK: "zh-TW",
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es",
  VE: "es", EC: "es", GT: "es", CU: "es", BO: "es", DO: "es",
  HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es",
  // Portuguese
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  // French
  FR: "fr", BE: "fr", CH: "fr", SN: "fr", CI: "fr", CM: "fr",
  CD: "fr", MG: "fr", BF: "fr", ML: "fr", NE: "fr",
  // German
  DE: "de", AT: "de",
  // Italian
  IT: "it",
  // Dutch
  NL: "nl",
  // Nordic
  SE: "sv", NO: "no", DK: "da", FI: "fi", IS: "en",
  // Slavic / Eastern Europe
  RU: "ru", UA: "uk", BY: "ru", PL: "pl", CZ: "cs", SK: "sk",
  HR: "hr", RS: "sr", BG: "bg", HU: "hu", RO: "ro", GR: "el",
  // East Asia
  CN: "zh", TW: "zh-TW", JP: "ja", KR: "ko",
  // South-East Asia
  TH: "th", VN: "vi", ID: "id", MM: "my", KH: "km", LA: "lo",
  // South Asia
  BD: "bn", LK: "si", NP: "ne",
  // Middle East
  SA: "ar", AE: "ar", EG: "ar", IQ: "ar", JO: "ar", LB: "ar",
  KW: "ar", QA: "ar", OM: "ar", YE: "ar", DZ: "ar", MA: "ar",
  TN: "ar", LY: "ar", SD: "ar", SY: "ar",
  IR: "fa", AF: "fa", IL: "he", TR: "tr",
  // Africa
  ET: "am", SO: "so", TZ: "sw", RW: "sw",
  // Central Asia
  KZ: "kk", UZ: "uz",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  NZ: "New Zealand", IE: "Ireland", ZA: "South Africa", NG: "Nigeria",
  KE: "Kenya", GH: "Ghana", UG: "Uganda", ZW: "Zimbabwe",
  PH: "Philippines", IN: "India", PK: "Pakistan", SG: "Singapore",
  MY: "Malaysia", HK: "Hong Kong",
  ES: "Spain", MX: "Mexico", AR: "Argentina", CO: "Colombia",
  CL: "Chile", PE: "Peru", VE: "Venezuela", EC: "Ecuador",
  GT: "Guatemala", CU: "Cuba", BO: "Bolivia", DO: "Dominican Republic",
  HN: "Honduras", PY: "Paraguay", SV: "El Salvador", NI: "Nicaragua",
  CR: "Costa Rica", PA: "Panama", UY: "Uruguay",
  BR: "Brazil", PT: "Portugal", AO: "Angola", MZ: "Mozambique",
  FR: "France", BE: "Belgium", CH: "Switzerland",
  SN: "Senegal", CI: "Côte d'Ivoire", CM: "Cameroon", CD: "DR Congo",
  MG: "Madagascar", BF: "Burkina Faso", ML: "Mali", NE: "Niger",
  DE: "Germany", AT: "Austria", IT: "Italy", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", IS: "Iceland",
  RU: "Russia", UA: "Ukraine", BY: "Belarus", PL: "Poland",
  CZ: "Czechia", SK: "Slovakia", HR: "Croatia", RS: "Serbia",
  BG: "Bulgaria", HU: "Hungary", RO: "Romania", GR: "Greece",
  CN: "China", TW: "Taiwan", JP: "Japan", KR: "South Korea",
  TH: "Thailand", VN: "Vietnam", ID: "Indonesia", MM: "Myanmar",
  KH: "Cambodia", LA: "Laos",
  BD: "Bangladesh", LK: "Sri Lanka", NP: "Nepal",
  SA: "Saudi Arabia", AE: "United Arab Emirates", EG: "Egypt",
  IQ: "Iraq", JO: "Jordan", LB: "Lebanon", KW: "Kuwait", QA: "Qatar",
  OM: "Oman", YE: "Yemen", DZ: "Algeria", MA: "Morocco", TN: "Tunisia",
  LY: "Libya", SD: "Sudan", SY: "Syria",
  IR: "Iran", AF: "Afghanistan", IL: "Israel", TR: "Türkiye",
  ET: "Ethiopia", SO: "Somalia", TZ: "Tanzania", RW: "Rwanda",
  KZ: "Kazakhstan", UZ: "Uzbekistan",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", pt: "Portuguese", fr: "French",
  de: "German", it: "Italian", nl: "Dutch",
  sv: "Swedish", no: "Norwegian", da: "Danish", fi: "Finnish",
  ru: "Russian", uk: "Ukrainian", pl: "Polish", cs: "Czech",
  sk: "Slovak", hr: "Croatian", sr: "Serbian", bg: "Bulgarian",
  hu: "Hungarian", ro: "Romanian", el: "Greek",
  zh: "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
  ja: "Japanese", ko: "Korean",
  th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay",
  my: "Burmese", km: "Khmer", lo: "Lao",
  hi: "Hindi", bn: "Bengali", ne: "Nepali", si: "Sinhala",
  ta: "Tamil", te: "Telugu", mr: "Marathi", ur: "Urdu", pa: "Punjabi",
  gu: "Gujarati",
  ar: "Arabic", fa: "Persian", he: "Hebrew", tr: "Turkish",
  am: "Amharic", so: "Somali", sw: "Swahili", yo: "Yoruba", ig: "Igbo",
  ha: "Hausa", zu: "Zulu", af: "Afrikaans",
  kk: "Kazakh", uz: "Uzbek",
};

const REGION_GROUPS: Record<RegionGroup, ReadonlyArray<string>> = {
  north_america:    ["US", "CA", "MX"],
  south_america:    ["BR", "AR", "CO", "CL", "PE", "VE", "EC", "BO", "PY", "UY"],
  europe:           ["GB", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "CH", "AT",
                     "IE", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK", "HR",
                     "RS", "BG", "HU", "RO", "GR", "UA", "BY", "RU"],
  africa:           ["ZA", "NG", "KE", "GH", "UG", "ZW", "TZ", "ET", "RW",
                     "SN", "CI", "CM", "CD", "MG", "BF", "ML", "NE", "AO", "MZ",
                     "EG", "DZ", "MA", "TN", "LY", "SD", "SO"],
  middle_east:      ["SA", "AE", "IQ", "JO", "LB", "KW", "QA", "OM", "YE",
                     "SY", "IR", "IL", "TR"],
  south_asia:       ["IN", "PK", "BD", "LK", "NP", "AF"],
  south_east_asia:  ["PH", "ID", "MY", "TH", "VN", "MM", "KH", "LA", "SG"],
  east_asia:        ["CN", "TW", "HK", "JP", "KR"],
  oceania:          ["AU", "NZ"],
  central_asia:     ["KZ", "UZ"],
  global:           [],
};

function regionGroupFor(country: string): RegionGroup {
  for (const [group, list] of Object.entries(REGION_GROUPS) as [RegionGroup, ReadonlyArray<string>][]) {
    if (list.includes(country)) return group;
  }
  return "global";
}

const TIMEZONE_HINTS: Record<string, string> = {
  US: "UTC-5 to UTC-10", CA: "UTC-3.5 to UTC-8", MX: "UTC-6 to UTC-8",
  BR: "UTC-2 to UTC-5", GB: "UTC+0", DE: "UTC+1", FR: "UTC+1", ES: "UTC+1",
  IT: "UTC+1", NL: "UTC+1", PL: "UTC+1", RU: "UTC+2 to UTC+12",
  CN: "UTC+8", JP: "UTC+9", KR: "UTC+9", IN: "UTC+5:30", PK: "UTC+5",
  ID: "UTC+7 to UTC+9", PH: "UTC+8", VN: "UTC+7", TH: "UTC+7", MY: "UTC+8",
  SG: "UTC+8", AU: "UTC+8 to UTC+10", NZ: "UTC+12",
  ZA: "UTC+2", NG: "UTC+1", KE: "UTC+3", EG: "UTC+2",
  SA: "UTC+3", AE: "UTC+4", IR: "UTC+3:30", TR: "UTC+3", IL: "UTC+2",
};

/** Pick a country code from request headers. */
export function detectCountry(headers: Headers): { country: string; source: string } {
  const candidates: Array<[string, string]> = [
    ["cf-ipcountry",          "cloudflare"],
    ["x-vercel-ip-country",   "vercel"],
    ["x-country",             "proxy"],
    ["x-geo-country",         "proxy"],
    ["x-real-country",        "proxy"],
  ];
  for (const [h, src] of candidates) {
    const v = headers.get(h);
    if (v && v.length >= 2 && v.length <= 3) {
      return { country: v.toUpperCase(), source: src };
    }
  }
  // Last resort: parse Accept-Language for a region tag (e.g. en-NG → NG)
  const al = headers.get("accept-language");
  if (al) {
    const m = al.match(/[a-z]{2,3}-([A-Z]{2})/);
    if (m) return { country: m[1].toUpperCase(), source: "accept_language" };
  }
  return { country: process.env.SAIB_DEFAULT_REGION ?? "US", source: "default" };
}

/** Pick a preferred language: explicit ?lang= → header → country mapping. */
export function detectLanguage(headers: Headers, country: string, override?: string | null): string {
  if (override && LANGUAGE_NAMES[override]) return override;
  const al = headers.get("accept-language") ?? "";
  for (const tag of al.split(",")) {
    const code = tag.split(";")[0].trim().split("-")[0];
    if (code && LANGUAGE_NAMES[code]) return code;
  }
  return COUNTRY_TO_LANG[country] ?? "en";
}

/** Build a complete RegionInfo from a request headers object. */
export function detectRegion(headers: Headers, langOverride?: string | null): RegionInfo {
  const { country, source } = detectCountry(headers);
  const language = detectLanguage(headers, country, langOverride);
  return {
    country,
    country_name:  COUNTRY_NAMES[country]  ?? country,
    language,
    language_name: LANGUAGE_NAMES[language] ?? "English",
    region_group:  regionGroupFor(country),
    source,
    timezone_hint: TIMEZONE_HINTS[country] ?? null,
    detected_at:   Math.floor(Date.now() / 1000),
  };
}

export const COUNTRY_LANGUAGE_MAP = COUNTRY_TO_LANG;
export const LANGUAGE_NAME_MAP    = LANGUAGE_NAMES;
export const COUNTRY_NAME_MAP     = COUNTRY_NAMES;
