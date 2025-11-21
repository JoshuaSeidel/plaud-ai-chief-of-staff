const sqlite3 = require('sqlite3').verbose();
const { Pool, Client } = require('pg');
const path = require('path');
const fs = require('fs');
const configManager = require('../config/manager');

let db;
let pool;
let config;
let dbType;

/**
 * Initialize database connection based on config
 */
async function initializeDatabase() {
  try {
    // Load config from /data/config.json
    config = configManager.loadConfig();
    dbType = config.dbType || 'sqlite';
    
    console.log(`Initializing ${dbType} database...`);
    
    if (dbType === 'postgres') {
      await initPostgres();
    } else {
      await initSQLite();
    }
    
    console.log(`Database initialized successfully`);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

/**
 * Initialize SQLite database
 */
function initSQLite() {
  return new Promise((resolve, reject) => {
    const dbPath = config.sqlite?.path || '/data/ai-chief-of-staff.db';
    const dbDir = path.dirname(dbPath);

    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        reject(err);
      } else {
        console.log(`Connected to SQLite database at ${dbPath}`);
        try {
          await initDatabaseTables();
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

/**
 * Initialize PostgreSQL database
 */
async function initPostgres() {
  try {
    const pgConfig = config.postgres || {};
    const dbName = pgConfig.database || 'ai_chief_of_staff';
    
    // First connect to 'postgres' database to check if target DB exists
    const adminClient = new Client({
      host: pgConfig.host || 'localhost',
      port: pgConfig.port || 5432,
      database: 'postgres',
      user: pgConfig.user || 'postgres',
      password: pgConfig.password || '',
    });
    
    console.log(`Connecting to PostgreSQL at ${pgConfig.host}:${pgConfig.port}...`);
    await adminClient.connect();
    
    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (result.rows.length === 0) {
      console.log(`Database '${dbName}' does not exist, creating...`);
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully`);
    } else {
      console.log(`Database '${dbName}' already exists`);
    }
    
    await adminClient.end();
    
    // Now connect to the target database
    pool = new Pool({
      host: pgConfig.host || 'localhost',
      port: pgConfig.port || 5432,
      database: dbName,
      user: pgConfig.user || 'postgres',
      password: pgConfig.password || '',
    });
    
    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
    
    console.log(`Connected to PostgreSQL database '${dbName}'`);
    await initDatabaseTablesPostgres();
    
  } catch (err) {
    console.error('Error initializing PostgreSQL:', err);
    throw err;
  }
}

/**
 * Initialize SQLite database tables
 */
function initDatabaseTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
      `, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('SQLite tables initialized');
          resolve();
        }
      });
    });
  });
}

/**
 * Initialize PostgreSQL database tables
 */
async function initDatabaseTablesPostgres() {
  try {
    // Transcripts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT false,
        source TEXT DEFAULT 'upload'
      )
    `);

    // Context table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS context (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER REFERENCES transcripts(id),
        context_type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT,
        deadline TEXT,
        status TEXT DEFAULT 'active',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Commitments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commitments (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER REFERENCES transcripts(id),
        description TEXT NOT NULL,
        deadline TEXT,
        assignee TEXT,
        status TEXT DEFAULT 'pending',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_date TIMESTAMP
      )
    `);

    // Briefs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS briefs (
        id SERIAL PRIMARY KEY,
        brief_date DATE NOT NULL,
        content TEXT NOT NULL,
        top_priorities TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('PostgreSQL tables initialized');
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err);
    throw err;
  }
}

/**
 * Migrate data from SQLite to PostgreSQL
 */
async function migrateToPostgres() {
  console.log('Starting migration from SQLite to PostgreSQL...');
  
  try {
    // Load SQLite database
    const sqlitePath = config.sqlite?.path || '/data/ai-chief-of-staff.db';
    if (!fs.existsSync(sqlitePath)) {
      console.log('No SQLite database found, skipping migration');
      return;
    }
    
    const sqliteDb = new sqlite3.Database(sqlitePath);
    
    // Migrate transcripts
    const transcripts = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM transcripts', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const row of transcripts) {
      await pool.query(
        `INSERT INTO transcripts (id, filename, content, upload_date, processed, source) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.filename, row.content, row.upload_date, row.processed, row.source]
      );
    }
    console.log(`Migrated ${transcripts.length} transcripts`);
    
    // Migrate context
    const contexts = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM context', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const row of contexts) {
      await pool.query(
        `INSERT INTO context (id, transcript_id, context_type, content, priority, deadline, status, created_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.transcript_id, row.context_type, row.content, row.priority, row.deadline, row.status, row.created_date]
      );
    }
    console.log(`Migrated ${contexts.length} context entries`);
    
    // Migrate commitments
    const commitments = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM commitments', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const row of commitments) {
      await pool.query(
        `INSERT INTO commitments (id, transcript_id, description, deadline, assignee, status, created_date, completed_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.transcript_id, row.description, row.deadline, row.assignee, row.status, row.created_date, row.completed_date]
      );
    }
    console.log(`Migrated ${commitments.length} commitments`);
    
    // Migrate briefs
    const briefs = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM briefs', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const row of briefs) {
      await pool.query(
        `INSERT INTO briefs (id, brief_date, content, top_priorities, created_date) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.brief_date, row.content, row.top_priorities, row.created_date]
      );
    }
    console.log(`Migrated ${briefs.length} briefs`);
    
    // Migrate config
    const configRows = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM config', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const row of configRows) {
      await pool.query(
        `INSERT INTO config (key, value, updated_date) 
         VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, updated_date = $3`,
        [row.key, row.value, row.updated_date]
      );
    }
    console.log(`Migrated ${configRows.length} config entries`);
    
    sqliteDb.close();
    console.log('Migration completed successfully');
    
  } catch (err) {
    console.error('Error during migration:', err);
    throw err;
  }
}

/**
 * Get the database connection (unified interface)
 */
function getDb() {
  return dbType === 'postgres' ? pool : db;
}

/**
 * Get database type
 */
function getDbType() {
  return dbType;
}

module.exports = {
  initializeDatabase,
  migrateToPostgres,
  getDb,
  getDbType,
  get db() { return getDb(); }
};
