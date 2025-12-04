const express = require('express');
const router = express.Router();
const planner = require('../services/planner');

/**
 * GET /tasks/planner/status
 * Check if Microsoft is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await planner.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Planner Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/planner/auth-url
 * Get OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const url = await planner.getAuthUrl();
    res.json({ url });
  } catch (err) {
    console.error('[Planner Route] Get auth URL error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/planner/callback
 * OAuth callback endpoint
 */
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Authorization code is required' 
      });
    }
    
    const tokens = await planner.getTokenFromCode(code);
    res.json({ 
      success: true,
      message: 'Microsoft connected successfully'
    });
  } catch (err) {
    console.error('[Planner Route] OAuth callback error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/planner/disconnect
 * Disconnect Microsoft (clear tokens)
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const result = await planner.disconnect();
    res.json(result);
  } catch (err) {
    console.error('[Planner Route] Disconnect error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/planner/lists
 * List all available task lists
 */
router.get('/lists', async (req, res) => {
  try {
    const lists = await planner.listTaskLists();
    res.json({ lists });
  } catch (err) {
    console.error('[Planner Route] Get lists error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/planner/tasks
 * List all tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const { limit } = req.query;
    const tasks = await planner.listTasks(limit ? parseInt(limit) : 50);
    res.json({ tasks });
  } catch (err) {
    console.error('[Planner Route] List tasks error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/planner/tasks/:taskId
 * Get a specific task
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await planner.getTask(taskId);
    res.json({ task });
  } catch (err) {
    console.error('[Planner Route] Get task error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/planner/tasks
 * Create a new task
 * 
 * Body:
 *   - title (required): Task title
 *   - description: Task description
 *   - dueDate: Due date (ISO format)
 *   - importance: Importance level (low, normal, high)
 *   - status: Task status (notStarted, inProgress, completed, waitingOnOthers, deferred)
 */
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, importance, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        error: 'Title is required' 
      });
    }
    
    const task = await planner.createTask({
      title,
      description,
      dueDate,
      importance,
      status
    });
    
    res.status(201).json({ task });
  } catch (err) {
    console.error('[Planner Route] Create task error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /tasks/planner/tasks/:taskId
 * Update an existing task
 * 
 * Body:
 *   - title: New task title
 *   - description: New task description
 *   - dueDate: New due date
 *   - importance: New importance level
 *   - status: New task status
 */
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, importance, status } = req.body;
    
    const result = await planner.updateTask(taskId, {
      title,
      description,
      dueDate,
      importance,
      status
    });
    
    res.json(result);
  } catch (err) {
    console.error('[Planner Route] Update task error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/planner/tasks/:taskId/complete
 * Mark a task as completed with optional completion note
 * 
 * Body:
 *   - completionNote: Optional note about completion
 */
router.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completionNote } = req.body;
    
    const result = await planner.completeTask(taskId, completionNote);
    res.json(result);
  } catch (err) {
    console.error('[Planner Route] Complete task error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/planner/tasks/:taskId
 * Delete a task permanently
 */
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await planner.deleteTask(taskId);
    res.json(result);
  } catch (err) {
    console.error('[Planner Route] Delete task error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
