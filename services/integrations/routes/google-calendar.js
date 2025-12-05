const express = require('express');
const router = express.Router();
const googleCalendar = require('../services/google-calendar');

/**
 * GET /calendar/google/status
 * Check if Google Calendar is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await googleCalendar.checkStatus();
    res.json(status);
  } catch (err) {
    console.error('[Google Calendar Route] Status check error:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/google/auth-url
 * Get OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const url = await googleCalendar.getAuthUrl();
    res.json({ url });
  } catch (err) {
    console.error('[Google Calendar Route] Get auth URL error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/google/callback
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
    
    await googleCalendar.getTokenFromCode(code);
    res.json({ 
      success: true,
      message: 'Google Calendar connected successfully'
    });
  } catch (err) {
    console.error('[Google Calendar Route] OAuth callback error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /calendar/google/disconnect
 * Disconnect Google Calendar
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const result = await googleCalendar.disconnect();
    res.json(result);
  } catch (err) {
    console.error('[Google Calendar Route] Disconnect error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/google/calendars
 * List all accessible calendars
 */
router.get('/calendars', async (req, res) => {
  try {
    const calendars = await googleCalendar.listCalendars();
    res.json({ calendars });
  } catch (err) {
    console.error('[Google Calendar Route] List calendars error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/google/events
 * List calendar events
 */
router.get('/events', async (req, res) => {
  try {
    const { maxResults, timeMin, timeMax } = req.query;
    const events = await googleCalendar.listEvents(
      maxResults ? parseInt(maxResults) : 50,
      timeMin,
      timeMax
    );
    res.json({ events });
  } catch (err) {
    console.error('[Google Calendar Route] List events error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * GET /calendar/google/events/:eventId
 * Get a specific event
 */
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await googleCalendar.getEvent(eventId);
    res.json({ event });
  } catch (err) {
    console.error('[Google Calendar Route] Get event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * POST /calendar/google/events
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
    
    const event = await googleCalendar.createEvent({
      title,
      description,
      startTime,
      endTime,
      timeZone,
      attendees
    });
    
    res.status(201).json({ event });
  } catch (err) {
    console.error('[Google Calendar Route] Create event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * PUT /calendar/google/events/:eventId
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
    
    const event = await googleCalendar.updateEvent(eventId, {
      title,
      description,
      startTime,
      endTime,
      timeZone
    });
    
    res.json({ event });
  } catch (err) {
    console.error('[Google Calendar Route] Update event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

/**
 * DELETE /calendar/google/events/:eventId
 * Delete a calendar event
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await googleCalendar.deleteEvent(eventId);
    res.json(result);
  } catch (err) {
    console.error('[Google Calendar Route] Delete event error:', err);
    res.status(500).json({ 
      error: err.message 
    });
  }
});

module.exports = router;
