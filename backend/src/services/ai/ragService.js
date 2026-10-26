const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const RAG_SERVICE_URL = (process.env.RAG_SERVICE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const REQUEST_TIMEOUT = 30000;
const INGEST_TIMEOUT = 180000; // parsing + embedding a long PDF takes a while

/** Shared secret for the internal RAG service (see RAG_API_KEY in research_rag). */
const ragHeaders = () => (process.env.RAG_API_KEY ? { 'x-api-key': process.env.RAG_API_KEY } : {});

class RagService {
  /** RAG is opt-in: set RAG_SERVICE_URL (docker-compose does). */
  isConfigured() {
    return Boolean(process.env.RAG_SERVICE_URL);
  }

  /**
   * Send a document for ingestion into the RAG pipeline.
   * @param {string} filePath - Path to the file or a Buffer.
   * @param {string} fileName - Original file name.
   */
  async ingestDocument(fileBuffer, fileName) {
    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), fileName);
    const response = await axios.post(`${RAG_SERVICE_URL}/ingest`, form, {
      params: { parser_name: 'pymupdf' },
      headers: ragHeaders(),
      timeout: INGEST_TIMEOUT,
      maxBodyLength: 60 * 1024 * 1024,
    });
    return response.data;
  }

  /**
   * Ask a question against the research knowledge base.
   * @param {string} query - The user's question.
   * @param {string[]} paperIds - Optional list of paper IDs to filter by.
   */
  async query(query, paperIds = [], expandContext = false) {
    try {
      const response = await axios.post(`${RAG_SERVICE_URL}/query`, {
        query: query,
        paper_ids: paperIds.length > 0 ? paperIds : null,
        expand_context: expandContext,
        prompt_version: "v1"
      }, {
        headers: ragHeaders(),
        timeout: REQUEST_TIMEOUT
      });

      return response.data;
    } catch (error) {
      console.error('RAG Query Error:', error.message);
      throw error;
    }
  }

  async summarize(paperId) {
    try {
      const prompt = "Summarize this paper in 3 key points and provide a 60-second video script hook for an academic reel.";
      const response = await axios.post(`${RAG_SERVICE_URL}/query`, {
        query: prompt,
        paper_ids: [paperId]
      }, {
        headers: ragHeaders(),
        timeout: REQUEST_TIMEOUT
      });
      return response.data;
    } catch (error) {
      console.error('RAG Summarize Error:', error.message);
      throw error;
    }
  }

  /**
   * Compare multiple papers.
   */
  async compare(query, paperIds) {
    try {
      const response = await axios.post(`${RAG_SERVICE_URL}/compare`, {
        query: query,
        paper_ids: paperIds
      }, {
        headers: ragHeaders(),
        timeout: REQUEST_TIMEOUT
      });

      return response.data;
    } catch (error) {
      console.error('RAG Comparison Error:', error.message);
      throw error;
    }
  }
}

module.exports = new RagService();
