# CareBridge - AI-Powered Integrated Health Card and Intelligent Healthcare Management System

A full-stack healthcare management web application (college project demonstration) with:

- **Patients**: digital health card with a revocable QR code, medical records, appointment booking and cancellation, AI health assistant, profile settings.
- **Doctors**: assigned appointments, status updates, consultation notes and prescriptions, and access to patient records **only when authorized**.
- **Administrators**: system statistics, patient and doctor account management, appointment oversight and an activity log. The admin console never shows passwords or medical records.

> **Synthetic data only.** Do not enter real patient information.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, shadcn/ui, lucide-react icons, qrcode.react (Create React App via CRACO - see the note on Vite below) |
| Backend | Python 3.11, FastAPI, Pydantic v2, Motor (async MongoDB) |
| Database | MongoDB Atlas (or local MongoDB for development) |
| Auth | Email + password, bcrypt hashing, JWT bearer tokens, role-based access (patient / doctor / admin), brute-force lockout |
| AI | Modular `services/ai_service.py` (provider + model + key from env vars). Shows a clear **Demo mode** when no key is configured |
| Tests | pytest + mongomock-motor (backend), Jest (frontend) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`) |
| Hosting | Render (free web service + free static site) - no AWS needed |

> **Note on Vite:** the brief asked for Vite. This project uses Create React App (CRACO) because the live preview environment it was built in runs on CRA. Every API URL comes from `REACT_APP_BACKEND_URL`. To migrate later: `yarn add -D vite @vitejs/plugin-react`, move `public/index.html` to the project root with `<script type="module" src="/src/index.js">`, rename `REACT_APP_BACKEND_URL` to `VITE_BACKEND_URL`, and read it via `import.meta.env.VITE_BACKEND_URL` in `src/lib/api.js`.

---

## Project structure

```
/
├── backend/
│   ├── server.py              # FastAPI app: routers, CORS, startup (indexes + seed)
│   ├── models.py              # Pydantic request validation models
│   ├── seed.py                # Admin seeding + optional synthetic demo data
│   ├── core/
│   │   ├── database.py        # Mongo client (mongomock when TESTING=1) + indexes
│   │   ├── security.py        # bcrypt, JWT, get_current_user, require_roles
│   │   └── utils.py           # ids, timestamps, activity log, doctor-access check
│   ├── routers/               # auth, users, health_card, doctors, appointments, records, ai, admin
│   ├── services/ai_service.py # Provider-agnostic AI service + demo mode + safety rules
│   ├── tests/                 # pytest suite (25 tests)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js             # Routes (role-guarded)
│   │   ├── lib/               # api client, formatting helpers (+ Jest test), useFetch hook
│   │   ├── context/           # AuthContext
│   │   ├── components/        # Layout (sidebar + topbar), shared UI, shadcn/ui
│   │   └── pages/             # landing, auth, patient/, doctor/, admin/, assistant, profile, status pages
│   ├── Dockerfile, nginx.conf
│   └── .env.example
├── .github/workflows/         # ci.yml (tests + build), deploy.yml (Render deploy hooks after CI passes)
├── docker-compose.yml         # Local dev: mongo + backend + frontend
├── render.yaml                # Render blueprint (optional)
├── .env.example               # All variable names with placeholders
└── README.md
```

Backend tests live in `backend/tests/` so they run against the backend package directly.

---

## Pages

| # | Page | Route | Role |
|---|------|-------|------|
| 1 | Landing | `/` | Public |
| 2 | Registration | `/register` | Public (creates patient accounts) |
| 3 | Login | `/login` | Public |
| 4 | Patient dashboard | `/patient` | Patient |
| 5 | Digital health card | `/patient/health-card` | Patient |
| 6 | Medical records | `/patient/records` | Patient |
| 7 | Appointment booking | `/patient/book` | Patient |
| 8 | Appointment history | `/patient/appointments` | Patient |
| 9 | AI healthcare assistant | `/assistant` | Patient, Doctor |
| 10 | Doctor dashboard | `/doctor` | Doctor |
| 11 | Doctor appointment management | `/doctor/appointments` (+ `/doctor/patients/:id`) | Doctor |
| 12 | Administrator dashboard | `/admin` | Admin |
| 13 | Profile & settings | `/profile` | All signed-in users |
| 14 | Unauthorized / Not found | `/unauthorized`, any unknown URL | Public |
| + | QR verification | `/card/verify/:token` | Public (shows only first name, last initial and patient ID) |

## Security and privacy design

- Passwords are hashed with bcrypt and never returned by any API. Login failures return a generic "Invalid email or password". Five failed attempts lock that IP + email for 15 minutes.
- JWT bearer tokens are signed with `JWT_SECRET` and expire after `JWT_EXPIRE_HOURS`. Every protected route re-loads the user from the database, so disabled accounts are rejected immediately.
- **Every rule is enforced on the backend** with `require_roles(...)` and ownership checks. Hiding pages in the frontend is only a convenience.
- **Doctor access rule:** by default, a doctor can read or add records for a patient only if that patient has a pending, confirmed or completed appointment with that doctor. The patient can override this per doctor from **Health Card → Who can see my records**. Granting gives access without an appointment. Revoking removes access even when an appointment exists, and a new booking does not restore it. Admins cannot read medical records.
- **Document uploads:** PDF, PNG, JPEG and WEBP files up to 10 MB. The file type is checked from the file contents, not just the extension. Files are stored privately and served only through `GET /api/records/files/{id}` to the owning patient or an authorized doctor.
- **QR code:** contains only `https://<frontend>/card/verify/<random token>`. The token is revocable: "Revoke & reissue QR" invalidates the old code immediately. No medical data is encoded.
- Registration always creates a `patient`. Doctor accounts are created by an admin.
- Activity logs store action names only, never medical content, passwords or tokens. AI errors are logged without the user's message.

