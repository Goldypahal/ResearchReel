const axios = require('axios');

/**
 * Fetch papers by a single DOI - returns full metadata for one paper.
 * GET /api/doi/paper?doi=10.xxxx/xxxxx
 */
exports.getPaperByDOI = async (req, res) => {
  const { doi } = req.query;

  if (!doi) {
    return res.status(400).json({ success: false, message: 'DOI is required.' });
  }

  try {
    const cleanDOI = doi.replace(/^https?:\/\/doi\.org\//i, '');
    const response = await axios.get(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`,
      { timeout: 10000, headers: { 'User-Agent': 'ResearchReel/1.0 (mailto:admin@researchreel.io)' } }
    );

    const work = response.data.message;
    const paper = normalizeCrossrefWork(work);
    return res.status(200).json({ success: true, data: paper });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, message: 'DOI not found on Crossref.' });
    }
    console.error('DOI fetch error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch paper from Crossref.' });
  }
};

/**
 * Fetch ALL papers by an author's ORCID.
 * GET /api/doi/author?orcid=0000-0001-2345-6789
 */
exports.getPapersByORCID = async (req, res) => {
  const { orcid } = req.query;

  if (!orcid) {
    return res.status(400).json({ success: false, message: 'ORCID is required.' });
  }

  try {
    const cleanORCID = orcid.trim().replace(/^https?:\/\/orcid\.org\//i, '');
    const response = await axios.get(
      `https://api.crossref.org/works?filter=orcid:${cleanORCID}&rows=50&sort=published&order=desc`,
      { timeout: 15000, headers: { 'User-Agent': 'ResearchReel/1.0 (mailto:admin@researchreel.io)' } }
    );

    const items = response.data.message.items || [];
    const papers = items.map(normalizeCrossrefWork);

    return res.status(200).json({
      success: true,
      count: papers.length,
      data: papers,
    });
  } catch (error) {
    console.error('ORCID fetch error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch papers from Crossref via ORCID.' });
  }
};

/**
 * Import papers by a list of DOIs (batch).
 * POST /api/doi/import
 * Body: { dois: ["10.xxxx/xxx", ...] }
 */
exports.importByDOIs = async (req, res) => {
  const { dois } = req.body;

  if (!Array.isArray(dois) || dois.length === 0) {
    return res.status(400).json({ success: false, message: 'dois array is required.' });
  }

  try {
    const results = await Promise.allSettled(
      dois.slice(0, 20).map(async (doi) => {
        const cleanDOI = doi.replace(/^https?:\/\/doi\.org\//i, '');
        const r = await axios.get(
          `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`,
          { timeout: 10000, headers: { 'User-Agent': 'ResearchReel/1.0 (mailto:admin@researchreel.io)' } }
        );
        return normalizeCrossrefWork(r.data.message);
      })
    );

    const papers = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map((_, i) => dois[i]);

    return res.status(200).json({ success: true, count: papers.length, data: papers, failed });
  } catch (error) {
    console.error('Batch DOI import error:', error.message);
    return res.status(500).json({ success: false, message: 'Batch import failed.' });
  }
};

// ──────────────────────────────────────────────────────────────
// Helper: normalize a Crossref work object into ResearchReel post format
// ──────────────────────────────────────────────────────────────
function normalizeCrossrefWork(work) {
  const title = (work.title?.[0] || work['short-title']?.[0] || 'Untitled Paper').trim();
  const abstract = (work.abstract || '').replace(/<[^>]+>/g, '').trim();

  // Authors
  const authors = (work.author || []).map(a => {
    const name = [a.given, a.family].filter(Boolean).join(' ');
    const orcid = a.ORCID ? a.ORCID.replace('http://orcid.org/', '').replace('https://orcid.org/', '') : null;
    return { name, orcid, affiliation: a.affiliation?.[0]?.name || null };
  });
  const primaryAuthor = authors[0] || { name: 'Unknown Author', orcid: null };

  // Journal / source
  const journal = (work['container-title']?.[0] || work.publisher || 'Unknown Journal').trim();

  // Year
  const year =
    work.published?.['date-parts']?.[0]?.[0] ||
    work['published-print']?.['date-parts']?.[0]?.[0] ||
    work['published-online']?.['date-parts']?.[0]?.[0] ||
    null;

  // DOI & links
  const doi = work.DOI || null;
  const doiUrl = doi ? `https://doi.org/${doi}` : null;
  const pdfUrl = (work.link || []).find(l => l['content-type'] === 'application/pdf')?.URL || null;
  const landingUrl = work.URL || doiUrl;

  // Subject tags
  const subjects = (work.subject || []).slice(0, 5).map(s => s.replace(/\s+/g, ''));

  // Citations
  const citedByCount = work['is-referenced-by-count'] || 0;

  // Build a concise summary / objective snippet
  const summarySnippet = abstract
    ? abstract.length > 600
      ? abstract.slice(0, 600) + '…'
      : abstract
    : `${title}. Published in ${journal}${year ? ` (${year})` : ''}. By ${authors.map(a => a.name).join(', ')}.`;

  return {
    id: `doi-${doi?.replace(/\//g, '-') || Date.now()}`,
    doi,
    doi_url: doiUrl,
    pdf_url: pdfUrl,
    landing_url: landingUrl,
    title,
    abstract,
    summary_text: summarySnippet,
    authors,
    primary_author: primaryAuthor,
    journal,
    year,
    cited_by_count: citedByCount,
    tags: subjects,
    content_type: 'document',
    // Feed-compatible fields
    author_name: primaryAuthor.name,
    author_username: `@${primaryAuthor.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
    verification_status: 'scholar',
    caption: summarySnippet.slice(0, 200),
    document_name: `${title.slice(0, 60)}.pdf`,
    reaction_count: Math.floor(citedByCount / 2) + Math.floor(Math.random() * 50),
    source: 'crossref',
  };
}
