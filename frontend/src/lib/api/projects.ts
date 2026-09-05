import { fetchApi } from './client';

export interface Project {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  research_field?: string;
  visibility: string;
  user_role?: string;
  created_at: string;
  updated_at: string;
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
  getProjectById: (id: string): Promise<Project> => fetchApi(`/projects/${id}`),
  deleteProject: (id: string) =>
    fetchApi(`/projects/${id}`, {
      method: 'DELETE',
    }),
};
