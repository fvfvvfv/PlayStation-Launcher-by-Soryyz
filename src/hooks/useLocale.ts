import { createContext, useContext } from "react";
import type { Lang } from "../locales";

export interface LocaleCtx {
  lang: Lang;
  t: (key: string) => string;
  plural: (n: number, keyBase: string) => string;
}

export const LocaleContext = createContext<LocaleCtx>({
  lang: "ru",
  t: (k: string) => k,
  plural: (n: number, _keyBase: string) => String(n),
});

export function useLocale(): LocaleCtx {
  return useContext(LocaleContext);
}