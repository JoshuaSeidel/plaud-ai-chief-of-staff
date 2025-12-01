# Unraid Update Instructions

## The mobile UI fixes are committed but not deployed yet

Your local changes are built and pushed to GitHub, but your Unraid server is still serving the old container with the old build.

## To deploy the fixes to Unraid:

### Option 1: SSH into Unraid and rebuild (Recommended)
```bash
# SSH into your Unraid server
ssh root@your-unraid-ip

# Navigate to your app directory
cd /mnt/user/appdata/ai-chief-of-staff  # or wherever you have it

# Pull latest code
git pull origin feature/microservices-architecture

# Rebuild and restart the frontend container
docker-compose build --no-cache aicos-frontend
docker-compose up -d aicos-frontend

# Or rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

### Option 2: Use Unraid Community Apps UI
1. Go to Docker tab in Unraid
2. Stop the `aicos-frontend` container
3. Click "Force Update" or "Update"
4. Start the container

### Option 3: Portainer (if you have it installed)
1. Open Portainer
2. Go to Stacks → ai-chief-of-staff
3. Pull and redeploy

## What changed (for verification after update):

1. **Transcript page** - Mic and text buttons should stay side-by-side
2. **Calendar page** - Refresh and add buttons should stay side-by-side
3. **Config page** - Model dropdown should be readable (16px font, 44px height)
4. **Config page** - Refresh button next to dropdown should be smaller (36px wide)

## Verification:

After rebuilding, hard refresh your mobile browser:
- **iOS Safari**: Hold ⬇️ and swipe down on page
- **Chrome/Firefox**: Settings → Clear browsing data → Cached images
- **Or** visit in private/incognito mode

The changes ARE in the code (I verified in the built files), they just need to be deployed to your Unraid server.
