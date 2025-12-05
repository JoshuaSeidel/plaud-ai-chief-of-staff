const fetch = require('node-fetch');
const { getConfig, query } = require('../utils/db-helper');

const logger = {
  info: (msg, ...args) => console.log(`[Jira] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Jira ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Jira WARNING] ${msg}`, ...args)
};

/**
 * Get Jira configuration from database
 */
async function getJiraConfig() {
  const baseUrl = await getConfig('jiraBaseUrl');
  const email = await getConfig('jiraEmail');
  const apiToken = await getConfig('jiraApiToken');
  const projectKey = await getConfig('jiraProjectKey');
  
  const missing = [];
  if (!baseUrl) missing.push('Base URL');
  if (!email) missing.push('Email');
  if (!apiToken) missing.push('API Token');
  if (!projectKey) missing.push('Project Key');
  
  if (missing.length > 0) {
    const error = new Error(`Jira credentials not configured. Missing: ${missing.join(', ')}. Please configure in the Configuration page.`);
    error.code = 'NOT_CONFIGURED';
    throw error;
  }
  
  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    email,
    apiToken,
    projectKey
  };
}

/**
 * Make authenticated request to Jira API
 */
async function jiraRequest(endpoint, method = 'GET', body = null) {
  const { baseUrl, email, apiToken } = await getJiraConfig();
  
  // Create Basic Auth header (email:apiToken base64 encoded)
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  const url = `${baseUrl}/rest/api/3${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  logger.info(`Jira API ${method} ${endpoint}`);
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    // Check if this is an assignment error (400 with "cannot be assigned") - these are expected
    const isAssignmentError = response.status === 400 && 
      (errorText.includes('cannot be assigned') || endpoint.includes('/assignee'));
    
    if (isAssignmentError) {
      // Assignment errors are expected - log as info, not error
      logger.info(`Jira API ${method} ${endpoint} - Assignment not possible (this is expected)`);
    } else {
      logger.error(`Jira API error: ${response.status} - ${errorText}`);
    }
    throw new Error(`Jira API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }
  
  if (response.status === 204) {
    return null; // No content
  }
  
  return await response.json();
}

/**
 * Check if Jira is configured and accessible
 */
