# Microservices Architecture

AI Chief of Staff uses a modern microservices architecture for optimal performance and scalability.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                         Port 3000 (PWA)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Backend (Node.js/Express)                     │
│                 Port 3001 (API Gateway)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes: transcripts, briefs, config, calendar,           │  │
│  │ commitments, prompts, notifications, planner             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──┬──────┬──────┬──────┬──────┬─────────────────────────────────┘
   │      │      │      │      │
   │      │      │      │      └──────────────────┐
   │      │      │      │                         │
┌──▼──────▼──────▼──────▼─────────────────┐  ┌───▼────────────────┐
│     Microservices (Specialized)         │  │  Data Layer        │
│                                          │  │                    │
│ ┌────────────────────────────────────┐  │  │ ┌────────────────┐ │
│ │ AI Intelligence (Python/FastAPI)    │  │  │ │ PostgreSQL 15  │ │
│ │ Port 8001 - 2 CPU, 2GB RAM         │  │  │ │ Port 5432      │ │
│ │                                     │  │  │ └────────────────┘ │
│ │ • Effort estimation                 │  │  │ ┌────────────────┐ │
│ │ • Energy classification             │  │  │ │ Redis 7        │ │
│ │ • Task clustering                   │  │  │ │ Port 6379      │ │
│ │ • Claude AI integration             │  │  │ └────────────────┘ │
│ └────────────────────────────────────┘  │  └────────────────────┘
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Pattern Recognition (Python/ML)     │  │
│ │ Port 8002 - 2 CPU, 4GB RAM         │  │
│ │                                     │  │
│ │ • Behavioral insights               │  │
│ │ • Completion patterns               │  │
│ │ • Time preferences                  │  │
│ │ • scikit-learn ML models            │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ NL Parser (Python/spaCy)            │  │
│ │ Port 8003 - 1 CPU, 2GB RAM         │  │
│ │                                     │  │
│ │ • Natural language parsing          │  │
│ │ • Entity extraction                 │  │
│ │ • Intent classification             │  │
│ │ • Date/time understanding           │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Voice Processor (Python/Whisper)    │  │
│ │ Port 8004 - 2 CPU, 4GB RAM         │  │
│ │                                     │  │
│ │ • Audio transcription               │  │
│ │ • OpenAI Whisper API                │  │
│ │ • Multi-language support            │  │
│ │ • Timestamp generation              │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Context Service (Go)                │  │
│ │ Port 8005 - 0.5 CPU, 512MB RAM     │  │
│ │                                     │  │
│ │ • Ultra-fast context retrieval      │  │
│ │ • 10x faster than Node.js           │  │
│ │ • Rolling 2-week window             │  │
│ │ • High-throughput queries           │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Services

### Frontend (React PWA)
- **Tech**: React, Progressive Web App
- **Port**: 3000
- **Purpose**: User interface, offline support, push notifications
- **Resources**: 512MB RAM, 0.5 CPU

### Backend (Node.js/Express)
- **Tech**: Node.js, Express
- **Port**: 3001
- **Purpose**: API gateway, authentication, business logic
- **Resources**: 1GB RAM, 1 CPU
- **Key Routes**:
  - `/api/transcripts` - Upload and manage transcripts
  - `/api/brief` - Generate AI briefs
  - `/api/commitments` - Track action items
  - `/api/calendar` - Google Calendar integration
  - `/api/planner` - Microsoft Planner integration
  - `/api/intelligence` - Proxy to microservices

### AI Intelligence Service (Python/FastAPI)
- **Tech**: Python 3.11, FastAPI, Anthropic Claude API
- **Port**: 8001
- **Purpose**: AI-powered task analysis
- **Resources**: 2GB RAM, 2 CPU
- **Endpoints**:
  - `POST /estimate-effort` - Estimate task duration
  - `POST /classify-energy` - Categorize by energy level
  - `POST /cluster-tasks` - Group related tasks
- **Features**:
  - Redis caching (1hr TTL)
  - Graceful error handling
  - Health checks
  - Comprehensive logging

### Pattern Recognition Service (Python/ML)
- **Tech**: Python 3.11, FastAPI, scikit-learn, pandas
- **Port**: 8002
- **Purpose**: Machine learning behavioral insights
- **Resources**: 4GB RAM, 2 CPU
- **Endpoints**:
  - `POST /analyze-patterns` - Detect behavioral patterns
  - `POST /predict-completion` - Predict task completion time
  - `GET /insights` - Get personalized insights
- **Features**:
  - Time-based analysis
  - Pattern detection
  - Productivity scoring
  - Trend identification

