# Keyline frontend

The typing screen (`/`), registration (`/register`), login (`/login`), stats (`/profile`), test history (`/history`), and leaderboard (`/leaderboard`) are React screens bundled with Vite. They keep the existing API routes and visual styles. Registration creates the account, signs the user in, and redirects to `/`; login redirects there after success. Both flows store the bearer token in `sessionStorage` for the current browser tab as `keyline_access_token`. The theme follows the operating system preference by default and remembers a manual choice in browser storage.
    
## Run locally on Windows

Install Python and Node.js 22.12 or newer. From the project root, prepare the local environment once:

```powershell
py -m venv backend\venv
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item .env.example .env
cd frontend
npm install
```

Fill in the root `.env` with the MySQL connection and a private `JWT_SECRET_KEY`. Gmail SMTP settings are optional; if configured, use a Gmail app password. MySQL must be running. For a one-click local start, run `start_app.bat` from the project root. It seeds any new passages, then opens the backend and Vite frontend in separate terminal windows.

Start the backend in one PowerShell terminal:

```powershell
cd backend/app
..\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Passages are kept in `backend/app/seed_data/sentences.json` and are not inserted during app startup. To add missing passages from that file to the database, run this once from the project root (and again after adding more entries):

```powershell
backend\venv\Scripts\python backend\app\seed_sentences.py
```

The seeder creates the database and tables if needed, skips passages whose exact text is already present, and can safely be rerun.

Start the React frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open <http://127.0.0.1:5173> to practice, `/register` to create an account, `/login` to sign in, `/profile` for stats, `/history` for saved tests, or `/leaderboard` for rankings. The API address defaults to `http://localhost:8000`; edit the `window.KEYLINE_API_URL` value in `index.html` if your backend uses another address.

The FastAPI interactive API reference is available at <http://127.0.0.1:8000/docs> while the backend is running.

The typing screen loads passages from `GET /sentences/random?difficulty=...` and submits finished results to `POST /tests` with the saved bearer token. It calculates WPM, accuracy, character count, errors, duration, and mistake counts by letter and adjacent letter pair. Corrected typos still count toward total errors and help Adaptive focus practice learn which letters or pairs need work. Signed-in users can choose Adaptive focus; it uses recent saved tests and Datamuse to build a passage, while guests can use random practice. Adaptive requests fall back to a regular passage when there is no useful mistake history or the word API is unavailable. The practice screen also has options to ignore uppercase letters and punctuation; these preferences are saved in browser storage and apply to the displayed passage.

Stats use `GET /auth/me`, `GET /users/me/stats`, and `GET /tests`; test history uses `GET /tests`; leaderboard uses `GET /users/leaderboard`. The stats endpoints and leaderboard accept an optional `difficulty` query (`easy`, `medium`, or `hard`); omitting it includes all levels. The leaderboard returns up to 50 usernames ranked by average WPM. Practice days and streaks use the MySQL server's calendar date (`DATE(created_at)` / `CURRENT_DATE()`), so configure the database server timezone to the calendar you want streaks to follow.
