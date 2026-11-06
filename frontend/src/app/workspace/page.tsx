"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { projectsApi, errorMessage, type Task } from '@/lib/api';
import { Spinner, ErrorState, EmptyState } from '@/components/common';
import KanbanBoard from '@/components/collaboration/KanbanBoard';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [all, setAll] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setTasks(null); projectsApi.myTasks(all).then(setTasks).catch((e) => setError(errorMessage(e))); }, [all]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ListChecks className="text-indigo-400" /> My tasks</h1>
          <p className="text-sm text-zinc-500">Tasks across all your projects. Drag cards to update their status.</p>
        </div>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" className="accent-indigo-500" checked={all} onChange={(e) => setAll(e.target.checked)} /> Include tasks assigned to others</label>
      </div>
      {error ? <ErrorState message={error} /> : !tasks ? <Spinner /> : tasks.length === 0 ? (
        <EmptyState icon={<ListChecks size={32} />} title="No tasks" description="Tasks assigned to you (or unassigned) in your projects show up here." action={<Link href="/projects" className="text-sm text-indigo-400 font-semibold">Go to projects</Link>} />
      ) : (
        <KanbanBoard tasks={tasks} setTasks={setTasks as React.Dispatch<React.SetStateAction<Task[]>>} showProject />
      )}
    </div>
  );
}
