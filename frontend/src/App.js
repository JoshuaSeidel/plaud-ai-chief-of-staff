import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Configuration from './components/Configuration';
import Transcripts from './components/Transcripts';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app">
      <header className="header">
        <h1>AI Chief of Staff</h1>
        <nav className="nav">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'transcripts' ? 'active' : ''}
            onClick={() => setActiveTab('transcripts')}
          >
            Transcripts
          </button>
          <button 
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
        </nav>
      </header>

      <main className="container">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transcripts' && <Transcripts />}
        {activeTab === 'config' && <Configuration />}
      </main>
    </div>
  );
}

export default App;
