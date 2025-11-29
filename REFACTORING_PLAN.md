# Configuration Refactoring Plan

## Completed ✅

1. **VAPID Key Automation** 
   - Created `backend/utils/vapid-manager.js`
   - Integrated into `backend/server.js` startup
   - Updated `backend/services/push-notifications.js` to use database keys
   - Updated `backend/routes/notifications.js` for async handling

## Remaining Tasks 🔄

### Priority 1: Configuration UI Refactoring (Configuration.js - 2478 lines)

**Issue**: Duplicate API key fields and redundant AI configuration sections

**Required Changes**:
1. **Remove lines 739-952**: Old "AI Provider Configuration" collapsible section
   - This duplicates API keys, models, max tokens, and user names
   - These settings should only be in the new "Main Application" section

2. **Update "AI Models & Providers" section** (starts line 985):
   - Already has "Main Application" section ✅
   - Add collapsible `<details>` wrapper around entire section
   - Move max tokens and user names into Main Application section
   - Wrap each microservice in its own `<details>` for collapsing

3. **Add Radicale CalDAV Integration**:
   - Add checkbox under Calendar Integrations
   - Add configuration fields (URL, username, password)
   - Save to `enabledIntegrations.radicale` state

4. **Fix Google Calendar Checkbox**:
   - Line 1392-1393: `enabledIntegrations.googleCalendar` checkbox
   - Issue: Changes not being saved
   - Fix: Ensure `googleCalendarEnabled` is included in save payload (line 627)

### Priority 2: README Complete Rewrite

**Current State**: README is outdated, doesn't reflect:
- Glassmorphism UI theme
- Multi-provider AI configuration
- Main Application vs Microservices architecture
- VAPID key automation
- Microservices optional deployment

**Required Sections**:
1. **Overview** - Modern AI productivity assistant
2. **Features** - Highlight glassmorphism, multi-provider AI, PWA
3. **Architecture** - Link to ARCHITECTURE_FLOWS.md
4. **Quick Start** - Docker deployment (standalone + microservices)
5. **Configuration** - Main app AI provider, API keys, integrations
6. **Microservices** - Optional enhanced capabilities
7. **Development** - Local setup guide
8. **Troubleshooting** - Common issues

### Priority 3: Commit Markdown Files

Files to add:
- `ARCHITECTURE_FLOWS.md` (already exists, needs commit)
- `ARCHITECTURE_DIAGRAM.md` (already exists, needs commit)
- Any other `.md` files in root that document architecture

## Implementation Steps

### Step 1: Commit Current VAPID Changes
```bash
git add backend/utils/vapid-manager.js backend/server.js backend/services/push-notifications.js backend/routes/notifications.js
git commit -m "feat: Automate VAPID key generation for push notifications

- Create vapid-manager utility to generate/store keys in database
- Integrate into server startup process
- Update push notification service to use database keys
- No more manual VAPID key generation required"
```

### Step 2: Configuration.js Refactoring
Due to file size (2478 lines), manual editing recommended:
1. Delete lines 739-952 (old AI Provider Configuration section)
2. Update "AI Models & Providers" section structure
3. Add Radicale integration fields
4. Fix Google Calendar save logic

### Step 3: README Rewrite
Create comprehensive new README with:
- Updated feature list
- Architecture diagram links
- Clear configuration instructions
- Microservices deployment guide

### Step 4: Final Commit
```bash
git add -A
git commit -m "feat: Major configuration UI overhaul and documentation update

Configuration Changes:
- Remove duplicate AI provider configuration section
- Consolidate all AI settings into Main Application section
- Add collapsible sections for better organization
- Add Radicale CalDAV integration option
- Fix Google Calendar checkbox not saving

Documentation:
- Complete README rewrite with new architecture
- Add links to architecture flow diagrams
- Document glassmorphism theme
- Update configuration instructions
- Add microservices deployment guide

All markdown architecture files committed"

git push origin feature/microservices-architecture
```

## Technical Notes

### Configuration.js Structure
Current problematic structure:
```
Line 739-952: OLD "AI Provider Configuration" (REMOVE)
  - AI Provider dropdown
  - API Keys (Anthropic, OpenAI)
  - Model selectors
  - Max Tokens
  - User Names

Line 985+: NEW "AI Models & Providers" (KEEP & ENHANCE)
  - Main Application (provider + model)
  - Microservices sections
  - API Keys section (keep this)
```

### Radicale Integration Schema
```javascript
{
  radicaleEnabled: boolean,
  radicaleUrl: string,
  radicaleUsername: string,
  radicalePassword: string
}
```

Save to config table:
```sql
INSERT INTO config (key, value) VALUES 
  ('radicaleEnabled', 'true'),
  ('radicaleUrl', 'http://localhost:5232'),
  ('radicaleUsername', 'user'),
  ('radicalePassword', 'encrypted_pass');
```

## Next Session Checklist

- [ ] Remove old AI Provider Configuration section (lines 739-952)
- [ ] Add `<details>` wrapper to AI Models & Providers
- [ ] Move max tokens/user names to Main Application section
- [ ] Add Radicale CalDAV integration UI
- [ ] Fix Google Calendar checkbox save logic
- [ ] Complete README rewrite
- [ ] Commit all markdown files
- [ ] Final push to remote

## Files Modified So Far

1. ✅ backend/utils/vapid-manager.js (NEW)
2. ✅ backend/server.js
3. ✅ backend/services/push-notifications.js
4. ✅ backend/routes/notifications.js
5. ⏳ frontend/src/components/Configuration.js (PARTIAL - needs completion)
6. ⏳ README.md (needs complete rewrite)
