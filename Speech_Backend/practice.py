import os
import json
import tempfile
from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from difflib import SequenceMatcher

import models
import auth
from database import get_db

router = APIRouter(prefix="/api/practice", tags=["practice"])

def build_feedback(score: int, target: str, transcribed: str) -> str:
    if score >= 92:
        return f"Outstanding! Your pronunciation of '{target}' is excellent."
    elif score >= 80:
        return f"Great job! '{target}' sounds very clear. Minor refinements can make it perfect."
    elif score >= 65:
        return f"Good attempt on '{target}'. Focus on each syllable carefully."
    elif score >= 40:
        if transcribed and transcribed.lower() != target.lower():
            return f"You said '{transcribed}' but the target was '{target}'. Try listening to the word first and repeat slowly."
        return f"Keep practicing '{target}'. Break it into syllables and practice each part."
    else:
        return f"'{target}' needs more practice. Press 🔊 Listen to hear the correct pronunciation, then try again."


@router.post("/analyze")
async def analyze_pronunciation(
    audio: UploadFile = File(...),
    word: str = Form(...),
    level: str = Form("beginner"),
    transcript_hint: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    """Analyze pronunciation - Simplified version without Whisper due to dependency issues"""
    
    # For now, use the transcript_hint provided by the frontend
    # In production, you would use Whisper to transcribe the audio
    transcribed = transcript_hint.strip() if transcript_hint else ""
    
    if not transcribed:
        raise HTTPException(status_code=400, detail="Please provide audio transcription")
    
    target = word.strip()
    
    # Calculate string similarity score
    sim_score = SequenceMatcher(None, target.lower(), transcribed.lower()).ratio() * 100
    final_score = max(0, min(100, round(sim_score)))
    
    feedback = build_feedback(final_score, target, transcribed)
    
    # --- Save session to DB ---
    session = models.PracticeSession(
        user_id=current_user.id,
        target_word=target,
        transcribed_word=transcribed,
        score=final_score,
        level=level,
        feedback=feedback,
        phoneme_details=json.dumps({
            "note": "Simplified version - Whisper transcription not available due to dependency issues"
        }),
    )
    db.add(session)
    db.commit()
    
    return {
        "score": final_score,
        "transcribed": transcribed,
        "feedback": feedback,
        "phoneme_details": {
            "tips": ["Practice with the provided audio", "Focus on clear pronunciation"],
        },
        "new_achievements": [],
    }
