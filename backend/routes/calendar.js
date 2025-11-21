const express = require('express');
const router = express.Router();
const ical = require('node-ical');
const { getDb } = require('../database/db');
const { createModuleLogger } = require('../utils/logger');

const logger = createModuleLogger('CALENDAR');

/**
 * Get calendar URL from config
 */
async function getCalendarUrl() {
  const db = getDb();
  try {
    const row = await db.get('SELECT value FROM config WHERE key = ?', ['icalCalendarUrl']);
    if (row && row.value) {
      let url = row.value;
      // Handle JSON-encoded values
      if (url.startsWith('"')) {
        url = JSON.parse(url);
      }
      return url;
    }
  } catch (err) {
    logger.error('Error getting calendar URL from config', err);
  }
  return null;
}

/**
 * Fetch calendar events from iCloud
 */
router.get('/events', async (req, res) => {
  try {
    const calendarUrl = await getCalendarUrl();
    
    if (!calendarUrl) {
      logger.warn('Calendar events requested but iCloud calendar URL not configured');
      return res.status(400).json({ 
        error: 'iCloud calendar URL not configured',
        message: 'Please configure your iCloud calendar URL in the Configuration tab'
      });
    }

    logger.info('Fetching calendar events from iCloud');
    
    // Convert webcal:// to https://
    const httpsUrl = calendarUrl.replace('webcal://', 'https://');
    
    const events = await ical.async.fromURL(httpsUrl);
    const eventList = [];
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 2); // Next 2 months

    for (const [key, event] of Object.entries(events)) {
      if (event.type === 'VEVENT') {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // Only include upcoming events (not past events)
        if (eventEnd >= now && eventStart <= futureLimit) {
          eventList.push({
            id: key,
            summary: event.summary || 'Untitled Event',
            start: event.start,
            end: event.end,
            description: event.description || '',
            location: event.location || '',
            allDay: !event.start.getHours && !event.start.getMinutes
          });
        }
      }
    }

    // Sort by start time
    eventList.sort((a, b) => new Date(a.start) - new Date(b.start));

    logger.info(`Retrieved ${eventList.length} upcoming calendar events`);
    res.json(eventList);
  } catch (error) {
    logger.error('Error fetching calendar events', error);
    res.status(500).json({ 
      error: 'Error fetching calendar events', 
      message: error.message,
      hint: 'Make sure your calendar URL is correct and publicly accessible'
    });
  }
});

/**
 * Create calendar block and return ICS file
 */
router.post('/block', async (req, res) => {
  const { title, startTime, endTime, description } = req.body;

  if (!title || !startTime || !endTime) {
    logger.warn('Calendar block creation attempted with missing required fields');
    return res.status(400).json({ error: 'Title, startTime, and endTime are required' });
  }

  logger.info(`Creating calendar block: ${title}`, {
    start: startTime,
    end: endTime
  });

  const icsContent = generateICS(title, startTime, endTime, description);
  
  logger.info('Calendar block ICS file generated');
  res.json({
    message: 'Calendar block created successfully',
    title,
    startTime,
    endTime,
    description,
    icsContent,
    downloadUrl: `/api/calendar/download/${encodeURIComponent(title)}.ics`
  });
});

/**
 * Generate ICS format for calendar event
 */
function generateICS(title, startTime, endTime, description) {
  const start = new Date(startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(endTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Chief of Staff//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@aichief
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${title}
DESCRIPTION:${description || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download ICS file
 */
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const { title, startTime, endTime, description } = req.query;
  
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  logger.info(`ICS download requested for: ${filename}`);
  
  const icsContent = generateICS(title, startTime, endTime, description);
  
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(icsContent);
});

module.exports = router;
