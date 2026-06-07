const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const blobService = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobService.getContainerClient("uploads");

// Custom multer storage engine that streams uploads straight to Azure Blob Storage.
const azureStorage = {
  _handleFile(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    const blob = containerClient.getBlockBlobClient(name);

    const chunks = [];
    file.stream.on("data", (d) => chunks.push(d));
    file.stream.on("end", async () => {
      try {
        const buf = Buffer.concat(chunks);
        await blob.uploadData(buf, {
          blobHTTPHeaders: { blobContentType: file.mimetype },
        });
        cb(null, { blobName: name, size: buf.length });
      } catch (err) {
        cb(err);
      }
    });
    file.stream.on("error", cb);
  },
  _removeFile(_req, file, cb) {
    containerClient
      .deleteBlob(file.blobName)
      .then(() => cb(null))
      .catch(cb);
  },
};

module.exports = multer({
  storage: azureStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB (matches system_settings)
});
