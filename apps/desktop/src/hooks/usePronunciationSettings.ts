import { useEffect, useState } from "react";

import {
  defaultPronunciationSettings,
  getPronunciationSettings,
  type PronunciationSettings,
  updatePronunciationSettings,
  type UpdatePronunciationSettingsInput,
} from "@/services/commands/settings";

export function usePronunciationSettings() {
  const [settings, setSettings] = useState<PronunciationSettings>(
    defaultPronunciationSettings,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPronunciationSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(defaultPronunciationSettings);
          setError("Pronunciation settings are using defaults.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function save(input: UpdatePronunciationSettingsInput) {
    setSettings((current) => ({ ...current, ...input }));
    setError(null);
    try {
      const saved = await updatePronunciationSettings(input);
      setSettings(saved);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
      throw err;
    }
  }

  return { settings, isLoading, error, save };
}
