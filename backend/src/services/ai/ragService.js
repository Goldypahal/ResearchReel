const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000/api/v1';
const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

class RagService {
  /**
   * Send a document for ingestion into the RAG pipeline.
   * @param {string} filePath - Path to the file or a Buffer.
   * @param {string} fileName - Original file name.
   */
  async ingestDocument(fileBuffer, fileName) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });
      formData.append('parser_name', 'pymupdf');

      const response = await axios.post(`${RAG_SERVICE_URL}/ingest`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: REQUEST_TIMEOUT
      });

      return response.data;
    } catch (error) {
      console.error('RAG Ingestion Error:', error.message);
      throw error;
    }
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
