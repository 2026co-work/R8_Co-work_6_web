/**
 * 明石高専 時間割PDF解析スクリプト
 * 
 * PDFからテキストと座標を抽出し、曜日・時限・学年・学科にマッピングして
 * 扱いやすい独自設計のJSONを出力します。
 * 
 * 実行方法:
 *   node scripts/parse-pdf-timetable.mjs [PDFファイルのパス]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// デフォルトの対象PDFパス
const DEFAULT_PDF = path.join(PROJECT_ROOT, 'sources', 'R8_koukijikanwari_20260924-2.pdf');

// 曜日と時限の定義
const DAYS = ['月', '火', '水', '木', '金'];
const PERIODS = [
  { period: 1, time: '9:00-10:30' },
  { period: 2, time: '10:40-12:10' },
  { period: 3, time: '13:00-14:30' },
  { period: 4, time: '14:40-16:10' }
];

// X座標の範囲（20コマ: 月1〜金4）
// PDF解析結果のX座標ヘッダー位置に基づき境界値を設定
const COL_BOUNDS = [
  // 月曜 1〜4限
  { day: '月', period: 1, minX: 8.5, maxX: 14.0 },
  { day: '月', period: 2, minX: 14.0, maxX: 19.5 },
  { day: '月', period: 3, minX: 19.5, maxX: 25.0 },
  { day: '月', period: 4, minX: 25.0, maxX: 30.5 },
  // 火曜 1〜4限
  { day: '火', period: 1, minX: 30.5, maxX: 36.2 },
  { day: '火', period: 2, minX: 36.2, maxX: 42.0 },
  { day: '火', period: 3, minX: 42.0, maxX: 47.7 },
  { day: '火', period: 4, minX: 47.7, maxX: 53.0 },
  // 水曜 1〜4限
  { day: '水', period: 1, minX: 53.0, maxX: 58.5 },
  { day: '水', period: 2, minX: 58.5, maxX: 63.8 },
  { day: '水', period: 3, minX: 63.8, maxX: 70.0 },
  { day: '水', period: 4, minX: 70.0, maxX: 79.0 },
  // 木曜 1〜4限
  { day: '木', period: 1, minX: 79.0, maxX: 85.5 },
  { day: '木', period: 2, minX: 85.5, maxX: 91.0 },
  { day: '木', period: 3, minX: 91.0, maxX: 96.5 },
  { day: '木', period: 4, minX: 96.5, maxX: 102.0 },
  // 金曜 1〜4限
  { day: '金', period: 1, minX: 102.0, maxX: 107.5 },
  { day: '金', period: 2, minX: 107.5, maxX: 112.5 },
  { day: '金', period: 3, minX: 112.5, maxX: 118.0 },
  { day: '金', period: 4, minX: 118.0, maxX: 125.0 }
];

// Y座標の範囲（学年・学科・組）
const ROW_BOUNDS = [
  // 1年
  { grade: 1, target: '1M', label: '1年 機械工学科 (1組)', minY: 7.5, maxY: 10.4 },
  { grade: 1, target: '1E', label: '1年 電気情報工学科 (2組)', minY: 10.4, maxY: 13.3 },
  { grade: 1, target: '1C', label: '1年 都市システム工学科 (3組)', minY: 13.3, maxY: 16.2 },
  { grade: 1, target: '1A', label: '1年 建築学科 (4組)', minY: 16.2, maxY: 19.0 },
  // 2年
  { grade: 2, target: '2M', label: '2年 機械工学科 (1組)', minY: 19.0, maxY: 21.5 },
  { grade: 2, target: '2E', label: '2年 電気情報工学科 (2組)', minY: 21.5, maxY: 24.0 },
  { grade: 2, target: '2C', label: '2年 都市システム工学科 (3組)', minY: 24.0, maxY: 26.5 },
  { grade: 2, target: '2A', label: '2年 建築学科 (4組)', minY: 26.5, maxY: 29.0 },
  // 3年（通常・留学生）
  { grade: 3, target: '3M', label: '3年 機械工学科', minY: 29.0, maxY: 31.5 },
  { grade: 3, target: '3M_intl', label: '3年 機械工学科 (留学生)', minY: 31.5, maxY: 34.0 },
  { grade: 3, target: '3E', label: '3年 電気情報工学科', minY: 34.0, maxY: 36.5 },
  { grade: 3, target: '3E_intl', label: '3年 電気情報工学科 (留学生)', minY: 36.5, maxY: 39.0 },
  { grade: 3, target: '3C', label: '3年 都市システム工学科', minY: 39.0, maxY: 41.5 },
  { grade: 3, target: '3C_intl', label: '3年 都市システム工学科 (留学生)', minY: 41.5, maxY: 44.0 },
  { grade: 3, target: '3A', label: '3年 建築学科', minY: 44.0, maxY: 46.5 },
  { grade: 3, target: '3A_intl', label: '3年 建築学科 (留学生)', minY: 46.5, maxY: 49.0 },
  // 4年
  { grade: 4, target: '4M', label: '4年 機械工学科', minY: 49.0, maxY: 51.5 },
  { grade: 4, target: '4ED', label: '4年 電気電子コース (ED)', minY: 51.5, maxY: 54.0 },
  { grade: 4, target: '4EJ', label: '4年 情報コース (EJ)', minY: 54.0, maxY: 56.5 },
  { grade: 4, target: '4C', label: '4年 都市システム工学科', minY: 56.5, maxY: 59.0 },
  { grade: 4, target: '4A', label: '4年 建築学科', minY: 59.0, maxY: 61.5 },
  // 5年
  { grade: 5, target: '5M', label: '5年 機械工学科', minY: 61.5, maxY: 64.0 },
  { grade: 5, target: '5ED', label: '5年 電気電子コース (ED)', minY: 64.0, maxY: 66.5 },
  { grade: 5, target: '5EJ', label: '5年 情報コース (EJ)', minY: 66.5, maxY: 69.0 },
  { grade: 5, target: '5C', label: '5年 都市システム工学科', minY: 69.0, maxY: 71.5 },
  { grade: 5, target: '5A', label: '5年 建築学科', minY: 71.5, maxY: 74.5 },
  // 専攻科
  { grade: '専1', target: 'AC1_ME', label: '専攻科1年 機械・電子システム工学専攻', minY: 76.5, maxY: 79.0 },
  { grade: '専1', target: 'AC1_AC', label: '専攻科1年 建築・都市システム工学専攻', minY: 79.0, maxY: 81.5 },
  { grade: '専2', target: 'AC2_ME', label: '専攻科2年 機械・電子システム工学専攻', minY: 81.5, maxY: 84.0 },
  { grade: '専2', target: 'AC2_AC', label: '専攻科2年 建築・都市システム工学専攻', minY: 84.0, maxY: 86.0 }
];

// セル内テキストから「科目名」「教室」「教員」を分離するパーサー
function parseCellContent(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let room = null;
  let teachers = [];
  const subjectLines = [];

  for (const line of lines) {
    // [教室名] の抽出
    const roomMatch = line.match(/\[(.*?)\]/);
    if (roomMatch) {
      room = roomMatch[1];
    }

    // 教員名や部屋を除いた科目名の判定
    const cleanLine = line.replace(/\[.*?\]/g, '').trim();
    if (cleanLine) {
      subjectLines.push(cleanLine);
    }
  }

  const rawSubject = subjectLines.join(' ');

  return {
    raw: text,
    subject: rawSubject,
    room: room || undefined
  };
}

// PDF解析のメイン処理
export async function parseTimetablePdf(pdfFilePath) {
  const fullPath = path.resolve(pdfFilePath);
  console.log(`[PDF解析開始] ${fullPath}`);

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", async pdfData => {
      try {
        const page = pdfData.Pages[0];
        
        // 全テキスト要素のデコードと正規化
        const rawItems = page.Texts.map(t => ({
          x: t.x,
          y: t.y,
          w: t.w,
          text: decodeURIComponent(t.R[0].T).trim()
        })).filter(i => i.text.length > 0);

        // タイトルや脚注の抽出
        const titleItem = rawItems.find(i => i.text.includes('時間割'));
        const title = titleItem ? titleItem.text : '明石高専 授業時間割表';

        // 教室凡例の抽出 (y >= 86)
        const roomLegends = {};
        rawItems.filter(i => i.y >= 86).forEach(i => {
          const matches = i.text.matchAll(/\[(.*?)\](.*?)(?=\s*\[|$)/g);
          for (const m of matches) {
            roomLegends[m[1]] = m[2].trim();
          }
        });

        // グリッドセルの初期化 (row x col)
        // grid[rowTarget][day][period]
        const timetableMap = {};
        ROW_BOUNDS.forEach(row => {
          timetableMap[row.target] = {
            grade: row.grade,
            target: row.target,
            label: row.label,
            schedule: {
              '月': {}, '火': {}, '水': {}, '木': {}, '金': {}
            }
          };
          DAYS.forEach(day => {
            [1, 2, 3, 4].forEach(p => {
              timetableMap[row.target].schedule[day][p] = [];
            });
          });
        });

        // 各テキスト要素を適切なセル（行・列）に割り振る
        const cellItems = rawItems.filter(i => i.x >= 8.5 && i.y >= 7.5 && i.y < 86.0);

        for (const item of cellItems) {
          // 列（曜日・時限）の特定
          const col = COL_BOUNDS.find(c => item.x >= c.minX && item.x < c.maxX);
          // 行（学年・学科）の特定
          const row = ROW_BOUNDS.find(r => item.y >= r.minY && item.y < r.maxY);

          if (col && row) {
            timetableMap[row.target].schedule[col.day][col.period].push({
              x: item.x,
              y: item.y,
              text: item.text
            });
          }
        }

        // セルごとのテキストを統合・整形
        const flatCells = [];
        const structuredClasses = [];

        for (const row of ROW_BOUNDS) {
          const classData = timetableMap[row.target];
          const classSchedule = {};

          for (const day of DAYS) {
            classSchedule[day] = [];
            for (let p = 1; p <= 4; p++) {
              const texts = classData.schedule[day][p];
              if (texts.length > 0) {
                // y座標順、次いでx座標順にソートして自然な順序で結合
                texts.sort((a, b) => a.y - b.y || a.x - b.x);
                const fullText = texts.map(t => t.text).join('\n');
                const parsed = parseCellContent(fullText);

                const slot = {
                  period: p,
                  time: PERIODS[p - 1].time,
                  ...parsed
                };

                classSchedule[day].push(slot);

                flatCells.push({
                  grade: row.grade,
                  target: row.target,
                  classLabel: row.label,
                  day,
                  period: p,
                  time: PERIODS[p - 1].time,
                  ...parsed
                });
              }
            }
          }

          structuredClasses.push({
            grade: row.grade,
            target: row.target,
            label: row.label,
            schedule: classSchedule
          });
        }

        // 独自設計の最終JSONデータ
        const finalJson = {
          meta: {
            title,
            extractedAt: new Date().toISOString(),
            sourceFile: path.basename(fullPath),
            totalClasses: structuredClasses.length,
            totalSlots: flatCells.length
          },
          roomLegends,
          classes: structuredClasses,
          slots: flatCells
        };

        resolve(finalJson);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(fullPath);
  });
}

// CLI実行時
async function main() {
  const targetPdf = process.argv[2] || DEFAULT_PDF;
  try {
    const result = await parseTimetablePdf(targetPdf);
    
    // 保存先ディレクトリ
    const outDir = path.join(PROJECT_ROOT, 'dist-data');
    await fs.mkdir(outDir, { recursive: true });
    
    const outName = `${path.basename(targetPdf, '.pdf')}.json`;
    const outPath = path.join(outDir, outName);
    
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`\n✔ PDFの解析に成功しました！`);
    console.log(`   タイトル: ${result.meta.title}`);
    console.log(`   クラス数: ${result.meta.totalClasses} クラス`);
    console.log(`   授業コマ数: ${result.meta.totalSlots} コマ`);
    console.log(`   保存先: ${outPath}`);
  } catch (err) {
    console.error('エラー:', err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
