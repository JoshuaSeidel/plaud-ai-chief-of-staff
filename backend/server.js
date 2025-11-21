const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database before loading routes
const { initializeDatabase } = require('./database/db');

console.log('=================================');
console.log('AI Chief of Staff - Starting...');
console.log('=================================');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (for all-in-one container)
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Make upload middleware available to routes
app.set('upload', upload);

// Health check (available before database is initialized)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Chief of Staff API is running' });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database first
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database ready');
    
    // Import and setup routes after database is initialized
    const briefRoutes = require('./routes/brief');
    const transcriptRoutes = require('./routes/transcripts');
    const configRoutes = require('./routes/config');
    const calendarRoutes = require('./routes/calendar');
    
    app.use('/api/brief', briefRoutes);
    app.use('/api/transcripts', transcriptRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/calendar', calendarRoutes);
    
    // Serve frontend for any non-API routes (for all-in-one container)
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log('=================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log('=================================');
    });
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
