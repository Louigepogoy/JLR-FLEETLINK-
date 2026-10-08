const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname) || '.jpg'}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
};

const uploadRegistrationDocs = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: 'licenseImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 },
  { name: 'ownerOr', maxCount: 1 },
  { name: 'ownerCr', maxCount: 1 },
]);

const uploadVehicleImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: 'vehicleImage', maxCount: 1 },
  { name: 'proofFront', maxCount: 1 },
  { name: 'proofBack', maxCount: 1 },
  { name: 'proofSide', maxCount: 1 },
  { name: 'proofInterior', maxCount: 1 },
  { name: 'proofOwner', maxCount: 1 },
  { name: 'proofExtra', maxCount: 1 },
  { name: 'proofOr', maxCount: 1 },
  { name: 'proofCr', maxCount: 1 },
]);

const uploadProfileAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
]);

const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CHAT_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const CHAT_VIDEO_TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };

const chatMediaFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (CHAT_VIDEO_TYPES[ext] === file.mimetype) return cb(null, true);
  imageFilter(req, file, (err) => (
    err ? cb(new Error('Only JPEG, PNG, WebP images or MP4, WebM, MOV videos are allowed')) : cb(null, true)
  ));
};

// Multer only supports one size limit, so this allows the video maximum; sendMedia enforces the
// smaller image limit itself.
const uploadChatMedia = multer({
  storage,
  limits: { fileSize: CHAT_VIDEO_MAX_BYTES },
  fileFilter: chatMediaFilter,
}).single('chatMedia');

// Photo/video evidence when a customer rejects a vehicle at pickup. Same limits as chat media.
const MAX_DISPUTE_EVIDENCE_FILES = 5;
const uploadDisputeEvidence = multer({
  storage,
  limits: { fileSize: CHAT_VIDEO_MAX_BYTES, files: MAX_DISPUTE_EVIDENCE_FILES },
  fileFilter: chatMediaFilter,
}).array('evidence', MAX_DISPUTE_EVIDENCE_FILES);

module.exports = {
  uploadRegistrationDocs, uploadVehicleImages, uploadProfileAvatar, uploadChatMedia, uploadDisputeEvidence,
  uploadDir, CHAT_IMAGE_MAX_BYTES,
};
