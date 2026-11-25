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

export function parseWeeklyMenuTable(pages = [], fiscalYear = 2026) {
  const daysFound = [];
  for (const page of pages) {
    const tokens = (page.Texts || []).map(t => {
      try {
        return { x: t.x, y: t.y, text: decodeURIComponent(t.R?.[0]?.T || '').trim() };
      } catch {
        return { x: t.x, y: t.y, text: (t.R?.[0]?.T || '').trim() };
      }
    }).filter(i => i.text.length > 0);

    const dateTokens = tokens.filter(t => /^\d{1,2}\/\d{1,2}|^\d{1,2}月\d{1,2}日/.test(t.text));
    for (const dt of dateTokens) {
      const m = dt.text.match(/(\d{1,2})[\/月](\d{1,2})/);
      if (!m) continue;
      const month = Number(m[1]);
      const day = Number(m[2]);
      const year = month <= 3 ? fiscalYear + 1 : fiscalYear;
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const colTokens = tokens
        .filter(t => Math.abs(t.x - dt.x) < 4.5 && t.y > dt.y && t.y < dt.y + 18)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map(t => t.text);
      if (colTokens.length === 0) continue;
      const joined = colTokens.join(' ');
      if (/休業|休み|閉店/.test(joined)) {
        daysFound.push({ date: isoDate, isOpen: false, closedReason: colTokens[0] });
        continue;
      }
      const priceMatches = [...joined.matchAll(/(\d{3,4})\s*円/g)].map(pm => Number(pm[1]));
      const nonPriceLines = colTokens.filter(s => !/^\d{3,4}円?$/.test(s));
      const allergenTokens = colTokens.filter(s => /^(小麦|卵|乳|豚肉|鶏肉|牛肉|大豆|えび|かに|そば|落花生|さば|ごま)/.test(s));
      if (nonPriceLines.length > 0) {
        daysFound.push({
          date: isoDate,
          isOpen: true,
          lunchA: { name: nonPriceLines[0], ...(priceMatches[0] ? { price: priceMatches[0] } : {}) },
          ...(nonPriceLines[1] ? { lunchB: { name: nonPriceLines[1], ...(priceMatches[1] ? { price: priceMatches[1] } : {}) } } : {}),
          ...(allergenTokens.length ? { allergens: allergenTokens.join(' ') } : {})
        });
      }
    }
  }
  if (daysFound.length === 0) return [];
  const uniqueDays = [];
  const seenDates = new Set();
  for (const d of daysFound) {
    if (!seenDates.has(d.date)) {
      seenDates.add(d.date);
      uniqueDays.push(d);
    }
  }
  uniqueDays.sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  for (let i = 0; i < uniqueDays.length; i += 5) {
    const chunk = uniqueDays.slice(i, i + 5);
    const first = chunk[0].date.slice(5).replace('-', '/');
    const last = chunk[chunk.length - 1].date.slice(5).replace('-', '/');
    weeks.push({ weekRange: `${first} - ${last}`, days: chunk });
  }
  return weeks;
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
          const dm = line.match(/^(\d{1,2}(?:日|[\/月]\d{1,2}日?))/);
          if (dm && line.length > dm[1].length + 2) {
            items.push({ dateLabel: dm[1], menuText: line.slice(dm[1].length).trim() });
          }
        }
        resolve({ isTextExtracted: items.length > 0, textsCount: tokens.length, items });
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
    const articles = Array.isArray(newsFeed) ? newsFeed : (newsFeed.items || []);
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
            const extractedMenus = parseWeeklyMenuTable(parsed.pages, baseline.meta.fiscalYear || 2026);
            if (extractedMenus.length > 0) {
              weeklyMenus = extractedMenus;
              isTextExtracted = true;
              console.log(` -> 表解析成功: ${extractedMenus.length}週分のメニューを抽出`);
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
        articleDate: studentArticle?.date || baseline.meta.articleDate,
        articleUrl: studentArticleUrl || baseline.meta.articleUrl,
        sourcePdfUrl: sourcePdfUrl || baseline.meta.sourcePdfUrl,
        dormitoryArticleUrl: dormitoryArticleUrl || baseline.meta.dormitoryArticleUrl,
        dormitoryPdfUrl: dormitoryPdfUrl || baseline.meta.dormitoryPdfUrl,
        isTextExtracted,
        month: baseline.meta.month || 11,
        fiscalYear: baseline.meta.fiscalYear || 2026,
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
