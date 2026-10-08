const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');

function app({cookie='',mobile=false,blocked=false,pathname='/campus/',protocol='https:'}={}) {
  let jar=cookie, lastCookie='';
  const elements={};
  let document;
  function element(id) {
    if(elements[id]) return elements[id];
    const classes=new Set();
    return elements[id]={id,textContent:'',innerHTML:'',hidden:false,inert:false,dataset:{},attrs:{},listeners:{},
      classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
      setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];},
      addEventListener(name,fn){this.listeners[name]=fn;},focus(){document.activeElement=this;},
      contains(el){return this===el || (id==='sidebar' && ['menu-close','brand','home','timetable'].includes(el?.id));},
      querySelectorAll(){return [element('brand'),element('home'),element('timetable')];}
    };
  }
  const media={matches:mobile,addEventListener(name,fn){this.change=fn;}};
  element('home').dataset.page='home';element('timetable').dataset.page='timetable';
  const grade=element('student-grade');grade.dataset.student='grade';grade.value='1';
  document={body:element('body'),activeElement:null,listeners:{},
    getElementById:element,
    querySelector:selector=>element(selector),
    querySelectorAll:selector=>selector==='[data-page]'?[element('home'),element('timetable')]:selector==='[data-student]'?[grade]:[],
    addEventListener(name,fn){this.listeners[name]=fn;}
  };
  Object.defineProperty(document,'cookie',{get:()=>jar,set:value=>{lastCookie=value;if(!blocked)jar=value.split(';')[0];}});
  const context=vm.createContext({Intl,Date,URLSearchParams,document,
    location:{hash:'#home',pathname,protocol},
    window:{listeners:{},matchMedia:()=>media,addEventListener(name,fn){this.listeners[name]=fn;},scrollTo(){}},
  });
  vm.runInContext(read('timetable-data.js').replace(/^export .*$/m,'')+'\n'+read('app.js').replace(/^import .*;\n/,''),context);
  return {run:code=>vm.runInContext(code,context),elements,document,media,cookie:()=>jar,attributes:()=>lastCookie};
}

test('selection is saved in a one-year cookie scoped to this Pages project and restored on a fresh visit',()=>{
  const first=app();
  first.run("studentSelection={grade:4,department:'E',classGroup:'2',course:'EJ',studentType:'international',arts:'art'}");
  assert.equal(first.run('saveSelectionCookie()'),true);
  assert.match(first.attributes(),/Path=\/campus\/; Max-Age=31536000; SameSite=Lax; Secure$/);
  const second=app({cookie:first.cookie()});
  assert.equal(second.run('studentSelection.grade'),4);
  assert.equal(second.run('studentSelection.department'),'E');
  assert.equal(second.run('studentSelection.course'),'EJ');
  assert.equal(second.run('studentSelection.classGroup'),'2');
  assert.equal(second.run('studentSelection.studentType'),'international');
  assert.equal(second.run('studentSelection.arts'),'art');
  assert.match(second.run('timetable()'),/情報コース（EJ）/);
});

test('malformed and invalid cookie values do not inject markup or crash startup',()=>{
  for(const cookie of ['campus-student-v1=%BAD','campus-student-v1='+encodeURIComponent('{broken'), 'campus-student-v1='+encodeURIComponent(JSON.stringify({version:1,grade:99,department:'<script>'}))]) {
    const instance=app({cookie});
    assert.equal(instance.run('studentSelection.grade'),1);
    assert.equal(instance.run('studentSelection.department'),'M');
  }
});

test('HTTP development cookie works without Secure; input change saves immediately',()=>{
  const instance=app({protocol:'http:',pathname:'/index.html'});
  const select=instance.elements['student-grade'];select.value='3';
  select.listeners.change({target:select});
  assert.equal(instance.run('studentSelection.grade'),3);
  assert.match(instance.attributes(),/Path=\/; Max-Age=/);
  assert.doesNotMatch(instance.attributes(),/Secure/);
  assert.equal(app({cookie:instance.cookie()}).run('studentSelection.grade'),3);
});

test('blocked cookies leave the current selection usable and display a save failure',()=>{
  const instance=app({blocked:true});
  const select=instance.elements['student-grade'];select.value='3';
  select.listeners.change({target:select});
  assert.equal(instance.run('studentSelection.grade'),3);
  assert.equal(instance.run('cookieSaved'),false);
  assert.match(instance.elements['.selection-status'].textContent,/保存できません/);
});

test('only home and timetable remain and removed routes fall back to the development home',()=>{
  const instance=app();
  assert.match(instance.run('home()'),/現在開発中/);
  const html=read('index.html');
  assert.deepEqual([...html.matchAll(/data-page="([^"]+)"/g)].map(m=>m[1]),['home','timetable']);
  for(const route of ['rooms','register','changes']) {
    instance.run(`location.hash='#${route}';render()`);
    assert.match(instance.elements.main.innerHTML,/現在開発中/);
  }
  assert.doesNotMatch(read('app.js'),/localStorage|reservation-form|function roomPage/);
});

test('mobile drawer opens, traps focus, closes via Escape/backdrop/navigation and resets on desktop',()=>{
  const instance=app({mobile:true});const {elements,document,media}=instance;
  assert.equal(elements.sidebar.inert,true);
  elements['menu-toggle'].listeners.click();
  assert.equal(elements['menu-toggle'].attrs['aria-expanded'],'true');
  assert.equal(elements['.workspace'].inert,true);
  assert.equal(elements['menu-overlay'].hidden,false);
  assert.equal(document.activeElement.id,'menu-close');
  document.listeners.keydown({key:'Tab',shiftKey:true,preventDefault(){}});
  assert.equal(document.activeElement.id,'timetable');
  document.listeners.keydown({key:'Escape',preventDefault(){}});
  assert.equal(elements.sidebar.inert,true);
  assert.equal(elements['.workspace'].inert,false);
  assert.equal(document.activeElement.id,'menu-toggle');
  elements['menu-toggle'].listeners.click();elements['menu-overlay'].listeners.click();
  assert.equal(elements['menu-overlay'].hidden,true);
  elements['menu-toggle'].listeners.click();elements.timetable.listeners.click();
  assert.equal(elements['menu-toggle'].attrs['aria-expanded'],'false');
  assert.equal(document.activeElement.id,'main');
  elements['menu-toggle'].listeners.click();media.matches=false;media.change();
  assert.equal(elements.sidebar.inert,false);
  assert.equal(elements.sidebar.attrs['aria-hidden'],undefined);
  assert.equal(elements['.workspace'].inert,false);
});

test('real timetable handles course selection, row spans and international subjects',()=>{
  const instance=app();const run=instance.run;
  run("studentSelection={grade:4,department:'E',classGroup:'1',course:'EJ',studentType:'regular',arts:'music'}");
  assert.match(run('timetable()'),/情報工学実験ⅠB/);
  assert.match(run('timetable()'),/rowspan="2"/);
  run("studentSelection.course=''");assert.doesNotMatch(run('timetable()'),/<table/);
  run("studentSelection={grade:3,department:'M',studentType:'international'}");
  assert.match(run('timetable()'),/日本語Ⅲ-2/);
  assert.doesNotMatch(run('timetable()'),/国語ⅢＡ/);
});

test('portal source data remains identical to the verified standalone timetable',()=>{
  const instance=app();const context=vm.createContext({});
  vm.runInContext(read('timetable-standalone.html').match(/<script>([\s\S]*?)<\/script>/)[1].split('// ===== UI =====')[0],context);
  assert.equal(instance.run('JSON.stringify(LESSONS)'),vm.runInContext('JSON.stringify(LESSONS)',context));
});
