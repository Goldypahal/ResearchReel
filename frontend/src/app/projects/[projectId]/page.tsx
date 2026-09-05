"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Loader2, CheckCircle2, Clock, PlayCircle, Eye } from 'lucide-react';
import { projectsApi, Project } from '@/lib/api/projects';
import { tasksApi, Task, TaskStatus } from '@/lib/api/tasks';

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'members'>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      try {
        const [projData, taskData] = await Promise.all([
          projectsApi.getProjectById(projectId),
          tasksApi.getProjectTasks(projectId),
        ]);
        setProject(projData);
        setTasks(taskData);
      } catch (err: any) {
        console.error('Project workspace error:', err);
        setError(err.message || 'Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const created = await tasksApi.createTask(projectId, {
        title: newTaskTitle.trim(),
        priority: 'medium',
      });
      setTasks(prev => [created, ...prev]);
      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (err: any) {
      console.error('Create task error:', err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await tasksApi.updateTask(taskId, { status: newStatus });
    } catch (err: any) {
      console.error('Status update error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-indigo-400 gap-2">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-xs font-semibold">Loading project workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-red-400">{error || 'Project not found'}</p>
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const columns: { key: TaskStatus; label: string; color: string; icon: any }[] = [
    { key: 'todo', label: 'To Do', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock },
    { key: 'in_progress', label: 'In Progress', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: PlayCircle },
    { key: 'review', label: 'Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Eye },
    { key: 'done', label: 'Done', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/projects')}
            className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)]">
              {project.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {project.research_field || 'General Research'} • {project.visibility.toUpperCase()} • Role: {project.user_role || 'member'}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsAddingTask(true)}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        {(['overview', 'documents', 'tasks', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Quick Add Task Modal */}
      {isAddingTask && (
        <form onSubmit={handleCreateTask} className="p-4 rounded-xl bg-[var(--foreground)]/5 border border-indigo-500/30 flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none"
            autoFocus
          />
          <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
            Save
          </button>
          <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-2 text-xs text-muted-foreground">
            Cancel
          </button>
        </form>
      )}

      {/* Standardized 4-Column Kanban Board Tab */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.key);
            const Icon = col.icon;

            return (
              <div key={col.key} className="space-y-3 bg-[var(--foreground)]/[0.015] border border-[var(--border)] rounded-2xl p-4 min-h-[300px]">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={col.color.split(' ')[0]} />
                    <span className="text-[var(--foreground)]">{col.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${col.color}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.map(task => (
                    <div key={task.id} className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-sm space-y-2 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          {task.priority || 'medium'}
                        </span>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-[10px] bg-transparent border border-[var(--border)] rounded px-1 text-muted-foreground"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      <h4 className={`text-xs font-bold text-[var(--foreground)] ${task.status === 'done' ? 'line-through opacity-70' : ''}`}>
                        {task.title}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab !== 'tasks' && (
        <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-sm capitalize text-[var(--foreground)]">{activeTab} Section</p>
          <p>{project.description || 'Project details and collaborators.'}</p>
        </div>
      )}
    </div>
  );
}
