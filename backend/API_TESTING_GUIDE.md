# API Testing Guide

## 🚀 Starting the Server

```bash
# Install dependencies (if not already done)
npm install

# Start the server
npm run dev
# or
npm start
```

The server will run on: `http://localhost:4000`

-   GraphQL Endpoint: `http://localhost:4000/graphql`
-   GraphQL Playground: `http://localhost:4000/graphql` (in browser)
-   Health Check: `http://localhost:4000/health`

---

## 📋 Testing Methods

### Method 1: GraphQL Playground (Easiest)

1. Start the server
2. Open browser: `http://localhost:4000/graphql`
3. Use the interactive GraphQL Playground

**Note:** If you see "offline" error, try:

-   Refresh the page
-   Check if server is running: `curl http://localhost:4000/health`
-   Try alternative: Use Postman or Insomnia (see Method 2)

### Method 2: Postman/Insomnia

-   Use POST requests to `http://localhost:4000/graphql`
-   Set `Content-Type: application/json`
-   Add Authorization header for protected queries

### Method 3: cURL

-   Use curl commands (examples below)

---

## 🔐 Authentication

Most queries require authentication. First, register/login to get a token:

### 1. Register a User

**GraphQL Playground:**

```graphql
mutation {
	register(
		email: "test@example.com"
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

**cURL:**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(email: \"test@example.com\", password: \"password123\", role: candidate) { token user { id email role } } }"
  }'
```

### 2. Login

**GraphQL Playground:**

```graphql
mutation {
	login(email: "test@example.com", password: "password123") {
		token
		user {
			id
			email
			role
		}
	}
}
```

**Save the token** - You'll need it for authenticated requests!

---

## 👤 User APIs

### Get Current User (Me)

**GraphQL Playground:**

```graphql
query {
	me {
		id
		email
		role
		is_admin
		createdAt
	}
}
```

**cURL (with token):**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { me { id email role is_admin } }"
  }'
```

### Get User by ID

```graphql
query {
	user(id: "USER_ID_HERE") {
		id
		email
		role
		is_admin
	}
}
```

### Get All Users

```graphql
query {
	users(role: candidate, limit: 10, offset: 0) {
		id
		email
		role
		createdAt
	}
}
```

### Update User Role (Admin Only)

```graphql
mutation {
	updateUserRole(id: "USER_ID", role: recruiter) {
		id
		email
		role
	}
}
```

### Delete User (Admin Only)

```graphql
mutation {
	deleteUser(id: "USER_ID")
}
```

---

## 👨‍💼 Candidate APIs

### Create Candidate Profile

**First, register/login as a candidate user, then:**

```graphql
mutation {
	createCandidate(
		input: {
			first_name: "John"
			last_name: "Doe"
			email: "john.doe@example.com"
			phone_number: "+1234567890"
			github_url: "https://github.com/johndoe"
			leetcode_url: "https://leetcode.com/johndoe"
			portfolio_url: "https://johndoe.dev"
			resume_url: "https://example.com/resume.pdf"
			profile_summary: "Experienced software developer"
			status: actively_looking
		}
	) {
		id
		first_name
		last_name
		email
		phone_number
		status
		createdAt
	}
}
```

### Get My Candidate Profile

```graphql
query {
	myCandidateProfile {
		id
		first_name
		last_name
		email
		status
		github_url
		resume_url
	}
}
```

### Get Candidate by ID

```graphql
query {
	candidate(id: "CANDIDATE_ID") {
		id
		first_name
		last_name
		email
		status
		github_url
		resume_url
	}
}
```

### Get All Candidates

```graphql
query {
	candidates(status: actively_looking, limit: 10, offset: 0) {
		id
		first_name
		last_name
		email
		status
	}
}
```

### Update Candidate Profile

```graphql
mutation {
	updateCandidate(
		id: "CANDIDATE_ID"
		input: {
			status: casually_looking
			github_url: "https://github.com/johndoe-updated"
			profile_summary: "Updated profile summary"
		}
	) {
		id
		status
		github_url
		profile_summary
	}
}
```

### Delete Candidate Profile

```graphql
mutation {
	deleteCandidate(id: "CANDIDATE_ID")
}
```

---

## 🏢 Recruiter APIs

### Create Recruiter Profile

**First, register/login as a recruiter user, then:**

```graphql
mutation {
	createRecruiter(
		input: {
			first_name: "Jane"
			last_name: "Smith"
			email: "jane.smith@company.com"
			phone_number: "+1234567890"
			company_id: "COMPANY_ID"
		}
	) {
		id
		first_name
		last_name
		email
		phone_number
		company_id
		verification_status
	}
}
```

### Get My Recruiter Profile

```graphql
query {
	myRecruiterProfile {
		id
		first_name
		last_name
		email
		phone_number
		company_id
		verification_status
	}
}
```

### Get Recruiter by ID

```graphql
query {
	recruiter(id: "RECRUITER_ID") {
		id
		first_name
		last_name
		email
		phone_number
		company_id
		verification_status
	}
}
```

### Get All Recruiters

```graphql
query {
	recruiters(verification_status: verified, limit: 10, offset: 0) {
		id
		first_name
		last_name
		phone_number
		company_id
		verification_status
	}
}
```

### Update Recruiter Profile

```graphql
mutation {
	updateRecruiter(
		id: "RECRUITER_ID"
		input: { first_name: "Jane", phone_number: "+9876543210" }
	) {
		id
		first_name
		last_name
		phone_number
		company_id
	}
}
```

### Update Recruiter Verification (Admin Only)

```graphql
mutation {
	updateRecruiterVerification(
		id: "RECRUITER_ID"
		verification_status: verified
	) {
		id
		verification_status
	}
}
```

### Delete Recruiter Profile

```graphql
mutation {
	deleteRecruiter(id: "RECRUITER_ID")
}
```

---

## 🧪 Testing with Postman

### Setup:

1. Create a new POST request
2. URL: `http://localhost:4000/graphql`
3. Headers:
    - `Content-Type: application/json`
    - `Authorization: Bearer YOUR_TOKEN` (for protected queries)

