'use client';

import { useState } from 'react';

type Task = {
  id: string;
  title: string;
  column: 'todo' | 'done';
};

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Setup Vite Project', column: 'todo' },
    { id: '2', title: 'Design Sidebar Layout', column: 'todo' },
    { id: '3', title: 'Learn useState Hook', column: 'done' },
  ]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColumn: 'todo' | 'done') => {
    const taskId = e.dataTransfer.getData('text/plain');
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, column: targetColumn };
      }
      return task;
    });
    setTasks(updatedTasks);
  };

  const renderColumn = (columnId: 'todo' | 'done', title: string, bgColor: string) => {
    const columnTasks = tasks.filter(t => t.column === columnId);
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
        className={`w-full md:w-80 rounded-2xl p-4 min-h-[400px] flex flex-col gap-3 ${bgColor}`}
      >
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full font-semibold text-gray-500">{columnTasks.length}</span>
        </div>

        {columnTasks.map(task => (
          <div
            key={task.id}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, task.id)}
            className="p-4 bg-white border border-gray-200/60 shadow-sm rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-all"
          >
            <p className="text-sm font-medium text-gray-800">{task.title}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Project Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Grab a card and drag it between columns to test functionality.</p>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {renderColumn('todo', 'To Do', 'bg-gray-100/80')}
        {renderColumn('done', 'Completed', 'bg-emerald-50/60')}
      </div>
    </div>
  );
}
