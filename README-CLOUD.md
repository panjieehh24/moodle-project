# Moodle Web — Cloud Deployment Guide (Local → Azure)

> Cloud Computing course project · UGM 2026  
> Supervisor: Dr. Lukman Heryawan, S.T., M.T.

> For local/Docker deployment, see [README.md](README.md).

This guide covers migrating the Moodle Web app from a local Docker Compose stack
to a zero-cost cloud stack on Azure + Clever Cloud.

### Cloud Stack Summary

| Local (Docker Compose) | Cloud |
|---|---|
| `mysql:8.0` container | Clever Cloud MySQL (free DEV plan) |
| `backend` container (local build) | Azure Container Apps |
| `nginx` container (static files) | Azure Static Web Apps |
| `uploads` volume (local disk) | Azure Blob Storage |
| `.env` file | Container Apps `secretref` |

### Live URLs (this project)

| Service | URL |
|---|---|
| Frontend | https://yellow-sky-03a480100.7.azurestaticapps.net |
| Backend | https://moodle-backend.politecoast-e22ef216.southeastasia.azurecontainerapps.io |
| Repo | https://github.com/panjieehh24/moodle-web |

---

## Prerequisites

| Tool | Notes |
|------|-------|
| Azure CLI | `winget install Microsoft.AzureCLI` |
| Docker Desktop | Only needed if building images locally |
| Node.js | Needed to run `deploy/import-db.js` |
| Git | Any version |
| Clever Cloud account | Free — https://www.clever-cloud.com |
| Azure account | Free trial or paid subscription |

---

## Phase 0 — Clone the Repo

```bash
git clone https://github.com/panjieehh24/moodle-web
cd moodle-web
```

---

## Phase 1 — Database (Clever Cloud MySQL)

> **Why Clever Cloud?** PlanetScale removed its free tier in 2024 — `pscale database create`
> now fails with "Cluster size is required". Clever Cloud's DEV plan is real MySQL,
> so no query code needs to change, only the connection string.