async function checkStatus() {
  try {
    await getJiraConfig();
    // Test connection by getting current user
    const user = await jiraRequest('/myself');
    
    logger.info(`Connected to Jira as: ${user.displayName} (${user.emailAddress})`);
    
    return {
      connected: true,
      user: {
        accountId: user.accountId,
        displayName: user.displayName,
        email: user.emailAddress
      }
    };
  } catch (error) {
    // If credentials aren't configured, that's fine - just return false silently
    if (error.code === 'NOT_CONFIGURED' || (error.message && error.message.includes('not configured'))) {
      return {
        connected: false,
        error: 'Not configured'
      };
    }
    // For other errors, log a warning but still return false
    logger.warn('Jira connection check failed', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Disconnect Jira (clear credentials)
 */
async function disconnect() {
  await query('DELETE FROM config WHERE key IN (?, ?, ?, ?)', 
    ['jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey']);
  logger.info('Jira disconnected');
  return { success: true };
}

/**
 * Get project information
 */
async function getProject(projectKey) {
  return await jiraRequest(`/project/${projectKey}`);
}

/**
 * List available projects
 */
async function listProjects() {
  const projects = await jiraRequest('/project');
  return projects || [];
}

/**
 * Get issue types for a project
 */
async function getIssueTypes(projectKey) {
  const project = await getProject(projectKey);
  return project.issueTypes || [];
}

/**
 * Create a Jira issue (story/task)
 */
async function createIssue(issueData) {
  const { projectKey } = await getJiraConfig();
  
  const {
    summary,
    description,
    issueType = 'Task', // Task, Story, Bug, etc.
    assignee = null,
    dueDate = null,
    priority = 'Medium'
  } = issueData;
  
  // Get project to find issue type ID
  const project = await getProject(projectKey);
  let issueTypeObj = project.issueTypes.find(type => 
    type.name === issueType || type.name.toLowerCase() === issueType.toLowerCase()
  );
  
  if (!issueTypeObj) {
    // Fallback to first available issue type
    const firstType = project.issueTypes && project.issueTypes.length > 0 ? project.issueTypes[0] : null;
    if (firstType) {
      logger.warn(`Issue type "${issueType}" not found, using "${firstType.name}"`);
      issueTypeObj = firstType;
    } else {
      throw new Error('No issue types available in project. Please configure issue types in Jira.');
    }
  }
  
  // Map priority names to Jira priority IDs
  // Common priorities: Highest (1), High (2), Medium (3), Low (4), Lowest (5)
  const priorityMap = {
    'Highest': '1',
    'High': '2',
    'Medium': '3',
    'Low': '4',
    'Lowest': '5'
  };
  
  const priorityId = priorityMap[priority] || '3'; // Default to Medium
  
  // Build issue payload
  const issue = {
    fields: {
      project: {
        key: projectKey
      },
      summary: summary,
      issuetype: {
        id: issueTypeObj.id
      },
      priority: {
        id: priorityId
      }
    }
  };
  
  // Add description if provided
  if (description) {
    // Jira uses ADF (Atlassian Document Format) for rich text
    issue.fields.description = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: description
            }
          ]
        }
      ]
    };
  }
  
  // Add assignee if provided
  if (assignee) {
    // Try to find user by email or accountId
    try {
      const users = await jiraRequest(`/user/search?query=${encodeURIComponent(assignee)}`);
      if (users && users.length > 0) {
        issue.fields.assignee = {
          accountId: users[0].accountId
        };
      }
    } catch (error) {
      logger.warn(`Could not assign to ${assignee}:`, error.message);
    }
  }
  
  // Add due date if provided
  if (dueDate) {
    // Jira expects date in format: YYYY-MM-DD
    const date = new Date(dueDate);
    issue.fields.duedate = date.toISOString().split('T')[0];
  }
  
  logger.info(`Creating Jira issue: ${summary} in project ${projectKey}`);
  
  // Try to create issue with assignee first
  let createdIssue;
  try {
    createdIssue = await jiraRequest('/issue', 'POST', issue);
  } catch (error) {
    // If creation fails due to assignee issue, retry without assignee
    if (error.message && error.message.includes('assignee') && issue.fields.assignee) {
      logger.warn(`Issue creation failed due to assignee, retrying without assignee: ${error.message}`);
      delete issue.fields.assignee;
      createdIssue = await jiraRequest('/issue', 'POST', issue);
      
      // Try to assign after creation (this can fail silently - expected behavior)
      if (assignee && createdIssue && createdIssue.key) {
        try {
          const users = await jiraRequest(`/user/search?query=${encodeURIComponent(assignee)}`);
          if (users && users.length > 0) {
            try {
              await jiraRequest(`/issue/${createdIssue.key}/assignee`, 'PUT', {
                accountId: users[0].accountId
              });
              logger.info(`Assigned issue ${createdIssue.key} to ${assignee}`);
            } catch (assignError) {
              const errorMsg = assignError.message || '';
              if (errorMsg.includes('cannot be assigned') || errorMsg.includes('400')) {
                logger.info(`Issue ${createdIssue.key} created successfully (assignment skipped: user cannot be assigned issues)`);
              } else {
                logger.warn(`Could not assign issue ${createdIssue.key} to ${assignee}: ${errorMsg}`);
              }
            }
          }
        } catch (assignError) {
          logger.warn(`Could not assign issue ${createdIssue.key} to ${assignee}: ${assignError.message}`);
        }
      }
    } else {
      throw error;
    }
  }
  
  logger.info(`Jira issue created: ${createdIssue.key} (${createdIssue.id})`);
  
  return {
    id: createdIssue.id,
    key: createdIssue.key,
    self: createdIssue.self
  };
}

/**
 * Update a Jira issue
 */
