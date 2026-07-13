const logger = require('../utils/logger');

/**
 * Plagiarism/Originality Checker Mock Service.
 * Simulates a request to a Turnitin or CrossRef API.
 */
class PlagiarismService {
  /**
   * Scans document text for similarity against published databases.
   * @param {string} text - The raw extracted text from the document.
   * @returns {Promise<object>} - { isOriginal: boolean, similarityScore: number, flaggedSections: array }
   */
  static async scanDocument(text) {
    logger.info('Initiating plagiarism integrity scan...');
    
    // Simulate network delay for API request (e.g. Turnitin)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For the mock, we randomly assign a similarity score, but typically 
    // it would be around 5-15% for normal papers (quotes/references).
    // A score > 25% is usually flagged.
    
    // We'll generate a random score between 0 and 100 for this mock.
    // In a real scenario, this would evaluate the 'text' string against vectors.
    const mockScore = Math.floor(Math.random() * 40); 
    const THRESHOLD = 25; // 25% threshold
    const isOriginal = mockScore <= THRESHOLD;

    if (!isOriginal) {
      logger.warn(`Plagiarism check failed! Similarity score: ${mockScore}% (Threshold: ${THRESHOLD}%)`);
    } else {
      logger.info(`Plagiarism check passed. Similarity score: ${mockScore}%`);
    }

    return {
      isOriginal,
      similarityScore: mockScore,
      flaggedSections: isOriginal ? [] : [
        {
          startIdx: 0,
          endIdx: 200,
          sourceMatch: "https://example.com/published-paper",
          matchPercentage: mockScore
        }
      ]
    };
  }
}

module.exports = PlagiarismService;
