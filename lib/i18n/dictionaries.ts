import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import pt from "./locales/pt";
import hi from "./locales/hi";
import zh from "./locales/zh";

const dictionaries = { en, es, fr, pt, hi, zh } as const;

export const getDictionary = (locale: string) => {
  if (locale in dictionaries) {
    return dictionaries[locale as keyof typeof dictionaries];
  }
  return dictionaries.en;
};
