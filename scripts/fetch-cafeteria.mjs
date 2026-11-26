/**
 * scripts/fetch-cafeteria.mjs
 * 明石高専の学生食堂・寮生食堂メニューを取得・解析するスクリプト
 *
 * 実行方法:
 *   node scripts/fetch-cafeteria.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dist-data', 'cafeteria.json');
const FALLBACK_PATH = path.join(PROJECT_ROOT, 'scripts', 'fallbacks', 'cafeteria.json');

const NEWS_FEED_URL = 'https://www.akashi.ac.jp/resource/2_1a.json';
const BASE_URL = 'https://www.akashi.ac.jp';

export const OFFICIAL_ALLERGENS = ['小麦', '卵', '乳', 'そば', '落花生', 'えび', 'かに', 'くるみ'];
const OFFICIAL_ALLERGEN_SET = new Set(OFFICIAL_ALLERGENS);

const TEMPLATE_NOISE_RE = /^(?:エネルギー|たんぱく質|脂\s*質|炭水化物|食塩相当量|アレルゲン|ご飯|0|\d+(?:\.\d+)?[gｇ]|\d+kcal|[¥￥]\d+)$/i;

export async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtml(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    const buffer = await res.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buffer);
    if (text.includes('charset=Shift_JIS') || text.includes('charset=shift_jis')) {
      text = new TextDecoder('shift-jis').decode(buffer);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export function extractNewsArticles(newsFeed) {
  if (Array.isArray(newsFeed)) return newsFeed;
  if (newsFeed && Array.isArray(newsFeed.array)) return newsFeed.array;
  if (newsFeed && Array.isArray(newsFeed.items)) return newsFeed.items;
  return [];
}

export function extractPdfLinkFromHtml(html, baseUrl) {
  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    try {
      return new URL(match[1].trim(), baseUrl).href;
    } catch {
      // ignore
    }
  }
  return '';
}

export function parseArticleDateRange(title = '') {
  const norm = String(title).replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  const m = norm.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*[～〜~\-－]\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  return {
    startMonth: Number(m[1]),
    startDay: Number(m[2]),
    endMonth: Number(m[3]),
    endDay: Number(m[4])
  };
}

export function inferFiscalYearAndMonth(article, fallbackFiscalYear = 2026, fallbackMonth = 11) {
  const title = String(article?.title || '');
  const range = parseArticleDateRange(title);
  let month = range ? range.startMonth : null;
  if (!month) {
    const norm = title.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    const mm = norm.match(/(\d{1,2})\s*月/);
    if (mm) month = Number(mm[1]);
  }
  const dateRaw = String(article?.datetime || article?.date || '');
  const dm = dateRaw.match(/(\d{4})[.\-\/](\d{1,2})/);
  if (dm) {
    const artYear = Number(dm[1]);
    const artMonth = Number(dm[2]);
    const targetMonth = month || artMonth;
    const menuYear = (artMonth >= 11 && targetMonth <= 2) ? artYear + 1 : artYear;
    const fiscalYear = targetMonth <= 3 ? menuYear - 1 : menuYear;
    return { fiscalYear, month: targetMonth };
  }
  return { fiscalYear: fallbackFiscalYear, month: month || fallbackMonth };
}

function normalizeDishName(s) {
  return String(s || '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, ' ')
    .replace(/\s+（/g, '（')
    .trim();
}

function extractPageTokens(page) {
  return (page?.Texts || []).map((t, index) => {
    const raw = (t.R || []).map(r => r.T || '').join('');
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
    const fontSize = Number(t.R?.[0]?.TS?.[1] || 0);
    return { index, x: Number(t.x || 0), y: Number(t.y || 0), fontSize, text: text.trim() };
  }).filter(t => t.text.length > 0);
}

/**
 * コンパスグループ（明石高専 学生食堂）週次Excel PDFテンプレートを汎用解析する。
 * - 列境界は日付見出し＋「アレルゲン」x座標から動的検出
 * - 行帯は各メニューブロック底部の「アレルゲン」y座標から動的検出
 * - Excel図形オーバーレイ（page.Fills の大矩形）により、休業日・他月カバー・常設メニューのみ日を判定
 * - 特定原材料8品目の「●」をx座標の最近傍ヘッダーに対応付け
 */
