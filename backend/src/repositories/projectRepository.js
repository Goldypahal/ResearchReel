const { pool } = require('../config/db');

class ProjectRepository {
  /**
   * Transactionally creates a project and adds creator as owner in project_members table
   */
  async createProjectWithOwner({ creatorId, name, description, researchField, visibility = 'private' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Project
      const insertProjectQuery = `
        INSERT INTO projects (creator_id, name, description, research_field, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const projectResult = await client.query(insertProjectQuery, [
        creatorId,
        name,
        description || '',
        researchField || null,
        visibility
      ]);
      const project = projectResult.rows[0];

      // 2. Insert Owner Membership in project_members
      const insertMemberQuery = `
        INSERT INTO project_members (project_id, user_id, role, joined_at)
        VALUES ($1, $2, 'owner', NOW());
      `;
      await client.query(insertMemberQuery, [project.id, creatorId]);

      await client.query('COMMIT');
      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds projects accessible by user (created or joined as member)
   */
  async findUserProjects(userId) {
    const query = `
      SELECT DISTINCT p.*, pm.role as user_role
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE (p.creator_id = $1 OR pm.user_id = $1) AND p.deleted_at IS NULL
      ORDER BY p.updated_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Finds a specific project by ID
   */
  async findById(projectId) {
    const query = `
      SELECT * FROM projects
      WHERE id = $1 AND deleted_at IS NULL;
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows[0] || null;
  }

  /**
   * Soft deletes a project
   */
  async softDelete(projectId) {
    const query = `
      UPDATE projects
      SET deleted_at = NOW()
      WHERE id = $1
      RETURNING id;
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows.length > 0;
  }
}

module.exports = new ProjectRepository();
