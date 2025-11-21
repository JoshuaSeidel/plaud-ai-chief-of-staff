const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Get configuration
 */
router.get('/', (req, res) => {
  db.all('SELECT * FROM config', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching configuration' });
    }
    
    // Convert rows to object
    const config = {};
    rows.forEach(row => {
      config[row.key] = row.value;
    });
    
    res.json(config);
  });
});

/**
 * Update configuration
 */
router.post('/', (req, res) => {
  const { key, value } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }
  
  db.run(
    'INSERT OR REPLACE INTO config (key, value, updated_date) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [key, JSON.stringify(value)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating configuration' });
      }
      res.json({ message: 'Configuration updated successfully', key, value });
    }
  );
});

/**
 * Bulk update configuration
 */
router.put('/', (req, res) => {
  const config = req.body;
  
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Configuration object required' });
  }
  
  const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value, updated_date) VALUES (?, ?, CURRENT_TIMESTAMP)');
  
  for (const [key, value] of Object.entries(config)) {
    stmt.run(key, JSON.stringify(value));
  }
  
  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating configuration' });
    }
    res.json({ message: 'Configuration updated successfully' });
  });
});

/**
 * Get specific config value
 */
router.get('/:key', (req, res) => {
  db.get(
    'SELECT value FROM config WHERE key = ?',
    [req.params.key],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching configuration' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Configuration key not found' });
      }
      try {
        res.json({ key: req.params.key, value: JSON.parse(row.value) });
      } catch {
        res.json({ key: req.params.key, value: row.value });
      }
    }
  );
});

module.exports = router;
