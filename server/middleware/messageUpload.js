const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { put } = require("@vercel/blob");

const MAX_MESSAGE_UPLOAD_MB = Number(process.env.MAX_MESSAGE_UPLOAD_MB || 10);
const MAX_MESSAGE_UPLOAD_BYTES = MAX_MESSAGE_UPLOAD_MB * 1024 * 1024;
const MAX_MESSAGE_ATTACHMENTS = Number(process.env.MAX_MESSAGE_ATTACHMENTS || 5);
const IS_VERCEL_RUNTIME = process.env.VERCEL === "1";

const allowedMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

const storage = multer.memoryStorage();

const messageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_MESSAGE_UPLOAD_BYTES,
    files: MAX_MESSAGE_ATTACHMENTS,
  },
  fileFilter: (req, file, cb) => {
    if (file?.mimetype?.startsWith("image/") || allowedMimeTypes.has(file?.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("INVALID_MESSAGE_FILE_TYPE"));
  },
});

const sanitizeFilename = (filename = "attachment") =>
  String(filename)
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "attachment";

const saveMessageAttachments = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return next();

    if (IS_VERCEL_RUNTIME && !process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        message: "Server upload configuration error: missing BLOB_READ_WRITE_TOKEN.",
      });
    }

    const timestamp = Date.now();
    const savedAttachments = [];

    for (const [index, file] of files.entries()) {
      const originalName = sanitizeFilename(file.originalname);
      const extension = path.extname(originalName);
      const basename = path.basename(originalName, extension).slice(0, 80) || "attachment";
      const storedName = `message-${req.user?.id || "unknown"}-${timestamp}-${index}-${basename}${extension}`;
      const kind = file.mimetype?.startsWith("image/") ? "image" : "file";

      let url;
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`messages/${storedName}`, file.buffer, {
          access: "public",
          contentType: file.mimetype || "application/octet-stream",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        url = blob.url;
      } else {
        const uploadPath = path.resolve(__dirname, "../uploads/messages");
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        await fs.promises.writeFile(path.join(uploadPath, storedName), file.buffer);
        url = `/uploads/messages/${storedName}`;
      }

      savedAttachments.push({
        url,
        name: originalName,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size || 0,
        kind,
      });
    }

    req.savedMessageAttachments = savedAttachments;
    return next();
  } catch (error) {
    console.error("Message attachment upload failed:", error);
    return res.status(500).json({ message: "Failed to upload attachment" });
  }
};

const handleMessageUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `File too large. Maximum size is ${MAX_MESSAGE_UPLOAD_MB}MB.`,
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(413).json({
        message: `Too many files. Maximum is ${MAX_MESSAGE_ATTACHMENTS} attachments.`,
      });
    }

    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  if (err.message === "INVALID_MESSAGE_FILE_TYPE") {
    return res.status(415).json({
      message: "Unsupported file type. Upload images, PDF, Word, Excel, CSV, or text files.",
    });
  }

  return next(err);
};

module.exports = {
  messageUpload,
  saveMessageAttachments,
  handleMessageUploadError,
};
