# AI Chief of Staff

An intelligent executive assistant that automates personal productivity by ingesting meeting transcripts and using Claude AI to generate actionable daily briefs, track commitments, and maintain rolling context.

## Features

- 📊 **Morning Dashboard**: AI-generated top 3 priorities from last 2 weeks of context
- 📝 **Transcript Upload**: Upload Plaud meeting transcripts with automatic processing
- 🤖 **Claude AI Integration**: Extracts commitments, action items, and generates daily briefs
- 💾 **SQLite Database**: Maintains rolling 2-week context window
- ⚙️ **Configuration UI**: Easy setup for API keys and settings
- 🐳 **Single Docker Container**: Simple deployment on Unraid or any Docker host

## Tech Stack

- **Frontend**: React 18 with modern hooks
- **Backend**: Node.js with Express
- **Database**: SQLite for storing context
- **AI**: Anthropic Claude API (claude-3-5-sonnet)
- **Deployment**: Single all-in-one Docker container

## Prerequisites

- Docker (for production deployment)
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)
- (Optional) Node.js 18+ and npm (for local development)

## Unraid Installation

### Method 1: Docker Hub (Easiest)

1. Open Unraid WebUI and go to the **Docker** tab
2. Click **Add Container**
3. Fill in the following:

**Container Settings:**
- **Name**: `ai-chief-of-staff`
- **Repository**: `ghcr.io/joshuaseidel/plaud-ai-chief-of-staff:latest`
- **Network Type**: `bridge`

**Port Mapping:**
- **Container Port**: `3001` → **Host Port**: `3001`

**Volume Mappings:**
- **Container Path**: `/app/data` → **Host Path**: `/mnt/user/appdata/ai-chief-of-staff/data`
- **Container Path**: `/app/uploads` → **Host Path**: `/mnt/user/appdata/ai-chief-of-staff/uploads`

**Environment Variables:**
- **Variable**: `ANTHROPIC_API_KEY` → **Value**: `your_api_key_here` (Required)
- **Variable**: `NODE_ENV` → **Value**: `production`
- **Variable**: `PORT` → **Value**: `3001`

4. Click **Apply** to start the container
5. Access at `http://YOUR-UNRAID-IP:3001`

### Method 2: Unraid Template (Coming Soon)

A Community Applications template will be available for one-click installation.

### Method 3: Docker Run Command

SSH into your Unraid server and run:

```bash
docker run -d \
  --name=ai-chief-of-staff \
  -p 3001:3001 \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  -e NODE_ENV=production \
  -v /mnt/user/appdata/ai-chief-of-staff/data:/app/data \
  -v /mnt/user/appdata/ai-chief-of-staff/uploads:/app/uploads \
  --restart=unless-stopped \
  ghcr.io/joshuaseidel/plaud-ai-chief-of-staff:latest
```

## Docker Installation (Other Platforms)

```bash
docker run -d \
  --name=ai-chief-of-staff \
  -p 3001:3001 \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  -v ai-chief-data:/app/data \
  -v ai-chief-uploads:/app/uploads \
  --restart=unless-stopped \
  ghcr.io/joshuaseidel/plaud-ai-chief-of-staff:latest
```

Access at: http://localhost:3001

## Local Development

### Development with Docker Compose

```bash
# Clone the repository
git clone git@github.com:JoshuaSeidel/plaud-ai-chief-of-staff.git
cd plaud-ai-chief-of-staff

# Copy and configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start with docker-compose (for local testing)
docker-compose up -d
```

### Development without Docker

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API key
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Configuration

### Required Environment Variables

- **ANTHROPIC_API_KEY**: Your Claude API key from https://console.anthropic.com/

### Optional Environment Variables

- **ICAL_CALENDAR_URL**: iCloud calendar URL for integration
- **PLAUD_API_KEY**: Plaud API key for automatic transcript fetching
- **NODE_ENV**: Environment mode (default: production)
- **PORT**: Port to run on (default: 3001)

## How to Use

1. **Access the Application**: Open `http://YOUR-IP:3001` in your browser
2. **Configure API Key**: 
   - Go to Configuration tab
   - Enter your Anthropic API key
   - Click Save
3. **Upload Transcripts**:
   - Go to Transcripts tab
   - Upload meeting transcripts (.txt, .doc, .docx, .pdf)
   - System automatically extracts commitments and action items
4. **Generate Daily Brief**:
   - Go to Dashboard tab
   - Click "Generate Brief"
   - Get your top 3 priorities, deliverables, and commitments in 10 seconds

## Updating

### Unraid

1. Go to Docker tab
2. Click the container name
3. Click **Force Update**
4. Apply changes

### Docker Command Line

```bash
docker pull ghcr.io/joshuaseidel/plaud-ai-chief-of-staff:latest
docker stop ai-chief-of-staff
docker rm ai-chief-of-staff
# Run the docker run command again (see installation section)
```

## Backup

Your data is stored in two locations:

- `/app/data` - SQLite database
- `/app/uploads` - Uploaded transcripts

**Backup on Unraid:**
```bash
tar -czf ai-chief-backup-$(date +%Y%m%d).tar.gz \
  /mnt/user/appdata/ai-chief-of-staff/data \
  /mnt/user/appdata/ai-chief-of-staff/uploads
```

**Restore:**
```bash
tar -xzf ai-chief-backup-YYYYMMDD.tar.gz -C /mnt/user/appdata/
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs ai-chief-of-staff

# Common issues:
# - Port 3001 already in use
# - Missing ANTHROPIC_API_KEY environment variable
# - Volume permission issues
```

### Cannot Access Web Interface

- Verify container is running: `docker ps | grep ai-chief`
- Check port is accessible: `curl http://localhost:3001/api/health`
- Verify firewall settings on your server

### API Key Issues

- Get key from https://console.anthropic.com/
- Key should start with `sk-ant-`
- Set as environment variable in Docker container settings

### Reset Database

```bash
# Stop container
docker stop ai-chief-of-staff

# Remove database file
rm /mnt/user/appdata/ai-chief-of-staff/data/ai-chief-of-staff.db

# Restart container
docker start ai-chief-of-staff
```

## Roadmap

- [ ] Email forwarding webhook for automatic email ingestion
- [ ] Commitment tracking with overdue notifications
- [ ] Weekly report generator
- [ ] Pattern detection across meetings
- [ ] Risk flagging for unaddressed items

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/JoshuaSeidel/plaud-ai-chief-of-staff).

---

**Built with ❤️ for productivity**
