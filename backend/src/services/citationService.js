const { runQuery } = require('../config/neo4j');
const logger = require('../utils/logger');

/**
 * Maps a paper to Neo4j.
 * @param {object} paper - { doi, title, publishedYear }
 */
const createOrUpdatePaper = async (paper) => {
  const query = `
    MERGE (p:Paper {doi: $doi})
    SET p.title = $title, p.publishedYear = $publishedYear
    RETURN p
  `;
  try {
    const result = await runQuery(query, paper);
    return result.records[0]?.get('p').properties;
  } catch (error) {
    logger.error('Error in createOrUpdatePaper:', error);
    throw error;
  }
};

/**
 * Maps an author to Neo4j.
 * @param {object} author - { orcid, name }
 */
const createOrUpdateAuthor = async (author) => {
  const query = `
    MERGE (a:Author {orcid: $orcid})
    SET a.name = $name
    RETURN a
  `;
  try {
    const result = await runQuery(query, author);
    return result.records[0]?.get('a').properties;
  } catch (error) {
    logger.error('Error in createOrUpdateAuthor:', error);
    throw error;
  }
};

/**
 * Creates an AUTHORED relationship between Author and Paper.
 * @param {string} orcid - Author's ORCID
 * @param {string} doi - Paper's DOI
 */
const linkAuthorToPaper = async (orcid, doi) => {
  const query = `
    MATCH (a:Author {orcid: $orcid})
    MATCH (p:Paper {doi: $doi})
    MERGE (a)-[r:AUTHORED]->(p)
    RETURN r
  `;
  try {
    await runQuery(query, { orcid, doi });
  } catch (error) {
    logger.error('Error in linkAuthorToPaper:', error);
    throw error;
  }
};

/**
 * Creates a CITES relationship between two papers.
 * @param {string} sourceDoi - The citing paper
 * @param {string} targetDoi - The cited paper
 * @param {string} sentiment - 'supports', 'contradicts', 'neutral'
 */
const addCitation = async (sourceDoi, targetDoi, sentiment = 'neutral') => {
  const query = `
    MATCH (p1:Paper {doi: $sourceDoi})
    MATCH (p2:Paper {doi: $targetDoi})
    MERGE (p1)-[r:CITES]->(p2)
    SET r.sentiment = $sentiment
    RETURN r
  `;
  try {
    await runQuery(query, { sourceDoi, targetDoi, sentiment });
  } catch (error) {
    logger.error('Error in addCitation:', error);
    throw error;
  }
};

/**
 * Retrieves the citation subgraph for a specific paper.
 * @param {string} doi - The target paper's DOI
 * @returns {object} { nodes, links } suitable for D3.js frontend
 */
const getPaperGraph = async (doi) => {
  // Query 1 degree of separation (papers citing this, and papers this cites)
  // Also get the authors for those papers
  const query = `
    MATCH (target:Paper {doi: $doi})
    OPTIONAL MATCH (target)-[r1:CITES]-(related:Paper)
    OPTIONAL MATCH (author:Author)-[r2:AUTHORED]->(p:Paper) WHERE p.doi = target.doi OR p.doi = related.doi
    
    RETURN 
      target, 
      collect(DISTINCT related) as relatedPapers,
      collect(DISTINCT r1) as citations,
      collect(DISTINCT author) as authors,
      collect(DISTINCT r2) as authoredRelations
  `;

  try {
    const result = await runQuery(query, { doi });
    if (result.records.length === 0) return { nodes: [], links: [] };

    const record = result.records[0];
    const target = record.get('target');
    if (!target) return { nodes: [], links: [] };

    const nodesMap = new Map();
    const links = [];

    // Helper to add node
    const addNode = (node, group) => {
      const id = node.properties.doi || node.properties.orcid;
      if (!nodesMap.has(id)) {
        nodesMap.set(id, { id, group, ...node.properties });
      }
    };

    addNode(target, 'target_paper');
    
    record.get('relatedPapers').forEach(p => {
      if(p) addNode(p, 'paper');
    });

    record.get('authors').forEach(a => {
      if(a) addNode(a, 'author');
    });

    // Process CITES links
    record.get('citations').forEach(r => {
      if (r) {
        links.push({
          source: r.start.properties?.doi || result.records[0].get('target').properties.doi, 
          // Note: In neo4j driver, getting node identities from relationship can be tricky without node references.
          // For simplicity in this D3 adapter, we'll map them via standard Cypher return objects if possible, 
          // but we can query them more explicitly below:
        });
      }
    });

    // Let's refine the query for D3 format output directly
    const d3Query = `
      MATCH (n)-[r]->(m)
      WHERE (n:Paper {doi: $doi}) OR (m:Paper {doi: $doi}) OR 
            (n:Author AND m:Paper AND m.doi = $doi)
      RETURN 
        n.doi AS sourceId, labels(n)[0] AS sourceLabel, n AS sourceProps,
        m.doi AS targetId, labels(m)[0] AS targetLabel, m AS targetProps,
        type(r) AS relType, r.sentiment AS sentiment,
        n.orcid AS sourceOrcid, m.orcid AS targetOrcid
    `;
    
    const d3Result = await runQuery(d3Query, { doi });
    
    d3Result.records.forEach(rec => {
      const srcId = rec.get('sourceId') || rec.get('sourceOrcid');
      const tgtId = rec.get('targetId') || rec.get('targetOrcid');
      
      nodesMap.set(srcId, { id: srcId, label: rec.get('sourceLabel'), ...rec.get('sourceProps').properties });
      nodesMap.set(tgtId, { id: tgtId, label: rec.get('targetLabel'), ...rec.get('targetProps').properties });
      
      links.push({
        source: srcId,
        target: tgtId,
        type: rec.get('relType'),
        sentiment: rec.get('sentiment') || null
      });
    });

    // If there are no relationships yet, at least return the target node
    if (nodesMap.size === 0) {
      nodesMap.set(target.properties.doi, { id: target.properties.doi, label: 'Paper', ...target.properties });
    }

    return {
      nodes: Array.from(nodesMap.values()),
      links
    };

  } catch (error) {
    logger.error('Error in getPaperGraph:', error);
    throw error;
  }
};

module.exports = {
  createOrUpdatePaper,
  createOrUpdateAuthor,
  linkAuthorToPaper,
  addCitation,
  getPaperGraph
};
