import os
import json
import tempfile
import nltk
import whisper
from nltk.corpus import cmudict
from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from difflib import SequenceMatcher

import models
import auth
from database import get_db

nltk.download('cmudict', quiet=True)

router = APIRouter(prefix="/api/practice", tags=["practice"])

# Load once at startup
_whisper_model = None
_cmu_dict = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model("base")
    return _whisper_model

def get_cmu():
    global _cmu_dict
    if _cmu_dict is None:
        _cmu_dict = cmudict.dict()
    return _cmu_dict


def get_phonemes(word: str):
    d = get_cmu()
    word = word.lower().strip()
    if word in d:
        return d[word][0]
    return []


def phoneme_accuracy(ref: list, spoken: list) -> float:
    if not ref:
        return 0.0
    matches = sum(1 for a, b in zip(ref, spoken) if a == b)
    return round((matches / len(ref)) * 100, 2)


def string_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


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


def build_tips(ref_phonemes: list, spoken_phonemes: list) -> list:
    tips = []
    for i, (r, s) in enumerate(zip(ref_phonemes, spoken_phonemes)):
        if r != s:
            tips.append(f"Phoneme {i+1}: expected '{r}', heard '{s}'")
        if len(tips) >= 3:
            break
    return tips


@router.post("/analyze")
async def analyze_pronunciation(
    audio: UploadFile = File(...),
    word: str = Form(...),
    level: str = Form("beginner"),
    transcript_hint: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    # Save uploaded audio to a temp file
    suffix = ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        whisper_model = get_whisper()

        # Transcribe with Whisper
        result = whisper_model.transcribe(tmp_path, language="en")
        transcribed = result.get("text", "").strip()

        # Fall back to browser transcript hint if Whisper returns empty
        if not transcribed and transcript_hint:
            transcribed = transcript_hint

        target = word.strip()
        target_words = target.lower().split()
        transcribed_words = transcribed.lower().split()

        # --- Phoneme analysis ---
        ref_phonemes = []
        spoken_phonemes = []

        for tw in target_words:
            ref_phonemes.extend(get_phonemes(tw))

        for sw in transcribed_words:
            spoken_phonemes.extend(get_phonemes(sw))

        phoneme_score = phoneme_accuracy(ref_phonemes, spoken_phonemes) if ref_phonemes else 0.0

        # --- String similarity score ---
        sim_score = string_similarity(target, transcribed) * 100

        # --- Weighted final score ---
        if ref_phonemes and spoken_phonemes:
            final_score = round(phoneme_score * 0.7 + sim_score * 0.3)
        else:
            # No phonemes found — rely on string similarity only
            final_score = round(sim_score)

        final_score = max(0, min(100, final_score))

        feedback = build_feedback(final_score, target, transcribed)
        tips = build_tips(ref_phonemes, spoken_phonemes)

        # --- Save session to DB ---
        session = models.PracticeSession(
            user_id=current_user.id,
            target_word=target,
            transcribed_word=transcribed,
            score=final_score,
            level=level,
            feedback=feedback,
            phoneme_details=json.dumps({
                "ref_phonemes": ref_phonemes,
                "spoken_phonemes": spoken_phonemes,
                "tips": tips,
            }),
        )
        db.add(session)
        db.commit()

        # --- Check achievements ---
        new_achievements = check_achievements(db, current_user.id, final_score)

        return {
            "score": final_score,
            "transcribed": transcribed,
            "feedback": feedback,
            "phoneme_details": {
                "ref_phonemes": ref_phonemes,
                "spoken_phonemes": spoken_phonemes,
                "tips": tips,
            },
            "new_achievements": new_achievements,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
    finally:
        os.unlink(tmp_path)


def check_achievements(db: Session, user_id: int, score: int) -> list:
    """Check and award achievements based on practice history."""
    sessions = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == user_id
    ).all()

    total = len(sessions)
    awarded = []

    existing = {a.name for a in db.query(models.Achievement).filter(
        models.Achievement.user_id == user_id
    ).all()}

    def award(name):
        if name not in existing:
            db.add(models.Achievement(user_id=user_id, name=name))
            awarded.append(name)

    if total >= 1:
        award("First Practice")
    if total >= 10:
        award("10 Sessions")
    if total >= 50:
        award("50 Sessions")
    if score >= 90:
        award("Pronunciation Pro")
    if score == 100:
        award("Perfect Score")

    high_scores = [s for s in sessions if s.score >= 80]
    if len(high_scores) >= 5:
        award("Consistent Performer")

    if awarded:
        db.commit()

    return awarded
