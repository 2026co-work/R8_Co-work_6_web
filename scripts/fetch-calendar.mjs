/**
 * scripts/fetch-calendar.mjs
 * 明石高専の年間行事予定（年間カレンダー）を取得・解析するスクリプト
 * 
 * 実行方法:
 *   node scripts/fetch-calendar.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dist-data', 'calendar.json');
const FALLBACK_PATH = path.join(PROJECT_ROOT, 'scripts', 'fallbacks', 'calendar.json');

const CALENDAR_URL = 'https://www.akashi.ac.jp/life/calendar.html';

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

export function extractCalendarPdfLinks(html, baseUrl) {
  const links = {
    zenkiPdfUrl: '',
    koukiPdfUrl: ''
  };

  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      const lowerHref = rawHref.toLowerCase();
      if (rawText.includes('前期') || lowerHref.includes('zenki')) {
        links.zenkiPdfUrl = absoluteUrl;
      } else if (rawText.includes('後期') || lowerHref.includes('kouki')) {
        links.koukiPdfUrl = absoluteUrl;
      }
    } catch {
      // ignore invalid URL
    }
  }

  return links;
}

export function extractCalendarEventsFromHtml(html, baselineEvents = []) {
  const merged = Array.isArray(baselineEvents) ? [...baselineEvents] : [];
  if (!html || typeof html !== 'string') return merged;
  const seen = new Set(merged.map(e => `${e.date}|${e.title || e.name || ''}`));
  const rowRegex = /<(?:tr|li|p)\b[^>]*>([\s\S]*?)<\/(?:tr|li|p)>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const plain = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const dm = plain.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (!dm) continue;
    const dateStr = `${dm[1]}-${String(Number(dm[2])).padStart(2, '0')}-${String(Number(dm[3])).padStart(2, '0')}`;
    const title = plain.slice(dm.index + dm[0].length).replace(/^[日\s：:\-–]+/, '').trim();
    if (!title || title.length > 60) continue;
    const key = `${dateStr}|${title}`;
    if (!seen.has(key)) {
      seen.add(key);
      const isHoliday = /祝日|休業|休校|の日$/.test(title);
      const isExam = /試験/.test(title);
      merged.push({
        date: dateStr,
        title,
        hasClasses: !isHoliday && !isExam,
        type: isExam ? 'exam' : (isHoliday ? 'holiday' : 'event')
      });
    }
  }
  return merged.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

export async function loadBaselineCalendar() {
  try {
    const raw = await fs.readFile(FALLBACK_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Baseline calendar fallback missing at ${FALLBACK_PATH}: ${err.message}`);
  }
}

export async function runFetchCalendar() {
  console.log('=== 明石高専 年間行事予定表 取得スクリプト ===');
  console.log(`URL: ${CALENDAR_URL}`);

  let previousData = null;
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
    previousData = JSON.parse(raw);
  } catch {
    // No previous file, will load baseline
  }

  const baseline = await loadBaselineCalendar();
  let result = null;

  try {
    const html = await fetchPage(CALENDAR_URL);
    console.log(` -> ページ取得成功 (${html.length} bytes)`);

    const pdfLinks = extractCalendarPdfLinks(html, CALENDAR_URL);
    console.log(' -> 検出されたPDFリンク:', pdfLinks);
    const events = extractCalendarEventsFromHtml(html, baseline.events);

    result = {
      meta: {
        title: baseline.meta.title,
        fiscalYear: baseline.meta.fiscalYear || 2026,
        sourceUrl: CALENDAR_URL,
        zenkiPdfUrl: pdfLinks.zenkiPdfUrl || baseline.meta.zenkiPdfUrl || '',
        koukiPdfUrl: pdfLinks.koukiPdfUrl || baseline.meta.koukiPdfUrl || '',
        updatedAt: new Date().toISOString()
      },
      terms: baseline.terms,
      daySubstitutions: baseline.daySubstitutions,
      events
    };
  } catch (err) {
    console.warn(`[WARN] カレンダー取得失敗: ${err.message}`);
    if (previousData && previousData.meta && previousData.terms) {
      console.log(' -> 既存の有効な calendar.json を保持・再利用します');
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
  console.log(`✔ calendar.json 保存完了: ${OUTPUT_PATH}`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFetchCalendar().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
  });
}
