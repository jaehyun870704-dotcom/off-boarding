import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Bell } from 'lucide-react';
import { useSurveyStore } from '../../store/surveyStore';
import { useTaskStore, isDelayed, isSoonDue } from '../../store/taskStore';
import type { SyncStatus } from '../../types';

const PAGE_TITLES: Record<string, string> = {
  '/': '대시보드',
  '/strategy': '전략 분석',
  '/tasks': '개선 과제',
  '/report': '보고서',
  '/settings': '설정',
};

function SyncBadge({ status }: { status: SyncStatus }) {
  const configs = {
    success: { dot: 'bg-green-400', text: 'text-green-400', label: '동기화 완료' },
    error: { dot: 'bg-coral', text: 'text-coral', label: '오류' },
    idle: { dot: 'bg-slate-500', text: 'text-slate-400', label: '대기 중' },
    loading: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', label: '동기화 중' },
  };
  const c = configs[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 전`;
}

export function Header() {
  const { pathname } = useLocation();
  const { syncStatus, lastSynced, syncData } = useSurveyStore();
  const { tasks } = useTaskStore();
  const title = PAGE_TITLES[pathname] ?? '—';

  const notifCount = useMemo(
    () => tasks.filter(isDelayed).length + tasks.filter(isSoonDue).length,
    [tasks]
  );

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-navy-800/80 backdrop-blur-sm">
      <h1 className="text-white font-semibold text-lg">{title}</h1>

      <div className="flex items-center gap-4">
        <SyncBadge status={syncStatus} />
        <span className="hidden sm:block text-slate-500 text-xs">마지막 동기화: {timeAgo(lastSynced)}</span>
        <button
          onClick={syncData}
          disabled={syncStatus === 'loading'}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw size={16} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
        </button>
        <div className="relative">
          <Bell size={18} className="text-slate-400" />
          {notifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
