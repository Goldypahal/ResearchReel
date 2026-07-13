const Workspace = require('../models/Workspace');
const KanbanCard = require('../models/KanbanCard');

exports.createWorkspace = async (req, res) => {
  try {
    const { name, organizationId } = req.body;
    const userId = req.user?.id || 'anonymous';

    const newWorkspace = new Workspace({
      name,
      organizationId,
      members: [{ userId, role: 'admin' }]
    });

    await newWorkspace.save();
    res.status(201).json({ success: true, data: newWorkspace });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const workspaces = await Workspace.find({ 'members.userId': userId });
    res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
