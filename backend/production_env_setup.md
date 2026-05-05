# Google OAuth Production Setup

## Backend .env Configuration

### For Local Development:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/v1/auth/google/callback
```

### For Production:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://larawans.com/api/v1/v1/auth/google/callback
```

### For AWS Amplify:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://main.d2euv5dilboqrn.amplifyapp.com/api/v1/v1/auth/google/callback
```

## Google Cloud Console Setup

### Required Redirect URIs:
1. **Local Development**: `http://localhost:8000/api/v1/v1/auth/google/callback`
2. **Production**: `https://larawans.com/api/v1/v1/auth/google/callback`
3. **Amplify**: `https://main.d2euv5dilboqrn.amplifyapp.com/api/v1/v1/auth/google/callback`

### Steps:
1. Go to Google Cloud Console
2. Select your project
3. Go to APIs & Services > Credentials
4. Edit your OAuth 2.0 Client ID
5. Add all three URIs to "Authorized redirect URIs"
6. Save changes

## Frontend Configuration

### Update API_BASE_URL for Production:
```typescript
// For Local Development
export const API_BASE_URL = 'http://localhost:8000/api/v1/v1';

// For Production
export const API_BASE_URL = 'https://larawans.com/api/v1/v1';
```

## Flow Summary

1. **Frontend** redirects to `${API_BASE_URL}/auth/google`
2. **Laravel** redirects to Google OAuth
3. **Google** redirects back to `${API_BASE_URL}/auth/google/callback`
4. **Laravel** handles callback, creates/updates user, generates JWT
5. **Laravel** redirects back to frontend with token
6. **Frontend** reads token from URL and stores it

## Common Mistakes to Avoid

1. **redirect_uri_mismatch**: Ensure Google Cloud Console has correct backend URI
2. **404 on callback**: Frontend should not handle callback, only backend
3. **CORS issues**: Ensure backend allows frontend origin
4. **Token not passed**: Ensure Laravel redirects with token in URL
5. **State mismatch**: Ensure Laravel uses state parameter correctly
