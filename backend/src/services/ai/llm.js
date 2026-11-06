const axios = require('axios');

/**
 * Minimal Gemini client.
 * GEMINI_MODEL defaults to the `gemini-flash-latest` alias so the app keeps working
 * when Google retires specific model versions.
 */
const DEFAULT_MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-latest';

class AiUnavailableError extends Error {
  constructor(message = 'AI features are not configured on this server.') {
    super(message);
    this.statusCode = 503;
    this.code = 'AI_UNAVAILABLE';
  }
}

const isConfigured = (apiKey) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  return Boolean(key && !/YOUR_|Enter value/i.test(key));
};

const stripFences = (text) => text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

/**
 * @param {string} prompt
 * @param {{ json?: boolean, apiKey?: string, system?: string, history?: Array<{role:'user'|'model', text:string}>, timeoutMs?: number, temperature?: number }} opts
 */
const generate = async (prompt, opts = {}) => {
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;
  if (!isConfigured(apiKey)) throw new AiUnavailableError();

  const contents = [
    ...(opts.history || []).map((h) => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: prompt }] }
  ];

  const body = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { responseMimeType: 'application/json' } : {})
    }
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  let response;
  try {
    response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model || DEFAULT_MODEL())}:generateContent`,
      body,
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, timeout: opts.timeoutMs || 60000 }
    );
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`[AI] Gemini request failed (${status || 'network'}): ${detail}`);
    const e = new AiUnavailableError(status === 429
      ? 'The AI service is busy right now. Please try again in a minute.'
      : 'The AI service could not complete this request. Please try again.');
    throw e;
  }

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('').trim();
  if (!text) {
    throw new AiUnavailableError('The AI service returned an empty response. Please try again.');
  }
  if (!opts.json) return text;
  try {
    return JSON.parse(stripFences(text));
  } catch (e) {
    throw new AiUnavailableError('The AI service returned an unexpected response. Please try again.');
  }
};

module.exports = { generate, isConfigured, AiUnavailableError };
