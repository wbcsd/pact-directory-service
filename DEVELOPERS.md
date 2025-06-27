# PACT Directory Service - Developer Setup Guide

This guide provides comprehensive instructions for setting up a local development environment for the PACT Directory Service project.

## Project Overview

The PACT Directory Service is a foundational service of the PACT Network that provides identity management capabilities, including:

- Organization registration to PACT Network
- Directory search functionality
- Authentication as a service for customers and suppliers
- Secure credential management
- Authentication as a service for PACT Network applications

The project consists of two main applications:

- **API** (`apps/api`): Express.js backend with PostgreSQL database
- **Directory Portal** (`apps/directory-portal`): React frontend built with Vite

## Prerequisites

Before setting up the development environment, ensure you have the following tools installed:

### Required Tools

- **Node.js** (>= 20.9.0) - [Download here](https://nodejs.org/)
- **pnpm** (>= 8.0.0) - Install with `npm install -g pnpm`
- **Docker** (>= 20.0.0) - [Download here](https://www.docker.com/get-started)
- **Docker Compose** (>= 2.0.0) - Usually included with Docker Desktop
- **Git** - For version control

### Verify Installation

```bash
node --version    # Should be >= 20.9.0
pnpm --version    # Should be >= 8.0.0
docker --version  # Should be >= 20.0.0
docker compose version  # Should be >= 2.0.0
```

## Setup Development Environment

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/wbcsd/pact-directory.git
cd pact-directory

# Install dependencies for all workspaces
pnpm install
```

### 2. Database Setup

The API uses PostgreSQL as its database. Start the database using Docker Compose:

```bash
# Navigate to the API directory
cd apps/api

# Start PostgreSQL database
docker compose up -d

# Wait for the database to be ready (about 10-15 seconds)
# You can check the status with:
docker compose ps
```

### 3. API Setup

#### Environment Configuration

The API uses environment-specific configuration files located in `apps/api/env/`:

- `development.env` - Development environment (already configured)
- `test.env` - Test environment
- `production.env` - Production environment

For local development, the default `development.env` should work out of the box.

#### Database Migration and Setup

```bash
# Navigate to API directory (if not already there)
cd apps/api

# Run database migrations
pnpm run db:migrate

# Add a test user (required for authentication testing)
pnpm run db:add-user test@example.com "Test User" "testpassword" "administrator" "TestCompany" "test-company-id"
```

#### Start the API Server

```bash
# Run in development mode with hot reloading
pnpm run dev

# Alternative: Run without hot reloading
pnpm run dev:hot
```

The API will be available at `http://localhost:3010`

### 4. Directory Portal Setup

#### Environment Configuration

```bash
# Navigate to the directory portal
cd apps/directory-portal

# Copy the environment example file
cp .env.example .env
```

The default `.env` configuration should work for local development:

```bash
VITE_DIRECTORY_API_URL=http://localhost:3010/api/directory
VITE_PROXY_API_URL=http://localhost:3010/api/proxy
VITE_ENABLE_IM=false
```

#### Start the Frontend

```bash
# Run in development mode
pnpm run dev
```

The frontend will be available at `http://localhost:5173`

## Development Workflow

### Starting Both Applications

From the project root, you can start both applications simultaneously:

```bash
# This runs both API and frontend in development mode
pnpm run dev
```

### Running Tests

#### API Tests

```bash
cd apps/api

# Run all tests
pnpm test

# Run tests with hot reloading
pnpm run test:hot

# Run specific test file
pnpm test -- users
```

#### Frontend Tests

```bash
cd apps/directory-portal

# Run linting
pnpm run lint
```

## Database Management

### Available Database Commands

```bash
cd apps/api

# Run migrations to latest
pnpm run db:migrate

# Add a new user
pnpm run db:add-user <email> <fullName> <password> <role> <companyName> <companyIdentifier>

# Example:
pnpm run db:add-user user@company.com "John Doe" "password123" "administrator" "ACME Corp" "acme-corp"
```

### Database Schema

The database schema is managed through Kysely migrations located in `apps/api/src/database/migrations/`. The schema includes:

- `users` - User accounts
- `companies` - Organization information
- `connection_requests` - Organization connection requests
- `credentials` - API credentials for organizations
- `password_reset_tokens` - Password reset functionality

### Accessing the Database

```bash
# Connect to the running PostgreSQL container
docker exec -it api-pact-directory-local-db-1 psql -U postgres -d pact_directory_local

# Common queries
\dt  # List tables
\d users  # Describe users table
SELECT * FROM users;  # View all users
```

## Environment Variables

### API Environment Variables

The API reads configuration from environment files in this order:

1. `./env/${NODE_ENV}.env` (e.g., `./env/development.env`)
2. `./.env` (if present)
3. System environment variables

Key variables include:

#### Server Configuration

- `NODE_ENV` - Environment (development/test/production)
- `PORT` - Server port (default: 3010)
- `HOST` - Server host (default: localhost)

#### Database Configuration

- `DIR_DB_HOST` - Database host (default: localhost)
- `DIR_DB_USER` - Database user (default: postgres)
- `DIR_DB_PASSWORD` - Database password (default: postgres)
- `DIR_DB_NAME` - Database name (default: pact_directory_local)

#### Authentication Configuration

- `JWT_SECRET` - Secret for JWT tokens
- `COOKIE_SECRET` - Secret for cookie signing
- `COOKIE_EXP` - Cookie expiration (milliseconds)

#### Email Configuration (Optional)

- `SENDGRID_API_KEY` - SendGrid API key for email sending
- `SENDGRID_FROM_EMAIL` - From email address
- `EMAIL_WELCOME_TEMPLATE` - Welcome email template ID
- `EMAIL_RESET_TEMPLATE` - Password reset email template ID

#### Conformance API Configuration

- `RUN_TEST_CASES_URL` - External service URL for running conformance test cases
- `TEST_RESULTS_URL` - External service URL for retrieving test results
- `RECENT_TEST_RUNS_URL` - External service URL for getting recent test runs

### Frontend Environment Variables

- `VITE_DIRECTORY_API_URL` - API endpoint URL
- `VITE_PROXY_API_URL` - Proxy API endpoint URL
- `VITE_ENABLE_IM` - Enable identity management features

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check if PostgreSQL container is running
docker compose ps

# View database logs
docker compose logs pact-directory-local-db

# Restart the database
docker compose restart pact-directory-local-db
```

#### Port Already in Use

```bash
# Check what's using port 3010
lsof -i :3010

# Kill the process if needed
kill -9 <PID>
```

#### Node.js Version Issues

```bash
# Check Node.js version
node --version

# If using nvm, switch to correct version
nvm use 20.9.0
```

#### bcrypt Build Issues (macOS)

```bash
# If you encounter bcrypt build issues on macOS
cd apps/api
npm rebuild bcrypt --build-from-source
```

### Reset Development Environment

```bash
# Stop all services
docker compose down

# Remove database volume (this will delete all data)
docker compose down -v

# Restart fresh
docker compose up -d
cd apps/api
pnpm run db:migrate
pnpm run db:add-user test@example.com "Test User" "testpassword" "administrator" "TestCompany" "test-company"
```

## API Endpoints

### Authentication

- `POST /api/directory/companies/signup` - Register organization
- `POST /api/directory/companies/login` - User login
- `POST /api/directory/companies/logout` - User logout
- `POST /api/directory/companies/forgot-password` - Request password reset
- `POST /api/directory/companies/reset-password` - Reset password

### Directory

- `GET /api/directory/companies` - List companies
- `GET /api/directory/companies/:id` - Get company details
- `POST /api/directory/companies/:id/connection-request` - Send connection request

### User Management

- `GET /api/directory/users/profile` - Get user profile
- `PUT /api/directory/users/profile` - Update user profile

### Proxy/Conformance

- `POST /api/proxy/test` - Run conformance test cases against a PACT solution
- `GET /api/proxy/test-results` - Get test results for a specific test run
- `GET /api/proxy/test-runs` - Get recent test runs for the authenticated user

## Conformance Testing Proxy Service

The API includes a proxy service that forwards requests to an external PACT conformance testing service, allowing organizations to test their PACT-compliant solutions directly through the Directory portal.

### Proxy Routes

The conformance proxy routes are located at `/api/proxy/*` and require JWT authentication. They test whether solutions properly implement the [PACT Tech Specs](https://wbcsd.github.io/data-exchange-protocol/v2/).

#### `POST /api/proxy/test`

Initiates conformance testing by validating the authenticated user/company, enriching the request with company information, and forwarding it to the external conformance service. Returns test run information.

#### `GET /api/proxy/test-results?testRunId=<id>`

Retrieves detailed test results for a specific test run, including pass/fail status for each test case.

#### `GET /api/proxy/test-runs`

Gets recent test runs for the authenticated user based on their email address.

### Configuration

Requires these environment variables:

- `RUN_TEST_CASES_URL` - External service URL for running test cases
- `TEST_RESULTS_URL` - External service URL for retrieving test results
- `RECENT_TEST_RUNS_URL` - External service URL for getting recent test runs

For local development, these URLs are typically left empty in `development.env`.

### Security & Error Handling

- All endpoints require JWT authentication and validate user/company relationships
- Returns appropriate HTTP status codes (400/404/500) for various error scenarios
- No sensitive credentials are logged or exposed

### Frontend Integration

The frontend uses these endpoints via `VITE_PROXY_API_URL` to initiate testing, display results, and show historical test runs. This proxy architecture centralizes authentication, authorization, and error handling while abstracting external service details from the frontend.

```

```
