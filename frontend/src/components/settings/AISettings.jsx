import React, { useState, useEffect } from 'react';
import { configAPI, profilesAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useProfile } from '../../contexts/ProfileContext';
import { ScopeBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { FormSkeleton } from '../common/LoadingSkeleton';

export function AISettings() {
  const { currentProfile } = useProfile();
  const toast = useToast();

  const [config, setConfig] = useState({
    aiProvider: 'anthropic',
    anthropicApiKey: '',
    claudeModel: 'claude-sonnet-4-5-20250929',
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
    aiMaxTokens: '4096',
    aiTemperature: '0.7'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState({
    anthropic: [],
    openai: [],
    ollama: []
  });
  const [loadingModels, setLoadingModels] = useState({});

  useEffect(() => {
    loadConfig();
    loadModelsForProvider('anthropic');
    loadModelsForProvider('openai');
    loadModelsForProvider('ollama');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await configAPI.getAll();
      const data = response.data;

      // Load profile preferences
      let profilePrefs = {};
      if (currentProfile?.id) {
        try {
          const profileResponse = await profilesAPI.getById(currentProfile.id);
          if (profileResponse.data?.profile?.preferences) {
            profilePrefs = typeof profileResponse.data.profile.preferences === 'string'
              ? JSON.parse(profileResponse.data.profile.preferences)
              : profileResponse.data.profile.preferences;
          }
        } catch (err) {
          console.warn('Failed to load profile preferences:', err);
        }
      }

      setConfig({
        aiProvider: profilePrefs.ai_provider || data.ai_provider || 'anthropic',
        anthropicApiKey: data.anthropic_api_key || '',
        claudeModel: profilePrefs.claude_model || data.claude_model || 'claude-sonnet-4-5-20250929',
        openaiApiKey: data.openai_api_key || '',
        openaiModel: profilePrefs.openai_model || data.openai_model || 'gpt-4o',
        ollamaBaseUrl: data.ollama_base_url || 'http://localhost:11434',
        ollamaModel: profilePrefs.ollama_model || data.ollama_model || 'llama3.1',
        aiMaxTokens: data.ai_max_tokens || '4096',
        aiTemperature: data.ai_temperature || '0.7'
      });
    } catch (err) {
      toast.error('Failed to load AI settings');
      console.error('Failed to load AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModelsForProvider = async (provider) => {
    setLoadingModels(prev => ({ ...prev, [provider]: true }));
    try {
      const response = await configAPI.getModels(provider);
      if (response.data?.models) {
        setAvailableModels(prev => ({ ...prev, [provider]: response.data.models }));
      }
    } catch (err) {
      console.warn(`Failed to load models for ${provider}:`, err);
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save global settings (API keys)
      const globalSettings = {
        anthropic_api_key: config.anthropicApiKey,
        openai_api_key: config.openaiApiKey,
        ollama_base_url: config.ollamaBaseUrl,
        ai_max_tokens: config.aiMaxTokens,
        ai_temperature: config.aiTemperature
      };

      await configAPI.bulkUpdate(globalSettings);

      // Save profile-specific settings
      if (currentProfile?.id) {
        const profileResponse = await profilesAPI.getById(currentProfile.id);
        const currentPrefs = profileResponse.data?.profile?.preferences || {};
        const parsedPrefs = typeof currentPrefs === 'string' ? JSON.parse(currentPrefs) : currentPrefs;

        const updatedPrefs = {
          ...parsedPrefs,
          ai_provider: config.aiProvider,
          claude_model: config.claudeModel,
          openai_model: config.openaiModel,
          ollama_model: config.ollamaModel
        };

        await profilesAPI.update(currentProfile.id, { preferences: updatedPrefs });
      }

      toast.success('AI settings saved successfully');
    } catch (err) {
      toast.error('Failed to save AI settings');
      console.error('Failed to save AI settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton fields={6} />;
  }

  const renderModelSelect = (provider, value, onChange) => {
    const models = availableModels[provider] || [];
    const isLoading = loadingModels[provider];

    return (
      <div className="form-group">
        <div className="flex items-center gap-sm">
          <select
            value={value}
            onChange={onChange}
            className="form-select"
            disabled={isLoading}
          >
            <option value="">Select a model...</option>
            {models.map(model => (
              <option key={model.id || model} value={model.id || model}>
                {model.name || model.id || model}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadModelsForProvider(provider)}
            disabled={isLoading}
            icon="🔄"
            title="Refresh models"
          />
        </div>
        {isLoading && <span className="form-hint">Loading models...</span>}
      </div>
    );
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h3>AI Provider Configuration</h3>
        <ScopeBadge scope="profile" />
      </div>

      <div className="form-group">
        <label className="form-label">AI Provider</label>
        <select
          value={config.aiProvider}
          onChange={(e) => setConfig({ ...config, aiProvider: e.target.value })}
          className="form-select"
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
        <span className="form-hint">Select which AI provider to use for this profile</span>
      </div>

      {config.aiProvider === 'anthropic' && (
        <>
          <div className="form-group">
            <label className="form-label">
              Anthropic API Key <ScopeBadge scope="global" />
            </label>
            <input
              type="password"
              value={config.anthropicApiKey}
              onChange={(e) => setConfig({ ...config, anthropicApiKey: e.target.value })}
              placeholder="sk-ant-..."
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Claude Model</label>
            {renderModelSelect(
              'anthropic',
              config.claudeModel,
              (e) => setConfig({ ...config, claudeModel: e.target.value })
            )}
          </div>
        </>
      )}

      {config.aiProvider === 'openai' && (
        <>
          <div className="form-group">
            <label className="form-label">
              OpenAI API Key <ScopeBadge scope="global" />
            </label>
            <input
              type="password"
              value={config.openaiApiKey}
              onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
              placeholder="sk-..."
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">OpenAI Model</label>
            {renderModelSelect(
              'openai',
              config.openaiModel,
              (e) => setConfig({ ...config, openaiModel: e.target.value })
            )}
          </div>
        </>
      )}

      {config.aiProvider === 'ollama' && (
        <>
          <div className="form-group">
            <label className="form-label">
              Ollama Base URL <ScopeBadge scope="global" />
            </label>
            <input
              type="text"
              value={config.ollamaBaseUrl}
              onChange={(e) => setConfig({ ...config, ollamaBaseUrl: e.target.value })}
              placeholder="http://localhost:11434"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ollama Model</label>
            {renderModelSelect(
              'ollama',
              config.ollamaModel,
              (e) => setConfig({ ...config, ollamaModel: e.target.value })
            )}
          </div>
        </>
      )}

      <div className="settings-divider" />

      <div className="settings-section-header">
        <h4>Advanced Settings</h4>
        <ScopeBadge scope="global" />
      </div>

      <div className="grid-2-col">
        <div className="form-group">
          <label className="form-label">Max Tokens</label>
          <input
            type="number"
            value={config.aiMaxTokens}
            onChange={(e) => setConfig({ ...config, aiMaxTokens: e.target.value })}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={config.aiTemperature}
            onChange={(e) => setConfig({ ...config, aiTemperature: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      <div className="settings-actions">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Save AI Settings
        </Button>
      </div>
    </div>
  );
}

export default AISettings;
