// Copies the pdf.js worker that react-pdf actually uses into public/, so PDFs
// render without loading code from a CDN and the worker always matches the
// API version react-pdf was built against.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fromReactPdf = createRequire(createRequire(join(root, 'package.json')).resolve('react-pdf'));
const worker = fromReactPdf.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(worker, join(root, 'public', 'pdf.worker.min.mjs'));
const version = fromReactPdf('pdfjs-dist/package.json').version;
console.log(`pdf.js worker ${version} -> public/pdf.worker.min.mjs`);
