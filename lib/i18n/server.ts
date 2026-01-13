import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, resolveLocale } from "./locale";

export const getRequestLocale = () => {
  const cookieLocale = cookies().get("ts-locale")?.value;
  const acceptLanguage = headers().get("accept-language");
  // Country is not always available on the server; middleware sets cookie first.
  return resolveLocale({ cookieLocale, acceptLanguage }) || DEFAULT_LOCALE;
};
