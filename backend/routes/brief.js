const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { generateDailyBrief } = require('../services/claude');

/**
 * Generate daily brief
 */
router.post('/generate', async (req, res) => {
  try {
    // Get context from last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

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

    db.all(contextQuery, [twoWeeksAgo.toISOString()], async (err, contextRows) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching context' });
      }

      db.all(commitmentsQuery, [twoWeeksAgo.toISOString()], async (err2, commitmentRows) => {
        if (err2) {
          return res.status(500).json({ error: 'Error fetching commitments' });
        }

        db.all(transcriptsQuery, [twoWeeksAgo.toISOString()], async (err3, transcriptRows) => {
          if (err3) {
            return res.status(500).json({ error: 'Error fetching transcripts' });
          }

          const contextData = {
            context: contextRows,
            commitments: commitmentRows,
            recentTranscripts: transcriptRows.slice(0, 5) // Last 5 transcripts
          };

          try {
            const brief = await generateDailyBrief(contextData);

            // Save brief to database
            const today = new Date().toISOString().split('T')[0];
            db.run(
              'INSERT INTO briefs (brief_date, content) VALUES (?, ?)',
              [today, brief],
              function(err) {
                if (err) {
                  console.error('Error saving brief:', err);
                }
              }
            );

            res.json({ brief, generatedAt: new Date().toISOString() });
          } catch (error) {
            res.status(500).json({ error: 'Error generating brief', message: error.message });
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating brief', message: error.message });
  }
});

/**
 * Get recent briefs
 */
router.get('/recent', (req, res) => {
  const limit = req.query.limit || 7;
  
  db.all(
    'SELECT * FROM briefs ORDER BY brief_date DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching briefs' });
      }
      res.json(rows);
    }
  );
});

/**
 * Get brief by date
 */
router.get('/:date', (req, res) => {
  db.get(
    'SELECT * FROM briefs WHERE brief_date = ?',
    [req.params.date],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching brief' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Brief not found' });
      }
      res.json(row);
    }
  );
});

module.exports = router;
