const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organizationId: { type: String, required: false },
  members: [{
    userId: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
