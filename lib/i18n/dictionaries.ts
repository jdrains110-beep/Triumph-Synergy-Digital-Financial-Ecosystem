import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import pt from "./locales/pt";
import hi from "./locales/hi";
import zh from "./locales/zh";

type Dictionary = Record<string, string>;

const dictionaries: Record<string, Dictionary> = { en, es, fr, pt, hi, zh };

export const getDictionary = (locale: string): Dictionary => {
  if (locale in dictionaries) {
    return dictionaries[locale];
  }
  return dictionaries.en;
};
