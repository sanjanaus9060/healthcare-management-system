# CareBridge
### AI-Assisted Healthcare Management System

CareBridge is a full-stack healthcare-management application developed for a college-project demonstration. It brings patient, doctor, and administrator workflows into a single platform.

The application includes digital health cards, appointment management, medical records, controlled doctor access, and an AI-assistant interface with a clearly labelled demo mode.

> **Demo use only:** Use synthetic data. Do not enter real patient information. This project is not a clinically validated or production-ready healthcare service.

---

## Project Links

- **Source repository:** https://github.com/sanjanaus9060/healthcare-management-system
- **Azure deployment branch:** https://github.com/sanjanaus9060/healthcare-management-system/tree/pavani-deployment
- **Azure deployment workflow:** https://github.com/sanjanaus9060/healthcare-management-system/actions/workflows/pavani-deployment_carebridge-api-pavani-2026.yml
- **Deployment contributor:** https://github.com/pavani-n-hash

> A verified, fully operational live-demo link will be added after backend runtime configuration and frontend deployment are completed.

---

## Overview

CareBridge demonstrates how a healthcare-management application can support different user roles while separating frontend presentation, backend business logic, and database storage.

### Patients
- Register and manage their profiles.
- Create and update a digital health card.
- Generate and revoke QR verification tokens.
- Book and cancel appointments.
- View medical records.
- Manage doctor access to their records.
- Use the AI-assistant interface.

### Doctors
- View assigned appointments.
- Update appointment status.
- Add consultation notes and prescriptions.
- Access patient records when authorized.

### Administrators
- View system statistics.
- Manage patient and doctor accounts.
- Monitor appointments and activity logs.

The project design excludes passwords and medical-record content from the administrator console.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, CRACO, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, FastAPI, Pydantic |
| Database | MongoDB, Motor |
| Authentication | JWT, bcrypt, role-based access control |
| Backend hosting | Azure App Service |
| CI/CD | GitHub Actions |
| Version control | Git, GitHub |
| Testing tools | pytest, Jest |
| Local container setup | Docker, Docker Compose |
| AI integration | Provider-configurable service with demo mode |

The current frontend uses Create React App through CRACO—not Vite.

---

## Application Architecture

```text
React Frontend
      |
      | HTTP requests
      v
FastAPI Backend
      |
      | Asynchronous database operations
      v
MongoDB

GitHub deployment branch
      |
      v
GitHub Actions
      |
      | Build and package backend
      v
Azure App Service
```

The React frontend and FastAPI backend require separate hosting configurations. Frontend deployment is not confirmed complete in the current deployment record.

---

## Repository Structure

```text
healthcare-management-system/
├── .github/
│   └── workflows/
│       └── pavani-deployment_carebridge-api-pavani-2026.yml
│
└── healthcare-management-system/
    ├── backend/
    │   ├── core/
    │   ├── routers/
    │   ├── services/
    │   ├── tests/
    │   ├── server.py
    │   ├── models.py
    │   ├── seed.py
    │   ├── requirements.txt
    │   └── .env.example
    │
    ├── frontend/
    ├── .github/
    ├── docker-compose.yml
    ├── render.yaml
    └── README.md
```

The application source is nested inside a folder with the same name as the repository. Deployment workflows must account for this structure.

The Azure workflow is stored in `.github/workflows/` at the Git repository root.

---

## Azure Deployment Status

| Component | Status |
|---|---|
| GitHub collaboration and deployment branch | Configured |
| Backend build workflow | Successful |
| Backend package deployment to Azure | Successful |
| Backend runtime verification | Pending database environment configuration |
| React frontend deployment | Not confirmed complete |
| End-to-end application verification | Pending |

A successful CI/CD run confirms that the build and deployment stages completed. It does not, by itself, confirm that the application started successfully or connected to its database.

During runtime verification, the backend returned HTTP 503. Azure Log stream identified the startup failure as:

```text
KeyError: 'MONGO_URL'
```

The application requires a valid MongoDB connection string and other backend settings in Azure before runtime verification can be completed.

---

## My Contribution: Cloud Deployment and CI/CD

**Contributor:** N Pavani — `pavani-n-hash`

Worked on preparing an existing collaborative project for Azure backend deployment.

### Completed Work

- Cloned the shared repository and created the `pavani-deployment` branch.
- Configured a two-job GitHub Actions workflow:
  - `build`
  - `deploy`
- Corrected the dependency-installation path for the nested backend folder.
- Packaged the backend source separately from the frontend.
- Resolved a redundant direct LiteLLM dependency reference.
- Configured the additional package index required by `emergentintegrations`.
- Corrected Markdown-formatted URLs that were invalid in configuration files.
- Completed a successful backend build-and-deployment workflow.
- Investigated startup failures using Azure runtime logs.
- Identified missing MongoDB environment configuration.

These contributions describe deployment and troubleshooting work. They do not claim individual authorship of every application feature.

---

## Verified Engineering Outcomes

The following figures come from the recorded GitHub Actions run and troubleshooting logs.

