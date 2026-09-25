"""Root-level app wrapper to expose FastAPI app for Render"""
import sys
import os
from pathlib import Path

# Dynamically add Speech_Backend to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Speech_Backend')
sys.path.insert(0, backend_path)

# Now import from the backend
from main import app

__all__ = ['app']


