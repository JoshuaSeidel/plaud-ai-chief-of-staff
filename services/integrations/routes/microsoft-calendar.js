const express = require('express');
const router = express.Router();
const microsoftCalendar = require('../services/microsoft-calendar');

/**
 * GET /calendar/microsoft/status
 * Check if Microsoft is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await microsoftCalendar.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Microsoft Calendar Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/microsoft/auth-url
 * Get OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const url = await microsoftCalendar.getAuthUrl();
    res.json({ url });
  } catch (err) {
    console.error('[Microsoft Calendar Route] Get auth URL error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/microsoft/callback
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
    
    await microsoftCalendar.getTokenFromCode(code);
    res.json({ 
      success: true,
      message: 'Microsoft connected successfully'
    });
  } catch (err) {
    console.error('[Microsoft Calendar Route] OAuth callback error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /calendar/microsoft/disconnect
 * Disconnect Microsoft
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const result = await microsoftCalendar.disconnect();
    res.json(result);
  } catch (err) {
    console.error('[Microsoft Calendar Route] Disconnect error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/microsoft/calendars
 * List all accessible calendars
 */
router.get('/calendars', async (req, res) => {
  try {
    const calendars = await microsoftCalendar.listCalendars();
    res.json({ calendars });
  } catch (err) {
    console.error('[Microsoft Calendar Route] List calendars error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/microsoft/events
 * List calendar events
 */
router.get('/events', async (req, res) => {
  try {
    const { maxResults, timeMin, timeMax } = req.query;
    const events = await microsoftCalendar.listEvents(
      maxResults ? parseInt(maxResults) : 50,
      timeMin,
      timeMax
    );
    res.json({ events });
  } catch (err) {
    console.error('[Microsoft Calendar Route] List events error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/microsoft/events/:eventId
 * Get a specific event
 */
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await microsoftCalendar.getEvent(eventId);
    res.json({ event });
  } catch (err) {
    console.error('[Microsoft Calendar Route] Get event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /calendar/microsoft/events
 * Create a new calendar event
 * 
 * Body:
 *   - title (required): Event title
 *   - description: Event description
 *   - startTime (required): Start time (ISO format)
 *   - endTime (required): End time (ISO format)
 *   - timeZone: Time zone (default: America/New_York)
 *   - attendees: Array of email addresses
 */
router.post('/events', async (req, res) => {
  try {
    const { title, description, startTime, endTime, timeZone, attendees } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Title, startTime, and endTime are required' 
      });
    }
    
    const event = await microsoftCalendar.createEvent({
      title,
      description,
      startTime,
      endTime,
      timeZone,
      attendees
    });
    
    res.status(201).json({ event });
  } catch (err) {
    console.error('[Microsoft Calendar Route] Create event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /calendar/microsoft/events/:eventId
 * Update an existing event
 * 
 * Body:
 *   - title: New event title
 *   - description: New event description
 *   - startTime: New start time
 *   - endTime: New end time
 *   - timeZone: New time zone
 */
router.put('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, startTime, endTime, timeZone } = req.body;
    
    const event = await microsoftCalendar.updateEvent(eventId, {
      title,
      description,
      startTime,
      endTime,
      timeZone
    });
    
    res.json({ event });
  } catch (err) {
    console.error('[Microsoft Calendar Route] Update event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /calendar/microsoft/events/:eventId
 * Delete a calendar event
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await microsoftCalendar.deleteEvent(eventId);
    res.json(result);
  } catch (err) {
    console.error('[Microsoft Calendar Route] Delete event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
