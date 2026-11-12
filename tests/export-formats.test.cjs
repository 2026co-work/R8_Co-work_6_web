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
    duration: 2,
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

test('generateIcs generates valid RFC 5545 iCalendar content with recurrence', () => {
  const generateIcs = vm.runInContext('generateIcs', context);
  const ics = generateIcs(sampleLessons, '1年 M学科 1組');

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence rule');
  assert.ok(ics.includes('SUMMARY:機械工学実習ⅠB/工作実習ⅠB'), 'Contains lesson subject');
  assert.ok(ics.includes('LOCATION:工場・情2・情3'), 'Contains room location');
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261005T090000'), 'Starts at 9:00 AM');
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261005T121000'), 'Ends at 12:10 PM for 2-period span');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('generateCsv generates BOM-prefixed UTF-8 CSV with proper columns and escaping', () => {
  const generateCsv = vm.runInContext('generateCsv', context);
  const csv = generateCsv(sampleLessons, '1年 M学科 1組');

  assert.ok(csv.startsWith('\uFEFF'), 'Includes UTF-8 BOM for Excel compatibility');
  assert.ok(csv.includes('曜日,開始時限,終了時限,時間,科目名,教室,担当教員,コマ数,備考'));
  assert.ok(csv.includes('月,1限,2限,9:00 - 12:10,"機械工学実習ⅠB/工作実習ⅠB","工場・情2・情3","加藤・大森",2コマ,""'));
  assert.ok(csv.includes('金,3限,3限,13:00 - 14:30,"音楽-2","福研","(泉)",1コマ,"芸術選択科目"'));
});

test('generateText generates clean human-readable schedule lines', () => {
  const generateText = vm.runInContext('generateText', context);
  const text = generateText(sampleLessons, '1年 M学科 1組');

  assert.ok(text.includes('■ 明石高専 時間割'));
  assert.ok(text.includes('【月曜日】'));
  assert.ok(text.includes('1〜2限 (9:00-12:10) 機械工学実習ⅠB/工作実習ⅠB [工場・情2・情3] (加藤・大森)'));
  assert.ok(text.includes('【火曜日】\n  （授業なし）'));
  assert.ok(text.includes('【金曜日】'));
  assert.ok(text.includes('3限 (13:00-14:30) 音楽-2 [福研] ((泉))'));
});
