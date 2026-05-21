use rusqlite::{params, Connection};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::analytics::{AnalyticsDto, DeckBreakdownDto, MasteryDistributionDto, WeakWordDto};
use crate::dto::progress::DailyProgressPointDto;
use crate::errors::AppError;

fn mastery_distribution(
    conn: &Connection,
    user_id: i64,
) -> Result<MasteryDistributionDto, AppError> {
    conn.query_row(
        "SELECT
             COALESCE(SUM(CASE WHEN state = 'new' THEN 1 ELSE 0 END), 0),
             COALESCE(SUM(CASE WHEN state IN ('learning', 'relearning') THEN 1 ELSE 0 END), 0),
             COALESCE(SUM(CASE WHEN state = 'review' AND stability < 7.0 THEN 1 ELSE 0 END), 0),
             COALESCE(SUM(CASE WHEN state = 'review' AND stability >= 7.0 THEN 1 ELSE 0 END), 0),
             COUNT(*)
         FROM review_cards
         WHERE user_id = ?1",
        params![user_id],
        |row| {
            Ok(MasteryDistributionDto {
                new_count: row.get(0)?,
                learning_count: row.get(1)?,
                reviewing_count: row.get(2)?,
                mastered_count: row.get(3)?,
                total: row.get(4)?,
            })
        },
    )
    .map_err(|e| AppError::Internal(format!("Failed to load mastery distribution: {e}")))
}

fn weak_words(conn: &Connection, user_id: i64) -> Result<Vec<WeakWordDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT
                 w.headword,
                 COALESCE(d.name, 'Unknown Deck') AS deck_name,
                 COUNT(*) AS total_reviews,
                 CAST(
                     SUM(CASE WHEN rl.result = 'pass' THEN 1 ELSE 0 END) * 100 / COUNT(*)
                 AS INTEGER) AS accuracy
             FROM review_logs rl
             JOIN words w ON w.id = rl.word_id
             LEFT JOIN decks d ON d.id = rl.deck_id
             WHERE rl.user_id = ?1
             GROUP BY rl.word_id, w.headword, d.name
             HAVING COUNT(*) >= 3
             ORDER BY accuracy ASC, total_reviews DESC
             LIMIT 10",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare weak words query: {e}")))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            Ok(WeakWordDto {
                word: row.get(0)?,
                deck_name: row.get(1)?,
                total_reviews: row.get(2)?,
                accuracy: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query weak words: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to collect weak words: {e}")))?;
    Ok(rows)
}

fn deck_breakdown(conn: &Connection, user_id: i64) -> Result<Vec<DeckBreakdownDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT
                 COALESCE(d.name, 'Unknown Deck') AS deck_name,
                 COUNT(DISTINCT rl.word_id) AS words_reviewed,
                 CAST(
                     SUM(CASE WHEN rl.result = 'pass' THEN 1 ELSE 0 END) * 100 / COUNT(*)
                 AS INTEGER) AS accuracy,
                 COUNT(*) AS total_reviews
             FROM review_logs rl
             LEFT JOIN decks d ON d.id = rl.deck_id
             WHERE rl.user_id = ?1
             GROUP BY rl.deck_id, d.name
             ORDER BY words_reviewed DESC
             LIMIT 10",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare deck breakdown query: {e}")))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            Ok(DeckBreakdownDto {
                deck_name: row.get(0)?,
                words_reviewed: row.get(1)?,
                accuracy: row.get(2)?,
                total_reviews: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query deck breakdown: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to collect deck breakdown: {e}")))?;
    Ok(rows)
}

fn monthly_activity(
    conn: &Connection,
    user_id: i64,
    today_date: &str,
) -> Result<Vec<DailyProgressPointDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "WITH RECURSIVE days(offset, date_value) AS (
                 SELECT 29, date(?2, '-29 day')
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
        .map_err(|e| {
            AppError::Internal(format!("Failed to prepare monthly activity query: {e}"))
        })?;

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
        .map_err(|e| AppError::Internal(format!("Failed to query monthly activity: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to collect monthly activity: {e}")))?;
    Ok(rows)
}

#[tauri::command]
pub fn get_analytics(db: State<'_, DbConn>) -> Result<AnalyticsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    let today_date = conn
        .query_row("SELECT date('now')", [], |row| row.get::<_, String>(0))
        .map_err(|e| AppError::Internal(format!("Failed to resolve current date: {e}")))?;

    Ok(AnalyticsDto {
        mastery: mastery_distribution(&conn, user.id)?,
        weak_words: weak_words(&conn, user.id)?,
        deck_breakdown: deck_breakdown(&conn, user.id)?,
        monthly_activity: monthly_activity(&conn, user.id, &today_date)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_sessions() -> (rusqlite::Connection, i64) {
        let mut conn = rusqlite::Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::auth::create_default_accounts(&conn).expect("defaults");
        let user = crate::auth::login(&conn, "learner", "learner").expect("login");
        (conn, user.id)
    }

    #[test]
    fn mastery_distribution_returns_zeros_for_new_user() {
        let (conn, user_id) = db_with_sessions();
        let dist = mastery_distribution(&conn, user_id).expect("mastery");
        assert_eq!(dist.total, 0);
        assert_eq!(dist.mastered_count, 0);
        assert_eq!(dist.new_count, 0);
    }

    #[test]
    fn weak_words_empty_for_new_user() {
        let (conn, user_id) = db_with_sessions();
        let words = weak_words(&conn, user_id).expect("weak words");
        assert!(words.is_empty());
    }

    #[test]
    fn monthly_activity_returns_thirty_days() {
        let (conn, user_id) = db_with_sessions();
        let activity = monthly_activity(&conn, user_id, "2026-05-19").expect("monthly");
        assert_eq!(activity.len(), 30);
        assert_eq!(activity[0].date, "2026-04-20");
        assert_eq!(activity[29].date, "2026-05-19");
    }
}
