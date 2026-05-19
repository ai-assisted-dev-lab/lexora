-- 0007_pronunciation_settings
--
-- Adds user-scoped pronunciation preferences used by local audio playback and
-- TTS fallback. These remain offline-first: browser/OS speech synthesis is the
-- default fallback, and online providers are only an optional future plug-in.

ALTER TABLE user_settings
ADD COLUMN pronunciation_accent TEXT NOT NULL DEFAULT 'us'
    CHECK (pronunciation_accent IN ('us', 'uk', 'neutral'));

ALTER TABLE user_settings
ADD COLUMN pronunciation_speed REAL NOT NULL DEFAULT 1.0
    CHECK (pronunciation_speed >= 0.5 AND pronunciation_speed <= 1.5);

ALTER TABLE user_settings
ADD COLUMN audio_priority TEXT NOT NULL DEFAULT 'local_first'
    CHECK (audio_priority IN ('local_first', 'tts_first'));

ALTER TABLE user_settings
ADD COLUMN audio_fallback_behavior TEXT NOT NULL DEFAULT 'browser_tts'
    CHECK (audio_fallback_behavior IN ('browser_tts', 'online_then_browser', 'disabled'));
