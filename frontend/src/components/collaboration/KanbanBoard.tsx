"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { projectsApi, errorMessage, type Task, type TaskStatus, type ProjectMember } from '@/lib/api';
import { Avatar, Modal, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { formatDate } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' }, { id: 'in_progress', label: 'In progress' }, { id: 'review', label: 'In review' }, { id: 'done', label: 'Done' },
];
const PRIORITY: Record<string, string> = { low: 'text-zinc-400 bg-zinc-500/10', medium: 'text-sky-300 bg-sky-500/10', high: 'text-amber-300 bg-amber-500/10', urgent: 'text-red-300 bg-red-500/10' };

function TaskModal({ task, members, readOnly, onClose, onSaved, onDeleted }: {
  task: Task; members: ProjectMember[]; readOnly: boolean; onClose: () => void; onSaved: (t: Task) => void; onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    title: task.title, description: task.description || '', priority: task.priority, status: task.status,
    assigned_to: task.assignee_username || '', due_date: task.due_date ? task.due_date.slice(0, 10) : '',
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const t = await projectsApi.updateTask(task.id, {
        title: form.title, description: form.description, priority: form.priority, status: form.status,
        assigned_to: form.assigned_to || null, due_date: form.due_date ? new Date(`${form.due_date}T12:00:00`).toISOString() : null,
      });
      onSaved(t); onClose();
    } catch (err) { toast({ title: 'Could not save task', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    try { await projectsApi.deleteTask(task.id); onDeleted(task.id); onClose(); }
    catch (err) { toast({ title: 'Could not delete task', description: errorMessage(err), variant: 'destructive' }); }
  };
  return (
    <Modal open onClose={onClose} title={readOnly ? 'Task' : 'Edit task'}>
      <div className="p-5 space-y-3">
        <input className={inputClass} value={form.title} disabled={readOnly} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={255} aria-label="Title" />
        <textarea className={`${inputClass} min-h-24`} value={form.description} disabled={readOnly} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputClass} value={form.status} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} aria-label="Status">
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className={inputClass} value={form.priority} disabled={readOnly} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })} aria-label="Priority">
            {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)} priority</option>)}
          </select>
          <select className={inputClass} value={form.assigned_to} disabled={readOnly || !members.length} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} aria-label="Assignee">
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.username}>{m.full_name} (@{m.username})</option>)}
          </select>
          <input type="date" className={inputClass} value={form.due_date} disabled={readOnly} onChange={(e) => setForm({ ...form, due_date: e.target.value })} aria-label="Due date" />
        </div>
        {!readOnly && (
          <div className="flex justify-between pt-2">
            <button onClick={remove} className="text-sm text-red-400 inline-flex items-center gap-1.5"><Trash2 size={14} /> Delete</button>
            <div className="flex gap-2"><button className={secondaryBtn} onClick={onClose}>Cancel</button><button className={primaryBtn} disabled={busy || !form.title.trim()} onClick={save}>Save</button></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Drag-and-drop task board. When projectId is given, tasks can be added to that project.
 */
export default function KanbanBoard({ tasks, setTasks, projectId, members = [], readOnly = false, showProject = false }: {
  tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; projectId?: string; members?: ProjectMember[]; readOnly?: boolean; showProject?: boolean;
}) {
  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState<Task | null>(null);

  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);

  const onDragEnd = async (r: DropResult) => {
    if (!r.destination || readOnly) return;
    const status = r.destination.droppableId as TaskStatus;
    const col = byStatus(status).filter((t) => t.id !== r.draggableId);
    const before = col[r.destination.index - 1]?.position ?? 0;
    const after = col[r.destination.index]?.position ?? before + 2;
    const position = (before + after) / 2;
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === r.draggableId ? { ...t, status, position } : t)));
    try { await projectsApi.updateTask(r.draggableId, { status, position }); }
    catch (err) { setTasks(prev); toast({ title: 'Could not move task', description: errorMessage(err), variant: 'destructive' }); }
  };

  const add = async (status: TaskStatus) => {
    if (!title.trim() || !projectId) return;
    try {
      const t = await projectsApi.createTask(projectId, { title: title.trim(), status });
      setTasks((ts) => [...ts, t]); setTitle(''); setAdding(null);
    } catch (err) { toast({ title: 'Could not add task', description: errorMessage(err), variant: 'destructive' }); }
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.id} key={col.id} isDropDisabled={readOnly}>
              {(provided, snap) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={`rounded-2xl border border-[var(--border)] p-3 min-h-64 flex flex-col gap-2 ${snap.isDraggingOver ? 'bg-indigo-500/5' : 'bg-[var(--foreground)]/[0.02]'}`}>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <h3 className="text-sm font-semibold">{col.label} <span className="text-zinc-500 font-normal">{byStatus(col.id).length}</span></h3>
                    {projectId && !readOnly && <button onClick={() => { setAdding(col.id); setTitle(''); }} aria-label={`Add task to ${col.label}`} className="text-zinc-500 hover:text-white"><Plus size={16} /></button>}
                  </div>
                  {byStatus(col.id).map((t, i) => (
                    <Draggable draggableId={t.id} index={i} key={t.id} isDragDisabled={readOnly}>
                      {(p) => (
                        <button ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => setOpen(t)}
                          className="text-left rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2 hover:border-indigo-500/40">
                          {showProject && t.project_name && <Link href={`/projects/${t.project_id}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-indigo-400 hover:underline">{t.project_name}</Link>}
                          <p className="text-sm font-medium">{t.title}</p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded capitalize ${PRIORITY[t.priority]}`}>{t.priority}</span>
                            {t.due_date && <span className={`inline-flex items-center gap-1 ${new Date(t.due_date) < new Date() && t.status !== 'done' ? 'text-red-400' : 'text-zinc-500'}`}><Calendar size={11} /> {formatDate(t.due_date, { month: 'short', day: 'numeric' })}</span>}
                            {t.assignee_username && <span className="ml-auto" title={t.assignee_name || ''}><Avatar src={t.assignee_avatar_url} name={t.assignee_name} size={22} /></span>}
                          </div>
                        </button>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {adding === col.id && (
                    <form onSubmit={(e) => { e.preventDefault(); add(col.id); }} className="space-y-2">
                      <input autoFocus className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" maxLength={255} onBlur={() => !title && setAdding(null)} />
                      <div className="flex gap-2"><button className={`${primaryBtn} py-1.5`} disabled={!title.trim()}>Add</button><button type="button" className="text-xs text-zinc-500" onClick={() => setAdding(null)}>Cancel</button></div>
                    </form>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {open && (
        <TaskModal task={open} members={members} readOnly={readOnly} onClose={() => setOpen(null)}
          onSaved={(t) => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...t } : x)))}
          onDeleted={(id) => setTasks((ts) => ts.filter((x) => x.id !== id))} />
      )}
    </>
  );
}
