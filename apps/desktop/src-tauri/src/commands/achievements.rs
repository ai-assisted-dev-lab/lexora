use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::commands::progress::level_from_xp;
use crate::db::DbConn;
use crate::dto::achievements::{AchievementDto, AchievementUnlockDto, AchievementsPageDto};
use crate::errors::AppError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum AchievementKind {
    SessionsCompleted,
    LongestStreak,
    CardsReviewed,
    PerfectSessions,
    WeakWordsRecovered,
    DeckInstalls,
    PronunciationPlays,
}

#[derive(Clone, Copy, Debug)]
struct AchievementDefinition {
    slug: &'static str,
    title: &'static str,
    description: &'static str,
    category: &'static str,
    tier: &'static str,
    icon_name: &'static str,
    kind: AchievementKind,
    target: i64,
    xp_reward: i64,
    hidden: bool,
}

#[derive(Clone, Debug)]
struct AchievementRow {
    id: i64,
    unlocked_at: Option<String>,
    definition: AchievementDefinition,
}

const ACHIEVEMENTS: &[AchievementDefinition] = &[
    AchievementDefinition {
        slug: "first-session",
        title: "First Session",
        description: "Complete your first study session.",
        category: "Streak",
        tier: "bronze",
        icon_name: "Award",
        kind: AchievementKind::SessionsCompleted,
        target: 1,
        xp_reward: 25,
        hidden: false,
    },
    AchievementDefinition {
        slug: "seven-day-streak",
        title: "7-Day Streak",
        description: "Meet your daily goal for seven days.",
        category: "Streak",
        tier: "silver",
        icon_name: "Flame",
        kind: AchievementKind::LongestStreak,
        target: 7,
        xp_reward: 100,
        hidden: false,
    },
    AchievementDefinition {
        slug: "first-100-words",
        title: "First 100 Words",
        description: "Review one hundred cards across your sessions.",
        category: "Words",
        tier: "silver",
        icon_name: "BookOpen",
        kind: AchievementKind::CardsReviewed,
        target: 100,
        xp_reward: 100,
        hidden: false,
    },
    AchievementDefinition {
        slug: "perfect-session",
        title: "Perfect Session",
        description: "Complete a full session without missing a card.",
        category: "Accuracy",
        tier: "silver",
        icon_name: "Target",
        kind: AchievementKind::PerfectSessions,
        target: 1,
        xp_reward: 75,
        hidden: false,
    },
    AchievementDefinition {
        slug: "weakness-breaker",
        title: "Weakness Breaker",
        description: "Recover at least one weak word during a weak-word drill.",
        category: "Weak Words",
        tier: "silver",
        icon_name: "RotateCcw",
        kind: AchievementKind::WeakWordsRecovered,
        target: 1,
        xp_reward: 75,
        hidden: false,
    },
    AchievementDefinition {
        slug: "deck-collector",
        title: "Deck Collector",
        description: "Install three decks in your offline library.",
        category: "Decks",
        tier: "bronze",
        icon_name: "Layers",
        kind: AchievementKind::DeckInstalls,
        target: 3,
        xp_reward: 75,
        hidden: false,
    },
    AchievementDefinition {
        slug: "pronunciation-starter",
        title: "Pronunciation Starter",
        description: "Play pronunciation audio or fallback TTS once.",
        category: "Pronunciation",
        tier: "bronze",
        icon_name: "Mic",
        kind: AchievementKind::PronunciationPlays,
        target: 1,
        xp_reward: 25,
        hidden: false,
    },
    AchievementDefinition {
        slug: "pronunciation-rhythm",
        title: "Pronunciation Rhythm",
        description: "Practice pronunciation twenty-five times.",
        category: "Pronunciation",
        tier: "silver",
        icon_name: "Mic",
        kind: AchievementKind::PronunciationPlays,
        target: 25,
        xp_reward: 100,
        hidden: false,
    },
    AchievementDefinition {
        slug: "hidden-flawless-five",
        title: "Flawless Five",
        description: "Complete five perfect sessions.",
        category: "Hidden",
        tier: "gold",
        icon_name: "Zap",
        kind: AchievementKind::PerfectSessions,
        target: 5,
        xp_reward: 200,
        hidden: true,
    },
];

