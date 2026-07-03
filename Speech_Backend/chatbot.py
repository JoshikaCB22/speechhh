from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
import models, auth
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter(tags=["chatbot"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

# Each entry: (list of trigger phrases, response)
SPEECH_RULES = [
    (
        ["r sound", "improve r", "letter r", "pronounce r"],
        "To improve your R sound:\n1. Curl your tongue tip back slightly without touching the roof of your mouth\n2. Keep your lips slightly rounded\n3. Practice words: 'red', 'run', 'rabbit', 'butter'\n4. Say 'butter' slowly — the middle sound is great R practice"
    ),
    (
        ["s sound", "improve s", "letter s", "pronounce s", "lisp"],
        "For a clear S sound:\n1. Place your tongue tip just behind your upper front teeth\n2. Let air flow over the center of your tongue\n3. Keep your teeth slightly together\n4. Practice: 'sun', 'sea', 'sister', 'snake'"
    ),
    (
        ["th sound", "pronounce th", "th words"],
        "The TH sound has two forms:\n- Voiced: 'the', 'this', 'that'\n- Unvoiced: 'think', 'three', 'thumb'\nPlace your tongue lightly between your teeth and blow air gently."
    ),
    (
        ["l sound", "improve l", "letter l", "pronounce l"],
        "For the L sound:\n1. Touch your tongue tip to the ridge just behind your upper front teeth\n2. Let air flow around the sides of your tongue\n3. Practice: 'light', 'love', 'little', 'yellow'"
    ),
    (
        ["p sound", "b sound", "p and b", "pronounce p", "pronounce b"],
        "P and B are lip sounds. P is unvoiced, B is voiced.\n1. Press lips together firmly\n2. Release with a small burst of air\n3. Practice minimal pairs: 'pat/bat', 'pin/bin', 'cup/cub'"
    ),
    (
        ["stutter", "stuttering", "stammer", "stammering"],
        "For stuttering:\n1. Slow down your speech rate\n2. Use easy onset — start words gently\n3. Practice diaphragmatic breathing\n4. Pause before difficult words\n5. Read aloud daily for 10 minutes\nConsistency is key — progress takes time."
    ),
    (
        ["tongue twister", "tongue twisters"],
        "Great tongue twisters to practice:\n1. 'She sells seashells by the seashore' (S sound)\n2. 'Red lorry, yellow lorry' (R/L sounds)\n3. 'Peter Piper picked a peck' (P sound)\n4. 'How much wood would a woodchuck chuck' (W sound)\nStart slow, then gradually speed up!"
    ),
    (
        ["what is a phoneme", "what are phonemes", "phoneme", "phonemes"],
        "A phoneme is the smallest unit of sound in a language.\nFor example, 'cat' has 3 phonemes: /k/ /æ/ /t/\nEnglish has about 44 phonemes. Understanding phonemes helps identify exactly which sounds need improvement in your speech."
    ),
    (
        ["how long", "how many minutes", "daily practice", "practice every day", "practice routine"],
        "Recommended daily practice:\n1. 10-15 minutes of focused practice beats 1 hour occasionally\n2. Morning practice when your voice is fresh works best\n3. Record yourself to track progress\n4. Mix word practice with sentence practice\n5. Use different difficulty levels in the app"
    ),
    (
        ["articulation", "articulation exercises", "mouth exercises"],
        "Articulation warm-up exercises:\n1. Lip trills — blow air through closed lips\n2. Tongue stretches — extend tongue up, down, left, right\n3. Jaw stretches — open wide, hold 5 seconds\n4. Cheek puffs — inflate cheeks, hold, release\nDo these before every practice session!"
    ),
    (
        ["fluency", "speak fluently", "smooth speech", "flow"],
        "To improve fluency:\n1. Read aloud every day\n2. Practice at a comfortable pace — don't rush\n3. Use pausing strategically between phrases\n4. Sing songs — it naturally improves rhythm\n5. Shadow native speakers by repeating after audio"
    ),
    (
        ["vowel", "vowels", "vowel sounds"],
        "For clear vowels:\n1. Open your mouth more than you think you need to\n2. Key vowels to practice: /iː/ (see), /ɪ/ (sit), /e/ (bed), /æ/ (cat), /ɑː/ (car)\n3. Exaggerate vowels in slow practice, then normalize at speed"
    ),
    (
        ["breathing", "breath control", "run out of breath", "breath support"],
        "Proper breathing for speech:\n1. Breathe from your diaphragm, not your chest\n2. Take a breath before starting a sentence\n3. Don't run out of air mid-sentence — pause and breathe\n4. Exercise: inhale for 4 counts, speak for 8 counts"
    ),
    (
        ["warm up", "warmup", "before practice", "voice warm"],
        "Great warm-up routine before practice:\n1. Lip trills for 30 seconds\n2. Tongue stretches (up, down, left, right)\n3. Jaw stretches — open wide, hold 5 seconds\n4. Hum a simple tune to warm your voice\n5. Say 'ma-me-mi-mo-mu' slowly 3 times\nThen jump into your practice session!"
    ),
    (
        ["child", "children", "kid", "toddler", "baby"],
        "For children's speech therapy:\n1. Keep sessions short — 5-10 minutes for young children\n2. Make it a game — celebrate every attempt\n3. Use picture books and name objects aloud\n4. Sing nursery rhymes together\n5. Never correct harshly — model the correct sound naturally\n6. Consistency matters more than duration"
    ),
    (
        ["score", "accuracy", "how did i do", "my result", "my progress"],
        "Your scores are tracked in the Dashboard and History pages.\n- 80%+ is great pronunciation\n- 60-79% is good, keep practicing\n- Below 60% means focus on that specific sound\n\nTip: Use the 🔊 Listen button before recording to hear the correct pronunciation first!"
    ),
    (
        ["improve", "get better", "tips to improve", "how to improve"],
        "Top tips to improve your pronunciation:\n1. Practice daily — even 10 minutes makes a difference\n2. Use 🔊 Listen to hear correct pronunciation before recording\n3. Start with Beginner words and work up to Advanced\n4. Review your phoneme analysis after each session\n5. Try tongue twisters for fun warm-ups\n\nWhat specific sound would you like to work on?"
    ),
]

def get_reply(message: str) -> str:
    msg = message.lower().strip()

    # Greeting
    if any(msg.startswith(w) or msg == w for w in ["hi", "hello", "hey"]):
        return "Hello! I'm SpeechCare AI 🗣️\nI can help you with pronunciation tips, speech exercises, phonemes, fluency, and more.\nWhat would you like to work on today?"

    # Thanks
    if any(w in msg for w in ["thank you", "thanks", "great help", "that helped"]):
        return "You're welcome! Keep up the great work. Consistency is the key to improvement. Feel free to ask anything else! 🎯"

    # Goodbye
    if any(w in msg for w in ["bye", "goodbye", "see you", "take care"]):
        return "Goodbye! Keep practicing and you'll see great improvement. Come back anytime! 🗣️"

    # Match against rules using full phrase matching
    for triggers, response in SPEECH_RULES:
        for trigger in triggers:
            if trigger in msg:
                return response

    # Fallback
    return (
        "I can help with:\n"
        "- Specific sounds: 'How do I improve my R sound?'\n"
        "- Exercises: 'Give me articulation exercises'\n"
        "- Routines: 'What is a good warm-up routine?'\n"
        "- Concepts: 'What is a phoneme?'\n"
        "- Fluency: 'How do I stop stuttering?'\n\n"
        "What would you like to work on?"
    )

@router.post("/api/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    reply = get_reply(request.message)
    return {"reply": reply}
