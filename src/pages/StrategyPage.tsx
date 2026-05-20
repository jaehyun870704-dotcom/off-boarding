import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, RotateCcw, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, PlusCircle, CheckSquare, Loader2,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore';
import { useSurveyData } from '../hooks/useSurveyData';
import { useTaskStore } from '../store/taskStore';
import {
  deriveProblems, generateStrategies, buildExecutiveSummary,
  type CoreProblem, type ImprovementStrategy,
} from '../utils/strategyEngine';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
// ─── cache key ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'wos-strategy';

interface CachedResult {
  problems: CoreProblem[];
  strategies: ImprovementStrategy[];
  summary: string;
  rowCount: number;
}

function saveCache(data: CachedResult) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function loadCache(): CachedResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedResult) : null;
  } catch { return null; }
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<
  CoreProblem['urgency'],
  { label: string; variant: 'coral' | 'amber' | 'teal'; dot: string }
> = {
  high:   { label: 'High', variant: 'coral',  dot: 'bg-coral' },
  medium: { label: 'Medium', variant: 'amber', dot: 'bg-amber' },
  low:    { label: 'Low', variant: 'teal',   dot: 'bg-teal-500' },
};

const PRIORITY_VARIANT: Record<
  ImprovementStrategy['priority'],
  'coral' | 'amber' | 'gray'
> = { high: 'coral', medium: 'amber', low: 'gray' };

const DIFFICULTY_LABEL: Record<string, string> = {
  high: '높음', medium: '중간', low: '낮음',
};

// ─── sub-components ───────────────────────────────────────────────────────────

