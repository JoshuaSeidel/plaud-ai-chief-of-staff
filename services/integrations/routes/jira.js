const express = require('express');
const router = express.Router();
const jira = require('../services/jira');

/**
 * GET /tasks/jira/status
 * Check if Jira is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await jira.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Jira Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/jira/disconnect
 * Disconnect Jira (clear credentials)
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const result = await jira.disconnect();
    res.json(result);
  } catch (err) {
    console.error('[Jira Route] Disconnect error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/jira/projects
 * List available projects
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await jira.listProjects();
    res.json({ projects });
  } catch (err) {
    console.error('[Jira Route] Get projects error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/jira/projects/:projectKey
 * Get project information
 */
router.get('/projects/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const project = await jira.getProject(projectKey);
    res.json({ project });
  } catch (err) {
    console.error('[Jira Route] Get project error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/jira/projects/:projectKey/issue-types
 * Get issue types for a project
 */
router.get('/projects/:projectKey/issue-types', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const issueTypes = await jira.getIssueTypes(projectKey);
    res.json({ issueTypes });
  } catch (err) {
    console.error('[Jira Route] Get issue types error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/jira/issues
 * List issues in project
 */
router.get('/issues', async (req, res) => {
  try {
    const { projectKey, limit } = req.query;
    const issues = await jira.listIssues(projectKey, limit ? parseInt(limit) : 50);
    res.json({ issues });
  } catch (err) {
    console.error('[Jira Route] List issues error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/jira/issues/:issueKey
 * Get issue by key
 */
router.get('/issues/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const issue = await jira.getIssue(issueKey);
    res.json({ issue });
  } catch (err) {
    console.error('[Jira Route] Get issue error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/jira/issues
 * Create a new issue
 * 
 * Body:
 *   - summary (required): Issue summary
 *   - description: Issue description
 *   - issueType: Issue type (Task, Story, Bug, etc.)
 *   - assignee: Assignee email or account ID
 *   - dueDate: Due date (ISO format)
 *   - priority: Priority (Highest, High, Medium, Low, Lowest)
 */
router.post('/issues', async (req, res) => {
  try {
    const { summary, description, issueType, assignee, dueDate, priority } = req.body;
    
    if (!summary) {
      return res.status(400).json({ 
        error: 'Summary is required' 
      });
    }
    
    const issue = await jira.createIssue({
      summary,
      description,
      issueType,
      assignee,
      dueDate,
      priority
    });
    
    res.status(201).json({ issue });
  } catch (err) {
    console.error('[Jira Route] Create issue error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /tasks/jira/issues/:issueKey
 * Update an existing issue
 * 
 * Body:
 *   - summary: New summary
 *   - description: New description
 *   - priority: New priority
 *   - dueDate: New due date
 */
router.put('/issues/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { summary, description, priority, dueDate } = req.body;
    
    const result = await jira.updateIssue(issueKey, {
      summary,
      description,
      priority,
      dueDate
    });
    
    res.json(result);
  } catch (err) {
    console.error('[Jira Route] Update issue error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/jira/issues/:issueKey/comment
 * Add a comment to an issue
 * 
 * Body:
 *   - text (required): Comment text
 */
router.post('/issues/:issueKey/comment', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Comment text is required' 
      });
    }
    
    const result = await jira.addComment(issueKey, text);
    res.status(201).json(result);
  } catch (err) {
    console.error('[Jira Route] Add comment error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/jira/issues/:issueKey/close
 * Close an issue with optional completion note
 * 
 * Body:
 *   - completionNote: Optional note about completion
 */
router.post('/issues/:issueKey/close', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { completionNote } = req.body;
    
    const result = await jira.closeIssue(issueKey, completionNote);
    res.json(result);
  } catch (err) {
    console.error('[Jira Route] Close issue error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/jira/issues/:issueKey
 * Delete an issue permanently
 */
router.delete('/issues/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const result = await jira.deleteIssue(issueKey);
    res.json(result);
  } catch (err) {
    console.error('[Jira Route] Delete issue error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
