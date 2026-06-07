# ============================================================
#  Secrets template — DO NOT put real values in this file.
#
#  1. Copy this file to:  deploy\secrets.local.ps1
#  2. Fill in the real values there (secrets.local.ps1 is gitignored).
#  3. Before running deploy steps, load them into your session:
#       . .\deploy\secrets.local.ps1
# ============================================================

# Clever Cloud MySQL connection URI.
# From the Clever Cloud add-on dashboard (the mysql:// URI line).
$env:DATABASE_URL = 'mysql://USER:PASSWORD@HOST:3306/DATABASE'

# JWT signing secret — any long random string.
# Generate one in PowerShell with:
#   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 56 | ForEach-Object {[char]$_})
$env:JWT_SECRET = 'replace-with-a-long-random-string'

# Azure Storage connection string.
# From: az storage account show-connection-string --name <account> --resource-group <rg>
$env:AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=...'
