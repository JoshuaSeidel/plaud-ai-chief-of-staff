import React, { useState, useEffect } from 'react';
import { configAPI, calendarAPI, plannerAPI, integrationsAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useProfile } from '../../contexts/ProfileContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { CardSkeleton } from '../common/LoadingSkeleton';

function IntegrationCard({
  title,
  icon,
  description,
  connected,
  checking,
  onConnect,
  onDisconnect,
  children,
  expanded,
  onToggleExpand
}) {
  return (
    <div className={`integration-card ${connected ? 'integration-connected' : ''}`}>
      <div className="integration-header" onClick={onToggleExpand}>
        <div className="integration-info">
          <span className="integration-icon">{icon}</span>
          <div>
            <h4 className="integration-title">{title}</h4>
            <p className="integration-description">{description}</p>
          </div>
        </div>
        <div className="integration-status">
          {checking ? (
            <Badge variant="info" icon="⏳">Checking...</Badge>
          ) : connected ? (
            <Badge variant="success" icon="✓">Connected</Badge>
          ) : (
            <Badge variant="default" icon="">Not Connected</Badge>
          )}
          <span className={`integration-chevron ${expanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="integration-body">
          {children}
          <div className="integration-actions">
            {connected ? (
              <Button variant="error" size="sm" onClick={onDisconnect}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={onConnect}>
                Connect
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function IntegrationsSettings() {
  const { currentProfile } = useProfile();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

  // Connection states
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [checkingMicrosoft, setCheckingMicrosoft] = useState(true);
  const [jiraConnected, setJiraConnected] = useState(false);
  const [checkingJira, setCheckingJira] = useState(true);

  // Additional integration states
  const [trelloConnected, setTrelloConnected] = useState(false);
  const [checkingTrello, setCheckingTrello] = useState(true);
  const [mondayConnected, setMondayConnected] = useState(false);
  const [checkingMonday, setCheckingMonday] = useState(true);
  const [radicaleConnected, setRadicaleConnected] = useState(false);
  const [checkingRadicale, setCheckingRadicale] = useState(true);

  // Config states for non-OAuth integrations
  const [jiraConfig, setJiraConfig] = useState({
    baseUrl: '',
    email: '',
    apiToken: '',
    projectKey: ''
  });
  const [trelloConfig, setTrelloConfig] = useState({
    apiKey: '',
    apiToken: '',
    boardId: ''
  });
  const [mondayConfig, setMondayConfig] = useState({
    apiToken: '',
    boardId: ''
  });
  const [radicaleConfig, setRadicaleConfig] = useState({
    serverUrl: '',
    username: '',
    password: '',
    calendarPath: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAllStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id]);

  const checkAllStatuses = async () => {
    setLoading(true);
    await Promise.all([
      checkGoogleStatus(),
      checkMicrosoftStatus(),
      checkJiraStatus(),
      checkTrelloStatus(),
      checkMondayStatus(),
      checkRadicaleStatus()
    ]);
    setLoading(false);
  };

  const checkGoogleStatus = async () => {
    setCheckingGoogle(true);
    try {
      const response = await calendarAPI.getGoogleStatus();
      setGoogleConnected(response.data.connected);
    } catch (err) {
      console.error('Failed to check Google status:', err);
      setGoogleConnected(false);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const checkMicrosoftStatus = async () => {
    setCheckingMicrosoft(true);
    try {
      const response = await calendarAPI.getMicrosoftStatus();
      setMicrosoftConnected(response.data.connected);
    } catch (err) {
      console.error('Failed to check Microsoft status:', err);
      setMicrosoftConnected(false);
    } finally {
      setCheckingMicrosoft(false);
    }
  };

  const checkJiraStatus = async () => {
    setCheckingJira(true);
    try {
      const response = await plannerAPI.getJiraStatus();
      setJiraConnected(response.data.connected);

      // Load Jira config
      const configResponse = await configAPI.getAll();
      const data = configResponse.data;
      setJiraConfig({
        baseUrl: data.jira_base_url || '',
        email: data.jira_email || '',
        apiToken: data.jira_api_token || '',
        projectKey: data.jira_project_key || ''
      });
    } catch (err) {
      console.error('Failed to check Jira status:', err);
      setJiraConnected(false);
    } finally {
      setCheckingJira(false);
    }
  };

  const checkTrelloStatus = async () => {
    setCheckingTrello(true);
    try {
      const response = await integrationsAPI.getTrelloStatus();
      setTrelloConnected(response.data.connected);

      // Load Trello config
      const configResponse = await integrationsAPI.getTrelloConfig();
      if (configResponse.data) {
        setTrelloConfig({
          apiKey: configResponse.data.api_key || '',
          apiToken: configResponse.data.api_token || '',
          boardId: configResponse.data.board_id || ''
        });
      }
    } catch (err) {
      console.error('Failed to check Trello status:', err);
      setTrelloConnected(false);
    } finally {
      setCheckingTrello(false);
    }
  };

  const checkMondayStatus = async () => {
    setCheckingMonday(true);
    try {
      const response = await integrationsAPI.getMondayStatus();
      setMondayConnected(response.data.connected);

      // Load Monday config
      const configResponse = await integrationsAPI.getMondayConfig();
      if (configResponse.data) {
        setMondayConfig({
          apiToken: configResponse.data.api_token || '',
          boardId: configResponse.data.board_id || ''
        });
      }
    } catch (err) {
      console.error('Failed to check Monday status:', err);
      setMondayConnected(false);
    } finally {
      setCheckingMonday(false);
    }
  };

  const checkRadicaleStatus = async () => {
    setCheckingRadicale(true);
    try {
      const response = await integrationsAPI.getRadicaleStatus();
      setRadicaleConnected(response.data.connected);

      // Load Radicale config
      const configResponse = await integrationsAPI.getRadicaleConfig();
      if (configResponse.data) {
        setRadicaleConfig({
          serverUrl: configResponse.data.server_url || '',
          username: configResponse.data.username || '',
          password: configResponse.data.password || '',
          calendarPath: configResponse.data.calendar_path || ''
        });
      }
    } catch (err) {
      console.error('Failed to check Radicale status:', err);
      setRadicaleConnected(false);
    } finally {
      setCheckingRadicale(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const response = await calendarAPI.getGoogleAuthUrl();
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        toast.error('Failed to get Google authorization URL');
      }
    } catch (err) {
      toast.error('Failed to connect to Google: ' + err.message);
    }
  };

  const handleMicrosoftConnect = async () => {
    try {
      const response = await calendarAPI.getMicrosoftAuthUrl();
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        toast.error('Failed to get Microsoft authorization URL');
      }
    } catch (err) {
      toast.error('Failed to connect to Microsoft: ' + err.message);
    }
  };

  const handleJiraSave = async () => {
    if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken || !jiraConfig.projectKey) {
      toast.warning('Please fill in all Jira fields');
      return;
    }

    setSaving(true);
    try {
      await configAPI.bulkUpdate({
        jira_base_url: jiraConfig.baseUrl,
        jira_email: jiraConfig.email,
        jira_api_token: jiraConfig.apiToken,
        jira_project_key: jiraConfig.projectKey
      });
      await checkJiraStatus();
      toast.success('Jira configuration saved');
    } catch (err) {
      toast.error('Failed to save Jira configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTrelloSave = async () => {
    if (!trelloConfig.apiKey || !trelloConfig.apiToken) {
      toast.warning('Please fill in Trello API Key and Token');
      return;
    }

    setSaving(true);
    try {
      await integrationsAPI.saveTrelloConfig({
        api_key: trelloConfig.apiKey,
        api_token: trelloConfig.apiToken,
        board_id: trelloConfig.boardId
      });
      await checkTrelloStatus();
      toast.success('Trello configuration saved');
    } catch (err) {
      toast.error('Failed to save Trello configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleMondaySave = async () => {
    if (!mondayConfig.apiToken) {
      toast.warning('Please fill in Monday.com API Token');
      return;
    }

    setSaving(true);
    try {
      await integrationsAPI.saveMondayConfig({
        api_token: mondayConfig.apiToken,
        board_id: mondayConfig.boardId
      });
      await checkMondayStatus();
      toast.success('Monday.com configuration saved');
    } catch (err) {
      toast.error('Failed to save Monday.com configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleRadicaleSave = async () => {
    if (!radicaleConfig.serverUrl || !radicaleConfig.username || !radicaleConfig.password) {
      toast.warning('Please fill in CalDAV server URL, username, and password');
      return;
    }

    setSaving(true);
    try {
      await integrationsAPI.saveRadicaleConfig({
        server_url: radicaleConfig.serverUrl,
        username: radicaleConfig.username,
        password: radicaleConfig.password,
        calendar_path: radicaleConfig.calendarPath
      });
      await checkRadicaleStatus();
      toast.success('CalDAV configuration saved');
    } catch (err) {
      toast.error('Failed to save CalDAV configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (service) => {
    const confirmed = await toast.confirm(`Are you sure you want to disconnect ${service}?`);
    if (!confirmed) return;

    try {
      if (service === 'Google') {
        await calendarAPI.disconnectGoogle();
        setGoogleConnected(false);
      } else if (service === 'Microsoft') {
        await calendarAPI.disconnectMicrosoft();
        setMicrosoftConnected(false);
      } else if (service === 'Jira') {
        await plannerAPI.disconnectJira();
        setJiraConnected(false);
        setJiraConfig({ baseUrl: '', email: '', apiToken: '', projectKey: '' });
      } else if (service === 'Trello') {
        await integrationsAPI.saveTrelloConfig({ api_key: '', api_token: '', board_id: '' });
        setTrelloConnected(false);
        setTrelloConfig({ apiKey: '', apiToken: '', boardId: '' });
      } else if (service === 'Monday.com') {
        await integrationsAPI.saveMondayConfig({ api_token: '', board_id: '' });
        setMondayConnected(false);
        setMondayConfig({ apiToken: '', boardId: '' });
      } else if (service === 'CalDAV') {
        await integrationsAPI.saveRadicaleConfig({ server_url: '', username: '', password: '', calendar_path: '' });
        setRadicaleConnected(false);
        setRadicaleConfig({ serverUrl: '', username: '', password: '', calendarPath: '' });
      }
      toast.success(`${service} disconnected`);
    } catch (err) {
      toast.error(`Failed to disconnect ${service}`);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h3>Integrations</h3>
        <p className="settings-section-description">
          Connect your calendar and task management services
        </p>
      </div>

      {/* Google Calendar */}
      <IntegrationCard
        title="Google Calendar"
        icon="📅"
        description="Sync events and create calendar blocks"
        connected={googleConnected}
        checking={checkingGoogle}
        onConnect={handleGoogleConnect}
        onDisconnect={() => handleDisconnect('Google')}
        expanded={expandedCard === 'google'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'google' ? null : 'google')}
      >
        <p className="text-muted text-sm">
          Connect your Google Calendar to sync events and automatically create calendar blocks for tasks.
        </p>
      </IntegrationCard>

      {/* Microsoft */}
      <IntegrationCard
        title="Microsoft 365"
        icon="📋"
        description="Calendar, Planner, and To Do integration"
        connected={microsoftConnected}
        checking={checkingMicrosoft}
        onConnect={handleMicrosoftConnect}
        onDisconnect={() => handleDisconnect('Microsoft')}
        expanded={expandedCard === 'microsoft'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'microsoft' ? null : 'microsoft')}
      >
        <p className="text-muted text-sm">
          Connect to Microsoft 365 for calendar sync and task management with Planner/To Do.
        </p>
      </IntegrationCard>

      {/* Jira */}
      <IntegrationCard
        title="Jira"
        icon="🎯"
        description="Sync tasks with Jira issues"
        connected={jiraConnected}
        checking={checkingJira}
        onConnect={() => setExpandedCard('jira')}
        onDisconnect={() => handleDisconnect('Jira')}
        expanded={expandedCard === 'jira'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'jira' ? null : 'jira')}
      >
        <div className="form-group">
          <label className="form-label">Jira Base URL</label>
          <input
            type="text"
            value={jiraConfig.baseUrl}
            onChange={(e) => setJiraConfig({ ...jiraConfig, baseUrl: e.target.value })}
            placeholder="https://your-domain.atlassian.net"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            value={jiraConfig.email}
            onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
            placeholder="your-email@example.com"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">API Token</label>
          <input
            type="password"
            value={jiraConfig.apiToken}
            onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
            placeholder="Your Jira API token"
            className="form-input"
          />
          <span className="form-hint">
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">
              Generate an API token
            </a>
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Project Key</label>
          <input
            type="text"
            value={jiraConfig.projectKey}
            onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
            placeholder="PROJECT"
            className="form-input"
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleJiraSave} loading={saving}>
          Save Jira Settings
        </Button>
      </IntegrationCard>

      {/* Trello */}
      <IntegrationCard
        title="Trello"
        icon="📝"
        description="Sync tasks with Trello cards"
        connected={trelloConnected}
        checking={checkingTrello}
        onConnect={() => setExpandedCard('trello')}
        onDisconnect={() => handleDisconnect('Trello')}
        expanded={expandedCard === 'trello'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'trello' ? null : 'trello')}
      >
        <div className="form-group">
          <label className="form-label">API Key</label>
          <input
            type="text"
            value={trelloConfig.apiKey}
            onChange={(e) => setTrelloConfig({ ...trelloConfig, apiKey: e.target.value })}
            placeholder="Your Trello API key"
            className="form-input"
          />
          <span className="form-hint">
            <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer">
              Get your API key
            </a>
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">API Token</label>
          <input
            type="password"
            value={trelloConfig.apiToken}
            onChange={(e) => setTrelloConfig({ ...trelloConfig, apiToken: e.target.value })}
            placeholder="Your Trello API token"
            className="form-input"
          />
          <span className="form-hint">
            Generate a token from the API key page above
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Board ID (optional)</label>
          <input
            type="text"
            value={trelloConfig.boardId}
            onChange={(e) => setTrelloConfig({ ...trelloConfig, boardId: e.target.value })}
            placeholder="Default board ID for new cards"
            className="form-input"
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleTrelloSave} loading={saving}>
          Save Trello Settings
        </Button>
      </IntegrationCard>

      {/* Monday.com */}
      <IntegrationCard
        title="Monday.com"
        icon="📊"
        description="Sync tasks with Monday.com boards"
        connected={mondayConnected}
        checking={checkingMonday}
        onConnect={() => setExpandedCard('monday')}
        onDisconnect={() => handleDisconnect('Monday.com')}
        expanded={expandedCard === 'monday'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'monday' ? null : 'monday')}
      >
        <div className="form-group">
          <label className="form-label">API Token</label>
          <input
            type="password"
            value={mondayConfig.apiToken}
            onChange={(e) => setMondayConfig({ ...mondayConfig, apiToken: e.target.value })}
            placeholder="Your Monday.com API token"
            className="form-input"
          />
          <span className="form-hint">
            <a href="https://monday.com/developers/apps" target="_blank" rel="noopener noreferrer">
              Get your API token
            </a>
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Board ID (optional)</label>
          <input
            type="text"
            value={mondayConfig.boardId}
            onChange={(e) => setMondayConfig({ ...mondayConfig, boardId: e.target.value })}
            placeholder="Default board ID for new items"
            className="form-input"
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleMondaySave} loading={saving}>
          Save Monday.com Settings
        </Button>
      </IntegrationCard>

      {/* Radicale/CalDAV */}
      <IntegrationCard
        title="CalDAV (Radicale/Nextcloud)"
        icon="🗓️"
        description="Sync with self-hosted CalDAV servers"
        connected={radicaleConnected}
        checking={checkingRadicale}
        onConnect={() => setExpandedCard('radicale')}
        onDisconnect={() => handleDisconnect('CalDAV')}
        expanded={expandedCard === 'radicale'}
        onToggleExpand={() => setExpandedCard(expandedCard === 'radicale' ? null : 'radicale')}
      >
        <div className="form-group">
          <label className="form-label">Server URL</label>
          <input
            type="text"
            value={radicaleConfig.serverUrl}
            onChange={(e) => setRadicaleConfig({ ...radicaleConfig, serverUrl: e.target.value })}
            placeholder="https://caldav.example.com"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            value={radicaleConfig.username}
            onChange={(e) => setRadicaleConfig({ ...radicaleConfig, username: e.target.value })}
            placeholder="your-username"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            value={radicaleConfig.password}
            onChange={(e) => setRadicaleConfig({ ...radicaleConfig, password: e.target.value })}
            placeholder="Your CalDAV password"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Calendar Path (optional)</label>
          <input
            type="text"
            value={radicaleConfig.calendarPath}
            onChange={(e) => setRadicaleConfig({ ...radicaleConfig, calendarPath: e.target.value })}
            placeholder="/calendars/user/default/"
            className="form-input"
          />
          <span className="form-hint">
            Leave empty to auto-discover calendars
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={handleRadicaleSave} loading={saving}>
          Save CalDAV Settings
        </Button>
      </IntegrationCard>
    </div>
  );
}

export default IntegrationsSettings;
