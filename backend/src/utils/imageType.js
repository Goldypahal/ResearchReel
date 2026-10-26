/** Detects an image type from its first bytes, so stored files match their content, not the client's claim. */
const sniffImage = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return '.webp';
  if (['GIF87a', 'GIF89a'].includes(buf.slice(0, 6).toString('latin1'))) return '.gif';
  return null;
};

const readHead = (fs, filePath, n = 16) => {
  const head = Buffer.alloc(n);
  const fd = fs.openSync(filePath, 'r');
  try { fs.readSync(fd, head, 0, n, 0); } finally { fs.closeSync(fd); }
  return head;
};

module.exports = { sniffImage, readHead };
