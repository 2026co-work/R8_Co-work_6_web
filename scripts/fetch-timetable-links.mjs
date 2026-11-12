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

// 対象ページの設定
const TARGET_PAGES = [
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

// HTMLからPDFリンクを抽出するヘルパー関数（外部依存ライブラリ不要）
function extractPdfLinks(html, baseUrl) {
  const pdfLinks = [];
  // <a ... href="...pdf" ...>text</a> のパターンにマッチ
  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    // HTMLタグを除去してテキストのみを抽出
    const rawText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    
    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      
      // 重複チェック
      if (!pdfLinks.some(item => item.url === absoluteUrl)) {
        pdfLinks.push({
          title: rawText || path.basename(new URL(absoluteUrl).pathname),
          url: absoluteUrl,
          fileName: path.basename(new URL(absoluteUrl).pathname)
        });
      }
    } catch {
      // URL解析失敗時はスキップ
    }
  }

  return pdfLinks;
}

// ページのHTMLを取得
async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTPエラー (${response.status} ${response.statusText}): ${url}`);
  }

  // 明石高専のページがUTF-8かShift_JISか対応するため、arrayBuffer経由でデコード
  const buffer = await response.arrayBuffer();
  // まずUTF-8で試行、文字化けしそうな場合はShift_JIS fallback
  let text = new TextDecoder('utf-8').decode(buffer);
  if (text.includes('charset=Shift_JIS') || text.includes('charset=shift_jis')) {
    text = new TextDecoder('shift-jis').decode(buffer);
  }

  return text;
}

// PDFファイルをダウンロードする関数（--download 指定時）
async function downloadFile(fileUrl, destPath) {
  const res = await fetch(fileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    }
  });
  if (!res.ok) throw new Error(`ダウンロード失敗: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(arrayBuffer));
}

async function main() {
  const shouldDownload = process.argv.includes('--download');
  console.log('=== 明石高専 時間割PDF取得スクリプト ===');
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`);

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
        console.log(`    [${idx + 1}] ${l.title}`);
        console.log(`        URL: ${l.url}`);
      });

      // --download が指定された場合、PDFをローカルに保存
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
      console.error(`エラー発生 [${page.title}]:`, err.message);
      results.pages.push({
        id: page.id,
        title: page.title,
        sourceUrl: page.url,
        error: err.message,
        items: []
      });
    }
  }

  // 結果をJSONとして保存
  const outputDir = path.join(PROJECT_ROOT, 'dist-data');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'timetable-links.json');

  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✔ 取得完了！ JSONファイルを保存しました:`);
  console.log(`   ${outputPath}`);
}

main().catch(err => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
