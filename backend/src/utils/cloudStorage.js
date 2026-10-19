const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

// Uploaded photos/videos live in Cloudinary when CLOUDINARY_URL is set (cloudinary://key:secret@cloud_name), so
// localhost and the deployed site show the same files and nothing is lost when the host redeploys. Without it,
// files stay on the local disk under /uploads like before.
const FOLDER = 'jlr-fleetlink';

const isCloudEnabled = () => Boolean(process.env.CLOUDINARY_URL);

/** Uploads a local file to Cloudinary and returns its https URL. `publicId` makes re-uploads idempotent. */
const uploadFileToCloud = async (filePath, publicId) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: FOLDER,
    public_id: publicId,
    resource_type: 'auto',
    overwrite: true,
    use_filename: false,
  });
  return result.secure_url;
};

const publicIdFor = (filename) => path.parse(filename).name;

/**
 * The public URL of a file multer just saved: its Cloudinary URL when it was uploaded there, otherwise the
 * old local /uploads address on `baseUrl`.
 */
const uploadedUrl = (file, baseUrl) => file.cloudUrl || `${baseUrl}/uploads/${file.filename}`;

/** Collects every file multer put on the request (single, array or fields). */
const requestFiles = (req) => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  return req.files ? Object.values(req.files).flat() : [];
};

/**
 * Wraps a multer middleware: after it saves the files to disk, each one is moved to Cloudinary (when
 * configured), the temp copy is deleted and `file.cloudUrl` is set. Same (req, res, next) signature.
 */
const withCloudStorage = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, async (err) => {
    if (err) return next(err);
    if (!isCloudEnabled()) return next();
    const files = requestFiles(req);
    try {
      await Promise.all(files.map(async (file) => {
        file.cloudUrl = await uploadFileToCloud(file.path, publicIdFor(file.filename));
        await fs.promises.unlink(file.path).catch(() => {});
      }));
      next();
    } catch (uploadError) {
      console.error('Cloud upload failed:', uploadError.message);
      await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
      const error = new Error('Could not store the uploaded file. Please try again.');
      error.status = 502;
      next(error);
    }
  });
};

/** Best-effort delete of a Cloudinary file by its URL (used when a chat photo is no longer referenced). */
const deleteCloudFile = async (url) => {
  if (!isCloudEnabled() || !url || !url.includes('res.cloudinary.com')) return;
  const base = path.parse(url.split('/').pop()).name;
  const type = url.includes('/video/upload/') ? 'video' : 'image';
  await cloudinary.uploader.destroy(`${FOLDER}/${base}`, { resource_type: type }).catch(() => {});
};

module.exports = {
  isCloudEnabled, uploadFileToCloud, publicIdFor, uploadedUrl, withCloudStorage, deleteCloudFile,
};