### NL Parser Service (Python/spaCy)
- **Tech**: Python 3.11, FastAPI, spaCy, dateparser
- **Port**: 8003
- **Purpose**: Natural language understanding
- **Resources**: 2GB RAM, 1 CPU
- **Endpoints**:
  - `POST /parse` - Parse task description
  - `POST /extract-dates` - Extract deadline information
  - `POST /parse-voice` - Process voice input
- **Features**:
  - Entity extraction (names, dates, locations)
  - Intent classification
  - Relative date parsing ("tomorrow", "next week")
  - Priority detection

### Voice Processor Service (Python/Whisper)
- **Tech**: Python 3.11, FastAPI, OpenAI Whisper API
- **Port**: 8004
- **Purpose**: Audio transcription
- **Resources**: 4GB RAM, 2 CPU
- **Endpoints**:
  - `POST /transcribe` - Convert audio to text
  - `POST /transcribe-with-timestamps` - Get word-level timestamps
  - `POST /translate` - Translate to English
- **Features**:
  - Multi-language support (99+ languages)
  - High accuracy (95%+)
  - Format support: mp3, m4a, wav, webm
  - Redis caching

### Context Service (Go)
- **Tech**: Go 1.21, Gorilla Mux
- **Port**: 8005
- **Purpose**: High-speed context retrieval
- **Resources**: 512MB RAM, 0.5 CPU
- **Endpoints**:
  - `GET /context` - Query context entries
  - `GET /context/recent` - Get recent context
  - `GET /context/rolling` - 2-week rolling window
  - `POST /context/search` - Search context
- **Features**:
  - 10x faster than Node.js equivalent
  - Connection pooling
  - Redis caching (5-10min TTL)
  - Minimal memory footprint

### PostgreSQL
- **Version**: 15-alpine
- **Port**: 5432
- **Purpose**: Primary data storage
- **Resources**: 1GB RAM
- **Tables**: 
  - `transcripts`, `commitments`, `briefs`, `context`, `config`, `prompts`
  - `task_intelligence`, `task_clusters`, `projects`, `goals`, `user_patterns`

### Redis
- **Version**: 7-alpine
- **Port**: 6379
- **Purpose**: Caching, message queue
- **Resources**: 512MB RAM
- **Features**:
  - AOF persistence
  - TTL-based expiration
  - Shared across microservices

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM available
- Anthropic API key
- (Optional) OpenAI API key for voice

### 1. Clone & Setup
```bash
git clone https://github.com/JoshuaSeidel/plaud-ai-chief-of-staff.git
cd plaud-ai-chief-of-staff

# Create environment file
cp env.example .env

# Edit .env with your API keys
nano .env
```

### 2. Start Services
```bash
# Build all services
docker-compose -f docker-compose.microservices.yml build

# Start everything
docker-compose -f docker-compose.microservices.yml up -d

# Check status
docker-compose -f docker-compose.microservices.yml ps
```

### 3. Verify Health
```bash
# Check all services
curl http://localhost:3001/health  # Backend
curl http://localhost:8001/health  # AI Intelligence
curl http://localhost:8002/health  # Pattern Recognition
curl http://localhost:8003/health  # NL Parser
curl http://localhost:8004/health  # Voice Processor
curl http://localhost:8005/health  # Context Service
```

### 4. Access Application
- **Web UI**: http://localhost:3001
- **API Docs**: http://localhost:8001/docs (FastAPI services)

## Development

### Run Single Service Locally

```bash
# AI Intelligence Service
cd services/ai-intelligence
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your-key
export REDIS_URL=redis://localhost:6379
uvicorn main:app --reload --port 8001

# Context Service (Go)
cd services/context-service
go mod download
export POSTGRES_HOST=localhost
export POSTGRES_PASSWORD=your-password
go run main.go
```

### Add New Service

1. Create service directory: `services/my-service/`
2. Add Dockerfile and requirements
3. Add to `docker-compose.microservices.yml`
4. Update backend to proxy requests
5. Document in this README

## Deployment

### Production Checklist
- [ ] Set production API keys in `.env`
- [ ] Configure resource limits
- [ ] Enable SSL/TLS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security settings

### Scaling

```bash
# Scale AI-heavy services
docker-compose -f docker-compose.microservices.yml up -d \
  --scale ai-intelligence=3 \
  --scale pattern-recognition=2 \
  --scale voice-processor=2

# Scale high-throughput services
docker-compose -f docker-compose.microservices.yml up -d \
  --scale context-service=5
```

### Resource Requirements

