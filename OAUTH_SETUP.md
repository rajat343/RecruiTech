# Google OAuth Setup Guide for RecruiTech

This guide will walk you through setting up Google OAuth authentication for the RecruiTech platform.

## Prerequisites

-   A Google account
-   Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "RecruiTech")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type
3. Click "Create"
4. Fill in the required fields:
    - **App name**: RecruiTech
    - **User support email**: Your email address
    - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" screen, click "Add or Remove Scopes"
7. Add the following scopes:
    - `userinfo.email`
    - `userinfo.profile`
8. Click "Update" and then "Save and Continue"
9. On the "Test users" screen (optional for development):
    - Add test user emails if you want to restrict access during development
10. Click "Save and Continue"
11. Review your settings and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "RecruiTech Web Client")
5. Add Authorized JavaScript origins:
    - For development: `http://localhost:5173`
    - For production: Your frontend URL (e.g., `https://yourapp.com`)
6. Add Authorized redirect URIs:
    - For development: `http://localhost:4000/auth/google/callback`
    - For production: Your backend URL + `/auth/google/callback`
7. Click "Create"
8. A popup will show your Client ID and Client Secret
9. **Important**: Copy both values - you'll need them for your environment variables

## Step 5: Configure Backend Environment Variables

1. Navigate to your backend directory:

    ```bash
    cd backend
    ```

2. Create or update your `.env` file:

    ```env
    # Server Configuration
    PORT=4000
    NODE_ENV=development

    # Database Configuration
    MONGODB_URI=mongodb://localhost:27017/recruitech

    # JWT Configuration
    JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
    JWT_EXPIRES_IN=7d

    # Session Configuration
    SESSION_SECRET=your-super-secret-session-key-change-this-in-production

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

    # Frontend URL
    FRONTEND_URL=http://localhost:5173
    ```

3. Replace `your-google-client-id` and `your-google-client-secret` with the values from Step 4

## Step 6: Configure Frontend Environment Variables

1. Navigate to your frontend directory:

    ```bash
    cd frontend
    ```

2. Create a `.env` file (or `.env.local`):
    ```env
    VITE_API_URL=http://localhost:4000
    VITE_GRAPHQL_URL=http://localhost:4000/graphql
    ```

## Step 7: Test OAuth Flow

1. Start the backend server:

    ```bash
    cd backend
    npm run dev
    ```

2. In a new terminal, start the frontend:

    ```bash
    cd frontend
    npm run dev
    ```

3. Open your browser and go to `http://localhost:5173`
4. Click "Sign Up" or "Log In"
5. Select your role (Candidate or Recruiter)
6. Click "Continue with Google"
7. You should be redirected to Google's login page
8. After logging in, you should be redirected back to RecruiTech

## Troubleshooting

### Error: "redirect_uri_mismatch"

-   Make sure your redirect URI in Google Cloud Console exactly matches your backend callback URL
-   Check that there are no trailing slashes
-   Verify the protocol (http vs https)

### Error: "invalid_client"

-   Double-check your Client ID and Client Secret in the `.env` file
-   Make sure there are no extra spaces or quotes

### OAuth popup closes immediately

-   Check browser console for errors
-   Verify that `FRONTEND_URL` in backend `.env` matches your actual frontend URL
-   Check that session middleware is properly configured

### User profile not created

-   Check backend logs for errors
-   Verify that MongoDB is running
-   Check that the user schema includes `google_id` field

## Production Deployment

When deploying to production:

1. Update OAuth consent screen to "Production" status
2. Add production URLs to Authorized JavaScript origins and redirect URIs
3. Update environment variables with production URLs:
    - `FRONTEND_URL`: Your production frontend URL
    - `GOOGLE_CALLBACK_URL`: Your production backend URL + `/auth/google/callback`
4. Use HTTPS for all URLs in production
5. Never commit `.env` files to version control
6. Use secure, random strings for `JWT_SECRET` and `SESSION_SECRET`

## Security Best Practices

1. **Never share your Client Secret** - Keep it secure and private
2. **Use HTTPS in production** - Always use secure connections
3. **Rotate secrets regularly** - Change JWT and session secrets periodically
4. **Limit OAuth scopes** - Only request the permissions you need
5. **Validate tokens** - Always verify OAuth tokens on the backend
6. **Use environment variables** - Never hardcode credentials

## Additional Resources

-   [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
-   [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
-   [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

## Support

If you encounter any issues with OAuth setup, please check:

1. Backend logs: `backend/` directory
2. Frontend console: Browser developer tools
3. MongoDB connection: Verify database is running
4. Network requests: Check browser Network tab for failed requests
