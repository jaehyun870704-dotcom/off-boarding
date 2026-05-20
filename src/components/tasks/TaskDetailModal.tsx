import { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, Trash2, Plus, Save } from 'lucide-react';
import type { ImprovementTask } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { Badge } from '../ui/Badge';

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

function getProblemLabel(id: string): string {
  const map: Record<string, string> = {
    prob_eval: '평가/보상 불신 문제',
    prob_leadership: '리더십 실효성 문제',
    prob_growth: '성장 기회 부재',
    prob_goal: '목표/자율성 시스템 문제',
    prob_collab: '협업 구조 / 관료주의 문제',
    prob_dept: '특정 부서 집중 이탈',
    prob_enps: 'eNPS 위기',
  };
  // Try sessionStorage first
  try {
    const cached = sessionStorage.getItem('wos-strategy');
    if (cached) {
      const { problems } = JSON.parse(cached) as { problems: { id: string; title: string }[] };
      const found = problems?.find((p) => p.id === id);
      if (found) return found.title;
    }
  } catch {}
  return map[id] ?? id;
}

const STATUS_OPTIONS: { value: ImprovementTask['status']; label: string }[] = [
  { value: 'planned', label: '계획중' },
  { value: 'in_progress', label: '진행중' },
  { value: 'review', label: '검토중' },
  { value: 'done', label: '완료' },
  { value: 'delayed', label: '지연' },
];

const PRIORITY_OPTIONS: { value: ImprovementTask['priority']; label: string }[] = [
  { value: 'high', label: '🔴 높음' },
  { value: 'medium', label: '🟡 중간' },
  { value: 'low', label: '🟢 낮음' },
];