## API overview (Swagger UI at `/api/docs`)

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Profile | `PUT /api/users/me`, `POST /api/users/me/password` |
| Health card | `GET/PUT /api/health-card/me`, `POST /api/health-card/me/regenerate-qr`, `GET /api/health-card/verify/{token}`, `GET /api/health-card/patient/{id}` (authorized doctor) |
| Doctors | `GET /api/doctors`, `GET /api/doctors/{id}`, `GET /api/doctors/{id}/slots?date=YYYY-MM-DD`, `PUT /api/doctors/me`, `GET /api/doctors/me/patients` |
| Appointments | `POST /api/appointments`, `GET /api/appointments/me`, `PATCH /api/appointments/{id}/cancel`, `PATCH /api/appointments/{id}/status` |
| Records | `GET /api/records/me`, `GET /api/records/patient/{id}`, `POST /api/records`, `POST /api/records/upload` (multipart: file, title, description, patient_id for doctors), `GET /api/records/files/{file_id}` |
| Record access | `GET /api/access/me`, `PUT /api/access/me/{doctor_id}` `{"allowed": true/false}` |
| AI | `GET /api/ai/status`, `POST /api/ai/chat` (Server-Sent Events stream), `GET/DELETE /api/ai/history` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users?role=`, `POST /api/admin/doctors`, `PATCH/DELETE /api/admin/users/{id}`, `GET /api/admin/appointments`, `GET /api/admin/activity` |

Appointment rules: the date must be today or later and at most 90 days ahead; the day must be one of the doctor's available days; the time must be one of the doctor's slots (and not already passed today). A slot cannot be double-booked: there is an application check plus a unique database index on an active-slot key. Status flow: `pending → confirmed → completed`, and `pending` or `confirmed → cancelled`. Cancelling frees the slot.

---

## 1. Required software

- **Git**: https://git-scm.com/download/win
- **Node.js 20 LTS**: https://nodejs.org, then run `npm install -g yarn` (this is the only npm command; use yarn for everything else).
- **Python 3.11**: https://www.python.org/downloads/ (tick "Add Python to PATH").
- A **MongoDB Atlas** free account (https://www.mongodb.com/cloud/atlas), or MongoDB Community Server for local use.
- Optional: Docker Desktop for `docker compose`.

## 2. Run locally on Windows

Use PowerShell:

```powershell
git clone https://github.com/<your-username>/healthcare-management-system.git
cd healthcare-management-system

# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # If blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
copy .env.example .env               # then edit .env (see sections 3 and 4)
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Open a second terminal:

```powershell
cd healthcare-management-system\frontend
copy .env.example .env               # REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start                           # opens http://localhost:3000
```

