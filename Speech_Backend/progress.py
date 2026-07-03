from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models, auth
from database import get_db

router = APIRouter(tags=["progress"])

@router.get("/api/progress")
def get_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    sessions = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id
    ).all()

    total = len(sessions)
    avg_score = round(sum(s.score for s in sessions) / total) if total else 0
    best_score = max((s.score for s in sessions), default=0)
    unique_words = len({s.target_word.lower() for s in sessions})

    # Streak
    today = datetime.utcnow().date()
    streak = 0
    check = today
    while True:
        if any(s.created_at.date() == check for s in sessions):
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    # Weekly (last 7 days)
    weekly = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_s = [s for s in sessions if s.created_at.date() == day]
        avg = round(sum(s.score for s in day_s) / len(day_s)) if day_s else 0
        weekly.append({"day": day.strftime("%a"), "score": avg})

    # Monthly (last 4 weeks)
    monthly = []
    for i in range(3, -1, -1):
        start = today - timedelta(weeks=i+1)
        end = today - timedelta(weeks=i)
        week_s = [s for s in sessions if start <= s.created_at.date() < end]
        monthly.append({
            "week": f"W{4-i}",
            "sessions": len(week_s),
            "avg_score": round(sum(s.score for s in week_s) / len(week_s)) if week_s else 0
        })

    # Skill scores by level
    levels = ["beginner", "intermediate", "advanced", "sentences"]
    skill_scores = {}
    for lvl in levels:
        lvl_s = [s for s in sessions if s.level == lvl]
        skill_scores[lvl] = round(sum(s.score for s in lvl_s) / len(lvl_s)) if lvl_s else 0

    return {
        "summary": {
            "total_sessions": total,
            "avg_score": avg_score,
            "best_score": best_score,
            "total_words": unique_words,
            "streak": streak,
        },
        "weekly": weekly,
        "monthly": monthly,
        "skill_scores": skill_scores,
    }
