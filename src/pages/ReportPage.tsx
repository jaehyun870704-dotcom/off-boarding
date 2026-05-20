import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { FileDown, Loader2 } from 'lucide-react';
import { useSurveyData } from '../hooks/useSurveyData';
import { useTaskStore, isDelayed } from '../store/taskStore';
import { exportToPDF } from '../utils/exportUtils';
import { buildExecutiveSummary } from '../utils/strategyEngine';
import type { CoreProblem, ImprovementStrategy } from '../utils/strategyEngine';
import { Card } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { SkeletonCard } from '../components/ui/Skeleton';

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadStrategyCache(): { problems: CoreProblem[]; strategies: ImprovementStrategy[] } | null {
  try {
    const raw = sessionStorage.getItem('wos-strategy');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const SCORE_LABELS: Record<string, string> = {
  goal: '목표와 퀘스트', eval: '평가와 보상', collab: '협업과 속도',
  leadership: '리더십', growth: '성장',
};

const TENURE_COLORS = ['#FF6B6B', '#F59E0B', '#3B82F6', '#2DD4BF', '#00C9B1'];

const URGENCY_LABEL: Record<string, string> = { high: '긴급', medium: '주의', low: '일반' };
const URGENCY_COLOR: Record<string, string> = { high: '#FF6B6B', medium: '#F59E0B', low: '#00C9B1' };

// ─── Page wrapper ─────────────────────────────────────────────────────────────
// A4: 794 × 1123 px

function ReportPage({
  children, className = '', style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`report-page relative bg-navy-800 overflow-hidden ${className}`}
      style={{ width: 794, minHeight: 1123, fontFamily: 'Pretendard, sans-serif', ...style }}
    >
      {children}
    </div>
  );
}

function PageHeader({ title, page, total }: { title: string; page: number; total: number }) {
  return (
    <div className="flex items-center justify-between px-10 py-4 border-b border-white/10">
      <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">WOS 퇴사 설문 분석</span>
      <span className="text-slate-500 text-xs">{title} · {page}/{total}</span>
    </div>
  );
}

// ─── CheckboxList ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'cover', label: '표지' },
  { id: 'summary', label: 'Executive Summary' },
  { id: 'stats', label: '응답 현황 통계' },
  { id: 'analysis', label: '점수 & 상관 분석' },
  { id: 'strategy', label: '핵심 문제 & 전략' },
  { id: 'tasks', label: '개선 과제 현황' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportPageComponent() {
  const {
    filteredRows, basicStats, topReasons, byDept,
    tenureBuckets, scoreAverages, correlations,
  } = useSurveyData();
  const { tasks } = useTaskStore();

  const strategyCache = useMemo(() => loadStrategyCache(), []);
  const problems = strategyCache?.problems ?? [];
  const strategies = strategyCache?.strategies ?? [];

  const [exporting, setExporting] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id))
  );

  const toggleSection = (id: string) =>
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleExport = async () => {
    setExporting(true);
    setExportStep(0);
    try {
      await exportToPDF((step, total) => setExportStep(Math.round((step / total) * 100)));
      toast.success('✓ PDF 저장 완료');
    } catch {
      toast.error('PDF 출력 실패');
    }
    setExporting(false);
    setExportStep(0);
  };

  const isEmpty = filteredRows.length === 0;
  const today = new Date().toLocaleDateString('ko-KR');
  const summary = basicStats.total > 0
    ? buildExecutiveSummary(basicStats, topReasons, problems)
    : '데이터를 불러온 후 전략 분석을 실행하면 요약이 생성됩니다.';

  const radarData = scoreAverages.map((s) => ({
    subject: s.label, score: s.avg, fullMark: 5,
  }));

  const taskStats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    delayed: tasks.filter(isDelayed).length,
  };

  return (
    <div className="flex gap-5 items-start">

      {/* ── 보고서 미리보기 (70%) ── */}
      <div className="flex-[7] min-w-0 overflow-x-auto space-y-3">
        {isEmpty ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            <Card className="text-center py-12">
              <p className="text-slate-400">데이터 없음 — 설정에서 데이터를 동기화하세요.</p>
            </Card>
          </div>
        ) : (
          <>
            {/* ── Page 1: 표지 ── */}
            {enabledSections.has('cover') && (
              <ReportPage className="flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(160deg, #0F2440 0%, #0B1929 60%, #060E18 100%)' } as React.CSSProperties}
              >
                <div className="text-center px-16">
                  <p className="text-teal-400 font-mono font-bold tracking-[0.3em] text-5xl mb-6">WOS</p>
                  <h1 className="text-white text-3xl font-bold mb-4">퇴사 설문 분석 보고서</h1>
                  <div className="w-24 h-0.5 bg-teal-500 mx-auto mb-8" />
                  <div className="space-y-2 text-slate-400 text-sm">
                    <p>분석 기간: {basicStats.dateRange.from} ~ {basicStats.dateRange.to}</p>
                    <p>생성일: {today}</p>
                    <p className="text-teal-400 text-lg font-semibold mt-4">총 {basicStats.total.toLocaleString('ko-KR')}건 응답</p>
                  </div>
                </div>
                <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                  <p className="text-slate-600 text-xs">WOS HR Analytics · Confidential</p>
                </div>
              </ReportPage>
            )}

            {/* ── Page 2: Executive Summary ── */}
            {enabledSections.has('summary') && (
              <ReportPage>
                <PageHeader title="Executive Summary" page={2} total={6} />
                <div className="px-10 py-8 space-y-8">
                  <div className="border-l-4 border-teal-500 bg-teal-500/10 rounded-r-xl p-6">
                    <p className="text-teal-400 text-3xl font-serif opacity-50 leading-none mb-3">"</p>
                    <p className="text-slate-200 text-sm italic leading-relaxed">{summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: '총 응답자', value: basicStats.total.toLocaleString('ko-KR'), sub: '퇴사자', accent: 'text-white' },
                      {
                        label: '평균 eNPS',
                        value: `${basicStats.avgENPS >= 0 ? '+' : ''}${basicStats.avgENPS}`,
                        sub: `중앙값 ${basicStats.medianENPS >= 0 ? '+' : ''}${basicStats.medianENPS}`,
                        accent: basicStats.avgENPS >= 0 ? 'text-teal-400' : 'text-red-400',
                      },
                      { label: '5개 항목 평균', value: basicStats.avgScoreOverall.toFixed(1), sub: '/ 5.0', accent: 'text-blue-400' },
                      { label: '최다 퇴사 사유', value: basicStats.topReason, sub: `${topReasons[0]?.pct ?? 0}%`, accent: 'text-white text-base' },
                    ].map(({ label, value, sub, accent }) => (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <p className="text-slate-400 text-xs mb-2">{label}</p>
                        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
                        <p className="text-slate-500 text-xs mt-1">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ReportPage>
            )}

            {/* ── Page 3: 응답 현황 ── */}
            {enabledSections.has('stats') && (
              <ReportPage>
                <PageHeader title="응답 현황 통계" page={3} total={6} />
                <div className="px-10 py-6 space-y-6">
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3">부서별 현황</h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['부서명', '응답수', '비율', '평균 eNPS', '주요 퇴사 사유'].map((h) => (
                            <th key={h} className="text-left py-2 pr-4 text-slate-400 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {byDept.map((d) => (
                          <tr key={d.dept}>
                            <td className="py-2 pr-4 text-slate-200 font-medium">{d.dept || '미입력'}</td>
                            <td className="py-2 pr-4 text-slate-300">{d.count}</td>
                            <td className="py-2 pr-4 text-slate-300">{d.pct}%</td>
                            <td className={`py-2 pr-4 font-medium ${d.avgENPS >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                              {d.avgENPS >= 0 ? '+' : ''}{d.avgENPS}
                            </td>
                            <td className="py-2 text-slate-400 max-w-[200px] truncate">{d.topReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3">근속기간 분포</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={tenureBuckets} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff15" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {tenureBuckets.map((_, i) => <Cell key={i} fill={TENURE_COLORS[i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ReportPage>
            )}

            {/* ── Page 4: 점수 & 상관 분석 ── */}
            {enabledSections.has('analysis') && (
              <ReportPage>
                <PageHeader title="점수 & 상관 분석" page={4} total={6} />
                <div className="px-10 py-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-3">5개 항목 평균 점수</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            {['항목명', '평균', '3점 이하'].map((h) => (
                              <th key={h} className="text-left py-2 pr-4 text-slate-400 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {scoreAverages.map((s) => (
                            <tr key={s.key}>
                              <td className="py-2 pr-4 text-slate-200">{s.label}</td>
                              <td className={`py-2 pr-4 font-bold ${s.avg <= 3 ? 'text-red-400' : 'text-teal-400'}`}>
                                {s.avg.toFixed(2)}
                              </td>
                              <td className="py-2 text-slate-400">{s.lowCount}명</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold text-sm mb-3">eNPS 상관계수</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            {['항목', 'r 값', 'p값', '유의미'].map((h) => (
                              <th key={h} className="text-left py-2 pr-3 text-slate-400 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {correlations.map((c) => (
                            <tr key={c.key}>
                              <td className="py-2 pr-3 text-slate-200">{SCORE_LABELS[c.key]}</td>
                              <td className={`py-2 pr-3 font-bold ${c.significant ? 'text-teal-400' : 'text-slate-400'}`}>
                                {c.r.toFixed(2)}
                              </td>
                              <td className="py-2 pr-3 text-slate-400">{c.pValue.toFixed(2)}</td>
                              <td className="py-2">{c.significant ? '★' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ResponsiveContainer width="80%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar dataKey="score" stroke="#00C9B1" fill="#00C9B1" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ReportPage>
            )}

            {/* ── Page 5: 핵심 문제 & 전략 ── */}
            {enabledSections.has('strategy') && (
              <ReportPage>
                <PageHeader title="핵심 문제 & 개선 전략" page={5} total={6} />
                <div className="px-10 py-6 space-y-5">
                  {!problems.length ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-500 text-sm">전략 분석 페이지에서 분석을 실행해주세요.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-white font-semibold text-sm mb-3">핵심 문제 도출</h3>
                        <div className="space-y-2">
                          {problems.map((p, i) => (
                            <div key={p.id} className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3">
                              <span className="text-slate-600 font-black text-xl w-6 shrink-0">{i + 1}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-white text-xs font-medium">{p.title}</p>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: URGENCY_COLOR[p.urgency], background: `${URGENCY_COLOR[p.urgency]}20` }}>
                                    {URGENCY_LABEL[p.urgency]}
                                  </span>
                                </div>
                                <p className="text-teal-400/80 text-xs">{p.evidence}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-semibold text-sm mb-3">개선 전략</h3>
                        <div className="space-y-2">
                          {strategies.map((s) => (
                            <div key={s.id} className="bg-white/5 rounded-xl px-4 py-3">
                              <p className="text-white text-xs font-medium mb-1">{s.title}</p>
                              <ul className="space-y-0.5 mb-1">
                                {s.tasks.slice(0, 2).map((t, i) => (
                                  <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                                    <span className="text-teal-400 mt-0.5">·</span>
                                    {t.title}
                                  </li>
                                ))}
                              </ul>
                              <p className="text-slate-500 text-xs">{s.estimatedImpact}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ReportPage>
            )}

            {/* ── Page 6: 개선 과제 현황 ── */}
            {enabledSections.has('tasks') && (
              <ReportPage>
                <PageHeader title="개선 과제 현황" page={6} total={6} />
                <div className="px-10 py-6 space-y-5">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: '전체', value: taskStats.total, color: 'text-white' },
                      { label: '완료', value: taskStats.done, color: 'text-teal-400' },
                      { label: '진행중', value: taskStats.inProgress, color: 'text-blue-400' },
                      { label: '지연', value: taskStats.delayed, color: 'text-red-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {!tasks.length ? (
                    <p className="text-slate-500 text-sm text-center py-8">등록된 과제 없음</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['과제명', '담당자', '마감일', '진행률', '상태'].map((h) => (
                            <th key={h} className="text-left py-2 pr-4 text-slate-400 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tasks.slice(0, 15).map((t) => (
                          <tr key={t.id}>
                            <td className="py-2 pr-4 text-slate-200 max-w-[200px] truncate">{t.title}</td>
                            <td className="py-2 pr-4 text-slate-400">{t.assignee || '—'}</td>
                            <td className="py-2 pr-4 text-slate-400">{t.dueDate || '—'}</td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${t.progress}%` }} />
                                </div>
                                <span className="text-slate-400">{t.progress}%</span>
                              </div>
                            </td>
                            <td className="py-2 text-slate-400">{t.status === 'done' ? '✅ 완료' : isDelayed(t) ? '🔴 지연' : t.status === 'in_progress' ? '🔵 진행중' : '⬜ 계획중'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </ReportPage>
            )}
          </>
        )}
      </div>

      {/* ── 조작 패널 (30%) ── */}
      <div className="w-72 shrink-0 space-y-4 sticky top-4">
        <Card>
          <p className="text-white font-semibold mb-4">PDF 내보내기</p>

          <button
            onClick={handleExport}
            disabled={exporting || isEmpty}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500 text-navy-900 font-semibold text-sm hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {exporting ? `처리중... ${exportStep}%` : 'PDF 내보내기'}
          </button>

          {exporting && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${exportStep}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1.5 text-center">
                {Math.round(exportStep / (100 / SECTIONS.length))} / {SECTIONS.length} 페이지 처리중...
              </p>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-slate-300 font-medium text-sm mb-3">포함 섹션</p>
          <div className="space-y-2">
            {SECTIONS.map((sec) => (
              <label key={sec.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enabledSections.has(sec.id)}
                  onChange={() => toggleSection(sec.id)}
                  className="w-4 h-4 accent-teal-500 rounded"
                />
                <span className={`text-sm transition-colors ${enabledSections.has(sec.id) ? 'text-slate-200' : 'text-slate-600'}`}>
                  {sec.label}
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-slate-400 text-xs">
            <span className="text-slate-300 font-medium block mb-1">보고서 정보</span>
            분석 기간: {basicStats.dateRange.from} ~ {basicStats.dateRange.to}<br />
            총 응답자: {basicStats.total.toLocaleString('ko-KR')}명<br />
            생성일: {today}
          </p>
        </Card>
      </div>
    </div>
  );
}
