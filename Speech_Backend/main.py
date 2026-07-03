from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import models
import schemas
import auth
from database import engine, get_db
from practice import router as practice_router
from dashboard import router as dashboard_router
from sessions import router as sessions_router
from achievements import router as achievements_router
from progress import router as progress_router
from chatbot import router as chatbot_router
from auth import profile_router
from feedback import router as feedback_router

models.Base.metadata.create_all(bind=engine)

# Safe migrations — adds missing columns without dropping data
def run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE practice_sessions ADD COLUMN phoneme_details TEXT DEFAULT ''",
            "ALTER TABLE practice_sessions ADD COLUMN duration_seconds INTEGER DEFAULT 0",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists

run_migrations()

app = FastAPI(
    title="Speech Therapy API",
    description="Backend API for Speech Therapy Application with JWT Authentication",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(practice_router)
app.include_router(dashboard_router)
app.include_router(sessions_router)
app.include_router(achievements_router)
app.include_router(progress_router)
app.include_router(chatbot_router)
app.include_router(profile_router)
app.include_router(feedback_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Speech Therapy API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    db_user = auth.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def get_user_details(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return current_user

@app.post("/api/auth/logout", response_model=schemas.LogoutResponse)
async def logout_user(
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    auth.blacklist_token(db, token)
    return {"message": "Successfully logged out"}
