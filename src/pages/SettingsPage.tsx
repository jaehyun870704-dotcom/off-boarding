import { useState } from 'react';
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Trash2,
  TableProperties,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore';
import { SHEET_VIEW_URL } from '../utils/csvParser';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  idle: {
    icon: Clock,
    label: '대기 중',
    cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  },
  loading: {
    icon: Loader2,
    label: '동기화 중',
    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  success: {
    icon: CheckCircle2,
    label: '동기화 완료',
    cls: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  },
  error: {
    icon: XCircle,
    label: '오류',
    cls: 'bg-coral/15 text-coral border-coral/30',
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

// ─── Error guide accordion ────────────────────────────────────────────────────

function ErrorGuide({ message }: { message: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-coral/30 bg-coral/5">
      <div className="flex items-start gap-3">
        <XCircle size={18} className="text-coral shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-coral font-medium text-sm mb-1">동기화 오류</p>
          <p className="text-slate-400 text-xs font-mono break-all">{message}</p>
          <p className="text-slate-400 text-sm mt-2">
            스프레드시트 공유 설정이{' '}
            <span className="text-white font-medium">'링크가 있는 모든 사용자 - 뷰어'</span>
            인지 확인해주세요.
          </p>

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-teal-400 text-xs mt-3 hover:text-teal-300 transition-colors"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? '안내 접기' : '시트 공유 설정 방법 보기'}
          </button>

          {open && (
            <ol className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-teal-400 font-bold shrink-0">1.</span>
                Google Sheets에서 오른쪽 상단{' '}
                <span className="text-white font-medium">공유</span> 버튼 클릭
              </li>
              <li className="flex gap-2">
                <span className="text-teal-400 font-bold shrink-0">2.</span>
                하단 <span className="text-white font-medium">링크 보기</span> 섹션에서
                드롭다운을 <span className="text-white font-medium">링크가 있는 모든 사용자</span>로 변경
              </li>
              <li className="flex gap-2">
                <span className="text-teal-400 font-bold shrink-0">3.</span>
                역할을 <span className="text-white font-medium">뷰어</span>로 설정
              </li>
              <li className="flex gap-2">
                <span className="text-teal-400 font-bold shrink-0">4.</span>
                <span className="text-white font-medium">링크 복사</span> 후{' '}
                <span className="text-white font-medium">완료</span> 클릭, 이후 다시 동기화 시도
              </li>
            </ol>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { rows, syncStatus, syncError, lastSynced, syncData, loadSampleData, clearData } =
    useSurveyStore();

  const statusCfg = STATUS_CONFIG[syncStatus];
  const StatusIcon = statusCfg.icon;

  const handleSync = async () => {
    await syncData();
    const { syncStatus: s, rows: r } = useSurveyStore.getState();
    if (s === 'success') {
      toast.success(`✓ ${r.length}개 응답 로드 완료`);
    } else {
      toast.error('동기화 실패 — 아래 오류 안내를 확인해주세요');
    }
  };

  const handleSample = () => {
    loadSampleData();
    toast.success('샘플 데이터 30개가 로드되었습니다');
  };

  const handleClear = () => {
    clearData();
    toast.info('데이터가 초기화되었습니다');
  };

  return (
    <div className="max-w-2xl space-y-5">

      {/* 섹션 1 — 연동 정보 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TableProperties size={18} className="text-teal-400" />
          <h2 className="text-white font-semibold">연동된 데이터 소스</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b border-white/5">
            <span className="text-slate-400 text-sm">시트명</span>
            <span className="text-slate-200 text-sm font-medium">
              WOS 오프보딩 서베이(응답)
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-white/5">
            <span className="text-slate-400 text-sm">방식</span>
            <span className="text-slate-200 text-sm">Google Sheets CSV Export</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-slate-400 text-sm">스프레드시트</span>
            <a
              href={SHEET_VIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 text-sm transition-colors"
            >
              <ExternalLink size={14} />
              시트 열기
            </a>
          </div>
        </div>
      </Card>

      {/* 섹션 2 — 동기화 상태 */}
      <Card>
        <h2 className="text-white font-semibold mb-4">동기화 상태</h2>

        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statusCfg.cls}`}
            >
              <StatusIcon
                size={13}
                className={syncStatus === 'loading' ? 'animate-spin' : ''}
              />
              {statusCfg.label}
            </span>

            <p className="text-slate-400 text-sm">
              마지막 동기화:{' '}
              <span className="text-slate-200">{timeAgo(lastSynced)}</span>
            </p>
            <p className="text-slate-400 text-sm">
              현재 데이터:{' '}
              <span className="text-teal-400 font-semibold">{rows.length}개</span> 응답
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              loading={syncStatus === 'loading'}
              onClick={handleSync}
            >
              {syncStatus === 'loading' ? (
                '동기화 중...'
              ) : (
                <>
                  <RefreshCw size={15} />
                  지금 새로고침
                </>
              )}
            </Button>

            {rows.length > 0 && (
              <Button variant="danger" size="sm" onClick={handleClear}>
                <Trash2 size={14} />
                데이터 초기화
              </Button>
            )}
          </div>
        </div>

        <p className="text-slate-500 text-xs">
          Google Sheets가 <strong className="text-slate-400">'링크가 있는 모든 사용자 — 뷰어'</strong>
          로 공유되어 있어야 외부 API 키 없이 자동으로 데이터를 불러올 수 있습니다.
        </p>
      </Card>

      {/* 섹션 3 — 오류 안내 (조건부) */}
      {syncStatus === 'error' && syncError && (
        <ErrorGuide message={syncError} />
      )}

      {/* 섹션 4 — 샘플 데이터 */}
      <Card>
        <div className="flex items-start gap-3">
          <FlaskConical size={18} className="text-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-white font-semibold mb-1">샘플 데이터로 테스트</h2>
            <p className="text-slate-400 text-sm mb-4">
              실제 시트 연결 전 기능 확인용 30개 mock 응답 데이터가 로드됩니다.
              실제 데이터를 불러오면 자동으로 대체됩니다.
            </p>
            <Button variant="secondary" size="md" onClick={handleSample}>
              <FlaskConical size={15} />
              샘플 데이터 로드
            </Button>
          </div>
        </div>
      </Card>

      {/* 섹션 5 — 컬럼 매핑 참조 */}
      <Card>
        <h2 className="text-white font-semibold mb-3">컬럼 매핑 참조</h2>
        <p className="text-slate-400 text-xs mb-3">
          헤더 이름에 아래 키워드가 포함되면 자동으로 인식합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">열</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">인식 키워드</th>
                <th className="text-left py-2 text-slate-400 font-medium">필드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ['A', '타임스탬프', 'timestamp'],
                ['B', '결정적인 원인', 'exitReasons[]'],
                ['C', '결정적 사건', 'criticalEvent'],
                ['D', '목표와 퀘스트', 'scores.goal'],
                ['G', '평가와 보상', 'scores.eval'],
                ['J', '협업과 속도', 'scores.collab'],
                ['M', '리더십', 'scores.leadership'],
                ['P', '성장', 'scores.growth'],
                ['S', '추천하실 의향', 'enps (0~10 → -100~+100)'],
                ['T', '긍정적 요소', 'positiveAspect'],
                ['U', '뜯어 고치', 'changeRequest'],
                ['V', '자유롭게', 'freeText'],
                ['W', '소속 / 조직명', 'department'],
                ['X', '성명', 'name (자동 마스킹)'],
                ['Y', '직급', 'position'],
                ['Z', '근속기간', 'tenureRaw / tenureMonths'],
              ].map(([col, keyword, field]) => (
                <tr key={col}>
                  <td className="py-2 pr-4 text-teal-400 font-mono font-bold">{col}</td>
                  <td className="py-2 pr-4 text-slate-300">{keyword}</td>
                  <td className="py-2 text-slate-500 font-mono">{field}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