pub(crate) fn ensure_achievement_definitions(conn: &Connection) -> Result<(), AppError> {
    for achievement in ACHIEVEMENTS {
        conn.execute(
            "INSERT INTO achievements (
                 slug, name, description, icon, condition_type, condition_value, xp_reward, hidden
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(slug) DO UPDATE SET
                 name = excluded.name,
                 description = excluded.description,
                 icon = excluded.icon,
                 condition_value = excluded.condition_value,
                 xp_reward = excluded.xp_reward,
                 hidden = excluded.hidden",
            params![
                achievement.slug,
                achievement.title,
                achievement.description,
                achievement.icon_name,
                storage_condition_type(*achievement),
                achievement.target,
                achievement.xp_reward,
                if achievement.hidden { 1 } else { 0 },
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to seed achievements: {e}")))?;
    }

    Ok(())
}

fn storage_condition_type(achievement: AchievementDefinition) -> &'static str {
    match achievement.kind {
        AchievementKind::LongestStreak => "streak",
        AchievementKind::CardsReviewed => "cards_reviewed",
        AchievementKind::SessionsCompleted
        | AchievementKind::PerfectSessions
        | AchievementKind::WeakWordsRecovered
        | AchievementKind::DeckInstalls
        | AchievementKind::PronunciationPlays => "sessions_completed",
    }
}

pub(crate) fn record_achievement_event(
    conn: &Connection,
    user_id: i64,
    event_type: &str,
    amount: i64,
) -> Result<(), AppError> {
    if amount <= 0 {
        return Ok(());
    }

    conn.execute(
        "INSERT INTO achievement_events (user_id, event_type, count)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id, event_type) DO UPDATE SET
             count = count + excluded.count,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![user_id, event_type, amount],
    )
    .map_err(|e| AppError::Internal(format!("Failed to record achievement event: {e}")))?;

    Ok(())
}

pub(crate) fn evaluate_session_achievement_events(
    conn: &Connection,
    user_id: i64,
    session_id: i64,
) -> Result<(), AppError> {
    let session = conn
        .query_row(
            "SELECT session_type, total_items, cards_studied, cards_correct
             FROM study_sessions
             WHERE id = ?1 AND user_id = ?2",
            params![session_id, user_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to load session events: {e}")))?;

    let Some((mode, total_items, reviewed_count, correct_count)) = session else {
        return Ok(());
    };

    if reviewed_count >= 5
        && total_items > 0
        && reviewed_count == total_items
        && correct_count == reviewed_count
    {
        record_achievement_event(conn, user_id, "perfect_session", 1)?;
    }

    if mode == "weak_drill" && correct_count > 0 {
        record_achievement_event(conn, user_id, "weak_word_recovered", correct_count)?;
    }

    Ok(())
}

pub(crate) fn evaluate_achievements_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<Vec<AchievementUnlockDto>, AppError> {
    ensure_achievement_definitions(conn)?;
    let rows = load_achievement_rows(conn, user_id)?;
    let mut newly_unlocked = Vec::new();

    for row in rows {
        if row.unlocked_at.is_some() {
            continue;
        }

        let current = progress_for_kind(conn, user_id, row.definition.kind)?;
        if current < row.definition.target {
            continue;
        }

        let inserted = conn
            .execute(
                "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
                 VALUES (?1, ?2)",
                params![user_id, row.id],
            )
            .map_err(|e| AppError::Internal(format!("Failed to unlock achievement: {e}")))?;
        if inserted == 0 {
            continue;
        }

        let unlocked_at = conn
            .query_row(
                "SELECT unlocked_at
                 FROM user_achievements
                 WHERE user_id = ?1 AND achievement_id = ?2",
                params![user_id, row.id],
                |r| r.get::<_, String>(0),
            )
            .map_err(|e| AppError::Internal(format!("Failed to read achievement unlock: {e}")))?;

        award_achievement_xp(conn, user_id, row.definition.xp_reward)?;
        newly_unlocked.push(unlock_dto(row.definition, unlocked_at));
    }

    Ok(newly_unlocked)
}

fn award_achievement_xp(conn: &Connection, user_id: i64, xp_reward: i64) -> Result<(), AppError> {
    if xp_reward <= 0 {
        return Ok(());
    }

    conn.execute(
        "INSERT OR IGNORE INTO user_xp (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user XP: {e}")))?;

    let total_xp: i64 = conn
        .query_row(
            "SELECT total_xp FROM user_xp WHERE user_id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to load user XP: {e}")))?;
    let updated_xp = total_xp + xp_reward;
    let level = level_from_xp(updated_xp).level;

    conn.execute(
        "UPDATE user_xp
         SET total_xp = ?2,
             level = ?3,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE user_id = ?1",
        params![user_id, updated_xp, level],
    )
    .map_err(|e| AppError::Internal(format!("Failed to award achievement XP: {e}")))?;

    Ok(())
}

