/**
 * scripts/build-data.mjs
 * 明石高専キャンパスポータル: マスターデータ取得・生成ランナー
 * 
 * すべてのスクレイパー・パーサーを隔離されたエラー境界（try/catch）で順次実行し、
 * ネットワーク不達やページ仕様変更時でも既存データまたはフォールバックを保護・維持します。
 * 
 * 実行方法:
 *   node scripts/build-data.mjs
 */

import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DATA_DIR = path.join(PROJECT_ROOT, 'dist-data');
const FALLBACKS_DIR = path.join(PROJECT_ROOT, 'scripts', 'fallbacks');

const TASKS = [
  {
    id: 'timetable-links',
    name: '時間割PDFリンク取得 (timetable-links)',
    script: 'scripts/fetch-timetable-links.mjs',
    outputFile: 'timetable-links.json',
    fallbackFile: 'timetable-links.json'
  },
  {
    id: 'calendar',
    name: '年間行事予定取得 (calendar)',
    script: 'scripts/fetch-calendar.mjs',
    outputFile: 'calendar.json',
    fallbackFile: 'calendar.json'
  },
  {
    id: 'exam',
    name: '定期試験日程取得 (exam)',
    script: 'scripts/fetch-exam.mjs',
    outputFile: 'exam.json',
    fallbackFile: 'exam.json'
  },
  {
    id: 'cafeteria',
    name: '食堂メニュー取得 (cafeteria)',
    script: 'scripts/fetch-cafeteria.mjs',
    outputFile: 'cafeteria.json',
    fallbackFile: 'cafeteria.json'
  },
  {
    id: 'lessons',
    name: '時間割LESSONSデータ生成 (convert-to-lessons)',
    script: 'scripts/convert-to-lessons.mjs',
    outputFile: 'timetable-lessons.json',
    fallbackFile: 'timetable-lessons.json'
  }
];

function runChildScript(scriptRelativePath, args = []) {
  return new Promise((resolve) => {
    const fullPath = path.join(PROJECT_ROOT, scriptRelativePath);
    const child = spawn(process.execPath, [fullPath, ...args], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.warn(`[WARN] プロセス実行エラー (${scriptRelativePath}):`, err.message);
      resolve(false);
    });
  });
}

export async function runBuildData() {
  console.log('====================================================');
  console.log('   明石高専キャンパスポータル マスターデータランナー');
  console.log(`   開始日時: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  // dist-data ディレクトリの確実な自動作成
  await fs.mkdir(DIST_DATA_DIR, { recursive: true });

  const summary = [];

  for (const task of TASKS) {
    console.log(`\n▶ [${task.id}] ${task.name} 実行中...`);
    const outputPath = path.join(DIST_DATA_DIR, task.outputFile);
    const fallbackPath = path.join(FALLBACKS_DIR, task.fallbackFile);

    let scriptSuccess = false;
    try {
      scriptSuccess = await runChildScript(task.script);
    } catch (err) {
      console.warn(`[WARN] タスク実行例外 [${task.id}]:`, err.message);
      scriptSuccess = false;
    }

    // 成果物の存在確認とフォールバック適用
    let fileValid = false;
    if (existsSync(outputPath)) {
      try {
        const content = readFileSync(outputPath, 'utf-8');
        JSON.parse(content);
        fileValid = true;
      } catch {
        console.warn(`[WARN] 出力ファイル破損検出: ${task.outputFile}`);
        fileValid = false;
      }
    }

    if (!fileValid) {
      if (existsSync(fallbackPath)) {
        console.log(` -> フォールバックデータを復元します: ${task.fallbackFile}`);
        const fallbackContent = readFileSync(fallbackPath, 'utf-8');
        await fs.writeFile(outputPath, fallbackContent, 'utf-8');
        fileValid = true;
      } else {
        console.error(`[ERROR] フォールバックデータも存在しません: ${task.fallbackFile}`);
      }
    }

    summary.push({
      id: task.id,
      name: task.name,
      scriptSuccess,
      fileValid,
      outputFile: task.outputFile
    });
  }

  // lessons.json と timetable-lessons.json の同期保証
  try {
    const timetableLessonsPath = path.join(DIST_DATA_DIR, 'timetable-lessons.json');
    const lessonsPath = path.join(DIST_DATA_DIR, 'lessons.json');
    if (existsSync(timetableLessonsPath)) {
      const data = JSON.parse(readFileSync(timetableLessonsPath, 'utf-8'));
      if (Array.isArray(data.lessons)) {
        await fs.writeFile(lessonsPath, JSON.stringify(data.lessons, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.warn('[WARN] lessons.json 同期中の軽微な警告:', err.message);
  }

  console.log('\n====================================================');
  console.log('              パイプライン実行サマリー');
  console.log('====================================================');
  let allHealthy = true;
  for (const s of summary) {
    const statusIcon = s.fileValid ? (s.scriptSuccess ? '✔ 成功 (最新)' : '▲ 成功 (フォールバック保持)') : '❌ 失敗 (ファイル無)';
    console.log(`  ${s.id.padEnd(18)}: ${statusIcon} -> dist-data/${s.outputFile}`);
    if (!s.fileValid) allHealthy = false;
  }
  console.log(`終了日時: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  if (!allHealthy) {
    console.error('一部の必須データファイルが生成できませんでした。');
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBuildData().catch((err) => {
    console.error('致命的ランナーエラー:', err);
    process.exit(1);
  });
}
