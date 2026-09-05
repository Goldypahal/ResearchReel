import { fetchApi } from './client';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: TaskPriority;
  due_date?: string;
}

export interface UpdateTaskPayload {
  status?: TaskStatus;
  position?: number;
  title?: string;
  description?: string;
  assigned_to?: string;
  priority?: TaskPriority;
}

export const tasksApi = {
  getProjectTasks: (projectId: string): Promise<Task[]> => fetchApi(`/projects/${projectId}/tasks`),

  createTask: (projectId: string, payload: CreateTaskPayload): Promise<Task> =>
    fetchApi(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (taskId: string, payload: UpdateTaskPayload): Promise<Task> =>
    fetchApi(`/projects/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
