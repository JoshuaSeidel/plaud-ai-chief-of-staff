const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { createModuleLogger } = require('../utils/logger');

const logger = createModuleLogger('COMMITMENTS');

/**
 * Get all commitments with optional filtering
 */
router.get('/', async (req, res) => {
  const { status } = req.query;
  logger.info(`Fetching commitments with status filter: ${status || 'all'}`);
  
  try {
    const db = getDb();
    let query = 'SELECT * FROM commitments';
    const params = [];
    
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query += ' WHERE deadline < ? AND status != ?';
        params.push(new Date().toISOString(), 'completed');
      } else {
        query += ' WHERE status = ?';
        params.push(status);
      }
    }
    
    query += ' ORDER BY deadline ASC, created_date DESC';
    
    const rows = await db.all(query, params);
    logger.info(`Returning ${rows.length} commitments`);
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching commitments:', err);
    res.status(500).json({ 
      error: 'Error fetching commitments',
      message: err.message
    });
  }
});

/**
 * Get a specific commitment
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  logger.info(`Fetching commitment ID: ${id}`);
  
  try {
    const db = getDb();
    const row = await db.get(
      'SELECT * FROM commitments WHERE id = ?',
      [id]
    );
    
    if (!row) {
      logger.warn(`Commitment not found: ${id}`);
      return res.status(404).json({ error: 'Commitment not found' });
    }
    
    res.json(row);
  } catch (err) {
    logger.error(`Error fetching commitment ${id}:`, err);
    res.status(500).json({ 
      error: 'Error fetching commitment',
      message: err.message
    });
  }
});

/**
 * Update commitment status
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { status, assignee, deadline, description } = req.body;
  
  logger.info(`Updating commitment ${id}`, { status, assignee });
  
  try {
    const db = getDb();
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      
      // If marking as completed, set completed_date
      if (status === 'completed') {
        updates.push('completed_date = ?');
        params.push(new Date().toISOString());
      } else {
        // Clear completed_date if reopening
        updates.push('completed_date = NULL');
      }
    }
    
    if (assignee !== undefined) {
      updates.push('assignee = ?');
      params.push(assignee);
    }
    
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      params.push(deadline);
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    const query = `UPDATE commitments SET ${updates.join(', ')} WHERE id = ?`;
    
    const result = await db.run(query, params);
    
    if (result.changes === 0) {
      logger.warn(`Commitment not found: ${id}`);
      return res.status(404).json({ error: 'Commitment not found' });
    }
    
    logger.info(`Commitment ${id} updated successfully`);
    res.json({ message: 'Commitment updated successfully' });
  } catch (err) {
    logger.error(`Error updating commitment ${id}:`, err);
    res.status(500).json({ 
      error: 'Error updating commitment',
      message: err.message
    });
  }
});

/**
 * Delete a commitment
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  logger.info(`Deleting commitment ID: ${id}`);
  
  try {
    const db = getDb();
    const result = await db.run(
      'DELETE FROM commitments WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      logger.warn(`Commitment not found: ${id}`);
      return res.status(404).json({ error: 'Commitment not found' });
    }
    
    logger.info(`Commitment ${id} deleted successfully`);
    res.json({ message: 'Commitment deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting commitment ${id}:`, err);
    res.status(500).json({ 
      error: 'Error deleting commitment',
      message: err.message
    });
  }
});

/**
 * Get overdue commitments
 */
router.get('/status/overdue', async (req, res) => {
  logger.info('Fetching overdue commitments');
  
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT * FROM commitments 
       WHERE deadline < ? AND status != ? 
       ORDER BY deadline ASC`,
      [new Date().toISOString(), 'completed']
    );
    
    logger.info(`Found ${rows.length} overdue commitments`);
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching overdue commitments:', err);
    res.status(500).json({ 
      error: 'Error fetching overdue commitments',
      message: err.message
    });
  }
});

module.exports = router;

