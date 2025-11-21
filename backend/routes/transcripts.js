const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { extractCommitments } = require('../services/claude');
const fs = require('fs');

/**
 * Upload transcript
 */
router.post('/upload', (req, res) => {
  const upload = req.app.get('upload');
  
  upload.single('transcript')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload failed', message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Read transcript content
      const content = fs.readFileSync(req.file.path, 'utf-8');

      // Save to database
      db.run(
        'INSERT INTO transcripts (filename, content, source) VALUES (?, ?, ?)',
        [req.file.originalname, content, 'upload'],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error saving transcript' });
          }

          const transcriptId = this.lastID;

          try {
            // Extract commitments using Claude
            const extracted = await extractCommitments(content);

            // Save commitments
            if (extracted.commitments && extracted.commitments.length > 0) {
              const stmt = db.prepare('INSERT INTO commitments (transcript_id, description, assignee, deadline) VALUES (?, ?, ?, ?)');
              
              for (const commitment of extracted.commitments) {
                stmt.run(transcriptId, commitment.description, commitment.assignee, commitment.deadline);
              }
              
              stmt.finalize();
            }

            // Save context items
            if (extracted.actionItems && extracted.actionItems.length > 0) {
              const stmt = db.prepare('INSERT INTO context (transcript_id, context_type, content, priority) VALUES (?, ?, ?, ?)');
              
              for (const item of extracted.actionItems) {
                stmt.run(transcriptId, 'action_item', item.description, item.priority);
              }
              
              stmt.finalize();
            }

            res.json({
              message: 'Transcript uploaded and processed successfully',
              transcriptId,
              extracted
            });
          } catch (extractError) {
            console.error('Error extracting commitments:', extractError);
            res.json({
              message: 'Transcript uploaded but extraction failed',
              transcriptId,
              warning: 'Could not extract commitments automatically'
            });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: 'Error processing transcript', message: error.message });
    }
  });
});

/**
 * Get all transcripts
 */
router.get('/', (req, res) => {
  const limit = req.query.limit || 50;
  
  db.all(
    'SELECT id, filename, upload_date, processed, source FROM transcripts ORDER BY upload_date DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching transcripts' });
      }
      res.json(rows);
    }
  );
});

/**
 * Get transcript by ID
 */
router.get('/:id', (req, res) => {
  db.get(
    'SELECT * FROM transcripts WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching transcript' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Transcript not found' });
      }
      res.json(row);
    }
  );
});

/**
 * Delete transcript
 */
router.delete('/:id', (req, res) => {
  db.run(
    'DELETE FROM transcripts WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting transcript' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transcript not found' });
      }
      res.json({ message: 'Transcript deleted successfully' });
    }
  );
});

module.exports = router;
