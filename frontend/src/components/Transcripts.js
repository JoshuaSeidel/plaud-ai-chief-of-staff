import React, { useState, useEffect } from 'react';
import { transcriptsAPI } from '../services/api';

function Transcripts() {
  const [transcripts, setTranscripts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const response = await transcriptsAPI.getAll();
      setTranscripts(response.data);
    } catch (err) {
      setError('Failed to load transcripts');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('transcript', file);

    try {
      const response = await transcriptsAPI.upload(formData);
      setSuccessMessage(`Successfully uploaded and processed: ${file.name}`);
      loadTranscripts(); // Reload the list
      event.target.value = ''; // Clear the input
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload transcript');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transcript?')) {
      return;
    }

    try {
      await transcriptsAPI.delete(id);
      setSuccessMessage('Transcript deleted successfully');
      loadTranscripts();
    } catch (err) {
      setError('Failed to delete transcript');
    }
  };

  return (
    <div className="transcripts">
      <div className="card">
        <h2>Upload Transcript</h2>
        
        {error && <div className="error">{error}</div>}
        {successMessage && (
          <div style={{ 
            backgroundColor: '#e5ffe5', 
            color: '#00a000', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem' 
          }}>
            {successMessage}
          </div>
        )}

        <div 
          className="file-upload" 
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".txt,.doc,.docx,.pdf"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {uploading ? 'Uploading...' : 'Click to upload transcript'}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#6e6e73' }}>
              Supports .txt, .doc, .docx, .pdf files
            </p>
          </div>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6e6e73' }}>
          Upload meeting transcripts from Plaud or paste in text files. 
          The system will automatically extract commitments and action items.
        </p>
      </div>

      <div className="card">
        <h2>Recent Transcripts</h2>
        
        {transcripts.length === 0 ? (
          <p style={{ color: '#6e6e73', textAlign: 'center', padding: '2rem' }}>
            No transcripts uploaded yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #d2d2d7' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Filename</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Upload Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Source</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transcripts.map((transcript) => (
                  <tr key={transcript.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '0.75rem' }}>{transcript.filename}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(transcript.upload_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{transcript.source}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        className="secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => handleDelete(transcript.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transcripts;
