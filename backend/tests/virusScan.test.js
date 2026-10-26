const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

/**
 * A stand-in clamd that speaks the INSTREAM protocol: it reassembles the
 * length-prefixed chunks and reports FOUND when the payload contains the
 * EICAR marker, OK otherwise.
 */
const startFakeClamd = () =>
  new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buf = Buffer.alloc(0);
      let headerSeen = false;
      const body = [];
      socket.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        if (!headerSeen) {
          const end = buf.indexOf(0);
          if (end === -1) return;
          headerSeen = true;
          buf = buf.subarray(end + 1);
        }
        while (buf.length >= 4) {
          const len = buf.readUInt32BE(0);
          if (len === 0) {
            const payload = Buffer.concat(body).toString();
            socket.end(payload.includes('EICAR') ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
            return;
          }
          if (buf.length < 4 + len) return;
          body.push(buf.subarray(4, 4 + len));
          buf = buf.subarray(4 + len);
        }
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const tmpFile = (content) => {
  const p = path.join(os.tmpdir(), `scan-${Date.now()}-${Math.random()}.bin`);
  fs.writeFileSync(p, content);
  return p;
};

const run = (middleware, file) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body, next: false }); },
    };
    middleware({ file: { path: file, originalname: 'paper.pdf' } }, res, () => resolve({ status: 200, next: true }));
  });

describe('virus scan middleware', () => {
  let server;
  const load = (env) => {
    jest.resetModules();
    Object.assign(process.env, env);
    return require('../src/middleware/virusScan');
  };

  beforeAll(async () => { server = await startFakeClamd(); });
  afterAll(() => {
    server.close();
    delete process.env.CLAMAV_HOST;
    delete process.env.CLAMAV_PORT;
  });

  it('passes clean files through', async () => {
    const mw = load({ CLAMAV_HOST: '127.0.0.1', CLAMAV_PORT: String(server.address().port) });
    const file = tmpFile('a perfectly ordinary paper '.repeat(10000));
    const result = await run(mw, file);
    expect(result.next).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('rejects infected files and deletes them', async () => {
    const mw = load({ CLAMAV_HOST: '127.0.0.1', CLAMAV_PORT: String(server.address().port) });
    const file = tmpFile('X5O!P%@AP EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
    const result = await run(mw, file);
    expect(result.status).toBe(422);
    expect(result.body.error.code).toBe('MALWARE_DETECTED');
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(file)).toBe(false);
  });

  it('fails closed when the configured scanner is unreachable', async () => {
    const mw = load({ CLAMAV_HOST: '127.0.0.1', CLAMAV_PORT: '1' });
    const result = await run(mw, tmpFile('anything'));
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('SCAN_UNAVAILABLE');
  });

  it('lets uploads through when no scanner is configured', async () => {
    delete process.env.CLAMAV_HOST;
    jest.resetModules();
    const mw = require('../src/middleware/virusScan');
    const result = await run(mw, tmpFile('anything'));
    expect(result.next).toBe(true);
  });
});
