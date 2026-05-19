-- 0008_unified_search_fts
--
-- Unified offline search index for words and decks. The table intentionally
-- stores denormalized searchable text so queries do not need to scan or join
-- the full vocabulary catalog at runtime.

CREATE VIRTUAL TABLE IF NOT EXISTS lexora_search_fts USING fts5(
    result_type UNINDEXED,
    result_id UNINDEXED,
    title,
    normalized_title,
    english_text,
    vietnamese_text,
    tags,
    deck_text,
    pack_text,
    tokenize = 'unicode61 remove_diacritics 2'
);

DELETE FROM lexora_search_fts;

INSERT INTO lexora_search_fts (
    rowid, result_type, result_id, title, normalized_title, english_text,
    vietnamese_text, tags, deck_text, pack_text
)
SELECT
    w.id,
    'word',
    w.id,
    w.headword,
    lower(w.headword),
    trim(COALESCE(w.part_of_speech, '') || ' ' ||
         COALESCE(w.cefr_level, '') || ' ' ||
         COALESCE((SELECT group_concat(s.definition_en, ' ') FROM senses s WHERE s.word_id = w.id), '') || ' ' ||
         COALESCE((SELECT group_concat(e.sentence_en, ' ')
                   FROM senses s JOIN examples e ON e.sense_id = s.id
                   WHERE s.word_id = w.id), '')),
    trim(COALESCE((SELECT group_concat(s.definition_vi, ' ') FROM senses s WHERE s.word_id = w.id), '') || ' ' ||
         COALESCE((SELECT group_concat(e.sentence_vi, ' ')
                   FROM senses s JOIN examples e ON e.sense_id = s.id
                   WHERE s.word_id = w.id), '')),
    COALESCE((SELECT group_concat(d.tags, ' ')
              FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
              WHERE dw.word_id = w.id), ''),
    COALESCE((SELECT group_concat(d.name || ' ' || COALESCE(d.description, ''), ' ')
              FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
              WHERE dw.word_id = w.id), ''),
    COALESCE(p.name, '')
FROM words w
LEFT JOIN packs p ON p.id = w.pack_id;

INSERT INTO lexora_search_fts (
    rowid, result_type, result_id, title, normalized_title, english_text,
    vietnamese_text, tags, deck_text, pack_text
)
SELECT
    1000000000 + d.id,
    'deck',
    d.id,
    d.name,
    lower(d.name),
    trim(COALESCE(d.description, '') || ' ' || COALESCE(d.difficulty, '')),
    '',
    COALESCE(d.tags, ''),
    d.name,
    COALESCE(p.name, '')
FROM decks d
LEFT JOIN packs p ON p.id = d.pack_id;

