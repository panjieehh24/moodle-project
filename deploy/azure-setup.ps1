

$RG  = "moodle-web-rg"
$LOC = "southeastasia"

# --- 1. Database: Clever Cloud MySQL -------------------------
# Create a free MySQL "DEV" add-on at console.clever-cloud.com,
# put its mysql:// URI into deploy/secrets.local.ps1, then import
# the schema + seed data (no local mysql client needed):
node deploy/import-db.js

# --- 2. Register resource providers (once per new subscription)
foreach ($ns in "Microsoft.Storage","Microsoft.App","Microsoft.OperationalInsights","Microsoft.Web","Microsoft.ContainerRegistry") {
  az provider register --namespace $ns
}

# --- 3. Resource group ---------------------------------------
az group create --name $RG --location $LOC

# --- 4. Azure Blob Storage -----------------------------------
$SA = "moodleweb916700"          # storage account name (globally unique)
az storage account create --name $SA --resource-group $RG --location $LOC --sku Standard_LRS --kind StorageV2
$conn = az storage account show-connection-string --name $SA --resource-group $RG --query connectionString -o tsv
az storage container create --name uploads --connection-string $conn
# -> copy $conn into AZURE_STORAGE_CONNECTION_STRING in secrets.local.ps1

# --- 5. Container registry + cloud build of the backend image
$ACR = "ca3a69a0c919acr"         # container registry name (globally unique)
az acr create --resource-group $RG --name $ACR --sku Basic --admin-enabled true
az acr build --registry $ACR --image moodle-backend:latest ./backend

# --- 6. Container Apps environment + backend app -------------
az containerapp env create --name moodle-web-env --resource-group $RG --location $LOC
az containerapp create `
  --name moodle-backend --resource-group $RG --environment moodle-web-env `
  --image "$ACR.azurecr.io/moodle-backend:latest" --registry-server "$ACR.azurecr.io" `
  --target-port 3000 --ingress external --min-replicas 0 --max-replicas 1 `
  --secrets "database-url=$($env:DATABASE_URL)" "jwt-secret=$($env:JWT_SECRET)" "azure-storage-conn=$($env:AZURE_STORAGE_CONNECTION_STRING)" `
  --env-vars PORT=3000 JWT_EXPIRES_IN=24h DATABASE_URL=secretref:database-url JWT_SECRET=secretref:jwt-secret AZURE_STORAGE_CONNECTION_STRING=secretref:azure-storage-conn

# --- 7. Frontend: Azure Static Web Apps ----------------------
# Opens a browser for GitHub authorization; Azure then adds a
# deploy workflow to the repo and publishes the frontend folder.
az staticwebapp create --name moodle-web-frontend --resource-group $RG `
  --source https://github.com/panjieehh24/moodle-web `
  --location eastasia --branch main --app-location "/frontend" --login-with-github

# --- 8. CORS: allow the frontend origin ----------------------
az containerapp update --name moodle-backend --resource-group $RG `
  --set-env-vars "FRONTEND_URL=https://yellow-sky-03a480100.7.azurestaticapps.net"
