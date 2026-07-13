const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

// Retrieve Neo4j credentials from environment variables
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j_password';

let driver;

try {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  
  // Verify connectivity
  driver.getServerInfo()
    .then((serverInfo) => {
      logger.info(`✅ Connected to Neo4j database: ${serverInfo.address}`);
    })
    .catch((error) => {
      logger.error('❌ Failed to connect to Neo4j:', error);
    });
} catch (error) {
  logger.error('❌ Neo4j driver instantiation failed:', error);
}

/**
 * Executes a Cypher query with parameters.
 * @param {string} query - The Cypher query string
 * @param {object} params - Parameters object
 * @returns {Promise<any>}
 */
const runQuery = async (query, params = {}) => {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result;
  } catch (error) {
    logger.error(`Cypher query execution failed: ${query}`, error);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Closes the Neo4j driver connection.
 */
const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
    logger.info('Neo4j connection closed.');
  }
};

module.exports = {
  driver,
  runQuery,
  closeNeo4j
};
