import type { BasicStats, ReasonStat, ScoreAverage, Correlation, DeptStat } from './analytics';

// ─── interfaces ───────────────────────────────────────────────────────────────

export interface CoreProblem {
  id: string;
  title: string;
  description: string;
  evidence: string;
  impactScore: number;          // 0~10
  urgency: 'high' | 'medium' | 'low';
  affectedDepts: string[];
  linkedScoreKey: string;       // 'eval'|'leadership'|'growth'|'collab'|'goal'|'reason'
}

export interface StrategyTask {
  title: string;
  duration: string;
  difficulty: 'high' | 'medium' | 'low';
  expectedEffect: string;
}

export interface ImprovementStrategy {
  id: string;
  linkedProblemId: string;
  title: string;
  description: string;
  tasks: StrategyTask[];
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function urgencyFrom(score: number): CoreProblem['urgency'] {
  if (score >= 7) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function findReason(reasons: ReasonStat[], keyword: string): ReasonStat | undefined {
  return reasons.find((r) => r.reason.includes(keyword));
}

function findScore(scores: ScoreAverage[], key: string): ScoreAverage | undefined {
  return scores.find((s) => s.key === key);
}

function findCorr(corrs: Correlation[], key: string): Correlation | undefined {
  return corrs.find((c) => c.key === key);
}

// ─── 7 RULES ─────────────────────────────────────────────────────────────────

export function deriveProblems(
  basicStats: BasicStats,
  topReasons: ReasonStat[],
  scoreAverages: ScoreAverage[],
  correlations: Correlation[],
  byDept: DeptStat[],
  totalRows: number
): CoreProblem[] {
  if (totalRows < 3) return [];

  const problems: CoreProblem[] = [];

  // ── RULE 1: 평가/보상 불신 ────────────────────────────────────────────────
  {
    const evalReason =
      findReason(topReasons, '평가/보상 불만') ?? findReason(topReasons, '평가');
    const evalScore = findScore(scoreAverages, 'eval');
    const condA = (evalReason?.pct ?? 0) >= 25;
    const condB = (evalScore?.avg ?? 5) <= 2.5;

    if (condA || condB) {
      const pct = evalReason?.pct ?? 0;
      const scoreVal = evalScore?.avg ?? 0;
      const raw = (pct / 10) + (3 - scoreVal) * 2;
      const impactScore = clamp(Math.round(raw * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_eval',
        title: '평가/보상 불신 문제',
        description:
          'WOS 성과 평가(WGPR) 기준의 불투명성과 보상 불균형으로 인해 직원이 이탈하고 있습니다.',
        evidence: `평가/보상 관련 퇴사 응답 ${pct}%, [평가와 보상] 평균 점수 ${scoreVal.toFixed(1)}점 (5점 만점)`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [],
        linkedScoreKey: 'eval',
      });
    }
  }

  // ── RULE 2: 리더십 실효성 문제 ────────────────────────────────────────────
  {
    const ldrReason = findReason(topReasons, '리더십');
    const ldrScore = findScore(scoreAverages, 'leadership');
    const ldrCorr = findCorr(correlations, 'leadership');

    const condA = (ldrReason?.pct ?? 0) >= 20;
    const condB = (ldrScore?.avg ?? 5) <= 2.5;
    const condC = Math.abs(ldrCorr?.r ?? 0) >= 0.35 && (ldrCorr?.significant ?? false);

    if (condA || (condB && condC)) {
      const scoreVal = ldrScore?.avg ?? 0;
      const r = ldrCorr?.r ?? 0;
      const direction = r >= 0 ? '정(+)' : '부(-)';
      const raw = (3 - scoreVal) * 2 + Math.abs(r) * 3;
      const impactScore = clamp(Math.round(raw * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_leadership',
        title: '리더십 실효성 문제',
        description:
          '직속 리더의 피드백 품질 저하와 바틀넥이 직원 몰입도를 낮추고 있습니다.',
        evidence: `[리더십] 평균 ${scoreVal.toFixed(1)}점, 상관계수 r=${r.toFixed(2)} (eNPS와 ${direction} 상관)`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [],
        linkedScoreKey: 'leadership',
      });
    }
  }

  // ── RULE 3: 성장 기회 부재 ────────────────────────────────────────────────
  {
    const gwthReason = findReason(topReasons, '성장');
    const gwthScore = findScore(scoreAverages, 'growth');
    const condA = (gwthReason?.pct ?? 0) >= 20;
    const condB = (gwthScore?.avg ?? 5) <= 2.8;

    if (condA || condB) {
      const pct = gwthReason?.pct ?? 0;
      const scoreVal = gwthScore?.avg ?? 0;
      const raw = (pct / 10) + (3 - scoreVal) * 1.5;
      const impactScore = clamp(Math.round(raw * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_growth',
        title: '성장 기회 부재',
        description:
          '커리어 경로와 역량 개발 기회의 부재로 성장 지향 인재가 이탈하고 있습니다.',
        evidence: `성장 관련 퇴사 응답 ${pct}%, [성장] 평균 점수 ${scoreVal.toFixed(1)}점`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [],
        linkedScoreKey: 'growth',
      });
    }
  }

  // ── RULE 4: 목표/자율성 시스템 문제 ──────────────────────────────────────
  {
    const goalScore = findScore(scoreAverages, 'goal');
    const goalCorr = findCorr(correlations, 'goal');
    const condA = (goalScore?.avg ?? 5) <= 2.8;
    const condB = Math.abs(goalCorr?.r ?? 0) >= 0.3 && (goalCorr?.significant ?? false);

    if (condA || condB) {
      const scoreVal = goalScore?.avg ?? 0;
      const lowCount = goalScore?.lowCount ?? 0;
      const raw = (3 - scoreVal) * 1.8 + (condB ? 2 : 0);
      const impactScore = clamp(Math.round(raw * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_goal',
        title: '목표/자율성 시스템 문제',
        description:
          '불명확한 목표 설정과 퀘스트 자율성 부재가 업무 몰입도를 저해하고 있습니다.',
        evidence: `[목표와 퀘스트] 평균 ${scoreVal.toFixed(1)}점 (3점 이하 응답 ${lowCount}명)`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [],
        linkedScoreKey: 'goal',
      });
    }
  }

  // ── RULE 5: 협업 구조 / 관료주의 문제 ────────────────────────────────────
  {
    const collabScore = findScore(scoreAverages, 'collab');
    const overloadReason = findReason(topReasons, '업무 과부하');
    const collabReason = findReason(topReasons, '협업');
    const condA = (collabScore?.avg ?? 5) <= 2.8;
    const condB = (overloadReason?.pct ?? 0) >= 15 || (collabReason?.pct ?? 0) >= 15;

    if (condA || condB) {
      const scoreVal = collabScore?.avg ?? 0;
      const reasonPct = Math.max(overloadReason?.pct ?? 0, collabReason?.pct ?? 0);
      const raw = (3 - scoreVal) * 1.5 + reasonPct / 10;
      const impactScore = clamp(Math.round(raw * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_collab',
        title: '협업 구조 / 관료주의 문제',
        description:
          '과도한 보고 단계와 느린 의사결정이 업무 속도와 협업 효율을 낮추고 있습니다.',
        evidence: `[협업과 속도] 평균 ${scoreVal.toFixed(1)}점`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [],
        linkedScoreKey: 'collab',
      });
    }
  }

  // ── RULE 6: 특정 부서 집중 이탈 ──────────────────────────────────────────
  {
    const topDeptStat = byDept[0];
    if (topDeptStat && topDeptStat.pct >= 35) {
      const impactScore = clamp(Math.round((topDeptStat.pct / 10) * 10) / 10, 0, 10);
      problems.push({
        id: 'prob_dept',
        title: `${topDeptStat.dept} 집중 이탈`,
        description: `${topDeptStat.dept}에서 퇴사자가 집중 발생하고 있어 부서 특화 원인 분석이 필요합니다.`,
        evidence: `전체 응답의 ${topDeptStat.pct}%가 ${topDeptStat.dept} 소속 (eNPS ${topDeptStat.avgENPS >= 0 ? '+' : ''}${topDeptStat.avgENPS})`,
        impactScore,
        urgency: urgencyFrom(impactScore),
        affectedDepts: [topDeptStat.dept],
        linkedScoreKey: 'reason',
      });
    }
  }

  // ── RULE 7: eNPS 위기 ─────────────────────────────────────────────────────
  {
    if (basicStats.avgENPS <= -20) {
      const impactScore = clamp(Math.round(Math.abs(basicStats.avgENPS) / 10), 0, 10);
      problems.push({
        id: 'prob_enps',
        title: 'eNPS 위기 — 전반적 몰입도 저하',
        description:
          '구성원 전반의 몰입도가 임계점 이하로 떨어져 연쇄 이탈 위험이 있습니다.',
        evidence: `평균 eNPS ${basicStats.avgENPS} (정상 기준 0 이상)`,
        impactScore,
        urgency: 'high',
        affectedDepts: [],
        linkedScoreKey: 'reason',
      });
    }
  }

  // impactScore 내림차순, 최대 5개
  return problems
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);
}

// ─── STRATEGY TEMPLATES ───────────────────────────────────────────────────────

const STRATEGY_TEMPLATES: Record<
  string,
  Omit<ImprovementStrategy, 'id' | 'linkedProblemId'>
> = {
  eval: {
    title: 'WGPR 평가 체계 신뢰도 강화',
    description:
      'WOS 성과 평가(WGPR) 기준의 투명성과 공정성을 높여 직원 신뢰를 회복합니다.',
    tasks: [
      {
        title: 'WGPR 평가 기준 명문화 및 전사 공유',
        duration: '2주',
        difficulty: 'medium',
        expectedEffect: '평가 불신 퇴사 30% 감소 예상',
      },
      {
        title: '평가 결과 개인 피드백 면담 정례화',
        duration: '1개월',
        difficulty: 'low',
        expectedEffect: '평가 만족도 20% 향상 예상',
      },
      {
        title: '보상 구조 시장 벤치마킹 및 개선안 수립',
        duration: '2개월',
        difficulty: 'high',
        expectedEffect: '처우 관련 퇴사 25% 감소 예상',
      },
    ],
    priority: 'high',
    estimatedImpact: '평가/보상 이슈 퇴사 35% 감소 예상',
  },
  leadership: {
    title: '직속 리더십 역량 강화 프로그램',
    description:
      '직속 리더의 피드백 품질과 바틀넥 해소 능력을 높입니다.',
    tasks: [
      {
        title: '리더 1:1 면담 가이드라인 수립 및 교육',
        duration: '3주',
        difficulty: 'medium',
        expectedEffect: '1:1 피드백 만족도 향상',
      },
      {
        title: '분기별 리더십 360도 피드백 도입',
        duration: '2개월',
        difficulty: 'medium',
        expectedEffect: '리더 역량 데이터 기반 개선',
      },
      {
        title: '신규 리더 코칭 프로그램 운영',
        duration: '3개월',
        difficulty: 'high',
        expectedEffect: '리더십 역량 지수 +0.5 목표',
      },
    ],
    priority: 'high',
    estimatedImpact: '리더십 관련 퇴사 25% 감소 예상',
  },
  growth: {
    title: '직원 성장 경로 체계화',
    description:
      '명확한 커리어 패스와 성장 지원으로 장기 재직 유인을 높입니다.',
    tasks: [
      {
        title: '직무별 커리어 로드맵 수립',
        duration: '1개월',
        difficulty: 'medium',
        expectedEffect: '성장 가시성 향상, 몰입도 +20%',
      },
      {
        title: '사내 멘토링/스터디 제도 운영',
        duration: '2주',
        difficulty: 'low',
        expectedEffect: '지식 공유 문화 정착',
      },
      {
        title: '외부 교육비 지원 정책 확대',
        duration: '1개월',
        difficulty: 'low',
        expectedEffect: '성장 이슈 퇴사 20% 감소 예상',
      },
    ],
    priority: 'medium',
    estimatedImpact: '성장 이슈 퇴사 25% 감소 예상',
  },
  goal: {
    title: '퀘스트(목표) 명확성 및 자율성 개선',
    description:
      '목표 설정 방식과 실행 자율성을 개선해 업무 몰입도를 높입니다.',
    tasks: [
      {
        title: 'OKR 설정 워크숍 정례화',
        duration: '2주',
        difficulty: 'low',
        expectedEffect: '목표 이해도 30% 향상 예상',
      },
      {
        title: '퀘스트 범위/권한 명문화',
        duration: '3주',
        difficulty: 'medium',
        expectedEffect: '자율성 체감 향상',
      },
      {
        title: '주간 목표 체크인 루틴 도입',
        duration: '1주',
        difficulty: 'low',
        expectedEffect: '목표 정렬 속도 개선',
      },
    ],
    priority: 'medium',
    estimatedImpact: '목표 불명확 이슈 20% 개선 예상',
  },
  collab: {
    title: '협업 구조 경량화 및 의사결정 속도 개선',
    description:
      '불필요한 프로세스와 관료주의를 제거해 협업 속도를 높입니다.',
    tasks: [
      {
        title: '결재 단계 축소 및 권한 위임 기준 수립',
        duration: '1개월',
        difficulty: 'high',
        expectedEffect: '의사결정 속도 30% 향상 예상',
      },
      {
        title: '부서간 협업 채널 단일화',
        duration: '2주',
        difficulty: 'low',
        expectedEffect: '커뮤니케이션 비용 감소',
      },
      {
        title: '비효율 회의 구조 개선 가이드 배포',
        duration: '1주',
        difficulty: 'low',
        expectedEffect: '회의 시간 20% 절감 예상',
      },
    ],
    priority: 'medium',
    estimatedImpact: '협업 불만 퇴사 20% 감소 예상',
  },
  reason: {
    title: '집중 이탈 / 몰입 저하 대응',
    description:
      '특정 부서 집중 이탈 또는 eNPS 위기에 대한 즉각 대응 계획입니다.',
    tasks: [
      {
        title: '해당 부서 심층 인터뷰 실시',
        duration: '2주',
        difficulty: 'low',
        expectedEffect: '구체적 이탈 원인 파악',
      },
      {
        title: 'eNPS 저점 원인 분석 워크숍',
        duration: '1주',
        difficulty: 'low',
        expectedEffect: '공감대 형성 및 개선 방향 도출',
      },
      {
        title: '직원 몰입도 회복 단기 이벤트 기획',
        duration: '2주',
        difficulty: 'medium',
        expectedEffect: '단기 분위기 개선 및 신뢰 회복',
      },
    ],
    priority: 'high',
    estimatedImpact: '집중 이탈 부서 eNPS +15 목표',
  },
};

export function generateStrategies(problems: CoreProblem[]): ImprovementStrategy[] {
  return problems.map((p) => {
    const tpl = STRATEGY_TEMPLATES[p.linkedScoreKey] ?? STRATEGY_TEMPLATES['reason'];
    return {
      id: `strat_${p.id}`,
      linkedProblemId: p.id,
      ...tpl,
      // 부서 집중 이탈/eNPS 위기는 제목을 동적으로
      title:
        p.linkedScoreKey === 'reason'
          ? `${p.title} — 대응 전략`
          : tpl.title,
    };
  });
}

// ─── EXECUTIVE SUMMARY ────────────────────────────────────────────────────────

export function buildExecutiveSummary(
  basicStats: BasicStats,
  topReasons: ReasonStat[],
  problems: CoreProblem[]
): string {
  const top1 = topReasons[0];
  const top2 = topReasons[1];
  const enps = basicStats.avgENPS;
  const enpsStatus =
    enps <= -20 ? '위험 수준' : enps <= 0 ? '주의 필요' : '양호';
  const top1Problem = problems[0];

  const reasonPart = top2
    ? `'${top1?.reason ?? '—'}'(${top1?.pct ?? 0}%), '${top2.reason}'(${top2.pct}%) 순`
    : `'${top1?.reason ?? '—'}'(${top1?.pct ?? 0}%)`;

  return (
    `총 ${basicStats.total}건의 퇴사 설문을 분석한 결과, 주요 퇴사 원인은 ` +
    `${reasonPart}으로 나타났습니다. ` +
    `평균 eNPS는 ${enps}점으로 ${enpsStatus} 상태이며, ` +
    `[${top1Problem?.title ?? '—'}] 해결이 가장 시급한 과제로 도출되었습니다.`
  );
}