fn load_achievement_rows(conn: &Connection, user_id: i64) -> Result<Vec<AchievementRow>, AppError> {
    let mut rows = Vec::new();
    for definition in ACHIEVEMENTS {
        let row = conn
            .query_row(
                "SELECT a.id, ua.unlocked_at
                 FROM achievements a
                 LEFT JOIN user_achievements ua
                        ON ua.achievement_id = a.id
                       AND ua.user_id = ?2
                 WHERE a.slug = ?1",
                params![definition.slug, user_id],
                |row| {
                    Ok(AchievementRow {
                        id: row.get(0)?,
                        unlocked_at: row.get(1)?,
                        definition: *definition,
                    })
                },
            )
            .map_err(|e| AppError::Internal(format!("Failed to load achievement: {e}")))?;
        rows.push(row);
    }

    Ok(rows)
}

fn progress_for_kind(
    conn: &Connection,
    user_id: i64,
    kind: AchievementKind,
) -> Result<i64, AppError> {
    match kind {
        AchievementKind::SessionsCompleted => scalar_count(
            conn,
            "SELECT COUNT(*)
             FROM study_sessions
             WHERE user_id = ?1
               AND ended_at IS NOT NULL
               AND session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
            user_id,
        ),
        AchievementKind::LongestStreak => scalar_count(
            conn,
            "SELECT COALESCE(MAX(longest_streak), 0) FROM user_xp WHERE user_id = ?1",
            user_id,
        ),
        AchievementKind::CardsReviewed => scalar_count(
            conn,
            "SELECT COALESCE(SUM(cards_studied), 0)
             FROM study_sessions
             WHERE user_id = ?1
               AND ended_at IS NOT NULL
               AND session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
            user_id,
        ),
        AchievementKind::PerfectSessions => event_count(conn, user_id, "perfect_session"),
        AchievementKind::WeakWordsRecovered => event_count(conn, user_id, "weak_word_recovered"),
        AchievementKind::DeckInstalls => scalar_count(
            conn,
            "SELECT COUNT(*) FROM deck_subscriptions WHERE user_id = ?1",
            user_id,
        ),
        AchievementKind::PronunciationPlays => event_count(conn, user_id, "pronunciation_play"),
    }
}

fn scalar_count(conn: &Connection, sql: &str, user_id: i64) -> Result<i64, AppError> {
    conn.query_row(sql, params![user_id], |row| row.get::<_, i64>(0))
        .map_err(|e| AppError::Internal(format!("Failed to calculate achievement progress: {e}")))
}

fn event_count(conn: &Connection, user_id: i64, event_type: &str) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COALESCE(count, 0)
         FROM achievement_events
         WHERE user_id = ?1 AND event_type = ?2",
        params![user_id, event_type],
        |row| row.get::<_, i64>(0),
    )
    .optional()
    .map_err(|e| {
        AppError::Internal(format!(
            "Failed to calculate achievement event progress: {e}"
        ))
    })
    .map(|value| value.unwrap_or(0))
}

