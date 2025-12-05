# RecruiTech Frontend

Modern React frontend for the RecruiTech recruitment platform.

## Tech Stack

-   **React 18** - UI library
-   **Vite** - Build tool and dev server
-   **React Router DOM** - Client-side routing
-   **Axios** - HTTP client for API calls
-   **Lucide React** - Icon library
-   **Custom GraphQL utility** - GraphQL requests using Axios

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Navbar.jsx
│   │       └── Navbar.css
│   ├── pages/
│   │   ├── common/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── OAuthComplete.jsx
│   │   ├── candidate/
│   │   │   ├── CandidateHome.jsx
│   │   │   ├── CandidateOnboarding.jsx
│   │   │   └── CandidateHome.css
│   │   └── recruiter/
│   │       ├── RecruiterHome.jsx
│   │       ├── RecruiterOnboarding.jsx
│   │       └── RecruiterHome.css
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── utils/
│   │   └── graphql.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json
```

## Features

### Authentication

-   Email/password login and signup
-   Google OAuth integration
-   JWT-based authentication
-   Protected routes with AuthContext

### User Flows

-   **Candidate Flow**: Signup → Onboarding → Dashboard with profile editing
-   **Recruiter Flow**: Signup → Company selection → Onboarding → Dashboard with profile editing

### UI/UX

-   Modern dark theme with cyan accents
-   Responsive design for all screen sizes
-   Smooth animations and transitions
-   Form validation and error handling
-   Loading states and spinners
-   Modal-based profile editing

## Setup

1. **Install dependencies**

    ```bash
    npm install
    ```

2. **Configure environment**
   Create `.env` file:

    ```env
    VITE_API_URL=http://localhost:4000
    VITE_GRAPHQL_URL=http://localhost:4000/graphql
    ```

3. **Start development server**

    ```bash
    npm run dev
    ```

4. **Build for production**
    ```bash
    npm run build
    ```

## Available Scripts

-   `npm run dev` - Start development server with hot reload
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build locally
-   `npm run lint` - Run ESLint

## Environment Variables

-   `VITE_API_URL` - Backend API base URL (default: http://localhost:4000)
-   `VITE_GRAPHQL_URL` - GraphQL endpoint URL (default: http://localhost:4000/graphql)

## Key Components

### AuthContext

Provides authentication state and methods throughout the app:

-   `user` - Current user object
-   `token` - JWT authentication token
-   `loading` - Authentication loading state
-   `login(token, userData)` - Login method
-   `logout()` - Logout method
-   `isAuthenticated` - Boolean authentication status

### GraphQL Utility

Custom utility for making GraphQL requests:

```javascript
import { graphqlRequest } from "./utils/graphql";

const data = await graphqlRequest(query, variables, token);
```

## Styling

-   **CSS Variables** for theming
-   **Component-scoped CSS** files
-   **Responsive design** with media queries
-   **Dark theme** with modern aesthetics

## Protected Routes

Routes automatically redirect unauthenticated users to login:

-   `/candidate/onboarding` - Candidate profile setup
-   `/candidate/home` - Candidate dashboard
-   `/recruiter/onboarding` - Recruiter profile setup
-   `/recruiter/home` - Recruiter dashboard

## Development Notes

-   ESLint configured for React best practices
-   Fast Refresh enabled for instant updates
-   Vite optimizes dependencies automatically
-   All API calls go through axios with error handling
