const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../timetable-export.js'), 'utf8')
    .replace(/^import .*$/mg, '')
    .replace(/^export /mg, ''),
  context
);

const sampleLessons = [
  {
    id: 'lesson-1',
    dayOfWeek: 1, // 月曜
    period: 1,
    duration: 2, // 2コマ連続
    subjectName: '機械工学実習ⅠB/工作実習ⅠB',
    location: '工場・情2・情3',
    teacher: '加藤・大森',
    notes: ''
  },
  {
    id: 'lesson-2',
    dayOfWeek: 1, // 月曜
    period: 3,
    duration: 1,
    subjectName: '機械製図Ⅱ',
    location: 'M製図',
    teacher: '史',
    notes: ''
  },
  {
    id: 'lesson-3',
    dayOfWeek: 5, // 金曜
    period: 3,
    duration: 1,
    subjectName: '音楽-2',
    location: '福研',
    teacher: '(泉)',
    notes: '芸術選択科目'
  }
];

test('generateIcs generates valid RFC 5545 iCalendar content with TRANSP:OPAQUE', () => {
  const generateIcs = vm.runInContext('generateIcs', context);
  const ics = generateIcs(sampleLessons, '1年 M学科 1組');

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence rule');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Explicitly sets TRANSP:OPAQUE for Google Calendar busy status');
  assert.ok(ics.includes('SUMMARY:機械工学実習ⅠB/工作実習ⅠB'), 'Contains lesson subject');
  assert.ok(ics.includes('LOCATION:工場・情2・情3'), 'Contains room location');
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261005T090000'), 'Starts at 9:00 AM');
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261005T121000'), 'Ends at 12:10 PM for 2-period span');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('generateCsv normalizes 2-period classes into individual 1-period rows for script/DB processing', () => {
  const generateCsv = vm.runInContext('generateCsv', context);
  const csv = generateCsv(sampleLessons, '1年 M学科 1組');

  assert.ok(csv.startsWith('\uFEFF'), 'Includes UTF-8 BOM for Excel compatibility');
  assert.ok(csv.includes('曜日,時限,開始時間,終了時間,科目名,教室,担当教員,連続コマ,備考'));

  // 2コマ連続の「機械工学実習ⅠB」が1限と2限の2行に展開されていること
  assert.ok(csv.includes('月,1限,09:00,10:30,"機械工学実習ⅠB/工作実習ⅠB","工場・情2・情3","加藤・大森","2コマ連続 (1/2)",""'));
  assert.ok(csv.includes('月,2限,10:40,12:10,"機械工学実習ⅠB/工作実習ⅠB","工場・情2・情3","加藤・大森","2コマ連続 (2/2)",""'));
  assert.ok(csv.includes('金,3限,13:00,14:30,"音楽-2","福研","(泉)","1コマ","芸術選択科目"'));
});

test('generateText generates clean human-readable schedule lines', () => {
  const generateText = vm.runInContext('generateText', context);
  const text = generateText(sampleLessons, '1年 M学科 1組');

  assert.ok(text.includes('■ 明石高専 時間割'));
  assert.ok(text.includes('【月曜日】'));
  assert.ok(text.includes('1〜2限 (09:00-12:10) 機械工学実習ⅠB/工作実習ⅠB [工場・情2・情3] (加藤・大森)'));
  assert.ok(text.includes('【火曜日】\n  （授業なし）'));
  assert.ok(text.includes('【金曜日】'));
  assert.ok(text.includes('3限 (13:00-14:30) 音楽-2 [福研] ((泉))'));
});

test('generateCsv, generateText, and generateJson handle includeEmpty option properly', () => {
  const generateCsv = vm.runInContext('generateCsv', context);
  const generateText = vm.runInContext('generateText', context);
  const generateJson = vm.runInContext('generateJson', context);

  // CSV with empty periods
  const csvWithEmpty = generateCsv(sampleLessons, '1年 M学科 1組', { includeEmpty: true });
  assert.ok(csvWithEmpty.includes('月,4限,14:40,16:10,"（空き）"'), 'CSV includes empty period 4 on Monday');
  assert.ok(csvWithEmpty.includes('火,1限,09:00,10:30,"（空き）"'), 'CSV includes empty period 1 on Tuesday');

  // Text with empty periods
  const textWithEmpty = generateText(sampleLessons, '1年 M学科 1組', { includeEmpty: true });
  assert.ok(textWithEmpty.includes('4限 (14:40-16:10) （空き）'), 'Text includes empty 4th period');
  assert.ok(textWithEmpty.includes('1限 (09:00-10:30) （空き）'), 'Text includes empty 1st period on Tuesday');

  // JSON with empty periods
  const jsonWithEmptyStr = generateJson(sampleLessons, '1年 M学科 1組', '2026-09-24', { includeEmpty: true });
  const jsonWithEmpty = JSON.parse(jsonWithEmptyStr);
  const mondayP4 = jsonWithEmpty.lessons.find(l => l.dayOfWeek === 1 && l.period === 4);
  assert.ok(mondayP4, 'Monday period 4 exists in JSON');
  assert.equal(mondayP4.empty, true, 'Marked as empty');
  assert.equal(mondayP4.subjectName, '（空き）');
});