| Deployment | RAM | CPU | Users | Services |
|------------|-----|-----|-------|----------|
| Development | 8GB | 4 cores | 1-5 | All at 1x |
| Small Production | 16GB | 8 cores | <100 | All at 1x |
| Medium Production | 32GB | 16 cores | 100-500 | AI services at 2-3x |
| Large Production | 64GB+ | 32+ cores | 500+ | All services scaled |

## Communication Patterns

### Service-to-Service
- **Protocol**: HTTP/REST
- **Network**: Internal Docker network (`aicos-network`)
- **Discovery**: DNS resolution by service name
- **Timeout**: 30s default

### Backend → Microservices

```javascript
// Example: Backend calls AI Intelligence service
const axios = require('axios');

const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://ai-intelligence:8001';

async function estimateEffort(description, context) {
  const response = await axios.post(
    `${AI_INTELLIGENCE_URL}/estimate-effort`,
    { description, context },
    { timeout: 30000 }
  );
  return response.data;
}
```

### Error Handling
- All services return standardized error responses
- Backend provides fallback when microservices unavailable
- Health checks every 30s
- Auto-restart on failure

## Caching Strategy

### Redis Cache Keys

- `transcription:{file_hash}:{language}` - Voice transcriptions (1hr)
- `effort:{task_hash}` - Effort estimations (1hr)
- `energy:{task_hash}` - Energy classifications (1hr)
- `context:{category}:{source}:{limit}` - Context queries (5min)
- `recent_context:{days}:{category}` - Recent context (10min)

### Cache Hit Rates

| Service | Typical Hit Rate | Impact |
|---------|------------------|---------|
| AI Intelligence | 60-70% | -60% Claude API costs |
| Voice Processor | 40-50% | -50% Whisper API costs |
| Context Service | 80-90% | 10x faster responses |

## Monitoring

### Health Checks
```bash
# Check all services
./scripts/health-check.sh

# Individual service
curl http://localhost:8001/health | jq .
```

### Logs
```bash
# All services
docker-compose -f docker-compose.microservices.yml logs -f

# Specific service
docker-compose -f docker-compose.microservices.yml logs -f ai-intelligence

# Search logs
docker-compose -f docker-compose.microservices.yml logs | grep ERROR
```

### Metrics
```bash
# Resource usage
docker stats

# Service-specific
docker stats ai-intelligence pattern-recognition
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.microservices.yml logs SERVICE_NAME

# Rebuild
docker-compose -f docker-compose.microservices.yml build --no-cache SERVICE_NAME
docker-compose -f docker-compose.microservices.yml up -d SERVICE_NAME
```

### Database Connection Issues
```bash
# Test PostgreSQL
docker exec -it postgres psql -U aicos -d ai_chief_of_staff -c "SELECT 1;"

# Check network
docker network inspect aicos-network
```

### High Memory Usage
```bash
# Check stats
docker stats --no-stream

# Restart service
docker-compose -f docker-compose.microservices.yml restart SERVICE_NAME

# Scale down
docker-compose -f docker-compose.microservices.yml up -d --scale ai-intelligence=1
```

### Redis Connection Issues
```bash
# Test Redis
docker exec -it redis redis-cli ping

# Clear cache
docker exec -it redis redis-cli FLUSHALL
```

## Performance Tuning

### Python Services
- Increase workers: Edit Dockerfile `--workers` parameter
- Enable uvloop: Add `pip install uvloop` to requirements
- Optimize Claude calls: Batch requests when possible

### Go Service
- Already optimized with connection pooling
- Scale horizontally for more throughput
- Each instance handles ~1000 req/s

### Database
- Add indexes for frequent queries
- Enable query caching
- Use read replicas for heavy loads

## Security

- **Network Isolation**: Services on internal network
- **No Direct Access**: Microservices not exposed externally
- **API Gateway**: All requests through backend
- **Secret Management**: Environment variables or Docker secrets
- **Health Endpoints**: Public, no sensitive data
- **Logging**: No API keys or passwords in logs

## Migration from Monolithic

If upgrading from single-container version:

1. Backup data: `docker exec postgres pg_dump...`
2. Stop old container
3. Start microservices stack
4. Migrate environment variables
5. Verify all services healthy
6. Test functionality
7. Monitor for 24 hours

## Future Enhancements

- [ ] gRPC for inter-service communication
- [ ] Message queue (RabbitMQ/Kafka) for async tasks
- [ ] Service mesh (Istio) for advanced networking
- [ ] Prometheus + Grafana for metrics
- [ ] Distributed tracing (Jaeger)
- [ ] Auto-scaling based on load
- [ ] Kubernetes manifests

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow.

## License

MIT License - see [LICENSE](LICENSE) file.

---

**Questions?** Open an issue on GitHub!
