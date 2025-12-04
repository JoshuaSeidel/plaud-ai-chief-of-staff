const express = require('express');
const router = express.Router();
const trello = require('../services/trello');

/**
 * GET /tasks/trello/status
 * Check if Trello is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await trello.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Trello Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/trello/boards
 * Get list of boards accessible to the user
 */
router.get('/boards', async (req, res) => {
  try {
    const boards = await trello.getBoards();
    res.json({ boards });
  } catch (err) {
    console.error('[Trello Route] Get boards error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/trello/boards/:boardId/lists
 * Get lists from a specific board
 */
router.get('/boards/:boardId/lists', async (req, res) => {
  try {
    const { boardId } = req.params;
    const lists = await trello.getLists(boardId);
    res.json({ lists });
  } catch (err) {
    console.error('[Trello Route] Get lists error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/trello/lists/:listId/cards
 * Get cards from a specific list
 */
router.get('/lists/:listId/cards', async (req, res) => {
  try {
    const { listId } = req.params;
    const cards = await trello.getCards(listId);
    res.json({ cards });
  } catch (err) {
    console.error('[Trello Route] Get cards error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /tasks/trello/search
 * Search for cards
 */
router.get('/search', async (req, res) => {
  try {
    const { q, boardId } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required' 
      });
    }
    
    const cards = await trello.searchCards(q, boardId);
    res.json({ cards });
  } catch (err) {
    console.error('[Trello Route] Search error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/trello/card
 * Create a new card
 * 
 * Body:
 *   - title (required): Card title
 *   - description: Card description
 *   - listId: Target list ID (uses default if not provided)
 *   - boardId: Board ID
 *   - dueDate: Due date (ISO format)
 *   - labels: Array of label IDs
 */
router.post('/card', async (req, res) => {
  try {
    const { title, description, listId, boardId, dueDate, labels } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        error: 'Title is required' 
      });
    }
    
    const card = await trello.createCard({
      title,
      description,
      listId,
      boardId,
      dueDate,
      labels
    });
    
    res.status(201).json({ card });
  } catch (err) {
    console.error('[Trello Route] Create card error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /tasks/trello/card/:cardId
 * Update an existing card
 * 
 * Body:
 *   - title: New card title
 *   - description: New card description
 *   - dueDate: New due date
 *   - dueComplete: Mark due date as complete (boolean)
 *   - listId: Move to different list
 */
router.put('/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, description, dueDate, dueComplete, listId } = req.body;
    
    const card = await trello.updateCard(cardId, {
      title,
      description,
      dueDate,
      dueComplete,
      listId
    });
    
    res.json({ card });
  } catch (err) {
    console.error('[Trello Route] Update card error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/trello/card/:cardId/comment
 * Add a comment to a card
 * 
 * Body:
 *   - text (required): Comment text
 */
router.post('/card/:cardId/comment', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Comment text is required' 
      });
    }
    
    const comment = await trello.addComment(cardId, text);
    res.status(201).json({ comment });
  } catch (err) {
    console.error('[Trello Route] Add comment error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /tasks/trello/card/:cardId/archive
 * Archive a card with optional completion note
 * 
 * Body:
 *   - completionNote: Optional note about completion
 */
router.post('/card/:cardId/archive', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { completionNote } = req.body;
    
    const card = await trello.archiveCard(cardId, completionNote);
    res.json({ card });
  } catch (err) {
    console.error('[Trello Route] Archive card error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /tasks/trello/card/:cardId
 * Delete a card permanently
 */
router.delete('/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await trello.deleteCard(cardId);
    res.json(result);
  } catch (err) {
    console.error('[Trello Route] Delete card error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
