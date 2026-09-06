const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { head, put } = require("@vercel/blob");
const { handleUpload } = require("@vercel/blob/client");

const MAX_MESSAGE_UPLOAD_MB = Number(process.env.MAX_MESSAGE_UPLOAD_MB || 10);
const MAX_MESSAGE_UPLOAD_BYTES = MAX_MESSAGE_UPLOAD_MB * 1024 * 1024;
const MAX_MESSAGE_ATTACHMENTS = Number(
  process.env.MAX_MESSAGE_ATTACHMENTS || 5,
);
const IS_VERCEL_RUNTIME = process.env.VERCEL === "1";

const getMessageBlobToken = () =>
  process.env.DOCUMENT_BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN ||
  "";

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
    if (
      file?.mimetype?.startsWith("image/") ||
      allowedMimeTypes.has(file?.mimetype)
    ) {
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

const isAllowedMimeType = (mimeType = "") =>
  String(mimeType).startsWith("image/") || allowedMimeTypes.has(mimeType);

const getUserUploadPrefix = (userId) => `messages/${String(userId)}/`;

const isUserScopedMessagePathname = (pathname, userId) => {
  const value = String(pathname || "");
  const prefix = getUserUploadPrefix(userId);

  return (
    value.startsWith(prefix) &&
    value.length > prefix.length &&
    !value.includes("\\") &&
    !value.split("/").includes("..") &&
    !/[?#]/.test(value)
  );
};

const handleMessageAttachmentUpload = async (req, res) => {
  const token = getMessageBlobToken();

  if (!token) {
    return res.status(503).json({
      message:
        "Message attachment storage is not configured. Please contact an administrator.",
    });
  }

  try {
    const userId = req.user?.id;
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!userId || !isUserScopedMessagePathname(pathname, userId)) {
          throw new Error("Invalid message attachment pathname");
        }

        return {
          allowedContentTypes: ["image/*", ...allowedMimeTypes],
          maximumSizeInBytes: MAX_MESSAGE_UPLOAD_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 15 * 60 * 1000,
        };
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Message attachment token generation failed:", error);
    return res.status(400).json({
      message: error?.message || "Failed to prepare attachment upload",
    });
  }
};

const validateDirectMessageAttachments = async (req, res, next) => {
  if (Array.isArray(req.savedMessageAttachments)) return next();

  const requestedAttachments = req.body?.attachments;
  if (requestedAttachments === undefined) {
    req.savedMessageAttachments = [];
    return next();
  }

  if (!Array.isArray(requestedAttachments)) {
    return res.status(400).json({ message: "Attachments must be a list" });
  }

  if (requestedAttachments.length > MAX_MESSAGE_ATTACHMENTS) {
    return res.status(413).json({
      message: `Too many files. Maximum is ${MAX_MESSAGE_ATTACHMENTS} attachments.`,
    });
  }

  if (requestedAttachments.length === 0) {
    req.savedMessageAttachments = [];
    return next();
  }

  const token = getMessageBlobToken();
  if (!token) {
    return res.status(503).json({
      message:
        "Message attachment storage is not configured. Please contact an administrator.",
    });
  }

  try {
    const userId = req.user?.id;
    const attachments = await Promise.all(
      requestedAttachments.map(async (attachment) => {
        const pathname = String(
          attachment?.pathname || attachment?.url || "",
        ).trim();

        if (!isUserScopedMessagePathname(pathname, userId)) {
          const error = new Error("Invalid message attachment pathname");
          error.status = 400;
          throw error;
        }

        const blob = await head(pathname, { token });
        if (!blob || blob.pathname !== pathname) {
          const error = new Error("Message attachment was not found");
          error.status = 400;
          throw error;
        }

        if (blob.size > MAX_MESSAGE_UPLOAD_BYTES) {
          const error = new Error(
            `File too large. Maximum size is ${MAX_MESSAGE_UPLOAD_MB}MB.`,
          );
          error.status = 413;
          throw error;
        }

        if (!isAllowedMimeType(blob.contentType)) {
          const error = new Error("Unsupported message attachment type");
          error.status = 415;
          throw error;
        }

        const mimeType = blob.contentType || "application/octet-stream";
        return {
          url: blob.pathname,
          name: sanitizeFilename(attachment?.name),
          mimeType,
          size: blob.size || 0,
          kind: mimeType.startsWith("image/") ? "image" : "file",
        };
      }),
    );

    req.savedMessageAttachments = attachments;
    return next();
  } catch (error) {
    console.error("Message attachment validation failed:", error);
    return res.status(error?.status || 400).json({
      message: error?.message || "Invalid message attachment",
    });
  }
};

const saveMessageAttachments = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return next();

    if (IS_VERCEL_RUNTIME && !process.env.DOCUMENT_BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        message:
          "Server upload configuration error: missing DOCUMENT_BLOB_READ_WRITE_TOKEN.",
      });
    }

    const timestamp = Date.now();
    const savedAttachments = [];

    for (const [index, file] of files.entries()) {
      const originalName = sanitizeFilename(file.originalname);
      const extension = path.extname(originalName);
      const basename =
        path.basename(originalName, extension).slice(0, 80) || "attachment";
      const storedName = `message-${req.user?.id || "unknown"}-${timestamp}-${index}-${basename}${extension}`;
      const kind = file.mimetype?.startsWith("image/") ? "image" : "file";

      let idOrPath;
      if (process.env.DOCUMENT_BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`messages/${storedName}`, file.buffer, {
          access: "private", // switched to private
          contentType: file.mimetype || "application/octet-stream",
          token: process.env.DOCUMENT_BLOB_READ_WRITE_TOKEN,
        });
        idOrPath = blob.pathname; // store ID in DB, not public URL
      } else {
        const uploadPath = path.resolve(__dirname, "../uploads/messages");
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        await fs.promises.writeFile(
          path.join(uploadPath, storedName),
          file.buffer,
        );
        idOrPath = `/uploads/messages/${storedName}`;
      }

      savedAttachments.push({
        url: idOrPath, // now this is a blob ID, not a public URL
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
      message:
        "Unsupported file type. Upload images, PDF, Word, Excel, CSV, or text files.",
    });
  }

  return next(err);
};

module.exports = {
  MAX_MESSAGE_ATTACHMENTS,
  MAX_MESSAGE_UPLOAD_BYTES,
  allowedMimeTypes,
  getMessageBlobToken,
  handleMessageAttachmentUpload,
  isAllowedMimeType,
  isUserScopedMessagePathname,
  messageUpload,
  saveMessageAttachments,
  sanitizeFilename,
  validateDirectMessageAttachments,
  handleMessageUploadError,
};
