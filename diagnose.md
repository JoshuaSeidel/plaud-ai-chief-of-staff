# API Key Storage Diagnosis

## Step 1: Find your container name
```bash
docker ps | grep chief
```

Replace `CONTAINER_NAME` below with the actual name.

## Step 2: Check if /app/data is mounted
```bash
docker inspect CONTAINER_NAME | grep -A 10 "Mounts"
```

**Expected:** Should show `/app/data` mounted to a host path  
**Problem if:** Shows empty `Mounts: []` or no `/app/data` entry

## Step 3: Check what's actually in the database
```bash
# Check if database file exists
docker exec CONTAINER_NAME ls -lah /app/data/

# Check database contents directly
docker exec CONTAINER_NAME sqlite3 /app/data/ai-chief-of-staff.db "SELECT key, substr(value,1,20) as value_preview, length(value) as len FROM config WHERE key='anthropicApiKey';"
```

## Step 4: Use the debug endpoint
Open in browser:
```
http://YOUR_UNRAID_IP:3001/api/config/debug/raw/anthropicApiKey
```

This will show you exactly what's stored.

## Step 5: Check the logs during save
Watch logs while saving:
```bash
docker logs -f CONTAINER_NAME
```

Then save your API key and watch what happens.

## Common Issues:

### Issue 1: No volume mount
**Symptom:** Mounts is empty  
**Fix:** Add volume mapping in Unraid container settings:
- Container Path: `/app/data`
- Host Path: `/mnt/user/appdata/ai-chief-of-staff/data`

### Issue 2: Wrong database file
**Symptom:** Multiple database files exist  
**Fix:** Delete old database files and restart

### Issue 3: PostgreSQL selected but not configured
**Symptom:** Logs show "SQLite configured" but config says postgres  
**Fix:** Switch back to SQLite in settings or configure PostgreSQL properly