Set `CORS_ORIGINS="http://localhost:3000"` in `backend/.env`. The API docs are at http://localhost:8001/api/docs.

**With Docker instead:** fill in `backend/.env`, then run `docker compose up --build`. This starts local MongoDB, the API on port 8001 and the frontend on port 3000.

### Demo data

With `SEED_DEMO_DATA="true"` and both `DEMO_DOCTOR_PASSWORD` and `DEMO_PATIENT_PASSWORD` set, the first startup creates synthetic accounts:

- Doctors: `doctor.rao@carebridge-demo.com` (Cardiology), `doctor.mehta@carebridge-demo.com`, `doctor.thomas@carebridge-demo.com`, `doctor.iyer@carebridge-demo.com`, all using `DEMO_DOCTOR_PASSWORD`.
- Patients: `patient.priya@carebridge-demo.com`, `patient.arjun@carebridge-demo.com`, both using `DEMO_PATIENT_PASSWORD`, with sample appointments and records.
- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD`. This account is always created. If you change `ADMIN_PASSWORD`, the stored password is updated on the next start.

## 3. Configure MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access**: add a database user with a password.
3. **Network Access**: add your IP address. For Render, add `0.0.0.0/0`, because Render's free-tier IPs are not fixed.
4. **Connect → Drivers**: copy the connection string into `MONGO_URL` in `backend/.env`, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`. URL-encode special characters in the password (`@` becomes `%40`).
5. Set `DB_NAME`, e.g. `healthcare_db`. Collections and indexes are created automatically on startup.

## 4. Configure the AI assistant

The assistant reads three variables in `backend/services/ai_service.py`:

| Variable | Example | Meaning |
|----------|---------|---------|
| `AI_PROVIDER` | `anthropic`, `openai`, `gemini` or `demo` | Provider name |
| `AI_MODEL` | `claude-sonnet-5-5` | Model name for that provider |
| `AI_API_KEY` | `sk-...` | Secret key (backend only, never sent to the browser) |

- If the provider is `demo`, or the key or model is empty, the assistant runs in **Demo mode**. It returns clearly labelled pre-written educational text and the UI shows a "Demo mode - no AI key configured" badge.
- Provider errors (bad key, network or quota problems) are caught and shown as "The AI assistant is temporarily unavailable." The rest of the app keeps working.
- The system prompt forbids diagnosis and prescribing. Messages that mention emergency symptoms (chest pain, breathing difficulty, stroke signs and so on) always get an "contact emergency services" notice first.
- To switch providers, change the env vars. To use a different SDK, replace `_provider_stream()` in `ai_service.py`; it only needs to yield text chunks.
- The current implementation uses the `emergentintegrations` package, which works with OpenAI, Anthropic or Gemini keys. It installs from the extra index URL shown in the install commands.

## 4b. Configure file storage

| Variable | Values | Meaning |
|----------|--------|---------|
| `STORAGE_PROVIDER` | `local` (default) or `emergent` | Where uploaded files are kept |
| `UPLOAD_DIR` | e.g. `./uploads` | Folder used by `local` storage |

- `local` saves files on disk, which is fine for running on your own computer. On Render's free plan the disk is wiped on every deploy or restart, so uploaded files will disappear there. Use a Render persistent disk (paid) mounted at `UPLOAD_DIR`, or switch providers.
- `emergent` uses Emergent object storage. It needs `EMERGENT_LLM_KEY` and works only inside the Emergent environment.
- To add another provider (for example Cloudinary or Supabase Storage), implement `save()` and `load()` in `backend/services/storage.py`.

## 5. Test the major features

**Automated tests:**

```powershell
cd backend;  python -m pytest -q               # 31 tests, in-memory DB, no AI key needed
cd frontend; $env:CI="true"; yarn test --watchAll=false
cd frontend; yarn build                         # build validation
```

The backend tests cover registration and login, invalid credentials, role restrictions, health card get, update, validation and QR revocation, booking with duplicate-slot prevention, date and time validation, status transitions, medical-record access permissions, and AI demo mode, emergency notices and provider-error handling.

**Manual walkthrough:**

