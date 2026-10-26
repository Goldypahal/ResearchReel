"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, FileText, Plus, Settings, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  ApiError, documentsApi, errorMessage, projectsApi, tasksApi,
  type LibraryDocument, type ProjectDetail, type ProjectMember, type Task, type TaskPriority, type TaskStatus,
} from '@/lib/api';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import { toast } from '@/components/ui/use-toast';
import { cn, displayName, timeAgo } from '@/lib/utils';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
];
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'text-muted-foreground bg-[var(--foreground)]/5',
  medium: 'text-sky-400 bg-sky-500/10',
  high: 'text-amber-400 bg-amber-500/10',
  urgent: 'text-red-400 bg-red-500/10',
};
type Tab = 'board' | 'papers' | 'members' | 'settings';

function TaskCard({ task, members, canEdit, onChange, onDelete }: {
  task: Task; members: ProjectMember[]; canEdit: boolean;
  onChange: (patch: Partial<Task>) => void; onDelete: () => void;
}) {
  const col = COLUMNS.findIndex((c) => c.key === task.status);
  const assignee = members.find((m) => m.id === task.assigned_to);
  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  return (
    <div className="group space-y-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{task.title}</p>
        {canEdit && <button onClick={onDelete} aria-label="Delete task" className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>}
      </div>
      {task.description && <p className="line-clamp-3 text-xs text-muted-foreground">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {canEdit ? (
          <select aria-label="Priority" value={task.priority} onChange={(e) => onChange({ priority: e.target.value as TaskPriority })} className={cn('rounded px-1.5 py-0.5 font-semibold capitalize', PRIORITY_STYLE[task.priority])}>
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : <span className={cn('rounded px-1.5 py-0.5 font-semibold capitalize', PRIORITY_STYLE[task.priority])}>{task.priority}</span>}
        {task.due_date && <span className={cn('inline-flex items-center gap-1', overdue ? 'text-red-400' : 'text-muted-foreground')}><Calendar size={11} /> {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        {canEdit ? (
          <select aria-label="Assignee" value={task.assigned_to || ''} onChange={(e) => onChange({ assigned_to: e.target.value || undefined })} className="max-w-[60%] truncate rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[11px]">
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{displayName(m)}</option>)}
          </select>
        ) : <span className="text-[11px] text-muted-foreground">{assignee ? displayName(assignee) : 'Unassigned'}</span>}
        {canEdit && (
          <div className="flex">
            <button disabled={col <= 0} onClick={() => onChange({ status: COLUMNS[col - 1].key })} aria-label="Move left" className="rounded p-1 disabled:opacity-20"><ChevronLeft size={14} /></button>
            <button disabled={col >= COLUMNS.length - 1} onClick={() => onChange({ status: COLUMNS[col + 1].key })} aria-label="Move right" className="rounded p-1 disabled:opacity-20"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewTask({ members, onCreate }: { members: ProjectMember[]; onCreate: (t: { title: string; priority: TaskPriority; assigned_to?: string; due_date?: string; description?: string }) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"><Plus size={14} /> New task</button>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onCreate({ title: title.trim(), priority, assigned_to: assignee || undefined, due_date: due || undefined, description: description.trim() || undefined });
    setBusy(false);
    if (ok) { setTitle(''); setDescription(''); setAssignee(''); setDue(''); setOpen(false); }
  };
  return (
    <form onSubmit={submit} className="w-full space-y-2 rounded-xl border border-indigo-500/30 p-3">
      <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="Task title" aria-label="Task title" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Details (optional)" aria-label="Task details" className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm" />
      <div className="flex flex-wrap gap-2 text-xs">
        <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 capitalize">
          {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select aria-label="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{displayName(m)}</option>)}
        </select>
        <input type="date" aria-label="Due date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1" />
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1 font-semibold">Cancel</button>
          <button type="submit" disabled={busy || !title.trim()} className="rounded-lg bg-indigo-600 px-3 py-1 font-semibold text-white disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </div>
    </form>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const [library, setLibrary] = useState<LibraryDocument[] | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [settings, setSettings] = useState({ name: '', description: '', research_field: '', visibility: 'private' as 'private' | 'public' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([projectsApi.getProjectById(projectId), tasksApi.getProjectTasks(projectId)]);
      setProject(p);
      setTasks(t);
      setSettings({ name: p.name, description: p.description || '', research_field: p.research_field || '', visibility: (p.visibility as 'private' | 'public') || 'private' });
      document.title = `${p.name} · ResearchReel`;
    } catch (err) {
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403)) setNotFound(true);
      else setError(errorMessage(err));
    }
  }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'papers' && !library) documentsApi.getUserAssets().then(setLibrary).catch(() => setLibrary([])); }, [tab, library]);

  const role = project?.user_role;
  const canEdit = role === 'owner' || role === 'editor';
  const isOwner = role === 'owner';
  const byColumn = useMemo(() => Object.fromEntries(COLUMNS.map((c) => [c.key, tasks.filter((t) => t.status === c.key)])) as Record<TaskStatus, Task[]>, [tasks]);

  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: 'destructive' });

  const createTask = async (payload: Parameters<typeof tasksApi.createTask>[1]) => {
    try { const t = await tasksApi.createTask(projectId, payload); setTasks((p) => [t, ...p]); return true; } catch (err) { fail('Could not add task')(err); return false; }
  };
  const patchTask = async (task: Task, patch: Partial<Task>) => {
    const prev = tasks;
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    try {
      const updated = await tasksApi.updateTask(task.id, { ...patch, assigned_to: 'assigned_to' in patch ? patch.assigned_to || null : undefined });
      setTasks((list) => list.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) { setTasks(prev); fail('Could not update task')(err); }
  };
  const deleteTask = async (task: Task) => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try { await tasksApi.deleteTask(task.id); setTasks((l) => l.filter((t) => t.id !== task.id)); } catch (err) { fail('Could not delete task')(err); }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const members = await projectsApi.addMember(projectId, inviteName.trim(), inviteRole);
      setProject((p) => (p ? { ...p, members } : p));
      setInviteName('');
      toast({ title: 'Member added', variant: 'success' });
    } catch (err) { fail('Could not add member')(err); }
  };
  const setMemberRole = async (m: ProjectMember, r: 'editor' | 'viewer') => {
    try { const members = await projectsApi.updateMember(projectId, m.id, r); setProject((p) => (p ? { ...p, members } : p)); } catch (err) { fail('Could not change role')(err); }
  };
  const removeMember = async (m: ProjectMember) => {
    const self = m.id === user?.id;
    if (!window.confirm(self ? 'Leave this project?' : `Remove ${displayName(m)} from the project?`)) return;
    try {
      const members = await projectsApi.removeMember(projectId, m.id);
      if (self) router.push('/projects');
      else setProject((p) => (p ? { ...p, members } : p));
    } catch (err) { fail('Could not remove member')(err); }
  };
  const addPaper = async (docId: string) => {
    try { const papers = await projectsApi.addPaper(projectId, docId); setProject((p) => (p ? { ...p, papers } : p)); } catch (err) { fail('Could not add paper')(err); }
  };
  const removePaper = async (docId: string) => {
    try { const papers = await projectsApi.removePaper(projectId, docId); setProject((p) => (p ? { ...p, papers } : p)); } catch (err) { fail('Could not remove paper')(err); }
  };
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await projectsApi.updateProject(projectId, settings);
      setProject((p) => (p ? { ...p, ...updated, user_role: p.user_role } : p));
      toast({ title: 'Project updated', variant: 'success' });
    } catch (err) { fail('Could not save')(err); }
  };
  const deleteProject = async () => {
    if (!project || window.prompt(`Type the project name to delete it: ${project.name}`) !== project.name) return;
    try { await projectsApi.deleteProject(projectId); router.push('/projects'); } catch (err) { fail('Could not delete project')(err); }
  };

  if (notFound) return <EmptyState className="mx-auto mt-16 max-w-md" title="Project not found" description="It may have been deleted, or you're not a member." action={<Link href="/projects" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Your projects</Link>} />;
  if (error) return <ErrorState className="mx-auto mt-16 max-w-md" message={error} onRetry={load} />;
  if (!project) return <LoadingBlock className="pt-32" />;

  const attachedIds = new Set(project.papers.map((p) => p.id));
  const tabs: { key: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { key: 'board', label: `Tasks (${tasks.length})`, icon: FileText, show: true },
    { key: 'papers', label: `Papers (${project.papers.length})`, icon: FileText, show: true },
    { key: 'members', label: `Members (${project.members.length})`, icon: Users, show: true },
    { key: 'settings', label: 'Settings', icon: Settings, show: isOwner },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push('/projects')} aria-label="Back to projects" className="mt-1 rounded-lg p-1.5 hover:bg-[var(--foreground)]/5"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{project.name}</h1>
            {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
            <p className="mt-1 text-xs capitalize text-muted-foreground">{project.visibility} · you&apos;re {role === 'owner' ? 'the owner' : `an ${role}`}{project.research_field ? ` · ${project.research_field}` : ''}</p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {project.members.slice(0, 6).map((m) => <Avatar key={m.id} src={m.avatar_url} name={displayName(m)} size="sm" className="ring-2 ring-[var(--background)]" />)}
        </div>
      </div>

      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn('shrink-0 border-b-2 px-4 py-3 text-xs font-semibold', tab === t.key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground')}>{t.label}</button>
        ))}
      </div>

      {tab === 'board' && (
        <div className="space-y-4">
          {canEdit && <NewTask members={project.members} onCreate={createTask} />}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((c) => (
              <section key={c.key} className="space-y-2 rounded-2xl bg-[var(--foreground)]/[0.03] p-3">
                <h2 className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.label} <span>{byColumn[c.key].length}</span></h2>
                {byColumn[c.key].length === 0 ? <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nothing here</p> : byColumn[c.key].map((t) => (
                  <TaskCard key={t.id} task={t} members={project.members} canEdit={canEdit} onChange={(patch) => patchTask(t, patch)} onDelete={() => deleteTask(t)} />
                ))}
              </section>
            ))}
          </div>
        </div>
      )}

      {tab === 'papers' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-2">
            {project.papers.length === 0 ? <EmptyState icon={<FileText size={20} />} title="No papers yet" description="Add papers from your library so everyone on the project can read them and ask AI about them." /> : project.papers.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4">
                <FileText size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                <Link href={`/library/documents/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold hover:text-indigo-400">{p.title}</p>
                  {p.abstract && <p className="line-clamp-2 text-xs text-muted-foreground">{p.abstract}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">Added {timeAgo(p.added_at)}{p.added_by_username ? ` by @${p.added_by_username}` : ''}</p>
                </Link>
                {canEdit && <button onClick={() => removePaper(p.id)} aria-label="Remove from project" className="rounded p-1 text-muted-foreground hover:text-red-400"><X size={14} /></button>}
              </div>
            ))}
          </section>
          {canEdit && (
            <aside className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add from your library</h3>
              {!library ? <LoadingBlock /> : library.filter((d) => !attachedIds.has(d.id)).length === 0 ? (
                <p className="text-xs text-muted-foreground">{library.length ? 'All your papers are already here.' : <>Your library is empty. <Link href="/library" className="text-indigo-400">Upload a paper</Link>.</>}</p>
              ) : library.filter((d) => !attachedIds.has(d.id)).map((d) => (
                <button key={d.id} onClick={() => addPaper(d.id)} className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 text-left text-xs hover:border-indigo-500/40">
                  <Plus size={14} className="shrink-0 text-indigo-400" /> <span className="truncate">{d.title}</span>
                </button>
              ))}
            </aside>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="max-w-2xl space-y-4">
          {isOwner && (
            <form onSubmit={invite} className="flex flex-wrap gap-2">
              <input required value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Username, e.g. ada_lab" aria-label="Username to add" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm" />
              <select aria-label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"><UserPlus size={14} /> Add</button>
            </form>
          )}
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {project.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${m.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={m.avatar_url} name={displayName(m)} size="sm" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayName(m)}</span><span className="text-xs text-muted-foreground">@{m.username}</span></span>
                </Link>
                {m.role === 'owner' ? <span className="text-xs font-semibold text-indigo-400">Owner</span> : isOwner ? (
                  <select aria-label={`Role for ${m.username}`} value={m.role} onChange={(e) => setMemberRole(m, e.target.value as 'editor' | 'viewer')} className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : <span className="text-xs capitalize text-muted-foreground">{m.role}</span>}
                {m.role !== 'owner' && (isOwner || m.id === user?.id) && (
                  <button onClick={() => removeMember(m)} className="text-xs font-semibold text-red-400 hover:underline">{m.id === user?.id ? 'Leave' : 'Remove'}</button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Editors can manage tasks and papers. Viewers can read everything but not change it.</p>
        </div>
      )}

      {tab === 'settings' && isOwner && (
        <div className="max-w-xl space-y-6">
          <form onSubmit={saveSettings} className="space-y-4 rounded-2xl border border-[var(--border)] p-5">
            <label className="block space-y-1 text-xs font-bold">Name<input required value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} maxLength={200} className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-normal" /></label>
            <label className="block space-y-1 text-xs font-bold">Description<textarea rows={3} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-normal" /></label>
            <label className="block space-y-1 text-xs font-bold">Field<input value={settings.research_field} onChange={(e) => setSettings({ ...settings, research_field: e.target.value })} maxLength={100} className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-normal" /></label>
            <label className="block space-y-1 text-xs font-bold">Visibility
              <select value={settings.visibility} onChange={(e) => setSettings({ ...settings, visibility: e.target.value as 'private' | 'public' })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-normal">
                <option value="private">Private — members only</option>
                <option value="public">Public</option>
              </select>
            </label>
            <div className="flex justify-end"><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Save</button></div>
          </form>
          <div className="space-y-2 rounded-2xl border border-red-500/30 p-5">
            <h3 className="text-sm font-bold text-red-400">Delete project</h3>
            <p className="text-xs text-muted-foreground">Removes the project, its tasks and member list. Papers stay in their owners&apos; libraries.</p>
            <button onClick={deleteProject} className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10">Delete project…</button>
          </div>
        </div>
      )}
    </div>
  );
}