export function parseWeeklyMenuTable(pages = [], fiscalYearOrOptions = 2026) {
  const opts = typeof fiscalYearOrOptions === 'object' && fiscalYearOrOptions !== null
    ? fiscalYearOrOptions
    : { fiscalYear: Number(fiscalYearOrOptions) || 2026, articleTitle: '' };
  const fiscalYear = Number(opts.fiscalYear) || 2026;
  const articleTitle = String(opts.articleTitle || '');
  const range = parseArticleDateRange(articleTitle);

  const weeks = [];
  const seenDates = new Set();

  for (const page of pages) {
    const tokens = extractPageTokens(page);
    if (tokens.length === 0) continue;

    const pageW = Number(page.Width) || 52.6;
    const fills = Array.isArray(page.Fills) ? page.Fills : [];
    const overlays = fills.filter(f => Number(f.w) >= 7.0 && Number(f.h) >= 6.0 && Number(f.y) >= 5.5);

    // 1. 日付ヘッダー列の検出（"11月4日" 形式）
    const dateTokens = tokens
      .filter(t => t.y < 7.5 && /^(\d{1,2})月(\d{1,2})日$/.test(t.text))
      .sort((a, b) => a.x - b.x);
    if (dateTokens.length === 0) continue;

    // 2. 各メニュー行帯の底部（「アレルゲン」行）を検出
    const rawAllgYs = tokens.filter(t => t.text === 'アレルゲン').map(t => t.y).sort((a, b) => a - b);
    const allgYs = [];
    for (const y of rawAllgYs) {
      if (allgYs.length === 0 || y - allgYs[allgYs.length - 1] > 1.0) {
        allgYs.push(y);
      }
    }
    if (allgYs.length < 2) continue;

    // 3. 列左端境界の検出
    const firstAllgXs = tokens
      .filter(t => t.text === 'アレルゲン' && Math.abs(t.y - allgYs[0]) < 0.5)
      .map(t => t.x)
      .sort((a, b) => a - b);

    const tableMaxIdx = tokens.reduce(
      (max, t) => (t.text === 'アレルゲン' || t.text === 'エネルギー') ? Math.max(max, t.index) : max,
      0
    );

    const cols = dateTokens.map((dt, idx) => {
      const m = dt.text.match(/^(\d{1,2})月(\d{1,2})日$/);
      const month = Number(m[1]);
      const day = Number(m[2]);
      const year = month <= 3 ? fiscalYear + 1 : fiscalYear;
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      let left;
      let right;
      if (firstAllgXs.length === dateTokens.length) {
        left = firstAllgXs[idx] - 0.35;
        right = idx < dateTokens.length - 1 ? firstAllgXs[idx + 1] - 0.35 : pageW - 0.5;
      } else {
        left = idx === 0 ? 4.3 : (dateTokens[idx - 1].x + dt.x) / 2;
        right = idx < dateTokens.length - 1 ? (dt.x + dateTokens[idx + 1].x) / 2 : pageW - 0.5;
      }
      const centerX = (left + right) / 2;
      const dowTok = tokens.find(t =>
        t.x >= left && t.x < right &&
        t.y > dt.y && t.y < dt.y + 1.2 &&
        /^[（(]([月火水木金土日])[）)]$/.test(t.text)
      );
      const dayOfWeek = dowTok ? dowTok.text.match(/([月火水木金土日])/)[1] : '';
      return {
        idx, month, day, isoDate, dayOfWeek, left, right, centerX,
        headerBottomY: (dowTok ? dowTok.y : dt.y) + 0.3
      };
    });

    const weekDays = [];
    for (const col of cols) {
      if (seenDates.has(col.isoDate)) continue;

      let outOfRange = false;
      if (range) {
        const md = col.month * 100 + col.day;
        const sMd = range.startMonth * 100 + range.startDay;
        const eMd = range.endMonth * 100 + range.endDay;
        if (sMd <= eMd && (md < sMd || md > eMd)) outOfRange = true;
      }

      const colOverlays = overlays.filter(f => col.centerX >= f.x && col.centerX <= f.x + f.w);
      const fullOverlay = colOverlays.find(f => f.h >= 18);
      const partialLunchOverlay = !fullOverlay
        ? colOverlays.find(f => f.y <= allgYs[0] && (f.y + f.h) >= allgYs[1] - 0.5)
        : null;

      const extractOverlayLabel = (box, restrictToCol = true) => {
        const xMin = restrictToCol ? col.left : box.x;
        const xMax = restrictToCol ? col.right : box.x + box.w;
        const inside = tokens.filter(t =>
          t.x >= xMin && t.x <= xMax &&
          t.y >= box.y && t.y <= box.y + box.h &&
          !TEMPLATE_NOISE_RE.test(t.text) &&
          !OFFICIAL_ALLERGEN_SET.has(t.text) &&
          !/^[●・＊]/.test(t.text) &&
          !/^[０-９0-9]+月$/.test(t.text)
        );
        // Excel上の休業バナー・お知らせ枠は18pt以上の大フォント（テスト用モックでfontSize未指定時はtable末尾以降で判定）
        const bigBanner = inside.filter(t => t.fontSize >= 18);
        const picked = bigBanner.length > 0
          ? bigBanner
          : inside.filter(t => t.index > tableMaxIdx && t.fontSize === 0);
        if (picked.length === 0) return '';
        picked.sort((a, b) => a.y - b.y || a.x - b.x);
        const allShort = picked.every(t => t.text.length <= 2);
        return (allShort ? picked.map(t => t.text).join('') : picked.map(t => t.text).join(' '))
          .replace(/―/g, 'ー')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // A. 列全面オーバーレイ（他月カバーまたは全休）
      if (fullOverlay) {
        const label = extractOverlayLabel(fullOverlay, true);
        if (outOfRange) {
          const targetMonth = range ? range.startMonth : col.month;
          if (col.month !== targetMonth || !label) continue;
        }
        seenDates.add(col.isoDate);
        weekDays.push({
          date: col.isoDate,
          dayOfWeek: col.dayOfWeek,
          isOpen: false,
          closedReason: label || '休業日'
        });
        continue;
      }

      const parseRow = (rowIdx) => {
        const yTop = rowIdx === 0 ? col.headerBottomY : allgYs[rowIdx - 1] + 0.35;
        const yBot = allgYs[rowIdx] + 0.45;
        const cell = tokens.filter(t =>
          t.index <= tableMaxIdx &&
          t.fontSize < 18 &&
          t.x >= col.left && t.x < col.right &&
          t.y >= yTop && t.y <= yBot
        );

        const priceTok = cell.find(t => /^[¥￥]\s*(\d{2,4})$/.test(t.text));
        const price = priceTok ? Number(priceTok.text.match(/(\d{2,4})/)[1]) : null;

        const energyLabel = cell.find(t => t.text === 'エネルギー');
        const yNut = energyLabel ? energyLabel.y : allgYs[rowIdx] - 0.9;
        const kcalTok = cell.find(t => t.y >= yNut && t.y <= allgYs[rowIdx] && /^(\d+)\s*kcal$/i.test(t.text));
        const kcal = kcalTok ? Number(kcalTok.text.match(/^(\d+)/)[1]) : null;

        // アレルゲン8品目の「●」座標照合
        const headerToks = cell.filter(t => OFFICIAL_ALLERGEN_SET.has(t.text));
        const dotToks = cell.filter(t => t.text === '●' && t.y >= allgYs[rowIdx] - 0.15);
        const foundAllergens = [];
        for (const dot of dotToks) {
          let best = null;
          let bestDist = Infinity;
          for (const h of headerToks) {
            const centerOffset = h.text.length >= 3 ? 0.32 : (h.text.length === 2 ? 0.18 : 0.05);
            const dist = Math.abs(dot.x - (h.x + centerOffset));
            if (dist < bestDist) {
              bestDist = dist;
              best = h.text;
            }
          }
          if (best && bestDist < 0.65 && !foundAllergens.includes(best)) {
            foundAllergens.push(best);
          }
        }
        const allergens = OFFICIAL_ALLERGENS.filter(a => foundAllergens.includes(a));

        const topToks = cell
          .filter(t => t.y < yNut - 0.15 && t !== priceTok && !/^[¥￥]\s*\d+/.test(t.text))
          .sort((a, b) => Math.abs(a.y - b.y) < 0.25 ? a.x - b.x : a.y - b.y);
        let details = '';
        const nameParts = [];
        for (const t of topToks) {
          if (/^[（(](?:ご飯・)?味噌汁付[）)]$/.test(t.text)) {
            details = t.text.replace(/^[（(]|[）)]$/g, '');
          } else {
            nameParts.push(t.text);
          }
        }
        const name = normalizeDishName(nameParts.join(' '));
        return { name, price, kcal, details, allergens };
      };

      const isEmptyPlaceholder = (r) => !r || !r.name || r.name === '0' || r.kcal === 0;
      const toDish = (r) => isEmptyPlaceholder(r) ? undefined : ({
        name: r.name,
        ...(r.price != null ? { price: r.price } : {}),
        ...(r.kcal != null ? { kcal: r.kcal } : {}),
        ...(r.details ? { details: r.details } : {}),
        ...(r.allergens.length ? { allergens: r.allergens } : {})
      });

      const rA = partialLunchOverlay ? null : parseRow(0);
      const rB = partialLunchOverlay ? null : parseRow(1);
      const rCurry1 = allgYs.length > 2 ? parseRow(2) : null;
      const rCurry2 = allgYs.length > 3 ? parseRow(3) : null;
      const rBowl = allgYs.length > 4 ? parseRow(4) : null;
      const rRamen = allgYs.length > 5 ? parseRow(5) : null;
      const rUdon = allgYs.length > 6 ? parseRow(6) : null;
      const rRice = allgYs.length > 7 ? parseRow(7) : null;

      if (!partialLunchOverlay && isEmptyPlaceholder(rA) && isEmptyPlaceholder(rB)) {
        if (outOfRange) continue;
        seenDates.add(col.isoDate);
        weekDays.push({
          date: col.isoDate,
          dayOfWeek: col.dayOfWeek,
          isOpen: false,
          closedReason: '休業日'
        });
        continue;
      }

      const notice = partialLunchOverlay
        ? (extractOverlayLabel(partialLunchOverlay, false) || '常設メニューのみ')
        : '';

      const lunchA = toDish(rA);
      const lunchB = toDish(rB);
      const noodle = toDish(rRamen);
      const bowl = toDish(rBowl);
      const regularMenu = [toDish(rCurry1), toDish(rCurry2), toDish(rUdon), toDish(rRice)].filter(Boolean);

      seenDates.add(col.isoDate);
      const dayObj = {
        date: col.isoDate,
        dayOfWeek: col.dayOfWeek,
        isOpen: true,
        ...(notice ? { notice } : {}),
        ...(lunchA ? { lunchA } : {}),
        ...(lunchB ? { lunchB } : {}),
        ...(noodle ? { noodle } : {}),
        ...(bowl ? { bowl } : {}),
        ...(regularMenu.length ? { regularMenu } : {})
      };
      const dayAllergens = OFFICIAL_ALLERGENS.filter(a =>
        [lunchA, lunchB, noodle, bowl].some(d => d?.allergens?.includes(a))
      );
      if (dayAllergens.length > 0) dayObj.allergens = dayAllergens;
      weekDays.push(dayObj);
    }

    if (weekDays.length > 0) {
      const first = weekDays[0].date.slice(5).replace('-', '/');
      const last = weekDays[weekDays.length - 1].date.slice(5).replace('-', '/');
      weeks.push({ weekRange: `${first} - ${last}`, days: weekDays });
    }
  }

  // 有効な営業日（料理名あり）が1日も抽出できなかった場合は解析失敗として空配列を返す
  const hasRealDish = weeks.some(w =>
    w.days.some(d => d.isOpen && (d.lunchA?.name || d.lunchB?.name || d.noodle?.name || d.bowl?.name))
  );
  return hasRealDish ? weeks : [];
}

export async function parseDormitoryPdf(pdfBuffer) {
  return new Promise((resolve) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', () => resolve({ isTextExtracted: false, textsCount: 0, items: [] }));
    parser.on('pdfParser_dataReady', (pdfData) => {
      try {
        const pages = pdfData.Pages || [];
        const tokens = pages.flatMap(p => (p.Texts || []).map(t => {
          try {
            return { x: t.x, y: t.y, text: decodeURIComponent(t.R?.[0]?.T || '').trim() };
          } catch {
            return { x: t.x, y: t.y, text: (t.R?.[0]?.T || '').trim() };
          }
        })).filter(i => i.text.length > 0);
        if (tokens.length < 20) {
          resolve({ isTextExtracted: false, textsCount: tokens.length, items: [] });
          return;
        }
        const items = [];
        const rows = [];
        tokens.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const t of tokens) {
          const row = rows.find(r => Math.abs(r.y - t.y) < 0.7);
          if (row) row.cells.push(t.text);
          else rows.push({ y: t.y, cells: [t.text] });
        }
        for (const row of rows) {
          const line = row.cells.join(' ').trim();
          // 日付見出し行（複数日付や曜日が横に並ぶヘッダー）を除外
          if ((line.match(/\d{1,2}月\d{1,2}日/g) || []).length >= 3) continue;
          const dm = line.match(/^(\d{1,2}(?:日|[\/月]\d{1,2}日?))/);
          if (dm && line.length > dm[1].length + 2) {
            items.push({ dateLabel: dm[1], menuText: line.slice(dm[1].length).trim() });
          }
        }
        resolve({ isTextExtracted: items.length >= 3, textsCount: tokens.length, items: items.length >= 3 ? items : [] });
      } catch {
        resolve({ isTextExtracted: false, textsCount: 0, items: [] });
      }
    });
    parser.parseBuffer(pdfBuffer);
  });
}

