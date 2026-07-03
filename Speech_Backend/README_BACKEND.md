# Speech Therapy Backend API

FastAPI backend with JWT authentication for speech therapy application.

## Tech Stack

- FastAPI - Modern Python web framework
- SQLite - Lightweight database
- JWT - JSON Web Tokens for authentication
- Pydantic - Data validation
- Passlib - Password hashing

## Project Setup

### 1. Create Virtual Environment

```bash
# Navigate to project directory
cd "Intelligent Agent"

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (bash)
source venv/Scripts/activate

# On Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# On Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart sqlalchemy pydantic-settings
```

### 3. Run the Application

```bash
# Start the server
uvicorn main:app --reload

# Server will run at: http://127.0.0.1:8000
# API Documentation: http://127.0.0.1:8000/docs
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user details | Yes |

### Request/Response Examples

#### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-03-01T10:30:00"
}
```

#### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Request Body (form-data):**
```
username: johndoe
password: SecurePass123!
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe"
  }
}
```

#### 3. Get User Details

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-03-01T10:30:00"
}
```

#### 4. Logout User

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

## Postman Testing Guide

### Setup

1. **Import Collection**
   - Open Postman
   - Create new collection: "Speech Therapy API"
   - Set base URL variable: `{{base_url}}` = `http://127.0.0.1:8000`

2. **Create Environment**
   - Add variable: `base_url` = `http://127.0.0.1:8000`
   - Add variable: `access_token` (leave empty, will be set automatically)

### Testing Flow

#### Step 1: Register User

1. Create new request: `Register User`
2. Method: `POST`
3. URL: `{{base_url}}/api/auth/register`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!",
  "full_name": "Test User"
}
```
6. Send request
7. Expected: 201 Created

#### Step 2: Login User

1. Create new request: `Login User`
2. Method: `POST`
3. URL: `{{base_url}}/api/auth/login`
4. Body (x-www-form-urlencoded):
   - `username`: `testuser`
   - `password`: `Test123!`
5. Send request
6. **Save token**: In Tests tab, add:
```javascript
var jsonData = pm.response.json();
pm.environment.set("access_token", jsonData.access_token);
```
7. Expected: 200 OK with access_token

#### Step 3: Get User Details

1. Create new request: `Get User Details`
2. Method: `GET`
3. URL: `{{base_url}}/api/auth/me`
4. Authorization tab:
   - Type: `Bearer Token`
   - Token: `{{access_token}}`
5. Send request
6. Expected: 200 OK with user details

#### Step 4: Logout User

1. Create new request: `Logout User`
2. Method: `POST`
3. URL: `{{base_url}}/api/auth/logout`
4. Authorization tab:
   - Type: `Bearer Token`
   - Token: `{{access_token}}`
5. Send request
6. Expected: 200 OK

### Error Testing

Test these scenarios:

1. **Duplicate Registration**
   - Register same user twice
   - Expected: 400 Bad Request

2. **Invalid Login**
   - Wrong password
   - Expected: 401 Unauthorized

3. **Unauthorized Access**
   - Access `/api/auth/me` without token
   - Expected: 401 Unauthorized

4. **Invalid Token**
   - Use expired/invalid token
   - Expected: 401 Unauthorized

## Database

- Database file: `speech_therapy.db`
- Auto-created on first run
- Tables: `users`, `token_blacklist`

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Token blacklist for logout
- Protected endpoints
- Input validation with Pydantic

## Project Structure

```
Intelligent Agent/
├── main.py                 # FastAPI application entry point
├── models.py              # SQLAlchemy database models
├── schemas.py             # Pydantic schemas
├── auth.py                # Authentication logic
├── database.py            # Database configuration
├── speech_therapy.db      # SQLite database (auto-generated)
└── README_BACKEND.md      # This file
```

## Next Steps

Once you confirm, I'll generate:
- `main.py` - FastAPI app with routes
- `models.py` - Database models
- `schemas.py` - Request/response schemas
- `auth.py` - JWT authentication utilities
- `database.py` - Database setup

## Notes

- Default token expiration: 30 minutes
- Change `SECRET_KEY` in production
- Use environment variables for sensitive data
- Consider PostgreSQL for production
