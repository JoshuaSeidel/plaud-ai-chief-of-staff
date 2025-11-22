# AI Chief of Staff - Unraid Community Apps

## Installation from Community Apps

1. Open Unraid WebUI
2. Go to **Apps** tab
3. Search for **"AI Chief of Staff"**
4. Click **Install**
5. Configure the template (see below)
6. Click **Apply**

## Quick Setup

### Required Configuration

1. **Database Setup** (Choose one):

   **Option A: Use Existing PostgreSQL Container**
   - Install PostgreSQL from Community Apps first
   - Set `POSTGRES_HOST` to your PostgreSQL container name or IP
   - Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

   **Option B: Use SQLite (Simpler)**
   - Set `DB_TYPE` to `sqlite`
   - All data stored in `/mnt/user/appdata/ai-chief-of-staff`

2. **Anthropic API Key**:
   - After container starts, open WebUI
   - Go to **Configuration** tab
   - Enter your Anthropic API key
   - Click **Save**

### Optional Configuration

**Google Calendar Integration**:
1. Set up Google OAuth in Google Cloud Console
2. Add redirect URI: `http://[YOUR-UNRAID-IP]:3001/api/calendar/google/callback`
3. Enter Client ID & Secret in Configuration UI

**Push Notifications**:
1. Generate VAPID keys: `docker exec -it AI-Chief-of-Staff npx web-push generate-vapid-keys`
2. Add keys to container template
3. Restart container

**Reverse Proxy (SWAG)**:
1. Install SWAG from Community Apps
2. Set `GOOGLE_REDIRECT_URI` to `https://aicos.yourdomain.com/api/calendar/google/callback`
3. Copy `swag-config/aicos.subdomain.conf` to SWAG proxy-confs directory

## Template Variables Explained

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_TYPE` | Yes | `postgres` | Use `postgres` (recommended) or `sqlite` |
| `POSTGRES_HOST` | If using PostgreSQL | - | PostgreSQL hostname/IP |
| `POSTGRES_PORT` | If using PostgreSQL | `5432` | PostgreSQL port |
| `POSTGRES_DB` | If using PostgreSQL | `ai_chief_of_staff` | Database name |
| `POSTGRES_USER` | If using PostgreSQL | `aicos` | Database username |
| `POSTGRES_PASSWORD` | If using PostgreSQL | - | Database password (required!) |
| `GOOGLE_REDIRECT_URI` | For SWAG | - | OAuth callback URL |
| `VAPID_PUBLIC_KEY` | For notifications | - | Push notification key |
| `VAPID_PRIVATE_KEY` | For notifications | - | Push notification key |

## PostgreSQL Setup (Recommended)

### Option 1: Official PostgreSQL Container

```bash
# In Unraid terminal
docker run -d \
  --name=postgres \
  --net=bridge \
  -e POSTGRES_DB=ai_chief_of_staff \
  -e POSTGRES_USER=aicos \
  -e POSTGRES_PASSWORD=your-secure-password \
  -v /mnt/user/appdata/postgres:/var/lib/postgresql/data \
  postgres:16-alpine
```

Then in AI Chief of Staff template:
- `POSTGRES_HOST`: `postgres` (or your Unraid IP)
- `POSTGRES_USER`: `aicos`
- `POSTGRES_PASSWORD`: `your-secure-password`
- `POSTGRES_DB`: `ai_chief_of_staff`

### Option 2: PostgreSQL from Community Apps

1. Install **PostgreSQL** from Community Apps
2. Note the database credentials
3. Configure AI Chief of Staff template with those credentials

## SWAG Integration (For SSL/HTTPS)

### Step 1: Install SWAG
```bash
# From Community Apps, install SWAG
# Configure with your domain and DNS provider
```

### Step 2: Configure Subdomain
```bash
# Copy the subdomain config
cp /mnt/user/appdata/ai-chief-of-staff/swag-config/aicos.subdomain.conf \
   /mnt/user/appdata/swag/nginx/proxy-confs/

# Restart SWAG
docker restart swag
```

### Step 3: Update Redirect URI
In AI Chief of Staff template:
```
GOOGLE_REDIRECT_URI=https://aicos.yourdomain.com/api/calendar/google/callback
```

Access via: `https://aicos.yourdomain.com`

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs AI-Chief-of-Staff

# Common issues:
# - PostgreSQL not accessible
# - Wrong database credentials
# - Port 3001 already in use
```

### Database Connection Failed
```bash
# Test PostgreSQL connection
docker exec -it AI-Chief-of-Staff ping postgres

# Check PostgreSQL is running
docker ps | grep postgres

# Verify credentials match
```

### Can't Access WebUI
- Check if container is running: `docker ps | grep AI-Chief`
- Verify port 3001 is not blocked by firewall
- Try: `http://[UNRAID-IP]:3001`

### AI Features Not Working
- Verify Anthropic API key is entered in Configuration UI
- Check logs: `docker logs AI-Chief-of-Staff | grep -i anthropic`
- Ensure API key starts with `sk-ant-`

## Backup & Restore

### Backup
```bash
# SQLite backup
cp -r /mnt/user/appdata/ai-chief-of-staff /mnt/user/backup/

# PostgreSQL backup
docker exec postgres pg_dump -U aicos ai_chief_of_staff > backup.sql
```

### Restore
```bash
# SQLite restore
cp -r /mnt/user/backup/ai-chief-of-staff /mnt/user/appdata/

# PostgreSQL restore
cat backup.sql | docker exec -i postgres psql -U aicos ai_chief_of-staff
```

## Updates

Updates are automatic! The container uses `:latest` tag.

To manually update:
1. Go to **Docker** tab in Unraid
2. Click **Check for Updates**
3. Click **Update** if available
4. Or run: `docker pull ghcr.io/joshuaseidel/plaud-ai-chief-of-staff:latest && docker restart AI-Chief-of-Staff`

## Support

- **GitHub Issues**: https://github.com/JoshuaSeidel/plaud-ai-chief-of-staff/issues
- **Documentation**: https://github.com/JoshuaSeidel/plaud-ai-chief-of-staff
- **Unraid Forums**: Post in Docker Containers section

## Community Apps Submission

This template is pending review for Community Apps. In the meantime:

1. Download `ai-chief-of-staff.xml`
2. In Unraid WebUI, go to **Docker** tab
3. Click **Add Container** at bottom
4. Toggle **Advanced View**
5. At top right, change **Template** dropdown to **User Templates**
6. Click folder icon, upload XML
7. Configure and click **Apply**

