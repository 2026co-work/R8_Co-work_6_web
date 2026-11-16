/**
 * 明石高専の時間割・定期試験ページからPDFリンクを取得してJSON化するスクリプト
 * 
 * 実行方法:
 *   node scripts/fetch-timetable-links.mjs
 *   node scripts/fetch-timetable-links.mjs --download  (PDFファイル自体もダウンロードする場合)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dist-data', 'timetable-links.json');
const FALLBACK_PATH = path.join(PROJECT_ROOT, 'scripts', 'fallbacks', 'timetable-links.json');

// 対象ページの設定
export const TARGET_PAGES = [
  {
    id: 'lesson',
    title: '授業時間割・授業時間',
    url: 'https://www.akashi.ac.jp/life/lesson.html'
  },
  {
    id: 'exam',
    title: '定期試験・試験時間割',
    url: 'https://www.akashi.ac.jp/life/examtimetable.html'
  }
];

export function enrichLinkMetadata(link) {
  if (!link) return link;
  const rawText = link.title || '';
  const fileName = link.fileName || '';
  
  if (!link.term) {
    link.term = (rawText.includes('前期') || fileName.toLowerCase().includes('zenki')) ? '前期'
              : (rawText.includes('後期') || fileName.toLowerCase().includes('kouki')) ? '後期' : null;
  }
  if (!link.fiscalYear) {
    let fiscalYear = 2026;
    const reiwaMatch = rawText.match(/令和(\d+)年/) || fileName.match(/R(\d+)/i);
    if (reiwaMatch) {
      fiscalYear = parseInt(reiwaMatch[1], 10) + 2018;
    } else {
      const westernYearMatch = rawText.match(/(20\d{2})年/) || fileName.match(/(20\d{2})/);
      if (westernYearMatch) {
        fiscalYear = parseInt(westernYearMatch[1], 10);
      }
    }
    link.fiscalYear = fiscalYear;
  }
  if (!link.updatedDate) {
    const kanjiDateMatch = rawText.match(/(?:(\d{4})年|令和(\d+)年)(\d{1,2})月(\d{1,2})日/);
    const numDateMatch = rawText.match(/（(\d{8})更新）/) || fileName.match(/(\d{8})/);
    if (kanjiDateMatch) {
      const y = kanjiDateMatch[1] ? kanjiDateMatch[1] : (parseInt(kanjiDateMatch[2], 10) + 2018).toString();
      const m = kanjiDateMatch[3].padStart(2, '0');
      const d = kanjiDateMatch[4].padStart(2, '0');
      link.updatedDate = `${y}-${m}-${d}`;
    } else if (numDateMatch) {
      const rawNum = numDateMatch[1];
      link.updatedDate = `${rawNum.slice(0, 4)}-${rawNum.slice(4, 6)}-${rawNum.slice(6, 8)}`;
    }
  }
  return link;
}

// HTMLからPDFリンクを抽出するヘルパー関数
export function extractPdfLinks(html, baseUrl) {
  const pdfLinks = [];
  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    
    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      const fileName = path.basename(new URL(absoluteUrl).pathname);
      
      if (!pdfLinks.some(item => item.url === absoluteUrl)) {
        const linkObj = enrichLinkMetadata({
          title: rawText || fileName,
          url: absoluteUrl,
          fileName
        });
        pdfLinks.push(linkObj);
      }
    } catch {
      // URL解析失敗時はスキップ
    }
  }

  return pdfLinks;
}

// ページのHTMLを取得
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

// PDFファイルをダウンロードする関数（--download 指定時）
export async function downloadFile(fileUrl, destPath, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fileUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    if (!res.ok) throw new Error(`ダウンロード失敗 (${res.status}): ${fileUrl}`);
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
  } finally {
    clearTimeout(timer);
  }
}

export async function runFetchTimetableLinks(options = {}) {
  const shouldDownload = options.download || process.argv.includes('--download');
  console.log('=== 明石高専 時間割PDF取得スクリプト ===');

  let previousData = null;
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
    previousData = JSON.parse(raw);
  } catch {
    try {
      const fallbackRaw = await fs.readFile(FALLBACK_PATH, 'utf-8');
      previousData = JSON.parse(fallbackRaw);
    } catch {
      // no previous data
    }
  }

  const results = {
    updatedAt: new Date().toISOString(),
    pages: []
  };

  for (const page of TARGET_PAGES) {
    console.log(`\n取得中: [${page.title}] ${page.url}`);
    try {
      const html = await fetchPage(page.url);
      const links = extractPdfLinks(html, page.url);
      
      console.log(` -> 検出されたPDFリンク: ${links.length} 件`);
      links.forEach((l, idx) => {
        console.log(`    [${idx + 1}] ${l.title} (${l.term || '学期不明'} / ${l.fiscalYear}年度 / 更新日: ${l.updatedDate || '不明'})`);
        console.log(`        URL: ${l.url}`);
      });

      if (shouldDownload && links.length > 0) {
        const downloadDir = path.join(PROJECT_ROOT, 'downloads', page.id);
        await fs.mkdir(downloadDir, { recursive: true });

        for (const link of links) {
          const dest = path.join(downloadDir, link.fileName);
          console.log(`    ダウンロード中: ${link.fileName} ...`);
          await downloadFile(link.url, dest);
          link.localPath = path.relative(PROJECT_ROOT, dest).replace(/\\/g, '/');
        }
      }

      results.pages.push({
        id: page.id,
        title: page.title,
        sourceUrl: page.url,
        items: links
      });
    } catch (err) {
      console.warn(`[WARN] 取得失敗 [${page.title}]: ${err.message}`);
      const prevPage = previousData?.pages?.find(p => p.id === page.id);
      if (prevPage && prevPage.items && prevPage.items.length > 0) {
        console.log(` -> 前回の有効データを保持・補完します (${prevPage.items.length} 件)`);
        const enrichedItems = prevPage.items.map(enrichLinkMetadata);
        results.pages.push({
          ...prevPage,
          items: enrichedItems
        });
      } else {
        results.pages.push({
          id: page.id,
          title: page.title,
          sourceUrl: page.url,
          items: []
        });
      }
    }
  }

  const totalItems = results.pages.reduce((acc, p) => acc + (p.items?.length || 0), 0);
  if (totalItems > 0) {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n✔ 取得完了！ JSONファイルを保存しました:`);
    console.log(`   ${OUTPUT_PATH}`);
  } else if (previousData) {
    console.warn('\n[WARN] 新規取得結果が0件のため、既存/フォールバックデータを保護します。');
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(previousData, null, 2), 'utf-8');
  }

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFetchTimetableLinks().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
  });
}
