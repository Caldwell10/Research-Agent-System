# 🚀 Deployment Guide for Multi-Agent Research Tool

This guide provides comprehensive instructions for deploying the Multi-Agent Research Tool across different platforms and environments.

## 📋 Prerequisites

- **Groq API Key**: Required for LLM functionality
- **Git repository**: Your code should be in a Git repository
- **Domain name** (optional): For custom domains

## 🎯 Quick Deployment Options

### 1. Railway (Recommended for Beginners)

Railway is perfect for full-stack applications with minimal configuration.

#### Steps:

1. **Sign up at [Railway](https://railway.app)**

2. **Connect your GitHub repository**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Set environment variables**
   ```
   GROQ_API_KEY=your_groq_api_key_here
   MAX_PAPERS=10
   CORS_ORIGINS=https://your-railway-domain.railway.app
   ENVIRONMENT=production
   ```

4. **Deploy**
   - Railway will automatically detect and build your application
   - Your app will be available at: `https://your-app-name.railway.app`

#### Railway Configuration Files:
- `railway.json` - Railway-specific configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Process definition

**Cost**: $5/month for hobby plan with reasonable usage limits.

---

### 2. Vercel + Railway (Frontend + Backend Separation)

Deploy frontend on Vercel and backend on Railway for optimal performance.

#### Frontend on Vercel:

1. **Sign up at [Vercel](https://vercel.com)**

2. **Import your repository**
   - Click "New Project"
   - Import from GitHub
   - Set root directory to `frontend`

3. **Configure build settings**
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm ci
   ```

4. **Set environment variables**
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_WS_URL=wss://your-backend.railway.app
   ```

#### Backend on Railway:
Follow Railway steps above, but update CORS origins to include your Vercel domain.

---

### 3. Docker Deployment

#### Local Docker Deployment:

1. **Clone and configure**
   ```bash
   git clone <your-repo>
   cd multi-agent-research-tool
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Build and run**
   ```bash
   docker-compose up --build
   ```

3. **Access your app**
   - App: http://localhost:8000
   - API docs: http://localhost:8000/docs

#### Production Docker Deployment:

1. **Build production image**
   ```bash
   docker build -t multi-agent-research .
   ```

2. **Run with environment variables**
   ```bash
   docker run -d \
     --name research-app \
     -p 8000:8000 \
     -e GROQ_API_KEY=your_api_key \
     -e ENVIRONMENT=production \
     -e CORS_ORIGINS=https://yourdomain.com \
     multi-agent-research
   ```

---

### 4. DigitalOcean App Platform

1. **Create account at [DigitalOcean](https://digitalocean.com)**

2. **Create new app**
   - Connect GitHub repository
   - Detect as "Web Service"

3. **Configure app**
   ```yaml
   name: multi-agent-research
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/your-repo
       branch: main
     run_command: uvicorn backend_server:app --host 0.0.0.0 --port $PORT
     environment_slug: python
     instance_count: 1
     instance_size_slug: basic-xxs
     routes:
     - path: /
   ```

4. **Set environment variables** in the DigitalOcean dashboard

**Cost**: $5/month for basic plan.

---

### 5. AWS Deployment (Advanced)

#### Using AWS App Runner:

1. **Create ECR repository**
   ```bash
   aws ecr create-repository --repository-name multi-agent-research
   ```

2. **Build and push image**
   ```bash
   docker build -t multi-agent-research .
   docker tag multi-agent-research:latest <account>.dkr.ecr.<region>.amazonaws.com/multi-agent-research:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/multi-agent-research:latest
   ```

3. **Create App Runner service** through AWS Console
   - Source: Container registry
   - Set environment variables
   - Configure auto-scaling

---

## 🔧 Environment Variables

### Required Variables:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### Optional Variables:
```env
# Research Configuration
MAX_PAPERS=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO

# CORS (important for production)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Frontend Environment Variables:
```env
VITE_API_URL=https://your-backend-domain.com
VITE_WS_URL=wss://your-backend-domain.com
VITE_APP_NAME=Multi-Agent Research Tool
```

---

## 🔒 Security Considerations

### 1. API Keys
- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly

### 2. CORS Configuration
- Set specific origins in production
- Don't use wildcard (`*`) in production

### 3. HTTPS
- Always use HTTPS in production
- Most platforms provide SSL certificates automatically

### 4. Rate Limiting
- Configure appropriate rate limits
- Monitor API usage

---

## 📊 Monitoring & Maintenance

### Health Checks
Your app includes a health check endpoint at `/health`:
```bash
curl https://your-domain.com/health
```

### Logs
Most platforms provide built-in logging:
- **Railway**: View logs in dashboard
- **Vercel**: Function logs in dashboard
- **Docker**: `docker logs container-name`

### Monitoring Tools
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for user session replay
- **Uptime Robot** for uptime monitoring

---

## 🔄 CI/CD Pipeline

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) provides:

1. **Automated testing** on pull requests
2. **Automatic deployment** on main branch pushes
3. **Frontend and backend testing**
4. **Build verification**

### Setup:
1. Add these secrets to your GitHub repository:
   - `RAILWAY_TOKEN` (if using Railway)
   - `GROQ_API_KEY`

2. Update the workflow file with your deployment target

---

## 🎛️ Platform-Specific Notes

### Railway
- ✅ Automatic builds from Git
- ✅ Built-in metrics and logs
- ✅ Easy environment variable management
- ⚠️ 500GB bandwidth limit on free tier

### Vercel (Frontend)
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Preview deployments for PRs
- ⚠️ Function timeout limits

### DigitalOcean
- ✅ Simple pricing
- ✅ Good documentation
- ✅ Integrated with GitHub
- ⚠️ Less automation than Railway

### AWS
- ✅ Highly scalable
- ✅ Many integration options
- ✅ Enterprise-grade features
- ⚠️ Complex setup and pricing

---

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Check build logs
   # Ensure all dependencies are in requirements.txt
   # Verify Node.js version compatibility
   ```

2. **CORS Errors**
   ```bash
   # Update CORS_ORIGINS environment variable
   # Include both HTTP and HTTPS variants
   # Check WebSocket origins
   ```

3. **API Key Issues**
   ```bash
   # Verify GROQ_API_KEY is set correctly
   # Check for whitespace or special characters
   # Ensure key has proper permissions
   ```

4. **WebSocket Connection Failures**
   ```bash
   # Ensure platform supports WebSockets
   # Check WSS vs WS protocol
   # Verify CORS for WebSocket connections
   ```

### Debug Mode:
Set `LOG_LEVEL=debug` for detailed logging.

---

## 💰 Cost Estimates

| Platform | Monthly Cost | Features |
|----------|-------------|----------|
| Railway | $5+ | Full-stack, auto-scaling |
| Vercel + Railway | $5+ | Optimal performance split |
| DigitalOcean | $5+ | Simple, predictable pricing |
| AWS | $10+ | Enterprise features, complex pricing |
| Self-hosted VPS | $5+ | Full control, more maintenance |

---

## 🚀 Next Steps After Deployment

1. **Set up monitoring** and alerts
2. **Configure backups** for user data
3. **Add analytics** to track usage
4. **Implement caching** for better performance
5. **Set up staging environment** for testing

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review platform-specific documentation
3. Check GitHub Issues for similar problems
4. Create a new issue with detailed error logs

---

**🎉 Congratulations! Your Multi-Agent Research Tool is now deployed and ready for users!**