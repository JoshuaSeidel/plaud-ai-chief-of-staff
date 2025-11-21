#!/bin/bash

# Test script for all-in-one container

echo "🧪 Testing AI Chief of Staff All-in-One Container..."
echo ""

# Check if container is running
if ! docker ps | grep -q ai-chief-of-staff; then
    echo "❌ Container is not running!"
    echo "Start it with: ./build-single.sh"
    exit 1
fi

echo "✅ Container is running"
echo ""

# Test API health endpoint
echo "Testing API health endpoint..."
response=$(curl -s http://localhost:3001/api/health)
if echo "$response" | grep -q "ok"; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    echo "Response: $response"
    exit 1
fi

echo ""

# Test if frontend is served
echo "Testing frontend static files..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$response" = "200" ]; then
    echo "✅ Frontend is being served"
else
    echo "❌ Frontend not accessible (HTTP $response)"
    exit 1
fi

echo ""

# Test API endpoints
echo "Testing API endpoints..."

# Test config endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/config)
if [ "$response" = "200" ]; then
    echo "✅ Config API working"
else
    echo "⚠️  Config API returned HTTP $response"
fi

# Test transcripts endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/transcripts)
if [ "$response" = "200" ]; then
    echo "✅ Transcripts API working"
else
    echo "⚠️  Transcripts API returned HTTP $response"
fi

echo ""

# Check volumes
echo "Checking data volumes..."
if docker exec ai-chief-of-staff test -d /app/data; then
    echo "✅ Data directory exists"
else
    echo "❌ Data directory missing"
fi

if docker exec ai-chief-of-staff test -d /app/uploads; then
    echo "✅ Uploads directory exists"
else
    echo "❌ Uploads directory missing"
fi

echo ""

# Check environment variables
echo "Checking environment variables..."
if docker exec ai-chief-of-staff printenv | grep -q ANTHROPIC_API_KEY; then
    echo "✅ ANTHROPIC_API_KEY is set"
else
    echo "⚠️  ANTHROPIC_API_KEY is not set"
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "Access your application at: http://localhost:3001"
echo ""
