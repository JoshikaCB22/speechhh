from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, auth
from database import get_db

router = APIRouter(tags=["achievements"])

ALL_ACHIEVEMENTS = [
    {"id": "first_practice",     "title": "First Steps",          "description": "Complete your first practice session",       "icon": "🎯", "xp": 10,  "category": "milestone", "required_sessions": 1,  "required_score": 0},
    {"id": "sessions_10",        "title": "Getting Started",      "description": "Complete 10 practice sessions",              "icon": "🔟", "xp": 25,  "category": "milestone", "required_sessions": 10, "required_score": 0},
    {"id": "sessions_50",        "title": "Dedicated Learner",    "description": "Complete 50 practice sessions",              "icon": "💪", "xp": 100, "category": "milestone", "required_sessions": 50, "required_score": 0},
    {"id": "sessions_100",       "title": "Century Club",         "description": "Complete 100 practice sessions",             "icon": "💯", "xp": 200, "category": "milestone", "required_sessions": 100,"required_score": 0},
    {"id": "score_80",           "title": "Sharp Speaker",        "description": "Score 80% or above in a session",            "icon": "🌟", "xp": 20,  "category": "score",     "required_sessions": 0,  "required_score": 80},
    {"id": "score_90",           "title": "Pronunciation Pro",    "description": "Score 90% or above in a session",            "icon": "🏅", "xp": 50,  "category": "score",     "required_sessions": 0,  "required_score": 90},
    {"id": "perfect_score",      "title": "Perfect Score",        "description": "Achieve a perfect 100% score",               "icon": "🏆", "xp": 100, "category": "score",     "required_sessions": 0,  "required_score": 100},
    {"id": "consistent",         "title": "Consistent Performer", "description": "Score 80%+ in 5 different sessions",         "icon": "📈", "xp": 75,  "category": "skill",     "required_sessions": 0,  "required_score": 0},
    {"id": "streak_3",           "title": "3-Day Streak",         "description": "Practice 3 days in a row",                   "icon": "🔥", "xp": 30,  "category": "streak",    "required_sessions": 0,  "required_score": 0},
    {"id": "streak_7",           "title": "Week Warrior",         "description": "Practice 7 days in a row",                   "icon": "⚡", "xp": 70,  "category": "streak",    "required_sessions": 0,  "required_score": 0},
    {"id": "advanced_word",      "title": "Advanced Speaker",     "description": "Complete an advanced level session",         "icon": "🎓", "xp": 40,  "category": "skill",     "required_sessions": 0,  "required_score": 0},
    {"id": "sentence_master",    "title": "Sentence Master",      "description": "Complete a sentences level session",         "icon": "📝", "xp": 40,  "category": "skill",     "required_sessions": 0,  "required_score": 0},
]

def compute_streak(sessions):
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    streak = 0
    check = today
    while True:
        day_s = [s for s in sessions if s.created_at.date() == check]
        if day_s:
            streak += 1
            check -= timedelta(days=1)
        else:
            break
    return streak

@router.get("/api/achievements")
def get_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    uid = current_user.id
    sessions = db.query(models.PracticeSession).filter(models.PracticeSession.user_id == uid).all()
    earned_db = {a.name: a for a in db.query(models.Achievement).filter(models.Achievement.user_id == uid).all()}

    total = len(sessions)
    high_scores = [s for s in sessions if s.score >= 80]
    streak = compute_streak(sessions)
    total_xp = sum(s.score for s in sessions)
    level = max(1, total_xp // 200 + 1)

    result = []
    for a in ALL_ACHIEVEMENTS:
        earned = a["id"] in earned_db
        earned_at = earned_db[a["id"]].earned_at.isoformat() if earned else None

        # Compute progress %
        if a["required_sessions"] > 0:
            progress = min(100, round(total / a["required_sessions"] * 100))
        elif a["required_score"] > 0:
            best = max((s.score for s in sessions), default=0)
            progress = min(100, round(best / a["required_score"] * 100))
        elif a["id"] == "consistent":
            progress = min(100, round(len(high_scores) / 5 * 100))
        elif a["id"] == "streak_3":
            progress = min(100, round(streak / 3 * 100))
        elif a["id"] == "streak_7":
            progress = min(100, round(streak / 7 * 100))
        elif a["id"] == "advanced_word":
            has = any(s.level == "advanced" for s in sessions)
            progress = 100 if has else 0
        elif a["id"] == "sentence_master":
            has = any(s.level == "sentences" for s in sessions)
            progress = 100 if has else 0
        else:
            progress = 100 if earned else 0

        # Auto-award if progress is 100 and not yet earned
        if progress == 100 and not earned:
            db.add(models.Achievement(user_id=uid, name=a["id"]))
            db.commit()
            earned = True
            earned_at = None

        result.append({**a, "earned": earned, "earned_at": earned_at, "progress": progress})

    return {"achievements": result, "total_xp": total_xp, "level": level}
