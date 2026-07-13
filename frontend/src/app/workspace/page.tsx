"use client";

import React, { useState } from 'react';
import { Plus, MoreHorizontal, Calendar, Filter } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Task {
  id: string;
  content: string;
  author: string;
  priority: string;
  date: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface WorkspaceData {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}


const initialData = {
  tasks: {
    'task-1': { id: 'task-1', content: 'Literature Review: Quantum Entanglement', author: 'JN', priority: 'High', date: 'Oct 20' },
    'task-2': { id: 'task-2', content: 'Draft Methodology Section', author: 'SC', priority: 'Medium', date: 'Oct 22' },
    'task-3': { id: 'task-3', content: 'Run Baseline Experiments', author: 'AT', priority: 'High', date: 'Oct 25' },
    'task-4': { id: 'task-4', content: 'Finalize Results Visualization', author: 'SC', priority: 'Low', date: 'Nov 2' },
  },
  columns: {
    'column-1': {
      id: 'column-1',
      title: 'In Discovery',
      taskIds: ['task-1', 'task-2'],
    },
    'column-2': {
      id: 'column-2',
      title: 'In Progress',
      taskIds: ['task-3'],
    },
    'column-3': {
      id: 'column-3',
      title: 'Under Review',
      taskIds: ['task-4'],
    },
  },
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData>(initialData);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = data.columns[source.droppableId as keyof typeof data.columns];
    const finish = data.columns[destination.droppableId as keyof typeof data.columns];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, taskIds: newTaskIds };
      setData({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setData({
      ...data,
      columns: { ...data.columns, [newStart.id]: newStart, [newFinish.id]: newFinish },
    });
  };

  return (
    <div className="h-[calc(100vh-128px)] md:h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-indigo-500/30 overflow-hidden">
      
      <main className="flex-1 p-6 md:p-8 overflow-hidden">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-2 italic">Scholar Workspace</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Integrated Publication Pipeline</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="px-5 py-2.5 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] rounded-xl border border-[var(--border)]/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Filter size={14} /> Filter
             </button>
             <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95">
                <Plus size={14} /> New Research Task
             </button>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-8 overflow-x-auto pb-12 custom-scrollbar h-[calc(100vh-280px)] items-start">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId as keyof typeof data.columns];
              const tasks = column.taskIds.map((taskId: string) => data.tasks[taskId as keyof typeof data.tasks]);

              return (
                <div key={column.id} className="w-[380px] shrink-0 flex flex-col h-full bg-[var(--foreground)]/[0.03] rounded-[40px] border border-[var(--border)]/10 p-6 backdrop-blur-3xl shadow-xl transition-all">
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div className="flex items-center gap-3">
                         <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse"></div>
                         <h2 className="text-xs font-black uppercase tracking-widest">{column.title}</h2>
                         <span className="px-2 py-0.5 bg-[var(--foreground)]/5 rounded-full text-[9px] font-black text-zinc-500">{tasks.length}</span>
                      </div>
                      <MoreHorizontal size={18} className="text-zinc-600 cursor-pointer hover:text-[var(--foreground)] transition-colors" />
                   </div>

                   <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        className="flex-1 space-y-4 overflow-y-auto custom-scrollbar px-2"
                      >
                        {tasks.map((task: Task, index: number) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-[var(--background)] border border-[var(--border)]/10 p-6 rounded-[32px] hover:border-indigo-500/40 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
                              >
                                <div className="flex items-center justify-between mb-5">
                                   <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      task.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                                      task.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                                   }`}>
                                      {task.priority} Priority
                                   </span>
                                   <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-500">
                                      {task.author}
                                   </div>
                                </div>
                                <h3 className="text-sm font-bold leading-relaxed mb-6 group-hover:text-indigo-500 transition-colors">{task.content}</h3>
                                <div className="flex items-center justify-between pt-5 border-t border-[var(--border)]/10">
                                   <div className="flex items-center gap-2 text-zinc-500">
                                      <Calendar size={12} className="text-zinc-400" />
                                      <span className="text-[9px] font-black uppercase">{task.date}</span>
                                   </div>
                                   <div className="flex -space-x-2">
                                      {[1,2].map(i => (
                                         <div key={i} className="w-7 h-7 rounded-full border-2 border-[var(--background)] bg-[var(--foreground)]/5 flex items-center justify-center text-[9px] font-black text-zinc-400 shadow-inner">
                                            +
                                         </div>
                                      ))}
                                   </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                   </Droppable>
                </div>
              );
            })}
            
            {/* Add Column Placeholder */}
            <button className="w-[380px] shrink-0 h-full border-2 border-dashed border-[var(--border)]/20 rounded-[40px] flex flex-col items-center justify-center gap-6 text-zinc-500 hover:text-indigo-500 hover:border-indigo-500/40 transition-all group p-12 bg-[var(--foreground)]/[0.01]">
               <div className="w-14 h-14 rounded-full bg-[var(--foreground)]/5 flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all shadow-sm">
                  <Plus size={24} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">New Pipeline Phase</span>
            </button>
          </div>
        </DragDropContext>
      </main>
    </div>
  );
}
