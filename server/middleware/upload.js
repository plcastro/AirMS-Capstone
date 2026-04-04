const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// Define absolute path to project root
const uploadDir = path.join(process.cwd(), "uploads");

// Create folder if it doesn't exist (Local only)
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn("Folder creation skipped (likely Vercel environment)");
  }
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

const processImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filename = `user-${req.params.id}-${Date.now()}.jpeg`;
    // Use path.resolve to be 100% sure of the location
    const uploadPath = path.resolve(__dirname, "../uploads");
    const filepath = path.join(uploadPath, filename);

    // Ensure directory exists right before saving
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // ACTUAL WRITE OPERATION
    await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .toFormat("jpeg")
      .toFile(filepath); // This MUST complete before next()

    // Attach the path for the DB
    req.file.savedPath = `/uploads/${filename}`;

    console.log("File saved successfully to:", filepath);
    next();
  } catch (err) {
    console.error("SHARP ERROR:", err);
    res.status(500).json({ message: "Image processing failed" });
  }
};

module.exports = { upload, processImage };