1. Register a new patient, then open **Health Card**: add a blood group, allergies and an emergency contact, save, print or download the QR, then reissue the QR.
2. Scan or open the QR link in a private window: it shows only the first name, last initial and patient ID.
3. **Book Appointment**: choose a doctor, a date and a slot, then book. Try booking the same slot as another patient to see the 409 "already booked" error.
4. Log in as a doctor: confirm the request, open **Records**, add a prescription, then **Complete** the visit with notes.
5. Back as the patient: the new records appear in **Medical Records**.
6. Log in as admin: view statistics, disable an account (that user can no longer log in), add a doctor, and check the activity log.
7. Try opening `/admin` as a patient: you are sent to the Unauthorized page, and the API returns 403.

## 6. Upload to GitHub

Make sure `.env` files are **not** committed. Add these lines to `.gitignore` if they are missing:

```
backend/.env
frontend/.env
venv/
__pycache__/
```

```powershell
git init
git add .
git commit -m "Initial commit - CareBridge healthcare system"
git branch -M main
git remote add origin https://github.com/<your-username>/healthcare-management-system.git
git push -u origin main
```

## 7. GitHub Actions

- `ci.yml` runs on every push and pull request to `main`. It installs frontend dependencies, runs Jest, builds the frontend, installs backend dependencies, runs pytest and validates that the app imports. It needs **no secrets**: tests use an in-memory database and demo AI mode.
- `deploy.yml` runs **only after CI succeeds** on a push to `main`. It calls Render deploy hooks. To enable it:
  1. In each Render service, open **Settings → Deploy Hook** and copy the URL.
  2. In GitHub, open **Settings → Secrets and variables → Actions** and add `RENDER_BACKEND_DEPLOY_HOOK` and `RENDER_FRONTEND_DEPLOY_HOOK`.
  3. In Render, set **Auto-Deploy = No** for both services, so deploys happen only through CI.

## 8. Deploy on Render (no AWS)

**Backend - Web Service**

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` |
| Start command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/api/health` |
| Env vars | `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (your frontend URL, e.g. `https://carebridge-frontend.onrender.com`), `JWT_SECRET`, `JWT_EXPIRE_HOURS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_DEMO_DATA`, `DEMO_DOCTOR_PASSWORD`, `DEMO_PATIENT_PASSWORD`, `APP_TIMEZONE`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `PYTHON_VERSION=3.11.9` |

**Frontend - Static Site**

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Build command | `yarn install --frozen-lockfile && CI=false yarn build` |
| Publish directory | `build` |
| Rewrite rule | Source `/*` → Destination `/index.html` (Action: Rewrite) |
| Env vars | `REACT_APP_BACKEND_URL` = your backend URL, e.g. `https://carebridge-api.onrender.com` (no trailing slash) |

You can also create both services in one step with **New → Blueprint**, using `render.yaml`, and then fill in the `sync: false` secrets. After the first frontend deploy, set the backend `CORS_ORIGINS` to the exact frontend origin and redeploy.

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| `KeyError: 'MONGO_URL'` / `'JWT_SECRET'` on startup | `backend/.env` is missing or a variable is not set. Required vars are deliberately not given defaults. |
| `ServerSelectionTimeoutError` | Atlas Network Access does not allow your IP (or `0.0.0.0/0` for Render), or the password in the URL is not URL-encoded. |
| Browser shows CORS error | `CORS_ORIGINS` must exactly match the frontend origin (scheme + host + port, no trailing slash). Separate multiple origins with commas. |
| Frontend calls `undefined/api/...` | `REACT_APP_BACKEND_URL` was not set **at build time**. Set it and rebuild or redeploy. |
| Refreshing a page on Render gives 404 | Add the `/* → /index.html` rewrite rule to the static site. |
| `401 Session expired` | The token expired (`JWT_EXPIRE_HOURS`). Log in again. |
| `429 Too many failed attempts` | Wait 15 minutes, or delete documents in the `login_attempts` collection. |
| AI shows "Demo mode" | Set `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY`, then restart the backend. |
| AI says "temporarily unavailable" | The key is invalid or out of quota, or the provider is down. Check the backend logs. |
| `Activate.ps1 cannot be loaded` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `No matching distribution found for emergentintegrations` | Add `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` to the pip command. |
| Render free backend is slow on the first request | Free services sleep when idle. The first request after a pause takes about 30-60 s. |
