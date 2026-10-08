const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function app() {
  const elements = Object.fromEntries(['main','breadcrumb','toast'].map(id=>[id,{textContent:'',innerHTML:'',hidden:true}]));
  const context = vm.createContext({
    Intl, Date, URLSearchParams, setTimeout:()=>1, clearTimeout:()=>{},
    document:{querySelectorAll:()=>[],getElementById:id=>elements[id]||null},
    location:{hash:'#home'},
    window:{addEventListener:()=>{}},
    localStorage:{getItem:()=>null,setItem:()=>{}},
  });
  const data = fs.readFileSync(require('node:path').join(__dirname,'../timetable-data.js'),'utf8').replace(/^export .*$/m,'');
  const source = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8').replace(/^import .*;\n/,'');
  vm.runInContext(data + '\n' + source,context);
  return code=>vm.runInContext(code,context);
}

test('overlapping reservations are rejected; adjacent intervals remain available',()=>{
  const run=app();
  run("reservations=[{id:'r1',room:'A101',date:'2026-10-03',start:'10:00',end:'11:00',purpose:'学習'}]");
  assert.equal(run("!!occupied('A101','2026-10-03','10:30','11:30')"),true);
  assert.equal(run("!!occupied('A101','2026-10-03','09:00','12:00')"),true);
  assert.equal(run("!!occupied('A101','2026-10-03','11:00','12:00')"),false);
  assert.equal(run("!!occupied('A101','2026-10-03','09:00','10:00')"),false);
  assert.equal(run("!!occupied('A102','2026-10-03','10:00','11:00')"),false);
  assert.equal(run("!!occupied('A101','2026-10-04','10:00','11:00')"),false);
});
test('regular lessons occupy rooms and weekends do not',()=>{
  const run=app();
  assert.equal(run("lessons('2026-10-03').length"),0);
  assert.equal(run("lessons('2026-10-04').length"),0);
  assert.equal(run("!!occupied('A101','2026-10-05','09:15','10:00')"),true);
  assert.equal(run("!!occupied('A101','2026-10-05','16:30','17:00')"),false);
});
test('cancelled lessons do not block rooms',()=>{
  const run=app();
  assert.equal(run("allLessons(today).some(l=>l.cancelled)"),false);
  assert.equal(run("allLessons(today).some(l=>l.period===3)"),false);
});
test('occupancy excludes the exact end time',()=>{
  const run=app();
  run("reservations=[{room:'A101',date:'2026-10-03',start:'10:00',end:'11:00'}]");
  assert.equal(run("!!atTime('A101','2026-10-03','10:00')"),true);
  assert.equal(run("!!atTime('A101','2026-10-03','11:00')"),false);
});
test('user text is escaped before appearing in HTML',()=>{
  const run=app();
  assert.equal(run('escapeHTML(\'<img src=x onerror="alert(1)">\')'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('failed persistence does not claim a successful registration',()=>{
  const run=app();
  run("localStorage.setItem=()=>{throw new Error('Quota exceeded')}");
  assert.equal(run("persist([{id:'new'}])"),false);
  assert.equal(run('reservations.length'),0);
});
test('invalid stored data does not break the dashboard',()=>{
  const run=app();
  run("localStorage.getItem=()=>'{invalid-json}'");
  assert.equal(run('readReservations().length'),0);
  run("localStorage.getItem=()=>'[null,{},42]'");
  assert.equal(run('readReservations().length'),0);
});

test('portal timetable renders the real EJ course and combines consecutive periods in its existing table layout',()=>{
  const run=app();
  run("studentSelection={grade:4,department:'E',classGroup:'1',course:'EJ',studentType:'regular',arts:'music'}");
  const html=run('timetable()');
  assert.match(html,/情報コース（EJ）/);
  assert.match(html,/データ構造とアルゴリズム/);
  assert.match(html,/情報工学実験ⅠB/);
  assert.match(html,/rowspan="2"/);
  assert.doesNotMatch(html,/電気電子工学実験ⅠB/);
  assert.match(run('home()'),/情報コース（EJ）/);
});

test('portal hides the timetable when E course is not selected and switches international student subjects',()=>{
  const run=app();
  run("studentSelection={grade:4,department:'E',course:'',studentType:'regular',arts:'music'}");
  assert.match(run('timetable()'),/ED・EJを選択/);
  assert.doesNotMatch(run('timetable()'),/<table/);
  assert.equal(run('todaysLessons().length'),0);
  run("studentSelection={grade:3,department:'M',studentType:'international'}");
  assert.match(run('timetable()'),/日本語Ⅲ-2/);
  assert.doesNotMatch(run('timetable()'),/国語ⅢＡ/);
  run("studentSelection.studentType='regular'");
  assert.match(run('timetable()'),/国語ⅢＡ/);
  assert.doesNotMatch(run('timetable()'),/日本語Ⅲ-2/);
});

test('portal data is identical to the previously verified standalone timetable data',()=>{
  const run=app();
  const source=fs.readFileSync(require('node:path').join(__dirname,'../timetable-standalone.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].split('// ===== UI =====')[0];
  const context=vm.createContext({});
  vm.runInContext(source,context);
  assert.equal(run('JSON.stringify(LESSONS)'),vm.runInContext('JSON.stringify(LESSONS)',context));
});