const DIFFICULTY_OPTIONS: { value: ImprovementTask['difficulty']; label: string }[] = [
  { value: 'high', label: '높음' },
  { value: 'medium', label: '중간' },
  { value: 'low', label: '낮음' },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
            value === opt.value
              ? 'bg-teal-500/15 border-teal-500/40 text-teal-400'
              : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  task: ImprovementTask;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: Props) {
  const { updateTask, deleteTask, addComment, addResource, removeResource } = useTaskStore();

  // local form state
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description);
  const [assignee, setAssignee] = useState(task.assignee);
  const [department, setDepartment] = useState(task.department);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [priority, setPriority] = useState(task.priority);
  const [difficulty, setDifficulty] = useState(task.difficulty);
  const [expectedEffect, setExpectedEffect] = useState(task.expectedEffect);
  const [status, setStatus] = useState(task.status);
  const [progress, setProgress] = useState(task.progress);

  // comment input
  const [commentText, setCommentText] = useState('');

  // resource input
  const [resLabel, setResLabel] = useState('');
  const [resUrl, setResUrl] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = () => {
    updateTask(task.id, {
      title, description, assignee, department, dueDate,
      priority, difficulty, expectedEffect, status, progress,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`"${task.title}" 과제를 삭제하시겠습니까?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(task.id, '나', commentText.trim());
    setCommentText('');
  };

  const handleAddResource = () => {
    if (!resLabel.trim() || !resUrl.trim()) return;
    addResource(task.id, resLabel.trim(), resUrl.trim());
    setResLabel('');
    setResUrl('');
  };

  // read fresh task from store for live comment/resource updates
  const { tasks } = useTaskStore();
  const freshTask = tasks.find((t) => t.id === task.id) ?? task;
  const commentsDesc = [...freshTask.comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-slate-400 text-xs font-medium mb-1.5">{children}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative z-10 w-full max-w-[90vw] max-h-[90vh] flex flex-col bg-navy-700 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Badge
              label={priority === 'high' ? '높음' : priority === 'medium' ? '중간' : '낮음'}
              variant={priority === 'high' ? 'coral' : priority === 'medium' ? 'amber' : 'gray'}
              size="sm"
            />
            {task.linkedProblemId && (
              <span className="text-slate-500 text-xs">↳ {getProblemLabel(task.linkedProblemId)}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left panel ── */}
          <div className="flex-[13] min-w-0 overflow-y-auto p-6 space-y-5 scrollbar-thin">

            {/* Title */}
            <div>
              <SectionLabel>과제명</SectionLabel>
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
                  className="w-full bg-white/5 border border-teal-500/50 rounded-xl px-4 py-2.5 text-white text-lg font-semibold focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 text-white text-lg font-semibold transition-colors"
                >
                  {title}
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <SectionLabel>설명</SectionLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500/50 transition-colors placeholder:text-slate-600"
                placeholder="과제에 대한 설명을 입력하세요"
              />
            </div>

            {/* Progress + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>진행률 — {progress}%</SectionLabel>
                <input
                  type="range" min="0" max="100" value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full h-2 accent-teal-500 cursor-pointer"
                />
                <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div>
                <SectionLabel>상태</SectionLabel>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ImprovementTask['status'])}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-teal-500/50"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-navy-700">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comments */}
            <div>
              <SectionLabel>코멘트</SectionLabel>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  placeholder="코멘트를 입력하세요"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500/50 placeholder:text-slate-600"
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleAddComment(); }}
                />
                <button
                  onClick={handleAddComment}
                  className="px-3 py-1 bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs rounded-xl hover:bg-teal-500/25 transition-colors self-end"
                >
                  등록
                </button>
              </div>
              {commentsDesc.length > 0 && (
                <ul className="space-y-2">
                  {commentsDesc.map((c) => (
                    <li key={c.id} className="bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-teal-400 text-xs font-medium">{c.author}</span>
                        <span className="text-slate-600 text-xs">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{c.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="w-72 shrink-0 overflow-y-auto border-l border-white/10 p-5 space-y-4 scrollbar-thin bg-white/[0.02]">

            <div>
              <SectionLabel>담당자</SectionLabel>
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-teal-500/50"
                placeholder="이름 입력"
              />
            </div>

            <div>
              <SectionLabel>부서</SectionLabel>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-teal-500/50"
                placeholder="부서명 입력"
              />
            </div>

            <div>
              <SectionLabel>마감일</SectionLabel>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-teal-500/50 [color-scheme:dark]"
              />
            </div>

            <div>
              <SectionLabel>우선순위</SectionLabel>
              <RadioGroup
                name={`priority_${task.id}`}
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={setPriority}
              />
            </div>

            <div>
              <SectionLabel>난이도</SectionLabel>
              <RadioGroup
                name={`diff_${task.id}`}
                options={DIFFICULTY_OPTIONS}
                value={difficulty}
                onChange={setDifficulty}
              />
            </div>

            <div>
              <SectionLabel>예상 효과</SectionLabel>
              <textarea
                value={expectedEffect}
                onChange={(e) => setExpectedEffect(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500/50 placeholder:text-slate-600"
                placeholder="예상 효과를 입력하세요"
              />
            </div>

            {/* Resources */}
            <div>
              <SectionLabel>참고 리소스</SectionLabel>
              <div className="space-y-1.5 mb-2">
                <input
                  value={resLabel}
                  onChange={(e) => setResLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-teal-500/50"
                  placeholder="레이블 (예: 기획안)"
                />
                <input
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-teal-500/50"
                  placeholder="https://..."
                />
                <button
                  onClick={handleAddResource}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                >
                  <Plus size={12} />
                  추가
                </button>
              </div>
              {freshTask.resources.length > 0 && (
                <ul className="space-y-1">
                  {freshTask.resources.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs truncate"
                      >
                        <ExternalLink size={11} />
                        {r.label}
                      </a>
                      <button
                        onClick={() => removeResource(task.id, r.id)}
                        className="text-slate-600 hover:text-coral transition-colors shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0 bg-navy-800/50">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coral/15 border border-coral/30 text-coral text-sm hover:bg-coral/25 transition-colors"
          >
            <Trash2 size={14} />
            삭제
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:bg-white/10 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 text-navy-900 text-sm font-semibold hover:bg-teal-400 transition-colors"
            >
              <Save size={14} />
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
