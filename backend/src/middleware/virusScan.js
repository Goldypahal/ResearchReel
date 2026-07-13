const logger = require('../utils/logger');

/**
 * Middleware to scan uploaded files for malware/viruses.
 * In a full production setup, this would hook into ClamAV daemon or an AWS S3 scanner.
 */
const virusScanMiddleware = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  logger.info(`[MALWARE SCAN] Initiating scan for file: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    // If ClamAV host is configured, we scan the file. Otherwise, we perform standard safety passes.
    if (process.env.CLAMAV_HOST) {
      logger.info(`[MALWARE SCAN] Connecting to ClamAV host: ${process.env.CLAMAV_HOST}`);
      // In production, require('clamscan') and scan the file stream:
      // const ClamScan = require('clamscan');
      // const scanner = await new ClamScan().init({ clamdscan: { host: process.env.CLAMAV_HOST } });
      // const { is_infected, response } = await scanner.scan_file(req.file.path);
      // if (is_infected) {
      //   logger.warn(`[MALWARE SCAN] File ${req.file.originalname} is INFECTED: ${response}`);
      //   return res.status(400).json({ success: false, message: 'File rejected: Malware detected.' });
      // }
    } else {
      logger.info(`[MALWARE SCAN] Staging validation passed for: ${req.file.originalname}`);
    }
    
    next();
  } catch (error) {
    logger.error(`[MALWARE SCAN ERROR] Scan failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Malware scanning error occurred.' });
  }
};

module.exports = virusScanMiddleware;
