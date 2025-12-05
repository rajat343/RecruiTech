# RecruiTech Backend API

Enterprise-grade GraphQL API for the RecruiTech recruiting platform.

## Features

-   **GraphQL API** with Apollo Server
-   **MongoDB** database with Mongoose ODM
-   **Authentication**: Email/Password and Google OAuth2
-   **Feature-based architecture** for scalability
-   **JWT-based authentication**
-   **Soft delete** functionality
-   **Role-based access control** (Admin, Recruiter, Candidate)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── passport.js          # Google OAuth2 configuration
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Candidate.js         # Candidate model
│   │   └── Recruiter.js         # Recruiter model
│   ├── features/
│   │   ├── user/                # User feature module
│   │   │   ├── typeDefs.js      # GraphQL schema
│   │   │   ├── resolvers.js     # GraphQL resolvers
│   │   │   └── services/
│   │   │       ├── authService.js
│   │   │       └── userService.js
│   │   ├── candidate/           # Candidate feature module
│   │   │   ├── typeDefs.js
│   │   │   ├── resolvers.js
│   │   │   └── services/
│   │   │       └── candidateService.js
│   │   └── recruiter/           # Recruiter feature module
│   │       ├── typeDefs.js
│   │       ├── resolvers.js
│   │       └── services/
│   │           └── recruiterService.js
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── utils/
│   │   └── jwt.js               # JWT utilities
│   ├── routes/
│   │   └── auth.js              # OAuth routes
│   └── index.js                 # Application entry point
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

-   `MONGODB_URL`: MongoDB connection string
-   `JWT_SECRET`: Secret key for JWT tokens
-   `JWT_EXPIRES_IN`: JWT token expiration time
-   `SESSION_SECRET`: Session secret for Express sessions
-   `GOOGLE_CLIENT_ID`: Google OAuth2 client ID (optional)
-   `GOOGLE_CLIENT_SECRET`: Google OAuth2 client secret (optional)
-   `GOOGLE_CALLBACK_URL`: OAuth callback URL
-   `FRONTEND_URL`: Frontend application URL
-   `PORT`: Server port (default: 4000)
-   `NODE_ENV`: Environment (development/production)

### 3. Start MongoDB

Make sure MongoDB is running on your system or use a cloud MongoDB instance.

### 4. Run the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:4000` (or the port specified in `.env`).

## API Endpoints

### GraphQL Endpoint

-   **URL**: `http://localhost:4000/graphql`
-   **Playground**: `http://localhost:4000/graphql` (development only)

### OAuth Endpoints

-   **Google OAuth**: `http://localhost:4000/auth/google`
-   **Callback**: `http://localhost:4000/auth/google/callback`

### Health Check

-   **URL**: `http://localhost:4000/health`

## GraphQL Schema

### User Operations

**Queries:**

-   `me`: Get current user
-   `user(id: ID!)`: Get user by ID
-   `users(role: UserRole, limit: Int, offset: Int)`: Get all users

**Mutations:**

-   `register(email: String!, password: String!, role: UserRole!)`: Register new user
-   `login(email: String!, password: String!)`: Login with email/password
-   `googleAuth(googleId: String!, email: String!, role: UserRole!)`: Authenticate with Google
-   `updateUserRole(id: ID!, role: UserRole!)`: Update user role (admin only)
-   `deleteUser(id: ID!)`: Delete user (admin only)

### Candidate Operations

**Queries:**

-   `candidate(id: ID!)`: Get candidate by ID
-   `myCandidateProfile`: Get current user's candidate profile
-   `candidates(status: CandidateStatus, limit: Int, offset: Int)`: Get all candidates

**Mutations:**

-   `createCandidate(input: CandidateInput!)`: Create candidate profile
-   `updateCandidate(id: ID!, input: CandidateUpdateInput!)`: Update candidate profile
-   `deleteCandidate(id: ID!)`: Delete candidate profile

### Recruiter Operations

