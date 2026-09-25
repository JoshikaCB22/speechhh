"""Root-level app wrapper to expose FastAPI app for Render"""
import sys
import os
from pathlib import Path

# Get the root directory
root_dir = Path(__file__).parent
backend_dir = root_dir / 'Speech_Backend'

# Add Speech_Backend to Python path
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import the FastAPI app from Speech_Backend/main.py
try:
    from main import app
except ImportError as e:
    print(f"Error importing main app: {e}")
    print(f"Python path: {sys.path}")
    print(f"Backend dir: {backend_dir}")
    print(f"Backend dir exists: {backend_dir.exists()}")
    if backend_dir.exists():
        print(f"Files in backend dir: {list(backend_dir.iterdir())}")
    raise

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

