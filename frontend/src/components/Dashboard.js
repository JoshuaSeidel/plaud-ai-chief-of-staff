import React, { useState, useEffect } from 'react';
import { briefAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';

function Dashboard() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

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

  const generateBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await briefAPI.generate();
      setBrief(response.data.brief);
      setLastGenerated(response.data.generatedAt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Morning Dashboard</h2>
          <button onClick={generateBrief} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Brief'}
          </button>
        </div>

        {lastGenerated && (
          <p style={{ color: '#6e6e73', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Last generated: {new Date(lastGenerated).toLocaleString()}
          </p>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <p>Generating your daily brief...</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              This may take 10-15 seconds
            </p>
          </div>
        )}

        {brief && !loading && (
          <div className="brief-content">
            <ReactMarkdown>{brief}</ReactMarkdown>
          </div>
        )}

        {!brief && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6e6e73' }}>
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
          <button className="secondary">
            View Recent Transcripts
          </button>
          <button className="secondary">
            Generate Weekly Report
          </button>
          <button className="secondary">
            View Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
