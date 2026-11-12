/**
 * 時間割PDF（または解析済みJSON）からWebアプリ互換の「LESSONS形式（正規化オブジェクト）」を生成するスクリプト
 * 
 * メタ情報（取得日時、ソース情報、タイトル）＋ 授業一覧（lessons）の完全なJSONを出力します。
 * 
 * 実行方法:
 *   node scripts/convert-to-lessons.mjs
 *   node scripts/convert-to-lessons.mjs sources/R8_koukijikanwari_20260924-2.pdf
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_PDF = path.join(PROJECT_ROOT, 'sources', 'R8_koukijikanwari_20260924-2.pdf');

const DAYS = ['月', '火', '水', '木', '金'];
const DAY_TO_NUMBER = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5 };

// X座標の範囲（20コマ: 月1〜金4）
const COL_BOUNDS = [
  { day: '月', period: 1, minX: 8.5, maxX: 14.0 },
  { day: '月', period: 2, minX: 14.0, maxX: 19.5 },
  { day: '月', period: 3, minX: 19.5, maxX: 25.0 },
  { day: '月', period: 4, minX: 25.0, maxX: 30.5 },
  { day: '火', period: 1, minX: 30.5, maxX: 36.2 },
  { day: '火', period: 2, minX: 36.2, maxX: 42.0 },
  { day: '火', period: 3, minX: 42.0, maxX: 47.7 },
  { day: '火', period: 4, minX: 47.7, maxX: 53.0 },
  { day: '水', period: 1, minX: 53.0, maxX: 58.5 },
  { day: '水', period: 2, minX: 58.5, maxX: 63.8 },
  { day: '水', period: 3, minX: 63.8, maxX: 70.0 },
  { day: '水', period: 4, minX: 70.0, maxX: 79.0 },
  { day: '木', period: 1, minX: 79.0, maxX: 85.5 },
  { day: '木', period: 2, minX: 85.5, maxX: 91.0 },
  { day: '木', period: 3, minX: 91.0, maxX: 96.5 },
  { day: '木', period: 4, minX: 96.5, maxX: 102.0 },
  { day: '金', period: 1, minX: 102.0, maxX: 107.5 },
  { day: '金', period: 2, minX: 107.5, maxX: 112.5 },
  { day: '金', period: 3, minX: 112.5, maxX: 118.0 },
  { day: '金', period: 4, minX: 118.0, maxX: 125.0 }
];

// Y座標の範囲（学年・学科・組）
const ROW_BOUNDS = [
  { grade: 1, target: '1M', label: '1年 機械工学科 (1組)', minY: 7.5, maxY: 10.4 },
  { grade: 1, target: '1E', label: '1年 電気情報工学科 (2組)', minY: 10.4, maxY: 13.3 },
  { grade: 1, target: '1C', label: '1年 都市システム工学科 (3組)', minY: 13.3, maxY: 16.2 },
  { grade: 1, target: '1A', label: '1年 建築学科 (4組)', minY: 16.2, maxY: 19.0 },
  { grade: 2, target: '2M', label: '2年 機械工学科 (1組)', minY: 19.0, maxY: 21.5 },
  { grade: 2, target: '2E', label: '2年 電気情報工学科 (2組)', minY: 21.5, maxY: 24.0 },
  { grade: 2, target: '2C', label: '2年 都市システム工学科 (3組)', minY: 24.0, maxY: 26.5 },
  { grade: 2, target: '2A', label: '2年 建築学科 (4組)', minY: 26.5, maxY: 29.0 },
  { grade: 3, target: '3M', label: '3年 機械工学科', minY: 29.0, maxY: 31.5 },
  { grade: 3, target: '3M_intl', label: '3年 機械工学科 (留学生)', minY: 31.5, maxY: 34.0 },
  { grade: 3, target: '3E', label: '3年 電気情報工学科', minY: 34.0, maxY: 36.5 },
  { grade: 3, target: '3E_intl', label: '3年 電気情報工学科 (留学生)', minY: 36.5, maxY: 39.0 },
  { grade: 3, target: '3C', label: '3年 都市システム工学科', minY: 39.0, maxY: 41.5 },
  { grade: 3, target: '3C_intl', label: '3年 都市システム工学科 (留学生)', minY: 41.5, maxY: 44.0 },
  { grade: 3, target: '3A', label: '3年 建築学科', minY: 44.0, maxY: 46.5 },
  { grade: 3, target: '3A_intl', label: '3年 建築学科 (留学生)', minY: 46.5, maxY: 49.0 },
  { grade: 4, target: '4M', label: '4年 機械工学科', minY: 49.0, maxY: 51.5 },
  { grade: 4, target: '4ED', label: '4年 電気電子コース (ED)', minY: 51.5, maxY: 54.0 },
  { grade: 4, target: '4EJ', label: '4年 情報コース (EJ)', minY: 54.0, maxY: 56.5 },
  { grade: 4, target: '4C', label: '4年 都市システム工学科', minY: 56.5, maxY: 59.0 },
  { grade: 4, target: '4A', label: '4年 建築学科', minY: 59.0, maxY: 61.5 },
  { grade: 5, target: '5M', label: '5年 機械工学科', minY: 61.5, maxY: 64.0 },
  { grade: 5, target: '5ED', label: '5年 電気電子コース (ED)', minY: 64.0, maxY: 66.5 },
  { grade: 5, target: '5EJ', label: '5年 情報コース (EJ)', minY: 66.5, maxY: 69.0 },
  { grade: 5, target: '5C', label: '5年 都市システム工学科', minY: 69.0, maxY: 71.5 },
  { grade: 5, target: '5A', label: '5年 建築学科', minY: 71.5, maxY: 74.5 }
];

function isDepartmentCell(grade, column) {
  if (grade === 1) return column <= 3 || column === 10;
  if (grade === 2) return column === 2 || (column >= 4 && column <= 7) || column >= 18;
  return true;
}

function parseSourceText(text) {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
  const unwrap = value => value.replace(/([A-Za-z])\n(?=[A-Za-z])/g, '$1 ').replace(/\n/g, '').trim();
  const locationMatch = text.match(/[［\[]([^］\]]+)[］\]]/);
  
  if (locationMatch) {
    return {
      subjectName: unwrap(text.slice(0, locationMatch.index)),
      location: locationMatch[1],
      teacher: text.slice(locationMatch.index + locationMatch[0].length).replace(/\n/g, '').trim()
    };
  }
  if (lines[0] === 'HR') {
    return {
      subjectName: 'HR',
      location: '',
      teacher: lines.slice(1).join(' ')
    };
  }
  return {
    subjectName: unwrap(lines.slice(0, -1).join('\n')),
    location: '',
    teacher: lines.at(-1) || ''
  };
}

function sourceTargets(rowInfo, column) {
  const grade = rowInfo.grade;
  const target = rowInfo.target;

  if (grade <= 2) {
    const dept = target.replace(/[0-9]/g, '');
    const groupMap = { 'M': '1', 'E': '2', 'C': '3', 'A': '4' };
    const group = groupMap[dept] || '1';
    const isDept = isDepartmentCell(grade, column);
    return [{
      grade,
      targetType: isDept ? 'department' : 'class',
      targetGroup: isDept ? dept : group
    }];
  }

  if (grade === 3) {
    const isIntl = target.includes('_intl');
    const dept = target.replace(/3|_intl/g, '');
    return [{
      grade: 3,
      targetType: 'department',
      targetGroup: dept,
      studentType: isIntl ? 'international' : 'regular'
    }];
  }

  if (grade === 4 || grade === 5) {
    const rawTarget = target.replace(/[0-9]/g, '');
    const isE = rawTarget.startsWith('E');
    return [{
      grade,
      targetType: 'department',
      targetGroup: isE ? 'E' : rawTarget,
      ...(isE ? { course: rawTarget } : {})
    }];
  }

  return [];
}

async function extractGridFromPdf(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", err => reject(err.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      try {
        const page = pdfData.Pages[0];
        const rawItems = page.Texts.map(t => ({
          x: t.x,
          y: t.y,
          w: t.w,
          text: decodeURIComponent(t.R[0].T).trim()
        })).filter(i => i.text.length > 0);

        const titleItem = rawItems.find(i => i.text.includes('時間割'));
        const title = titleItem ? titleItem.text : '明石高専 授業時間割表';

        const cells = [];

        for (const row of ROW_BOUNDS) {
          for (let colIdx = 0; colIdx < COL_BOUNDS.length; colIdx++) {
            const col = COL_BOUNDS[colIdx];
            const matchingTexts = rawItems.filter(i => 
              i.x >= col.minX && i.x < col.maxX &&
              i.y >= row.minY && i.y < row.maxY
            );

            if (matchingTexts.length > 0) {
              matchingTexts.sort((a, b) => a.y - b.y || a.x - b.x);
              const cellText = matchingTexts.map(t => t.text).join('\n');
              cells.push({
                rowInfo: row,
                colIdx,
                dayOfWeek: DAY_TO_NUMBER[col.day],
                period: col.period,
                text: cellText
              });
            }
          }
        }

        resolve({ title, cells });
      } catch (e) {
        reject(e);
      }
    });
    pdfParser.loadPDF(pdfPath);
  });
}

/**
 * LESSONS形式の完全データ（meta + lessons）を生成
 */