1. Log in to [console.clever-cloud.com](https://console.clever-cloud.com)
2. **Add-ons** → **Create an add-on** → **MySQL** → **DEV** (free)
3. Copy the generated `MYSQL_ADDON_URI` connection string
4. The DEV plan pre-creates one database — you cannot create a new one yourself
5. Import the schema and seed data (the script strips `CREATE DATABASE` / `USE` statements
   that are incompatible with the pre-created database):

```powershell
# Set your Clever Cloud connection string first
$env:DATABASE_URL = "mysql://user:pass@host:port/dbname"
node deploy/import-db.js
```

> **SSL note:** Clever Cloud DEV uses a self-signed certificate chain.
> The backend connects with `ssl: { rejectUnauthorized: false }`.
> The connection is still encrypted — only the chain verification is skipped.

---

## Phase 2 — Azure Resource Group & Provider Registration

> **Important:** A brand-new Azure subscription has no resource providers registered.
> All five `az provider register` commands below are required or resource creation will fail.

```powershell
az login
az group create --name moodle-web-rg --location southeastasia

az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.ContainerRegistry
```

Wait ~1–2 minutes for providers to finish registering before proceeding.

---

## Phase 3 — Azure Container Registry (ACR)

```powershell
az acr create --resource-group moodle-web-rg --name <your-acr-name> --sku Basic
az acr login --name <your-acr-name>
```

Replace `<your-acr-name>` with a globally unique name (e.g. `moodlewebacr`).

---

## Phase 4 — Backend → Azure Container Apps

> **Do not use `az containerapp up --source`** — it has a CLI bug
> (`NoneType object has no attribute 'linux'`). Use the explicit 3-step flow below.

### Step 4a — Build the image in ACR (no local Docker required)

```powershell
az acr build --registry <your-acr-name> --image moodle-backend:v1 ./backend
```

### Step 4b — Create the Container Apps environment

```powershell
az containerapp env create `
  --name moodle-env `
  --resource-group moodle-web-rg `
  --location southeastasia
```

### Step 4c — Deploy the container

```powershell
az containerapp create `
  --name moodle-backend `
  --resource-group moodle-web-rg `
  --environment moodle-env `
  --image <your-acr-name>.azurecr.io/moodle-backend:v1 `
  --registry-server <your-acr-name>.azurecr.io `
  --min-replicas 0 --max-replicas 2 `
  --ingress external --target-port 5000 `
  --secrets database-url="<CLEVER_CLOUD_URI>" jwt-secret="<YOUR_JWT_SECRET>" `
  --env-vars DATABASE_URL=secretref:database-url JWT_SECRET=secretref:jwt-secret
```

After deployment, copy the generated HTTPS URL — you will need it in Phase 5.

---

## Phase 5 — Frontend → Azure Static Web Apps

1. Push all frontend code to the `main` branch of your GitHub repo
2. Azure Portal → **Create a resource** → **Static Web App**
3. Connect to your GitHub repo → branch: `main` → app location: `/frontend`
4. Azure auto-generates a GitHub Actions workflow (`.github/workflows/`)
5. Every `git push` to `main` triggers an automatic redeploy (~2 min)
6. Update all `fetch()` base URLs in `frontend/js/api.js` to point to the backend URL from Phase 4

---

## Phase 6 — Azure Blob Storage (File Uploads)

```powershell
az storage account create `
  --name <your-storage-name> `
  --resource-group moodle-web-rg `
  --sku Standard_LRS

az storage container create --name uploads --account-name <your-storage-name>
```

Copy the storage connection string from the Azure Portal:  
**Storage account → Access keys → Connection string**

Add it as a secret to Container Apps:

```powershell
az containerapp secret set `
  --name moodle-backend `
  --resource-group moodle-web-rg `
  --secrets storage-conn="<CONNECTION_STRING>"

az containerapp update `
  --name moodle-backend `
  --resource-group moodle-web-rg `
  --set-env-vars AZURE_STORAGE_CONNECTION_STRING=secretref:storage-conn
```

---

## Deploying Backend Updates

Each time you change backend code, bump the version tag:

```powershell
# Load secrets (never commit this file)
. .\deploy\secrets.local.ps1

az acr build --registry <your-acr-name> --image moodle-backend:v2 ./backend

az containerapp update `
  --name moodle-backend `
  --resource-group moodle-web-rg `
  --image <your-acr-name>.azurecr.io/moodle-backend:v2
```

Frontend updates deploy automatically on every `git push` to `main`.

---

## Cold Start & Keep-Warm

With `--min-replicas 0` the container scales to zero when idle.  
The first request after ~10 min will cold-start in ~10–15 seconds.

To keep one replica always running (eliminates cold starts, uses free credit faster):

```powershell
az containerapp update `
  --name moodle-backend `
  --resource-group moodle-web-rg `
  --min-replicas 1 --max-replicas 2
```

Revert to scale-to-zero: `--min-replicas 0`.

---

## Demo Accounts

All accounts use password: **`password123`**

| Role | Email |
|------|-------|
| Admin | admin@ugm.ac.id |
| Lecturer | lukman@ugm.ac.id |
| Student | panji@mail.ugm.ac.id |

---

## Cost & Teardown

- **Clever Cloud DEV MySQL** — free
- **Azure Static Web Apps** — free tier
- **Azure Container Apps** — free when idle (scale-to-zero), ~$0.17/day for Container Registry
- **Azure Blob Storage** — near-zero for small files

Teardown everything:

```powershell
az group delete --name moodle-web-rg --yes --no-wait
```

Then delete the MySQL add-on in the Clever Cloud console.

---

## Troubleshooting

**`az containerapp up --source` fails with NoneType error**  
Use the explicit ACR build + containerapp create flow in Phase 4 instead.

**Provider registration errors on first deploy**  
Run all five `az provider register` commands in Phase 2 and wait 1–2 minutes.

**Database connection fails with SSL handshake error**  
Ensure `ssl: { rejectUnauthorized: false }` is set in `backend/db/connection.js`.

**`CREATE DATABASE` fails during import**  
Clever Cloud DEV pre-creates the database. Run `deploy/import-db.js` — it strips
those statements automatically before importing.

**Frontend shows "API unreachable"**  
Confirm the backend URL in `frontend/js/api.js` matches the Container Apps ingress URL exactly.
