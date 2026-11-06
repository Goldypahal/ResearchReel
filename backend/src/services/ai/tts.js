const axios = require('axios');
const fsp = require('fs/promises');
const { isConfigured } = require('./llm');

/**
 * Text-to-speech via Gemini's TTS model. Returns a path to raw 16-bit 24kHz mono PCM,
 * or null when TTS is unavailable (the reel is then rendered with silent audio).
 */
const synthesizeToPcm = async (text, outPath, apiKey = null) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!text || !isConfigured(key) || process.env.REEL_TTS === 'off') return null;
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        contents: [{ parts: [{ text: `Read this clearly, in an engaging explainer tone: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || 'Kore' } } }
        }
      },
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, timeout: 60000 }
    );
    const part = (res.data?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
    if (!part) return null;
    await fsp.writeFile(outPath, Buffer.from(part.inlineData.data, 'base64'));
    const rate = /rate=(\d+)/.exec(part.inlineData.mimeType || '');
    return { path: outPath, sampleRate: rate ? parseInt(rate[1], 10) : 24000 };
  } catch (err) {
    console.warn('[TTS] Speech synthesis failed, rendering without voiceover:', err.response?.data?.error?.message || err.message);
    return null;
  }
};

module.exports = { synthesizeToPcm };
