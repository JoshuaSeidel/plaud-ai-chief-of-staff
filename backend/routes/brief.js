const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { generateDailyBrief, generateWeeklyReport } = require('../services/claude');

// Logger for the brief route
const logger = {
  info: (msg, ...args) => console.log(`[BRIEF] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[BRIEF ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[BRIEF WARNING] ${msg}`, ...args)
};

/**
 * Generate daily brief
 */
router.post('/generate', async (req, res) => {
  logger.info('Generating daily brief...');
  
  try {
    const db = getDb();
    
    // Get context from last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoISO = twoWeeksAgo.toISOString();

    logger.info(`Fetching context from ${twoWeeksAgoISO}`);

    // Fetch recent context
    const contextQuery = `
      SELECT * FROM context 
      WHERE created_date >= ? AND status = 'active'
      ORDER BY created_date DESC
    `;

    const commitmentsQuery = `
      SELECT * FROM commitments 
      WHERE created_date >= ? AND status != 'completed'
      ORDER BY deadline ASC
    `;

    const transcriptsQuery = `
      SELECT * FROM transcripts 
      WHERE upload_date >= ?
      ORDER BY upload_date DESC
    `;

    try {
      // Use the unified interface with await
      const contextRows = await db.all(contextQuery, [twoWeeksAgoISO]);
      logger.info(`Found ${contextRows.length} context entries`);
      
      const commitmentRows = await db.all(commitmentsQuery, [twoWeeksAgoISO]);
      logger.info(`Found ${commitmentRows.length} commitments`);
      
      const transcriptRows = await db.all(transcriptsQuery, [twoWeeksAgoISO]);
      logger.info(`Found ${transcriptRows.length} transcripts`);

      const contextData = {
        context: contextRows,
        commitments: commitmentRows,
        recentTranscripts: transcriptRows.slice(0, 5) // Last 5 transcripts
      };

      logger.info('Calling Claude API to generate brief...');
      const brief = await generateDailyBrief(contextData);
      logger.info('Brief generated successfully');

      // Save brief to database
      const today = new Date().toISOString().split('T')[0];
      const result = await db.run(
        'INSERT INTO briefs (brief_date, content) VALUES (?, ?)',
        [today, brief]
      );
      
      logger.info(`Brief saved with ID: ${result.lastID}`);

      res.json({ 
        brief, 
        generatedAt: new Date().toISOString(),
        stats: {
          contextCount: contextRows.length,
          commitmentCount: commitmentRows.length,
          transcriptCount: transcriptRows.length
        }
      });
    } catch (dbError) {
      logger.error('Database error while fetching context:', dbError);
      throw dbError;
    }
  } catch (error) {
    logger.error('Error generating brief:', error);
    res.status(500).json({ 
      error: 'Error generating brief', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get recent briefs
 */
router.get('/recent', async (req, res) => {
  const limit = parseInt(req.query.limit) || 7;
  logger.info(`Fetching ${limit} recent briefs`);
  
  try {
    const db = getDb();
    const rows = await db.all(
      'SELECT * FROM briefs ORDER BY brief_date DESC LIMIT ?',
      [limit]
    );
    
    logger.info(`Returning ${rows.length} briefs`);
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching recent briefs:', err);
    res.status(500).json({ 
      error: 'Error fetching briefs',
      message: err.message
    });
  }
});

/**
 * Get brief by date
 */
router.get('/:date', async (req, res) => {
  const date = req.params.date;
  logger.info(`Fetching brief for date: ${date}`);
  
  try {
    const db = getDb();
    const row = await db.get(
      'SELECT * FROM briefs WHERE brief_date = ?',
      [date]
    );
    
    if (!row) {
      logger.warn(`Brief not found for date: ${date}`);
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    logger.info(`Brief found for date: ${date}`);
    res.json(row);
  } catch (err) {
    logger.error(`Error fetching brief for ${date}:`, err);
    res.status(500).json({ 
      error: 'Error fetching brief',
      message: err.message
    });
  }
});

/**
 * Delete a brief
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  logger.info(`Deleting brief ID: ${id}`);
  
  try {
    const db = getDb();
    const result = await db.run(
      'DELETE FROM briefs WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      logger.warn(`Brief not found with ID: ${id}`);
      return res.status(404).json({ error: 'Brief not found' });
    }
    
    logger.info(`Brief ${id} deleted successfully`);
    res.json({ message: 'Brief deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting brief ${id}:`, err);
    res.status(500).json({ 
      error: 'Error deleting brief',
      message: err.message
    });
  }
});

/**
 * Generate weekly report
 */
router.post('/weekly-report', async (req, res) => {
  logger.info('Generating weekly report...');
  
  try {
    const db = getDb();
    
    // Get data from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    logger.info(`Fetching data from ${weekAgoISO}`);

    // Fetch transcripts from the week
    const transcriptsQuery = `
      SELECT * FROM transcripts 
      WHERE upload_date >= ?
      ORDER BY upload_date DESC
    `;

    // Fetch commitments from the week
    const commitmentsQuery = `
      SELECT * FROM commitments 
      WHERE created_date >= ?
      ORDER BY status, deadline ASC
    `;

    // Fetch context from the week
    const contextQuery = `
      SELECT * FROM context 
      WHERE created_date >= ? AND status = 'active'
      ORDER BY created_date DESC
    `;

    // Fetch briefs from the week
    const briefsQuery = `
      SELECT * FROM briefs 
      WHERE created_date >= ?
      ORDER BY brief_date DESC
    `;

    const transcriptRows = await db.all(transcriptsQuery, [weekAgoISO]);
    const commitmentRows = await db.all(commitmentsQuery, [weekAgoISO]);
    const contextRows = await db.all(contextQuery, [weekAgoISO]);
    const briefRows = await db.all(briefsQuery, [weekAgoISO]);

    logger.info(`Found ${transcriptRows.length} transcripts, ${commitmentRows.length} commitments, ${contextRows.length} context items`);

    // Calculate completed vs pending commitments
    const completedCommitments = commitmentRows.filter(c => c.status === 'completed');
    const pendingCommitments = commitmentRows.filter(c => c.status !== 'completed');

    const weekData = {
      transcripts: transcriptRows,
      commitments: {
        all: commitmentRows,
        completed: completedCommitments,
        pending: pendingCommitments
      },
      context: contextRows,
      briefs: briefRows,
      stats: {
        totalTranscripts: transcriptRows.length,
        totalCommitments: commitmentRows.length,
        completedCommitments: completedCommitments.length,
        pendingCommitments: pendingCommitments.length,
        contextItems: contextRows.length
      }
    };

    logger.info('Calling Claude API to generate weekly report...');
    const report = await generateWeeklyReport(weekData);
    logger.info('Weekly report generated successfully');

    res.json({ 
      report, 
      generatedAt: new Date().toISOString(),
      stats: weekData.stats
    });
  } catch (error) {
    logger.error('Error generating weekly report:', error);
    res.status(500).json({ 
      error: 'Error generating weekly report', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
