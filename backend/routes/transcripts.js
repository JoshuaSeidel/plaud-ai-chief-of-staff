const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { extractCommitments } = require('../services/claude');
const googleCalendar = require('../services/google-calendar');
const fs = require('fs');
const { createModuleLogger } = require('../utils/logger');

const logger = createModuleLogger('TRANSCRIPTS');

/**
 * Save all task types (commitments, actions, follow-ups, risks) and create calendar events
 */
async function saveAllTasksWithCalendar(db, transcriptId, extracted) {
  const isGoogleConnected = await googleCalendar.isConnected();
  logger.info(`Google Calendar connected: ${isGoogleConnected}`);

  let totalSaved = 0;
  let calendarEventsCreated = 0;
  
  // Prepare statement for all task types
  const stmt = db.prepare(
    'INSERT INTO commitments (transcript_id, description, assignee, deadline, urgency, suggested_approach, task_type, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Save commitments
  if (extracted.commitments && extracted.commitments.length > 0) {
    for (const item of extracted.commitments) {
      const result = await stmt.run(
        transcriptId,
        item.description,
        item.assignee || null,
        item.deadline || null,
        item.urgency || 'medium',
        item.suggested_approach || null,
        'commitment',
        item.urgency || 'medium',
        'pending'
      );
      
      const insertedId = result.lastID || (result.rows && result.rows[0] && result.rows[0].id);
      totalSaved++;
      
      if (item.deadline && isGoogleConnected) {
        try {
          await googleCalendar.createEventFromCommitment({ ...item, id: insertedId, type: 'Commitment' });
          calendarEventsCreated++;
        } catch (calError) {
          logger.warn(`Failed to create calendar event: ${calError.message}`);
        }
      }
    }
    logger.info(`Saved ${extracted.commitments.length} commitments`);
  }

  // Save action items
  if (extracted.actionItems && extracted.actionItems.length > 0) {
    for (const item of extracted.actionItems) {
      const result = await stmt.run(
        transcriptId,
        item.description,
        item.assignee || null,
        item.deadline || null,
        item.priority || 'medium',
        item.suggested_approach || null,
        'action',
        item.priority || 'medium',
        'pending'
      );
      
      const insertedId = result.lastID || (result.rows && result.rows[0] && result.rows[0].id);
      totalSaved++;
      
      if (item.deadline && isGoogleConnected) {
        try {
          await googleCalendar.createEventFromCommitment({ ...item, id: insertedId, type: 'Action Item' });
          calendarEventsCreated++;
        } catch (calError) {
          logger.warn(`Failed to create calendar event: ${calError.message}`);
        }
      }
    }
    logger.info(`Saved ${extracted.actionItems.length} action items`);
  }

  // Save follow-ups
  if (extracted.followUps && extracted.followUps.length > 0) {
    for (const item of extracted.followUps) {
      const description = item.with ? `Follow up with ${item.with}: ${item.description}` : item.description;
      const result = await stmt.run(
        transcriptId,
        description,
        item.with || null,
        item.deadline || null,
        item.priority || 'medium',
        null,
        'follow-up',
        item.priority || 'medium',
        'pending'
      );
      
      const insertedId = result.lastID || (result.rows && result.rows[0] && result.rows[0].id);
      totalSaved++;
      
      if (item.deadline && isGoogleConnected) {
        try {
          await googleCalendar.createEventFromCommitment({ ...item, description, id: insertedId, type: 'Follow-up' });
          calendarEventsCreated++;
        } catch (calError) {
          logger.warn(`Failed to create calendar event: ${calError.message}`);
        }
      }
    }
    logger.info(`Saved ${extracted.followUps.length} follow-ups`);
  }

  // Save risks
  if (extracted.risks && extracted.risks.length > 0) {
    for (const item of extracted.risks) {
      const result = await stmt.run(
        transcriptId,
        item.description,
        null,
        item.deadline || null,
        item.impact || 'high',
        item.mitigation || null,
        'risk',
        item.impact || 'high',
        'pending'
      );
      
      const insertedId = result.lastID || (result.rows && result.rows[0] && result.rows[0].id);
      totalSaved++;
      
      if (item.deadline && isGoogleConnected) {
        try {
          await googleCalendar.createEventFromCommitment({ ...item, id: insertedId, type: 'Risk' });
          calendarEventsCreated++;
        } catch (calError) {
          logger.warn(`Failed to create calendar event: ${calError.message}`);
        }
      }
    }
    logger.info(`Saved ${extracted.risks.length} risks`);
  }
  
  await stmt.finalize();
  logger.info(`Total: Saved ${totalSaved} tasks, created ${calendarEventsCreated} calendar events`);
  
  return {
    saved: totalSaved,
    calendarEvents: calendarEventsCreated,
    byType: {
      commitments: extracted.commitments?.length || 0,
      actions: extracted.actionItems?.length || 0,
      followUps: extracted.followUps?.length || 0,
      risks: extracted.risks?.length || 0
    }
  };
}

/**
 * Upload transcript file
 */
router.post('/upload', (req, res) => {
  const upload = req.app.get('upload');
  
  upload.single('transcript')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({ error: 'File upload failed', message: err.message });
    }

    if (!req.file) {
      logger.warn('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`Uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);

    try {
      const db = getDb();
      
      // Read transcript content
      const content = fs.readFileSync(req.file.path, 'utf-8');
      logger.info(`Read file content: ${content.length} characters`);

      // Save to database
      const result = await db.run(
        'INSERT INTO transcripts (filename, content, source) VALUES (?, ?, ?)',
        [req.file.originalname, content, 'upload']
      );

      const transcriptId = result.lastID;
      logger.info(`Transcript saved with ID: ${transcriptId}`);

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        logger.warn('Failed to clean up uploaded file:', cleanupErr);
      }

      try {
        // Extract commitments using Claude
        logger.info('Extracting commitments with Claude...');
        const extracted = await extractCommitments(content);
        logger.info(`Extracted ${extracted.commitments?.length || 0} commitments, ${extracted.actionItems?.length || 0} action items`);

        // Save all tasks (commitments, actions, follow-ups, risks) and create calendar events
        const taskStats = await saveAllTasksWithCalendar(db, transcriptId, extracted);

        res.json({
          message: 'Transcript uploaded and processed successfully',
          transcriptId,
          extracted: {
            commitments: extracted.commitments?.length || 0,
            actions: extracted.actionItems?.length || 0,
            followUps: extracted.followUps?.length || 0,
            risks: extracted.risks?.length || 0
          },
          taskStats
        });
      } catch (extractError) {
        logger.error('Error extracting commitments:', extractError);
        res.json({
          message: 'Transcript uploaded but extraction failed',
          transcriptId,
          warning: 'Could not extract commitments automatically',
          error: extractError.message
        });
      }
    } catch (error) {
      logger.error('Error processing transcript:', error);
      res.status(500).json({ 
        error: 'Error processing transcript', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
});

/**
 * Upload transcript text (manual paste)
 */
router.post('/upload-text', async (req, res) => {
  const { filename, content, source } = req.body;

  if (!filename || !content) {
    logger.warn('Text upload attempted without filename or content');
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  logger.info(`Manual text upload: ${filename} (${content.length} characters)`);

  try {
    const db = getDb();

    // Save to database
    const result = await db.run(
      'INSERT INTO transcripts (filename, content, source) VALUES (?, ?, ?)',
      [filename, content, source || 'manual']
    );

    const transcriptId = result.lastID;
    logger.info(`Transcript saved with ID: ${transcriptId}`);

    try {
      // Extract commitments using Claude
      logger.info('Extracting commitments with Claude...');
      const extracted = await extractCommitments(content);
      logger.info(`Extracted ${extracted.commitments?.length || 0} commitments, ${extracted.actionItems?.length || 0} action items`);

      // Save all tasks and create calendar events
      const taskStats = await saveAllTasksWithCalendar(db, transcriptId, extracted);

      res.json({
        message: 'Transcript saved and processed successfully',
        transcriptId,
        extracted: {
          commitments: extracted.commitments?.length || 0,
          actions: extracted.actionItems?.length || 0,
          followUps: extracted.followUps?.length || 0,
          risks: extracted.risks?.length || 0
        },
        taskStats
      });
    } catch (extractError) {
      logger.error('Error extracting commitments:', extractError);
      res.json({
        message: 'Transcript saved but commitment extraction failed. Please configure your Anthropic API key in Settings.',
        transcriptId,
        warning: 'AI features require an Anthropic API key',
        error: extractError.message
      });
    }
  } catch (error) {
    logger.error('Error processing transcript:', error);
    res.status(500).json({ 
      error: 'Error processing transcript', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get all transcripts
 */
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  logger.info(`Fetching up to ${limit} transcripts`);
  
  try {
    const db = getDb();
    const rows = await db.all(
      'SELECT id, filename, upload_date, processed, source FROM transcripts ORDER BY upload_date DESC LIMIT ?',
      [limit]
    );
    
    logger.info(`Returning ${rows.length} transcripts`);
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching transcripts:', err);
    res.status(500).json({ 
      error: 'Error fetching transcripts',
      message: err.message
    });
  }
});

/**
 * Get transcript by ID
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  logger.info(`Fetching transcript ID: ${id}`);
  
  try {
    const db = getDb();
    const row = await db.get(
      'SELECT * FROM transcripts WHERE id = ?',
      [id]
    );
    
    if (!row) {
      logger.warn(`Transcript not found: ${id}`);
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    logger.info(`Transcript found: ${id} (${row.filename})`);
    res.json(row);
  } catch (err) {
    logger.error(`Error fetching transcript ${id}:`, err);
    res.status(500).json({ 
      error: 'Error fetching transcript',
      message: err.message
    });
  }
});

/**
 * Delete transcript
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  logger.info(`Deleting transcript ID: ${id}`);
  
  try {
    const db = getDb();
    const result = await db.run(
      'DELETE FROM transcripts WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      logger.warn(`Transcript not found: ${id}`);
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    logger.info(`Transcript ${id} deleted successfully`);
    res.json({ message: 'Transcript deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting transcript ${id}:`, err);
    res.status(500).json({ 
      error: 'Error deleting transcript',
      message: err.message
    });
  }
});

/**
 * Get commitments for a transcript
 */
router.get('/:id/commitments', async (req, res) => {
  const id = req.params.id;
  logger.info(`Fetching commitments for transcript ID: ${id}`);
  
  try {
    const db = getDb();
    const rows = await db.all(
      'SELECT * FROM commitments WHERE transcript_id = ? ORDER BY created_date DESC',
      [id]
    );
    
    logger.info(`Found ${rows.length} commitments for transcript ${id}`);
    res.json(rows);
  } catch (err) {
    logger.error(`Error fetching commitments for transcript ${id}:`, err);
    res.status(500).json({ 
      error: 'Error fetching commitments',
      message: err.message
    });
  }
});

/**
 * Get context items for a transcript
 */
router.get('/:id/context', async (req, res) => {
  const id = req.params.id;
  logger.info(`Fetching context for transcript ID: ${id}`);
  
  try {
    const db = getDb();
    const rows = await db.all(
      'SELECT * FROM context WHERE transcript_id = ? ORDER BY created_date DESC',
      [id]
    );
    
    logger.info(`Found ${rows.length} context items for transcript ${id}`);
    res.json(rows);
  } catch (err) {
    logger.error(`Error fetching context for transcript ${id}:`, err);
    res.status(500).json({ 
      error: 'Error fetching context',
      message: err.message
    });
  }
});

/**
 * Reprocess a transcript to extract commitments again
 */
router.post('/:id/reprocess', async (req, res) => {
  const id = req.params.id;
  logger.info(`Reprocessing transcript ID: ${id}`);
  
  try {
    const db = getDb();
    
    // Get the transcript
    const transcript = await db.get('SELECT * FROM transcripts WHERE id = ?', [id]);
    
    if (!transcript) {
      logger.warn(`Transcript ${id} not found for reprocessing`);
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    logger.info(`Reprocessing transcript: ${transcript.filename}`);
    
    // Delete existing commitments and context for this transcript
    await db.run('DELETE FROM commitments WHERE transcript_id = ?', [id]);
    await db.run('DELETE FROM context WHERE transcript_id = ?', [id]);
    logger.info(`Cleared existing commitments and context for transcript ${id}`);
    
    // Extract commitments using Claude
    try {
      const extracted = await extractCommitments(transcript.content);
      logger.info('Commitments extracted successfully', {
        commitments: extracted.commitments?.length || 0,
        actionItems: extracted.actionItems?.length || 0
      });
      
      // Save commitments and create calendar events
      const taskStats = await saveAllTasksWithCalendar(db, id, extracted);
      
      // Mark transcript as processed
      await db.run('UPDATE transcripts SET processed = ? WHERE id = ?', [true, id]);
      
      res.json({ 
        success: true,
        message: 'Transcript reprocessed successfully',
        extracted: {
          commitments: extracted.commitments?.length || 0,
          actions: extracted.actionItems?.length || 0,
          followUps: extracted.followUps?.length || 0,
          risks: extracted.risks?.length || 0
        },
        taskStats
      });
      
    } catch (extractError) {
      logger.error('Error extracting commitments:', extractError);
      
      // Still mark as processed even if extraction fails
      await db.run('UPDATE transcripts SET processed = ? WHERE id = ?', [true, id]);
      
      res.json({
        success: false,
        message: 'Transcript saved but commitment extraction failed. Please check your Anthropic API key configuration.',
        error: extractError.message
      });
    }
    
  } catch (err) {
    logger.error(`Error reprocessing transcript ${id}:`, err);
    res.status(500).json({ 
      error: 'Error reprocessing transcript',
      message: err.message
    });
  }
});

module.exports = router;
