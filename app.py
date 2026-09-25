"""Root-level app wrapper to expose FastAPI app for Render"""
import sys
import os

# Add Speech_Backend to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Speech_Backend'))

from main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