function ProblemCard({
  problem,
  rank,
  visible,
}: {
  problem: CoreProblem;
  rank: number;
  visible: boolean;
}) {
  const urg = URGENCY_CONFIG[problem.urgency];

  return (
    <div
      className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${rank * 100}ms`,
      }}
    >
      {/* rank watermark */}
      <span className="absolute right-4 top-2 text-7xl font-black text-white/[0.04] select-none leading-none">
        {rank}
      </span>

      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <h3 className="text-white font-semibold text-base leading-tight">{problem.title}</h3>
        <span
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${
            problem.urgency === 'high'
              ? 'bg-coral/15 text-coral border-coral/30'
              : problem.urgency === 'medium'
              ? 'bg-amber/15 text-amber border-amber/30'
              : 'bg-teal-500/15 text-teal-400 border-teal-500/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
          {urg.label}
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-3 leading-relaxed">{problem.description}</p>

      <p className="text-teal-400 text-xs mb-4 flex items-start gap-1.5">
        <span className="shrink-0 mt-0.5">📌</span>
        <span>근거: {problem.evidence}</span>
      </p>

      {/* impact gauge */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>영향도</span>
          <span className="text-slate-300 font-medium">{problem.impactScore} / 10</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: visible ? `${problem.impactScore * 10}%` : '0%',
              background:
                problem.impactScore >= 7
                  ? '#FF6B6B'
                  : problem.impactScore >= 5
                  ? '#F59E0B'
                  : '#00C9B1',
              transitionDelay: `${rank * 100 + 300}ms`,
            }}
          />
        </div>
      </div>

      {problem.affectedDepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {problem.affectedDepts.map((d) => (
            <Badge key={d} label={d} variant="blue" size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  strategy,
  linkedProblem,
  rank,
  visible,
}: {
  strategy: ImprovementStrategy;
  linkedProblem: CoreProblem | undefined;
  rank: number;
  visible: boolean;
}) {
  const { addTask, tasks } = useTaskStore();
  const [expanded, setExpanded] = useState(false);

  const alreadyAdded = tasks.some(
    (t) => t.linkedProblemId === strategy.linkedProblemId && t.title === strategy.title
  );

  const handleAddTask = () => {
    addTask({
      title: strategy.title,
      description: strategy.description,
      linkedProblemId: strategy.linkedProblemId,
      priority: strategy.priority,
      difficulty: 'medium',
      expectedEffect: strategy.estimatedImpact,
      assignee: '',
      department: linkedProblem?.affectedDepts[0] ?? '',
      dueDate: '',
      status: 'planned',
      progress: 0,
    });
    toast.success('✓ 개선 과제 페이지에서 확인하세요');
  };

  return (
    <div
      className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${rank * 100 + 200}ms`,
      }}
    >
      <div className="p-5">
        {linkedProblem && (
          <p className="text-slate-500 text-xs mb-2">↳ {linkedProblem.title}</p>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-white font-semibold">{strategy.title}</h3>
          <Badge
            label={strategy.priority === 'high' ? '우선순위 높음' : strategy.priority === 'medium' ? '중간' : '낮음'}
            variant={PRIORITY_VARIANT[strategy.priority]}
            size="sm"
          />
        </div>

        <p className="text-slate-400 text-sm mb-4 leading-relaxed">{strategy.description}</p>

        {/* task list (collapsible) */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-slate-400 text-xs hover:text-white transition-colors mb-2"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          세부 과제 {strategy.tasks.length}개
          {expanded ? ' 접기' : ' 펼치기'}
        </button>

        {expanded && (
          <ul className="space-y-3 mb-4">
            {strategy.tasks.map((task, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <span className="w-4 h-4 rounded border border-white/20 shrink-0 mt-0.5 flex items-center justify-center text-slate-600 text-xs">
                  □
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">{task.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-slate-500 text-xs">소요: {task.duration}</span>
                    <span className="text-slate-500 text-xs">
                      난이도: {DIFFICULTY_LABEL[task.difficulty]}
                    </span>
                  </div>
                  {task.expectedEffect && (
                    <p className="text-teal-400/80 text-xs mt-1">{task.expectedEffect}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <p className="text-slate-500 text-xs">
            예상 효과:{' '}
            <span className="text-slate-300">{strategy.estimatedImpact}</span>
          </p>

          {alreadyAdded ? (
            <span className="flex items-center gap-1.5 text-teal-400 text-xs">
              <CheckCircle2 size={13} />
              과제 추가됨
            </span>
          ) : (
            <button
              onClick={handleAddTask}
              className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 text-xs transition-colors"
            >
              <PlusCircle size={14} />
              과제로 추가 +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────

function AnalysisLoader({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20">
      <div className="relative">
        <Loader2 size={40} className="animate-spin text-teal-400" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-medium mb-1">핵심 문제를 분석하고 있습니다...</p>
        <p className="text-slate-500 text-sm">서베이 데이터를 기반으로 룰을 적용 중</p>
      </div>
      <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-teal-400 text-sm font-medium">{progress}%</p>
    </div>
  );
}

// ─── StrategyPage ─────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const rows = useSurveyStore((s) => s.rows);
  const { basicStats, topReasons, scoreAverages, correlations, byDept } = useSurveyData();

  const [result, setResult] = useState<CachedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // restore from session cache on mount
  useEffect(() => {
    const cached = loadCache();
    if (cached && cached.rowCount === rows.length) {
      setResult(cached);
      setVisible(true);
    }
  }, [rows.length]);

  const runAnalysis = useCallback(async () => {
    if (!rows.length || loading) return;
    setLoading(true);
    setVisible(false);
    setProgress(0);

    // simulate progressive analysis
    const steps = [20, 45, 70, 90, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 160));
      setProgress(p);
    }

    const problems = deriveProblems(
      basicStats, topReasons, scoreAverages, correlations, byDept, rows.length
    );
    const strategies = generateStrategies(problems);
    const summary = buildExecutiveSummary(basicStats, topReasons, problems);

    const data: CachedResult = { problems, strategies, summary, rowCount: rows.length };
    saveCache(data);
    setResult(data);
    setLoading(false);

    // staggered fade-in
    requestAnimationFrame(() => setVisible(true));
  }, [rows.length, basicStats, topReasons, scoreAverages, correlations, byDept, loading]);

  const hasResult = result !== null && result.problems.length > 0;
  const isEmpty = rows.length === 0;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── 액션 바 ── */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">전략 분석 엔진</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {isEmpty
                ? '설정에서 데이터를 먼저 불러오세요'
                : `${rows.length}개 응답 · 외부 AI 없이 룰 기반 분석`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasResult && (
              <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={loading}>
                <RotateCcw size={13} />
                재분석
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={runAnalysis}
              disabled={isEmpty || loading}
              loading={loading}
            >
              {!loading && <Play size={14} />}
              {loading ? '분석 중...' : hasResult ? '다시 분석' : '분석 실행'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 로딩 ── */}
      {loading && <AnalysisLoader progress={progress} />}

      {/* ── 결과 없음 ── */}
      {!loading && !hasResult && (
        <Card className="text-center py-16 border-dashed">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-600" strokeWidth={1.2} />
          <p className="text-slate-400 font-medium mb-1">
            {isEmpty ? '데이터가 없습니다' : '아직 분석 결과가 없습니다'}
          </p>
          <p className="text-slate-500 text-sm">
            {isEmpty ? (
              <>
                <Link to="/settings" className="text-teal-400 hover:underline">설정 페이지</Link>
                에서 데이터를 동기화하세요
              </>
            ) : (
              '상단의 "분석 실행" 버튼을 눌러 핵심 문제를 도출하세요'
            )}
          </p>
        </Card>
      )}

      {/* ── 분석 결과 ── */}
      {!loading && hasResult && (
        <div className="space-y-6">

          {/* Executive Summary */}
          <div
            className="border-l-4 border-teal-500 bg-teal-500/10 rounded-r-xl p-5 transition-all duration-500"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
          >
            <p className="text-teal-400 text-3xl font-serif leading-none mb-2 opacity-50">"</p>
            <p className="text-slate-200 text-sm italic leading-relaxed">{result!.summary}</p>
            <div className="flex items-center gap-2 mt-3">
              <CheckSquare size={13} className="text-teal-400" />
              <span className="text-teal-400 text-xs">
                {result!.problems.length}개 핵심 문제 · {result!.strategies.length}개 개선 전략 도출
              </span>
            </div>
          </div>

          {/* 핵심 문제 */}
          <section>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              핵심 문제 도출
              <span className="text-xs font-normal text-slate-500">impactScore 높은 순</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result!.problems.map((p, i) => (
                <ProblemCard key={p.id} problem={p} rank={i + 1} visible={visible} />
              ))}
            </div>
          </section>

          {/* 개선 전략 */}
          <section>
            <h2 className="text-white font-semibold mb-3">개선 전략 제안</h2>
            <div className="space-y-4">
              {result!.strategies.map((s, i) => (
                <StrategyCard
                  key={s.id}
                  strategy={s}
                  linkedProblem={result!.problems.find((p) => p.id === s.linkedProblemId)}
                  rank={i}
                  visible={visible}
                />
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
