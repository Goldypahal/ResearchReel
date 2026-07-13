const BANNED_KEYWORDS = [
  'spam', 'buy bitcoin', 'make money fast', 'earn cash', 'cheap pills',
  'viagra', 'cialis', 'free followers', 'follow back', 'like for like'
];

/**
 * Validates text content against standard moderation guidelines.
 * Returns { clean: boolean, matchedKeyword: string | null }
 */
const moderateText = (text) => {
  if (!text) return { clean: true, matchedKeyword: null };
  
  const lowerText = text.toLowerCase();
  for (const keyword of BANNED_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { clean: false, matchedKeyword: keyword };
    }
  }
  
  return { clean: true, matchedKeyword: null };
};

module.exports = {
  moderateText
};
