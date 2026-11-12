import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTimetable } from '../timetable-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../dist-data/lessons.json');

const lessons = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('=== 生成された lessons.json と既存UI描画エンジンの結合テスト ===');

const selection = {
  grade: 1,
  department: 'M',
  classGroup: '1',
  studentType: 'regular',
  course: '',
  arts: 'music'
};

const result = generateTimetable(lessons, selection);
console.log(`選択条件: 1年 M学科 1組 音楽選択`);
console.log(`該当授業数: ${result.selected.length} コマ`);
console.log(`衝突（重複）: ${result.conflicts} 件`);

const DAYS = ['月', '火', '水', '木', '金'];
DAYS.forEach((day, dIdx) => {
  console.log(`\n[${day}曜日]`);
  result.grid[dIdx].forEach((slot, pIdx) => {
    const desc = slot.map(l => `${l.subjectName} [${l.location || '教室未定'}] (${l.teacher})`).join(' / ');
    console.log(`  ${pIdx + 1}限: ${desc || '空き'}`);
  });
});