fn list_achievements_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<AchievementsPageDto, AppError> {
    ensure_achievement_definitions(conn)?;
    evaluate_achievements_for_user(conn, user_id)?;
    let rows = load_achievement_rows(conn, user_id)?;
    let mut achievements = Vec::new();

    for row in rows {
        let current = progress_for_kind(conn, user_id, row.definition.kind)?;
        achievements.push(achievement_dto(row, current));
    }

    let total = achievements.len() as i64;
    let unlocked = achievements
        .iter()
        .filter(|achievement| achievement.state == "unlocked")
        .count() as i64;
    let in_progress = achievements
        .iter()
        .filter(|achievement| achievement.state == "in_progress")
        .count() as i64;
    let hidden_locked = achievements
        .iter()
        .filter(|achievement| achievement.state == "hidden")
        .count() as i64;

    Ok(AchievementsPageDto {
        achievements,
        total,
        unlocked,
        in_progress,
        hidden_locked,
    })
}

fn achievement_dto(row: AchievementRow, current: i64) -> AchievementDto {
    let unlocked = row.unlocked_at.is_some();
    let hidden_locked = row.definition.hidden && !unlocked;
    let clamped_progress = if row.definition.target > 0 {
        (current * 100 / row.definition.target).clamp(0, 100)
    } else {
        0
    };
    let state = if unlocked {
        "unlocked"
    } else if hidden_locked {
        "hidden"
    } else if current > 0 {
        "in_progress"
    } else {
        "locked"
    };

    AchievementDto {
        id: row.id.to_string(),
        slug: if hidden_locked {
            format!("hidden-locked-{}", row.id)
        } else {
            row.definition.slug.to_string()
        },
        title: if hidden_locked {
            "???".to_string()
        } else {
            row.definition.title.to_string()
        },
        description: if hidden_locked {
            "Complete hidden milestones to reveal this achievement.".to_string()
        } else {
            row.definition.description.to_string()
        },
        category: if hidden_locked {
            "Hidden".to_string()
        } else {
            row.definition.category.to_string()
        },
        state: state.to_string(),
        tier: if hidden_locked {
            "bronze".to_string()
        } else {
            row.definition.tier.to_string()
        },
        xp_reward: if hidden_locked {
            0
        } else {
            row.definition.xp_reward
        },
        unlocked_at: row.unlocked_at,
        progress: if state == "in_progress" {
            Some(clamped_progress)
        } else {
            None
        },
        progress_label: if state == "in_progress" {
            Some(format!(
                "{} / {}",
                current.min(row.definition.target),
                row.definition.target
            ))
        } else {
            None
        },
        icon_name: if hidden_locked {
            "Lock".to_string()
        } else {
            row.definition.icon_name.to_string()
        },
        hidden: row.definition.hidden,
    }
}

fn unlock_dto(definition: AchievementDefinition, unlocked_at: String) -> AchievementUnlockDto {
    AchievementUnlockDto {
        slug: definition.slug.to_string(),
        title: definition.title.to_string(),
        description: definition.description.to_string(),
        category: definition.category.to_string(),
        tier: definition.tier.to_string(),
        xp_reward: definition.xp_reward,
        icon_name: definition.icon_name.to_string(),
        unlocked_at,
        hidden: definition.hidden,
    }
}

#[tauri::command]
pub fn get_achievements(db: State<'_, DbConn>) -> Result<AchievementsPageDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    list_achievements_for_user(&conn, user.id)
}

