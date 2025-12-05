const { google } = require('googleapis');
const { getConfig, setConfig, query } = require('../utils/db-helper');

const logger = {
  info: (msg, ...args) => console.log(`[Google Calendar] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Google Calendar ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Google Calendar WARNING] ${msg}`, ...args)
};

/**
 * Get OAuth2 client with credentials from database
 */
async function getOAuthClient() {
  const clientId = await getConfig('googleClientId');
  const clientSecret = await getConfig('googleClientSecret');
  
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    redirectUri = await getConfig('googleRedirectUri') || 'http://localhost:3001/api/calendar/google/callback';
  }
  
  logger.info(`Using Google OAuth redirect URI: ${redirectUri}`);
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  
  // Get stored access token if exists
  const tokenStr = await getConfig('googleCalendarToken');
  if (tokenStr) {
    try {
      const tokens = JSON.parse(tokenStr);
      oauth2Client.setCredentials(tokens);
    } catch (err) {
      logger.warn('Failed to parse stored token', err);
    }
  }
  
  return oauth2Client;
}

/**
 * Generate OAuth URL for user to authorize
 */
async function getAuthUrl() {
  const oauth2Client = await getOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events'
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  
  return url;
}

/**
 * Exchange authorization code for tokens
 */
async function getTokenFromCode(code) {
  const oauth2Client = await getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  
  // Store tokens in database
  await setConfig('googleCalendarToken', JSON.stringify(tokens));
  
  logger.info('Google Calendar tokens stored successfully');
  return tokens;
}

/**
 * Check if user has connected Google Calendar
 */
async function checkStatus() {
  try {
    const tokenStr = await getConfig('googleCalendarToken');
    if (!tokenStr) {
      return {
        connected: false,
        error: 'Not configured'
      };
    }
    
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Test connection by getting calendar list
    const response = await calendar.calendarList.list({ maxResults: 1 });
    
    logger.info('Connected to Google Calendar');
    
    return {
      connected: true,
      calendarsCount: response.data.items?.length || 0
    };
  } catch (error) {
    logger.warn('Google Calendar connection check failed', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Disconnect Google Calendar
 */
async function disconnect() {
  await query('DELETE FROM config WHERE key = ?', ['googleCalendarToken']);
  logger.info('Google Calendar disconnected');
  return { success: true };
}

/**
 * Get configured calendar ID or default to primary
 */
async function getCalendarId() {
  const calendarId = await getConfig('googleCalendarId') || process.env.GOOGLE_CALENDAR_ID || 'primary';
  logger.info(`Using Google Calendar ID: ${calendarId}`);
  return calendarId;
}

/**
 * Create a calendar event
 */
async function createEvent(eventData) {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = await getCalendarId();
    
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'America/New_York',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };
    
    if (eventData.attendees && eventData.attendees.length > 0) {
      event.attendees = eventData.attendees.map(email => ({ email }));
    }
    
    logger.info(`Creating calendar event: ${eventData.title} in calendar: ${calendarId}`);
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });
    
    logger.info(`Event created successfully: ${response.data.id}`);
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start.dateTime || response.data.start.date,
      end: response.data.end.dateTime || response.data.end.date,
      htmlLink: response.data.htmlLink
    };
  } catch (error) {
    logger.error('Error creating calendar event', error);
    throw error;
  }
}

/**
 * Update a calendar event
 */
async function updateEvent(eventId, updates) {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = await getCalendarId();
    
    const event = {};
    
    if (updates.title) event.summary = updates.title;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime,
        timeZone: updates.timeZone || 'America/New_York'
      };
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime,
        timeZone: updates.timeZone || 'America/New_York'
      };
    }
    
    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: event
    });
    
    logger.info(`Updated calendar event: ${eventId}`);
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start.dateTime || response.data.start.date,
      end: response.data.end.dateTime || response.data.end.date
    };
  } catch (error) {
    logger.error(`Error updating calendar event ${eventId}`, error);
    throw error;
  }
}

/**
 * List upcoming events
 */
async function listEvents(maxResults = 50, timeMin = null, timeMax = null) {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = await getCalendarId();
    
    const params = {
      calendarId: calendarId,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    };
    
    if (timeMin) {
      params.timeMin = new Date(timeMin).toISOString();
    } else {
      params.timeMin = new Date().toISOString();
    }
    
    if (timeMax) {
      params.timeMax = new Date(timeMax).toISOString();
    }
    
    const response = await calendar.events.list(params);
    
    const events = response.data.items || [];
    logger.info(`Retrieved ${events.length} calendar events`);
    
    return events.map(event => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location,
      htmlLink: event.htmlLink,
      attendees: event.attendees?.map(a => a.email) || []
    }));
  } catch (error) {
    logger.error('Error listing calendar events', error);
    throw error;
  }
}

/**
 * Get a specific event
 */
async function getEvent(eventId) {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = await getCalendarId();
    
    const response = await calendar.events.get({
      calendarId,
      eventId
    });
    
    const event = response.data;
    
    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location,
      htmlLink: event.htmlLink,
      attendees: event.attendees?.map(a => a.email) || []
    };
  } catch (error) {
    logger.error(`Error getting calendar event ${eventId}`, error);
    throw error;
  }
}

/**
 * Delete a calendar event by ID
 */
async function deleteEvent(eventId) {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = await getCalendarId();
    
    await calendar.events.delete({
      calendarId,
      eventId
    });
    
    logger.info(`Deleted calendar event: ${eventId}`);
    return { success: true };
  } catch (error) {
    if (error.code === 404 || error.message?.includes('Not Found')) {
      logger.warn(`Calendar event ${eventId} not found (may have been already deleted)`);
      return { success: false, error: 'Not found' };
    }
    logger.error(`Error deleting calendar event ${eventId}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * List all calendars accessible to the user
 */
async function listCalendars() {
  try {
    const oauth2Client = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.calendarList.list();
    
    const calendars = response.data.items.map(cal => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor
    }));
    
    logger.info(`Retrieved ${calendars.length} calendars`);
    return calendars;
  } catch (error) {
    logger.error('Error listing calendars', error);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  checkStatus,
  disconnect,
  createEvent,
  updateEvent,
  listEvents,
  getEvent,
  deleteEvent,
  listCalendars
};
