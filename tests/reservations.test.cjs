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
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),context);
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
