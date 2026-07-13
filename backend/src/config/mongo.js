const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/researchreel_workspaces';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB Connected: Workspaces Datastore');
  } catch (error) {
    logger.error('MongoDB Connection Error:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(-1);
    }
  }
};

module.exports = connectMongo;
