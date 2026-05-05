# Next.js + Laravel API Deployment Guide

## Environment Configuration

### Development (.env.local)
```bash
# Development Environment Configuration
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1/v1
NEXT_PUBLIC_GOOGLE_OAUTH_API_BASE_URL=http://127.0.0.1:8000/api/v1/v1
```

### Production (.env.production)
```bash
# Production Environment Configuration
NEXT_PUBLIC_API_BASE_URL=https://larawans.com/api/v1/v1
NEXT_PUBLIC_GOOGLE_OAUTH_API_BASE_URL=https://larawans.com/api/v1/v1
```

## API Configuration

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- API Base: `http://127.0.0.1:8000/api/v1/v1`

### Production
- Frontend: `https://your-domain.com`
- Backend: `https://larawans.com`
- API Base: `https://larawans.com/api/v1/v1`

## Deployment Steps

### 1. Set Production Environment
```bash
# Copy production environment variables
cp .env.production .env.local

# Or set directly in hosting platform
NEXT_PUBLIC_API_BASE_URL=https://larawans.com/api/v1/v1
NEXT_PUBLIC_GOOGLE_OAUTH_API_BASE_URL=https://larawans.com/api/v1/v1
```

### 2. Build and Deploy
```bash
# Build for production
npm run build

# Deploy to hosting platform
# AWS Amplify, Vercel, Netlify, etc.
```

### 3. Verify API Requests
- Check browser network tab
- Requests should go to: `https://larawans.com/api/v1/v1/*`
- No requests to localhost in production

## API Call Examples

### Before (Proxy-based)
```javascript
// Uses /laravel-api proxy
fetch('/laravel-api/stores?limit=10')
```

### After (Direct API)
```javascript
// Uses environment variable
fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores?limit=10`)
```

## Troubleshooting

### Issue: API requests going to localhost in production
**Solution**: Ensure `NEXT_PUBLIC_API_BASE_URL` is set in production environment

### Issue: CORS errors
**Solution**: Configure CORS on Laravel backend to allow frontend domain

### Issue: 404 errors on API endpoints
**Solution**: Verify API base URL and endpoint paths match Laravel routes

## Environment Variables Reference

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000/api/v1/v1` | `https://larawans.com/api/v1/v1` | Main API base URL |
| `NEXT_PUBLIC_GOOGLE_OAUTH_API_BASE_URL` | `http://127.0.0.1:8000/api/v1/v1` | `https://larawans.com/api/v1/v1` | Google OAuth API URL |
