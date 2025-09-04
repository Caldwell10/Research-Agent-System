#!/bin/bash

# Simple deployment script for the Lambda fix
echo "🔧 Deploying Lambda function with API path fix..."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo "❌ GROQ_API_KEY is not set"
    echo "Please add your API key to the .env file:"
    echo "GROQ_API_KEY=your-actual-key-here"
    exit 1
fi

echo "📦 Building SAM application..."
sam build

echo "🚀 Deploying to AWS Lambda..."
sam deploy --parameter-overrides "GroqApiKey=$GROQ_API_KEY"

echo "🧪 Testing the API..."
curl -s https://2xboaqq9o0.execute-api.us-east-1.amazonaws.com/Prod/api/health

echo ""
echo "✅ Deployment complete! Test the frontend now."