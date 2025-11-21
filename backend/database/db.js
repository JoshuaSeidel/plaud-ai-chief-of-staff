const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/ai-chief-of-staff.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Transcripts table - stores meeting transcripts
  db.run(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed BOOLEAN DEFAULT 0,
      source TEXT DEFAULT 'upload'
    )
  `);

  // Context table - stores extracted context for rolling 2-week window
  db.run(`
    CREATE TABLE IF NOT EXISTS context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transcript_id INTEGER,
      context_type TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'active',
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
    )
  `);

  // Commitments table - tracks commitments made
  db.run(`
    CREATE TABLE IF NOT EXISTS commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transcript_id INTEGER,
      description TEXT NOT NULL,
      deadline TEXT,
      assignee TEXT,
      status TEXT DEFAULT 'pending',
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_date DATETIME,
      FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
    )
  `);

  // Briefs table - stores generated daily briefs
  db.run(`
    CREATE TABLE IF NOT EXISTS briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brief_date DATE NOT NULL,
      content TEXT NOT NULL,
      top_priorities TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Configuration table - stores app configuration
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized');
}

module.exports = db;
