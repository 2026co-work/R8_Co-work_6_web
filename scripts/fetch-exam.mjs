/**
 * scripts/fetch-exam.mjs
 * 明石高専の定期試験ページを取得・解析し、試験時間割・ステータスを生成するスクリプト
 * 
 * 実行方法:
 *   node scripts/fetch-exam.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dist-data', 'exam.json');
const FALLBACK_PATH = path.join(PROJECT_ROOT, 'scripts', 'fallbacks', 'exam.json');

const EXAM_PAGE_URL = 'https://www.akashi.ac.jp/life/examtimetable.html';

export const STANDARD_EXAM_PERIODS = [
  { id: '2-F', name: '2限F', start: '10:40', end: '11:25' },
  { id: '2-S', name: '2限S', start: '11:25', end: '12:10' },
  { id: '3-F', name: '3限F', start: '13:00', end: '13:45' },
  { id: '3-S', name: '3限S', start: '13:45', end: '14:30' },
  { id: '4-F', name: '4限F', start: '14:40', end: '15:25' },
  { id: '4-S', name: '4限S', start: '15:25', end: '16:10' }
];

export const OFFICIAL_NOTICE_TEXT = '定期試験時間割は、試験開始10日前の正午にこちらで発表します。試験は2限から開始しますが、9時に登校し自習することを原則とします。JRの遅延などが生じた場合、9時に登校していることを前提として対応します。';

export async function fetchPage(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTPエラー (${response.status} ${response.statusText}): ${url}`);
    }

    const buffer = await response.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buffer);
    if (text.includes('charset=Shift_JIS') || text.includes('charset=shift_jis')) {
      text = new TextDecoder('shift-jis').decode(buffer);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export function extractExamLinks(html, baseUrl) {
  const links = [];
  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      const fileName = path.basename(new URL(absoluteUrl).pathname);
      links.push({
        title: rawText || fileName,
        url: absoluteUrl,
        fileName
      });
    } catch {
      // ignore
    }
  }
  return links;
}

export async function loadBaselineExam() {
  try {
    const raw = await fs.readFile(FALLBACK_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Baseline exam fallback missing: ${err.message}`);
  }
}

export async function parseExamPdf(pdfBuffer, fiscalYear = 2026) {
  return new Promise((resolve) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', () => resolve({ days: [], schedule: [], textsCount: 0 }));
    parser.on('pdfParser_dataReady', (pdfData) => {
      try {
        const pages = pdfData.Pages || [];
        const tokens = pages.flatMap((p, pageIdx) =>
          (p.Texts || []).map(t => {
            try {
              return { page: pageIdx, x: t.x, y: t.y, text: decodeURIComponent(t.R?.[0]?.T || '').trim() };
            } catch {
              return { page: pageIdx, x: t.x, y: t.y, text: (t.R?.[0]?.T || '').trim() };
            }
          })
        ).filter(i => i.text.length > 0);

        const schedule = [];
        const rows = [];
        tokens.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
        for (const t of tokens) {
          const row = rows.find(r => r.page === t.page && Math.abs(r.y - t.y) < 0.7);
          if (row) row.cells.push(t);
          else rows.push({ page: t.page, y: t.y, cells: [t] });
        }

        let currentDate = '';
        for (const row of rows) {
          const line = row.cells.map(c => c.text).join(' ');
          const dateM = line.match(/(\d{1,2})月(\d{1,2})日/);
          if (dateM) {
            const m = Number(dateM[1]);
            const d = Number(dateM[2]);
            const y = m <= 3 ? fiscalYear + 1 : fiscalYear;
            currentDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
          const classM = line.match(/([1-5])[-年]?\s*([MECA]|ED|EJ)|専([12])\s*(ME|AC)/);
          const periodM = line.match(/([2-4])\s*[-限]?\s*(F|S|前半|後半)?/);
          if (classM && periodM) {
            const grade = classM[3] ? Number(classM[3]) + 5 : Number(classM[1]);
            const dept = classM[4] || (classM[2] === 'ED' || classM[2] === 'EJ' ? 'E' : classM[2]);
            const course = (classM[2] === 'ED' || classM[2] === 'EJ') ? classM[2] : undefined;
            const pSuffix = periodM[2] === '前半' ? 'F' : (periodM[2] === '後半' ? 'S' : (periodM[2] || 'F'));
            const period = `${periodM[1]}-${pSuffix}`;
            const remainder = line
              .replace(classM[0], '')
              .replace(periodM[0], '')
              .replace(/\s+/g, ' ')
              .trim();
            if (remainder) {
              schedule.push({
                ...(currentDate ? { date: currentDate } : {}),
                grade,
                department: dept,
                ...(course ? { course } : {}),
                period,
                subject: remainder
              });
            }
          }
        }
        resolve({ days: schedule, schedule, textsCount: tokens.length });
      } catch {
        resolve({ days: [], schedule: [], textsCount: 0 });
      }
    });
    parser.parseBuffer(pdfBuffer);
  });
}

export async function runFetchExam() {
  console.log('=== 明石高専 定期試験取得スクリプト ===');
  console.log(`URL: ${EXAM_PAGE_URL}`);

  let previousData = null;
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
    previousData = JSON.parse(raw);
  } catch {
    // No previous file
  }

  const baseline = await loadBaselineExam();
  let result = null;

  try {
    const html = await fetchPage(EXAM_PAGE_URL);
    console.log(` -> ページ取得成功 (${html.length} bytes)`);

    const links = extractExamLinks(html, EXAM_PAGE_URL);
    console.log(` -> 検出されたリンク数: ${links.length}`);

    const timetablePdf = links.find(l => l.url.includes('shiken') || l.title.includes('試験時間割'));
    const notesPdf = links.find(l => l.url.includes('syotyui') || l.title.includes('諸注意'));
    const returnPdf = links.find(l => l.url.includes('touan') || l.title.includes('答案返却'));

    // Check if the timetable is for the active term (後期) or previous (前期)
    const isCurrentTermPublished = timetablePdf && (
      timetablePdf.title.includes('後期') || 
      timetablePdf.fileName.toLowerCase().includes('kouki')
    );

    let status = 'scheduled';
    let sourcePdfUrl = '';
    let days = [];
    let schedule = [];

    if (isCurrentTermPublished) {
      // Current term exam PDF is released
      status = 'published';
      sourcePdfUrl = timetablePdf.url;
      try {
        const pdfRes = await fetch(sourcePdfUrl);
        if (pdfRes.ok) {
          const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
          const parsedExam = await parseExamPdf(pdfBuf, baseline.meta.fiscalYear || 2026);
          if (parsedExam.days.length > 0) {
            days = parsedExam.days;
            schedule = parsedExam.schedule;
            console.log(` -> 試験PDF解析成功 (${days.length} entries)`);
          }
        }
      } catch (e) {
        console.warn(`[WARN] 試験PDF解析失敗: ${e.message}`);
      }
    } else if (timetablePdf) {
      // Only previous term PDF is available -> status is scheduled with link
      status = 'scheduled';
      sourcePdfUrl = '';
    } else {
      status = 'scheduled';
    }

    result = {
      meta: {
        title: baseline.meta.title,
        term: baseline.meta.term || '後期',
        fiscalYear: baseline.meta.fiscalYear || 2026,
        status,
        noticeText: OFFICIAL_NOTICE_TEXT,
        sourceUrl: EXAM_PAGE_URL,
        sourcePdfUrl: sourcePdfUrl || (status === 'published' ? timetablePdf?.url : ''),
        notesPdfUrl: notesPdf?.url || baseline.meta.notesPdfUrl || '',
        returnPdfUrl: returnPdf?.url || baseline.meta.returnPdfUrl || '',
        examStartDate: baseline.meta.examStartDate || '2027-02-02',
        examEndDate: baseline.meta.examEndDate || '2027-02-08',
        updatedAt: new Date().toISOString()
      },
      periods: STANDARD_EXAM_PERIODS,
      days,
      ...(schedule.length > 0 ? { schedule } : {})
    };
  } catch (err) {
    console.warn(`[WARN] 試験情報取得失敗: ${err.message}`);
    if (previousData && previousData.meta && previousData.periods) {
      console.log(' -> 既存の有効な exam.json を保持・再利用します');
      result = {
        ...previousData,
        meta: {
          ...previousData.meta,
          updatedAt: new Date().toISOString()
        }
      };
    } else {
      console.log(' -> ベースラインフォールバックを使用します');
      result = {
        ...baseline,
        meta: {
          ...baseline.meta,
          updatedAt: new Date().toISOString()
        }
      };
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✔ exam.json 保存完了: ${OUTPUT_PATH}`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFetchExam().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
  });
}
