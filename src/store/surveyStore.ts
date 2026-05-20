import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Papa from 'papaparse';
import type { SurveyRow, FilterState } from '../types';
import { CSV_URL, parseCSVToRows } from '../utils/csvParser';

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEPTS    = ['개발팀', '마케팅팀', '영업팀', '인사팀', '운영팀'];
const POSITIONS = ['사원', '대리', '과장', '차장'];
const EXIT_REASONS = [
  '평가/보상 불만', '성장 기회 부재', '리더십 문제', '조직문화 부적응',
  '워라밸 불균형', '타사 오퍼', '개인 사유', '업무 과부하',
];
const TENURES = ['6개월', '8개월', '1년', '1년 3개월', '1년 8개월', '2년', '2년 6개월', '3년', '4년 2개월', '5년'];
const NAMES   = ['김민준', '이서연', '박지호', '최유나', '정도윤', '강지민', '윤하은', '임재원', '한소희', '오준서',
                  '서다은', '노태양', '류지수', '문성현', '배나영', '신우진', '안예린', '조현우', '홍다인', '권민서',
                  '남준혁', '엄지현', '전재훈', '변소연', '황민지', '고영훈', '마지은', '도현성', '여소정', '석준영'];

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function makeSampleRow(i: number): SurveyRow {
  const rand = seededRand(i * 7919 + 42);
  const r    = () => rand();
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];

  const name    = NAMES[i] ?? `테스트${i}`;
  const dept    = pick(DEPTS);
  const pos     = pick(POSITIONS);
  const tenure  = pick(TENURES);
  const reasons = EXIT_REASONS.filter(() => r() > 0.6).slice(0, 3);
  if (!reasons.length) reasons.push(pick(EXIT_REASONS));

  const score  = () => Math.max(1, Math.min(5, Math.round(r() * 4 + 1)));
  const enpsRaw = Math.round(r() * 10);

  const date = new Date(2024, Math.floor(r() * 12), Math.floor(r() * 28) + 1);
  const timestamp = date.toISOString().replace('T', ' ').slice(0, 16);

  const maskedName = name[0] + '○○';
  let id = '';
  try { id = btoa(unescape(encodeURIComponent(timestamp + name))).slice(0, 16); }
  catch { id = btoa((timestamp + name).slice(0, 12)).slice(0, 16); }

  return {
    id,
    timestamp,
    exitReasons: reasons,
    criticalEvent: r() > 0.5 ? '갑작스러운 팀 개편으로 역할이 축소되었습니다.' : '명확하지 않은 평가 기준으로 보상에 불만이 생겼습니다.',
    scores: { goal: score(), eval: score(), collab: score(), leadership: score(), growth: score() },
    scoreFeedback: {
      goal_problem:        r() > 0.4 ? '목표가 자주 바뀌어 집중하기 어렵습니다.' : '',
      goal_solution:       r() > 0.5 ? '분기별 OKR 안정화가 필요합니다.' : '',
      eval_problem:        r() > 0.4 ? '평가 기준이 불투명합니다.' : '',
      eval_solution:       r() > 0.5 ? '공정한 피어 리뷰 도입을 제안합니다.' : '',
      collab_problem:      r() > 0.4 ? '부서 간 소통이 부족합니다.' : '',
      collab_solution:     r() > 0.5 ? '정기적인 크로스팀 미팅이 필요합니다.' : '',
      leadership_problem:  r() > 0.4 ? '리더의 피드백이 일관되지 않습니다.' : '',
      leadership_solution: r() > 0.5 ? '리더십 코칭 프로그램 도입을 권장합니다.' : '',
      growth_problem:      r() > 0.4 ? '성장 로드맵이 명확하지 않습니다.' : '',
      growth_solution:     r() > 0.5 ? '개인 개발 예산 지원이 필요합니다.' : '',
    },
    enps: Math.round((enpsRaw - 5) * 20),
    positiveAspect: r() > 0.3 ? '동료들과의 관계는 매우 좋았습니다.' : '자율적인 업무 환경이 좋았습니다.',
    changeRequest:  r() > 0.3 ? '평가 제도와 성장 지원을 개선해주세요.' : '조직 문화와 소통 방식 개선이 필요합니다.',
    freeText:       r() > 0.5 ? '좋은 경험이었지만 개선할 점도 많습니다.' : '',
    department: dept,
    name:       maskedName,
    position:   pos,
    tenureRaw:  tenure,
    tenureMonths: (() => {
      const ym = tenure.match(/(\d+)\s*년/);
      const mm = tenure.match(/(\d+)\s*개월/);
      return (ym ? parseInt(ym[1]) * 12 : 0) + (mm ? parseInt(mm[1]) : 0);
    })(),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SurveyState {
  rows: SurveyRow[];
  lastSynced: string | null;
  syncStatus: 'idle' | 'loading' | 'success' | 'error';
  syncError: string | null;
  filter: FilterState;

  syncData: () => Promise<void>;
  loadSampleData: () => void;
  clearData: () => void;
  setFilter: (filter: Partial<FilterState>) => void;
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set, get) => ({
      rows: [],
      lastSynced: null,
      syncStatus: 'idle',
      syncError: null,
      filter: {
        department: 'all',
        position: 'all',
        tenureRange: [0, 120],
        dateRange: ['', ''],
      },

      syncData: () =>
        new Promise<void>((resolve) => {
          if (get().syncStatus === 'loading') { resolve(); return; }
          set({ syncStatus: 'loading', syncError: null });

          Papa.parse<Record<string, string>>(CSV_URL, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = parseCSVToRows(results.data as Record<string, string>[]);
              set({ rows, syncStatus: 'success', lastSynced: new Date().toISOString() });
              resolve();
            },
            error: (err: Error) => {
              set({ syncStatus: 'error', syncError: err.message });
              resolve();
            },
          });
        }),

      loadSampleData: () => {
        const rows = Array.from({ length: 30 }, (_, i) => makeSampleRow(i));
        set({ rows, syncStatus: 'success', lastSynced: new Date().toISOString(), syncError: null });
      },

      clearData: () =>
        set({ rows: [], syncStatus: 'idle', lastSynced: null, syncError: null }),

      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),
    }),
    {
      name: 'wos-survey',
      partialize: (state) => ({ rows: state.rows, lastSynced: state.lastSynced }),
    }
  )
);