#[tauri::command]
pub fn record_pronunciation_practice(
    db: State<'_, DbConn>,
) -> Result<Vec<AchievementUnlockDto>, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    record_achievement_event(&conn, user.id, "pronunciation_play", 1)?;
    evaluate_achievements_for_user(&conn, user.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_user() -> (Connection, i64) {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::auth::create_default_accounts(&conn).expect("defaults");
        let user = crate::auth::login(&conn, "learner", "learner").expect("login");
        (conn, user.id)
    }

    fn insert_completed_session(
        conn: &Connection,
        user_id: i64,
        session_type: &str,
        total_items: i64,
        reviewed: i64,
        correct: i64,
    ) -> i64 {
        conn.execute(
            "INSERT INTO study_sessions (
                 user_id, session_type, started_at, ended_at, total_items, cards_studied, cards_correct
             )
             VALUES (?1, ?2, '2026-05-20T00:00:00Z', '2026-05-20T00:05:00Z', ?3, ?4, ?5)",
            params![user_id, session_type, total_items, reviewed, correct],
        )
        .expect("insert session");
        conn.last_insert_rowid()
    }

    #[test]
    fn hidden_achievement_details_stay_hidden_until_unlocked() {
        let (conn, user_id) = db_with_user();

        let locked = list_achievements_for_user(&conn, user_id).expect("achievements");
        let hidden = locked
            .achievements
            .iter()
            .find(|achievement| achievement.state == "hidden")
            .expect("hidden achievement");
        assert_eq!(hidden.title, "???");
        assert!(!hidden.slug.contains("flawless"));

        record_achievement_event(&conn, user_id, "perfect_session", 5).expect("events");
        evaluate_achievements_for_user(&conn, user_id).expect("evaluate");
        let unlocked = list_achievements_for_user(&conn, user_id).expect("achievements");
        let revealed = unlocked
            .achievements
            .iter()
            .find(|achievement| achievement.slug == "hidden-flawless-five")
            .expect("revealed hidden achievement");
        assert_eq!(revealed.state, "unlocked");
        assert_eq!(revealed.title, "Flawless Five");
    }

    #[test]
    fn session_events_unlock_first_and_perfect_session_achievements() {
        let (conn, user_id) = db_with_user();
        let session_id = insert_completed_session(&conn, user_id, "flashcard", 5, 5, 5);
        evaluate_session_achievement_events(&conn, user_id, session_id).expect("events");

        let unlocked = evaluate_achievements_for_user(&conn, user_id).expect("evaluate");
        let slugs = unlocked
            .iter()
            .map(|achievement| achievement.slug.as_str())
            .collect::<Vec<_>>();
        assert!(slugs.contains(&"first-session"));
        assert!(slugs.contains(&"perfect-session"));
    }

    #[test]
    fn weak_drill_and_pronunciation_events_unlock_milestones() {
        let (conn, user_id) = db_with_user();
        let session_id = insert_completed_session(&conn, user_id, "weak_drill", 3, 3, 2);
        evaluate_session_achievement_events(&conn, user_id, session_id).expect("events");
        record_achievement_event(&conn, user_id, "pronunciation_play", 1).expect("pronunciation");

        let unlocked = evaluate_achievements_for_user(&conn, user_id).expect("evaluate");
        let slugs = unlocked
            .iter()
            .map(|achievement| achievement.slug.as_str())
            .collect::<Vec<_>>();
        assert!(slugs.contains(&"weakness-breaker"));
        assert!(slugs.contains(&"pronunciation-starter"));
    }

    #[test]
    fn deck_collector_unlocks_from_installed_decks() {
        let (conn, user_id) = db_with_user();
        for n in 0..3 {
            conn.execute(
                "INSERT INTO decks (slug, name, word_count) VALUES (?1, ?2, 1)",
                params![format!("deck-{n}"), format!("Deck {n}")],
            )
            .expect("deck");
            let deck_id = conn.last_insert_rowid();
            conn.execute(
                "INSERT INTO deck_subscriptions (user_id, deck_id) VALUES (?1, ?2)",
                params![user_id, deck_id],
            )
            .expect("subscription");
        }

        let unlocked = evaluate_achievements_for_user(&conn, user_id).expect("evaluate");
        assert!(unlocked
            .iter()
            .any(|achievement| achievement.slug == "deck-collector"));
    }
}
