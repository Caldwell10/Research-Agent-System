#!/bin/bash

set -e

echo "🚀 Starting AWS Amplify + Lambda deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI and SAM CLI are installed
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}❌ AWS SAM CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed. Please install Node.js first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Deploy backend to Lambda
deploy_backend() {
    echo "🏗️  Building and deploying backend to Lambda..."
    
    echo -e "${GREEN}✅ Using API key from samconfig.toml${NC}"
    
    # Build SAM application
    echo "📦 Building SAM application..."
    sam build
    
    # Deploy SAM application
    echo "🚀 Deploying to AWS Lambda..."
    sam deploy --guided
    
    # Get the API endpoint
    API_URL=$(aws cloudformation describe-stacks --stack-name multi-agent-research-backend --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)
    
    if [ -n "$API_URL" ]; then
        echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
        echo -e "${YELLOW}API URL: $API_URL${NC}"
        
        # Update frontend environment
        update_frontend_env "$API_URL"
    else
        echo -e "${RED}❌ Failed to get API URL from deployment${NC}"
        exit 1
    fi
}

# Update frontend environment variables
update_frontend_env() {
    local api_url=$1
    echo "🔧 Updating frontend environment variables..."
    
    # Update .env.production with the actual API URL
    sed -i.bak "s|https://your-lambda-api-id.execute-api.us-east-1.amazonaws.com/prod|$api_url|g" frontend/.env.production
    
    # Note: WebSocket is not available in this setup, will be handled by polling
    echo -e "${YELLOW}⚠️  Note: WebSocket functionality is disabled in Lambda setup${NC}"
    echo -e "${YELLOW}   The frontend will use HTTP polling for real-time updates${NC}"
    
    echo -e "${GREEN}✅ Frontend environment updated${NC}"
}

# Deploy frontend to Amplify
deploy_frontend() {
    echo "🎨 Preparing frontend for Amplify deployment..."
    
    cd frontend
    
    # Install dependencies
    echo "📦 Installing frontend dependencies..."
    npm ci
    
    # Build the frontend
    echo "🏗️  Building frontend..."
    npm run build
    
    cd ..
    
    echo -e "${GREEN}✅ Frontend built successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps for Amplify:${NC}"
    echo "1. Go to AWS Amplify Console"
    echo "2. Connect your GitHub repository"
    echo "3. Use the amplify.yml file in the root directory"
    echo "4. The build will automatically use the updated environment variables"
    echo ""
}

# Main deployment flow
main() {
    echo "🌟 Multi-Agent Research Tool - AWS Deployment"
    echo "============================================"
    
    check_prerequisites
    
    echo ""
    echo "Choose deployment option:"
    echo "1) Deploy backend only (Lambda)"
    echo "2) Deploy frontend only (prepare for Amplify)"
    echo "3) Deploy both backend and frontend"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            deploy_backend
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_backend
            deploy_frontend
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed!${NC}"
    echo ""
    echo -e "${YELLOW}Important notes:${NC}"
    echo "• WebSocket functionality is replaced with HTTP polling in Lambda"
    echo "• Check CloudWatch logs for any issues: aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/'"
    echo "• Monitor costs in AWS Cost Explorer"
    echo "• The S3 bucket for vector storage has been created automatically"
}

# Run main function
main "$@"