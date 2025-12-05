const express = require('express');
const router = express.Router();
const monday = require('../services/monday');

/**
 * GET /tasks/monday/status
 * Check if Monday.com is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await monday.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Monday.com Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/monday/boards
 * Get list of boards accessible to the user
 */
router.get('/boards', async (req, res) => {
  try {
    const boards = await monday.getBoards();
    res.json({ boards });
  } catch (err) {
    console.error('[Monday.com Route] Get boards error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/monday/boards/:boardId/groups
 * Get groups (sections) from a specific board
 */
router.get('/boards/:boardId/groups', async (req, res) => {
  try {
    const { boardId } = req.params;
    const groups = await monday.getGroups(boardId);
    res.json({ groups });
  } catch (err) {
    console.error('[Monday.com Route] Get groups error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/monday/boards/:boardId/columns
 * Get columns from a specific board
 */
router.get('/boards/:boardId/columns', async (req, res) => {
  try {
    const { boardId } = req.params;
    const columns = await monday.getColumns(boardId);
    res.json({ columns });
  } catch (err) {
    console.error('[Monday.com Route] Get columns error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/monday/boards/:boardId/items
 * Get items from a specific board
 */
router.get('/boards/:boardId/items', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { groupId } = req.query;
    const items = await monday.getItems(boardId, groupId);
    res.json({ items });
  } catch (err) {
    console.error('[Monday.com Route] Get items error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/monday/search
 * Search for items
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required' 
      });
    }
    
    const items = await monday.searchItems(q);
    res.json({ items });
  } catch (err) {
    console.error('[Monday.com Route] Search error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/monday/item
 * Create a new item
 * 
 * Body:
 *   - name (required): Item name
 *   - boardId: Target board ID (uses default if not provided)
 *   - groupId: Target group ID (uses default if not provided)
 *   - columnValues: Object with column values (e.g., { status: "Working on it", date: "2024-01-15" })
 */
router.post('/item', async (req, res) => {
  try {
    const { name, boardId, groupId, columnValues } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'Name is required' 
      });
    }
    
    const item = await monday.createItem({
      name,
      boardId,
      groupId,
      columnValues
    });
    
    res.status(201).json({ item });
  } catch (err) {
    console.error('[Monday.com Route] Create item error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /tasks/monday/item/:itemId
 * Update an existing item
 * 
 * Body:
 *   - name: New item name
 *   - columnValues: Object with column values to update
 */
router.put('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, columnValues } = req.body;
    
    const item = await monday.updateItem(itemId, {
      name,
      columnValues
    });
    
    res.json({ item });
  } catch (err) {
    console.error('[Monday.com Route] Update item error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/monday/item/:itemId/update
 * Add an update (comment) to an item
 * 
 * Body:
 *   - text (required): Update text
 */
router.post('/item/:itemId/update', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Update text is required' 
      });
    }
    
    const update = await monday.addUpdate(itemId, text);
    res.status(201).json({ update });
  } catch (err) {
    console.error('[Monday.com Route] Add update error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/monday/item/:itemId/archive
 * Archive an item with optional completion note
 * 
 * Body:
 *   - completionNote: Optional note about completion
 */
router.post('/item/:itemId/archive', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { completionNote } = req.body;
    
    const item = await monday.archiveItem(itemId, completionNote);
    res.json({ item });
  } catch (err) {
    console.error('[Monday.com Route] Archive item error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/monday/item/:itemId
 * Delete an item permanently
 */
router.delete('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await monday.deleteItem(itemId);
    res.json(result);
  } catch (err) {
    console.error('[Monday.com Route] Delete item error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
