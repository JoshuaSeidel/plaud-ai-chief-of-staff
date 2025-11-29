"""
Voice Processor Service
Handles audio transcription using OpenAI Whisper API
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import logging
import tempfile
from typing import Optional
import redis
import hashlib
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Voice Processor Service",
    description="Audio transcription service using OpenAI Whisper",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.warning("OPENAI_API_KEY not set - transcription will not work")
else:
    openai.api_key = openai_api_key

# Initialize Redis client
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
try:
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()
    logger.info(f"Connected to Redis at {redis_url}")
except Exception as e:
    logger.warning(f"Could not connect to Redis: {e}")
    redis_client = None

# Cache TTL (1 hour for transcriptions)
CACHE_TTL = 3600

class TranscriptionRequest(BaseModel):
    language: Optional[str] = None
    prompt: Optional[str] = None
    temperature: Optional[float] = 0.0
    
class TranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None
    cached: bool = False

class SpeakerDiarizationResponse(BaseModel):
    segments: list
    speakers: list
    full_text: str

def get_file_hash(file_content: bytes) -> str:
    """Generate hash of file content for caching"""
    return hashlib.md5(file_content).hexdigest()

def get_cached_transcription(cache_key: str) -> Optional[dict]:
    """Get cached transcription result"""
    if not redis_client:
        return None
    
    try:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info(f"Cache hit for key: {cache_key}")
            return json.loads(cached)
    except Exception as e:
        logger.error(f"Error reading from cache: {e}")
    
    return None

def cache_transcription(cache_key: str, result: dict):
    """Cache transcription result"""
    if not redis_client:
        return
    
    try:
        redis_client.setex(
            cache_key,
            CACHE_TTL,
            json.dumps(result)
        )
        logger.info(f"Cached result for key: {cache_key}")
    except Exception as e:
        logger.error(f"Error writing to cache: {e}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "voice-processor",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health = {
        "status": "healthy",
        "service": "voice-processor",
        "version": "1.0.0",
        "openai_configured": bool(openai_api_key),
        "redis_connected": False
    }
    
    # Check Redis connection
    if redis_client:
        try:
            redis_client.ping()
            health["redis_connected"] = True
        except:
            health["status"] = "degraded"
    
    return health

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    prompt: Optional[str] = None,
    temperature: float = 0.0
):
    """
    Transcribe audio file using OpenAI Whisper
    
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    Max file size: 25MB
    """
    
    if not openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured"
        )
    
    # Read file content
    try:
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        
        if file_size_mb > 25:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size_mb:.2f}MB (max 25MB)"
            )
        
        logger.info(f"Processing audio file: {file.filename} ({file_size_mb:.2f}MB)")
        
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Check cache
    file_hash = get_file_hash(file_content)
    cache_key = f"transcription:{file_hash}:{language}:{temperature}"
    
    cached_result = get_cached_transcription(cache_key)
    if cached_result:
        return TranscriptionResponse(**cached_result, cached=True)
    
    # Save to temporary file for Whisper API
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        # Transcribe with Whisper
        with open(tmp_file_path, "rb") as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                prompt=prompt,
                temperature=temperature,
                response_format="verbose_json"
            )
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        # Build response
        result = {
            "text": transcript.text,
            "language": getattr(transcript, 'language', None),
            "duration": getattr(transcript, 'duration', None),
            "cached": False
        }
        
        # Cache result
        cache_transcription(cache_key, result)
        
        logger.info(f"Transcription completed: {len(transcript.text)} characters")
        
        return TranscriptionResponse(**result)
        
    except openai.OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )

@app.post("/transcribe-with-timestamps")
async def transcribe_with_timestamps(
    file: UploadFile = File(...),
    language: Optional[str] = None
):
    """
    Transcribe audio with word-level timestamps
    Useful for syncing transcripts with video/audio playback
    """
    
    if not openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured"
        )
    
    try:
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        
        if file_size_mb > 25:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size_mb:.2f}MB (max 25MB)"
            )
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        # Transcribe with timestamps
        with open(tmp_file_path, "rb") as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        # Clean up
        os.unlink(tmp_file_path)
        
        logger.info(f"Transcription with timestamps completed")
        
        return {
            "text": transcript.text,
            "language": getattr(transcript, 'language', None),
            "duration": getattr(transcript, 'duration', None),
            "words": getattr(transcript, 'words', [])
        }
        
    except openai.OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )

@app.post("/translate")
async def translate_audio(
    file: UploadFile = File(...),
    prompt: Optional[str] = None
):
    """
    Translate audio to English using Whisper
    Works with any language input
    """
    
    if not openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured"
        )
    
    try:
        file_content = await file.read()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        # Translate with Whisper
        with open(tmp_file_path, "rb") as audio_file:
            translation = openai.audio.translations.create(
                model="whisper-1",
                file=audio_file,
                prompt=prompt
            )
        
        # Clean up
        os.unlink(tmp_file_path)
        
        logger.info(f"Translation completed: {len(translation.text)} characters")
        
        return {
            "text": translation.text,
            "target_language": "en"
        }
        
    except openai.OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error translating audio: {e}")
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Error translating audio: {str(e)}"
        )

@app.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported audio formats"""
    return {
        "formats": ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
        "max_file_size_mb": 25,
        "models": ["whisper-1"],
        "languages": "all (automatic detection)",
        "features": [
            "transcription",
            "translation",
            "timestamps",
            "language_detection"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
