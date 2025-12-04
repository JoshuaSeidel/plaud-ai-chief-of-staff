const fetch = require('node-fetch');
const { getConfig } = require('../utils/db-helper');

const MONDAY_API_URL = 'https://api.monday.com/v2';

const logger = {
  info: (msg, ...args) => console.log(`[Monday.com] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Monday.com ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Monday.com WARNING] ${msg}`, ...args)
};

/**
 * Get Monday.com API token from database
 */
async function getToken() {
  const token = await getConfig('mondayApiKey');
  
  if (!token) {
    throw new Error('Monday.com API token not configured');
  }
  
  return token;
}

/**
 * Execute GraphQL query against Monday.com API
 */
async function graphql(query, variables = {}) {
  const token = await getToken();
  
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-01'
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  
  const result = await response.json();
  
  if (result.errors) {
    logger.error('Monday.com GraphQL errors:', result.errors);
    throw new Error(result.errors[0].message);
  }
  
  if (!response.ok) {
    logger.error(`Monday.com API error: ${response.status} ${response.statusText}`);
    throw new Error(`Monday.com API error: ${response.status}`);
  }
  
  return result.data;
}

/**
 * Check if Monday.com is configured and accessible
 */
async function checkStatus() {
  try {
    const token = await getToken();
    
    const query = `
      query {
        me {
          id
          name
          email
          account {
            name
            slug
          }
        }
      }
    `;
    
    const data = await graphql(query);
    
    logger.info(`Connected to Monday.com as: ${data.me.name} (${data.me.email})`);
    
    return {
      connected: true,
      user: {
        id: data.me.id,
        name: data.me.name,
        email: data.me.email,
        account: data.me.account.name
      }
    };
  } catch (err) {
    logger.error('Monday.com connection check failed:', err);
    return {
      connected: false,
      error: err.message
    };
  }
}

/**
 * Get list of boards accessible to the user
 */
async function getBoards() {
  try {
    const query = `
      query {
        boards(limit: 100) {
          id
          name
          description
          state
          board_folder_id
          board_kind
          permissions
        }
      }
    `;
    
    const data = await graphql(query);
    
    return data.boards.map(board => ({
      id: board.id,
      name: board.name,
      description: board.description,
      state: board.state,
      kind: board.board_kind
    }));
  } catch (err) {
    logger.error('Error fetching Monday.com boards:', err);
    throw err;
  }
}

/**
 * Get groups (sections) from a specific board
 */
async function getGroups(boardId) {
  try {
    const query = `
      query($boardId: [ID!]) {
        boards(ids: $boardId) {
          groups {
            id
            title
            color
            position
            archived
          }
        }
      }
    `;
    
    const data = await graphql(query, { boardId: [boardId] });
    
    return data.boards[0].groups.map(group => ({
      id: group.id,
      title: group.title,
      color: group.color,
      position: group.position,
      archived: group.archived
    }));
  } catch (err) {
    logger.error(`Error fetching groups for board ${boardId}:`, err);
    throw err;
  }
}

/**
 * Get columns from a specific board
 */
