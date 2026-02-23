const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage (temporary, we will process image with Sharp)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Unsupported file type"), false);
};

// Multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 }, // 1 MB max
});

// Middleware to resize and save image
const processImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = req.file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "");
    const filename = `${Date.now()}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    // Resize to max 400x400 and save
    await sharp(req.file.buffer)
      .resize(400, 400, { fit: "inside" })
      .toFile(filepath);

    // Store relative path for MongoDB
    req.file.savedPath = `/uploads/${filename}`;
    next();
  } catch (err) {
    console.error("Image processing error:", err);
    res.status(500).json({ message: "Failed to process image" });
  }
};

module.exports = { upload, processImage };
