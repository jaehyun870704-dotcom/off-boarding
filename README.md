# WOS 오프보딩 설문 분석 대시보드

퇴사 설문 데이터를 기반으로 핵심 문제를 자동 도출하고 개선 전략을 제안하는 HR 애널리틱스 SPA입니다.

## 관련 링크

| 구분 | 링크 |
|------|------|
| 배포 사이트 | [GitHub Pages](https://jaehyun870704-dotcom.github.io/off-boarding/) |
| 소스 코드 | [GitHub Repository](https://github.com/jaehyun870704-dotcom/off-boarding) |
| 데이터 시트 | [Google Sheets](https://docs.google.com/spreadsheets/d/1IIte9vsTtXsuIPgdF-Hig6D3g41hiRVm75NHeQYlQD0/edit#gid=1828256160) |

## 주요 기능

- **대시보드** — eNPS, 평균 점수 KPI 카드 + 6종 Recharts 시각화 (레이더, 바, 파이 차트 등)
- **전략 분석** — 룰 기반 엔진으로 핵심 문제 자동 도출 및 개선 전략 제안 (외부 AI API 불필요)
- **개선 과제** — 칸반 보드 + 테이블 뷰, 과제 상세 편집·댓글·리소스 관리
- **보고서** — A4 6페이지 미리보기 + PDF 내보내기 (html2canvas + jsPDF)
- **설정** — Google Sheets CSV URL 연동, 샘플 데이터 로드

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Vite + React 18 + TypeScript |
| 스타일 | Tailwind CSS v3 (커스텀 navy/teal 팔레트) |
| 상태 관리 | Zustand + persist middleware |
| 라우팅 | React Router v6 |
| 차트 | Recharts |
| PDF 내보내기 | html2canvas + jsPDF |
| 데이터 파싱 | PapaParse (Google Sheets CSV 직접 다운로드) |

## 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 데이터 연동

1. **설정** 페이지 → "Google Sheets에서 동기화" 버튼 클릭
2. 또는 "샘플 데이터 불러오기"로 30건 목업 데이터 즉시 로드
3. Google Sheets 컬럼 형식은 `public/sample_data.csv` 참조

> 외부 API 키 불필요 — Google Sheets 공개 CSV 내보내기 URL을 PapaParse로 직접 파싱합니다.

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/       # Layout, Header, Sidebar
│   └── ui/           # Card, Badge, Button, Modal, Toast, Skeleton
├── hooks/            # useSurveyData (분석 결과 메모이제이션)
├── pages/            # Dashboard, Strategy, Tasks, Report, Settings
├── store/            # surveyStore, taskStore (Zustand + persist)
├── types/            # SurveyRow, ImprovementTask 등 공통 타입
└── utils/            # analytics, csvParser, strategyEngine, exportUtils
```
