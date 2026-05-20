import { useMemo } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import {
  calcBasicStats,
  calcTopReasons,
  calcByDepartment,
  calcByPosition,
  calcTenureBuckets,
  calcScoreAverages,
  calcCorrelations,
  calcMonthlyTrend,
  calcENPSBuckets,
} from '../utils/analytics';
import type {
  BasicStats, ReasonStat, DeptStat, PositionStat,
  TenureBucket, ScoreAverage, Correlation, MonthlyTrend, ENPSBucket,
} from '../utils/analytics';
import type { SurveyRow } from '../types';

export interface Filters {
  departments: string[];
  positions: string[];
  trackAB: 'all' | 'A' | 'B';
}

export interface SurveyAnalysis {
  filteredRows: SurveyRow[];
  basicStats: BasicStats;
  topReasons: ReasonStat[];
  byDept: DeptStat[];
  byPosition: PositionStat[];
  tenureBuckets: TenureBucket[];
  scoreAverages: ScoreAverage[];
  correlations: Correlation[];
  monthlyTrend: MonthlyTrend[];
  enpsBuckets: ENPSBucket[];
}

const DEFAULT_FILTERS: Filters = {
  departments: [],
  positions: [],
  trackAB: 'all',
};

export function useSurveyData(filters: Filters = DEFAULT_FILTERS): SurveyAnalysis {
  const rows = useSurveyStore((s) => s.rows);

  return useMemo(() => {
    let filtered = rows;

    if (filters.departments.length > 0) {
      filtered = filtered.filter((r) => filters.departments.includes(r.department));
    }
    if (filters.positions.length > 0) {
      filtered = filtered.filter((r) => filters.positions.includes(r.position));
    }

    return {
      filteredRows: filtered,
      basicStats: calcBasicStats(filtered),
      topReasons: calcTopReasons(filtered),
      byDept: calcByDepartment(filtered),
      byPosition: calcByPosition(filtered),
      tenureBuckets: calcTenureBuckets(filtered),
      scoreAverages: calcScoreAverages(filtered),
      correlations: calcCorrelations(filtered),
      monthlyTrend: calcMonthlyTrend(filtered),
      enpsBuckets: calcENPSBuckets(filtered),
    };
  }, [rows, filters.departments, filters.positions, filters.trackAB]);
}
