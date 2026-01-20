SELECT name FROM sqlite_master;

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT,
  summary TEXT,
  sentiment TEXT,
  urgency TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

