const fs = require('fs');
const net = require('net');
const path = require('path');
const { createUser, resetDb, close } = require('./helpers');

/** A tiny clamd stand-in: reads an INSTREAM upload and flags the EICAR test string. */
let server;
let received = 0;
const startClamd = () => new Promise((resolve) => {
  server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    socket.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (buf.toString().startsWith('zPING')) return socket.end('PONG\0');
      const cmd = 'zINSTREAM\0'.length;
      let offset = cmd;
      const parts = [];
      while (buf.length >= offset + 4) {
        const len = buf.readUInt32BE(offset);
        if (len === 0) {
          received += 1;
          const body = Buffer.concat(parts).toString('latin1');
          return socket.end(body.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE') ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
        }
        if (buf.length < offset + 4 + len) return;
        parts.push(buf.subarray(offset + 4, offset + 4 + len));
        offset += 4 + len;
      }
    });
  });
  server.listen(0, '127.0.0.1', resolve);
});

const PDF = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.pdf'));
const EICAR_PDF = Buffer.concat([PDF, Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')]);
let alice;

beforeAll(async () => {
  await resetDb();
  await startClamd();
  alice = await createUser('scanalice');
});
afterAll(async () => {
  delete process.env.CLAMAV_HOST;
  delete process.env.CLAMAV_PORT;
  await new Promise((r) => server.close(r));
  await close();
});

const upload = (buffer) => alice.agent.post('/api/v1/documents')
  .attach('file', buffer, { filename: 'paper.pdf', contentType: 'application/pdf' });

test('without ClamAV configured, uploads are accepted', async () => {
  expect((await upload(PDF)).status).toBe(201);
});

describe('with ClamAV configured', () => {
  beforeAll(() => {
    process.env.CLAMAV_HOST = '127.0.0.1';
    process.env.CLAMAV_PORT = String(server.address().port);
  });

  test('clean files are scanned and accepted', async () => {
    const before = received;
    expect((await upload(PDF)).status).toBe(201);
    expect(received).toBe(before + 1);
  });

  test('infected files are rejected', async () => {
    const r = await upload(EICAR_PDF);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('MALWARE_DETECTED');
  });

  test('health reports the scanner', async () => {
    const r = await alice.agent.get('/api/v1/health');
    expect(r.body.services.malware_scan.status).toBe('UP');
  });

  test('uploads fail closed when the scanner is down', async () => {
    process.env.CLAMAV_PORT = '1'; // nothing listens here
    const r = await upload(PDF);
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('SCAN_UNAVAILABLE');
  });
});
