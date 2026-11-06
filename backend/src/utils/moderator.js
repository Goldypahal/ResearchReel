/**
 * Lightweight automated text moderation for obvious spam. Human moderation
 * (reports queue) handles everything else.
 */
const BANNED_PATTERNS = [
  /\bbuy bitcoin\b/i, /\bmake money fast\b/i, /\bearn cash\b/i, /\bcheap pills\b/i,
  /\bviagra\b/i, /\bcialis\b/i, /\bfree followers\b/i, /\blike for like\b/i
];

const moderateText = (text) => {
  if (!text) return { clean: true, matchedKeyword: null };
  for (const re of BANNED_PATTERNS) {
    const m = String(text).match(re);
    if (m) return { clean: false, matchedKeyword: m[0].toLowerCase() };
  }
  return { clean: true, matchedKeyword: null };
};

module.exports = { moderateText };
