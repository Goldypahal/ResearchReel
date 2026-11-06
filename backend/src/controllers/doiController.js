const axios = require('axios');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const crossrefHeaders = () => ({
  'User-Agent': `ResearchReel/1.0 (${process.env.CROSSREF_MAILTO ? `mailto:${process.env.CROSSREF_MAILTO}` : 'https://github.com/Goldypahal/ResearchReel'})`
});

const cleanDoi = (doi) => String(doi || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
const cleanOrcid = (o) => String(o || '').trim().replace(/^https?:\/\/orcid\.org\//i, '');

/** Normalises a Crossref work into the paper shape used across the app. */
function normalizeCrossrefWork(work) {
  const title = (work.title?.[0] || work['short-title']?.[0] || 'Untitled paper').replace(/\s+/g, ' ').trim();
  const abstract = (work.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const authors = (work.author || []).map((a) => ({
    name: [a.given, a.family].filter(Boolean).join(' ') || a.name || 'Unknown',
    orcid: a.ORCID ? cleanOrcid(a.ORCID.replace('http://', 'https://')) : null,
    affiliation: a.affiliation?.[0]?.name || null
  }));
  const year = work.published?.['date-parts']?.[0]?.[0]
    || work['published-print']?.['date-parts']?.[0]?.[0]
    || work['published-online']?.['date-parts']?.[0]?.[0]
    || null;
  const doi = work.DOI || null;
  return {
    doi,
    doi_url: doi ? `https://doi.org/${doi}` : null,
    pdf_url: (work.link || []).find((l) => l['content-type'] === 'application/pdf')?.URL || null,
    landing_url: work.URL || (doi ? `https://doi.org/${doi}` : null),
    title,
    abstract,
    authors,
    journal: (work['container-title']?.[0] || work.publisher || '').trim() || null,
    year,
    cited_by_count: work['is-referenced-by-count'] || 0,
    tags: (work.subject || []).slice(0, 5),
    type: work.type || null
  };
}

const fetchDoi = async (doi) => {
  const r = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi(doi))}`, { timeout: 10000, headers: crossrefHeaders() });
  return normalizeCrossrefWork(r.data.message);
};

exports.normalizeCrossrefWork = normalizeCrossrefWork;

exports.getPaperByDOI = async (req, res, next) => {
  const doi = cleanDoi(req.query.doi);
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) return sendError(res, 'Enter a valid DOI (e.g. 10.1038/nature12373).', 400, 'VALIDATION_ERROR', req);
  try {
    return sendSuccess(res, await fetchDoi(doi), 'Paper found.');
  } catch (error) {
    if (error.response?.status === 404) return sendError(res, 'No paper found for that DOI.', 404, 'NOT_FOUND', req);
    return sendError(res, 'Could not reach Crossref. Please try again.', 502, 'EXTERNAL_SERVICE_ERROR', req);
  }
};

exports.getPapersByORCID = async (req, res) => {
  const orcid = cleanOrcid(req.query.orcid);
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(orcid)) return sendError(res, 'Enter a valid ORCID iD (e.g. 0000-0002-1825-0097).', 400, 'VALIDATION_ERROR', req);
  try {
    const r = await axios.get(
      `https://api.crossref.org/works?filter=orcid:${encodeURIComponent(orcid)}&rows=50&sort=published&order=desc`,
      { timeout: 15000, headers: crossrefHeaders() }
    );
    const papers = (r.data.message.items || []).map(normalizeCrossrefWork);
    return sendSuccess(res, papers, `${papers.length} papers found.`);
  } catch (error) {
    return sendError(res, 'Could not reach Crossref. Please try again.', 502, 'EXTERNAL_SERVICE_ERROR', req);
  }
};

/**
 * POST /doi/import { dois: [...] } — looks up each DOI on Crossref and adds it to the
 * signed-in user's publications (metadata only). Already-imported DOIs are skipped.
 */
exports.importByDOIs = async (req, res, next) => {
  const dois = Array.isArray(req.body?.dois) ? [...new Set(req.body.dois.map(cleanDoi).filter(Boolean))].slice(0, 50) : [];
  if (!dois.length) return sendError(res, 'Provide at least one DOI.', 400, 'VALIDATION_ERROR', req);
  try {
    const results = await Promise.allSettled(dois.map(fetchDoi));
    const imported = [];
    const failed = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== 'fulfilled') { failed.push(dois[i]); continue; }
      const p = r.value;
      const ins = await db.query(
        `INSERT INTO documents (uploader_id, file_name, file_type, file_url, title, abstract, authors, doi, publication_year,
                                journal, tags, visibility, status, source, external_url, citation_count)
         VALUES ($1, $2, 'doi', NULL, $3, $4, $5, $6, $7, $8, $9, 'public', 'ready', 'doi', $10, $11)
         ON CONFLICT (uploader_id, lower(doi)) WHERE doi IS NOT NULL AND deleted_at IS NULL DO NOTHING
         RETURNING id`,
        [req.user.id, p.title.slice(0, 255), p.title, p.abstract || null, p.authors.map((a) => a.name).slice(0, 50), p.doi,
          p.year, p.journal, p.tags, p.landing_url, p.cited_by_count]
      );
      imported.push({ ...p, id: ins.rows[0]?.id || null, already_imported: !ins.rows.length });
    }
    return sendSuccess(res, { imported, failed }, `${imported.filter((p) => !p.already_imported).length} papers added to your profile.`);
  } catch (error) {
    next(error);
  }
};
