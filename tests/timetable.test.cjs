const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../timetable-standalone.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function logic() {
  const context = vm.createContext({});
  vm.runInContext(script.split('// ===== UI =====')[0], context);
  return expression => vm.runInContext(expression, context);
}

test('standalone page has valid inline JS and no external script or stylesheet', () => {
  new vm.Script(script);
  assert.equal(/<script[^>]+src=/.test(html), false);
  assert.equal(/<link[^>]+rel=["']stylesheet/.test(html), false);
});

test('all 124 actual student selections have valid, non-overlapping 5 × 4 timetables', () => {
  const run = logic();
  let count = 0;
  for (let grade = 1; grade <= 5; grade++) {
    for (const department of ['M', 'E', 'C', 'A']) {
      for (const classGroup of grade <= 2 ? ['1', '2', '3', '4'] : [undefined]) {
        for (const course of grade >= 4 && department === 'E' ? ['ED', 'EJ'] : [undefined]) {
          for (const studentType of ['regular', 'international']) {
            for (const arts of grade === 1 ? ['music', 'art'] : ['music']) {
              const selection = { grade, department, classGroup, course, studentType, arts };
              const result = run(`generateTimetable(LESSONS, ${JSON.stringify(selection)})`);
              assert.equal(result.grid.length, 5);
              assert.ok(result.grid.every(day => day.length === 4));
              assert.ok(result.selected.length >= 10);
              assert.equal(result.conflicts, 0, JSON.stringify(selection));
              for (const lesson of result.selected) {
                assert.equal(lesson.grade, grade);
                assert.equal(lesson.targetGroup, lesson.targetType === 'class' ? classGroup : department);
                if (grade >= 3) assert.equal(lesson.targetType, 'department');
              }
              count++;
            }
          }
        }
      }
    }
  }
  assert.equal(count, 124);
});

test('changing a lower-grade class keeps department subjects and replaces only class subjects', () => {
  const run = logic();
  const first = run("generateTimetable(LESSONS, {grade:1,department:'E',classGroup:'1'})");
  const second = run("generateTimetable(LESSONS, {grade:1,department:'E',classGroup:'2'})");
  const ids = (result, type) => Array.from(result.selected.filter(l => l.targetType === type), l => l.id);
  assert.deepEqual(ids(first, 'department'), ids(second, 'department'));
  assert.notDeepEqual(ids(first, 'class'), ids(second, 'class'));
});

test('all lesson IDs are unique and schema fields exist', () => {
  const data = logic()('LESSONS');
  assert.equal(new Set(data.map(l => l.id)).size, data.length);
  const fields = ['id','grade','teacher','subjectName','location','dayOfWeek','period','notes','targetType','targetGroup','changeInfo'];
  assert.ok(data.every(lesson => fields.every(field => Object.hasOwn(lesson, field))));
});

test('overlapping class and department lessons are retained and reported', () => {
  const run = logic();
  const result = run(`generateTimetable([
    {id:'class',grade:1,targetType:'class',targetGroup:'1',dayOfWeek:1,period:1},
    {id:'dept',grade:1,targetType:'department',targetGroup:'M',dayOfWeek:1,period:1}
  ], {grade:1,department:'M',classGroup:'1'})`);
  assert.equal(result.grid[0][0].length, 2);
  assert.equal(result.conflicts, 1);
});

test('class is mandatory only in lower grades; malformed time ranges are rejected', () => {
  const run = logic();
  assert.throws(() => run("generateTimetable(LESSONS,{grade:2,department:'M'})"), /クラス/);
  assert.doesNotThrow(() => run("generateTimetable(LESSONS,{grade:3,department:'M'})"));
  assert.throws(() => run("generateTimetable(LESSONS,{grade:6,department:'M'})"), /学年/);
  assert.throws(() => run("generateTimetable(LESSONS,{grade:1,department:'X',classGroup:'1'})"), /学科/);
  assert.throws(() => run("generateTimetable([{id:'bad',grade:3,targetType:'department',targetGroup:'M',dayOfWeek:1,period:4,duration:2}],{grade:3,department:'M'})"), /曜日・時限/);
});

function timetable(selection) {
  return logic()(`generateTimetable(LESSONS, ${JSON.stringify(selection)})`).grid;
}
const subject = (grid, day, period) => grid[day - 1][period - 1][0]?.subjectName;

test('lower grade selection combines the class row with independent double-bordered department cells', () => {
  const grid = timetable({ grade: 1, department: 'M', classGroup: '2' });
  assert.equal(subject(grid, 1, 1), '機械工学実習ⅠB/工作実習ⅠB');
  assert.equal(grid[0][0][0].id, grid[0][1][0].id);
  assert.equal(subject(grid, 1, 3), '機械製図Ⅱ');
  assert.equal(subject(grid, 1, 4), undefined);
  assert.equal(subject(grid, 2, 1), '英語ⅠＢ-2');
  assert.equal(subject(grid, 2, 2), 'データサイエンス演習');
  assert.equal(subject(grid, 3, 3), '機械設計Ⅰ');
  assert.equal(grid[2][3][0].teacher, '（主）黒杭 （副）アセド');
});

test('second-year E specialist subjects remain on Monday period 3 and Friday periods 3–4', () => {
  const grid = timetable({ grade: 2, department: 'E', classGroup: '1' });
  assert.equal(subject(grid, 1, 1), '英語ⅡA-2');
  assert.equal(subject(grid, 1, 3), 'ディジタル回路 Ｂ');
  assert.equal(subject(grid, 2, 1), '情報セキュリティ');
  assert.equal(subject(grid, 4, 3), 'Co+workⅠB');
  assert.equal(subject(grid, 5, 3), '電気情報工学実験Ⅱ');
  assert.equal(grid[4][2][0].id, grid[4][3][0].id);
  const architecture = timetable({ grade: 2, department: 'A', classGroup: '1' });
  assert.equal(subject(architecture, 2, 1), undefined);
  assert.equal(subject(architecture, 2, 2), '建築構造力学ⅠB');
});

test('vertically merged common subjects are not interpreted as multiple periods', () => {
  for (const department of ['M', 'E', 'C', 'A']) {
    const grid = timetable({ grade: 3, department });
    assert.equal(subject(grid, 4, 3), 'Co+workⅡB');
    assert.equal(grid[3][2][0].duration, 1);
  }
  const grid = timetable({ grade: 3, department: 'C' });
  assert.equal(subject(grid, 3, 1), '工学実験Ⅰ');
  assert.equal(grid[2][0][0].id, grid[2][1][0].id);
  assert.equal(subject(grid, 4, 1), '保健体育Ⅲ-2');
});

test('ED and EJ course-specific subjects and common subjects follow the original rows', () => {
  const ed = timetable({ grade: 4, department: 'E', course: 'ED' });
  const ej = timetable({ grade: 4, department: 'E', course: 'EJ' });
  assert.equal(subject(ed, 1, 1), undefined);
  assert.equal(subject(ej, 1, 1), 'データ構造とアルゴリズム');
  assert.equal(subject(ed, 2, 1), '固体物性B');
  assert.equal(subject(ej, 2, 1), 'オペレーティングシステム');
  assert.equal(subject(ed, 2, 3), '離散数学B');
  assert.equal(subject(ej, 2, 3), '離散数学B');
  assert.equal(subject(ed, 5, 1), '電気電子工学実験ⅠB');
  assert.equal(subject(ej, 5, 1), '情報工学実験ⅠB');
  assert.equal(subject(ej, 5, 4), 'プログラミングⅢB');
  assert.equal(subject(ed, 5, 4), undefined);
});

test('third-year international student rows replace the regular-only subjects', () => {
  const grid = timetable({ grade: 3, department: 'M', studentType: 'international' });
  assert.equal(subject(grid, 1, 2), '日本語Ⅲ-2');
  assert.equal(subject(grid, 2, 2), undefined);
  assert.equal(subject(grid, 5, 4), '日本語総合演習Ⅱ');
  const regular = timetable({ grade: 3, department: 'M', studentType: 'regular' });
  assert.equal(subject(regular, 1, 2), '国語ⅢＡ');
  assert.equal(subject(regular, 2, 2), '政治学-2');
  assert.equal(subject(regular, 5, 4), undefined);
});

test('first-year arts choice applies to both classes in the merged original cell', () => {
  for (const classGroup of ['1', '2', '3', '4']) {
    const period = Number(classGroup) <= 2 ? 3 : 2;
    const grid = timetable({ grade: 1, department: 'E', classGroup, arts: 'art' });
    assert.equal(subject(grid, 5, period), '美術-2');
    assert.equal(grid.flat().flat().some(lesson => lesson.subjectName === '音楽-2'), false);
  }
});

test('fifth-year course and merged cross-department subjects are included', () => {
  const ed = timetable({ grade: 5, department: 'E', course: 'ED' });
  const ej = timetable({ grade: 5, department: 'E', course: 'EJ' });
  assert.equal(subject(ed, 4, 1), 'パワーエレクトロニクス');
  assert.equal(subject(ej, 4, 1), '情報ネットワーク応用');
  assert.equal(subject(ej, 4, 3), 'コンパイラ');
  assert.equal(subject(ed, 4, 4), 'エネルギー伝送工学');
  assert.equal(subject(ej, 2, 2), 'Advanced English Ⅳ');
  assert.equal(subject(ej, 3, 4), '生物物理化学');
  assert.throws(() => timetable({ grade: 4, department: 'E' }), /ED・EJ/);
});

test('every PDF source cell is mapped to lessons without spanning into another day', () => {
  const run = logic();
  const cells = run('SOURCE_CELLS');
  const data = run('LESSONS');
  assert.equal(cells.length, 291);
  for (const cell of cells) {
    assert.ok(data.some(lesson => lesson.sourceCellId === cell.id));
    assert.equal(Math.floor(cell.columnStart / 4), Math.floor(cell.columnEnd / 4));
    assert.ok(cell.rowStart <= cell.rowEnd);
  }
  assert.ok(data.every(lesson => lesson.subjectName && lesson.teacher && lesson.sourceText));
  assert.equal(data.some(lesson => lesson.teacher.includes('学科担当') || /教室$/.test(lesson.location)), false);
});

// DOMの最小限の代替で、選択変更イベントから表の再描画までを実行する。
function page() {
  class Element {
    constructor() { this.children = []; this.listeners = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  Object.entries({grade:'1',department:'M','class-group':'1',course:'','student-type':'regular',arts:'music'}).forEach(([id,value]) => { elements[id].value = value; });
  const context = vm.createContext({ document: { getElementById: id => elements[id], createElement: () => new Element() } });
  vm.runInContext(script, context);
  const change = values => {
    Object.entries(values).forEach(([id,value]) => { elements[id].value = value; });
    elements['selection-form'].listeners.change();
  };
  const text = el => el.textContent + el.children.map(text).join('');
  return { elements, change, text };
}

test('UI requires a named ED/EJ course and never leaves an old timetable after an incomplete selection', () => {
  const { elements, change, text } = page();
  assert.equal(elements.course.disabled, true);
  assert.equal(elements['table-body'].children.length, 5);
  change({ grade: '4', department: 'E' });
  assert.equal(elements.course.disabled, false);
  assert.equal(elements.course.required, true);
  assert.equal(elements['class-group'].disabled, true);
  assert.equal(elements['table-body'].children.length, 0);
  assert.match(elements.feedback.textContent, /ED・EJ/);
  change({ course: 'EJ' });
  assert.match(elements['result-title'].textContent, /情報コース（EJ）/);
  assert.match(text(elements['table-body']), /データ構造とアルゴリズム/);
  change({ course: 'ED' });
  assert.match(elements['result-title'].textContent, /電気電子コース（ED）/);
  assert.doesNotMatch(text(elements['table-body']), /データ構造とアルゴリズム/);
  change({ department: 'M' });
  assert.equal(elements.course.disabled, true);
  assert.equal(elements.course.required, false);
  assert.match(elements['result-title'].textContent, /M学科/);
});

test('UI changes to international student rows immediately and explains shared schedules in other grades', () => {
  const { elements, change, text } = page();
  change({ grade: '3', department: 'M', 'student-type': 'international' });
  assert.match(elements['result-title'].textContent, /留学生/);
  assert.match(text(elements['table-body']), /日本語Ⅲ-2/);
  assert.doesNotMatch(text(elements['table-body']), /国語ⅢＡ/);
  change({ 'student-type': 'regular' });
  assert.match(text(elements['table-body']), /国語ⅢＡ/);
  assert.doesNotMatch(text(elements['table-body']), /日本語Ⅲ-2/);
  change({ grade: '5', 'student-type': 'international' });
  assert.match(elements['result-title'].textContent, /共通時間割/);
  assert.match(elements['student-help'].textContent, /留学生別の行がない/);
});

test('October 8 reference image specifies the common lecture room for 4M Friday period 2', () => {
  const grid = timetable({ grade: 4, department: 'M' });
  assert.equal(subject(grid, 5, 2), '電気電子工学Ⅰ');
  assert.equal(grid[4][1][0].location, '共通');
  assert.equal(grid[4][1][0].teacher, '岸本');
});
