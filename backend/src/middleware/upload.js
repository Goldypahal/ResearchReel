const multer = require('multer');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = ['application/pdf'];

const memoryUpload = ({ allowed, maxMb }) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`Unsupported file type: ${file.mimetype}`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return cb(err);
  }
});

/** Matches the leading bytes of a buffer against expected file signatures. */
const sniff = (buffer, mimetype) => {
  if (!buffer || buffer.length < 4) return false;
  const hex = buffer.subarray(0, 12).toString('hex');
  switch (mimetype) {
    case 'application/pdf': return buffer.subarray(0, 4).toString() === '%PDF';
    case 'image/jpeg': return hex.startsWith('ffd8ff');
    case 'image/png': return hex.startsWith('89504e47');
    case 'image/gif': return buffer.subarray(0, 3).toString() === 'GIF';
    case 'image/webp': return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    default: return false;
  }
};

/** Rejects uploads whose content does not match the declared type. */
const verifyFileSignatures = (req, res, next) => {
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : (req.file ? [req.file] : []);
  for (const f of files) {
    if (!sniff(f.buffer, f.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `"${f.originalname}" does not look like a valid ${f.mimetype} file.`,
        error: { code: 'VALIDATION_ERROR', message: 'File content does not match its type.' }
      });
    }
  }
  next();
};

module.exports = {
  imageUpload: memoryUpload({ allowed: IMAGE_TYPES, maxMb: 10 }),
  documentUpload: memoryUpload({ allowed: DOCUMENT_TYPES, maxMb: 25 }),
  mixedUpload: memoryUpload({ allowed: [...IMAGE_TYPES, ...DOCUMENT_TYPES], maxMb: 25 }),
  verifyFileSignatures,
  IMAGE_TYPES,
  DOCUMENT_TYPES
};
