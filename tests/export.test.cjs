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
