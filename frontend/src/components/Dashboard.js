import React, { useState, useEffect } from 'react';
import { briefAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { PullToRefresh } from './PullToRefresh';

function Dashboard({ setActiveTab }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadTodaysBrief();
  }, []);

  const loadTodaysBrief = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await briefAPI.getByDate(today);
      setBrief(response.data.content);
      setLastGenerated(response.data.created_date);
    } catch (err) {
      // No brief for today yet, that's okay
      console.log('No brief for today yet');
    }
  };

  const handleRefresh = async () => {
    await loadTodaysBrief();
  };

  const generateBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await briefAPI.generate();
      setBrief(response.data.brief);
      setLastGenerated(response.data.generatedAt);
      setStats(response.data.stats);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate brief';
      setError(errorMessage);
      console.error('Brief generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTranscripts = () => {
    // Navigate to transcripts tab
    if (setActiveTab) {
      setActiveTab('transcripts');
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await briefAPI.generateWeeklyReport();
      // Show the report in a modal or new section
      const reportWindow = window.open('', '_blank', 'width=800,height=600');
      reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Weekly Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              max-width: 800px;
              margin: 2rem auto;
              padding: 2rem;
              background: #1a1a1a;
              color: #e4e4e7;
              line-height: 1.6;
            }
            h1, h2, h3 { color: #60a5fa; }
            ul { margin-left: 1.5rem; }
            strong { color: #fbbf24; }
            .stats {
              display: flex;
              gap: 1rem;
              margin: 1rem 0;
              padding: 1rem;
              background: #27272a;
              border-radius: 8px;
            }
            .stat {
              flex: 1;
              text-align: center;
            }
            .stat-value {
              font-size: 2rem;
              font-weight: bold;
              color: #60a5fa;
            }
            .stat-label {
              font-size: 0.9rem;
              color: #a1a1aa;
            }
            pre {
              background: #27272a;
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <h1>📊 Weekly Report</h1>
          <p><em>Generated: ${new Date(response.data.generatedAt).toLocaleString()}</em></p>
          
          ${response.data.stats ? `
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${response.data.stats.totalTranscripts || 0}</div>
              <div class="stat-label">Transcripts</div>
            </div>
            <div class="stat">
              <div class="stat-value">${response.data.stats.completedCommitments || 0}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
              <div class="stat-value">${response.data.stats.pendingCommitments || 0}</div>
              <div class="stat-label">Pending</div>
            </div>
          </div>
          ` : ''}
          
          <pre>${response.data.report}</pre>
          
          <button onclick="window.print()" style="
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
          ">🖨️ Print Report</button>
        </body>
        </html>
      `);
      reportWindow.document.close();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate weekly report';
      setError(errorMessage);
      console.error('Weekly report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCalendar = () => {
    // Navigate to calendar tab
    if (setActiveTab) {
      setActiveTab('calendar');
    }
  };

  // Parse deliverables table from brief - robust parser for markdown tables
  const parseDeliverablesTable = (briefText) => {
    if (!briefText) return null;
    
    // Find the deliverables section - be flexible with section numbering
    const deliverablesMatch = briefText.match(/##\s*2\.?\s*DELIVERABLES THIS WEEK[\s\S]*?(?=##\s*\d|$)/i);
    if (!deliverablesMatch) return null;
    
    const deliverablesSection = deliverablesMatch[0];
    
    // Try multiple patterns to find the table
    // Pattern 1: Standard markdown table with pipes
    let tableMatch = deliverablesSection.match(/\|(.+?)\|/g);
    
    if (!tableMatch || tableMatch.length < 2) {
      // Pattern 2: Try without pipes (plain text table)
      // Look for lines that look like table rows
      const lines = deliverablesSection.split('\n').filter(line => line.trim());
      tableMatch = lines.filter(line => {
        const trimmed = line.trim();
        // Check if it looks like a table row (has multiple words separated by spaces/tabs)
        return trimmed.includes('|') || (trimmed.split(/\s{2,}|\t/).length >= 3);
      });
    }
    
    if (!tableMatch || tableMatch.length < 2) return null;
    
    // Parse header - find the first row that looks like headers
    let headerRow = null;
    let headerIndex = 0;
    
    for (let i = 0; i < tableMatch.length; i++) {
      const row = tableMatch[i];
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell && !cell.match(/^[-:]+$/));
      
      // Check if this looks like a header (contains words like "Deliverable", "Owner", "Status", etc.)
      const headerKeywords = ['deliverable', 'owner', 'status', 'deadline', 'blocker', 'note'];
      const hasHeaderKeywords = cells.some(cell => 
        headerKeywords.some(keyword => cell.toLowerCase().includes(keyword))
      );
      
      if (hasHeaderKeywords && cells.length >= 4) {
        headerRow = cells;
        headerIndex = i;
        break;
      }
    }
    
    // If no header found, use first row
    if (!headerRow && tableMatch.length > 0) {
      headerRow = tableMatch[0].split('|').map(cell => cell.trim()).filter(cell => cell && !cell.match(/^[-:]+$/));
    }
    
    if (!headerRow || headerRow.length < 4) return null;
    
    // Skip separator row (usually dashes) and parse data rows
    const dataRows = [];
    for (let i = headerIndex + 1; i < tableMatch.length; i++) {
      const row = tableMatch[i];
      // Skip separator rows
      if (row.match(/^[\s|]*[-:|\s]+[\s|]*$/)) continue;
      
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      // Only include rows that have at least 3 cells (deliverable, owner, status minimum)
      if (cells.length >= 3) {
        // Pad cells to match header length
        while (cells.length < headerRow.length) {
          cells.push('');
        }
        dataRows.push(cells.slice(0, headerRow.length));
      }
    }
    
    if (dataRows.length === 0) return null;
    
    return { headerRow, dataRows };
  };

  const deliverablesData = brief ? parseDeliverablesTable(brief) : null;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="dashboard">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Morning Dashboard</h2>
          <button onClick={generateBrief} disabled={loading}>
            {loading ? 'Generating...' : '🔄 Generate Brief'}
          </button>
        </div>

        {lastGenerated && (
          <p style={{ color: '#6e6e73', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Last generated: {new Date(lastGenerated).toLocaleString()}
          </p>
        )}

        {stats && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f5f5f7', 
            borderRadius: '8px' 
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007aff' }}>
                {stats.contextCount || 0}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6e6e73' }}>Context Items</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9500' }}>
                {stats.commitmentCount || 0}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6e6e73' }}>Commitments</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34c759' }}>
                {stats.transcriptCount || 0}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6e6e73' }}>Transcripts</div>
            </div>
          </div>
        )}

        {error && (
          <div className="error" style={{ 
            backgroundColor: '#ffe5e5', 
            color: '#d70015', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem' 
          }}>
            <strong>Error:</strong> {error}
            {error.includes('API key') && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Please configure your Anthropic API key in the Configuration tab.
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="loading" style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: '#6e6e73' 
          }}>
            <div style={{ 
              fontSize: '2rem', 
              marginBottom: '1rem',
              animation: 'spin 2s linear infinite',
              display: 'inline-block'
            }}>
              ⏳
            </div>
            <p>Generating your daily brief...</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              This may take 10-15 seconds
            </p>
          </div>
        )}

        {brief && !loading && (
          <div className="brief-content" style={{ 
            lineHeight: '1.6',
            color: '#e5e5e7',
            overflowX: 'auto'
          }}>
            {deliverablesData && deliverablesData.dataRows.length > 0 ? (
              <>
                {/* Render brief with deliverables section replaced */}
                {brief.split(/##\s*2\.?\s*DELIVERABLES THIS WEEK[\s\S]*?(?=##\s*\d|$)/i).map((section, index) => {
                  if (index === 0) {
                    return (
                      <ReactMarkdown key={index}
                        components={{
                          h1: ({node, ...props}) => <h1 style={{color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{color: '#60a5fa', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                          h3: ({node, ...props}) => <h3 style={{color: '#fbbf24', marginTop: '1rem', marginBottom: '0.5rem'}} {...props} />,
                          strong: ({node, ...props}) => <strong style={{color: '#fbbf24'}} {...props} />,
                          em: ({node, ...props}) => <em style={{color: '#a1a1aa'}} {...props} />,
                          ul: ({node, ...props}) => <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                          ol: ({node, ...props}) => <ol style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                          li: ({node, ...props}) => <li style={{marginBottom: '0.25rem', color: '#e5e5e7'}} {...props} />,
                          p: ({node, ...props}) => <p style={{marginBottom: '0.75rem', color: '#e5e5e7'}} {...props} />
                        }}
                      >
                        {section}
                      </ReactMarkdown>
                    );
                  } else if (index === 1) {
                    return (
                      <div key={index}>
                        <h2 style={{color: '#60a5fa', marginTop: '1.5rem', marginBottom: '0.5rem'}}>2. DELIVERABLES THIS WEEK</h2>
                        <div style={{ 
                          overflowX: 'auto', 
                          marginTop: '1rem', 
                          marginBottom: '1rem',
                          WebkitOverflowScrolling: 'touch'
                        }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            minWidth: '700px',
                            tableLayout: 'auto'
                          }}>
                            <thead style={{
                              backgroundColor: '#27272a',
                              borderBottom: '2px solid #60a5fa',
                              position: 'sticky',
                              top: 0,
                              zIndex: 10
                            }}>
                              <tr>
                                {deliverablesData.headerRow.map((header, i) => (
                                  <th key={i} style={{
                                    padding: '0.875rem 1rem',
                                    textAlign: 'left',
                                    color: '#fff',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    whiteSpace: 'nowrap',
                                    borderRight: i < deliverablesData.headerRow.length - 1 ? '1px solid #3f3f46' : 'none'
                                  }}>
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {deliverablesData.dataRows.map((row, rowIndex) => {
                                // Find status column index
                                const statusIndex = deliverablesData.headerRow.findIndex(h => 
                                  h.toLowerCase().includes('status')
                                );
                                const status = statusIndex >= 0 ? row[statusIndex] : '';
                                
                                // Determine row background based on status
                                const isAtRisk = status && (status.includes('AT RISK') || status.includes('⚠️'));
                                const isOnTrack = status && (status.includes('ON TRACK') || status.includes('🟢'));
                                const isBehind = status && (status.includes('BEHIND') || status.includes('🔴'));
                                
                                return (
                                  <tr key={rowIndex} style={{
                                    borderBottom: '1px solid #3f3f46',
                                    backgroundColor: isAtRisk ? 'rgba(251, 191, 36, 0.05)' : 
                                                     isBehind ? 'rgba(239, 68, 68, 0.05)' :
                                                     isOnTrack ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                                  }}>
                                    {row.map((cell, cellIndex) => {
                                      const isStatusCell = cellIndex === statusIndex;
                                      const isDeliverableCell = deliverablesData.headerRow[cellIndex]?.toLowerCase().includes('deliverable');
                                      
                                      return (
                                        <td key={cellIndex} style={{
                                          padding: '0.875rem 1rem',
                                          color: isStatusCell ? 
                                            (isAtRisk ? '#fbbf24' : isBehind ? '#ef4444' : isOnTrack ? '#22c55e' : '#e5e5e7') :
                                            '#e5e5e7',
                                          fontSize: '0.875rem',
                                          verticalAlign: 'top',
                                          wordBreak: 'break-word',
                                          lineHeight: '1.5',
                                          borderRight: cellIndex < row.length - 1 ? '1px solid #3f3f46' : 'none',
                                          fontWeight: isStatusCell ? '500' : 'normal',
                                          maxWidth: isDeliverableCell ? '300px' : 'auto'
                                        }}>
                                          {cell}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 style={{color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                            h2: ({node, ...props}) => <h2 style={{color: '#60a5fa', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                            h3: ({node, ...props}) => <h3 style={{color: '#fbbf24', marginTop: '1rem', marginBottom: '0.5rem'}} {...props} />,
                            strong: ({node, ...props}) => <strong style={{color: '#fbbf24'}} {...props} />,
                            em: ({node, ...props}) => <em style={{color: '#a1a1aa'}} {...props} />,
                            ul: ({node, ...props}) => <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                            ol: ({node, ...props}) => <ol style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                            li: ({node, ...props}) => <li style={{marginBottom: '0.25rem', color: '#e5e5e7'}} {...props} />,
                            p: ({node, ...props}) => <p style={{marginBottom: '0.75rem', color: '#e5e5e7'}} {...props} />
                          }}
                        >
                          {section}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            ) : (
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 style={{color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{color: '#60a5fa', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{color: '#fbbf24', marginTop: '1rem', marginBottom: '0.5rem'}} {...props} />,
                  strong: ({node, ...props}) => <strong style={{color: '#fbbf24'}} {...props} />,
                  em: ({node, ...props}) => <em style={{color: '#a1a1aa'}} {...props} />,
                  ul: ({node, ...props}) => <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                  ol: ({node, ...props}) => <ol style={{marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}} {...props} />,
                  li: ({node, ...props}) => <li style={{marginBottom: '0.25rem', color: '#e5e5e7'}} {...props} />,
                  p: ({node, ...props}) => <p style={{marginBottom: '0.75rem', color: '#e5e5e7'}} {...props} />,
                  table: ({node, ...props}) => (
                    <div style={{ overflowX: 'auto', marginTop: '1rem', marginBottom: '1rem', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        minWidth: '700px',
                        tableLayout: 'auto'
                      }} {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead style={{
                    backgroundColor: '#27272a',
                    borderBottom: '2px solid #60a5fa',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }} {...props} />,
                  tbody: ({node, ...props}) => <tbody {...props} />,
                  tr: ({node, ...props}) => <tr style={{
                    borderBottom: '1px solid #3f3f46'
                  }} {...props} />,
                  th: ({node, ...props}) => <th style={{
                    padding: '0.875rem 1rem',
                    textAlign: 'left',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap'
                  }} {...props} />,
                  td: ({node, ...props}) => <td style={{
                    padding: '0.875rem 1rem',
                    color: '#e5e5e7',
                    fontSize: '0.875rem',
                    verticalAlign: 'top',
                    wordBreak: 'break-word',
                    lineHeight: '1.5'
                  }} {...props} />
                }}
              >
                {brief}
              </ReactMarkdown>
            )}
          </div>
        )}

        {!brief && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6e6e73' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p>No brief generated yet for today.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Click "Generate Brief" to create your daily priorities and action items.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="secondary"
            onClick={handleViewTranscripts}
          >
            📝 View Recent Transcripts
          </button>
          <button 
            className="secondary"
            onClick={handleGenerateWeeklyReport}
          >
            📊 Generate Weekly Report
          </button>
          <button 
            className="secondary"
            onClick={handleViewCalendar}
          >
            📅 View Calendar
          </button>
          <button 
            className="secondary"
            onClick={() => setActiveTab && setActiveTab('tasks')}
          >
            📋 View All Tasks
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f7', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>💡 Tips</h3>
          <ul style={{ fontSize: '0.9rem', color: '#6e6e73', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
            <li>Upload transcripts regularly to keep your context fresh</li>
            <li>Generate your brief each morning for daily priorities</li>
            <li>Review tasks to stay on top of deadlines</li>
          </ul>
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
}

export default Dashboard;
