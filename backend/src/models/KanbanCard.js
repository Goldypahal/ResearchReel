const mongoose = require('mongoose');

const KanbanCardSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  assigneeId: { type: String },
  dueDate: { type: Date },
  comments: [{
    userId: { type: String },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('KanbanCard', KanbanCardSchema);
