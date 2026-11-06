"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, FileText, ListChecks, Settings, Trash2, UserPlus, LogOut, Plus } from 'lucide-react';
import { projectsApi, documentsApi, errorMessage, type Project, type Task, type ProjectMember, type Paper } from '@/lib/api';
import { Spinner, ErrorState, Avatar, Modal, inputClass, primaryBtn, secondaryBtn, dangerBtn } from '@/components/common';
import KanbanBoard from '@/components/collaboration/KanbanBoard';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/format';

type Tab = 'tasks' | 'documents' | 'members' | 'settings';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [docs, setDocs] = useState<(Paper & { added_at: string; added_by_username: string | null })[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('tasks');
  const [invite, setInvite] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [pickOpen, setPickOpen] = useState(false);
  const [myPapers, setMyPapers] = useState<Paper[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settings, setSettings] = useState({ name: '', description: '', research_field: '', visibility: 'private' });

  const load = useCallback(async () => {
    try {
      const [p, t, m, d] = await Promise.all([projectsApi.get(projectId), projectsApi.tasks(projectId), projectsApi.members(projectId), projectsApi.documents(projectId)]);
      setProject(p); setTasks(t); setMembers(m); setDocs(d);
      setSettings({ name: p.name, description: p.description || '', research_field: p.research_field || '', visibility: p.visibility });
    } catch (err) { setError(errorMessage(err)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message={error} />;
  if (!project) return <Spinner />;

  const role = project.user_role;
  const isOwner = role === 'owner';
  const canEdit = role === 'owner' || role === 'editor';

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectsApi.addMember(project.id, invite.trim().replace(/^@/, ''), inviteRole);
      setInvite(''); setMembers(await projectsApi.members(project.id));
      toast({ title: 'Member added', variant: 'success' });
    } catch (err) { toast({ title: 'Could not add member', description: errorMessage(err), variant: 'destructive' }); }
  };
  const removeMember = async (m: ProjectMember) => {
    try {
      await projectsApi.removeMember(project.id, m.id);
      if (m.id === user?.id) { router.replace('/projects'); return; }
      setMembers((ms) => ms.filter((x) => x.id !== m.id));
    } catch (err) { toast({ title: 'Could not remove member', description: errorMessage(err), variant: 'destructive' }); }
  };
  const openPicker = async () => {
    setPickOpen(true);
    try { setMyPapers((await documentsApi.list({ scope: 'mine' })).documents); } catch { setMyPapers([]); }
  };
  const addDoc = async (id: string) => {
    try { await projectsApi.addDocument(project.id, id); setDocs(await projectsApi.documents(project.id)); setPickOpen(false); }
    catch (err) { toast({ title: 'Could not add paper', description: errorMessage(err), variant: 'destructive' }); }
  };
  const removeDoc = async (id: string) => {
    try { await projectsApi.removeDocument(project.id, id); setDocs((d) => d.filter((x) => x.id !== id)); }
    catch (err) { toast({ title: 'Could not remove paper', description: errorMessage(err), variant: 'destructive' }); }
  };
  const saveSettings = async () => {
    try { const p = await projectsApi.update(project.id, settings as Partial<Project>); setProject({ ...project, ...p }); toast({ title: 'Project updated', variant: 'success' }); }
    catch (err) { toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' }); }
  };
  const deleteProject = async () => {
    try { await projectsApi.remove(project.id); router.replace('/projects'); }
    catch (err) { toast({ title: 'Could not delete project', description: errorMessage(err), variant: 'destructive' }); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'tasks', label: 'Tasks', icon: ListChecks }, { id: 'documents', label: `Papers (${docs.length})`, icon: FileText },
    { id: 'members', label: `Members (${members.length})`, icon: Users }, ...(isOwner ? [{ id: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Link href="/projects" className="text-sm text-zinc-500 inline-flex items-center gap-1.5 hover:text-zinc-300"><ArrowLeft size={15} /> Projects</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--foreground)]/5 capitalize">{role}</span>
          {project.research_field && <span className="text-xs text-zinc-500">{project.research_field}</span>}
        </div>
        {project.description && <p className="text-sm text-zinc-400 max-w-3xl whitespace-pre-wrap">{project.description}</p>}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-indigo-500' : 'border-transparent text-zinc-500'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && <KanbanBoard tasks={tasks} setTasks={setTasks} projectId={project.id} members={members} readOnly={!canEdit} />}

      {tab === 'documents' && (
        <div className="space-y-3 max-w-3xl">
          {canEdit && <button className={secondaryBtn} onClick={openPicker}><Plus size={15} /> Add a paper</button>}
          {docs.length === 0 ? <p className="text-sm text-zinc-500">No papers in this project yet.</p> : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
                  <FileText size={18} className="text-red-300 shrink-0" />
                  <Link href={`/library/documents/${d.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate hover:underline">{d.title}</p>
                    <p className="text-xs text-zinc-500">Added {timeAgo(d.added_at)}{d.added_by_username ? ` by @${d.added_by_username}` : ''}</p>
                  </Link>
                  <Link href={`/ai/ask?doc=${d.id}`} className="text-xs text-indigo-400">Ask AI</Link>
                  {canEdit && <button onClick={() => removeDoc(d.id)} className="text-zinc-500 hover:text-red-400" aria-label="Remove from project"><Trash2 size={15} /></button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4 max-w-2xl">
          {isOwner && (
            <form onSubmit={addMember} className="flex gap-2">
              <input className={inputClass} placeholder="Add by username" value={invite} onChange={(e) => setInvite(e.target.value)} />
              <select className={`${inputClass} w-32`} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} aria-label="Role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
              <button className={primaryBtn} disabled={!invite.trim()}><UserPlus size={15} /> Add</button>
            </form>
          )}
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-2">
                <Link href={`/profile/${m.username}`}><Avatar src={m.avatar_url} name={m.full_name} size={38} /></Link>
                <Link href={`/profile/${m.username}`} className="flex-1 min-w-0"><p className="text-sm font-semibold">{m.full_name}</p><p className="text-xs text-zinc-500">@{m.username}</p></Link>
                <span className="text-xs capitalize text-zinc-400">{m.role}</span>
                {m.role !== 'owner' && (isOwner || m.id === user?.id) && (
                  <button onClick={() => removeMember(m)} className="text-zinc-500 hover:text-red-400" aria-label={m.id === user?.id ? 'Leave project' : 'Remove member'}>
                    {m.id === user?.id ? <LogOut size={15} /> : <Trash2 size={15} />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'settings' && isOwner && (
        <div className="space-y-4 max-w-xl">
          <input className={inputClass} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} aria-label="Name" />
          <textarea className={`${inputClass} min-h-24`} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} placeholder="Description" />
          <input className={inputClass} value={settings.research_field} onChange={(e) => setSettings({ ...settings, research_field: e.target.value })} placeholder="Research field" />
          <select className={inputClass} value={settings.visibility} onChange={(e) => setSettings({ ...settings, visibility: e.target.value })} aria-label="Visibility"><option value="private">Private</option><option value="public">Public</option></select>
          <div className="flex justify-between">
            <button className={dangerBtn} onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete project</button>
            <button className={primaryBtn} onClick={saveSettings} disabled={!settings.name.trim()}>Save changes</button>
          </div>
        </div>
      )}

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="Add a paper">
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {myPapers.length === 0 ? <p className="text-sm text-zinc-500">Upload papers to your library first.</p> : myPapers.filter((p) => !docs.some((d) => d.id === p.id)).map((p) => (
            <button key={p.id} onClick={() => addDoc(p.id)} className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-indigo-500/40 text-sm">{p.title}</button>
          ))}
        </div>
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete project?">
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400">All tasks will be deleted. Papers stay in their owners&apos; libraries.</p>
          <div className="flex justify-end gap-2"><button className={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button><button className={dangerBtn} onClick={deleteProject}>Delete</button></div>
        </div>
      </Modal>
    </div>
  );
}
