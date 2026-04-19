const multer = require("multer");
const sharp = require("sharp");
const { put } = require("@vercel/blob");

const path = require("path");
const fs = require("fs");

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 2);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const processImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const processedImage = await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .toFormat("jpeg")
      .toBuffer();

    const fileLabel =
      req.file.fieldname === "signature" ? "signature" : "image";
    const filename = `${fileLabel}-${req.params.id || "unknown"}-${Date.now()}.jpeg`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`users/${filename}`, processedImage, {
        access: "public",
        contentType: "image/jpeg",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      req.file.savedPath = blob.url;
      return next();
    }

    // Local fallback when Blob token is not configured (development)
    const uploadPath = path.resolve(__dirname, "../uploads");
    const filepath = path.join(uploadPath, filename);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    await fs.promises.writeFile(filepath, processedImage);

    req.file.savedPath = `/uploads/${filename}`;
    return next();
  } catch (err) {
    console.error("SHARP ERROR:", err);
    if (err.message && err.message.includes("Input buffer contains unsupported image format")) {
      return res.status(415).json({ message: "Unsupported image format. Please upload JPG or PNG." });
    }
    return res.status(500).json({ message: "Image processing failed" });
  }
};

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
      });
    }

    return res.status(400).json({
      message: err.message || "Upload failed",
    });
  }

  return next(err);
};

module.exports = { upload, processImage, handleUploadError };
