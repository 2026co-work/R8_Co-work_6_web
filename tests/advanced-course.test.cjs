const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadTimetableData() {
  const code = fs.readFileSync(path.join(__dirname, '../timetable-data.js'), 'utf8')
    .replace(/^export\s+.*$/mg, '') + '\nglobalThis.LESSONS = LESSONS; globalThis.generateTimetable = generateTimetable;';
  const ctx = vm.createContext({});
  vm.runInContext(code, ctx);
  return ctx;
}

function loadTimetableExport() {
  const code = fs.readFileSync(path.join(__dirname, '../timetable-export.js'), 'utf8')
    .replace(/^import\s+.*$/mg, '')
    .replace(/^export\s+/mg, '');
  const ctx = vm.createContext({});
  vm.runInContext(code, ctx);
  return ctx;
}

test('専攻科（専1・専2のME・AC）の時間割が正しく生成される', () => {
  const { LESSONS, generateTimetable } = loadTimetableData();

  const acConfigs = [
    { grade: 6, department: 'ME', expectedMinLessons: 10 },
    { grade: 6, department: 'AC', expectedMinLessons: 8 },
    { grade: 7, department: 'ME', expectedMinLessons: 8 },
    { grade: 7, department: 'AC', expectedMinLessons: 8 },
  ];

  for (const cfg of acConfigs) {
    const result = generateTimetable(LESSONS, {
      grade: cfg.grade,
      department: cfg.department,
      classGroup: '1',
      studentType: 'regular',
      course: '',
      arts: 'music'
    });
    assert.ok(result.selected.length >= cfg.expectedMinLessons, `専攻科 ${cfg.grade}年 ${cfg.department} のコマ数が不足: ${result.selected.length}`);
    assert.equal(result.conflicts, 0, `専攻科 ${cfg.grade}年 ${cfg.department} に重複があります`);
    const cellCount = result.grid.flat().filter(cell => cell.length > 0).length;
    assert.ok(cellCount >= cfg.expectedMinLessons);
  }
});

test('短縮表記バッジが専攻科に対応している', () => {
  const { formatStudentShortBadge } = loadTimetableExport();

  assert.equal(formatStudentShortBadge('専攻科1年 機械・電子システム工学専攻 (ME)'), '専1ME');
  assert.equal(formatStudentShortBadge('専攻科2年 建築・都市システム工学専攻 (AC)'), '専2AC');
});
