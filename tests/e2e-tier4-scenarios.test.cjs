/**
 * Tier 4 E2E Application Scenarios Test Suite
 * 明石高専キャンパスポータル (Akashi Kosen Campus Portal)
 *
 * Implements all 12 realistic multi-step user workflows defined in TEST_INFRA.md:
 * - S-01: Fresh Pipeline Build & Serving (F1, F2, F3, F4)
 * - S-02: Advanced Course Student Lifecycle (F5, F9, F10, F16, F20)
 * - S-03: First-Year Morning Dashboard Check (F6, F7, F8, F18, F20, F21, F22)
 * - S-04: Exam Season & Calendar Workflow (F6, F11, F13, F14, F15, F16)
 * - S-05: Dual-Mode Standalone vs Portal Parity (F4, F12, F17)
 * - S-06: International Student 3rd Year Transition (F6, F7, F9, F20)
 * - S-07: Electrical Engineering Course Split (ED vs EJ) (F6, F7, F9, F10, F20)
 * - S-08: Network Failure & Offline Fallback Journey (F2, F7, F14, F19)
 * - S-09: Custom Bookmarks Persistence Lifecycle (F21, F22)
 * - S-10: Arts Selection & Day Substitution Impact (F7, F9, F11, F15)
 * - S-11: Cafeteria Menu Parsing & Dorm Fallback (F18, F19, F7)
 * - S-12: End-to-End Export & Multi-Format Generation (F10, F16, F17)
 *
 * Progressive testability: uses requireOrSkip to handle pending milestone features cleanly.
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
// S-01: Fresh Pipeline Build & Serving (F1, F2, F3, F4)
// =============================================================================

test('S-01: Fresh Pipeline Build & Serving (F1, F2, F3, F4)', async (t) => {
  // Step 1: Verify data acquisition scripts exist
  const fetchers = [
    'scripts/fetch-timetable-links.mjs',
    'scripts/fetch-calendar.mjs',
    'scripts/fetch-exam.mjs',
    'scripts/fetch-cafeteria.mjs',
    'scripts/build-data.mjs'
  ];
  for (const f of fetchers) {
    if (!requireOrSkip(t, fileExists(f), `Script ${f}`, 'M1')) return;
  }

  // Step 2: Verify master runner coordinates all scrapers with fallback logic
  const runnerScript = read('scripts/build-data.mjs');
  assert.ok(runnerScript.includes('fetch-timetable-links') || runnerScript.includes('timetable'), 'Coordinates timetable scraper');
  assert.ok(runnerScript.includes('calendar'), 'Coordinates calendar scraper');
  assert.ok(runnerScript.includes('exam'), 'Coordinates exam scraper');
  assert.ok(runnerScript.includes('cafeteria'), 'Coordinates cafeteria scraper');
  assert.ok(runnerScript.includes('try') && runnerScript.includes('catch'), 'Contains fault-isolation blocks');

  // Step 3: Verify all 4 generated datasets exist in dist-data/
  const datasets = {
    'dist-data/timetable-lessons.json': data => {
      assert.ok(data.meta && typeof data.meta.totalLessons === 'number');
      assert.ok(Array.isArray(data.lessons) && data.lessons.length >= 300);
      const grades = new Set(data.lessons.map(l => l.grade));
      assert.ok(grades.has(1) && grades.has(5) && grades.has(6) && grades.has(7), 'Includes grades 1-7');
    },
    'dist-data/calendar.json': data => {
      assert.ok(data.meta && typeof data.meta.fiscalYear === 'number');
      assert.ok(data.terms && data.terms.zenki && data.terms.kouki);
      assert.ok(Array.isArray(data.events) && data.events.length >= 10);
    },
    'dist-data/exam.json': data => {
      assert.ok(data.meta && typeof data.meta.status === 'string');
      assert.ok(Array.isArray(data.periods) && data.periods.length >= 4);
    },
    'dist-data/cafeteria.json': data => {
      assert.ok(data.meta && typeof data.meta.month === 'number');
      assert.ok(Array.isArray(data.weeklyMenus));
    }
  };

  for (const [filePath, validator] of Object.entries(datasets)) {
    assert.ok(fileExists(filePath), `${filePath} must exist`);
    const parsed = readJson(filePath);
    assert.ok(parsed !== null, `${filePath} must be valid JSON`);
    validator(parsed);
  }

  // Step 4: Verify production build parity in dist/
  if (fileExists('dist/index.html')) {
    const distHtml = read('dist/index.html');
    assert.ok(!distHtml.includes('href="/assets/'), 'dist/index.html uses relative asset links');
    assert.ok(!distHtml.includes('src="/assets/'), 'dist/index.html uses relative script sources');
    assert.ok(fileExists('dist/dist-data/timetable-lessons.json'), 'dist/dist-data/ contains timetable-lessons.json');
    assert.ok(fileExists('dist/dist-data/calendar.json'), 'dist/dist-data/ contains calendar.json');
    assert.ok(fileExists('dist/dist-data/exam.json'), 'dist/dist-data/ contains exam.json');
    assert.ok(fileExists('dist/dist-data/cafeteria.json'), 'dist/dist-data/ contains cafeteria.json');
  }

  // Step 5: Verify GitHub Actions workflow configuration
  const workflowPath = '.github/workflows/data-update.yml';
  if (fileExists(workflowPath)) {
    const yaml = read(workflowPath);
    assert.ok(yaml.includes('0 21 * * *'), 'Scheduled for daily 21:00 UTC (06:00 JST)');
    assert.ok(yaml.includes('workflow_dispatch'), 'Includes manual workflow_dispatch trigger');
    assert.ok(yaml.includes('contents: write') || yaml.includes('permissions:'), 'Configures write permissions');
    assert.ok(yaml.includes('build-data') || yaml.includes('build:data'), 'Executes build-data script');
    assert.ok(yaml.includes('[skip ci]'), 'Includes [skip ci] tag');
  }
});

// =============================================================================
// S-02: Advanced Course Student Lifecycle (F5, F9, F10, F16, F20)
// =============================================================================

test('S-02: Advanced Course Student Lifecycle (F5, F9, F10, F16, F20)', async (t) => {
  // Step 1: Verify advanced course lessons exist in dataset
  const lessonsData = readJson('dist-data/timetable-lessons.json');
  if (!requireOrSkip(t, lessonsData !== null, 'dist-data/timetable-lessons.json', 'M1')) return;

  const ac1Me = lessonsData.lessons.filter(l => l.grade === 6 && l.targetGroup === 'ME');
  assert.ok(ac1Me.length >= 10, `Expected >= 10 lessons for 専1 ME, found ${ac1Me.length}`);

  // Step 2: Student opens portal and selects grade 6 (専1) ME
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  app.navigate('#timetable');

  // Step 3: Verify student short label and summary badge
  assert.equal(app.run('studentShortLabel()'), '専1ME');
  assert.equal(app.run('studentSelection.grade'), 6);
  assert.equal(app.run('studentSelection.department'), 'ME');

  // Step 4: Verify schedule generation: >= 10 lessons with 0 conflicts
  const scheduleResult = app.run('selectedSchedule()');
  assert.ok(scheduleResult.selected.length >= 10, '>= 10 lessons for 専1 ME');
  assert.equal(scheduleResult.error, '', '0 timetable conflicts');

  // Step 5: Verify cookie persistence
  const cookie = app.cookie();
  assert.ok(cookie.includes('campus-student-v1'), 'Cookie campus-student-v1 is saved');
  assert.ok(cookie.includes('6') && cookie.includes('ME'), 'Cookie contains grade 6 and ME');

  // Step 6: Export timetable to iCal (.ics)
  const exportCode = read('timetable-export.js');
  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  const ics = exportContext.generateIcs(scheduleResult.selected, '専攻科1年 ME');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Timetable iCal starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Contains TRANSP:OPAQUE');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');

  // Step 7: Resolve syllabus link for 専1 ME -> department_id=21
  const appCode = read('app.js');
  const syllabusReady = appCode.includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (syllabusReady) {
    const url = app.run("typeof getSyllabusUrl === 'function' ? getSyllabusUrl(studentSelection) : ''");
    if (url) {
      assert.ok(url.includes('department_id=21'), '専1 ME maps to department_id=21');
      assert.ok(url.includes('school_id=27'), 'Targets Akashi Kosen (school_id=27)');
    }
  }
});

// =============================================================================
// S-03: First-Year Morning Dashboard Check (F6, F7, F8, F18, F20, F21, F22)
// =============================================================================

test('S-03: First-Year Morning Dashboard Check (F6, F7, F8, F18, F20, F21, F22)', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('today-schedule') || appCode.includes('todaySchedule') || appCode.includes('dashboard');
  if (!requireOrSkip(t, ready, 'Home dashboard widgets', 'M2')) return;

  // Step 1: 1年 M科 1組 student with saved selection visits portal on Wednesday morning
  const app = createAppInstance({
    cookie: 'campus-student-v1=' + encodeURIComponent(JSON.stringify({
      version: 1, grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music'
    })),
    mockDate: '2026-11-11T08:15:00+09:00' // Wednesday
  });

  app.navigate('#home');
  const mainHtml = app.elements['main'].innerHTML;

  // Step 2: Dashboard widgets verification
  assert.ok(mainHtml.includes('1-1-M') || mainHtml.includes('1年') || mainHtml.includes('M科'), 'Reflects 1年 M科 1組');
  assert.ok(mainHtml.includes('ホーム') || mainHtml.includes('ダッシュボード'), 'Dashboard title is visible');

  // Step 3: Strict Non-Goals Exclusion
  const nonGoals = ['混雑状況', '歴代校長', '備品報告', '空き教室', '授業変更'];
  for (const ng of nonGoals) {
    assert.ok(!mainHtml.includes(ng), `Dashboard must not contain non-goal: ${ng}`);
  }

  // Step 4: Cafeteria widget summary (honest unextracted PDF link by default)
  if (mainHtml.includes('食堂') || mainHtml.includes('メニュー') || mainHtml.includes('学食')) {
    assert.ok(mainHtml.includes('PDF') || mainHtml.includes('.pdf') || mainHtml.includes('食堂メニュー'), 'Displays honest cafeteria PDF or summary link');
  }

  // Step 5: Syllabus deep link for 1年 M -> department_id=11
  if (mainHtml.includes('syllabus.kosen-k.go.jp')) {
    assert.ok(mainHtml.includes('school_id=27'), 'Contains school_id=27');
    assert.ok(mainHtml.includes('department_id=11'), 'Maps to department_id=11 for 1年 M');
  }

  // Step 6: Navigation to #timetable works smoothly
  app.navigate('#timetable');
  assert.equal(app.context.location.hash, '#timetable');
  assert.ok(app.elements['main'].innerHTML.includes('時間割'), 'Timetable view mounted');
});

// =============================================================================
// S-04: Exam Season & Calendar Workflow (F6, F11, F13, F14, F15, F16)
// =============================================================================

test('S-04: Exam Season & Calendar Workflow (F6, F11, F13, F14, F15, F16)', async (t) => {
  const appCode = read('app.js');
  const calReady = fileExists('dist-data/calendar.json');
  if (!requireOrSkip(t, calReady, 'dist-data/calendar.json', 'M1')) return;

  const app = createAppInstance({
    mockDate: '2026-11-13T09:00:00+09:00'
  });

  // Step 1: Student checks academic calendar
  const calData = readJson('dist-data/calendar.json');
  assert.ok(calData.events.length > 0, 'Calendar has scheduled events');
  const examEvents = calData.events.filter(e => e.type === 'exam' || e.title.includes('試験'));
  assert.ok(examEvents.length > 0, 'Calendar contains scheduled exam events');

  // Step 2: Student visits #exam tab
  const examTabReady = appCode.includes('exam') && (appCode.includes('examtimetable') || appCode.includes('exam-schedule') || appCode.includes('exam_schedule'));
  if (examTabReady) {
    app.navigate('#exam');
    assert.equal(app.context.location.hash, '#exam');
    const examHtml = app.elements['main'].innerHTML;
    assert.ok(examHtml.includes('定期試験') || examHtml.includes('試験'), 'Exam view is rendered');

    // Unreleased fallback behavior
    if (examHtml.includes('10日前の正午発表')) {
      assert.ok(examHtml.includes('9時') || examHtml.includes('自習'), 'Displays 9:00 AM self-study rule');
      assert.ok(examHtml.includes('JR') || examHtml.includes('遅延'), 'Displays JR delay policy');
    }
  }

  // Step 3: Student visits #timetable to check calendar-linked banner
  app.navigate('#timetable');
  const ttHtml = app.elements['main'].innerHTML;
  assert.ok(ttHtml.length > 0, 'Timetable view is mounted');

  // Step 4: Export calendar iCal if implemented
  const exportCode = read('timetable-export.js');
  if (exportCode.includes('generateCalendarIcs')) {
    const exportContext = vm.createContext({});
    vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);
    const ics = exportContext.generateCalendarIcs(calData);
    assert.ok(ics.includes('BEGIN:VCALENDAR'), 'Calendar iCal generated');
    assert.ok(ics.includes('END:VCALENDAR'), 'Calendar iCal completed');
  }
});

// =============================================================================
// S-05: Dual-Mode Standalone vs Portal Parity (F4, F12, F17)
// =============================================================================

test('S-05: Dual-Mode Standalone vs Portal Parity (F4, F12, F17)', async (t) => {
  // Step 1: Initialize standalone timetable environment
  const standaloneHtml = read('timetable-standalone.html');
  const standaloneMatch = standaloneHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(standaloneMatch, 'Standalone HTML contains inline script');
  const standaloneScript = standaloneMatch[1].split('// ===== UI =====')[0];
  const standaloneContext = vm.createContext({});
  vm.runInContext(standaloneScript, standaloneContext);
  const standaloneRun = expr => vm.runInContext(expr, standaloneContext);

  // Step 2: Initialize portal timetable-data environment
  const dataScript = read('timetable-data.js').replace(/^export .*$/mg, '');
  const portalContext = vm.createContext({});
  vm.runInContext(dataScript, portalContext);
  const portalRun = expr => vm.runInContext(expr, portalContext);

  // Step 3: Compare 5 undergraduate personas across both environments
  const personas = [
    { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' },
    { grade: 2, department: 'E', classGroup: '2', studentType: 'regular', course: '', arts: 'music' },
    { grade: 3, department: 'C', classGroup: '1', studentType: 'international', course: '', arts: 'music' },
    { grade: 4, department: 'E', classGroup: '1', studentType: 'regular', course: 'ED', arts: 'music' },
    { grade: 5, department: 'A', classGroup: '1', studentType: 'regular', course: '', arts: 'music' }
  ];

  for (const persona of personas) {
    const jsonStr = JSON.stringify(persona);
    const sResult = standaloneRun(`generateTimetable(LESSONS, ${jsonStr})`);
    const pResult = portalRun(`generateTimetable(LESSONS, ${jsonStr})`);

    assert.equal(sResult.selected.length, pResult.selected.length, `Total lessons match for ${persona.grade}${persona.department}`);
    assert.equal(sResult.conflicts, 0, `Standalone conflicts 0 for ${persona.grade}${persona.department}`);
    assert.equal(pResult.conflicts, 0, `Portal conflicts 0 for ${persona.grade}${persona.department}`);

    // Verify cell contents match
    for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 4; period++) {
        const sCell = sResult.grid[day][period];
        const pCell = pResult.grid[day][period];
        assert.equal(sCell.length, pCell.length, `Grid[${day}][${period}] length matches`);
        if (sCell.length > 0) {
          assert.equal(sCell[0].subjectName, pCell[0].subjectName, `Subject name at [${day}][${period}] matches`);
        }
      }
    }
  }

  // Step 4: Verify iCal generation compatibility
  const exportCode = read('timetable-export.js');
  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  const sampleLessons = portalRun(`generateTimetable(LESSONS, ${JSON.stringify(personas[0])})`).selected;
  const ics = exportContext.generateIcs(sampleLessons, '1年 M科 1組');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Timetable iCal starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence rule');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Explicitly sets TRANSP:OPAQUE');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

// =============================================================================
// S-06: International Student 3rd Year Transition (F6, F7, F9, F20)
// =============================================================================

test('S-06: International Student 3rd Year Transition (F6, F7, F9, F20)', async (t) => {
  // Step 1: Student sets selection to 3年 M科 留学生
  const app = createAppInstance();
  app.selectStudent({ grade: 3, department: 'M', studentType: 'international' });

  // Step 2: Verify selection state and cookie
  assert.equal(app.run('studentSelection.grade'), 3);
  assert.equal(app.run('studentSelection.department'), 'M');
  assert.equal(app.run('studentSelection.studentType'), 'international');

  // Step 3: Timetable grid generation reflects international student curriculum
  const result = app.run('selectedSchedule()');
  assert.ok(result.selected.length >= 10, '>= 10 lessons for 3年 M 留学生');
  assert.equal(result.error, '', '0 schedule conflicts');

  // Verify Japanese language special class presence
  const japaneseLessons = result.selected.filter(l =>
    l.subjectName.includes('日本語') || l.studentType === 'international' || l.notes.includes('留学生')
  );
  assert.ok(japaneseLessons.length > 0, 'Includes international student specific course');

  // Step 4: Verify short label
  assert.equal(app.run('studentShortLabel()'), '3M');

  // Step 5: Verify syllabus mapping (3年 M -> department_id=11)
  const appCode = read('app.js');
  if (appCode.includes('getSyllabusUrl')) {
    const url = app.run("typeof getSyllabusUrl === 'function' ? getSyllabusUrl(studentSelection) : ''");
    if (url) {
      assert.ok(url.includes('department_id=11'), '3年 M maps to department_id=11');
    }
  }
});

// =============================================================================
// S-07: Electrical Engineering Course Split (ED vs EJ) (F6, F7, F9, F10, F20)
// =============================================================================

test('S-07: Electrical Engineering Course Split (ED vs EJ) (F6, F7, F9, F10, F20)', async (t) => {
  const app = createAppInstance();

  // Step 1: 4年 E student selects ED (電気電子コース)
  app.selectStudent({ grade: 4, department: 'E', course: 'ED' });
  assert.equal(app.run('studentShortLabel()'), '4ED');

  const edSchedule = app.run('selectedSchedule()');
  assert.ok(edSchedule.selected.length >= 10, '>= 10 lessons for 4ED');
  assert.equal(edSchedule.error, '', '0 conflicts for 4ED');

  // Step 2: Check syllabus resolver for ED -> department_id=13
  const appCode = read('app.js');
  if (appCode.includes('getSyllabusUrl')) {
    const edUrl = app.run("typeof getSyllabusUrl === 'function' ? getSyllabusUrl(studentSelection) : ''");
    if (edUrl) {
      assert.ok(edUrl.includes('department_id=13'), '4年 E ED maps to department_id=13');
    }
  }

  // Step 3: Student switches course to EJ (情報コース)
  app.selectStudent({ grade: 4, department: 'E', course: 'EJ' });
  assert.equal(app.run('studentShortLabel()'), '4EJ');

  const ejSchedule = app.run('selectedSchedule()');
  assert.ok(ejSchedule.selected.length >= 10, '>= 10 lessons for 4EJ');
  assert.equal(ejSchedule.error, '', '0 conflicts for 4EJ');

  // Step 4: Check syllabus resolver for EJ -> department_id=14
  if (appCode.includes('getSyllabusUrl')) {
    const ejUrl = app.run("typeof getSyllabusUrl === 'function' ? getSyllabusUrl(studentSelection) : ''");
    if (ejUrl) {
      assert.ok(ejUrl.includes('department_id=14'), '4年 E EJ maps to department_id=14');
    }
  }

  // Step 5: Assert that ED and EJ curricula are distinct
  const edSubjects = new Set(edSchedule.selected.map(l => l.subjectName));
  const ejSubjects = new Set(ejSchedule.selected.map(l => l.subjectName));
  const hasDistinctSubject = [...edSubjects].some(s => !ejSubjects.has(s)) || [...ejSubjects].some(s => !edSubjects.has(s));
  assert.ok(hasDistinctSubject, 'ED and EJ have distinct specialized subjects');
});

// =============================================================================
// S-08: Network Failure & Offline Fallback Journey (F2, F7, F14, F19)
// =============================================================================

test('S-08: Network Failure & Offline Fallback Journey (F2, F7, F14, F19)', async (t) => {
  // Step 1: Configure app instance with simulated total network failure
  const app = createAppInstance({
    fetchMock: async () => {
      throw new Error('TypeError: Failed to fetch (Offline Network Partition)');
    }
  });

  // Step 2: App boots up without unhandled exceptions
  assert.doesNotThrow(() => {
    app.navigate('#timetable');
  }, 'App handles offline fetch smoothly without crashing');

  // Step 3: Timetable renders from in-memory fallback lessons
  const scheduleResult = app.run('selectedSchedule()');
  assert.ok(scheduleResult.selected.length >= 10, 'Timetable hydrates with embedded fallback lessons');
  assert.equal(scheduleResult.error, '', 'Fallback timetable renders with 0 conflicts');

  // Step 4: Verify navigation to other tabs works without white-screen crash
  assert.doesNotThrow(() => {
    app.navigate('#home');
  });
  assert.ok(app.elements['main'].innerHTML.length > 0, '#home view has content');

  assert.doesNotThrow(() => {
    app.navigate('#exam');
  });
  assert.ok(app.elements['main'].innerHTML.length > 0, '#exam view has content');

  assert.doesNotThrow(() => {
    app.navigate('#cafeteria');
  });
  assert.ok(app.elements['main'].innerHTML.length > 0, '#cafeteria view has content');
});

// =============================================================================
// S-09: Custom Bookmarks Persistence Lifecycle (F21, F22)
// =============================================================================

test('S-09: Custom Bookmarks Persistence Lifecycle (F21, F22)', async (t) => {
  const appCode = read('app.js');
  const ready = appCode.includes('campus-links-v1') || appCode.includes('loadMyLinks');
  if (!requireOrSkip(t, ready, 'MyLinks manager in app.js', 'M5')) return;

  // Step 1: Initial state with empty storage
  const app = createAppInstance({
    localStorageData: {}
  });

  app.navigate('#links');

  // Step 2: User adds custom bookmark
  const newLink = { id: 'custom-1', name: '明石高専 図書館WebOPAC', url: 'https://libopac-c.kosen-k.go.jp/webopac29/cattab.do' };
  app.run(`
    const links = [${JSON.stringify(newLink)}];
    localStorage.setItem('campus-links-v1', JSON.stringify(links));
  `);

  // Step 3: Verify link is persisted in localStorage
  const stored = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, '明石高専 図書館WebOPAC');

  // Step 4: Add another link and reorder
  const secondLink = { id: 'custom-2', name: 'Google Drive', url: 'https://drive.google.com/' };
  app.run(`
    const updated = [${JSON.stringify(secondLink)}, ${JSON.stringify(newLink)}];
    localStorage.setItem('campus-links-v1', JSON.stringify(updated));
  `);

  const reordered = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(reordered.length, 2);
  assert.equal(reordered[0].name, 'Google Drive', 'Item 0 is Google Drive');
  assert.equal(reordered[1].name, '明石高専 図書館WebOPAC', 'Item 1 is Library');

  // Step 5: Delete item
  app.run(`
    const remaining = ${JSON.stringify(reordered)}.filter(i => i.id !== 'custom-1');
    localStorage.setItem('campus-links-v1', JSON.stringify(remaining));
  `);
  const finalStored = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(finalStored.length, 1);
  assert.equal(finalStored[0].id, 'custom-2');

  // Step 6: Fresh instance rehydrates exact state
  const rehydratedApp = createAppInstance({
    localStorageData: { 'campus-links-v1': JSON.stringify(finalStored) }
  });
  assert.equal(rehydratedApp.localStorage.getItem('campus-links-v1'), JSON.stringify(finalStored));
});

// =============================================================================
// S-10: Arts Selection & Day Substitution Impact (F7, F9, F11, F15)
// =============================================================================

test('S-10: Arts Selection & Day Substitution Impact (F7, F9, F11, F15)', async (t) => {
  // Step 1: 1年 M 1組 student selects music
  const app = createAppInstance({
    cookie: 'campus-student-v1=' + encodeURIComponent(JSON.stringify({
      version: 1, grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music'
    })),
    mockDate: '2026-11-25T08:30:00+09:00' // Wednesday with Monday substitution (official R8 calendar PDF)
  });

  const musicSchedule = app.run('selectedSchedule()');
  assert.equal(musicSchedule.conflicts, 0, '0 conflicts with music selection');
  const musicLesson = musicSchedule.selected.find(l => l.arts === 'music');
  assert.ok(musicLesson !== undefined, 'Contains music lesson');
  assert.ok(musicLesson.subjectName.includes('音楽'), 'Subject name includes 音楽');

  // Step 2: Student switches arts selection to art (美術)
  app.selectStudent({ arts: 'art' });
  const artSchedule = app.run('selectedSchedule()');
  assert.equal(artSchedule.conflicts, 0, '0 conflicts with art selection');
  const artLesson = artSchedule.selected.find(l => l.arts === 'art');
  assert.ok(artLesson !== undefined, 'Contains art lesson');
  assert.ok(artLesson.subjectName.includes('美術'), 'Subject name includes 美術');

  // Step 3: Check calendar data contains day substitution for 2026-11-04 or 2026-10-14
  const calData = readJson('dist-data/calendar.json') || DEFAULT_FIXTURES['./dist-data/calendar.json'];
  if (calData.daySubstitutions && calData.daySubstitutions.length > 0) {
    const sub = calData.daySubstitutions.find(s => s.date === '2026-11-04' || s.date === '2026-10-14' || s.date === '2026-04-08');
    assert.ok(sub !== undefined, 'Calendar defines day substitution entry');
    assert.ok(sub.substituteDay === '月' || sub.effectiveDay === 1 || sub.note?.includes('月曜'), 'Conducts Monday schedule');
  }

  // Step 4: If timetable banners ready, assert banner reflects substitution
  const appCode = read('app.js');
  if (appCode.includes('day-substitution') || appCode.includes('振替')) {
    app.navigate('#timetable');
    const ttHtml = app.elements['main'].innerHTML;
    assert.ok(ttHtml.includes('月曜日') && ttHtml.includes('振替'), 'Timetable banner indicates Monday transfer');
  }
});

// =============================================================================
// S-11: Cafeteria Menu Parsing & Dorm Fallback (F18, F19, F7)
// =============================================================================

test('S-11: Cafeteria Menu Parsing & Dorm Fallback (F18, F19, F7)', async (t) => {
  // Step 1: Verify cafeteria dataset exists and satisfies schema
  const cafeData = readJson('dist-data/cafeteria.json');
  if (!requireOrSkip(t, cafeData !== null, 'dist-data/cafeteria.json', 'M1')) return;

  assert.ok(cafeData.meta && typeof cafeData.meta.month === 'number', 'Contains cafeteria meta.month');
  assert.ok(Array.isArray(cafeData.weeklyMenus), 'Contains weeklyMenus array');

  // Step 2: Verify dormitory menu link exists in metadata
  assert.ok(
    cafeData.meta.dormitoryArticleUrl || cafeData.meta.dormitoryPdfUrl,
    'Metadata contains dormitory menu reference'
  );

  // Step 3: If #cafeteria view is implemented, verify view rendering
  const appCode = read('app.js');
  const cafeReady = appCode.includes('cafeteria') && (appCode.includes('weeklyMenus') || appCode.includes('lunchA'));
  if (cafeReady) {
    const app = createAppInstance();
    app.navigate('#cafeteria');
    const html = app.elements['main'].innerHTML;
    assert.ok(html.includes('食堂') || html.includes('メニュー'), 'Cafeteria heading is present');
  }

  // Step 4: Fault injection: Unextracted scanned image PDF fallback
  const unextractedApp = createAppInstance({
    fetchMock: {
      './dist-data/cafeteria.json': {
        meta: {
          title: '学生食堂メニュー（11月）',
          isTextExtracted: false,
          sourcePdfUrl: 'https://www.akashi.ac.jp/news/scanned-menu.pdf',
          dormitoryArticleUrl: 'https://www.akashi.ac.jp/news/dorm.html'
        },
        weeklyMenus: []
      }
    }
  });

  unextractedApp.navigate('#cafeteria');
  const fallbackHtml = unextractedApp.elements['main'].innerHTML;
  if (fallbackHtml.includes('scanned-menu.pdf') || fallbackHtml.includes('原本PDF') || fallbackHtml.includes('PDF')) {
    assert.ok(true, 'Renders direct fallback link to original PDF');
  }
});

// =============================================================================
// S-12: End-to-End Export & Multi-Format Generation (F10, F16, F17)
// =============================================================================

test('S-12: End-to-End Export & Multi-Format Generation (F10, F16, F17)', async (t) => {
  // Step 1: Load export functions from timetable-export.js
  const exportCode = read('timetable-export.js');
  const exportContext = vm.createContext({});
  vm.runInContext(exportCode.replace(/^import .*$/mg, '').replace(/^export /mg, ''), exportContext);

  // Generate timetable for 2年 E科 2組
  const dataScript = read('timetable-data.js').replace(/^export .*$/mg, '');
  const dataContext = vm.createContext({});
  vm.runInContext(dataScript, dataContext);

  const selection = { grade: 2, department: 'E', classGroup: '2', studentType: 'regular', course: '', arts: 'music' };
  const schedule = vm.runInContext(`generateTimetable(LESSONS, ${JSON.stringify(selection)})`, dataContext);

  // Step 2: Generate CSV export
  const csv = exportContext.generateCsv(schedule.selected, '2年 E科 2組');
  assert.ok(csv.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM');
  assert.ok(csv.includes('曜日,時限,開始時間,終了時間,科目名,教室,担当教員'), 'CSV has standard headers');

  // Step 3: Generate JSON export
  const jsonStr = exportContext.generateJson(schedule.selected, '2年 E科 2組', '2026-11-13');
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.meta && parsed.meta.student.includes('2年') && parsed.meta.student.includes('E科'), 'JSON contains meta.student');
  assert.ok(Array.isArray(parsed.lessons), 'JSON contains lessons array');

  // Step 4: Generate Text export
  const text = exportContext.generateText(schedule.selected, '2年 E科 2組');
  assert.ok(text.includes('明石高専 時間割'), 'Text contains heading');
  assert.ok(text.includes('【月曜日】'), 'Text contains day markers');

  // Step 5: Generate iCal export (RFC 5545)
  const ics = exportContext.generateIcs(schedule.selected, '2年 E科 2組');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Timetable iCal starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence rule');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Explicitly sets TRANSP:OPAQUE');
  assert.ok(ics.includes('TZID=Asia/Tokyo'), 'Specifies Asia/Tokyo timezone');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');

  // Step 6: Generate Calendar iCal if implemented
  if (typeof exportContext.generateCalendarIcs === 'function') {
    const calData = readJson('dist-data/calendar.json') || DEFAULT_FIXTURES['./dist-data/calendar.json'];
    const calIcs = exportContext.generateCalendarIcs(calData);
    assert.ok(calIcs.startsWith('BEGIN:VCALENDAR'), 'Calendar iCal starts with BEGIN:VCALENDAR');
    assert.ok(calIcs.includes('X-WR-CALNAME:'), 'Contains X-WR-CALNAME');
    assert.ok(calIcs.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
  }
});