| Outcome | Recorded Result |
|---|---|
| CI/CD job structure | 2 jobs: build and deploy |
| Successful workflow duration | 5 minutes 46 seconds |
| Backend deployment artifact size | 32.2 KB |
| Resolved blocker categories | Repository paths, dependency references, package-index configuration |
| Identified runtime failure | Missing `MONGO_URL` environment variable |

The duration represents one successful run, not an average or a measured performance improvement. Artifact size is not a runtime-memory or application-performance measurement.

---

## Run Locally

### Prerequisites

- Git
- Python 3.11
- Node.js and Yarn compatible with the frontend project
- MongoDB Atlas or a local MongoDB instance

### Clone the Repository

```powershell
git clone [https://github.com/sanjanaus9060/healthcare-management-system.git](https://github.com/sanjanaus9060/healthcare-management-system.git)
cd healthcare-management-system
cd healthcare-management-system
```

### Start the Backend

```powershell
cd backend

python -m venv venv
.\venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements.txt

Copy-Item .env.example .env
```

Edit the local `.env` file with your own configuration before starting the server.

```powershell
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend documentation:

```text
http://localhost:8001/api/docs
```

### Start the Frontend

Open a second PowerShell terminal:

```powershell
cd C:\path\to\healthcare-management-system\healthcare-management-system\frontend

Copy-Item .env.example .env
yarn install
yarn start
```

Set the frontend's local environment variable:

```text
REACT_APP_BACKEND_URL=http://localhost:8001
```

Set the backend's local CORS origin:

```text
CORS_ORIGINS=http://localhost:3000
```

The frontend development server opens at:

```text
http://localhost:3000
```

---

## Backend Configuration

Configure backend values privately in a local `.env` file or in Azure App Service's application settings.

| Variable | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE_HOURS` | Token lifetime |
| `ADMIN_EMAIL` | Demo administrator account email |
| `ADMIN_PASSWORD` | Demo administrator password |
| `CORS_ORIGINS` | Allowed frontend origins |
| `SEED_DEMO_DATA` | Enables optional synthetic demo seeding |
| `DEMO_DOCTOR_PASSWORD` | Password for optional seeded doctor accounts |
| `DEMO_PATIENT_PASSWORD` | Password for optional seeded patient accounts |
| `APP_TIMEZONE` | Application timezone |
| `AI_PROVIDER` | AI provider or demo mode |
| `AI_MODEL` | Provider-specific model identifier |
| `AI_API_KEY` | Backend-only provider key |
| `STORAGE_PROVIDER` | Upload-storage provider |
| `UPLOAD_DIR` | Local upload directory |

Never commit real `.env` files, database credentials, passwords, JWT secrets, or API keys.

### Additional Package Index

The project's dependency installation requires this plain-text line in `backend/requirements.txt`:

```text
--extra-index-url [https://d33sy5i8bnduwe.cloudfront.net/simple/](https://d33sy5i8bnduwe.cloudfront.net/simple/)
```

Do not replace the URL with Markdown link syntax.

---

## Testing

The repository includes backend and frontend tests. Their presence does not constitute a claim that every test has passed in the current deployment branch.

### Backend

From the backend directory:

```powershell
python -m pytest -q
```

### Frontend

From the frontend directory:

```powershell
$env:CI="true"
yarn test --watchAll=false
yarn build
```

### Manual Verification Checklist

- [ ] Backend health endpoint responds.
- [ ] Swagger documentation opens.
- [ ] MongoDB connection succeeds.
- [ ] Patient registration and login work.
- [ ] Role-specific pages enforce access restrictions.
- [ ] Appointment booking and cancellation work.
- [ ] QR verification and revocation work.
- [ ] Medical-record access rules work.
- [ ] Frontend communicates with the deployed backend.
- [ ] Nested frontend routes work after refresh.

---

## Learning Outcomes

This work provided practical experience with:

- Git branching and collaborative repository workflows.
- GitHub Actions YAML and automated deployment triggers.
- Build artifacts and backend packaging.
- Python dependency resolution.
- Custom package-index configuration.
- Azure App Service deployment and startup settings.
- Environment-variable management.
- Separating build, deployment, and runtime failures.
- Reading tracebacks and cloud application logs.
- Full-stack frontend/backend integration planning.

---

## Limitations

- Intended for synthetic-data demonstrations only.
- Not clinically validated.
- Not audited for production security or regulatory compliance.
- AI demo mode is not evidence of a configured live AI model.
- Backend runtime and frontend deployment must be verified before publishing a live-demo claim.
- Upload persistence and production storage require separate validation.
- No verified load-testing, latency, uptime, or user-scale results are claimed.

---

## Next Steps

- Complete MongoDB and backend environment configuration.
- Verify backend health and API documentation.
- Deploy the React frontend.
- Configure its build-time backend URL.
- Set the backend CORS origin to the frontend's live URL.
- Verify major workflows end to end.
- Record reproducible test results and deployment measurements.

---

## Contributors

- **Original application development:** Project collaborators; retain and update the team's agreed attribution.
- **Azure deployment and CI/CD contribution:** N Pavani — https://github.com/pavani-n-hash
