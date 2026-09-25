# Speech Therapy App - Render Deployment Guide

## Prerequisites
- GitHub account (push code to GitHub)
- Render account (https://render.com)
- Git installed on your machine

## Step 1: Push to GitHub

```powershell
cd c:\Users\JOSHIKA S\Downloads\speechhh

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Speech therapy app ready for deployment"

# Add remote (replace YOUR_USERNAME and YOUR_REPO with your values)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git branch -M main
git push -u origin main
```

## Step 2: Create Render Services

### Option A: Using render.yaml (Recommended)
1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint" 
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create both services
5. Configure environment variables:
   - Backend: `JWT_SECRET_KEY` (generate a secure random string)
   - Frontend: `VITE_API_URL` (will be auto-populated)

### Option B: Manual Service Creation

#### Backend Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `speechcare-backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt` (in Speech_Backend)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `Speech_Backend`
   - **Plan**: Free tier OK for testing
5. Add Environment Variables:
   ```
   DATABASE_URL = sqlite:///./speech_therapy.db
   JWT_SECRET_KEY = [generate random secret - see below]
   ENVIRONMENT = production
   ```
6. Deploy

#### Frontend Service
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `speechcare-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `speech-frontend/dist`
   - **Root Directory**: `.` (root)
4. Add Environment Variables:
   ```
   VITE_API_URL = https://speechcare-backend.onrender.com
   ```
5. Deploy

## Step 3: Generate JWT Secret Key

Run this in PowerShell to generate a secure random key:

```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString())) | Select-Object -First 64
```

Or use Python:
```python
import secrets
import base64
key = base64.b64encode(secrets.token_bytes(32)).decode()
print(key)
```

## Step 4: Configure CORS & API URLs

### Backend URLs
- Backend: `https://speechcare-backend.onrender.com`
- API Docs: `https://speechcare-backend.onrender.com/docs`

### Frontend URLs
- Frontend: `https://speechcare-frontend.onrender.com`
- The frontend will connect to the backend via `VITE_API_URL` environment variable

## Step 5: Test Deployment

1. Visit your frontend: `https://speechcare-frontend.onrender.com`
2. Register a test account
3. Check backend logs in Render dashboard for any errors
4. Test practice, achievements, and chatbot features

## Troubleshooting

### Backend Issues
1. Check logs: Render Dashboard → Your Service → Logs
2. Common errors:
   - `ModuleNotFoundError`: requirements.txt missing dependencies
   - `Database locked`: SQLite concurrency issue (upgrade to PostgreSQL for production)
   - `JWT verification failed`: JWT_SECRET_KEY not set or incorrect

### Frontend Issues
1. `CORS error`: Check CORS allowed origins in backend
2. `API not found`: Verify `VITE_API_URL` matches backend URL
3. `Blank page`: Check browser console for build errors

### Build Failures
1. Clear Render cache: Render Dashboard → Settings → Clear Build Cache
2. Check build logs for dependency issues
3. Verify all environment variables are set

## Production Recommendations

### Database
- Current: SQLite (good for testing)
- Production: Migrate to PostgreSQL
  ```
  # In Render dashboard, provision PostgreSQL
  DATABASE_URL = postgres://user:password@host:port/dbname
  ```

### Security
1. Change `JWT_SECRET_KEY` to a strong random value
2. Enable HTTPS (automatic on Render)
3. Add rate limiting
4. Enable email verification on registration

### Performance
1. Enable caching on frontend
2. Add CDN (Render provides this)
3. Monitor error logs

### Monitoring
- Enable Render's health checks
- Set up email notifications for errors
- Monitor database performance

## Environment Variables Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | `sqlite:///./speech_therapy.db` | Use PostgreSQL for production |
| `JWT_SECRET_KEY` | Yes | - | Generate with secrets module |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | JWT token expiration |
| `ENVIRONMENT` | No | development | Set to "production" on Render |
| `VITE_API_URL` | Yes (Frontend) | `http://localhost:8000` | Backend URL for API calls |

## CI/CD

Render automatically deploys when you push to main branch. To disable:
1. Go to Service Settings
2. Disable "Auto-Deploy"

## Scaling

Free tier:
- Spins down after 15 minutes of inactivity
- 0.5 CPU, 512 MB RAM

Paid tier:
- Keep services running 24/7
- More resources
- Better performance

## Support

For Render issues: https://render.com/docs
For app issues: Check logs and error messages in Render dashboard
