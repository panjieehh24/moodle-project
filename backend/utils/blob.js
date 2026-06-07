const { BlobServiceClient, BlobSASPermissions } = require("@azure/storage-blob");
const path = require("path");

// Lazily build the container client so a missing connection string surfaces a
// clean runtime error on use rather than crashing at module load (mirrors how
// middleware/upload.js talks to the same "uploads" container).
let containerClient = null;
function getContainer() {
  if (!containerClient) {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) throw new Error("File storage is not configured");
    containerClient = BlobServiceClient.fromConnectionString(conn).getContainerClient("uploads");
  }
  return containerClient;
}

// Strip any legacy "/uploads/" prefix so seed-style paths and bare blob names
// (what real uploads store) both resolve to the object name in the container.
function normalizeBlobName(stored) {
  return String(stored || "").replace(/^\/?(uploads\/)?/, "");
}

// Return a short-lived (10 min) read-only SAS URL for a stored blob. Requires
// the storage account key (provided by the connection string) so the SDK can
// sign the URL. `downloadName` sets the suggested filename on download.
async function getDownloadUrl(stored, downloadName) {
  const blobName = normalizeBlobName(stored);
  if (!blobName) throw new Error("No file is attached");
  const blob = getContainer().getBlockBlobClient(blobName);
  const opts = {
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(Date.now() + 10 * 60 * 1000),
  };
  if (downloadName) {
    const ext = path.extname(blobName);
    const base = downloadName.replace(/[\\/"]/g, "").trim() || "download";
    const named = ext && !base.toLowerCase().endsWith(ext.toLowerCase()) ? base + ext : base;
    opts.contentDisposition = `attachment; filename="${named}"`;
  }
  return blob.generateSasUrl(opts);
}

module.exports = { getDownloadUrl, normalizeBlobName };
