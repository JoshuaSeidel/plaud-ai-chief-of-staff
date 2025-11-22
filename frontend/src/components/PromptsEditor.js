import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     (window.location.hostname === 'localhost' && window.location.port === '3000' 
                       ? 'http://localhost:3001/api' 
                       : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

function PromptsEditor() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/prompts');
      setPrompts(response.data);
      if (response.data.length > 0 && !selectedPrompt) {
        setSelectedPrompt(response.data[0]);
        setEditedPrompt(response.data[0].prompt);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      setMessage({ type: 'error', text: 'Failed to load prompts' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setEditedPrompt(prompt.prompt);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    try {
      setSaving(true);
      await api.put(`/prompts/${selectedPrompt.key}`, { prompt: editedPrompt });
      setMessage({ type: 'success', text: 'Prompt saved successfully!' });
      await loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save prompt' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedPrompt) return;
    if (!window.confirm('Reset this prompt to default? This cannot be undone.')) return;

    try {
      setSaving(true);
      await api.post(`/prompts/${selectedPrompt.key}/reset`);
      setMessage({ type: 'success', text: 'Prompt reset to default!' });
      await loadPrompts();
      // Update the edited text with the reset value
      const updated = prompts.find(p => p.key === selectedPrompt.key);
      if (updated) {
        setEditedPrompt(updated.prompt);
      }
    } catch (error) {
      console.error('Error resetting prompt:', error);
      setMessage({ type: 'error', text: 'Failed to reset prompt' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card"><p>Loading prompts...</p></div>;
  }

  return (
    <div className="prompts-editor">
      <div className="card">
        <h2>🤖 AI Prompts Configuration</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>
          Customize how AI extracts tasks, generates descriptions, and creates reports.
          Changes take effect immediately (no restart needed).
        </p>

        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Prompt Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Select Prompt to Edit:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {prompts.map((prompt) => (
              <button
                key={prompt.key}
                onClick={() => handleSelectPrompt(prompt)}
                className={selectedPrompt?.key === prompt.key ? '' : 'secondary'}
                style={{ padding: '0.5rem 1rem' }}
              >
                {prompt.name}
              </button>
            ))}
          </div>
        </div>

        {selectedPrompt && (
          <>
            {/* Prompt Info */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#18181b',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #3f3f46'
            }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{selectedPrompt.name}</h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>{selectedPrompt.description}</p>
              {selectedPrompt.updated_date && (
                <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Last updated: {new Date(selectedPrompt.updated_date).toLocaleString()}
                </p>
              )}
            </div>

            {/* Template Variables Help */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#1e3a5f',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #2563eb'
            }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: '#60a5fa' }}>
                💡 Template Variables
              </h4>
              <p style={{ color: '#bfdbfe', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Use these placeholders in your prompts:
              </p>
              <ul style={{ color: '#bfdbfe', fontSize: '0.85rem', margin: '0', paddingLeft: '1.5rem' }}>
                <li><code style={{ backgroundColor: '#1e40af', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{transcriptText}}'}</code> - Full meeting transcript</li>
                <li><code style={{ backgroundColor: '#1e40af', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{dateContext}}'}</code> - Meeting date information</li>
                <li><code style={{ backgroundColor: '#1e40af', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{taskType}}'}</code> - Type of task</li>
                <li><code style={{ backgroundColor: '#1e40af', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{description}}'}</code> - Task description</li>
              </ul>
            </div>

            {/* Prompt Editor */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Prompt Text:
              </label>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={20}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  color: '#fff',
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
                placeholder="Enter your custom prompt here..."
              />
              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
                {editedPrompt.length} characters
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSave}
                disabled={saving || editedPrompt === selectedPrompt.prompt}
                style={{ flex: '1', minWidth: '150px' }}
              >
                {saving ? '💾 Saving...' : '💾 Save Changes'}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className="secondary"
                style={{ flex: '1', minWidth: '150px' }}
              >
                🔄 Reset to Default
              </button>
              <button
                onClick={() => setEditedPrompt(selectedPrompt.prompt)}
                disabled={saving || editedPrompt === selectedPrompt.prompt}
                className="secondary"
                style={{ minWidth: '150px' }}
              >
                ↩️ Discard Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PromptsEditor;

