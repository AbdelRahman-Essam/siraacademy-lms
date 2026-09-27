const multer = require("multer");
const path = require("path");
const os = require("os");

// Temp disk storage — files land here before being pushed to Cloudinary
// (thumbnails/attachments) or run through process_video.py + Drive (lesson video).
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB ceiling for raw lesson video
});

module.exports = upload;
