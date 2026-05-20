import type { SurveyRow } from '../types';

const SHEET_ID = '1IIte9vsTtXsuIPgdF-Hig6D3g41hiRVm75NHeQYlQD0';
const GID      = '1828256160';
export const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`;

function maskName(name: string): string {
  if (!name || !name.trim()) return '○○○';
  return name.trim()[0] + '○○';
}

function parseTenureMonths(raw: string): number {
  if (!raw) return 0;
  const yearMatch  = raw.match(/(\d+)\s*년/);
  const monthMatch = raw.match(/(\d+)\s*개월/);
  if (!yearMatch && !monthMatch) {
    // 숫자만 있으면 개월로 간주
    const numOnly = raw.match(/^(\d+)$/);
    return numOnly ? parseInt(numOnly[1]) : 0;
  }
  let months = 0;
  if (yearMatch)  months += parseInt(yearMatch[1]) * 12;
  if (monthMatch) months += parseInt(monthMatch[1]);
  return months;
}

function num(val: string | undefined): number {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? 0 : n;
}

function col(row: Record<string, string>, keyword: string): string {
  const key = Object.keys(row).find((k) => k.includes(keyword));
  return key ? (row[key] ?? '').trim() : '';
}

function makeId(timestamp: string, rawName: string): string {
  try {
    return btoa(unescape(encodeURIComponent(timestamp + rawName))).slice(0, 16);
  } catch {
    return btoa((timestamp + rawName).slice(0, 12)).slice(0, 16);
  }
}

export function parseCSVToRows(data: Record<string, string>[]): SurveyRow[] {
  return data
    .filter((row) => {
      const ts = row['타임스탬프'] ?? Object.values(row)[0] ?? '';
      return ts.trim().length > 0;
    })
    .map((row) => {
      const timestamp = (row['타임스탬프'] ?? Object.values(row)[0] ?? '').trim();
      const rawName   = col(row, '성명');
      const name      = maskName(rawName);

      const enpsRaw = num(col(row, '추천하실 의향') || col(row, 'eNPS') || col(row, 'NPS'));
      const enps    = enpsRaw >= -100 && enpsRaw <= 10
        ? Math.round((enpsRaw - 5) * 20)
        : Math.round(enpsRaw);

      const tenureRaw = col(row, '근속기간');

      return {
        id: makeId(timestamp, rawName),
        timestamp,
        exitReasons: col(row, '결정적인 원인')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        criticalEvent: col(row, '결정적 사건'),
        scores: {
          goal:       num(col(row, '목표와 퀘스트')),
          eval:       num(col(row, '평가와 보상')),
          collab:     num(col(row, '협업과 속도')),
          leadership: num(col(row, '리더십')),
          growth:     num(col(row, '성장')),
        },
        scoreFeedback: {
          goal_problem:        col(row, '목표와 퀘스트') ? (() => {
            const keys = Object.keys(row).filter(k => k.includes('목표와 퀘스트'));
            return row[keys[1]] ?? '';
          })() : '',
          goal_solution:       col(row, '목표와 퀘스트') ? (() => {
            const keys = Object.keys(row).filter(k => k.includes('목표와 퀘스트'));
            return row[keys[2]] ?? '';
          })() : '',
          eval_problem:        (() => { const k = Object.keys(row).filter(k => k.includes('평가와 보상')); return row[k[1]] ?? ''; })(),
          eval_solution:       (() => { const k = Object.keys(row).filter(k => k.includes('평가와 보상')); return row[k[2]] ?? ''; })(),
          collab_problem:      (() => { const k = Object.keys(row).filter(k => k.includes('협업과 속도')); return row[k[1]] ?? ''; })(),
          collab_solution:     (() => { const k = Object.keys(row).filter(k => k.includes('협업과 속도')); return row[k[2]] ?? ''; })(),
          leadership_problem:  (() => { const k = Object.keys(row).filter(k => k.includes('리더십')); return row[k[1]] ?? ''; })(),
          leadership_solution: (() => { const k = Object.keys(row).filter(k => k.includes('리더십')); return row[k[2]] ?? ''; })(),
          growth_problem:      (() => { const k = Object.keys(row).filter(k => k.includes('성장')); return row[k[1]] ?? ''; })(),
          growth_solution:     (() => { const k = Object.keys(row).filter(k => k.includes('성장')); return row[k[2]] ?? ''; })(),
        },
        enps,
        positiveAspect: col(row, '긍정적 요소'),
        changeRequest:  col(row, '뜯어 고치'),
        freeText:       col(row, '자유롭게'),
        department:     col(row, '소속') || col(row, '조직명'),
        name,
        position:    col(row, '직급'),
        tenureRaw,
        tenureMonths: parseTenureMonths(tenureRaw),
      };
    });
}