CREATE TRIGGER IF NOT EXISTS lexora_search_words_ai AFTER INSERT ON words BEGIN
    INSERT INTO lexora_search_fts (
        rowid, result_type, result_id, title, normalized_title, english_text,
        vietnamese_text, tags, deck_text, pack_text
    )
    SELECT new.id, 'word', new.id, new.headword, lower(new.headword),
           trim(COALESCE(new.part_of_speech, '') || ' ' || COALESCE(new.cefr_level, '')),
           '', '', '', COALESCE(p.name, '')
    FROM words w LEFT JOIN packs p ON p.id = w.pack_id
    WHERE w.id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_words_ad AFTER DELETE ON words BEGIN
    DELETE FROM lexora_search_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_words_au AFTER UPDATE ON words BEGIN
    DELETE FROM lexora_search_fts WHERE rowid = new.id;
    INSERT INTO lexora_search_fts (
        rowid, result_type, result_id, title, normalized_title, english_text,
        vietnamese_text, tags, deck_text, pack_text
    )
    SELECT
        w.id, 'word', w.id, w.headword, lower(w.headword),
        trim(COALESCE(w.part_of_speech, '') || ' ' ||
             COALESCE(w.cefr_level, '') || ' ' ||
             COALESCE((SELECT group_concat(s.definition_en, ' ') FROM senses s WHERE s.word_id = w.id), '') || ' ' ||
             COALESCE((SELECT group_concat(e.sentence_en, ' ')
                       FROM senses s JOIN examples e ON e.sense_id = s.id
                       WHERE s.word_id = w.id), '')),
        trim(COALESCE((SELECT group_concat(s.definition_vi, ' ') FROM senses s WHERE s.word_id = w.id), '') || ' ' ||
             COALESCE((SELECT group_concat(e.sentence_vi, ' ')
                       FROM senses s JOIN examples e ON e.sense_id = s.id
                       WHERE s.word_id = w.id), '')),
        COALESCE((SELECT group_concat(d.tags, ' ')
                  FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
                  WHERE dw.word_id = w.id), ''),
        COALESCE((SELECT group_concat(d.name || ' ' || COALESCE(d.description, ''), ' ')
                  FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
                  WHERE dw.word_id = w.id), ''),
        COALESCE(p.name, '')
    FROM words w LEFT JOIN packs p ON p.id = w.pack_id
    WHERE w.id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_senses_ai AFTER INSERT ON senses BEGIN
    UPDATE words SET updated_at = updated_at WHERE id = new.word_id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_senses_au AFTER UPDATE ON senses BEGIN
    UPDATE words SET updated_at = updated_at WHERE id = new.word_id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_senses_ad AFTER DELETE ON senses BEGIN
    UPDATE words SET updated_at = updated_at WHERE id = old.word_id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_examples_ai AFTER INSERT ON examples BEGIN
    UPDATE words SET updated_at = updated_at
    WHERE id = (SELECT word_id FROM senses WHERE id = new.sense_id);
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_examples_au AFTER UPDATE ON examples BEGIN
    UPDATE words SET updated_at = updated_at
    WHERE id = (SELECT word_id FROM senses WHERE id = new.sense_id);
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_examples_ad AFTER DELETE ON examples BEGIN
    UPDATE words SET updated_at = updated_at
    WHERE id = (SELECT word_id FROM senses WHERE id = old.sense_id);
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_decks_ai AFTER INSERT ON decks BEGIN
    INSERT INTO lexora_search_fts (
        rowid, result_type, result_id, title, normalized_title, english_text,
        vietnamese_text, tags, deck_text, pack_text
    )
    SELECT 1000000000 + new.id, 'deck', new.id, new.name, lower(new.name),
           trim(COALESCE(new.description, '') || ' ' || COALESCE(new.difficulty, '')),
           '', COALESCE(new.tags, ''), new.name, COALESCE(p.name, '')
    FROM decks d LEFT JOIN packs p ON p.id = d.pack_id
    WHERE d.id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_decks_ad AFTER DELETE ON decks BEGIN
    DELETE FROM lexora_search_fts WHERE rowid = 1000000000 + old.id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_decks_au AFTER UPDATE ON decks BEGIN
    DELETE FROM lexora_search_fts WHERE rowid = 1000000000 + new.id;
    INSERT INTO lexora_search_fts (
        rowid, result_type, result_id, title, normalized_title, english_text,
        vietnamese_text, tags, deck_text, pack_text
    )
    SELECT 1000000000 + d.id, 'deck', d.id, d.name, lower(d.name),
           trim(COALESCE(d.description, '') || ' ' || COALESCE(d.difficulty, '')),
           '', COALESCE(d.tags, ''), d.name, COALESCE(p.name, '')
    FROM decks d LEFT JOIN packs p ON p.id = d.pack_id
    WHERE d.id = new.id;

    UPDATE words SET updated_at = updated_at
    WHERE id IN (SELECT word_id FROM deck_words WHERE deck_id = new.id);
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_deck_words_ai AFTER INSERT ON deck_words BEGIN
    UPDATE words SET updated_at = updated_at WHERE id = new.word_id;
END;

CREATE TRIGGER IF NOT EXISTS lexora_search_deck_words_ad AFTER DELETE ON deck_words BEGIN
    UPDATE words SET updated_at = updated_at WHERE id = old.word_id;
END;
