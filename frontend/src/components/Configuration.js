import React, { useState, useEffect } from 'react';
import { configAPI } from '../services/api';

function Configuration() {
  const [config, setConfig] = useState({
    anthropicApiKey: '',
    plaudApiKey: '',
    plaudApiUrl: '',
    icalCalendarUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await configAPI.getAll();
      setConfig({
        anthropicApiKey: response.data.anthropicApiKey || '',
        plaudApiKey: response.data.plaudApiKey || '',
        plaudApiUrl: response.data.plaudApiUrl || '',
        icalCalendarUrl: response.data.icalCalendarUrl || '',
      });
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await configAPI.bulkUpdate(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="configuration">
      <div className="card">
        <h2>Configuration</h2>
        <p style={{ color: '#6e6e73', marginBottom: '1.5rem' }}>
          Configure your AI Chief of Staff application settings.
        </p>

        {message && (
          <div style={{ 
            backgroundColor: message.type === 'success' ? '#e5ffe5' : '#ffe5e5',
            color: message.type === 'success' ? '#00a000' : '#d70015',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h3>Anthropic Claude API</h3>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6e6e73' }}>
            API Key
          </label>
          <input
            type="password"
            value={config.anthropicApiKey}
            onChange={(e) => handleChange('anthropicApiKey', e.target.value)}
            placeholder="sk-ant-..."
          />
          <p style={{ fontSize: '0.85rem', color: '#6e6e73', marginTop: '-0.5rem' }}>
            Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3>Plaud Integration</h3>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6e6e73' }}>
            Plaud API Key (Optional)
          </label>
          <input
            type="password"
            value={config.plaudApiKey}
            onChange={(e) => handleChange('plaudApiKey', e.target.value)}
            placeholder="Your Plaud API key"
          />
          
          <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '1rem', fontSize: '0.9rem', color: '#6e6e73' }}>
            Plaud API URL
          </label>
          <input
            type="url"
            value={config.plaudApiUrl}
            onChange={(e) => handleChange('plaudApiUrl', e.target.value)}
            placeholder="https://api.plaud.ai"
          />
          <p style={{ fontSize: '0.85rem', color: '#6e6e73', marginTop: '-0.5rem' }}>
            Configure to automatically pull transcripts from Plaud
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3>iCloud Calendar</h3>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6e6e73' }}>
            Calendar URL (webcal://)
          </label>
          <input
            type="url"
            value={config.icalCalendarUrl}
            onChange={(e) => handleChange('icalCalendarUrl', e.target.value)}
            placeholder="webcal://..."
          />
          <p style={{ fontSize: '0.85rem', color: '#6e6e73', marginTop: '-0.5rem' }}>
            Find this in Calendar app → Calendar Settings → Right-click your calendar → Share
          </p>
        </div>

        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="card">
        <h2>About</h2>
        <p>
          <strong>AI Chief of Staff</strong> - Your intelligent executive assistant
        </p>
        <p style={{ marginTop: '1rem', color: '#6e6e73', lineHeight: '1.6' }}>
          This application uses Claude AI to generate daily briefs, track commitments, 
          and maintain context from your meetings and emails.
        </p>
        <ul style={{ marginTop: '1rem', color: '#6e6e73', lineHeight: '1.8' }}>
          <li>Upload meeting transcripts to extract action items</li>
          <li>Generate AI-powered daily briefs in 10 seconds</li>
          <li>Track commitments across a rolling 2-week window</li>
          <li>Create calendar blocks automatically</li>
        </ul>
      </div>
    </div>
  );
}

export default Configuration;
