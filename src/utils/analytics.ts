import type { SurveyRow } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function normalCDF(x: number): number {
  // Abramowitz & Stegun approximation (7.1.26)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp((-x * x) / 2);
  const poly =
    t * (0.3193815 +
      t * (-0.3565638 +
        t * (1.7814779 +
          t * (-1.8212560 +
            t * 1.3302744))));
  const p = 1 - d * poly;
  return x >= 0 ? p : 1 - p;
}

const SCORE_LABELS: Record<string, string> = {
  goal: '목표와 퀘스트',
  eval: '평가와 보상',
  collab: '협업과 속도',
  leadership: '리더십',
  growth: '성장',
};

const SCORE_KEYS = ['goal', 'eval', 'collab', 'leadership', 'growth'] as const;

// ─── 1. 기본 통계 ────────────────────────────────────────────────────────────

export interface BasicStats {
  total: number;
  avgENPS: number;
  medianENPS: number;
  avgScores: Record<string, number>;
  avgScoreOverall: number;
  topDept: string;
  topReason: string;
  dateRange: { from: string; to: string };
}

export function calcBasicStats(rows: SurveyRow[]): BasicStats {
  if (!rows.length) {
    return {
      total: 0, avgENPS: 0, medianENPS: 0,
      avgScores: Object.fromEntries(SCORE_KEYS.map((k) => [k, 0])),
      avgScoreOverall: 0, topDept: '—', topReason: '—',
      dateRange: { from: '—', to: '—' },
    };
  }

  const enpsVals = rows.map((r) => r.enps);
  const avgScores = Object.fromEntries(
    SCORE_KEYS.map((k) => [k, round1(avg(rows.map((r) => r.scores[k])))])
  );
  const avgScoreOverall = round1(
    avg(SCORE_KEYS.map((k) => avgScores[k]))
  );

  const deptMap = new Map<string, number>();
  rows.forEach((r) => deptMap.set(r.department, (deptMap.get(r.department) ?? 0) + 1));
  const topDept = [...deptMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const reasonMap = new Map<string, number>();
  rows.forEach((r) =>
    r.exitReasons.forEach((reason) =>
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1)
    )
  );
  const topReason = [...reasonMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const timestamps = rows.map((r) => r.timestamp).filter(Boolean).sort();

  return {
    total: rows.length,
    avgENPS: Math.round(avg(enpsVals)),
    medianENPS: Math.round(median(enpsVals)),
    avgScores,
    avgScoreOverall,
    topDept,
    topReason,
    dateRange: {
      from: timestamps[0]?.slice(0, 10) ?? '—',
      to: timestamps[timestamps.length - 1]?.slice(0, 10) ?? '—',
    },
  };
}

// ─── 2. 퇴사 이유 집계 ────────────────────────────────────────────────────────

export interface ReasonStat {
  reason: string;
  count: number;
  pct: number;
}

export function calcTopReasons(rows: SurveyRow[]): ReasonStat[] {
  if (!rows.length) return [];
  const map = new Map<string, number>();
  rows.forEach((r) =>
    r.exitReasons.forEach((reason) =>
      map.set(reason, (map.get(reason) ?? 0) + 1)
    )
  );
  const total = rows.length;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({
      reason,
      count,
      pct: round1((count / total) * 100),
    }));
}

// ─── 3. 부서별 집계 ───────────────────────────────────────────────────────────

export interface DeptStat {
  dept: string;
  count: number;
  pct: number;
  avgENPS: number;
  avgScores: Record<string, number>;
  topReason: string;
}

