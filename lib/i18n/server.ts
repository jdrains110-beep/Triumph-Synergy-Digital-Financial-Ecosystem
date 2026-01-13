import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, resolveLocale } from "./locale";

export const getRequestLocale = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get("ts-locale")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  return resolveLocale({ cookieLocale, acceptLanguage }) || DEFAULT_LOCALE;
};
