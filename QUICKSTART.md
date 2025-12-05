# RecruiTech Quick Start Guide

Get RecruiTech up and running in 5 minutes!

## Prerequisites Check

Before you begin, ensure you have:

-   ✅ Node.js v20+ installed (`node --version`)
-   ✅ MongoDB installed and running
-   ✅ npm or yarn package manager

## Quick Setup (Without OAuth)

You can test the app immediately using email/password authentication. Google OAuth is optional and can be added later.

### 1. Start MongoDB

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or start manually
mongod --dbpath /path/to/your/data/directory

# Or with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `backend/.env` file:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=my-super-secret-jwt-key-for-development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=my-session-secret-for-development
MONGODB_URL=mongodb://localhost:27017/recruitech

# OAuth is optional - leave these empty for now
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:4000
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

### 4. Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

You should see:

```
🚀 Server running on http://localhost:4000
📊 GraphQL endpoint: http://localhost:4000/graphql
⚠️  Google OAuth not configured - add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### 5. Access the Application

-   🌐 **Frontend**: http://localhost:5173
-   🔧 **Backend API**: http://localhost:4000
-   📊 **GraphQL Playground**: http://localhost:4000/graphql

## Test the Application

### Create a Candidate Account

1. Go to http://localhost:5173
2. Click "Sign Up"
3. Select "Candidate" role
4. Enter email: `candidate@test.com` and password: `password123`
5. Click "Sign Up"
6. Fill in your profile details:
    - Name, email (pre-filled)
    - **Resume URL** (required) - e.g., `https://drive.google.com/your-resume`
    - GitHub URL (optional)
    - LeetCode URL (optional)
    - Portfolio URL (optional)
    - Profile summary
7. Click "Complete Profile"
8. You're in! 🎉

### Create a Recruiter Account

1. Open a new incognito/private window (or logout)
2. Go to http://localhost:5173
3. Click "Sign Up"
4. Select "Recruiter" role
5. Enter email: `recruiter@test.com` and password: `password123`
6. Click "Sign Up"
7. **Company Selection**:
    - Type to search existing companies OR
    - Click "Create New Company"
    - **Name**: Test Company
    - **Domain**: testcompany.com
8. Fill in your profile details
9. Click "Complete Profile"
10. Welcome to your recruiter dashboard! 🚀

## Enable Google OAuth (Optional)

To enable "Continue with Google" buttons:

### Step 1: Google Cloud Console Setup

1. **Create Project**

    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create new project "RecruiTech"

2. **Configure OAuth Consent Screen**

    - Go to "APIs & Services" → "OAuth consent screen"
    - Select "External" → Fill in:
        - App name: RecruiTech
        - User support email: your email
        - Developer contact: your email
    - Add scopes: `userinfo.email` and `userinfo.profile`
    - Add test users (your Gmail for testing)

3. **Create Credentials**
    - Go to "APIs & Services" → "Credentials"
    - "Create Credentials" → "OAuth client ID"
    - Application type: "Web application"
    - Add Authorized JavaScript origins:
        ```
        http://localhost:5173
        ```
    - Add Authorized redirect URIs:
        ```
        http://localhost:4000/auth/google/callback
        ```
    - Click "Create" and copy Client ID & Secret

### Step 2: Update Backend Configuration

Update `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

### Step 3: Restart & Test

1. Restart the backend server
2. You should see: `✅ Google OAuth configured`
3. Go to http://localhost:5173
4. Click "Continue with Google" - it works! 🎉

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Make sure MongoDB is running

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start it if not running
brew services start mongodb-community
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution**: Stop the process using that port

```bash
# Find the process
lsof -i :4000

# Kill it (replace <PID> with the actual process ID)
kill -9 <PID>
```

### Frontend Can't Connect to Backend

```
Network Error / Failed to fetch
```

**Solution**:

-   Check that backend is running on port 4000
-   Verify both `.env` files have correct URLs
-   Check browser console for detailed error messages

### "Google OAuth not configured" message

This is **normal** if you haven't set up OAuth yet! Email/password authentication will still work perfectly. The "Continue with Google" buttons will be disabled until you add OAuth credentials.

## Development Tips

### View Database Data

**Using MongoDB Compass (GUI):**

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017`
3. Browse the `recruitech` database

**Using Command Line:**

```bash
mongosh
use recruitech
db.users.find().pretty()
db.candidates.find().pretty()
db.recruiters.find().pretty()
db.companies.find().pretty()
```

### Clear Database (Start Fresh)

```bash
mongosh
use recruitech
db.dropDatabase()
exit
```

Then restart the backend server.

### Check Logs

Backend logs appear in the terminal where you ran `npm run dev`. Look for:

-   ✅ Success messages (green checks)
-   ⚠️ Warnings (yellow)
-   ❌ Errors (red)

## Common Commands

```bash
# Backend
cd backend
npm run dev          # Start dev server with auto-restart
npm start            # Start production server

# Frontend
cd frontend
npm run dev          # Start dev server with hot reload
npm run build        # Build for production

# Database
mongosh              # Open MongoDB shell
brew services list   # Check MongoDB status (macOS)
```

## Next Steps

-   ✨ Explore the beautiful landing page
-   👤 Create test accounts for both candidate and recruiter
-   📊 Try the GraphQL Playground at http://localhost:4000/graphql
-   🔐 Set up Google OAuth when ready (see OAUTH_SETUP.md)
-   📖 Read the full README.md for more details

## Need Help?

-   📖 Full documentation: [README.md](./README.md)
-   🔐 OAuth setup: See "Enable Google OAuth" section above
-   🐛 Found a bug? Check the console logs first
-   💬 Questions? Open an issue or discussion

---

**Pro Tip**: Keep both terminals visible so you can see backend and frontend logs simultaneously. Errors usually appear here first!

Happy coding! 🚀