export async function parseCafeteriaPdf(pdfBuffer) {
  return new Promise((resolve) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', () => resolve({ isTextExtracted: false, textsCount: 0, pages: [] }));
    parser.on('pdfParser_dataReady', (pdfData) => {
      try {
        const pages = pdfData.Pages || [];
        const totalTexts = pages.reduce((acc, p) => acc + (p.Texts?.length || 0), 0);
        if (totalTexts < 50) {
          resolve({ isTextExtracted: false, textsCount: totalTexts, pages });
        } else {
          resolve({ isTextExtracted: true, textsCount: totalTexts, pages });
        }
      } catch {
        resolve({ isTextExtracted: false, textsCount: 0, pages: [] });
      }
    });
    parser.parseBuffer(pdfBuffer);
  });
}

export async function loadBaselineCafeteria() {
  try {
    const raw = await fs.readFile(FALLBACK_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Baseline cafeteria fallback missing: ${err.message}`);
  }
}

export async function runFetchCafeteria() {
  console.log('=== 明石高専 食堂メニュー取得スクリプト ===');
  console.log(`Feed URL: ${NEWS_FEED_URL}`);

  let previousData = null;
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
    previousData = JSON.parse(raw);
  } catch {
    // No previous file
  }

  const baseline = await loadBaselineCafeteria();
  let result = null;

  try {
    const newsFeed = await fetchJson(NEWS_FEED_URL);
    const articles = extractNewsArticles(newsFeed);
    console.log(` -> ニュース記事総数: ${articles.length} 件`);

    const cafeteriaArticles = articles.filter(a => a.title && a.title.includes('食堂'));
    console.log(` -> 食堂関連記事数: ${cafeteriaArticles.length} 件`);

    const studentArticle = cafeteriaArticles.find(a => a.title.includes('学生食堂')) || cafeteriaArticles[0];
    const dormArticle = cafeteriaArticles.find(a => a.title.includes('寮生食堂'));

    let sourcePdfUrl = '';
    let studentArticleUrl = '';
    let dormitoryPdfUrl = '';
    let dormitoryArticleUrl = '';

    if (studentArticle) {
      studentArticleUrl = studentArticle.url?.startsWith('http')
        ? studentArticle.url
        : new URL(studentArticle.url || '', BASE_URL).href;
      try {
        const articleHtml = await fetchHtml(studentArticleUrl);
        sourcePdfUrl = extractPdfLinkFromHtml(articleHtml, studentArticleUrl);
      } catch (e) {
        console.warn(`[WARN] 学生食堂記事取得失敗: ${e.message}`);
      }
    }

    if (dormArticle) {
      dormitoryArticleUrl = dormArticle.url?.startsWith('http')
        ? dormArticle.url
        : new URL(dormArticle.url || '', BASE_URL).href;
      try {
        const articleHtml = await fetchHtml(dormitoryArticleUrl);
        dormitoryPdfUrl = extractPdfLinkFromHtml(articleHtml, dormitoryArticleUrl);
      } catch (e) {
        console.warn(`[WARN] 寮生食堂記事取得失敗: ${e.message}`);
      }
    }

    const { fiscalYear, month } = inferFiscalYearAndMonth(
      studentArticle,
      baseline.meta.fiscalYear || 2026,
      baseline.meta.month || 11
    );

    let isTextExtracted = false;
    let weeklyMenus = [];
    let dormitoryMenus = [];

    if (sourcePdfUrl) {
      try {
        const pdfRes = await fetch(sourcePdfUrl);
        if (pdfRes.ok) {
          const buffer = Buffer.from(await pdfRes.arrayBuffer());
          const parsed = await parseCafeteriaPdf(buffer);
          if (parsed.isTextExtracted) {
            console.log(` -> PDFテキスト抽出成功 (${parsed.textsCount} items)`);
            const extractedMenus = parseWeeklyMenuTable(parsed.pages, {
              fiscalYear,
              articleTitle: studentArticle?.title || ''
            });
            if (extractedMenus.length > 0) {
              weeklyMenus = extractedMenus;
              isTextExtracted = true;
              const totalDays = extractedMenus.reduce((acc, w) => acc + w.days.length, 0);
              console.log(` -> 表解析成功: ${extractedMenus.length}週分 (${totalDays}日) のメニューを抽出`);
            } else {
              console.log(' -> 表解析0件のためPDFリンク案内のみにします');
            }
          } else {
            console.log(` -> PDFは画像スキャンのためテキスト抽出不可 (テキスト数: ${parsed.textsCount})`);
          }
        }
      } catch (e) {
        console.warn(`[WARN] メニューPDF解析失敗: ${e.message}`);
      }
    }

    if (dormitoryPdfUrl) {
      try {
        const dormRes = await fetch(dormitoryPdfUrl);
        if (dormRes.ok) {
          const dormBuf = Buffer.from(await dormRes.arrayBuffer());
          const dormParsed = await parseDormitoryPdf(dormBuf);
          if (dormParsed.items.length > 0) {
            dormitoryMenus = dormParsed.items;
            console.log(` -> 寮生食堂PDF解析成功 (${dormitoryMenus.length}件)`);
          }
        }
      } catch (e) {
        console.warn(`[WARN] 寮生食堂PDF解析失敗: ${e.message}`);
      }
    }

    result = {
      meta: {
        title: studentArticle?.title || baseline.meta.title,
        articleDate: studentArticle?.datetime || studentArticle?.date || baseline.meta.articleDate,
        articleUrl: studentArticleUrl || baseline.meta.articleUrl,
        sourcePdfUrl: sourcePdfUrl || baseline.meta.sourcePdfUrl,
        dormitoryArticleUrl: dormitoryArticleUrl || baseline.meta.dormitoryArticleUrl,
        dormitoryPdfUrl: dormitoryPdfUrl || baseline.meta.dormitoryPdfUrl,
        isTextExtracted,
        month,
        fiscalYear,
        updatedAt: new Date().toISOString()
      },
      weeklyMenus,
      ...(dormitoryMenus.length > 0 ? { dormitoryMenus } : {})
    };
  } catch (err) {
    console.warn(`[WARN] 食堂情報取得失敗: ${err.message}`);
    if (previousData && previousData.meta && Array.isArray(previousData.weeklyMenus)) {
      console.log(' -> 既存の有効な cafeteria.json を保持・再利用します');
      result = previousData;
    } else {
      console.log(' -> ベースラインフォールバックを使用します');
      result = baseline;
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✔ cafeteria.json 保存完了: ${OUTPUT_PATH}`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFetchCafeteria().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
  });
}
