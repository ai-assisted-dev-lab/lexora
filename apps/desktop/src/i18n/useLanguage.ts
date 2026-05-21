import { useTranslation } from "react-i18next";

import {
  isSupportedLanguage,
  setLanguage,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from "./index";

export interface UseLanguageResult {
  current: SupportedLanguage;
  supported: readonly SupportedLanguage[];
  change: (lang: SupportedLanguage) => void;
}

export function useLanguage(): UseLanguageResult {
  const { i18n } = useTranslation();
  const raw = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const current: SupportedLanguage = isSupportedLanguage(raw) ? raw : "en";
  return {
    current,
    supported: SUPPORTED_LANGUAGES,
    change: setLanguage,
  };
}
