use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::progress::{DailyProgressPointDto, GamificationSummaryDto};
use crate::errors::AppError;

const DAILY_XP_CAP: i64 = 500;
const BASE_XP_PER_CARD: i64 = 5;
const CORRECTNESS_XP_PER_CARD: i64 = 3;
const HARD_BONUS_XP: i64 = 1;
const GOOD_BONUS_XP: i64 = 2;
const EASY_BONUS_XP: i64 = 3;
const PERFECT_SESSION_BONUS_XP: i64 = 20;
const DAILY_GOAL_BONUS_XP: i64 = 25;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct XpFormulaInput {
    pub total_items: i64,
    pub reviewed_count: i64,
    pub correct_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub daily_xp_before: i64,
    pub daily_goal_was_met: bool,
    pub daily_goal_now_met: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct XpBreakdown {
    pub base: i64,
    pub correctness: i64,
    pub difficulty: i64,
    pub perfect_session: i64,
    pub daily_goal: i64,
    pub raw_total: i64,
    pub capped_total: i64,
}

#[derive(Clone, Debug)]
struct SessionProgress {
    total_items: i64,
    reviewed_count: i64,
    correct_count: i64,
    hard_count: i64,
    good_count: i64,
    easy_count: i64,
}

#[derive(Clone, Copy, Debug)]
struct DailyProgress {
    cards_reviewed: i64,
    cards_correct: i64,
    xp_earned: i64,
    goal_met: bool,
    streak_day: i64,
}

#[derive(Clone, Copy, Debug)]
struct LevelProgress {
    level: i64,
    current_level_xp: i64,
    next_level_xp: i64,
    xp_to_next_level: i64,
}

fn clamp_non_negative(value: i64) -> i64 {
    value.max(0)
}

pub(crate) fn calculate_xp(input: XpFormulaInput) -> XpBreakdown {
    let reviewed = clamp_non_negative(input.reviewed_count);
    let correct = clamp_non_negative(input.correct_count).min(reviewed);
    let hard = clamp_non_negative(input.hard_count);
    let good = clamp_non_negative(input.good_count);
    let easy = clamp_non_negative(input.easy_count);

    let base = reviewed * BASE_XP_PER_CARD;
    let correctness = correct * CORRECTNESS_XP_PER_CARD;
    let difficulty = hard * HARD_BONUS_XP + good * GOOD_BONUS_XP + easy * EASY_BONUS_XP;
    let perfect_session = if reviewed >= 5
        && input.total_items > 0
        && reviewed == input.total_items
        && correct == reviewed
    {
        PERFECT_SESSION_BONUS_XP
    } else {
        0
    };
    let daily_goal = if !input.daily_goal_was_met && input.daily_goal_now_met && reviewed > 0 {
        DAILY_GOAL_BONUS_XP
    } else {
        0
    };
    let raw_total = base + correctness + difficulty + perfect_session + daily_goal;
    let remaining_today = (DAILY_XP_CAP - clamp_non_negative(input.daily_xp_before)).max(0);
    let capped_total = raw_total.min(remaining_today);

    XpBreakdown {
        base,
        correctness,
        difficulty,
        perfect_session,
        daily_goal,
        raw_total,
        capped_total,
    }
}

fn level_threshold(level: i64) -> i64 {
    let safe_level = level.max(1);
    (safe_level - 1) * (safe_level - 1) * 100
}

fn level_from_xp(total_xp: i64) -> LevelProgress {
    let xp = clamp_non_negative(total_xp);
    let mut level = 1;
    while level_threshold(level + 1) <= xp {
        level += 1;
    }

    let current_threshold = level_threshold(level);
    let next_threshold = level_threshold(level + 1);
    LevelProgress {
        level,
        current_level_xp: xp - current_threshold,
        next_level_xp: next_threshold - current_threshold,
        xp_to_next_level: next_threshold - xp,
    }
}

fn ensure_user_settings(conn: &Connection, user_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user settings: {e}")))?;
    Ok(())
}

fn ensure_user_xp(conn: &Connection, user_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO user_xp (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user XP: {e}")))?;
    Ok(())
}

fn daily_goal_cards(conn: &Connection, user_id: i64) -> Result<i64, AppError> {
    ensure_user_settings(conn, user_id)?;
    conn.query_row(
        "SELECT daily_goal_cards FROM user_settings WHERE user_id = ?1",
        params![user_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|goal| goal.max(1))
    .map_err(|e| AppError::Internal(format!("Failed to load daily goal: {e}")))
}

fn daily_progress_for_date(
    conn: &Connection,
    user_id: i64,
    date: &str,
) -> Result<DailyProgress, AppError> {
    conn.query_row(
        "SELECT cards_reviewed, cards_correct, xp_earned, goal_met, streak_day
         FROM user_progress
         WHERE user_id = ?1 AND date = ?2",
        params![user_id, date],
        |row| {
            let goal_met: i64 = row.get(3)?;
            Ok(DailyProgress {
                cards_reviewed: row.get(0)?,
                cards_correct: row.get(1)?,
                xp_earned: row.get(2)?,
                goal_met: goal_met != 0,
                streak_day: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to load daily progress: {e}")))
    .map(|progress| {
        progress.unwrap_or(DailyProgress {
            cards_reviewed: 0,
            cards_correct: 0,
            xp_earned: 0,
            goal_met: false,
            streak_day: 0,
        })
    })
}

fn previous_goal_streak(conn: &Connection, user_id: i64, date: &str) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT streak_day
         FROM user_progress
         WHERE user_id = ?1
           AND date = date(?2, '-1 day')
           AND goal_met = 1",
        params![user_id, date],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to load previous streak: {e}")))
    .map(|value| value.unwrap_or(0))
}

fn today(conn: &Connection) -> Result<String, AppError> {
    conn.query_row("SELECT date('now')", [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to resolve current date: {e}")))
}

fn session_progress(
    conn: &Connection,
    user_id: i64,
    session_id: i64,
) -> Result<SessionProgress, AppError> {
    conn.query_row(
        "SELECT total_items, cards_studied, cards_correct,
                hard_count, good_count, easy_count
         FROM study_sessions
         WHERE id = ?1
           AND user_id = ?2
           AND session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
        params![session_id, user_id],
        |row| {
            Ok(SessionProgress {
                total_items: row.get(0)?,
                reviewed_count: row.get(1)?,
                correct_count: row.get(2)?,
                hard_count: row.get(3)?,
                good_count: row.get(4)?,
                easy_count: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to load session progress: {e}")))?
    .ok_or_else(|| AppError::NotFound(format!("Study session {session_id} was not found")))
}

pub(crate) fn award_completed_session_progress(
    conn: &Connection,
    user_id: i64,
    session_id: i64,
    ended_at: &str,
) -> Result<i64, AppError> {
    let session = session_progress(conn, user_id, session_id)?;
    if session.reviewed_count <= 0 {
        return Ok(0);
    }

    ensure_user_xp(conn, user_id)?;
    let date = ended_at
        .get(0..10)
        .ok_or_else(|| AppError::Internal(format!("Invalid session end timestamp: {ended_at}")))?;
    let goal_cards = daily_goal_cards(conn, user_id)?;
    let before = daily_progress_for_date(conn, user_id, date)?;
    let cards_after = before.cards_reviewed + session.reviewed_count;
    let correct_after = before.cards_correct + session.correct_count;
    let goal_met_now = cards_after >= goal_cards;
    let streak_day = if goal_met_now {
        if before.goal_met {
            before.streak_day.max(1)
        } else {
            previous_goal_streak(conn, user_id, date)? + 1
        }
    } else {
        0
    };

    let xp = calculate_xp(XpFormulaInput {
        total_items: session.total_items,
        reviewed_count: session.reviewed_count,
        correct_count: session.correct_count,
        hard_count: session.hard_count,
        good_count: session.good_count,
        easy_count: session.easy_count,
        daily_xp_before: before.xp_earned,
        daily_goal_was_met: before.goal_met,
        daily_goal_now_met: goal_met_now,
    })
    .capped_total;

    let xp_after = before.xp_earned + xp;
    conn.execute(
        "INSERT INTO user_progress (
             user_id, date, cards_reviewed, cards_correct, xp_earned, goal_met, streak_day
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(user_id, date) DO UPDATE SET
             cards_reviewed = excluded.cards_reviewed,
             cards_correct = excluded.cards_correct,
             xp_earned = excluded.xp_earned,
             goal_met = excluded.goal_met,
             streak_day = excluded.streak_day",
        params![
            user_id,
            date,
            cards_after,
            correct_after,
            xp_after,
            if goal_met_now { 1 } else { 0 },
            streak_day,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update daily progress: {e}")))?;

    conn.execute(
        "UPDATE study_sessions
         SET xp_earned = ?1
         WHERE id = ?2 AND user_id = ?3",
        params![xp, session_id, user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to store session XP: {e}")))?;

    let total_xp_before: i64 = conn
        .query_row(
            "SELECT total_xp FROM user_xp WHERE user_id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to load total XP: {e}")))?;
    let total_xp_after = total_xp_before + xp;
    let level = level_from_xp(total_xp_after).level;
    let current_streak = current_streak_for_date(conn, user_id, date)?;
    let longest_streak = conn
        .query_row(
            "SELECT MAX(longest_streak, ?2) FROM user_xp WHERE user_id = ?1",
            params![user_id, current_streak],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to calculate longest streak: {e}")))?;

    conn.execute(
        "UPDATE user_xp
         SET total_xp = ?2,
             level = ?3,
             current_streak = ?4,
             longest_streak = ?5,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE user_id = ?1",
        params![
            user_id,
            total_xp_after,
            level,
            current_streak,
            longest_streak
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update user XP: {e}")))?;

    Ok(xp)
}

fn current_streak_for_date(conn: &Connection, user_id: i64, date: &str) -> Result<i64, AppError> {
    let today_progress = daily_progress_for_date(conn, user_id, date)?;
    if today_progress.goal_met {
        return Ok(today_progress.streak_day);
    }
    previous_goal_streak(conn, user_id, date)
}

fn weekly_activity(
    conn: &Connection,
    user_id: i64,
    today_date: &str,
) -> Result<Vec<DailyProgressPointDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "WITH RECURSIVE days(offset, date_value) AS (
                 SELECT 6, date(?2, '-6 day')
                 UNION ALL
                 SELECT offset - 1, date(date_value, '+1 day')
                 FROM days
                 WHERE offset > 0
             )
             SELECT days.date_value,
                    COALESCE(up.cards_reviewed, 0),
                    COALESCE(up.xp_earned, 0),
                    COALESCE(up.goal_met, 0)
             FROM days
             LEFT JOIN user_progress up
                    ON up.user_id = ?1
                   AND up.date = days.date_value
             ORDER BY days.date_value",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare weekly activity: {e}")))?;

    let rows = stmt
        .query_map(params![user_id, today_date], |row| {
            let goal_met: i64 = row.get(3)?;
            Ok(DailyProgressPointDto {
                date: row.get(0)?,
                cards_reviewed: row.get(1)?,
                xp_earned: row.get(2)?,
                goal_met: goal_met != 0,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query weekly activity: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read weekly activity: {e}")))?;

    Ok(rows)
}

fn gamification_summary_for_user_at(
    conn: &Connection,
    user_id: i64,
    today_date: &str,
) -> Result<GamificationSummaryDto, AppError> {
    ensure_user_settings(conn, user_id)?;
    ensure_user_xp(conn, user_id)?;

    let goal_cards = daily_goal_cards(conn, user_id)?;
    let today_progress = daily_progress_for_date(conn, user_id, today_date)?;
    let activity = weekly_activity(conn, user_id, today_date)?;
    let weekly_cards_reviewed = activity.iter().map(|day| day.cards_reviewed).sum();
    let weekly_xp_earned = activity.iter().map(|day| day.xp_earned).sum();
    let current_streak = current_streak_for_date(conn, user_id, today_date)?;

    let (total_xp, longest_streak): (i64, i64) = conn
        .query_row(
            "SELECT total_xp, longest_streak FROM user_xp WHERE user_id = ?1",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| AppError::Internal(format!("Failed to load user XP: {e}")))?;
    let level_progress = level_from_xp(total_xp);

    let (total_sessions, total_cards_reviewed, total_cards_correct): (i64, i64, i64) = conn
        .query_row(
            "SELECT COUNT(*),
                    COALESCE(SUM(cards_studied), 0),
                    COALESCE(SUM(cards_correct), 0)
             FROM study_sessions
             WHERE user_id = ?1
               AND ended_at IS NOT NULL
               AND session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| AppError::Internal(format!("Failed to load session totals: {e}")))?;
    let accuracy = if total_cards_reviewed > 0 {
        (total_cards_correct * 100 / total_cards_reviewed).clamp(0, 100)
    } else {
        0
    };
    let mastered_words: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM review_cards
             WHERE user_id = ?1
               AND state = 'review'
               AND stability >= 7.0",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to load mastered words: {e}")))?;

    Ok(GamificationSummaryDto {
        user_id,
        total_xp,
        level: level_progress.level,
        current_level_xp: level_progress.current_level_xp,
        next_level_xp: level_progress.next_level_xp,
        xp_to_next_level: level_progress.xp_to_next_level,
        current_streak,
        longest_streak: longest_streak.max(current_streak),
        today_date: today_date.to_string(),
        daily_goal_cards: goal_cards,
        today_cards_reviewed: today_progress.cards_reviewed,
        today_cards_correct: today_progress.cards_correct,
        today_xp_earned: today_progress.xp_earned,
        today_goal_met: today_progress.goal_met,
        weekly_cards_reviewed,
        weekly_xp_earned,
        total_sessions,
        total_cards_reviewed,
        total_cards_correct,
        accuracy,
        mastered_words,
        weekly_activity: activity,
    })
}

pub(crate) fn gamification_summary_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<GamificationSummaryDto, AppError> {
    let today_date = today(conn)?;
    gamification_summary_for_user_at(conn, user_id, &today_date)
}

#[tauri::command]
pub fn get_gamification_summary(db: State<'_, DbConn>) -> Result<GamificationSummaryDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    gamification_summary_for_user(&conn, user.id)
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
        ended_at: &str,
        total_items: i64,
        reviewed: i64,
        correct: i64,
        hard: i64,
        good: i64,
        easy: i64,
    ) -> i64 {
        conn.execute(
            "INSERT INTO study_sessions (
                 user_id, session_type, started_at, ended_at, total_items,
                 cards_studied, cards_correct, hard_count, good_count, easy_count
             )
             VALUES (?1, 'flashcard', '2026-05-19T00:00:00Z', ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                user_id,
                ended_at,
                total_items,
                reviewed,
                correct,
                hard,
                good,
                easy
            ],
        )
        .expect("insert session");
        conn.last_insert_rowid()
    }

    #[test]
    fn xp_formula_applies_bonuses_and_daily_cap() {
        let xp = calculate_xp(XpFormulaInput {
            total_items: 5,
            reviewed_count: 5,
            correct_count: 5,
            hard_count: 1,
            good_count: 2,
            easy_count: 2,
            daily_xp_before: 0,
            daily_goal_was_met: false,
            daily_goal_now_met: true,
        });

        assert_eq!(xp.base, 25);
        assert_eq!(xp.correctness, 15);
        assert_eq!(xp.difficulty, 11);
        assert_eq!(xp.perfect_session, 20);
        assert_eq!(xp.daily_goal, 25);
        assert_eq!(xp.capped_total, 96);

        let capped = calculate_xp(XpFormulaInput {
            total_items: 5,
            reviewed_count: 5,
            correct_count: 5,
            hard_count: 0,
            good_count: 0,
            easy_count: 5,
            daily_xp_before: 490,
            daily_goal_was_met: false,
            daily_goal_now_met: true,
        });
        assert_eq!(capped.capped_total, 10);
    }

    #[test]
    fn level_progress_uses_quadratic_thresholds() {
        let level = level_from_xp(450);

        assert_eq!(level.level, 3);
        assert_eq!(level.current_level_xp, 50);
        assert_eq!(level.next_level_xp, 500);
        assert_eq!(level.xp_to_next_level, 450);
    }

    #[test]
    fn awarding_session_updates_daily_goal_streak_and_xp_once() {
        let (conn, user_id) = db_with_user();
        conn.execute(
            "INSERT INTO user_settings (user_id, daily_goal_cards)
             VALUES (?1, 5)
             ON CONFLICT(user_id) DO UPDATE SET daily_goal_cards = excluded.daily_goal_cards",
            params![user_id],
        )
        .expect("goal");
        let session_id =
            insert_completed_session(&conn, user_id, "2026-05-19T00:10:00Z", 5, 5, 5, 0, 0, 5);

        let xp =
            award_completed_session_progress(&conn, user_id, session_id, "2026-05-19T00:10:00Z")
                .expect("award");

        assert_eq!(xp, 100);
        let summary =
            gamification_summary_for_user_at(&conn, user_id, "2026-05-19").expect("summary");
        assert_eq!(summary.today_cards_reviewed, 5);
        assert!(summary.today_goal_met);
        assert_eq!(summary.current_streak, 1);
        assert_eq!(summary.longest_streak, 1);
        assert_eq!(summary.total_xp, 100);
        assert_eq!(summary.level, 2);
    }

    #[test]
    fn streak_continues_across_adjacent_goal_days() {
        let (conn, user_id) = db_with_user();
        conn.execute(
            "INSERT INTO user_settings (user_id, daily_goal_cards)
             VALUES (?1, 2)
             ON CONFLICT(user_id) DO UPDATE SET daily_goal_cards = excluded.daily_goal_cards",
            params![user_id],
        )
        .expect("goal");
        let first =
            insert_completed_session(&conn, user_id, "2026-05-18T00:10:00Z", 2, 2, 2, 0, 1, 1);
        award_completed_session_progress(&conn, user_id, first, "2026-05-18T00:10:00Z")
            .expect("first");
        let second =
            insert_completed_session(&conn, user_id, "2026-05-19T00:10:00Z", 2, 2, 2, 0, 1, 1);
        award_completed_session_progress(&conn, user_id, second, "2026-05-19T00:10:00Z")
            .expect("second");

        let summary =
            gamification_summary_for_user_at(&conn, user_id, "2026-05-19").expect("summary");
        assert_eq!(summary.current_streak, 2);
        assert_eq!(summary.longest_streak, 2);
    }
}