async function getColumns(boardId) {
  try {
    const query = `
      query($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;
    
    const data = await graphql(query, { boardId: [boardId] });
    
    return data.boards[0].columns.map(column => ({
      id: column.id,
      title: column.title,
      type: column.type
    }));
  } catch (err) {
    logger.error(`Error fetching columns for board ${boardId}:`, err);
    throw err;
  }
}

/**
 * Create a new item (task)
 */
async function createItem(data) {
  try {
    const { name, boardId, groupId, columnValues } = data;
    
    // If no boardId provided, get default from config
    let targetBoardId = boardId;
    if (!targetBoardId) {
      targetBoardId = await getConfig('mondayBoardId');
    }
    
    if (!targetBoardId) {
      throw new Error('No board ID provided and no default configured');
    }
    
    // If no groupId provided, get default from config
    let targetGroupId = groupId;
    if (!targetGroupId) {
      targetGroupId = await getConfig('mondayGroupId');
    }
    
    const mutation = `
      mutation($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
          state
          created_at
          updated_at
        }
      }
    `;
    
    const variables = {
      boardId: targetBoardId,
      groupId: targetGroupId,
      itemName: name,
      columnValues: columnValues ? JSON.stringify(columnValues) : undefined
    };
    
    const result = await graphql(mutation, variables);
    
    logger.info(`Created Monday.com item: ${result.create_item.name} (${result.create_item.id})`);
    
    return {
      id: result.create_item.id,
      name: result.create_item.name,
      state: result.create_item.state,
      createdAt: result.create_item.created_at,
      updatedAt: result.create_item.updated_at
    };
  } catch (err) {
    logger.error('Error creating Monday.com item:', err);
    throw err;
  }
}

/**
 * Update an existing item
 */
async function updateItem(itemId, updates) {
  try {
    const { name, columnValues } = updates;
    
    const mutation = `
      mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
          name
          state
          updated_at
        }
      }
    `;
    
    // Get board ID for this item
    const itemQuery = `
      query($itemId: [ID!]) {
        items(ids: $itemId) {
          board {
            id
          }
        }
      }
    `;
    
    const itemData = await graphql(itemQuery, { itemId: [itemId] });
    const boardId = itemData.items[0].board.id;
    
    const variables = {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues || {})
    };
    
    const result = await graphql(mutation, variables);
    
    // Update name if provided (separate mutation)
    if (name) {
      const nameMutation = `
        mutation($boardId: ID!, $itemId: ID!, $value: String!) {
          change_simple_column_value(
            board_id: $boardId,
            item_id: $itemId,
            column_id: "name",
            value: $value
          ) {
            id
            name
          }
        }
      `;
      
      await graphql(nameMutation, { boardId, itemId, value: name });
    }
    
    logger.info(`Updated Monday.com item: ${itemId}`);
    
    return {
      id: result.change_multiple_column_values.id,
      name: result.change_multiple_column_values.name,
      state: result.change_multiple_column_values.state,
      updatedAt: result.change_multiple_column_values.updated_at
    };
  } catch (err) {
    logger.error(`Error updating Monday.com item ${itemId}:`, err);
    throw err;
  }
}

/**
 * Add an update (comment) to an item
 */
async function addUpdate(itemId, text) {
  try {
    const mutation = `
      mutation($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
          body
          created_at
        }
      }
    `;
    
    const result = await graphql(mutation, { itemId, body: text });
    
    logger.info(`Added update to Monday.com item ${itemId}`);
    
    return {
      id: result.create_update.id,
      body: result.create_update.body,
      createdAt: result.create_update.created_at
    };
  } catch (err) {
    logger.error(`Error adding update to Monday.com item ${itemId}:`, err);
    throw err;
  }
}

/**
 * Archive an item with optional completion note
 */
async function archiveItem(itemId, completionNote) {
  try {
    // First add completion note as update if provided
    if (completionNote) {
      await addUpdate(itemId, `✅ Completed: ${completionNote}`);
    }
    
    const mutation = `
      mutation($itemId: ID!) {
        archive_item(item_id: $itemId) {
          id
          state
        }
      }
    `;
    
    const result = await graphql(mutation, { itemId });
    
    logger.info(`Archived Monday.com item: ${itemId}`);
    
    return {
      id: result.archive_item.id,
      state: result.archive_item.state
    };
  } catch (err) {
    logger.error(`Error archiving Monday.com item ${itemId}:`, err);
    throw err;
  }
}

/**
 * Delete an item permanently
 */
async function deleteItem(itemId) {
  try {
    const mutation = `
      mutation($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `;
    
    const result = await graphql(mutation, { itemId });
    
    logger.info(`Deleted Monday.com item: ${itemId}`);
    
    return { success: true };
  } catch (err) {
    logger.error(`Error deleting Monday.com item ${itemId}:`, err);
    throw err;
  }
}

/**
 * Get items from a specific board
 */
async function getItems(boardId, groupId) {
  try {
    const query = `
      query($boardId: [ID!], $groupId: [String]) {
        boards(ids: $boardId) {
          items_page(limit: 100, query_params: {rules: [{column_id: "group", compare_value: $groupId}]}) {
            items {
              id
              name
              state
              created_at
              updated_at
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;
    
    const variables = { boardId: [boardId] };
    if (groupId) {
      variables.groupId = [groupId];
    }
    
    const data = await graphql(query, variables);
    
    return data.boards[0].items_page.items.map(item => ({
      id: item.id,
      name: item.name,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      columnValues: item.column_values
    }));
  } catch (err) {
    logger.error(`Error fetching items for board ${boardId}:`, err);
    throw err;
  }
}

/**
 * Search for items
 */
async function searchItems(query) {
  try {
    const searchQuery = `
      query($query: String!) {
        items_page_by_column_values(limit: 50, columns: [{column_id: "name", column_values: [$query]}]) {
          items {
            id
            name
            state
            created_at
            updated_at
            board {
              id
              name
            }
          }
        }
      }
    `;
    
    const data = await graphql(searchQuery, { query });
    
    return data.items_page_by_column_values.items.map(item => ({
      id: item.id,
      name: item.name,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      board: {
        id: item.board.id,
        name: item.board.name
      }
    }));
  } catch (err) {
    logger.error('Error searching Monday.com items:', err);
    throw err;
  }
}

module.exports = {
  checkStatus,
  getBoards,
  getGroups,
  getColumns,
  createItem,
  updateItem,
  addUpdate,
  archiveItem,
  deleteItem,
  getItems,
  searchItems
};
