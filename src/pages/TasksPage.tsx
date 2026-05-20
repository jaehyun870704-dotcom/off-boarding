import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, User, Calendar, CheckSquare2 } from 'lucide-react';
import { useTaskStore, isDelayed, isSoonDue } from '../store/taskStore';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { ImprovementTask } from '../types';

// ─── constants ────────────────────────────────────────────────────────────────

const KANBAN_COLS: { status: ImprovementTask['status']; label: string }[] = [
  { status: 'planned', label: '계획중' },
  { status: 'in_progress', label: '진행중' },
  { status: 'review', label: '검토중' },
  { status: 'done', label: '완료' },
];

const PRIORITY_CONFIG: Record<
  ImprovementTask['priority'],
  { label: string; variant: 'coral' | 'amber' | 'gray' }
> = {
  high:   { label: '높음', variant: 'coral' },
  medium: { label: '중간', variant: 'amber' },
  low:    { label: '낮음', variant: 'gray' },
};

const STATUS_LABEL: Record<ImprovementTask['status'], string> = {
  planned: '계획중', in_progress: '진행중', review: '검토중',
  done: '완료', delayed: '지연',
};
const STATUS_COLOR: Record<ImprovementTask['status'], string> = {
  planned: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  review: 'bg-amber/15 text-amber border-amber/30',
  done: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  delayed: 'bg-coral/15 text-coral border-coral/30',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function dDayInfo(dueDate: string): { label: string; color: string } {
  if (!dueDate) return { label: '', color: '' };
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: `D+${Math.abs(diff)} 지연`, color: 'text-coral' };
  if (diff === 0) return { label: 'D-day', color: 'text-amber' };
  if (diff <= 3)  return { label: `D-${diff} 마감임박`, color: 'text-amber' };
  return { label: `D-${diff}`, color: 'text-slate-500' };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, accent,
}: { label: string; value: number; accent?: string }) {
  return (
    <Card className="text-center py-3">
      <p className={`text-2xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </Card>
  );
}

// ─── Kanban task card ─────────────────────────────────────────────────────────

function KanbanCard({
  task, onOpen,
}: { task: ImprovementTask; onOpen: (t: ImprovementTask) => void }) {
  const { updateTask } = useTaskStore();
  const delayed = isDelayed(task);
  const { label: ddLabel, color: ddColor } = task.dueDate ? dDayInfo(task.dueDate) : { label: '', color: '' };

  return (
    <div
      onClick={() => onOpen(task)}
      className={`bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 cursor-pointer hover:bg-white/[0.08] transition-colors ${
        delayed ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      {/* title + priority */}
      <div className="flex items-start gap-2">
        <p className="text-white text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
        <Badge label={PRIORITY_CONFIG[task.priority].label} variant={PRIORITY_CONFIG[task.priority].variant} size="sm" />
      </div>

      {/* linked problem */}
      {task.linkedProblemId && (
        <p className="text-slate-500 text-xs truncate">↳ {task.linkedProblemId.replace('prob_', '').replace(/_/g, '/')}</p>
      )}

      {/* assignee + dept */}
      {(task.assignee || task.department) && (
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <User size={11} />
          <span>{[task.assignee, task.department].filter(Boolean).join(' · ')}</span>
        </div>
      )}

      {/* due date */}
      {task.dueDate && (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar size={11} className="text-slate-500" />
          <span className="text-slate-500">{task.dueDate}</span>
          {ddLabel && <span className={`font-medium ${ddColor}`}>{ddLabel}</span>}
        </div>
      )}

      {/* progress */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <p className="text-slate-600 text-xs text-right">{task.progress}%</p>
      </div>

      {/* status dropdown — stop propagation so card click doesn't fire */}
      <select
        value={task.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          updateTask(task.id, { status: e.target.value as ImprovementTask['status'] });
        }}
        className="w-full bg-transparent border border-white/10 rounded-lg text-xs text-slate-400 px-2 py-1"
      >
        {KANBAN_COLS.map((c) => (
          <option key={c.status} value={c.status} className="bg-navy-700">{c.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({
  tasks,
  onOpen,
}: { tasks: ImprovementTask[]; onOpen: (t: ImprovementTask) => void }) {
  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {['과제명', '연결문제', '우선순위', '담당자', '마감일', '진행률', '상태', '액션'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.map((t) => {
              const delayed = isDelayed(t);
              const { label: dd, color: dc } = t.dueDate ? dDayInfo(t.dueDate) : { label: '', color: '' };
              return (
                <tr
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className={`cursor-pointer hover:bg-white/[0.03] transition-colors ${delayed ? 'bg-coral/[0.03]' : ''}`}
                >
                  <td className="px-4 py-3 text-slate-200 font-medium max-w-[200px] truncate">{t.title}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">
                    {t.linkedProblemId?.replace('prob_', '') ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={PRIORITY_CONFIG[t.priority].label} variant={PRIORITY_CONFIG[t.priority].variant} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{t.assignee || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400">{t.dueDate || '—'}</span>
                    {dd && <span className={`ml-1.5 font-medium ${dc}`}>{dd}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-slate-500">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpen(t)}
                      className="text-slate-500 hover:text-white text-xs transition-colors"
                    >
                      편집
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── TasksPage ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks } = useTaskStore();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedTask, setSelectedTask] = useState<ImprovementTask | null>(null);

  const stats = useMemo(() => ({
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    delayed: tasks.filter(isDelayed).length,
    soonDue: tasks.filter(isSoonDue).length,
  }), [tasks]);

  // ── empty state ──
  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckSquare2 size={52} className="text-slate-700" strokeWidth={1} />
        <p className="text-slate-400 text-lg font-medium">아직 개선 과제가 없습니다</p>
        <p className="text-slate-500 text-sm">
          <Link to="/strategy" className="text-teal-400 hover:underline">전략 분석 페이지</Link>
          에서 과제를 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stat cards + view toggle ── */}
      <div className="flex items-start gap-4">
        <div className="grid grid-cols-4 gap-3 flex-1">
          <StatCard label="전체" value={stats.total} />
          <StatCard label="진행중" value={stats.inProgress} accent="text-blue-400" />
          <StatCard label="완료" value={stats.done} accent="text-teal-400" />
          <StatCard label="지연" value={stats.delayed} accent={stats.delayed > 0 ? 'text-coral' : 'text-slate-400'} />
        </div>

        <div className="flex rounded-xl border border-white/10 overflow-hidden shrink-0 self-center">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              view === 'kanban'
                ? 'bg-teal-500/15 text-teal-400'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            칸반
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-white/10 ${
              view === 'table'
                ? 'bg-teal-500/15 text-teal-400'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <List size={14} />
            테이블
          </button>
        </div>
      </div>

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLS.map(({ status, label }) => {
              const col = tasks.filter((t) => t.status === status);
              return (
                <div key={status} className="w-72 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-slate-300 font-medium text-sm">{label}</h3>
                    <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                      {col.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {col.map((task) => (
                      <KanbanCard key={task.id} task={task} onOpen={setSelectedTask} />
                    ))}
                    {col.length === 0 && (
                      <div className="border border-dashed border-white/10 rounded-xl py-8 text-center">
                        <p className="text-slate-600 text-xs">과제 없음</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <TableView tasks={tasks} onOpen={setSelectedTask} />
      )}

      {/* ── Task detail modal ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
