import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ImprovementTask } from '../types';

// ─── helper ───────────────────────────────────────────────────────────────────

export const isDelayed = (task: ImprovementTask): boolean =>
  !!(
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done'
  );

export const isSoonDue = (task: ImprovementTask): boolean => {
  if (!task.dueDate || task.status === 'done' || isDelayed(task)) return false;
  const msLeft = new Date(task.dueDate).getTime() - Date.now();
  return msLeft > 0 && msLeft < 3 * 24 * 60 * 60 * 1000;
};

// ─── store ────────────────────────────────────────────────────────────────────

type AddTaskInput = Omit<
  ImprovementTask,
  'id' | 'comments' | 'resources' | 'createdAt' | 'updatedAt'
>;

interface TaskStore {
  tasks: ImprovementTask[];
  addTask: (t: AddTaskInput) => void;
  updateTask: (id: string, patch: Partial<ImprovementTask>) => void;
  deleteTask: (id: string) => void;
  addComment: (taskId: string, author: string, text: string) => void;
  addResource: (taskId: string, label: string, url: string) => void;
  removeResource: (taskId: string, resourceId: string) => void;
}

const genId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (t) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              ...t,
              id: genId('task'),
              comments: [],
              resources: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, ...patch, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addComment: (taskId, author, text) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [
                    ...t.comments,
                    {
                      id: genId('c'),
                      author,
                      text,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        })),

      addResource: (taskId, label, url) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  resources: [
                    ...t.resources,
                    { id: genId('r'), label, url },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        })),

      removeResource: (taskId, resourceId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  resources: t.resources.filter((r) => r.id !== resourceId),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        })),
    }),
    { name: 'wos-tasks' }
  )
);
