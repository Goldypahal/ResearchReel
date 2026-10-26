import { fetchApi } from './client';

export interface Project {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  research_field?: string;
  visibility: string;
  user_role?: string;
  member_count?: number;
  task_count?: number;
  done_count?: number;
  created_at: string;
  updated_at: string;
}

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  verification_status: string;
  institution?: string | null;
  role: ProjectRole;
  joined_at?: string;
}

export interface ProjectPaper {
  id: string;
  title: string;
  abstract?: string | null;
  doi?: string | null;
  status: string;
  file_type?: string | null;
  added_at: string;
  added_by_username?: string | null;
}

export interface ProjectDetail extends Project {
  user_role: ProjectRole;
  members: ProjectMember[];
  papers: ProjectPaper[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  research_field?: string;
  visibility?: 'public' | 'private';
}

export const projectsApi = {
  getProjects: (): Promise<Project[]> => fetchApi('/projects'),
  createProject: (payload: CreateProjectPayload): Promise<Project> =>
    fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProjectById: (id: string): Promise<ProjectDetail> => fetchApi(`/projects/${id}`),
  updateProject: (id: string, data: Partial<CreateProjectPayload>): Promise<Project> =>
    fetchApi(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addMember: (id: string, username: string, role: 'editor' | 'viewer'): Promise<ProjectMember[]> =>
    fetchApi(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ username, role }) }),
  updateMember: (id: string, userId: string, role: 'editor' | 'viewer'): Promise<ProjectMember[]> =>
    fetchApi(`/projects/${id}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (id: string, userId: string): Promise<ProjectMember[]> =>
    fetchApi(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  addPaper: (id: string, documentId: string): Promise<ProjectPaper[]> =>
    fetchApi(`/projects/${id}/papers`, { method: 'POST', body: JSON.stringify({ document_id: documentId }) }),
  removePaper: (id: string, documentId: string): Promise<ProjectPaper[]> =>
    fetchApi(`/projects/${id}/papers/${documentId}`, { method: 'DELETE' }),
  deleteProject: (id: string) =>
    fetchApi(`/projects/${id}`, {
      method: 'DELETE',
    }),
};
