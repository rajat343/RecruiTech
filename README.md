# RecruiTech - AI-Powered Recruitment Platform

RecruiTech is a modern, full-stack recruitment platform that revolutionizes hiring with intelligent matching, automated screening, and seamless candidate experiences.

![RecruiTech](https://img.shields.io/badge/RecruiTech-v1.0.0-blue)
![Node](https://img.shields.io/badge/Node.js-v20+-green)
![React](https://img.shields.io/badge/React-v18+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-v8+-green)

## ✨ Features

### For Candidates

-   🚀 **Quick Signup** - Register with email/password or Google OAuth
-   📝 **Profile Management** - Comprehensive profile with resume, GitHub, LeetCode, and portfolio links
-   🎯 **Job Matching** - AI-powered job recommendations based on your skills
-   📊 **Application Tracking** - Track all your applications in one place
-   🎥 **Video Screening** - Complete video interviews at your convenience

### For Recruiters

-   💼 **Company Management** - Create or join verified companies
-   📢 **Job Posting** - Post jobs with detailed requirements
-   👥 **Candidate Search** - Find the perfect candidates with AI assistance
-   📈 **Analytics Dashboard** - Track hiring metrics and candidate engagement
-   ⚡ **Quick Actions** - Manage applications efficiently

### Authentication

-   🔐 **Secure Login** - Email/password authentication with JWT
-   🌐 **Google OAuth** - One-click signup with Google
-   👤 **Role-Based Access** - Separate flows for candidates and recruiters
-   🔒 **Protected Routes** - Secure access to user-specific content

## 🛠️ Tech Stack

### Frontend

-   **React 18** - Modern UI library
-   **Vite** - Lightning-fast build tool
-   **React Router** - Client-side routing
-   **Apollo Client** - GraphQL client
-   **Lucide React** - Beautiful icons
-   **Axios** - HTTP client for REST APIs

### Backend

-   **Node.js** - JavaScript runtime
-   **Express** - Web framework
-   **Apollo Server** - GraphQL server
-   **MongoDB** - NoSQL database
-   **Mongoose** - ODM for MongoDB
-   **Passport.js** - Authentication middleware
-   **JWT** - JSON Web Tokens for auth
-   **bcrypt** - Password hashing

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
│   │   ├── config/
│   │   │   └── apollo.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── index.html
│
├── OAUTH_SETUP.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites

-   Node.js (v20+)
-   MongoDB (v8+)
-   npm or yarn

### Installation

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
    MONGODB_URI=mongodb://localhost:27017/recruitech
    JWT_SECRET=your-super-secret-jwt-key
    JWT_EXPIRES_IN=7d
    SESSION_SECRET=your-session-secret
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
    FRONTEND_URL=http://localhost:5173
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

## 🔐 OAuth Setup

To enable Google OAuth authentication, follow the detailed guide in [OAUTH_SETUP.md](./OAUTH_SETUP.md).

Quick steps:

1. Create a Google Cloud Project
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add credentials to `.env` files

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

-   **Primary Colors**: Dark blue (#0f1c2e, #1a2c42)
-   **Accent Color**: Cyan (#22d3ee)
-   **Background**: Deep dark (#0a1525)
-   **Typography**: Inter font family
-   **UI Elements**: Smooth animations, rounded corners, subtle shadows

## 🔒 Security Features

-   **Password Hashing**: bcrypt with salt rounds
-   **JWT Authentication**: Secure token-based auth
-   **OAuth 2.0**: Industry-standard OAuth flow
-   **Protected Routes**: Role-based access control
-   **Input Validation**: Server-side validation for all inputs
-   **CORS**: Configured for specific origins
-   **Rate Limiting**: API request throttling
-   **Helmet**: Security headers for Express

## 📊 Database Schema

### User

-   email, password, google_id, role, profile_pic, is_admin, metadata

### Candidate

-   user_id, first_name, last_name, email, contact_number
-   resume_url, github_url, leetcode_url, portfolio_url
-   profile_summary, status (actively_looking, casually_looking, not_looking)

### Recruiter

-   user_id, first_name, last_name, email, contact_number
-   company_id, verification_status

### Company

-   created_by, name, domain, is_verified

## 🧪 API Endpoints

### REST Endpoints

-   `GET /health` - Health check
-   `GET /auth/google` - Initiate Google OAuth
-   `GET /auth/google/callback` - OAuth callback
-   `POST /auth/google/register` - Complete OAuth registration

### GraphQL Queries & Mutations

See the GraphQL Playground at http://localhost:4000/graphql for full schema documentation.

## 🛣️ Roadmap

-   [ ] Job posting and search functionality
-   [ ] AI-powered candidate matching
-   [ ] Video screening integration
-   [ ] Real-time messaging between candidates and recruiters
-   [ ] Advanced analytics dashboard
-   [ ] Email notifications
-   [ ] Mobile app (React Native)
-   [ ] Multiple OAuth providers (LinkedIn, GitHub)

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

-   **Your Name** - Initial work

## 🙏 Acknowledgments

-   Icons by [Lucide](https://lucide.dev/)
-   Design inspiration from modern recruitment platforms
-   Built with ❤️ using React and Node.js

## 📧 Support

For support, email support@recruitech.com or open an issue in the repository.

---

Made with ❤️ by RecruiTech Team
