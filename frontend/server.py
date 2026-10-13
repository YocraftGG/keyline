"""Compatibility launcher for the Vite React development server."""

import shutil
import subprocess
import sys
from pathlib import Path


if __name__ == "__main__":
    if shutil.which("npm") is None:
        raise SystemExit("Node.js and npm are required. Install Node.js, then run `npm install` here.")
    if not (Path(__file__).parent / "node_modules").exists():
        raise SystemExit("Frontend packages are missing. Run `npm install` in the frontend folder first.")
    raise SystemExit(subprocess.call(["npm", "run", "dev"], cwd=Path(__file__).parent))
