/**
 * Integrations Microservice
 * 
 * Handles all external integrations:
 * - Calendar: Google Calendar, Microsoft Calendar, iCloud
 * - Task Management: Jira, Microsoft Planner, Trello, Monday.com
 * 
 * This microservice lightens the main backend by handling all external API communications.
 */

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./utils/db-helper');

const logger = {
  info: (msg, ...args) => console.log(`[Integrations] ${msg}`, JSON.stringify(args).slice(1, -1)),
  error: (msg, ...args) => console.error(`[Integrations ERROR] ${msg}`, JSON.stringify(args).slice(1, -1)),
  warn: (msg, ...args) => console.warn(`[Integrations WARNING] ${msg}`, JSON.stringify(args).slice(1, -1))
};

const app = express();
const PORT = process.env.PORT || 8006;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`HTTP Request`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'integrations',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Chief of Staff - Integrations Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      calendar: {
        google: '/calendar/google/*',
        microsoft: '/calendar/microsoft/*',
        icloud: '/calendar/icloud/*'
      },
      tasks: {
        jira: '/tasks/jira/*',
        planner: '/tasks/planner/*',
        trello: '/tasks/trello/*',
        monday: '/tasks/monday/*'
      }
    }
  });
});

// Initialize database and load routes
(async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Import route modules
    const googleCalendarRoutes = require('./routes/google-calendar');
    const microsoftCalendarRoutes = require('./routes/microsoft-calendar');
    const jiraRoutes = require('./routes/jira');
    const plannerRoutes = require('./routes/planner');
    const trelloRoutes = require('./routes/trello');
    const mondayRoutes = require('./routes/monday');
    
    // Register routes
    app.use('/calendar/google', googleCalendarRoutes);
    app.use('/calendar/microsoft', microsoftCalendarRoutes);
    app.use('/tasks/jira', jiraRoutes);
    app.use('/tasks/planner', plannerRoutes);
    app.use('/tasks/trello', trelloRoutes);
    app.use('/tasks/monday', mondayRoutes);
    
    logger.info('All integration routes loaded successfully');
  } catch (err) {
    logger.error('Failed to initialize service:', err.message);
    process.exit(1);
  }
})();

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`=== Integrations Service Starting ===`);
  logger.info(`→ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`→ Port: ${PORT}`);
  logger.info(`→ Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
  logger.info(`✓ Server ready and listening`);
  logger.info(`=====================================`);
});

module.exports = app;
