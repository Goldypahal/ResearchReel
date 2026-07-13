"use client";

import React from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
}

const MOCK_TASKS: Task[] = [
  { id: "t1", title: "Literature Review: Transformer Scaling", description: "Review top 10 papers from NeurIPS 2024.", assignees: ["JN"], status: "in-progress", priority: "high" },
  { id: "t2", title: "Metasurface Calibration", description: "Calibrate 405nm laser pulse alignment.", assignees: ["AT"], status: "todo", priority: "medium" },
  { id: "t3", title: "Draft Results for CVPR", description: "Consolidate mIOU metrics for the new dataset.", assignees: ["Me"], status: "review", priority: "high" }
];

export default function KanbanBoard() {
  const tasks = MOCK_TASKS;

  const columns = [
    { key: 'todo', label: 'To Do', icon: '📝' },
    { key: 'in-progress', label: 'In Progress', icon: '⚡' },
    { key: 'review', label: 'Under Review', icon: '🔬' },
    { key: 'done', label: 'Completed', icon: '✅' }
  ];

  return (
    <div className="flex-1 p-8 overflow-x-auto selection:bg-indigo-500/30">
      <div className="flex gap-8 h-full min-w-[1200px]">
        {columns.map(col => (
          <div key={col.key} className="flex-1 flex flex-col bg-zinc-900/40 border border-white/5 rounded-[40px] p-6 shadow-2xl backdrop-blur-2xl group/col hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-8 px-2">
               <div className="flex items-center gap-3">
                  <span className="text-xl">{col.icon}</span>
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500 group-hover/col:text-white transition-colors">{col.label}</h3>
               </div>
               <span className="text-[10px] font-black text-zinc-600 bg-white/5 py-1 px-3 rounded-full">
                  {tasks.filter(t => t.status === col.key).length}
               </span>
            </div>

            <div className="flex-1 space-y-4">
               {tasks.filter(t => t.status === col.key).map(task => (
                  <div key={task.id} className="p-6 bg-[#050505] border border-white/5 rounded-3xl hover:border-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-grab group/card shadow-lg hover:shadow-indigo-500/10">
                     <div className="flex items-center justify-between mb-3">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                           {task.priority} Priority
                        </span>
                        <div className="flex -space-x-2">
                           {task.assignees.map(a => (
                              <div key={a} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold">{a}</div>
                           ))}
                        </div>
                     </div>
                     <h4 className="font-bold text-white text-sm mb-2 group-hover/card:text-indigo-400 transition-colors uppercase tracking-tight">{task.title}</h4>
                     <p className="text-[11px] text-zinc-600 line-clamp-2 italic leading-relaxed">{task.description}</p>
                     
                     <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 opacity-30 group-hover/card:opacity-100 transition-opacity">
                           <span className="text-[10px]">📎 2</span>
                           <span className="text-[10px]">💬 4</span>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest italic group-hover/card:text-indigo-500 transition-colors">Oct 24</span>
                     </div>
                  </div>
               ))}
               
               <button className="w-full py-4 rounded-3xl border-2 border-dashed border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02] text-zinc-600 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2">
                  <span className="text-xl">+</span> Add Research Task
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