### Body (raw JSON):

```json
{
	"query": "query { me { id email role } }"
}
```

### For Mutations:

```json
{
	"query": "mutation { login(email: \"test@example.com\", password: \"password123\") { token user { id email } } }"
}
```

---

## 🧪 Testing with cURL

### Health Check

```bash
curl http://localhost:4000/health
```

### Register

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(email: \"test@example.com\", password: \"password123\", role: candidate) { token user { id email } } }"
  }'
```

### Login

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"test@example.com\", password: \"password123\") { token user { id email } } }"
  }'
```

### Get Me (with token)

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { me { id email role } }"
  }'
```

---

## 📝 Complete Testing Workflow

### Step 1: Register a Candidate

```graphql
mutation {
	register(
		email: "candidate@test.com"
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

**Save the token!**

### Step 2: Create Candidate Profile

```graphql
mutation {
	createCandidate(
		input: {
			first_name: "John"
			last_name: "Doe"
			email: "candidate@test.com"
			resume_url: "https://example.com/resume.pdf"
			status: actively_looking
		}
	) {
		id
		first_name
		last_name
		status
	}
}
```

### Step 3: Register a Recruiter

```graphql
mutation {
	register(
		email: "recruiter@test.com"
		password: "password123"
		role: recruiter
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

### Step 4: Create Recruiter Profile

```graphql
mutation {
	createRecruiter(
		input: {
			first_name: "Jane"
			last_name: "Smith"
			email: "recruiter@test.com"
			company_name: "Tech Corp"
		}
	) {
		id
		first_name
		company_name
		verification_status
	}
}
```

### Step 5: Query Candidates

```graphql
query {
	candidates(status: actively_looking) {
		id
		first_name
		last_name
		email
		status
	}
}
```

---

## 🔍 Common Issues

### 1. "Authentication required" error

-   Make sure you're sending the token in the Authorization header
-   Format: `Authorization: Bearer YOUR_TOKEN`

### 2. "Invalid or expired token"

-   Login again to get a new token

### 3. "User not found"

-   Make sure the user ID exists in the database

### 4. CORS errors

-   Check that your frontend URL is in the CORS configuration

---

## 📊 GraphQL Playground Tips

1. **Variables**: Use the bottom panel for variables

    ```json
    {
    	"email": "test@example.com",
    	"password": "password123"
    }
    ```

    Then in query:

    ```graphql
    mutation Login($email: String!, $password: String!) {
    	login(email: $email, password: $password) {
    		token
    	}
    }
    ```

2. **Headers**: Add headers in the bottom panel

    ```json
    {
    	"Authorization": "Bearer YOUR_TOKEN"
    }
    ```

3. **Documentation**: Click "Schema" tab to see all available queries/mutations

---

## 🎯 Quick Test Checklist

-   [ ] Health check endpoint works
-   [ ] Can register a user
-   [ ] Can login and get token
-   [ ] Can query `me` with token
-   [ ] Can create candidate profile
-   [ ] Can create recruiter profile
-   [ ] Can query candidates
-   [ ] Can query recruiters
-   [ ] Can update profiles
-   [ ] Can delete profiles
-   [ ] Admin-only endpoints require admin role

---

## 📚 Additional Resources

-   GraphQL Playground: `http://localhost:4000/graphql`
-   Apollo Server Docs: https://www.apollographql.com/docs/apollo-server/
-   GraphQL Docs: https://graphql.org/learn/
