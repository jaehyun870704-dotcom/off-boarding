import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Label,
  ReferenceLine, LabelList,
} from 'recharts';
import {
  SlidersHorizontal, RotateCcw, Settings, BarChart2,
  TrendingUp, Users, ChevronDown, Check,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore';
import { useSurveyData, type Filters } from '../hooks/useSurveyData';
import { Card } from '../components/ui/Card';

// ─── constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#00C9B1', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0F2440',
    border: '1px solid #00C9B130',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
  labelStyle: { color: '#94a3b8' },
};
const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#ffffff15' };
const TICK = { fill: '#94a3b8', fontSize: 11 };

// ─── MultiSelect dropdown ─────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  const displayLabel =
    selected.length === 0
      ? `${label} (전체)`
      : selected.length === 1
      ? selected[0]
      : `${selected[0]} 외 ${selected.length - 1}개`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 transition-colors min-w-[140px]"
      >
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 min-w-[180px] bg-navy-700 border border-white/10 rounded-xl shadow-xl overflow-hidden">
          <button
            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-white/5 flex items-center justify-between"
            onClick={() => onChange([])}
          >
            전체 선택 해제
            {selected.length === 0 && <Check size={12} className="text-teal-400" />}
          </button>
          <div className="border-t border-white/10" />
          {options.map((opt) => (
            <button
              key={opt}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center justify-between"
              onClick={() => toggle(opt)}
            >
              {opt}
              {selected.includes(opt) && <Check size={12} className="text-teal-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyChart({ height = 220, icon: Icon = BarChart2 }: { height?: number; icon?: React.ElementType }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-slate-600"
      style={{ height }}
    >
      <Icon size={28} strokeWidth={1.2} />
      <p className="text-xs">데이터 없음</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`text-3xl font-bold leading-none ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </Card>
  );
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

function DeptTooltip({ active, payload }: { active?: boolean; payload?: { payload: { dept: string; avgENPS: number; topReason: string; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-700 border border-white/10 rounded-xl p-3 text-xs space-y-1">
      <p className="text-white font-medium">{d.dept}</p>
      <p className="text-slate-400">응답 {d.count}명</p>
      <p className="text-teal-400">eNPS {d.avgENPS >= 0 ? '+' : ''}{d.avgENPS}</p>
      <p className="text-slate-400">주요 사유: {d.topReason}</p>
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const allRows = useSurveyStore((s) => s.rows);
  const navigate = useNavigate();

  const deptOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.department).filter(Boolean))].sort(),
    [allRows]
  );
  const posOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.position).filter(Boolean))].sort(),
    [allRows]
  );

  const [filters, setFilters] = useState<Filters>({
    departments: [],
    positions: [],
    trackAB: 'all',
  });

  const patchFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const resetFilters = () => setFilters({ departments: [], positions: [], trackAB: 'all' });
  const hasFilter = filters.departments.length > 0 || filters.positions.length > 0;

  const {
    filteredRows, basicStats, topReasons, byDept,
    tenureBuckets, scoreAverages, correlations, enpsBuckets,
  } = useSurveyData(filters);

  const isEmpty = allRows.length === 0;
  const n = filteredRows.length;

  // Radar data (score averages)
  const radarData = scoreAverages.map((s) => ({
    subject: s.label,
    score: s.avg,
    fullMark: 5,
  }));

  // Tenure bar colors: coral(short) → teal(long)
  const tenureColors = ['#FF6B6B', '#F59E0B', '#3B82F6', '#2DD4BF', '#00C9B1'];

  // ── Empty state (full page) ──
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <BarChart2 size={56} className="text-slate-700" strokeWidth={1} />
        <p className="text-slate-400 text-lg font-medium">아직 데이터가 없습니다</p>
        <p className="text-slate-500 text-sm">설정에서 Google Sheets를 동기화하거나 샘플 데이터를 로드하세요.</p>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 text-sm hover:bg-teal-500/25 transition-colors"
        >
          <Settings size={15} />
          설정으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── 필터 바 ── */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
          <SlidersHorizontal size={15} className="text-slate-400 shrink-0" />

          <MultiSelect
            label="부서"
            options={deptOptions}
            selected={filters.departments}
            onChange={(v) => patchFilter('departments', v)}
          />
          <MultiSelect
            label="직급"
            options={posOptions}
            selected={filters.positions}
            onChange={(v) => patchFilter('positions', v)}
          />

          {hasFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={12} />
              필터 초기화
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-500 text-xs">
              {hasFilter && <span className="text-teal-400 font-medium">{n}</span>}
              {!hasFilter && <span className="text-slate-300 font-medium">{n}</span>}
              <span className="text-slate-500"> / {allRows.length}개 응답</span>
            </span>
          </div>
        </div>
      </Card>

      {/* ── KPI 카드 4개 ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="총 응답(퇴사자)"
          value={n}
          sub={`전체 기간 ${basicStats.dateRange.from} ~ ${basicStats.dateRange.to}`}
        />
        <KpiCard
          label="eNPS 평균"
          value={`${basicStats.avgENPS >= 0 ? '+' : ''}${basicStats.avgENPS}`}
          sub={`중앙값 ${basicStats.medianENPS >= 0 ? '+' : ''}${basicStats.medianENPS}`}
          accent={basicStats.avgENPS >= 0 ? 'text-teal-400' : 'text-coral'}
        />
        <KpiCard
          label="5개 항목 종합 평균"
          value={basicStats.avgScoreOverall.toFixed(1)}
          sub="/ 5.0 만점"
          accent={
            basicStats.avgScoreOverall >= 4 ? 'text-teal-400'
            : basicStats.avgScoreOverall >= 3 ? 'text-amber'
            : 'text-coral'
          }
        />
        <KpiCard
          label="최다 퇴사 사유"
          value={
            <span className="text-xl leading-snug">{basicStats.topReason}</span>
          }
          sub={topReasons[0] ? `${topReasons[0].pct}%` : ''}
        />
      </div>

      {/* ── 차트 그리드 2×3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* [1] 퇴사 이유 순위 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-4">퇴사 이유 순위</p>
          {!topReasons.length ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topReasons.slice(0, 8).map((r) => ({
                  ...r,
                  reason: r.reason.length > 12 ? r.reason.slice(0, 12) + '…' : r.reason,
                }))}
                layout="vertical"
                margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} {...GRID_PROPS} />
                <XAxis type="number" tick={TICK} />
                <YAxis type="category" dataKey="reason" tick={{ ...TICK, fontSize: 10 }} width={88} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip {...TOOLTIP_STYLE} formatter={((v: any, _: any, p: any) => [`${v}명 (${p.payload.pct}%)`, '응답 수']) as any} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} animationDuration={800}>
                  <LabelList
                    dataKey="pct"
                    position="right"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => `${v}%`}
                    style={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* [2] 부서별 응답 현황 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-4">부서별 응답 현황</p>
          {!byDept.length ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDept} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} {...GRID_PROPS} />
                <XAxis dataKey="dept" tick={{ ...TICK, fontSize: 10 }} />
                <YAxis tick={TICK} />
                <Tooltip content={<DeptTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* [3] 근속기간 분포 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-4">근속기간 분포</p>
          {!tenureBuckets.some((b) => b.count > 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tenureBuckets} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} {...GRID_PROPS} />
                <XAxis dataKey="label" tick={{ ...TICK, fontSize: 10 }} />
                <YAxis tick={TICK} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip {...TOOLTIP_STYLE} formatter={((v: any, _: any, p: any) => [`${v}명 (${p.payload.pct}%)`, '응답 수']) as any} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                  {tenureBuckets.map((_, i) => (
                    <Cell key={i} fill={tenureColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* [4] 5개 항목 레이더 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-1">5개 시스템 점수 (레이더)</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {scoreAverages.filter((s) => s.avg <= 3 && s.avg > 0).map((s) => (
              <span key={s.key} className="text-xs text-coral flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                {s.label} {s.avg.toFixed(1)}
              </span>
            ))}
          </div>
          {!filteredRows.length ? <EmptyChart height={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="#00C9B1"
                  fill="#00C9B1"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  animationDuration={800}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [(v as number).toFixed(2), '평균 점수']} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* [5] eNPS 파이차트 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-4">eNPS 구간 분포</p>
          {!filteredRows.length ? <EmptyChart icon={TrendingUp} /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={enpsBuckets}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    animationDuration={800}
                  >
                    {enpsBuckets.map((b, i) => (
                      <Cell key={i} fill={b.color} />
                    ))}
                    <Label
                      position="center"
                      content={() => (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                          <tspan x="50%" dy="-6" fontSize="22" fontWeight="700" fill={basicStats.avgENPS >= 0 ? '#00C9B1' : '#FF6B6B'}>
                            {basicStats.avgENPS >= 0 ? '+' : ''}{basicStats.avgENPS}
                          </tspan>
                          <tspan x="50%" dy="20" fontSize="10" fill="#94a3b8">eNPS</tspan>
                        </text>
                      )}
                    />
                  </Pie>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip {...TOOLTIP_STYLE} formatter={((v: any, name: any, p: any) => [`${v}명 (${p.payload.pct}%)`, name]) as any} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {enpsBuckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: b.color }} />
                    <div>
                      <p className="text-slate-300 text-xs font-medium">{b.label}</p>
                      <p className="text-slate-500 text-xs">{b.count}명 · {b.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* [6] 상관계수 */}
        <Card>
          <p className="text-slate-200 font-medium text-sm mb-1">점수 항목 vs eNPS 상관계수</p>
          <p className="text-slate-500 text-xs mb-4">* p &lt; 0.05 유의미한 상관</p>
          {!filteredRows.length ? <EmptyChart icon={Users} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={correlations}
                layout="vertical"
                margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} {...GRID_PROPS} />
                <XAxis type="number" domain={[-1, 1]} tick={TICK} tickFormatter={(v) => v.toFixed(1)} />
                <YAxis type="category" dataKey="label" tick={{ ...TICK, fontSize: 10 }} width={84} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip {...TOOLTIP_STYLE} formatter={((v: any, _: any, p: any) => [
                  `r = ${(v as number).toFixed(2)}  p = ${p.payload.pValue.toFixed(2)}${p.payload.significant ? ' *' : ''}`,
                  p.payload.label,
                ]) as any} />
                <Bar dataKey="r" radius={[0, 4, 4, 0]} animationDuration={800}>
                  {correlations.map((c, i) => (
                    <Cell key={i} fill={c.significant ? CHART_COLORS[0] : '#475569'} />
                  ))}
                  <LabelList
                    dataKey="r"
                    position="right"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => (v as number).toFixed(2)}
                    style={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

      </div>

      {/* ── 부서별 상세 테이블 ── */}
      {byDept.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-slate-200 font-medium text-sm">부서별 상세 지표</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['부서', '응답', 'eNPS', '목표', '평가', '협업', '리더십', '성장', '주요 퇴사 사유'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {byDept.map((d) => (
                  <tr key={d.dept} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{d.dept}</td>
                    <td className="px-4 py-3 text-slate-300">{d.count}</td>
                    <td className={`px-4 py-3 font-medium ${d.avgENPS >= 0 ? 'text-teal-400' : 'text-coral'}`}>
                      {d.avgENPS >= 0 ? '+' : ''}{d.avgENPS}
                    </td>
                    {(['goal', 'eval', 'collab', 'leadership', 'growth'] as const).map((k) => (
                      <td key={k} className={`px-4 py-3 ${d.avgScores[k] <= 3 ? 'text-coral' : 'text-slate-300'}`}>
                        {d.avgScores[k].toFixed(1)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{d.topReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
