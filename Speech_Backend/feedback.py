from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import json
import models, auth
from database import get_db

router = APIRouter(tags=["feedback"])

@router.get("/api/feedback/recent")
def get_recent_feedback(
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    sessions = (
        db.query(models.PracticeSession)
        .filter(models.PracticeSession.user_id == current_user.id)
        .order_by(models.PracticeSession.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        # Parse phoneme_details from JSON string to object
        phoneme_details = None
        if s.phoneme_details:
            try:
                phoneme_details = json.loads(s.phoneme_details)
            except Exception:
                phoneme_details = None

        result.append({
            "id": s.id,
            "word": s.target_word,
            "transcribed": s.transcribed_word,
            "score": s.score,
            "level": s.level,
            "feedback": s.feedback,
            "phoneme_details": phoneme_details,
            "duration_seconds": s.duration_seconds or 0,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        })

    return result
