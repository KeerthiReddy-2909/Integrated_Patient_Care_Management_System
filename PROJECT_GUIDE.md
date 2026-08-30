# MediTrack — Milestones 1 to 4

MediTrack is an integrated patient-care management system with a browser interface and a Node.js + SQLite REST backend. The UI can still be demonstrated with browser storage, while the backend provides production-style API routes, database persistence, JWT sessions, roles, notifications, and audit logs.

## Run

Run the API and website together from the project folder:

```powershell
node server.js
```

Then open [http://localhost:3000](http://localhost:3000). The first start creates `meditrack.db` and two demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@meditrack.local` | `Meditrack@123` |
| Doctor | `doctor@meditrack.local` | `Meditrack@123` |

Use **Backend login** in the top-right corner to connect the interface to SQLite. After login, patient registration, appointments, consultations, prescriptions, notifications, analytics, and audit data are read from and written to the backend. Select **Load demo** only when using the browser-only demonstration mode.

## Included functionality

- Patient registration and medical profile information
- Conflict-protected doctor appointment scheduling
- Consultation history: symptoms, observations, diagnosis, and treatment plan
- Digital prescriptions with dosage, duration, refills, and instructions
- Role-based demo access for administrator, doctor, and patient workflows
- Appointment and prescription notifications
- Audit trail and security-event view
- Dashboard analytics, doctor workload, status reporting, CSV export, and print-ready report
- Node.js REST API with SQLite persistence, password hashing, JWT sessions, and protected routes
- REST API and deployment/testing guide within the application

## Production implementation notes

The backend is a working local development service. Before real healthcare deployment, set a strong `JWT_SECRET`, use HTTPS behind a reverse proxy, add secure cookie/refresh-token handling, configure encrypted backups, validate all fields more strictly, add rate limiting, and integrate approved email/SMS providers. Do not treat browser `localStorage` as suitable for real patient data.

## Suggested REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check backend and SQLite availability |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET / POST | `/api/patients` | Retrieve/create permitted patient records |
| GET / PUT | `/api/patients/:id` | Retrieve/update a patient record |
| GET / POST | `/api/appointments` | List or create appointments |
| POST | `/api/consultations` | Save a clinical consultation |
| POST | `/api/prescriptions` | Generate a digital prescription |
| GET | `/api/notifications` | Retrieve in-app notifications |

## Verification checklist

1. Register a patient and verify it is searchable in the patient directory.
2. Book an appointment, then attempt the same doctor/date/time combination to verify conflict prevention.
3. Save a consultation and prescription for the patient; verify they appear in their histories.
4. Confirm the resulting notification and audit-log entries.
5. Switch roles and verify protected dashboard areas reject unauthorized access.
6. Export the appointments report as CSV and use print to create a PDF report.