export function calcByDepartment(rows: SurveyRow[]): DeptStat[] {
  if (!rows.length) return [];
  const map = new Map<string, SurveyRow[]>();
  rows.forEach((r) => {
    const d = r.department || '미입력';
    const arr = map.get(d) ?? [];
    arr.push(r);
    map.set(d, arr);
  });

  return [...map.entries()]
    .map(([dept, group]) => {
      const reasonMap = new Map<string, number>();
      group.forEach((r) =>
        r.exitReasons.forEach((rs) => reasonMap.set(rs, (reasonMap.get(rs) ?? 0) + 1))
      );
      const topReason = [...reasonMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

      return {
        dept,
        count: group.length,
        pct: round1((group.length / rows.length) * 100),
        avgENPS: Math.round(avg(group.map((r) => r.enps))),
        avgScores: Object.fromEntries(
          SCORE_KEYS.map((k) => [k, round1(avg(group.map((r) => r.scores[k])))])
        ),
        topReason,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── 4. 직급별 분포 ───────────────────────────────────────────────────────────

export interface PositionStat {
  position: string;
  count: number;
  pct: number;
}

export function calcByPosition(rows: SurveyRow[]): PositionStat[] {
  if (!rows.length) return [];
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const p = r.position || '미입력';
    map.set(p, (map.get(p) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([position, count]) => ({
      position,
      count,
      pct: round1((count / rows.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── 5. 근속기간 분포 ─────────────────────────────────────────────────────────

export interface TenureBucket {
  label: string;
  count: number;
  pct: number;
}

const TENURE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: '6개월 미만', min: 0, max: 5 },
  { label: '6개월~1년', min: 6, max: 11 },
  { label: '1~2년', min: 12, max: 23 },
  { label: '2~3년', min: 24, max: 35 },
  { label: '3년 이상', min: 36, max: Infinity },
];

export function calcTenureBuckets(rows: SurveyRow[]): TenureBucket[] {
  if (!rows.length) return TENURE_BUCKETS.map(({ label }) => ({ label, count: 0, pct: 0 }));
  return TENURE_BUCKETS.map(({ label, min, max }) => {
    const count = rows.filter((r) => r.tenureMonths >= min && r.tenureMonths <= max).length;
    return { label, count, pct: round1((count / rows.length) * 100) };
  });
}

// ─── 6. 점수 항목별 평균 ──────────────────────────────────────────────────────

export interface ScoreAverage {
  label: string;
  key: string;
  avg: number;
  lowCount: number;
}

export function calcScoreAverages(rows: SurveyRow[]): ScoreAverage[] {
  return SCORE_KEYS.map((key) => ({
    label: SCORE_LABELS[key],
    key,
    avg: rows.length ? round2(avg(rows.map((r) => r.scores[key]))) : 0,
    lowCount: rows.filter((r) => r.scores[key] <= 3).length,
  }));
}

// ─── 7. 피어슨 상관계수 ───────────────────────────────────────────────────────

export interface Correlation {
  label: string;
  key: string;
  r: number;
  pValue: number;
  significant: boolean;
}

export function calcCorrelations(rows: SurveyRow[]): Correlation[] {
  return SCORE_KEYS.map((key) => {
    const pairs = rows
      .map((r) => [r.scores[key], r.enps] as [number, number])
      .filter(([x, y]) => !isNaN(x) && !isNaN(y));

    const n = pairs.length;
    if (n < 3) return { label: SCORE_LABELS[key], key, r: 0, pValue: 1, significant: false };

    const xs = pairs.map(([x]) => x);
    const ys = pairs.map(([, y]) => y);
    const sumX  = xs.reduce((s, v) => s + v, 0);
    const sumY  = ys.reduce((s, v) => s + v, 0);
    const sumXY = pairs.reduce((s, [x, y]) => s + x * y, 0);
    const sumX2 = xs.reduce((s, v) => s + v * v, 0);
    const sumY2 = ys.reduce((s, v) => s + v * v, 0);

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
    const r = den === 0 ? 0 : round2(num / den);

    const t = r * Math.sqrt((n - 2) / Math.max(1 - r * r, 1e-10));
    const pValue = round2(2 * (1 - normalCDF(Math.abs(t))));

    return { label: SCORE_LABELS[key], key, r, pValue, significant: pValue < 0.05 };
  });
}

// ─── 8. 월별 추세 ─────────────────────────────────────────────────────────────

export interface MonthlyTrend {
  yearMonth: string;
  count: number;
}

export function calcMonthlyTrend(rows: SurveyRow[]): MonthlyTrend[] {
  if (!rows.length) return [];
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const ym = (r.timestamp ?? '').slice(0, 7);
    if (ym.length === 7) map.set(ym, (map.get(ym) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([yearMonth, count]) => ({ yearMonth, count }));
}

// ─── 9. eNPS 구간 파이 ────────────────────────────────────────────────────────

export interface ENPSBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function calcENPSBuckets(rows: SurveyRow[]): ENPSBucket[] {
  const buckets = [
    { label: '추천자', min: 70,  max: 100,  color: '#00C9B1' },
    { label: '수동자', min: 0,   max: 69,   color: '#F59E0B' },
    { label: '비추천자', min: -100, max: -1, color: '#FF6B6B' },
  ];
  const total = rows.length || 1;
  return buckets.map(({ label, min, max, color }) => {
    const count = rows.filter((r) => r.enps >= min && r.enps <= max).length;
    return { label, count, pct: round1((count / total) * 100), color };
  });
}
