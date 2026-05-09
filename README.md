# RecruiTech - AI-Powered Recruitment Platform

RecruiTech is a modern, full-stack recruitment platform that revolutionizes hiring with intelligent matching, automated screening, and seamless candidate experiences.

![RecruiTech](https://img.shields.io/badge/RecruiTech-v1.0.0-blue)
![Node](https://img.shields.io/badge/Node.js-v20+-green)
![React](https://img.shields.io/badge/React-v18+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-v8+-green)

## ✨ Features

### For Candidates ✅ Implemented

- 🚀 **Quick Signup** - Register with email/password or Google OAuth
- 📝 **Profile Management** - Comprehensive profile with resume, GitHub, LeetCode, and portfolio links
- ✏️ **Edit Profile** - Update personal info, URLs, and job search status anytime
- 📊 **Dashboard** - View profile status and recommended jobs
- 🎯 **Status Management** - Set job search status (actively/casually looking, not looking)

### For Recruiters ✅ Implemented

- 💼 **Company Management** - Create or join verified companies
- ✏️ **Edit Profiles** - Update personal profile and company information
- 📈 **Dashboard** - View active job postings and hiring metrics
- 🔍 **Company Search** - Find and join existing companies with real-time search
- ⚡ **Quick Actions** - Easy access to profile editing and candidate search

### Coming Soon 🚧

- 📢 **Job Posting** - Post jobs with detailed requirements
- 👥 **Candidate Search** - Find the perfect candidates with AI assistance
- 🎯 **Job Matching** - AI-powered job recommendations based on skills
- 📊 **Application Tracking** - Track all applications in one place
- 🎥 **Video Screening** - Complete video interviews at your convenience

### Authentication

- 🔐 **Secure Login** - Email/password authentication with JWT
- 🌐 **Google OAuth** - One-click signup with Google
- 👤 **Role-Based Access** - Separate flows for candidates and recruiters
- 🔒 **Protected Routes** - Secure access to user-specific content

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **Custom GraphQL utility** - GraphQL client using Axios

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Apollo Server** - GraphQL server
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens for auth
- **bcrypt** - Password hashing

## 📁 Project Structure

```
RecruiTech/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── passport.js
│   │   ├── features/
│   │   │   ├── user/
│   │   │   ├── candidate/
│   │   │   ├── recruiter/
│   │   │   ├── company/
│   │   │   └── job/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── user.schema.js
│   │   │   ├── candidate.schema.js
│   │   │   ├── recruiter.schema.js
│   │   │   └── company.schema.js
│   │   ├── routes/
│   │   │   └── auth.routes.js
│   │   ├── utils/
│   │   └── index.js
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── auth/
│   │   │   ├── candidate/
│   │   │   └── recruiter/
│   │   ├── pages/
│   │   │   ├── common/
│   │   │   ├── candidate/
│   │   │   └── recruiter/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── graphql.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── index.html
│
├── QUICKSTART.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- MongoDB (v8+)
- Docker & Docker Compose
- npm or yarn

### Quick Start (Recommended)

**Use the automated startup script:**

```bash
# First time setup - copy .env.example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp interview-service/.env.example interview-service/.env
cp airflow/.env.example airflow/.env

# Edit the .env files with your credentials (OpenAI API key, Gmail credentials, etc.)

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd interview-service && npm install && cd ..

# Start all services (Kafka, Backend, Interview Service, Frontend, Airflow)
./start.sh

# To stop all services
./start.sh --stop
```

The script will:
- Validate all environment variables
- Start Kafka (Docker)
- Start Backend on port 4000
- Start Interview Service on port 5001
- Start Frontend on port 5173
- Start Airflow (Docker) on port 8080
- Create logs directory automatically
- Display all service URLs

### Manual Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/recruitech.git
    cd RecruiTech
    ```

2. **Setup Backend**

    ```bash
    cd backend
    npm install
    ```

3. **Configure Backend Environment**
   Create a `.env` file in the `backend` directory:

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

4. **Setup Frontend**

    ```bash
    cd ../frontend
    npm install
    ```

5. **Configure Frontend Environment**
   Create a `.env` file in the `frontend` directory:

    ```env
    VITE_API_URL=http://localhost:4000
    VITE_GRAPHQL_URL=http://localhost:4000/graphql
    ```

6. **Start MongoDB**

    ```bash
    # Using Homebrew (macOS)
    brew services start mongodb-community

    # Or run directly
    mongod --dbpath /path/to/data/directory
    ```

7. **Run the Application**

    Terminal 1 (Backend):

    ```bash
    cd backend
    npm run dev
    ```

    Terminal 2 (Frontend):

    ```bash
    cd frontend
    npm run dev
    ```

8. **Access the Application**
    - Frontend: http://localhost:5173
    - Backend API: http://localhost:4000
    - GraphQL Playground: http://localhost:4000/graphql

## 🔐 Google OAuth Setup

To enable Google OAuth authentication:

### Quick Steps:

1. **Create Google Cloud Project**
    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create a new project named "RecruiTech"

2. **Configure OAuth Consent Screen**
    - Go to "APIs & Services" → "OAuth consent screen"
    - Select "External" user type
    - Fill in app name, support email, and developer contact
    - Add scopes: `userinfo.email` and `userinfo.profile`
    - Add test users (your email) for development

3. **Create OAuth Credentials**
    - Go to "APIs & Services" → "Credentials"
    - Create "OAuth client ID" → "Web application"
    - Add Authorized JavaScript origins: `http://localhost:5173`
    - Add Authorized redirect URIs: `http://localhost:4000/auth/google/callback`
    - Copy Client ID and Client Secret

4. **Update Backend `.env`**

    ```env
    GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your-client-secret
    ```

5. **Restart Backend Server**
    - OAuth will be automatically enabled
    - Look for "✅ Google OAuth configured" in logs

## 📖 User Flows

### Candidate Flow

1. **Signup**
    - Choose "Candidate" role
    - Enter email/password or use Google OAuth
    - Complete profile with:
        - Personal information
        - Resume URL (Google Drive, Dropbox, etc.)
        - GitHub profile (optional)
        - LeetCode profile (optional)
        - Portfolio website (optional)
        - Profile summary
        - Job search status

2. **Login**
    - Enter email/password or use Google OAuth
    - Redirected to candidate dashboard

3. **Dashboard**
    - View job recommendations
    - Track applications
    - See profile analytics
    - Manage profile settings

### Recruiter Flow

1. **Signup**
    - Choose "Recruiter" role
    - Enter email/password or use Google OAuth
    - Select or create company:
        - Search verified companies
        - Or create new company with domain
    - Complete profile with:
        - Personal information
        - Company affiliation

2. **Login**
    - Enter email/password or use Google OAuth
    - Redirected to recruiter dashboard

3. **Dashboard**
    - View active job postings
    - Manage applicants
    - Post new jobs
    - View hiring analytics

## 🎨 Design Theme

The application features a modern dark theme with:

- **Primary Colors**: Dark blue (#0f1c2e, #1a2c42)
- **Accent Color**: Cyan (#22d3ee)
- **Background**: Deep dark (#0a1525)
- **Typography**: Inter font family
- **UI Elements**: Smooth animations, rounded corners, subtle shadows

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **OAuth 2.0**: Industry-standard OAuth flow
- **Protected Routes**: Role-based access control
- **Input Validation**: Server-side validation for all inputs
- **CORS**: Configured for specific origins
- **Rate Limiting**: API request throttling
- **Helmet**: Security headers for Express

## 📊 Database Schema

### User

- email, password, google_id, role, profile_pic, is_admin, metadata

### Candidate

- user_id, first_name, last_name, email, phone_number
- resume_url, github_url, leetcode_url, portfolio_url
- profile_summary, status (actively_looking, casually_looking, not_looking)

### Recruiter

- user_id, first_name, last_name, email, phone_number
- company_id, verification_status

### Company

- created_by, name, domain, is_verified

## 🧪 API Endpoints

### REST Endpoints

- `GET /health` - Health check
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/google/register` - Complete OAuth registration

### GraphQL Queries & Mutations

See the GraphQL Playground at http://localhost:4000/graphql for full schema documentation.

## 🛣️ Roadmap

- [x] User authentication (Email/Password + Google OAuth)
- [x] Role-based signup and login flows
- [x] Candidate profile management
- [x] Recruiter profile management
- [x] Company creation and selection
- [x] Profile editing for candidates and recruiters
- [ ] Job posting and search functionality
- [ ] AI-powered candidate matching
- [ ] Application tracking system
- [ ] Video screening integration
- [ ] Real-time messaging between candidates and recruiters
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Multiple OAuth providers (LinkedIn, GitHub)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Design inspiration from modern recruitment platforms
- Built with ❤️ using React and Node.js

## 📧 Support

For support, email support@recruitech.com or open an issue in the repository.

## Project summary

RecruiTech is an end-to-end technical recruiting platform that brings job posting, candidate review, and live AI-led interviews into a single cohesive workflow, eliminating the context switching that comes with fragmented hiring tools. The platform automates candidate evaluation through CrewAI agents orchestrated by Apache Airflow and Kafka, enriching profiles from resumes, job descriptions, and public engineer signals without any manual effort. It uses Elasticsearch to power full-text search across jobs and talent, gRPC handles fast typed communication between the core platform and the backend services, and GraphQL serves as the primary API contract for all data flowing in and out of the application. Live AI interviews run over WebSockets for real-time signaling and WebRTC for camera and audio, giving candidates a responsive room while the AI stack follows and processes their answers as they happen.

---

Made with ❤️ by RecruiTech Team
