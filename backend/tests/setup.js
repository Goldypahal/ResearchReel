process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-long-enough';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 bytes for AES
process.env.ELASTICSEARCH_URL = 'http://localhost:9200';
process.env.NEO4J_URI = 'neo4j://localhost:7687';
process.env.PORT = '9000';
