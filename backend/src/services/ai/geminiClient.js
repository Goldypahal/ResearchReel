const { generate, isConfigured } = require('./llm');

/**
 * Reel script generation. With an API key, Gemini writes the script from the paper's
 * real content. Without one, an extractive script is built from the paper's own
 * abstract/text so nothing is invented.
 */
const STYLES = ['indigo-dark', 'slate-gradient', 'emerald-glow', 'crimson-deep', 'violet-pulsar'];

const clamp = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const normaliseScenes = (scenes) => (Array.isArray(scenes) ? scenes : [])
  .filter((s) => s && (s.title || s.dialogue))
  .slice(0, 8)
  .map((s, i) => ({
    title: clamp(s.title, 60) || `Scene ${i + 1}`,
    visualDescription: clamp(s.visualDescription, 200),
    dialogue: clamp(s.dialogue, 300),
    duration: Math.min(Math.max(parseInt(s.duration, 10) || 8, 3), 20),
    backgroundStyle: STYLES.includes(s.backgroundStyle) ? s.backgroundStyle : STYLES[i % STYLES.length]
  }));

const splitSentences = (text) => (text || '')
  .replace(/\s+/g, ' ')
  .split(/(?<=[.!?])\s+(?=[A-Z])/)
  .map((s) => s.trim())
  .filter((s) => s.length > 40 && s.length < 300);

const extractiveScenes = (paperTitle, sourceText, offset = 0, count = 4) => {
  const sentences = splitSentences(sourceText);
  const scenes = [{
    title: clamp(paperTitle, 60),
    visualDescription: 'Title card',
    dialogue: clamp(`A quick look at the paper "${paperTitle}".`, 300),
    duration: 6,
    backgroundStyle: STYLES[0]
  }];
  const picked = sentences.slice(offset, offset + count);
  const labels = ['Background', 'Approach', 'Findings', 'Implications', 'Details', 'Takeaway'];
  picked.forEach((sentence, i) => scenes.push({
    title: labels[i % labels.length],
    visualDescription: 'Key sentence from the paper',
    dialogue: clamp(sentence, 300),
    duration: Math.min(Math.max(Math.round(sentence.split(' ').length / 2.6), 5), 15),
    backgroundStyle: STYLES[(i + 1) % STYLES.length]
  }));
  scenes.push({
    title: 'Read the full paper',
    visualDescription: 'Closing card',
    dialogue: 'Read the full paper on ResearchReel.',
    duration: 4,
    backgroundStyle: STYLES[4]
  });
  return scenes;
};

const sourceBlock = (paperTitle, summaryText, keyPoints, fullText) => `
Paper title: ${paperTitle}
Summary/abstract: ${summaryText || '(none)'}
Key points: ${JSON.stringify(keyPoints || [])}
Paper text (may be truncated):
"""
${(fullText || '').slice(0, 60000)}
"""`;

const SCENE_SPEC = `Each scene object has: "title" (on-screen text, max 40 chars), "visualDescription" (what to show),
"dialogue" (voiceover, max 200 chars), "duration" (integer seconds, 5-12), "backgroundStyle" (one of ${STYLES.map((s) => `"${s}"`).join(', ')}).
Only state things supported by the paper text. Do not invent results or numbers.`;

const generateReelScript = async (paperTitle, summaryText, keyPoints, userApiKey = null, fullText = '') => {
  if (!isConfigured(userApiKey)) return extractiveScenes(paperTitle, summaryText || fullText);
  try {
    const scenes = await generate(
      `Write a 30-60 second short-form video script explaining this research paper to a curious, educated audience.
Return a JSON array of 4-6 scene objects. ${SCENE_SPEC}
${sourceBlock(paperTitle, summaryText, keyPoints, fullText)}`,
      { json: true, apiKey: userApiKey || undefined }
    );
    const out = normaliseScenes(scenes);
    return out.length ? out : extractiveScenes(paperTitle, summaryText || fullText);
  } catch (err) {
    console.error('[Reel AI] Script generation failed, using extractive script:', err.message);
    return extractiveScenes(paperTitle, summaryText || fullText);
  }
};

const generateReelSeries = async (paperTitle, summaryText, keyPoints, userApiKey = null, options = {}, fullText = '') => {
  const { parts_mode = 'auto' } = options;
  const requested = Math.min(Math.max(parseInt(options.parts_count, 10) || 3, 2), 6);

  const fallback = () => {
    const n = parts_mode === 'auto' ? 3 : requested;
    return Array.from({ length: n }, (_, i) => ({
      part_number: i + 1,
      total_parts: n,
      title: clamp(`Part ${i + 1}: ${paperTitle}`, 80),
      description: `Part ${i + 1} of ${n}`,
      scenes: extractiveScenes(paperTitle, summaryText ? `${summaryText} ${fullText}` : fullText, i * 3, 3)
    }));
  };

  if (!isConfigured(userApiKey)) return fallback();

  try {
    const instruction = parts_mode === 'auto'
      ? 'Split the paper into 2-4 parts depending on its depth.'
      : `Split the paper into exactly ${requested} parts.`;
    const series = await generate(
      `Create a multi-part short-form video series explaining this research paper. ${instruction}
Return a JSON array of part objects: { "part_number", "total_parts", "title" (max 50 chars), "description" (max 150 chars), "scenes": [4-5 scene objects] }.
${SCENE_SPEC}
${sourceBlock(paperTitle, summaryText, keyPoints, fullText)}`,
      { json: true, apiKey: userApiKey || undefined }
    );
    if (!Array.isArray(series) || !series.length) return fallback();
    const total = series.length;
    return series.slice(0, 6).map((p, i) => ({
      part_number: i + 1,
      total_parts: total,
      title: clamp(p.title, 80) || `Part ${i + 1}`,
      description: clamp(p.description, 200),
      scenes: normaliseScenes(p.scenes)
    })).filter((p) => p.scenes.length);
  } catch (err) {
    console.error('[Reel AI] Series generation failed, using extractive series:', err.message);
    return fallback();
  }
};

module.exports = { generateReelScript, generateReelSeries, extractiveScenes };
