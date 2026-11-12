const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../timetable-export.js'),'utf8').replace(/^import .*$/mg,'').replace(/^export /mg,''),context);

test('export fits both wide and tall schedules within one A4 landscape page without stretching',()=>{
  for (const [width,height] of [[2200,1572],[2200,3000],[3000,700]]) {
    const b=vm.runInContext(`fitOnPage(${width},${height})`,context);
    assert.ok(b.x >= 10-1e-9 && b.y >= 10-1e-9);
    assert.ok(b.x+b.width <= 287+1e-9 && b.y+b.height <= 200+1e-9);
    assert.ok(Math.abs(b.width/b.height-width/height)<1e-9);
  }
});

test('invalid export formats and canvas sizes fail before trying to download',async()=>{
  assert.throws(()=>vm.runInContext('fitOnPage(0,100)',context),/画像サイズ/);
  await assert.rejects(vm.runInContext("exportTimetable({},'zip','test')",context),/PDFまたはPNG/);
});

test('copy action in PDF rejects and does not download', async () => {
  await assert.rejects(
    vm.runInContext("exportTimetable({ remove: () => {} }, 'pdf', 'test', { action: 'copy' })", context),
    /PDFのクリップボードコピーには対応していません/
  );
});

test('copy action in text/json/csv uses clipboard and succeeds', async () => {
  context.navigator = { clipboard: { writeText: async () => {} } };
  const res = await vm.runInContext("exportTimetable({}, 'text', 'test', { action: 'copy', selectedLessons: [] })", context);
  assert.equal(res.success, true);
  assert.match(res.message, /クリップボードにコピー/);
});

test('A4 mode layout constraints avoid table stretching and bottom margin collapse', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
  assert.ok(
    css.includes('.size-paper.a4-mode .real-timetable{height:auto!important}'),
    'real-timetable in a4-mode must have height:auto to allow bottom margin whitespace'
  );
  assert.ok(
    !css.includes('.size-paper.a4-mode .real-timetable{height:100%!important'),
    'real-timetable in a4-mode must not force height:100%'
  );

  const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  assert.ok(
    appJs.includes('getMaxCellHeightForA4'),
    'app.js must provide getMaxCellHeightForA4 function'
  );
  assert.ok(
    appJs.includes('a4Mode: a4ModeEnabled'),
    'downloadCurrentTimetable must pass a4Mode option to exportTimetable'
  );
});