export async function generateLessonsData(inputPath = DEFAULT_PDF, metadata = {}) {
  const fullPath = path.resolve(inputPath);
  console.log(`[LESSONS生成] 入力: ${fullPath}`);

  let title = metadata.title || '明石高専 授業時間割表';
  let cells = [];

  if (fullPath.endsWith('.json')) {
    const jsonStr = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(jsonStr);
    title = data.meta?.title || title;
    cells = (data.slots || []).map(s => {
      const colIdx = (DAY_TO_NUMBER[s.day] - 1) * 4 + (s.period - 1);
      const rowInfo = ROW_BOUNDS.find(r => r.target === s.target) || { grade: s.grade, target: s.target };
      return {
        rowInfo,
        colIdx,
        dayOfWeek: DAY_TO_NUMBER[s.day],
        period: s.period,
        text: s.raw || s.subject
      };
    });
  } else {
    const extracted = await extractGridFromPdf(fullPath);
    title = extracted.title;
    cells = extracted.cells;
  }

  const lessons = [];
  let idCounter = 0;

  for (const cell of cells) {
    const targets = sourceTargets(cell.rowInfo, cell.colIdx);
    if (targets.length === 0) continue;

    const rawText = cell.text;

    const artParts = rawText.includes('音楽-2') && rawText.includes('美術-2')
      ? [
          { text: rawText.split('美術-2')[0].trim(), arts: 'music' },
          { text: `美術-2${rawText.split('美術-2')[1]}`.trim(), arts: 'art' }
        ]
      : [{ text: rawText }];

    for (const target of targets) {
      for (const part of artParts) {
        const parsed = parseSourceText(part.text);

        lessons.push({
          id: `lesson-${idCounter++}`,
          ...target,
          ...parsed,
          dayOfWeek: cell.dayOfWeek,
          period: cell.period,
          duration: 1,
          notes: part.arts ? '芸術選択科目' : '',
          ...(part.arts ? { arts: part.arts } : {}),
          changeInfo: null,
          sourceText: part.text
        });
      }
    }
  }

  // 完全なJSONオブジェクト（メタデータ付き）
  return {
    meta: {
      title,
      sourceUrl: metadata.sourceUrl || 'https://www.akashi.ac.jp/life/lesson.html',
      sourceFile: path.basename(fullPath),
      fetchedAt: metadata.fetchedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalLessons: lessons.length
    },
    lessons
  };
}

async function main() {
  const inputArg = process.argv[2] || DEFAULT_PDF;
  try {
    const data = await generateLessonsData(inputArg);

    const outDir = path.join(PROJECT_ROOT, 'dist-data');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'timetable-lessons.json');

    await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`\n✔ 生成成功！`);
    console.log(`   タイトル: ${data.meta.title}`);
    console.log(`   取得日時 (fetchedAt): ${data.meta.fetchedAt}`);
    console.log(`   授業件数: ${data.meta.totalLessons} 件`);
    console.log(`   保存先: ${outPath}`);
  } catch (err) {
    console.error('エラー:', err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
