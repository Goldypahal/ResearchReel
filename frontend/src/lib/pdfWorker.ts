import { pdfjs } from 'react-pdf';

// Served from /public (see scripts/copy-pdf-worker.mjs) — same version as react-pdf's pdf.js.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export { pdfjs };
