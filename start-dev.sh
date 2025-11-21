#!/bin/bash

# AI Chief of Staff - Development Startup Script

echo "🚀 Starting AI Chief of Staff Application..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your API keys before proceeding."
    exit 1
fi

# Check if backend .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  No backend/.env file found. Creating from backend/.env.example..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file."
fi

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Create necessary directories
mkdir -p backend/uploads backend/data

echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting services..."
echo "  - Backend will run on http://localhost:3001"
echo "  - Frontend will run on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Start backend and frontend concurrently
trap 'kill $(jobs -p)' EXIT

cd backend && npm run dev &
cd frontend && npm start &

wait
