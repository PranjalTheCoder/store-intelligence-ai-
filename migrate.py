"""
migrate.py — Run this once to upgrade the existing SQLite DB to the new schema.

Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
"""

import os
import sqlite3

DB_PATH = os.environ.get("DB_PATH", "data/store_intelligence.db")

MIGRATIONS = [
    # Phase 1 — upgrade events table
    "ALTER TABLE events ADD COLUMN event_id TEXT",
    "ALTER TABLE events ADD COLUMN store_id TEXT",
    "ALTER TABLE events ADD COLUMN camera_id TEXT",
    "ALTER TABLE events ADD COLUMN zone_id TEXT",
    "ALTER TABLE events ADD COLUMN dwell_ms INTEGER DEFAULT 0",
    "ALTER TABLE events ADD COLUMN is_staff INTEGER DEFAULT 0",
    "ALTER TABLE events ADD COLUMN confidence REAL DEFAULT 1.0",
    "ALTER TABLE events ADD COLUMN metadata_json TEXT",
    "ALTER TABLE events ADD COLUMN gender_pred TEXT",
    "ALTER TABLE events ADD COLUMN age_pred INTEGER",
    "ALTER TABLE events ADD COLUMN age_bucket TEXT",
    "ALTER TABLE events ADD COLUMN group_id TEXT",
    "ALTER TABLE events ADD COLUMN group_size INTEGER",
    # Phase 1 — upgrade sessions table
    "ALTER TABLE sessions ADD COLUMN zones_visited TEXT",
    "ALTER TABLE sessions ADD COLUMN converted INTEGER DEFAULT 0",
    "ALTER TABLE sessions ADD COLUMN transaction_id TEXT",
    "ALTER TABLE sessions ADD COLUMN basket_value REAL DEFAULT 0.0",
    "ALTER TABLE sessions ADD COLUMN reentry_count INTEGER DEFAULT 0",
]

CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS zone_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id        TEXT NOT NULL,
    zone_id         TEXT NOT NULL,
    zone_name       TEXT,
    total_visits    INTEGER DEFAULT 0,
    total_dwell_ms  INTEGER DEFAULT 0,
    avg_dwell_ms    REAL DEFAULT 0.0,
    unique_visitors INTEGER DEFAULT 0,
    heatmap_score   REAL DEFAULT 0.0,
    last_updated    TEXT,
    UNIQUE (store_id, zone_id)
);

CREATE TABLE IF NOT EXISTS pos_transactions (
    transaction_id      TEXT PRIMARY KEY,
    store_id            TEXT NOT NULL,
    timestamp           TEXT NOT NULL,
    basket_value_inr    REAL DEFAULT 0.0,
    matched_visitor_id  TEXT,
    matched_session_id  TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id        TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL,
    alert_type      TEXT NOT NULL,
    severity        TEXT DEFAULT 'INFO',
    message         TEXT,
    metadata_json   TEXT,
    resolved        INTEGER DEFAULT 0,
    created_at      TEXT
);
"""


def run():
    if not os.path.exists(DB_PATH):
        print(f"[migrate] DB not found at {DB_PATH} — will be created by init_db()")
        return

    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Get existing columns per table
    def columns(table):
        try:
            cur.execute(f"PRAGMA table_info({table})")
            return {row[1] for row in cur.fetchall()}
        except Exception:
            return set()

    # Run ADD COLUMN only if column doesn't exist
    for stmt in MIGRATIONS:
        parts = stmt.split()
        # "ALTER TABLE events ADD COLUMN event_id TEXT"
        if len(parts) >= 5 and parts[3].upper() == "COLUMN":
            table  = parts[2]
            col    = parts[4]
            if col not in columns(table):
                try:
                    cur.execute(stmt)
                    print(f"[migrate] Added column {table}.{col}")
                except Exception as e:
                    print(f"[migrate] Skipped ({e}): {stmt[:60]}")

    # Create new tables
    for stmt in CREATE_TABLES.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            try:
                cur.execute(stmt)
            except Exception as e:
                print(f"[migrate] Table create warning: {e}")

    conn.commit()
    conn.close()
    print("[migrate] Done.")


if __name__ == "__main__":
    run()