async function updateIssue(issueKey, updates) {
  const { summary, description, priority, dueDate } = updates;
  
  const fields = {};
  
  if (summary) fields.summary = summary;
  
  if (description) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: description
            }
          ]
        }
      ]
    };
  }
  
  if (priority) {
    const priorityMap = {
      'Highest': '1',
      'High': '2',
      'Medium': '3',
      'Low': '4',
      'Lowest': '5'
    };
    fields.priority = { id: priorityMap[priority] || '3' };
  }
  
  if (dueDate) {
    const date = new Date(dueDate);
    fields.duedate = date.toISOString().split('T')[0];
  }
  
  await jiraRequest(`/issue/${issueKey}`, 'PUT', { fields });
  
  logger.info(`Updated Jira issue ${issueKey}`);
  
  return { success: true };
}

/**
 * Add comment to a Jira issue
 */
async function addComment(issueKey, text) {
  await jiraRequest(`/issue/${issueKey}/comment`, 'POST', {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: text
            }
          ]
        }
      ]
    }
  });
  
  logger.info(`Added comment to Jira issue ${issueKey}`);
  
  return { success: true };
}

/**
 * Transition a Jira issue to Done/Closed status
 */
async function closeIssue(issueKey, completionNote = null) {
  try {
    // Add completion note as comment if provided
    if (completionNote) {
      try {
        await addComment(issueKey, `✅ Completion Note: ${completionNote}`);
      } catch (commentError) {
        logger.warn(`Failed to add comment to Jira issue ${issueKey}: ${commentError.message}`);
        // Continue with closing even if comment fails
      }
    }
    
    // First, get available transitions for this issue
    const transitions = await jiraRequest(`/issue/${issueKey}/transitions`);
    
    // Find the "Done" or "Closed" transition
    const doneTransition = transitions.transitions.find(t => 
      t.name.toLowerCase() === 'done' || 
      t.name.toLowerCase() === 'close' || 
      t.name.toLowerCase() === 'closed' ||
      t.name.toLowerCase() === 'resolve' ||
      t.to?.name?.toLowerCase() === 'done' ||
      t.to?.name?.toLowerCase() === 'closed'
    );
    
    if (!doneTransition) {
      logger.warn(`No "Done" transition found for issue ${issueKey}. Available transitions: ${transitions.transitions.map(t => t.name).join(', ')}`);
      return { success: false, error: 'No done transition available' };
    }
    
    // Transition the issue
    await jiraRequest(`/issue/${issueKey}/transitions`, 'POST', {
      transition: {
        id: doneTransition.id
      }
    });
    
    logger.info(`Transitioned Jira issue ${issueKey} to Done`);
    return { success: true };
  } catch (error) {
    logger.warn(`Failed to close Jira issue ${issueKey}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a Jira issue permanently
 */
async function deleteIssue(issueKey) {
  try {
    await jiraRequest(`/issue/${issueKey}`, 'DELETE');
    logger.info(`Deleted Jira issue ${issueKey}`);
    return { success: true };
  } catch (error) {
    logger.warn(`Failed to delete Jira issue ${issueKey}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get issue by key
 */
async function getIssue(issueKey) {
  const issue = await jiraRequest(`/issue/${issueKey}`);
  
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description,
    status: issue.fields.status.name,
    assignee: issue.fields.assignee ? {
      displayName: issue.fields.assignee.displayName,
      email: issue.fields.assignee.emailAddress
    } : null,
    priority: issue.fields.priority.name,
    created: issue.fields.created,
    updated: issue.fields.updated,
    dueDate: issue.fields.duedate
  };
}

/**
 * List issues in project
 */
async function listIssues(projectKey = null, limit = 50) {
  const { projectKey: configProjectKey } = await getJiraConfig();
  const searchProjectKey = projectKey || configProjectKey;
  
  // JQL (Jira Query Language) query
  const jql = `project = ${searchProjectKey} ORDER BY created DESC`;
  const result = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`);
  
  return result.issues.map(issue => ({
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    assignee: issue.fields.assignee ? issue.fields.assignee.displayName : null,
    created: issue.fields.created
  }));
}

module.exports = {
  checkStatus,
  disconnect,
  getProject,
  listProjects,
  getIssueTypes,
  createIssue,
  updateIssue,
  addComment,
  closeIssue,
  deleteIssue,
  getIssue,
  listIssues
};