**Queries:**

-   `recruiter(id: ID!)`: Get recruiter by ID
-   `myRecruiterProfile`: Get current user's recruiter profile
-   `recruiters(verification_status: VerificationStatus, limit: Int, offset: Int)`: Get all recruiters

**Mutations:**

-   `createRecruiter(input: RecruiterInput!)`: Create recruiter profile
-   `updateRecruiter(id: ID!, input: RecruiterUpdateInput!)`: Update recruiter profile
-   `deleteRecruiter(id: ID!)`: Delete recruiter profile
-   `updateRecruiterVerification(id: ID!, verification_status: VerificationStatus!)`: Update verification status (admin only)

## Authentication

### Email/Password Authentication

1. Register a new user:

```graphql
mutation {
	register(
		email: "user@example.com"
		password: "password123"
		role: candidate
	) {
		token
		user {
			id
			email
			role
		}
	}
}
```

2. Login:

```graphql
mutation {
	login(email: "user@example.com", password: "password123") {
		token
		user {
			id
			email
			role
		}
	}
}
```

3. Use token in requests:
   Add to HTTP headers:

```
Authorization: Bearer <token>
```

### Google OAuth2 Authentication

1. Redirect user to: `http://localhost:4000/auth/google`
2. User authenticates with Google
3. For new users, redirect to frontend for role selection
4. Use `googleAuth` mutation with Google ID and selected role

## Database Models

### User

-   `email`: String (unique, required)
-   `password_hash`: String (optional, for email/password auth)
-   `google_id`: String (optional, unique, for OAuth)
-   `role`: Enum ['recruiter', 'candidate'] (required)
-   `is_admin`: Boolean (default: false)
-   `is_deleted`: Boolean (default: false)

### Candidate

-   `first_name`: String (required)
-   `last_name`: String (required)
-   `email`: String (unique, required)
-   `phone_number`: String (optional)
-   `github_url`: String (optional)
-   `leetcode_url`: String (optional)
-   `portfolio_url`: String (optional)
-   `resume_url`: String (required)
-   `profile_summary`: String (optional)
-   `status`: Enum ['actively_looking', 'casually_looking', 'not_looking'] (default: 'actively_looking')
-   `is_deleted`: Boolean (default: false)
-   `user_id`: ObjectId (reference to User)

### Recruiter

-   `first_name`: String (required)
-   `last_name`: String (required)
-   `email`: String (unique, required)
-   `phone_number`: String (optional)
-   `company_id`: ObjectId (reference to Company, required)
-   `verification_status`: Enum ['pending', 'verified', 'rejected'] (default: 'verified')
-   `is_deleted`: Boolean (default: false)
-   `user_id`: ObjectId (reference to User)

### Company

-   `name`: String (required)
-   `domain`: String (unique, required)
-   `is_verified`: Boolean (default: true)
-   `is_deleted`: Boolean (default: false)
-   `created_by`: ObjectId (reference to User, required)

## Security Features

-   **Helmet.js**: Security headers
-   **Rate limiting**: Prevents abuse
-   **JWT authentication**: Secure token-based auth
-   **Password hashing**: Bcrypt for password security
-   **Soft delete**: Data preservation
-   **Input validation**: GraphQL schema validation
-   **CORS**: Configured for frontend access

## Development

### Code Structure

The codebase follows enterprise-level best practices:

-   **Feature-based organization**: Each feature has its own folder
-   **Separation of concerns**: Services, resolvers, and models are separated
-   **Reusable utilities**: Common functions in utils folder
-   **Middleware**: Authentication and authorization logic
-   **Error handling**: Consistent error handling across the application

### Adding New Features

1. Create a new folder in `src/features/`
2. Add `typeDefs.js` for GraphQL schema
3. Add `resolvers.js` for GraphQL resolvers
4. Add `services/` folder for business logic
5. Create model in `src/models/` if needed
6. Import and add to `src/index.js`

## License

ISC
