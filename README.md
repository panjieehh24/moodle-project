# Moodle Web — On-Premise (Docker) Deployment Guide

> Cloud Computing course project · UGM 2026  
> Supervisor: Dr. Lukman Heryawan, S.T., M.T.

> For cloud deployment, see [README-CLOUD.md](README-CLOUD.md).

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker Desktop (or Docker Engine + Compose plugin) | 24.x |
| Git | any |

No Node.js, no MySQL client — everything runs inside Docker.

---

## 1. Clone / copy the project

```bash
git clone <your-repo-url> moodle-web
cd moodle-web
```

Or just copy the folder to your machine.

---

## 2. Configure environment variables

The file `.env` at the root already has working defaults. **Before going to production, change these values:**

```
DB_ROOT_PASSWORD=rootpassword123   ← change this
DB_PASSWORD=moodle_pass123         ← change this
JWT_SECRET=change_this_to_a_long_random_secret_string  ← MUST change
```

Generate a strong JWT secret:
```bash
# Linux / Mac
openssl rand -hex 32

# Or use Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Start the full stack

```bash
docker compose up --build -d
```

This single command will:
1. Pull MySQL 8.0 and Nginx images
2. Build the Node.js backend image
3. Create the database, run `init.sql`, then `seed.sql` automatically
4. Start all three containers

**First startup takes ~60 seconds** (MySQL initialisation + npm install).

Check that all containers are running:
```bash
docker compose ps
```

You should see three containers with status **Up**:
- `moodle_db`
- `moodle_backend`
- `moodle_frontend`

---

## 4. Open the app

| URL | What |
|-----|------|
| http://localhost | Frontend (login page) |
| http://localhost/api/health | Backend health check |
| http://localhost/api/v1/... | REST API |

---

## 5. Demo accounts

All accounts use password: **`password123`**

| Role | Email |
|------|-------|
| Lecturer | lukman@ugm.ac.id |
| Student | adam@mail.ugm.ac.id |
| Student | ezra@mail.ugm.ac.id |
| Student | panji@mail.ugm.ac.id |
| Student | raihan@mail.ugm.ac.id |
| Student | zidni@mail.ugm.ac.id |

---

## 6. Useful commands

```bash
# View live logs
docker compose logs -f

# View only backend logs
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and DELETE all data (wipes the database volume)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d

# Open a MySQL shell
docker exec -it moodle_db mysql -u moodle_user -pmoodle_pass123 moodle_web
```

---

## 7. Project structure

```
moodle-web/
├── docker-compose.yml       # Orchestrates all 3 containers
├── nginx.conf               # Nginx: serve frontend + proxy /api to backend
├── .env                     # Environment variables
├── database/
│   ├── init.sql             # Schema (6 tables)
│   └── seed.sql             # Demo data
├── backend/
│   ├── Dockerfile
│   ├── server.js            # Express entry point
│   ├── routes/              # auth · courses · assignments · notifications
│   ├── controllers/         # Business logic per domain
│   ├── middleware/          # JWT auth · error handler
│   └── db/connection.js     # mysql2 pool
└── frontend/
    ├── index.html           # Login
    ├── dashboard.html       # Main dashboard
    ├── courses.html         # Course list
    ├── assignments.html     # Assignments + file submission
    ├── notifications.html   # Notifications + lecturer post form
    ├── css/style.css
    └── js/
        ├── api.js           # All fetch() calls
        └── auth.js          # Token helpers + shell init
```

---

## 8. API reference (quick)

All routes are prefixed `/api/v1/`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/login | — | Login, returns JWT |
| GET | /auth/me | ✓ | Current user profile |
| GET | /courses | ✓ | My courses |
| GET | /courses/:id | ✓ | Course detail |
| GET | /assignments | ✓ | My assignments (sorted by due_at) |
| GET | /assignments/:id | ✓ | Assignment detail |
| POST | /assignments/:id/submit | student | Upload submission file |
| PATCH | /assignments/:aId/submissions/:sId/grade | lecturer | Grade a submission |
| GET | /notifications | ✓ | All notifications |
| GET | /notifications/unread-count | student | Unread badge count |
| POST | /notifications | lecturer | Post announcement |
| PATCH | /notifications/:id/read | ✓ | Mark as read |

---

## 9. Troubleshooting

**Backend keeps restarting?**  
The backend waits for MySQL to be healthy before starting. If MySQL is slow (first run), wait 30–60 s and check again:
```bash
docker compose logs backend
```

**Port 80 already in use?**  
Edit `docker-compose.yml`, change `"80:80"` to e.g. `"8080:80"`, then access at `http://localhost:8080`.

**Database changes not applied?**  
The MySQL init scripts only run on the very first start (when the volume is empty). To reset:
```bash
docker compose down -v
docker compose up --build -d
```
