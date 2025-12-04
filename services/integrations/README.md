# Integrations Microservice

This microservice handles all external platform integrations for AI Chief of Staff, reducing the load on the main backend service.

## Features

### Calendar Integrations
- **Google Calendar** - OAuth2 authentication, event CRUD operations
- **Microsoft Calendar** - Microsoft Graph API integration
- **iCloud Calendar** - .ics file generation for manual import

### Task Management Integrations
- **Jira** - Issue creation, updates, transitions, comments
- **Microsoft Planner** - Task creation, updates, completion
- **Trello** - Card creation, updates, archiving, comments ✨ NEW
- **Monday.com** - Item creation, updates, status changes ✨ NEW

## Architecture

### Directory Structure
```
services/integrations/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── Dockerfile             # Container definition
├── routes/                # API route handlers
│   ├── google-calendar.js
│   ├── microsoft-calendar.js
│   ├── jira.js
│   ├── planner.js
│   ├── trello.js          # ✨ NEW
│   └── monday.js          # ✨ NEW
├── services/              # Integration logic
│   ├── google-calendar.js
│   ├── microsoft-calendar.js
│   ├── jira.js
│   ├── planner.js
│   ├── trello.js          # ✨ NEW
│   └── monday.js          # ✨ NEW
└── utils/
    └── db-helper.js       # Shared database access
```

## API Endpoints

### Calendar
- `GET /calendar/google/status` - Check connection status
- `GET /calendar/google/auth-url` - Get OAuth URL
- `GET /calendar/google/callback` - OAuth callback
- `GET /calendar/google/events` - List events
- `POST /calendar/google/event` - Create event
- `DELETE /calendar/google/event/:id` - Delete event

### Jira
- `GET /tasks/jira/status` - Check connection
- `POST /tasks/jira/issue` - Create issue
- `PUT /tasks/jira/issue/:key` - Update issue
- `POST /tasks/jira/issue/:key/close` - Close issue with comment
- `DELETE /tasks/jira/issue/:key` - Delete issue

### Trello (✨ NEW)
- `GET /tasks/trello/status` - Check connection
- `GET /tasks/trello/auth-url` - Get OAuth URL
- `GET /tasks/trello/callback` - OAuth callback  
- `GET /tasks/trello/boards` - List boards
- `POST /tasks/trello/card` - Create card
- `PUT /tasks/trello/card/:id` - Update card
- `POST /tasks/trello/card/:id/comment` - Add comment
- `POST /tasks/trello/card/:id/archive` - Archive card
- `DELETE /tasks/trello/card/:id` - Delete card

### Monday.com (✨ NEW)
- `GET /tasks/monday/status` - Check connection
- `GET /tasks/monday/boards` - List boards
- `POST /tasks/monday/item` - Create item
- `PUT /tasks/monday/item/:id` - Update item
- `POST /tasks/monday/item/:id/update` - Add update (comment)
- `POST /tasks/monday/item/:id/archive` - Archive item
- `DELETE /tasks/monday/item/:id` - Delete item

## Configuration

All configurations are stored in the main database `config` table:

### Trello
- `trelloApiKey` - Trello API key
- `trelloToken` - Trello API token
- `trelloBoardId` - Default board ID
- `trelloListId` - Default list ID

### Monday.com
- `mondayApiKey` - Monday.com API token
- `mondayBoardId` - Default board ID
- `mondayGroupId` - Default group ID

## Environment Variables

```bash
NODE_ENV=production
PORT=8006
DATABASE_URL=postgresql://...  # Or use SQLite
```

## Deployment

### Docker Compose
The service is included in the main docker-compose.yml:

```yaml
aicos-integrations:
  container_name: aicos-integrations
  build:
    context: ./services/integrations
    dockerfile: Dockerfile
  ports:
    - "8006:8006"
  environment:
    - DATABASE_URL=postgresql://...
  networks:
    - aicos-network
  restart: unless-stopped
```

### Backend API Proxy
The main backend proxies requests to this microservice:

```javascript
// In backend routes
app.use('/api/calendar', proxy('http://aicos-integrations:8006/calendar'));
app.use('/api/tasks', proxy('http://aicos-integrations:8006/tasks'));
```

## Development

### Run Locally
```bash
cd services/integrations
npm install
npm run dev
```

### Test Endpoints
```bash
# Health check
curl http://localhost:8006/health

# Check Trello status
curl http://localhost:8006/tasks/trello/status

# Check Monday status
curl http://localhost:8006/tasks/monday/status
```

## Migration Notes

This microservice extracts the following from the main backend:
- `backend/services/google-calendar.js` → `services/integrations/services/google-calendar.js`
- `backend/services/microsoft-calendar.js` → `services/integrations/services/microsoft-calendar.js`
- `backend/services/jira.js` → `services/integrations/services/jira.js`
- `backend/services/microsoft-planner.js` → `services/integrations/services/planner.js`

Plus adds new integrations:
- `services/integrations/services/trello.js` (NEW)
- `services/integrations/services/monday.js` (NEW)

## API Documentation

### Trello API
- Base URL: `https://api.trello.com/1`
- Authentication: API Key + Token
- Docs: https://developer.atlassian.com/cloud/trello/rest/

### Monday.com API  
- Base URL: `https://api.monday.com/v2`
- Authentication: Bearer token
- Protocol: GraphQL
- Docs: https://developer.monday.com/api-reference/

## Benefits of Microservice Architecture

1. **Separation of Concerns** - External integrations isolated from core logic
2. **Independent Scaling** - Scale integration service independently
3. **Fault Isolation** - Integration failures don't crash main backend
4. **Easier Testing** - Test integrations in isolation
5. **Technology Flexibility** - Can use different tech stack if needed
6. **Reduced Main Backend Load** - Lighter backend container

## TODO

- [ ] Copy existing services from backend
- [ ] Implement Trello integration
- [ ] Implement Monday.com integration
- [ ] Update GitHub Actions workflow
- [ ] Update nginx proxy configuration
- [ ] Update frontend configuration UI
- [ ] Add comprehensive error handling
- [ ] Add rate limiting
- [ ] Add caching layer
- [ ] Add webhook support for real-time sync
