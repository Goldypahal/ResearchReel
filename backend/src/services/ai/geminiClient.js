const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const STYLES = ['indigo-dark', 'slate-gradient', 'emerald-glow', 'crimson-deep', 'violet-pulsar'];

const usableKey = (key) => (key && !key.includes('YOUR_GEMINI_API_KEY') ? key : null);

/** True when a server key (or the given user key) can be used. */
const isConfigured = (userApiKey = null) => Boolean(usableKey(userApiKey) || usableKey(GEMINI_API_KEY));

/**
 * Single Gemini call. Returns the text (or parsed JSON when `json` is set).
 * Throws on any failure — callers decide what the user sees.
 */
const generateText = async (prompt, { json = false, apiKey = null, timeout = 30000 } = {}) => {
  const key = usableKey(apiKey) || usableKey(GEMINI_API_KEY);
  if (!key) {
    const err = new Error('Gemini is not configured.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.4 } : { temperature: 0.3 },
    },
    { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, timeout }
  );
  const text = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text.trim()) throw new Error('Empty response from Gemini');
  if (!json) return text.trim();
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  return JSON.parse(cleaned);
};

/** Sentences from the paper's own text, used when no model is available. */
const sentencesFrom = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 260);

const shortTitle = (s, max = 40) => {
  const words = s.replace(/[^\w\s-]/g, '').split(/\s+/).slice(0, 6).join(' ');
  return words.length > max ? `${words.slice(0, max - 1)}…` : words;
};

/**
 * Extractive script: every line is a sentence from the paper's abstract or key
 * points, so nothing is invented. Used when Gemini isn't configured or fails.
 */
const extractiveScenes = (paperTitle, sourceText, keyPoints = [], maxScenes = 5) => {
  const lines = [...(keyPoints || []).map(String), ...sentencesFrom(sourceText)].filter(Boolean);
  const unique = [...new Set(lines)].slice(0, Math.max(1, maxScenes - 1));
  const scenes = [{
    title: shortTitle(paperTitle) || 'New paper',
    visualDescription: 'Title card with the paper title',
    dialogue: `This reel covers the paper "${paperTitle.slice(0, 120)}".`,
    duration: 6,
    backgroundStyle: STYLES[0],
  }];
  unique.forEach((line, i) => {
    scenes.push({
      title: shortTitle(line),
      visualDescription: 'Key sentence from the paper on screen',
      dialogue: line.slice(0, 200),
      duration: Math.min(12, Math.max(6, Math.round(line.length / 18))),
      backgroundStyle: STYLES[(i + 1) % STYLES.length],
    });
  });
  return scenes;
};

const sanitizeScenes = (scenes) =>
  (Array.isArray(scenes) ? scenes : [])
    .filter((s) => s && (s.dialogue || s.title))
    .map((s) => ({
      title: String(s.title || '').slice(0, 60),
      visualDescription: String(s.visualDescription || '').slice(0, 300),
      dialogue: String(s.dialogue || '').slice(0, 300),
      duration: Math.min(20, Math.max(3, parseInt(s.duration, 10) || 8)),
      backgroundStyle: STYLES.includes(s.backgroundStyle) ? s.backgroundStyle : STYLES[0],
    }));

const SCENE_SPEC = `For each scene provide:
- title: short on-screen overlay text (max 40 chars)
- visualDescription: what is shown on screen
- dialogue: the voiceover line (max 200 chars)
- duration: seconds, integer 5-12
- backgroundStyle: one of ${STYLES.map((s) => `'${s}'`).join(', ')}
Only state findings that appear in the provided text. Do not invent numbers, results or claims.`;

/** Returns { scenes, source: 'gemini' | 'extractive' }. */
const generateReelScript = async (paperTitle, sourceText, keyPoints, userApiKey = null) => {
  if (isConfigured(userApiKey) && sourceText) {
    try {
      const scenes = await generateText(
        `Write a 30-60 second short-form video script explaining this research paper to a scientifically literate audience.
Paper title: "${paperTitle}"
Paper text (abstract and excerpts):
"""${String(sourceText).slice(0, 12000)}"""
Key points: ${JSON.stringify(keyPoints || [])}

Return a JSON array of 4 to 6 scenes. ${SCENE_SPEC}`,
        { json: true, apiKey: userApiKey }
      );
      const clean = sanitizeScenes(scenes);
      if (clean.length) return { scenes: clean, source: 'gemini' };
    } catch (error) {
      console.error('[Gemini Client] script generation failed:', error.message);
    }
  }
  return { scenes: extractiveScenes(paperTitle, sourceText, keyPoints), source: 'extractive' };
};

/** Returns { series: [{part_number,total_parts,title,description,scenes}], source }. */
const generateReelSeries = async (paperTitle, sourceText, keyPoints, userApiKey = null, options = {}) => {
  const { parts_mode = 'auto', parts_count = 3 } = options;
  const wanted = parts_mode === 'auto' ? null : Math.min(6, Math.max(2, parseInt(parts_count, 10) || 3));

  if (isConfigured(userApiKey) && sourceText) {
    try {
      const series = await generateText(
        `Split this research paper into a multi-part short-form video series.
Paper title: "${paperTitle}"
Paper text (abstract and excerpts):
"""${String(sourceText).slice(0, 16000)}"""
Key points: ${JSON.stringify(keyPoints || [])}

${wanted ? `Use exactly ${wanted} parts.` : 'Choose 2 to 4 parts depending on the depth of the paper.'}
Return a JSON array of parts. Each part has: part_number, total_parts, title (max 50 chars), description (max 150 chars), scenes (4-5 scenes).
${SCENE_SPEC}`,
        { json: true, apiKey: userApiKey, timeout: 45000 }
      );
      const parts = (Array.isArray(series) ? series : [])
        .map((p, i, all) => ({
          part_number: i + 1,
          total_parts: all.length,
          title: String(p.title || `Part ${i + 1}`).slice(0, 80),
          description: String(p.description || '').slice(0, 200),
          scenes: sanitizeScenes(p.scenes),
        }))
        .filter((p) => p.scenes.length);
      if (parts.length) return { series: parts, source: 'gemini' };
    } catch (error) {
      console.error('[Gemini Client] series generation failed:', error.message);
    }
  }

  // Extractive fallback: distribute the paper's own sentences across parts.
  const lines = [...(keyPoints || []).map(String), ...sentencesFrom(sourceText)];
  const total = wanted || Math.min(3, Math.max(1, Math.ceil(lines.length / 4)));
  const per = Math.max(1, Math.ceil(lines.length / total));
  const series = Array.from({ length: total }, (_, i) => {
    const chunk = lines.slice(i * per, (i + 1) * per);
    return {
      part_number: i + 1,
      total_parts: total,
      title: `Part ${i + 1} of ${total}`,
      description: chunk[0] ? chunk[0].slice(0, 150) : `Part ${i + 1} of "${paperTitle.slice(0, 80)}"`,
      scenes: extractiveScenes(paperTitle, chunk.join(' '), [], 5),
    };
  });
  return { series, source: 'extractive' };
};

module.exports = {
  isConfigured,
  generateText,
  generateReelScript,
  generateReelSeries,
  extractiveScenes,
  sanitizeScenes,
  STYLES,
};
