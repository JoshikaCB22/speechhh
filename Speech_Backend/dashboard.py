from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import models, auth
from database import get_db

router = APIRouter(tags=["dashboard"])

@router.get("/api/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    uid = current_user.id
    sessions = db.query(models.PracticeSession).filter(models.PracticeSession.user_id == uid).all()

    total = len(sessions)
    avg_score = round(sum(s.score for s in sessions) / total) if total else 0
    best_score = max((s.score for s in sessions), default=0)

    # Weekly scores (last 7 days)
    today = datetime.utcnow().date()
    weekly = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_sessions = [s for s in sessions if s.created_at.date() == day]
        avg = round(sum(s.score for s in day_sessions) / len(day_sessions)) if day_sessions else 0
        weekly.append({"day": day.strftime("%a"), "score": avg, "sessions": len(day_sessions)})

    # Streak
    streak = 0
    check = today
    while True:
        day_sessions = [s for s in sessions if s.created_at.date() == check]
        if day_sessions:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    # XP and level
    total_xp = sum(s.score for s in sessions)
    level = max(1, total_xp // 200 + 1)

    # Recent sessions (last 5)
    recent = sorted(sessions, key=lambda s: s.created_at, reverse=True)[:5]
    recent_data = [
        {"id": s.id, "word": s.target_word, "score": s.score,
         "level": s.level, "created_at": s.created_at.isoformat() if s.created_at else ""}
        for s in recent
    ]

    return {
        "total_sessions": total,
        "avg_score": avg_score,
        "best_score": best_score,
        "current_streak": streak,
        "weekly_scores": weekly,
        "total_xp": total_xp,
        "level": level,
        "recent_sessions": recent_data,
    }
