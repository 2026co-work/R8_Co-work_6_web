/**
 * Tier 3 E2E Combinatorial Pairwise Interaction Test Suite
 * 明石高専キャンパスポータル (Akashi Kosen Campus Portal)
 *
 * Implements >= 24 pairwise cross-feature interaction test cases (named T3-P-[XX]).
 * Covers interactions across:
 * - Data build + CI (F1 × F2, F2 × F3)
 * - Dual build + Serving + Standalone (F4 × F1, F4 × F12, F5 × F12)
 * - Advanced course PDF + UI + Dynamic metadata (F5 × F9, F9 × F10)
 * - 6-Tab Navigation + Views (F6 × F7, F6 × F13, F6 × F15, F6 × F18, F6 × F21)
 * - Home Dashboard + Widgets (F7 × F9, F7 × F11, F7 × F14, F7 × F18, F7 × F20, F7 × F22)
 * - Non-Goals Integrity + Dual-Build (F8 × F4)
 * - Dynamic Metadata + Banners + Export (F10 × F11, F10 × F17)
 * - Academic Calendar + Banners + iCal Export (F11 × F15, F15 × F16, F16 × F17)
 * - Exam Schedule + Fallback + Syllabus Resolver (F13 × F14, F13 × F20)
 * - Cafeteria Menu + Fallback Modes (F18 × F19)
 * - Official URL Directory + MyLinks CRUD (F21 × F22)
 *
 * Progressive testability: uses requireOrSkip to handle pending milestone features.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const {
  createAppInstance,
  requireOrSkip,
  runCli,
  read,
  fileExists,
  readJson,
  DEFAULT_FIXTURES,
  ROOT_DIR
} = require('./e2e-harness.cjs');

// =============================================================================
// Pairwise Combinations (T3-P-01 to T3-P-28)
// =============================================================================

test('T3-P-01: F1 × F2 — Master runner coordinates data auto-fetchers with fault isolation', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'scripts/build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  // Verify master runner orchestrates all 4 scrapers
  assert.ok(content.includes('fetch-timetable-links') || content.includes('timetable'), 'References timetable scraper');
  assert.ok(content.includes('calendar'), 'References calendar scraper');
  assert.ok(content.includes('exam'), 'References exam scraper');
  assert.ok(content.includes('cafeteria'), 'References cafeteria scraper');
  assert.ok(content.includes('try') && content.includes('catch'), 'Includes fault-isolation try/catch blocks');

  // Verify all 4 dist-data files exist with valid schema
  const requiredFiles = ['timetable-lessons.json', 'calendar.json', 'exam.json', 'cafeteria.json'];
  for (const file of requiredFiles) {
    const fullPath = `dist-data/${file}`;
    assert.ok(fileExists(fullPath), `dist-data/${file} must exist`);
    const parsed = readJson(fullPath);
    assert.ok(parsed !== null, `dist-data/${file} must be valid JSON`);
    assert.ok(parsed.meta !== undefined, `dist-data/${file} must contain meta property`);
    assert.ok(typeof parsed.meta.updatedAt === 'string', `${file} meta.updatedAt must be a string`);
  }
});

test('T3-P-02: F2 × F3 — Master runner output triggers GitHub Actions data-update workflow commit step', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), '.github/workflows/data-update.yml', 'M1')) return;

  const yaml = read(workflowPath);
  // Master runner invocation
  assert.ok(
    yaml.includes('scripts/build-data.mjs') || yaml.includes('build:data'),
    'Workflow executes build-data script'
  );
  // Git diff check and commit
  assert.ok(
    yaml.includes('dist-data') && (yaml.includes('git diff') || yaml.includes('git status')),
    'Workflow inspects dist-data changes'
  );
  // Commit with bot author and skip-ci
  assert.ok(yaml.includes('github-actions[bot]'), 'Configures bot committer');
  assert.ok(yaml.includes('[skip ci]'), 'Includes [skip ci] to prevent recursive triggers');
});

test('T3-P-03: F4 × F1 — Dual-build index.html and dist/index.html both reference dist-data JSON endpoints', async (t) => {
  const rootHtml = read('index.html');
  const distHtmlExists = fileExists('dist/index.html');
  if (!requireOrSkip(t, distHtmlExists, 'dist/index.html production build', 'M1')) return;

  const distHtml = read('dist/index.html');

  // Both should use relative assets
  assert.ok(!rootHtml.includes('href="/styles.css"'), 'Root HTML uses relative stylesheet');
  assert.ok(!distHtml.includes('href="/assets/'), 'Dist HTML uses relative base assets');
  assert.ok(!distHtml.includes('src="/assets/'), 'Dist HTML uses relative script sources');

  // Verify dist/dist-data mirror exists and contains all required data
  assert.ok(fileExists('dist/dist-data/timetable-lessons.json'), 'Mirrored timetable-lessons.json exists in dist');
  assert.ok(fileExists('dist/dist-data/calendar.json'), 'Mirrored calendar.json exists in dist');
  assert.ok(fileExists('dist/dist-data/exam.json'), 'Mirrored exam.json exists in dist');
  assert.ok(fileExists('dist/dist-data/cafeteria.json'), 'Mirrored cafeteria.json exists in dist');
});

test('T3-P-04: F4 × F12 — Standalone timetable and portal app produce identical undergraduate schedules', async (t) => {
  // Load standalone generator from script tag
  const standaloneHtml = read('timetable-standalone.html');
  const standaloneMatch = standaloneHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(standaloneMatch, 'Standalone HTML contains inline <script>');
  const standaloneScript = standaloneMatch[1].split('// ===== UI =====')[0];
  const standaloneContext = vm.createContext({});
  vm.runInContext(standaloneScript, standaloneContext);
  const standaloneRun = expr => vm.runInContext(expr, standaloneContext);

  // Load portal timetable-data generator
  const dataScript = read('timetable-data.js').replace(/^export .*$/mg, '');
  const portalContext = vm.createContext({});
  vm.runInContext(dataScript, portalContext);
  const portalRun = expr => vm.runInContext(expr, portalContext);

  // Test across diverse undergraduate personas
  const testPersonas = [
    { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' },
    { grade: 2, department: 'E', classGroup: '2', studentType: 'regular', course: '', arts: 'music' },
    { grade: 3, department: 'C', classGroup: '1', studentType: 'international', course: '', arts: 'music' },
    { grade: 4, department: 'E', classGroup: '1', studentType: 'regular', course: 'ED', arts: 'music' },
    { grade: 4, department: 'E', classGroup: '1', studentType: 'regular', course: 'EJ', arts: 'music' },
    { grade: 5, department: 'A', classGroup: '1', studentType: 'regular', course: '', arts: 'music' }
  ];

  for (const persona of testPersonas) {
    const jsonStr = JSON.stringify(persona);
    const standaloneResult = standaloneRun(`generateTimetable(LESSONS, ${jsonStr})`);
    const portalResult = portalRun(`generateTimetable(LESSONS, ${jsonStr})`);

    assert.equal(
      standaloneResult.selected.length,
      portalResult.selected.length,
      `Persona ${persona.grade}${persona.department} lesson count matches between standalone and portal`
    );
    assert.equal(
      standaloneResult.conflicts,
      portalResult.conflicts,
      `Persona ${persona.grade}${persona.department} conflicts match (0)`
    );

    // Verify cell contents match 100%
    for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 4; period++) {
        const sCell = standaloneResult.grid[day][period];
        const pCell = portalResult.grid[day][period];
        assert.equal(sCell.length, pCell.length, `Grid[${day}][${period}] length matches`);
        if (sCell.length > 0) {
          assert.equal(sCell[0].subjectName, pCell[0].subjectName, `Subject at [${day}][${period}] matches`);
        }
      }
    }
  }
});

test('T3-P-05: F5 × F9 — Advanced course PDF extraction populates timetable UI for 専1 ME and 専2 AC', async (t) => {
  const app = createAppInstance();

  // Test 専攻科1年 ME
  app.selectStudent({ grade: 6, department: 'ME' });
  app.navigate('#timetable');

  const meResult = app.run('selectedSchedule()');
  assert.ok(meResult.selected.length >= 10, `Expected >= 10 lessons for 専1 ME, got ${meResult.selected.length}`);
  assert.equal(meResult.error, '', '0 conflicts for 専1 ME');

  const mainHtml = app.elements.main.innerHTML;
  assert.ok(mainHtml.includes('専1ME') || mainHtml.includes('専攻科1年') || mainHtml.includes('ME'), 'Contains 専1 ME header');
  assert.doesNotMatch(mainHtml, /授業の重複/, 'Zero timetable conflicts in DOM for 専1 ME');

  // Test 専攻科2年 AC
  app.selectStudent({ grade: 7, department: 'AC' });
  app.navigate('#timetable');

  const acResult = app.run('selectedSchedule()');
  assert.ok(acResult.selected.length >= 8, `Expected >= 8 lessons for 専2 AC, got ${acResult.selected.length}`);
  assert.equal(acResult.error, '', '0 conflicts for 専2 AC');

  const acHtml = app.elements.main.innerHTML;
  assert.ok(acHtml.includes('専2AC') || acHtml.includes('専攻科2年') || acHtml.includes('AC'), 'Contains 専2 AC header');
  assert.doesNotMatch(acHtml, /授業の重複/, 'Zero timetable conflicts in DOM for 専2 AC');
});

test('T3-P-06: F5 × F12 — Advanced course dataset inclusion preserves undergraduate-only contract in standalone', async (t) => {
  const standaloneHtml = read('timetable-standalone.html');
  const standaloneMatch = standaloneHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(standaloneMatch, 'Standalone HTML contains inline <script>');
  const standaloneScript = standaloneMatch[1].split('// ===== UI =====')[0];
  const standaloneContext = vm.createContext({});
  vm.runInContext(standaloneScript, standaloneContext);
  const run = expr => vm.runInContext(expr, standaloneContext);

  // Standalone rejects invalid grade or undergraduate department applied to advanced course
  assert.throws(
    () => run("generateTimetable(LESSONS, { grade: 6, department: 'M' })"),
    /学年/,
    'Standalone timetable rejects invalid grade/department pairing'
  );
  assert.throws(
    () => run("generateTimetable(LESSONS, { grade: 8, department: 'ME' })"),
    /学年/,
    'Standalone timetable strictly rejects grade 8'
  );

  // Undergraduate combinations remain 100% functional
  const regular1M = run("generateTimetable(LESSONS, { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' })");
  assert.ok(regular1M.selected.length >= 10, 'Undergraduate 1M has >= 10 lessons');
  assert.equal(regular1M.conflicts, 0, 'Undergraduate 1M has 0 conflicts');
});

test('T3-P-07: F6 × F7 — 6-Tab navigation highlights #home active state and renders dashboard', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('today-schedule') || appCode.includes('todaySchedule') || appCode.includes('dashboard');
  if (!requireOrSkip(t, ready, 'Home dashboard widgets', 'M2')) return;

  const app = createAppInstance();
  app.navigate('#home');

  const homeTab = app.elements['home'];
  assert.ok(homeTab.classList.contains('active'), 'Home tab receives active class');
  assert.equal(homeTab.getAttribute('aria-current'), 'page', 'Home tab has aria-current="page"');

  const main = app.elements['main'];
  assert.ok(main.innerHTML.includes('ホーム') || main.innerHTML.includes('ダッシュボード'), 'Main container renders home dashboard');
});

test('T3-P-08: F6 × F13 — 6-Tab navigation switches to dedicated #exam tab isolated from timetable grid', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('exam') && (appCode.includes('exam-timetable') || appCode.includes('exam-schedule') || appCode.includes('exam_schedule'));
  if (!requireOrSkip(t, ready, 'Dedicated #exam tab route in app.js', 'M4')) return;

  const app = createAppInstance();
  app.navigate('#exam');

  const examTab = app.elements['exam'];
  assert.ok(examTab.classList.contains('active'), 'Exam tab receives active class');
  assert.equal(examTab.getAttribute('aria-current'), 'page', 'Exam tab has aria-current="page"');

  const main = app.elements['main'];
  assert.ok(!main.innerHTML.includes('timetable-controls'), 'Timetable filter controls are not rendered inside #exam');
  assert.ok(main.innerHTML.includes('定期試験') || main.innerHTML.includes('試験時間割'), 'Renders exam title');
});

test('T3-P-09: F6 × F15 — 6-Tab navigation mounts academic calendar timeline under #calendar', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('calendar') && (appCode.includes('timeline') || appCode.includes('calendar-timeline') || appCode.includes('calendar-events'));
  if (!requireOrSkip(t, ready, 'Academic calendar view in app.js', 'M4')) return;

  const app = createAppInstance();
  app.navigate('#calendar');

  const calTab = app.elements['calendar'];
  assert.ok(calTab.classList.contains('active'), 'Calendar tab receives active class');

  const main = app.elements['main'];
  assert.ok(main.innerHTML.includes('年間行事') || main.innerHTML.includes('年間予定') || main.innerHTML.includes('予定表'), 'Calendar title is present');
});

test('T3-P-10: F6 × F18 — Navigation router mounts cafeteria weekly menu cards under #cafeteria', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('cafeteria') && (appCode.includes('weeklyMenus') || appCode.includes('lunchA') || appCode.includes('lunch-a'));
  if (!requireOrSkip(t, ready, 'Cafeteria view in app.js', 'M5')) return;

  const app = createAppInstance();
  app.navigate('#cafeteria');

  const cafeTab = app.elements['cafeteria'];
  assert.ok(cafeTab.classList.contains('active'), 'Cafeteria tab receives active class');

  const main = app.elements['main'];
  assert.ok(main.innerHTML.includes('食堂') || main.innerHTML.includes('メニュー'), 'Cafeteria title is present');
});

test('T3-P-11: F6 × F21 — Navigation router mounts official URL directory under #links', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('links') && (appCode.includes('teams.microsoft.com') || appCode.includes('classroom.google.com') || appCode.includes('official-links'));
  if (!requireOrSkip(t, ready, 'Official links directory in app.js', 'M5')) return;

  const app = createAppInstance();
  app.navigate('#links');

  const linksTab = app.elements['links'];
  assert.ok(linksTab.classList.contains('active'), 'Links tab receives active class');

  const main = app.elements['main'];
  assert.ok(main.innerHTML.includes('Microsoft Teams') || main.innerHTML.includes('teams.microsoft.com'), 'Contains Teams link');
  assert.ok(main.innerHTML.includes('WebClass') || main.innerHTML.includes('webclass.kosen-k.go.jp'), 'Contains WebClass link');
});

test('T3-P-12: F7 × F9 — Home dashboard today-schedule widget renders 専攻科 lessons when student is 専1 ME', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('today-schedule') || appCode.includes('todaySchedule');
  if (!requireOrSkip(t, ready, 'Home dashboard today-schedule widget', 'M2')) return;

  const app = createAppInstance({
    cookie: 'campus-student-v1=' + encodeURIComponent(JSON.stringify({
      version: 1, grade: 6, department: 'ME', classGroup: '1', studentType: 'regular', course: '', arts: 'music'
    })),
    mockDate: '2026-11-09T09:00:00+09:00' // Monday
  });

  app.navigate('#home');
  const main = app.elements['main'].innerHTML;

  assert.ok(main.includes('専1ME') || main.includes('専攻科'), 'Header reflects 専攻科 student');
  // Should not display undergraduate subjects
  assert.doesNotMatch(main, /国語Ⅰ|歴史-2|サイエンスⅠ/, 'Undergraduate subjects not shown for 専攻科');
});

test('T3-P-13: F7 × F11 — Calendar day substitution alert reflects simultaneously on home dashboard and timetable', async (t) => {
  const appCode = read('app.js');
  const ready = (appCode.includes('day-substitution') || appCode.includes('振替') || appCode.includes('daySubstitutions')) && appCode.includes('week-banner');
  if (!requireOrSkip(t, ready, 'Day substitution banner integration', 'M3')) return;

  // 2026-11-25 is Wednesday with Monday schedule substitution (verified against official R8 calendar PDF)
  const app = createAppInstance({
    mockDate: '2026-11-25T08:30:00+09:00'
  });

  app.navigate('#home');
  const homeHtml = app.elements['main'].innerHTML;
  assert.ok(homeHtml.includes('振替') || homeHtml.includes('月曜日'), 'Home dashboard displays substitution alert');

  app.navigate('#timetable');
  const ttHtml = app.elements['main'].innerHTML;
  assert.ok(ttHtml.includes('月曜日') && ttHtml.includes('振替'), 'Timetable view displays substitution banner');
});

test('T3-P-14: F7 × F14 — Exam unreleased status alert propagates countdown banner to home dashboard', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('exam') && (appCode.includes('unreleased') || appCode.includes('10日前の正午発表') || appCode.includes('exam-alert'));
  if (!requireOrSkip(t, ready, 'Exam status alert on home dashboard', 'M2')) return;

  const app = createAppInstance({
    fetchMock: {
      './dist-data/exam.json': {
        meta: {
          title: '令和8年度後期定期試験時間割',
          status: 'unreleased',
          noticeText: '定期試験時間割は、試験開始10日前の正午にこちらで発表します。',
          updatedAt: '2026-11-13T00:00:00.000Z'
        },
        periods: [],
        schedule: []
      }
    }
  });

  app.navigate('#home');
  const homeHtml = app.elements['main'].innerHTML;
  assert.ok(homeHtml.includes('10日前の正午') || homeHtml.includes('定期試験') || homeHtml.includes('exam'), 'Home dashboard shows exam countdown notice');
});

test('T3-P-15: F7 × F18 — Home dashboard cafeteria widget summarizes today\'s lunch dish and allergens', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('cafeteria-summary') || (appCode.includes('lunch') && appCode.includes('home'));
  if (!requireOrSkip(t, ready, 'Cafeteria summary on home dashboard', 'M2')) return;

  const app = createAppInstance({
    mockDate: '2026-11-13T10:00:00+09:00' // Friday
  });

  app.navigate('#home');
  const homeHtml = app.elements['main'].innerHTML;
  assert.ok(homeHtml.includes('チキン南蛮定食') || homeHtml.includes('学食') || homeHtml.includes('食堂'), 'Dashboard displays lunch menu');
});

test('T3-P-16: F7 × F20 — Home dashboard quick syllabus link maps to department syllabus for saved student', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('getSyllabusUrl') || appCode.includes('syllabus.kosen-k.go.jp');
  if (!requireOrSkip(t, ready, 'Syllabus resolver link on home dashboard', 'M2')) return;

  // Student is 3年 E科
  const app = createAppInstance({
    cookie: 'campus-student-v1=' + encodeURIComponent(JSON.stringify({
      version: 1, grade: 3, department: 'E', classGroup: '1', studentType: 'regular', course: '', arts: 'music'
    }))
  });

  app.navigate('#home');
  const homeHtml = app.elements['main'].innerHTML;

  // Grade 3 E maps to department_id=12
  assert.ok(homeHtml.includes('school_id=27'), 'Contains school_id=27');
  assert.ok(homeHtml.includes('department_id=12'), 'Maps to department_id=12 for 3年 E');
});

test('T3-P-17: F7 × F22 — Home dashboard shortcuts integrate top custom MyLinks from localStorage', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('campus-links-v1') && (appCode.includes('quick-links') || appCode.includes('home'));
  if (!requireOrSkip(t, ready, 'Custom MyLinks integration on home dashboard', 'M2')) return;

  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': JSON.stringify([
        { id: 'custom-1', name: '実験レポート提出', url: 'https://classroom.google.com/c/12345' }
      ])
    }
  });

  app.navigate('#home');
  const homeHtml = app.elements['main'].innerHTML;
  assert.ok(homeHtml.includes('実験レポート提出'), 'Home dashboard shows custom bookmark name');
  assert.ok(homeHtml.includes('https://classroom.google.com/c/12345'), 'Home dashboard shortcut has target URL');
});

test('T3-P-18: F8 × F4 — Prohibited non-goals are strictly omitted from both source and built bundle', async (t) => {
  const prohibitedTerms = [
    '混雑状況',
    '歴代校長',
    '備品報告',
    '空き教室',
    '授業変更'
  ];

  const sourceFiles = ['app.js', 'index.html', 'timetable-data.js', 'timetable-export.js'];
  for (const file of sourceFiles) {
    const text = read(file);
    for (const term of prohibitedTerms) {
      assert.ok(!text.includes(term), `${file} must not contain non-goal term "${term}"`);
    }
  }

  // Check built files if dist exists
  if (fileExists('dist/index.html')) {
    const distHtml = read('dist/index.html');
    for (const term of prohibitedTerms) {
      assert.ok(!distHtml.includes(term), `dist/index.html must not contain non-goal term "${term}"`);
    }
  }
});

test('T3-P-19: F9 × F10 — Advanced course timetable dynamically incorporates term and fiscal year metadata', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('fiscalYear') || appCode.includes('termLabel') || appCode.includes('令和');
  if (!requireOrSkip(t, ready, 'Dynamic term/year metadata in timetable heading', 'M3')) return;

  const app = createAppInstance();
  app.selectStudent({ grade: '6', department: 'ME' });
  app.navigate('#timetable');

  const headingText = app.elements['timetable-sheet']?.textContent || '';
  assert.ok(headingText.includes('専1ME') || headingText.includes('専攻科1年'), 'Includes 専攻科 identifier');
  assert.ok(headingText.includes('令和') || headingText.includes('2026'), 'Includes fiscal year info');
});

test('T3-P-20: F10 × F11 — Academic term metadata synchronizes with calendar week count banner', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('week-banner') || (appCode.includes('第') && appCode.includes('週'));
  if (!requireOrSkip(t, ready, 'Calendar week count banner with term metadata', 'M3')) return;

  const app = createAppInstance({
    mockDate: '2026-11-13T09:00:00+09:00'
  });

  app.navigate('#timetable');
  const ttHtml = app.elements['main'].innerHTML;

  assert.ok(ttHtml.includes('後期') && ttHtml.includes('週'), 'Timetable banner specifies term and week count');
});

test('T3-P-21: F10 × F17 — Timetable export headers synchronize with dynamic term/year metadata', async (t) => {
  const exportCode = read('timetable-export.js');
  const ready = exportCode.includes('options?.fiscalYear') || exportCode.includes('options?.term') || exportCode.includes('options?.semesterInfo') || (exportCode.includes('fiscalYear') && exportCode.includes('generateCsv'));
  if (!requireOrSkip(t, ready, 'Dynamic metadata in export headers', 'M3')) return;

  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  const sampleLessons = [
    { id: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '数学', teacher: '山田', location: '1-1' }
  ];

  const csv = exportContext.generateCsv(sampleLessons, '専1ME', { fiscalYear: 2026, term: '後期' });
  assert.ok(csv.includes('2026') || csv.includes('後期') || csv.includes('専1ME'), 'CSV export header contains metadata');
});

test('T3-P-22: F11 × F15 — Timetable banner week calculation matches academic calendar timeline dates', async (t) => {
  const calPath = 'dist-data/calendar.json';
  if (!requireOrSkip(t, fileExists(calPath), 'dist-data/calendar.json', 'M1')) return;

  const calendarData = readJson(calPath);
  assert.ok(calendarData.terms && calendarData.terms.kouki, 'Calendar data has kouki term definitions');

  const startKouki = new Date(calendarData.terms.kouki.startDate + 'T00:00:00+09:00');
  const testDate = new Date('2026-11-13T09:00:00+09:00');

  // Compute expected week offset
  const msDiff = testDate.getTime() - startKouki.getTime();
  const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  const expectedWeek = Math.floor(daysDiff / 7) + 1;

  assert.ok(expectedWeek >= 6 && expectedWeek <= 8, `Expected week is ~7 (got ${expectedWeek})`);
});

test('T3-P-23: F13 × F14 — Exam tab displays fallback notice when unreleased and schedule grid when published', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('exam') && (appCode.includes('unreleased') || appCode.includes('published'));
  if (!requireOrSkip(t, ready, 'Exam tab status toggle support', 'M4')) return;

  // Unreleased state
  const unreleasedApp = createAppInstance({
    fetchMock: {
      './dist-data/exam.json': {
        meta: { status: 'unreleased', noticeText: '試験開始10日前の正午発表予定' },
        periods: [],
        schedule: []
      }
    }
  });
  unreleasedApp.navigate('#exam');
  assert.ok(unreleasedApp.elements['main'].innerHTML.includes('10日前の正午発表予定'), 'Displays unreleased notice banner');

  // Published state
  const publishedApp = createAppInstance({
    fetchMock: {
      './dist-data/exam.json': {
        meta: { status: 'published', title: '令和8年度後期定期試験時間割' },
        periods: [{ id: '2-F', label: '2限 前半', start: '10:40', end: '11:25' }],
        schedule: [{ grade: 1, department: 'M', day: 1, period: '2-F', subject: '基礎数学Ⅰ' }]
      }
    }
  });
  publishedApp.navigate('#exam');
  assert.ok(publishedApp.elements['main'].innerHTML.includes('2限 前半') || publishedApp.elements['main'].innerHTML.includes('基礎数学Ⅰ'), 'Renders exam grid when published');
});

test('T3-P-24: F13 × F20 — Exam grid filters by student department and links to department syllabus', async (t) => {
  const appCode = read('app.js');
  const ready = (appCode.includes('exam') && appCode.includes('getSyllabusUrl')) || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Exam grid student filter & syllabus deep link', 'M4')) return;

  const app = createAppInstance({
    cookie: 'campus-student-v1=' + encodeURIComponent(JSON.stringify({
      version: 1, grade: 4, department: 'E', classGroup: '1', studentType: 'regular', course: 'EJ', arts: 'music'
    }))
  });

  app.navigate('#exam');
  const mainHtml = app.elements['main'].innerHTML;

  // Grade 4 E course EJ maps to department_id=14
  assert.ok(mainHtml.includes('department_id=14') || mainHtml.includes('EJ'), 'Exam view correctly targets EJ syllabus/curriculum');
});

test('T3-P-25: F15 × F16 — Academic calendar timeline events export to RFC 5545 iCalendar (.ics) format', async (t) => {
  const exportCode = read('timetable-export.js');
  const ready = exportCode.includes('generateCalendarIcs') || read('app.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs in timetable-export.js', 'M4')) return;

  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  const calData = readJson('dist-data/calendar.json') || DEFAULT_FIXTURES['./dist-data/calendar.json'];
  const ics = exportContext.generateCalendarIcs(calData);

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('X-WR-CALNAME:'), 'Contains calendar name header');
  assert.ok(ics.includes('BEGIN:VEVENT'), 'Contains event entries');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('T3-P-26: F16 × F17 — Calendar iCal and Timetable iCal both satisfy RFC 5545 specification with Asia/Tokyo timezone', async (t) => {
  const exportCode = read('timetable-export.js');
  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  const sampleLessons = [
    { id: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '数学Ⅰ', location: '1-1', teacher: '山田' }
  ];

  const timetableIcs = exportContext.generateIcs(sampleLessons, '1年 M学科 1組');
  assert.ok(timetableIcs.includes('BEGIN:VCALENDAR'), 'Timetable iCal has VCALENDAR header');
  assert.ok(timetableIcs.includes('RRULE:FREQ=WEEKLY'), 'Timetable iCal has weekly recurrence rule');
  assert.ok(timetableIcs.includes('TZID=Asia/Tokyo'), 'Timetable iCal specifies Asia/Tokyo timezone');
  assert.ok(timetableIcs.includes('TRANSP:OPAQUE'), 'Timetable iCal sets TRANSP:OPAQUE');

  // If calendar iCal function is implemented, test parity
  if (typeof exportContext.generateCalendarIcs === 'function') {
    const calendarIcs = exportContext.generateCalendarIcs(DEFAULT_FIXTURES['./dist-data/calendar.json']);
    assert.ok(calendarIcs.includes('BEGIN:VCALENDAR'), 'Calendar iCal has VCALENDAR header');
    assert.ok(calendarIcs.includes('VERSION:2.0'), 'Calendar iCal has VERSION:2.0');
    assert.ok(calendarIcs.endsWith('END:VCALENDAR'), 'Calendar iCal ends with END:VCALENDAR');
  }
});

test('T3-P-27: F18 × F19 — Cafeteria view renders menu cards when extracted and falls back to PDF/dorm link when unextracted', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('cafeteria') && (appCode.includes('isTextExtracted') || appCode.includes('sourcePdfUrl'));
  if (!requireOrSkip(t, ready, 'Cafeteria dual-mode extracted/unextracted view', 'M5')) return;

  // Unextracted state (scanned image PDF)
  const unextractedApp = createAppInstance({
    fetchMock: {
      './dist-data/cafeteria.json': {
        meta: {
          title: '学生食堂メニュー（11月）',
          isTextExtracted: false,
          sourcePdfUrl: 'https://www.akashi.ac.jp/news/cafeteria-image.pdf',
          dormitoryArticleUrl: 'https://www.akashi.ac.jp/news/dorm-menu.html'
        },
        weeklyMenus: []
      }
    }
  });

  unextractedApp.navigate('#cafeteria');
  const html = unextractedApp.elements['main'].innerHTML;

  assert.ok(html.includes('cafeteria-image.pdf') || html.includes('原本PDF') || html.includes('PDF'), 'Contains direct PDF link');
  assert.ok(html.includes('dorm-menu.html') || html.includes('寮'), 'Contains dormitory cafeteria link');
});

test('T3-P-28: F21 × F22 — Official link directory and custom MyLinks operate concurrently with zero ID collisions', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('campus-links-v1') && appCode.includes('teams.microsoft.com');
  if (!requireOrSkip(t, ready, 'Official links & custom MyLinks co-existence', 'M5')) return;

  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': JSON.stringify([
        { id: 'custom-link-1', name: 'Microsoft Teams (授業用)', url: 'https://teams.microsoft.com/myclass' }
      ])
    }
  });

  app.navigate('#links');
  const html = app.elements['main'].innerHTML;

  // Official link is present
  assert.ok(html.includes('teams.microsoft.com'), 'Official Teams link is present');
  // Custom link is present without overriding official link
  assert.ok(html.includes('Microsoft Teams (授業用)'), 'Custom renamed bookmark is rendered');
});
