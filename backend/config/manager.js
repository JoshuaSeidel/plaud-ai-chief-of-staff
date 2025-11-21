const fs = require('fs');
const path = require('path');

const CONFIG_DIR = process.env.CONFIG_DIR || '/data';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  dbType: 'sqlite',
  sqlite: {
    path: path.join(CONFIG_DIR, 'ai-chief-of-staff.db')
  },
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'ai_chief_of_staff',
    user: 'postgres',
    password: ''
  }
};

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`Created config directory: ${CONFIG_DIR}`);
  }
}

/**
 * Load configuration from file
 */
function loadConfig() {
  ensureConfigDir();
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      console.log(`Loaded configuration from ${CONFIG_FILE}`);
      console.log(`Database type: ${config.dbType}`);
      return config;
    } else {
      console.log('No config file found, using defaults');
      saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
  } catch (err) {
    console.error('Error loading config:', err);
    console.log('Using default configuration');
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file
 */
function saveConfig(config) {
  ensureConfigDir();
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Saved configuration to ${CONFIG_FILE}`);
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
}

/**
 * Update specific config values
 */
function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  return saveConfig(newConfig) ? newConfig : config;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE
};
