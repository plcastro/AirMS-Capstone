const multer = require("multer");
const sharp = require("sharp");
const { put } = require("@vercel/blob");

const path = require("path");
const fs = require("fs");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
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
    res.status(500).json({ message: "Image processing failed" });
  }
};

module.exports = { upload, processImage };
