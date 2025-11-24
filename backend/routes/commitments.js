const express = require('express');
const router = express.Router();
const { getDb, getDbType } = require('../database/db');
const { createModuleLogger } = require('../utils/logger');
const googleCalendar = require('../services/google-calendar');

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
    
    // Get current task data if we're changing status to completed
    let task = null;
    let shouldDeleteCalendarEvent = false;
    
    if (status === 'completed') {
      task = await db.get('SELECT calendar_event_id, deadline FROM commitments WHERE id = ?', [id]);
      
      if (task && task.calendar_event_id) {
        // Check if event time is in the past
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const now = new Date();
        
        // Only delete if event is in the future
        if (!deadline || deadline > now) {
          shouldDeleteCalendarEvent = true;
        } else {
          logger.info(`Keeping calendar event ${task.calendar_event_id} - event time is in the past`);
        }
      }
    }
    
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
        
        // Clear calendar_event_id if we're deleting the event
        if (shouldDeleteCalendarEvent) {
          updates.push('calendar_event_id = NULL');
        }
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
    
    // Delete calendar event if needed (after updating database)
    if (shouldDeleteCalendarEvent && task && task.calendar_event_id) {
      try {
        const isConnected = await googleCalendar.isConnected();
        if (isConnected) {
          await googleCalendar.deleteEvent(task.calendar_event_id);
          logger.info(`Deleted calendar event ${task.calendar_event_id} for completed task ${id}`);
        }
      } catch (calError) {
        logger.warn(`Failed to delete calendar event: ${calError.message}`);
      }
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

/**
 * Confirm or reject a task (for tasks needing confirmation)
 */
router.post('/:id/confirm', async (req, res) => {
  const id = req.params.id;
  const { confirmed } = req.body; // true to confirm, false to reject
  
  logger.info(`${confirmed ? 'Confirming' : 'Rejecting'} task ${id}`);
  
  try {
    const db = getDb();
    
    if (confirmed) {
      // Confirm the task - remove needs_confirmation flag
      const task = await db.get('SELECT * FROM commitments WHERE id = ?', [id]);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Update task to remove needs_confirmation
      const dbType = getDbType();
      const falseValue = dbType === 'postgres' ? false : 0;
      await db.run(
        'UPDATE commitments SET needs_confirmation = ? WHERE id = ?',
        [falseValue, id]
      );
      
      // If task has a deadline and Google Calendar is connected, create calendar event
      if (task.deadline) {
        try {
          const isConnected = await googleCalendar.isConnected();
          if (isConnected && !task.calendar_event_id) {
            const event = await googleCalendar.createEventFromCommitment({
              ...task,
              task_type: task.task_type || 'commitment'
            });
            await db.run('UPDATE commitments SET calendar_event_id = ? WHERE id = ?', [event.id, id]);
            logger.info(`Created calendar event ${event.id} for confirmed task ${id}`);
          }
        } catch (calError) {
          logger.warn(`Failed to create calendar event for confirmed task: ${calError.message}`);
        }
      }
      
      logger.info(`Task ${id} confirmed successfully`);
      res.json({ message: 'Task confirmed successfully' });
    } else {
      // Reject the task - delete it
      const result = await db.run('DELETE FROM commitments WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        logger.warn(`Task not found: ${id}`);
        return res.status(404).json({ error: 'Task not found' });
      }
      
      logger.info(`Task ${id} rejected and deleted`);
      res.json({ message: 'Task rejected and removed' });
    }
  } catch (err) {
    logger.error(`Error ${confirmed ? 'confirming' : 'rejecting'} task ${id}:`, err);
    res.status(500).json({ 
      error: `Error ${confirmed ? 'confirming' : 'rejecting'} task`,
      message: err.message
    });
  }
});

module.exports = router;

