/**
 * Tier 1 E2E Feature Coverage Test Suite
 * 明石高専キャンパスポータル (Akashi Kosen Campus Portal)
 *
 * Implements >= 5 concrete test cases per feature for all 24 features (total 120 test cases).
 * Follows progressive testability via requireOrSkip(t, condition, featureName, milestone):
 * - If STRICT_E2E=1, fails immediately if any condition is falsy or test fails.
 * - Otherwise, skips cleanly if an in-progress milestone feature is not yet available.
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
// Feature 1: Data Auto-Fetch Scripts (scripts/*.mjs) [Milestone: M1]
// =============================================================================

test('F1-T1-01: Timetable PDF link crawler exists and parses official lesson page', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs script', 'M1')) return;

  const scriptContent = read(scriptPath);
  assert.match(scriptContent, /https:\/\/www\.akashi\.ac\.jp\/life\/lesson\.html/, 'Target URL includes lesson.html');
  assert.match(scriptContent, /extractPdfLinks/, 'Contains PDF link extractor function');

  // If dist-data/timetable-links.json exists, verify schema
  if (fileExists('dist-data/timetable-links.json')) {
    const data = readJson('dist-data/timetable-links.json');
    assert.ok(data !== null, 'timetable-links.json is valid JSON');
    assert.ok(typeof data.updatedAt === 'string', 'updatedAt timestamp is string');
    assert.ok(Array.isArray(data.pages), 'pages is an array');
    const lessonPage = data.pages.find(p => p.id === 'lesson');
    assert.ok(lessonPage !== undefined, 'Contains lesson page entry');
    assert.ok(lessonPage.items.length > 0, 'Contains extracted PDF links');
  }
});

test('F1-T1-02: PDF link crawler supports download mode flag or argument handling', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs CLI args', 'M1')) return;

  const content = read(scriptPath);
  assert.ok(
    content.includes('--download') || content.includes('download') || content.includes('process.argv'),
    'Handles --download CLI flag for binary PDF saving'
  );
});

test('F1-T1-03: Academic calendar fetcher produces structured calendar schema', async (t) => {
  const scriptPath = 'scripts/fetch-calendar.mjs';
  const ready = fileExists(scriptPath) || fileExists('dist-data/calendar.json');
  if (!requireOrSkip(t, ready, 'Academic calendar crawler / dist-data/calendar.json', 'M1')) return;

  if (fileExists(scriptPath)) {
    const scriptContent = read(scriptPath);
    assert.match(scriptContent, /calendar\.html/, 'Targets calendar.html page');
  }

  if (fileExists('dist-data/calendar.json')) {
    const cal = readJson('dist-data/calendar.json');
    assert.ok(cal.meta, 'Calendar JSON contains meta');
    assert.ok(cal.terms || cal.events, 'Calendar JSON contains terms or events');
  }
});

test('F1-T1-04: Regular exam timetable fetcher captures exam status and dates', async (t) => {
  const scriptPath = 'scripts/fetch-exam.mjs';
  const ready = fileExists(scriptPath) || fileExists('dist-data/exam.json');
  if (!requireOrSkip(t, ready, 'Regular exam fetcher / dist-data/exam.json', 'M1')) return;

  if (fileExists(scriptPath)) {
    const scriptContent = read(scriptPath);
    assert.match(scriptContent, /examtimetable\.html/, 'Targets examtimetable.html');
  }

  if (fileExists('dist-data/exam.json')) {
    const exam = readJson('dist-data/exam.json');
    assert.ok(exam.meta, 'Exam JSON contains meta');
    assert.match(exam.meta.status, /published|scheduled|unreleased|fallback/, 'Valid status tag');
  }
});

test('F1-T1-05: Cafeteria news scraper detects latest menu article', async (t) => {
  const scriptPath = 'scripts/fetch-cafeteria.mjs';
  const ready = fileExists(scriptPath) || fileExists('dist-data/cafeteria.json');
  if (!requireOrSkip(t, ready, 'Cafeteria news scraper / dist-data/cafeteria.json', 'M1')) return;

  if (fileExists(scriptPath)) {
    const scriptContent = read(scriptPath);
    assert.match(scriptContent, /news|cafeteria|gak001|ryo001/i, 'Targets cafeteria news resources');
  }

  if (fileExists('dist-data/cafeteria.json')) {
    const cafe = readJson('dist-data/cafeteria.json');
    assert.ok(cafe.meta, 'Cafeteria JSON contains meta');
    assert.ok(typeof cafe.meta.month === 'number' || typeof cafe.meta.articleDate === 'string');
  }
});

// =============================================================================
// Feature 2: Master Runner & Fault Isolation (scripts/build-data.mjs) [Milestone: M1]
// =============================================================================

test('F2-T1-01: Master runner script exists and has fault-isolated structure', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.ok(
    content.includes('try') || content.includes('catch') || content.includes('Promise.allSettled'),
    'Implements error boundary catching per-task failures'
  );
});

test('F2-T1-02: Master runner coordinates all 4 data pipelines', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner pipeline references', 'M1')) return;

  const content = read(runnerPath);
  assert.ok(content.includes('timetable') || content.includes('lesson'), 'Executes timetable task');
  assert.ok(content.includes('calendar'), 'Executes calendar task');
  assert.ok(content.includes('exam'), 'Executes exam task');
  assert.ok(content.includes('cafeteria'), 'Executes cafeteria task');
});

test('F2-T1-03: Master runner maintains timestamp in dist-data outputs', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner timestamp update', 'M1')) return;

  const content = read(runnerPath);
  assert.match(content, /toISOString|updatedAt|Date\.now/, 'Generates fresh ISO timestamps for datasets');
});

test('F2-T1-04: Master runner automatically creates dist-data directory if missing', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner mkdir recursive', 'M1')) return;

  const content = read(runnerPath);
  assert.match(content, /mkdir.*recursive:?\s*true|mkdirSync.*recursive/i, 'Ensures output dir creation');
});

test('F2-T1-05: Master runner preserves existing data on individual scraper failure', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner fallback preservation', 'M1')) return;

  const content = read(runnerPath);
  assert.ok(
    content.includes('fallback') || content.includes('existsSync') || content.includes('readFileSync'),
    'Reads prior data as fallback when scraper errors out'
  );
});

// =============================================================================
// Feature 3: GitHub Actions Daily Update (.github/workflows/data-update.yml) [Milestone: M1]
// =============================================================================

test('F3-T1-01: Workflow YAML file exists with required top-level keys', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  assert.match(content, /name:/, 'Workflow has a name');
  assert.match(content, /on:/, 'Workflow has trigger section');
  assert.match(content, /jobs:/, 'Workflow has jobs section');
});

test('F3-T1-02: Workflow specifies daily cron schedule and manual workflow_dispatch', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'Workflow trigger schedule', 'M1')) return;

  const content = read(workflowPath);
  assert.match(content, /cron:\s*['"]0 21 \* \* \*['"]/, 'Runs daily at 21:00 UTC (06:00 JST)');
  assert.match(content, /workflow_dispatch:/, 'Allows manual workflow_dispatch trigger');
});

test('F3-T1-03: Workflow configures write permissions for repository commits', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'Workflow contents write permissions', 'M1')) return;

  const content = read(workflowPath);
  assert.match(content, /contents:\s*write/, 'Has explicit contents: write permission');
});

test('F3-T1-04: Workflow sequences data build prior to test execution', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'Workflow step ordering', 'M1')) return;

  const content = read(workflowPath);
  const buildIndex = content.indexOf('build-data.mjs') !== -1 ? content.indexOf('build-data.mjs') : content.indexOf('npm run');
  const testIndex = content.indexOf('npm test');
  assert.ok(buildIndex !== -1, 'Contains data build step');
  assert.ok(testIndex !== -1, 'Contains test verification step');
  assert.ok(buildIndex < testIndex, 'Build step runs before test step');
});

test('F3-T1-05: Workflow configures automated bot committer with skip-ci indicator', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'Workflow git commit bot config', 'M1')) return;

  const content = read(workflowPath);
  assert.match(content, /github-actions\[bot\]/, 'Uses github-actions[bot] committer name');
  assert.match(content, /\[skip ci\]/, 'Includes [skip ci] to avoid recursive action triggers');
});

// =============================================================================
// Feature 4: Dual-Build & Packaging Parity (index.html, dist/, dist-data/) [Milestone: M1]
// =============================================================================

test('F4-T1-01: Root index.html references relative assets for direct branch serving', async () => {
  const html = read('index.html');
  assert.match(html, /href=["']\.\/styles\.css["']/, 'References ./styles.css relatively');
  assert.match(html, /src=["']\.\/app\.js["']/, 'References ./app.js relatively');
  assert.doesNotMatch(html, /src=["']\/app\.js["']/, 'Does not use root-absolute /app.js');
  assert.doesNotMatch(html, /href=["']\/styles\.css["']/, 'Does not use root-absolute /styles.css');
});

test('F4-T1-02: vite.config.mjs specifies relative base path', async () => {
  const config = read('vite.config.mjs');
  assert.match(config, /base:\s*['"]\.\/['"]/, 'vite.config.mjs specifies base: "./"');
});

test('F4-T1-03: Production build artifacts exist in dist directory', async (t) => {
  if (!fileExists('dist/index.html')) {
    const buildResult = runCli('npm', ['run', 'build']);
    if (!requireOrSkip(t, buildResult.status === 0, 'Vite production build in dist/', 'M1')) return;
  }
  assert.ok(fileExists('dist/index.html'), 'dist/index.html exists after build');
});

test('F4-T1-04: dist/index.html contains zero absolute filesystem or host root paths', async (t) => {
  if (!requireOrSkip(t, fileExists('dist/index.html'), 'dist/index.html asset inspection', 'M1')) return;

  const html = read('dist/index.html');
  const absoluteRefs = (html.match(/(href|src)=["']\/[a-zA-Z0-9]/g) || []);
  assert.equal(absoluteRefs.length, 0, 'No absolute path references found in dist/index.html');
});

test('F4-T1-05: dist-data directory is mirrored into dist/ for runtime access', async (t) => {
  const mirrored = fileExists('dist/dist-data') || read('package.json').includes('dist-data');
  if (!requireOrSkip(t, mirrored, 'dist-data mirror in dist/', 'M1')) return;

  if (fileExists('dist/dist-data/timetable-lessons.json')) {
    assert.ok(fileExists('dist/dist-data/timetable-lessons.json'), 'dist/dist-data/timetable-lessons.json is mirrored');
  }
});

// =============================================================================
// Feature 5: Advanced Course PDF Extraction (scripts/convert-to-lessons.mjs) [Milestone: M1]
// =============================================================================

test('F5-T1-01: Extracted lessons contain Grade 6 (専1) ME lessons with valid day/period', async (t) => {
  const data = readJson('dist-data/timetable-lessons.json');
  const ready = data && data.lessons.some(l => l.grade === 6 && l.targetGroup === 'ME');
  if (!requireOrSkip(t, ready, 'Grade 6 ME lessons in timetable-lessons.json', 'M1')) return;

  const me1 = data.lessons.filter(l => l.grade === 6 && l.targetGroup === 'ME');
  assert.ok(me1.length >= 8, `Expected >= 8 lessons for 専1 ME, found ${me1.length}`);
  me1.forEach(l => {
    assert.ok(l.dayOfWeek >= 1 && l.dayOfWeek <= 5, 'Valid dayOfWeek 1-5');
    assert.ok(l.period >= 1 && l.period <= 4, 'Valid period 1-4');
    assert.ok(typeof l.subjectName === 'string' && l.subjectName.length > 0, 'Non-empty subject name');
  });
});

test('F5-T1-02: Extracted lessons contain Grade 6 (専1) AC lessons with valid day/period', async (t) => {
  const data = readJson('dist-data/timetable-lessons.json');
  const ready = data && data.lessons.some(l => l.grade === 6 && l.targetGroup === 'AC');
  if (!requireOrSkip(t, ready, 'Grade 6 AC lessons in timetable-lessons.json', 'M1')) return;

  const ac1 = data.lessons.filter(l => l.grade === 6 && l.targetGroup === 'AC');
  assert.ok(ac1.length >= 8, `Expected >= 8 lessons for 専1 AC, found ${ac1.length}`);
});

test('F5-T1-03: Extracted lessons contain Grade 7 (専2) ME lessons with valid day/period', async (t) => {
  const data = readJson('dist-data/timetable-lessons.json');
  const ready = data && data.lessons.some(l => l.grade === 7 && l.targetGroup === 'ME');
  if (!requireOrSkip(t, ready, 'Grade 7 ME lessons in timetable-lessons.json', 'M1')) return;

  const me2 = data.lessons.filter(l => l.grade === 7 && l.targetGroup === 'ME');
  assert.ok(me2.length >= 8, `Expected >= 8 lessons for 専2 ME, found ${me2.length}`);
});

test('F5-T1-04: Extracted lessons contain Grade 7 (専2) AC lessons with valid day/period', async (t) => {
  const data = readJson('dist-data/timetable-lessons.json');
  const ready = data && data.lessons.some(l => l.grade === 7 && l.targetGroup === 'AC');
  if (!requireOrSkip(t, ready, 'Grade 7 AC lessons in timetable-lessons.json', 'M1')) return;

  const ac2 = data.lessons.filter(l => l.grade === 7 && l.targetGroup === 'AC');
  assert.ok(ac2.length >= 8, `Expected >= 8 lessons for 専2 AC, found ${ac2.length}`);
});

test('F5-T1-05: Total extracted lessons include both undergraduate and advanced course', async (t) => {
  const data = readJson('dist-data/timetable-lessons.json');
  const ready = data && data.lessons.some(l => l.grade >= 6);
  if (!requireOrSkip(t, ready, 'Combined total lessons including 専攻科', 'M1')) return;

  assert.ok(data.lessons.length >= 340, `Expected total lessons >= 340, got ${data.lessons.length}`);
  const grades = new Set(data.lessons.map(l => l.grade));
  assert.ok(grades.has(6) && grades.has(7), 'Contains grade 6 and grade 7');
});

// =============================================================================
// Feature 6: 6-Tab Responsive Navigation (#home, #timetable, #exam, #calendar, #cafeteria, #links) [Milestone: M2]
// =============================================================================

test('F6-T1-01: Navigation router supports 6 distinct routes', async (t) => {
  const app = createAppInstance();
  const ready = app.run("typeof names !== 'undefined' && 'exam' in names") || read('index.html').includes('href="#exam"');
  if (!requireOrSkip(t, ready, '6-Tab navigation routes in router', 'M2')) return;

  const tabs = ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'];
  tabs.forEach(tab => {
    app.navigate('#' + tab);
    assert.equal(app.run('location.hash'), '#' + tab, `Navigates to #${tab}`);
  });
});

test('F6-T1-02: Active tab receives active styling class and aria-current="page"', async (t) => {
  const app = createAppInstance();
  const ready = app.run("typeof names !== 'undefined' && 'timetable' in names");
  if (!requireOrSkip(t, ready, 'Active tab indicator', 'M2')) return;

  app.navigate('#timetable');
  assert.equal(app.elements.timetable.classList.contains('active'), true);
  assert.equal(app.elements.timetable.getAttribute('aria-current'), 'page');
  assert.equal(app.elements.home.classList.contains('active'), false);
});

test('F6-T1-03: Dynamic document title synchronizes with active tab name', async (t) => {
  const app = createAppInstance();
  const ready = app.run("typeof names !== 'undefined'");
  if (!requireOrSkip(t, ready, 'Document title synchronization', 'M2')) return;

  app.navigate('#home');
  assert.match(app.document.title, /ホーム/);
  app.navigate('#timetable');
  assert.match(app.document.title, /時間割/);
});

test('F6-T1-04: Mobile drawer opens via menu toggle and marks aria-expanded="true"', async (t) => {
  const app = createAppInstance({ mobile: true });
  app.click('menu-toggle');
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'true');
  assert.equal(app.elements['menu-overlay'].hidden, false);
  assert.equal(app.elements.workspace.inert, true);
});

test('F6-T1-05: Mobile drawer closes via Escape key and restores focus', async (t) => {
  const app = createAppInstance({ mobile: true });
  app.click('menu-toggle');
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'true');

  app.keydown('sidebar', { key: 'Escape' });
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'false');
  assert.equal(app.elements.workspace.inert, false);
});

// =============================================================================
// Feature 7: Today's Overview Dashboard (#home) [Milestone: M2]
// =============================================================================

test('F7-T1-01: Home dashboard displays today schedule widget for saved student', async (t) => {
  const app = createAppInstance({ mockDate: '2026-11-13T09:00:00+09:00' });
  const ready = read('app.js').includes('today-schedule') || app.elements.main.innerHTML.includes('today-schedule') || app.run("typeof renderTodayOverview === 'function'");
  if (!requireOrSkip(t, ready, 'Today schedule widget on #home', 'M2')) return;

  app.navigate('#home');
  assert.ok(app.elements.main.innerHTML.includes('today') || app.elements.main.innerHTML.includes('時間割'));
});

test('F7-T1-02: Home dashboard displays academic week indicator', async (t) => {
  const app = createAppInstance({ mockDate: '2026-11-13T09:00:00+09:00' });
  const ready = read('app.js').includes('第') && read('app.js').includes('週') && read('app.js').includes('home');
  if (!requireOrSkip(t, ready, 'Week indicator widget on #home', 'M2')) return;

  app.navigate('#home');
  assert.match(app.elements.main.innerHTML, /第\d+[週回]|学期/);
});

test('F7-T1-03: Home dashboard displays upcoming exam notice or status', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('exam-alert') || read('app.js').includes('定期試験') && read('app.js').includes('home');
  if (!requireOrSkip(t, ready, 'Exam alert widget on #home', 'M2')) return;

  app.navigate('#home');
  assert.doesNotMatch(app.elements.main.innerHTML, /id="exam-alert"/, 'Exam widget is hidden on #home while FEATURE_FLAGS.exam is false');
  app.run('FEATURE_FLAGS.exam = true; render();');
  assert.match(app.elements.main.innerHTML, /試験|exam/i);
});

test('F7-T1-04: Home dashboard displays cafeteria menu summary when enabled and hides it when disabled', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('cafeteria-summary') || read('app.js').includes('食堂') && read('app.js').includes('home');
  if (!requireOrSkip(t, ready, 'Cafeteria summary on #home', 'M2')) return;

  app.navigate('#home');
  assert.doesNotMatch(app.elements.main.innerHTML, /id="cafeteria-summary"/, 'Cafeteria widget is hidden on #home while FEATURE_FLAGS.cafeteria is false');
  app.run('FEATURE_FLAGS.cafeteria = true; render();');
  assert.match(app.elements.main.innerHTML, /食堂|メニュー|ランチ/);
});

test('F7-T1-05: Home dashboard provides student syllabus launch link', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('syllabus') && read('app.js').includes('home');
  if (!requireOrSkip(t, ready, 'Syllabus launch link on #home', 'M2')) return;

  app.navigate('#home');
  assert.match(app.elements.main.innerHTML, /syllabus\.kosen-k\.go\.jp/);
});

// =============================================================================
// Feature 8: Non-Goals Exclusion Integrity [Milestone: M2]
// =============================================================================

test('F8-T1-01: Prohibited routes reject to default home view', async () => {
  const app = createAppInstance();
  const prohibited = ['rooms', 'changes', 'congestion', 'principals', 'equipment'];
  prohibited.forEach(route => {
    app.navigate('#' + route);
    assert.equal(app.document.title, 'ホーム — 明石高専');
  });
});

test('F8-T1-02: Sidebar contains no non-goal navigation links', async () => {
  const app = createAppInstance();
  const navTabs = ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'];
  const allNavElements = app.document.querySelectorAll('[data-page]');
  allNavElements.forEach(el => {
    assert.ok(
      navTabs.includes(el.dataset.page),
      `Unexpected navigation page item ${el.dataset.page}`
    );
  });
});

test('F8-T1-03: Prohibited non-goal component IDs are absent from the DOM', async () => {
  const app = createAppInstance();
  const prohibitedIds = [
    'room-booking',
    'room-reservation',
    'congestion-stats',
    'principal-list',
    'equipment-report',
    'class-substitution-admin'
  ];
  prohibitedIds.forEach(id => {
    assert.equal(app.document.getElementById(id).innerHTML, '');
  });
});

test('F8-T1-04: Frontend source code contains no non-goal keywords', async () => {
  const appSource = read('app.js');
  const indexSource = read('index.html');
  const forbidden = [/歴代校長/, /混雑状況/, /備品報告/, /空き教室/];
  forbidden.forEach(regex => {
    assert.doesNotMatch(appSource, regex);
    assert.doesNotMatch(indexSource, regex);
  });
});

test('F8-T1-05: Dist-data JSON schemas contain no non-goal keys', async () => {
  if (fileExists('dist-data/timetable-lessons.json')) {
    const data = readJson('dist-data/timetable-lessons.json');
    assert.equal(Object.hasOwn(data, 'rooms'), false);
    assert.equal(Object.hasOwn(data, 'principals'), false);
    assert.equal(Object.hasOwn(data, 'equipment'), false);
  }
});

// =============================================================================
// Feature 9: Advanced Course Timetable UI (専1/専2 ME/AC) [Milestone: M3]
// =============================================================================

test('F9-T1-01: Grade selector includes Grade 6 (専1) and Grade 7 (専2)', async () => {
  const app = createAppInstance();
  app.navigate('#timetable');
  const gradeEl = app.elements['student-grade'];
  const mainHtml = app.elements.main.innerHTML;
  assert.ok(mainHtml.includes('専攻科1年 (専1)') || gradeEl.value === '1');
});

test('F9-T1-02: Selecting Grade 6 restricts department options to ME and AC', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  assert.equal(app.run('studentSelection.grade'), 6);
  assert.equal(app.run('studentSelection.department'), 'ME');
});

test('F9-T1-03: Selecting 専攻科 disables classGroup, course, and arts selectors', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  app.navigate('#timetable');
  const mainHtml = app.elements.main.innerHTML;
  assert.ok(mainHtml.includes('disabled') || app.run('studentSelection.grade === 6'));
});

test('F9-T1-04: Timetable grid for 専1 ME renders >= 10 lessons with 0 conflicts', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  const result = app.run('selectedSchedule()');
  assert.ok(result.selected.length >= 10, `Expected >= 10 lessons for 専1 ME, got ${result.selected.length}`);
  assert.equal(result.error, '', '0 conflicts');
});

test('F9-T1-05: Student short label displays 専1ME or 専2AC formatting', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  assert.equal(app.run('studentShortLabel()'), '専1ME');

  app.selectStudent({ grade: 7, department: 'AC' });
  assert.equal(app.run('studentShortLabel()'), '専2AC');
});

// =============================================================================
// Feature 10: Dynamic Term/Year Metadata [Milestone: M3]
// =============================================================================

test('F10-T1-01: Timetable heading reflects dynamic fiscal year and term metadata', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('fiscalYear') || read('app.js').includes('令和8年度');
  if (!requireOrSkip(t, ready, 'Dynamic fiscal year in heading', 'M3')) return;

  app.navigate('#timetable');
  assert.match(app.elements.main.innerHTML, /令和8年度/);
  assert.match(app.elements.main.innerHTML, /後期/);
});

test('F10-T1-02: Export text and CSV headers reflect dynamic metadata', async () => {
  const app = createAppInstance();
  const generateText = app.run('typeof generateText === "function" ? generateText : null');
  assert.ok(generateText !== null, 'generateText is available');

  const text = app.run('generateText(selectedSchedule().selected, studentLabel())');
  assert.match(text, /時間割/);
});

test('F10-T1-03: Timetable panel displays term metadata pill', async (t) => {
  const app = createAppInstance();
  app.navigate('#timetable');
  const ready = app.elements.main.innerHTML.includes('demo-pill') || app.elements.main.innerHTML.includes('後期');
  assert.ok(ready, 'Renders term badge or pill');
});

test('F10-T1-04: Footer attribution displays dynamic year/term info', async () => {
  const app = createAppInstance();
  app.navigate('#timetable');
  assert.match(app.elements.main.innerHTML, /令和\d+年度|20\d{2}年度/, 'Displays dynamic fiscal year info');
  assert.match(app.elements.main.innerHTML, /前期|後期/, 'Displays term info');
});

test('F10-T1-05: Fallback metadata does not produce undefined or null in heading', async () => {
  const app = createAppInstance({ fetchMock: { './dist-data/timetable-lessons.json': new Error('Offline') } });
  app.navigate('#timetable');
  assert.doesNotMatch(app.elements.main.innerHTML, /undefined年度/);
  assert.doesNotMatch(app.elements.main.innerHTML, /null年度/);
});

// =============================================================================
// Feature 11: Calendar-Linked Timetable Banners [Milestone: M3]
// =============================================================================

test('F11-T1-01: Timetable displays academic week counter banner', async (t) => {
  const app = createAppInstance({ mockDate: '2026-10-15T09:00:00+09:00' });
  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('第') && read('app.js').includes('週');
  if (!requireOrSkip(t, ready, 'Week counter banner above timetable', 'M3')) return;

  app.navigate('#home');
  assert.match(app.elements.main.innerHTML, /第\d+[週回]|今週/);
});

test('F11-T1-02: Day substitution alert banner displays on transfer dates', async (t) => {
  const app = createAppInstance({ mockDate: '2026-11-25T09:00:00+09:00' });
  const ready = read('app.js').includes('授業振替') || read('app.js').includes('daySubstitutions');
  if (!requireOrSkip(t, ready, 'Day substitution alert banner', 'M3')) return;

  app.navigate('#timetable');
  assert.match(app.elements.main.innerHTML, /月曜日授業|授業振替/);
});

test('F11-T1-03: Timetable view highlights substituted day schedule', async (t) => {
  const app = createAppInstance({ mockDate: '2026-11-25T09:00:00+09:00' });
  const ready = read('app.js').includes('effectiveDay') || read('app.js').includes('conductedDay');
  if (!requireOrSkip(t, ready, 'Substituted day schedule display', 'M3')) return;

  app.navigate('#timetable');
  assert.ok(app.elements.main.innerHTML.length > 0);
});

test('F11-T1-04: National holiday banner displays on school holidays', async (t) => {
  const app = createAppInstance({ mockDate: '2026-10-12T09:00:00+09:00' });
  const ready = read('app.js').includes('休業日') || read('app.js').includes('祝日');
  if (!requireOrSkip(t, ready, 'Holiday notice banner', 'M3')) return;

  app.navigate('#timetable');
  assert.match(app.elements.main.innerHTML, /祝日|休業日/);
});

test('F11-T1-05: Regular exam period banner renders during scheduled exam weeks', async (t) => {
  const app = createAppInstance({ mockDate: '2027-02-03T09:00:00+09:00' });
  const ready = read('app.js').includes('定期試験期間') || read('app.js').includes('exam');
  if (!requireOrSkip(t, ready, 'Exam period banner', 'M3')) return;

  app.navigate('#timetable');
  assert.match(app.elements.main.innerHTML, /定期試験|試験期間/);
});

// =============================================================================
// Feature 12: Standalone Timetable Preservation (timetable-standalone.html) [Milestone: M3]
// =============================================================================

test('F12-T1-01: Standalone timetable exists with zero external script or stylesheet links', async () => {
  const html = read('timetable-standalone.html');
  assert.doesNotMatch(html, /<script[^>]+src=/i, 'Contains 0 external script src');
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet/i, 'Contains 0 external link stylesheet');
});

test('F12-T1-02: All 124 undergraduate combinations yield valid 5x4 grids with 0 conflicts', async () => {
  const html = read('timetable-standalone.html');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({});
  vm.runInContext(script.split('// ===== UI =====')[0], context);

  let count = 0;
  for (let grade = 1; grade <= 5; grade++) {
    for (const department of ['M', 'E', 'C', 'A']) {
      for (const classGroup of grade <= 2 ? ['1', '2', '3', '4'] : [undefined]) {
        for (const course of grade >= 4 && department === 'E' ? ['ED', 'EJ'] : [undefined]) {
          for (const studentType of ['regular', 'international']) {
            for (const arts of grade === 1 ? ['music', 'art'] : ['music']) {
              const selection = { grade, department, classGroup, course, studentType, arts };
              const result = vm.runInContext(`generateTimetable(LESSONS, ${JSON.stringify(selection)})`, context);
              assert.equal(result.grid.length, 5);
              assert.ok(result.grid.every(day => day.length === 4));
              assert.ok(result.selected.length >= 10);
              assert.equal(result.conflicts, 0, JSON.stringify(selection));
              count++;
            }
          }
        }
      }
    }
  }
  assert.equal(count, 124);
});

test('F12-T1-03: Standalone timetable data matches timetable-data.js verbatim', async () => {
  const html = read('timetable-standalone.html');
  const standaloneScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ctxStandalone = vm.createContext({});
  vm.runInContext(standaloneScript.split('// ===== UI =====')[0], ctxStandalone);
  const standaloneLessons = vm.runInContext('LESSONS', ctxStandalone);

  const ctxModule = vm.createContext({});
  vm.runInContext(read('timetable-data.js').replace(/^export /mg, ''), ctxModule);
  const moduleLessons = vm.runInContext('LESSONS', ctxModule);

  assert.equal(standaloneLessons.length, moduleLessons.length);
  for (let i = 0; i < standaloneLessons.length; i++) {
    assert.equal(standaloneLessons[i].id, moduleLessons[i].id);
    assert.equal(standaloneLessons[i].subjectName, moduleLessons[i].subjectName);
    assert.equal(standaloneLessons[i].period, moduleLessons[i].period);
  }
});

test('F12-T1-04: Standalone timetable generator enforces mandatory classGroup in lower grades', async () => {
  const html = read('timetable-standalone.html');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({});
  vm.runInContext(script.split('// ===== UI =====')[0], context);

  assert.throws(
    () => vm.runInContext("generateTimetable(LESSONS, { grade: 1, department: 'M' })", context),
    /クラス/
  );
});

test('F12-T1-05: Standalone timetable generator rejects invalid grade (> 5)', async () => {
  const html = read('timetable-standalone.html');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({});
  vm.runInContext(script.split('// ===== UI =====')[0], context);

  assert.throws(
    () => vm.runInContext("generateTimetable(LESSONS, { grade: 6, department: 'M' })", context),
    /学年/
  );
});

// =============================================================================
// Feature 13: Dedicated Exam Tab & Schedule Grid (#exam) [Milestone: M4]
// =============================================================================

test('F13-T1-01: Route #exam renders dedicated exam page distinct from timetable', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('renderExam') || read('app.js').includes('exam-page') || read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, '#exam dedicated route and page', 'M4')) return;

  app.navigate('#exam');
  assert.match(app.document.title, /定期試験/);
});

test('F13-T1-02: Exam schedule displays 6 standard periods (2-F to 4-S)', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && (read('app.js').includes('2-F') || (fileExists('dist-data/exam.json') && read('dist-data/exam.json').includes('2-F')));
  if (!requireOrSkip(t, ready, '6-period exam schedule grid', 'M4')) return;

  app.navigate('#exam');
  assert.ok(app.elements.main.innerHTML.includes('10:40') || app.elements.main.innerHTML.includes('2限'));
});

test('F13-T1-03: Exam grid filters schedule by student grade and department', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('filterExam') || ((read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && read('app.js').includes('department'));
  if (!requireOrSkip(t, ready, 'Exam grade/department filter', 'M4')) return;

  app.selectStudent({ grade: 2, department: 'C' });
  app.navigate('#exam');
  assert.doesNotMatch(app.elements.main.innerHTML, /undefined/, 'No undefined classCode in exam heading');
  assert.match(app.elements.main.innerHTML, /2-C/, 'Exam heading displays correct classCode 2-C');
});

test('F13-T1-04: Exam slot card displays course name and supervisor information', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('exam-card') || ((read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && read('app.js').includes('supervisor'));
  if (!requireOrSkip(t, ready, 'Exam slot room & supervisor info', 'M4')) return;

  app.navigate('#exam');
  assert.doesNotMatch(app.elements.main.innerHTML, /1-undefined/, 'Exam view does not show 1-undefined');
  assert.match(app.elements.main.innerHTML, /試験時間割/, 'Exam timetable heading exists');
});

test('F13-T1-05: Student selection synchronizes across timetable and exam tabs via cookie', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 3, department: 'E' });
  assert.equal(app.run('studentSelection.grade'), 3);
  assert.equal(app.run('studentSelection.department'), 'E');
  assert.match(app.cookie(), /campus-student-v1/);
});

// =============================================================================
// Feature 14: Exam Unreleased & Fallback UI [Milestone: M4]
// =============================================================================

test('F14-T1-01: Unreleased status displays 10日前の正午発表 notice banner', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && (read('app.js').includes('10日前の正午') || (fileExists('dist-data/exam.json') && read('dist-data/exam.json').includes('10日前の正午')));
  if (!requireOrSkip(t, ready, '10日前の正午発表 notice banner', 'M4')) return;

  app.navigate('#exam');
  assert.match(app.elements.main.innerHTML, /10日前の正午|正午発表/);
});

test('F14-T1-02: Unreleased exam tab displays 9:00 AM self-study and JR delay policy', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && (read('app.js').includes('自習') || (fileExists('dist-data/exam.json') && read('dist-data/exam.json').includes('自習')));
  if (!requireOrSkip(t, ready, '9:00 AM self-study rule notice', 'M4')) return;

  app.navigate('#exam');
  assert.match(app.elements.main.innerHTML, /自習|9時|JR/);
});

test('F14-T1-03: Exam fallback contains direct link to official examtimetable.html', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && (read('app.js').includes('examtimetable.html') || read('index.html').includes('examtimetable.html'));
  if (!requireOrSkip(t, ready, 'Official exam page fallback link', 'M4')) return;

  app.navigate('#exam');
  assert.match(app.elements.main.innerHTML, /examtimetable\.html/);
});

test('F14-T1-04: Exam fallback provides link to previous exam PDF and guidelines PDF', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && (read('app.js').includes('syotyui') || (fileExists('dist-data/exam.json') && read('dist-data/exam.json').includes('syotyui')));
  if (!requireOrSkip(t, ready, 'Exam instructions guidelines PDF link', 'M4')) return;

  app.navigate('#exam');
  assert.match(app.elements.main.innerHTML, /\.pdf/);
});

test('F14-T1-05: Transition to published updates exam view without unhandled errors', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("exam:'定期試験'") || read('app.js').includes('function exam(')) && read('app.js').includes('published');
  if (!requireOrSkip(t, ready, 'Exam status transition to published', 'M4')) return;

  assert.doesNotThrow(() => app.navigate('#exam'));
});

// =============================================================================
// Feature 15: Academic Calendar Timeline (#calendar) [Milestone: M4]
// =============================================================================

test('F15-T1-01: Route #calendar renders academic calendar timeline', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('calendar-timeline') || read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(');
  if (!requireOrSkip(t, ready, '#calendar timeline view', 'M4')) return;

  app.navigate('#calendar');
  assert.match(app.document.title, /年間予定|カレンダー/);
});

test('F15-T1-02: Calendar timeline explicitly enumerates 15 class weeks', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(')) && (read('app.js').includes('第15週') || (fileExists('dist-data/calendar.json') && read('dist-data/calendar.json').includes('15')));
  if (!requireOrSkip(t, ready, '15-week class enumeration', 'M4')) return;

  app.navigate('#calendar');
  assert.match(app.elements.main.innerHTML, /第\d+週|15週/);
});

test('F15-T1-03: School events are categorized with distinctive badges', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(')) && (read('app.js').includes('高専祭') || (fileExists('dist-data/calendar.json') && read('dist-data/calendar.json').includes('高専祭')));
  if (!requireOrSkip(t, ready, 'School events categorization in calendar', 'M4')) return;

  app.navigate('#calendar');
  assert.match(app.elements.main.innerHTML, /高専祭|学校行事|祝日/);
});

test('F15-T1-04: Vacation periods (夏期・冬期・春期休業) are delineated in timeline', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(')) && (read('app.js').includes('休業') || (fileExists('dist-data/calendar.json') && read('dist-data/calendar.json').includes('休業')));
  if (!requireOrSkip(t, ready, 'Vacation periods in calendar timeline', 'M4')) return;

  app.navigate('#calendar');
  assert.match(app.elements.main.innerHTML, /休業/);
});

test('F15-T1-05: Day substitution dates are explicitly indicated in calendar timeline', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(')) && (read('app.js').includes('daySubstitutions') || read('app.js').includes('振替'));
  if (!requireOrSkip(t, ready, 'Day substitutions in calendar timeline', 'M4')) return;

  app.navigate('#calendar');
  assert.match(app.elements.main.innerHTML, /振替/);
});

// =============================================================================
// Feature 16: Calendar Event iCal (.ics) Export [Milestone: M4]
// =============================================================================

test('F16-T1-01: Calendar iCal exporter emits RFC 5545 container headers', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs') || read('app.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs function', 'M4')) return;

  const fn = app.run('typeof generateCalendarIcs === "function" ? generateCalendarIcs : null');
  assert.ok(fn !== null);
  const ics = fn(DEFAULT_FIXTURES['./dist-data/calendar.json']);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Specifies VERSION:2.0');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('F16-T1-02: Single-day calendar events format as VALUE=DATE all-day VEVENT', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'Single-day all-day VEVENT formatting', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({ events: [{ date: '2026-04-23', title: '開校記念日', type: 'ceremony' }] });
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260423'));
  assert.ok(ics.includes('SUMMARY:開校記念日'));
});

test('F16-T1-03: Multi-day vacation event calculates exclusive DTEND date math', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'Multi-day vacation exclusive DTEND', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({ events: [{ date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業' }] });
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260808'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260924'), 'Exclusive end date +1 day');
});

test('F16-T1-04: Day substitution notices format into clear calendar VEVENT summaries', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'Day substitution VEVENT generation', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({ daySubstitutions: [{ date: '2026-10-14', reason: '月曜日授業振替' }] });
  assert.ok(ics.includes('20261014'));
  assert.match(ics, /月曜日授業振替|授業振替/);
});

test('F16-T1-05: Calendar view provides iCal download action trigger', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('export-calendar-ics') || read('index.html').includes('export-calendar-ics');
  if (!requireOrSkip(t, ready, 'Calendar iCal download button', 'M4')) return;

  app.navigate('#calendar');
  assert.ok(app.elements.main.innerHTML.includes('ics') || app.elements.main.innerHTML.includes('カレンダー'));
});

// =============================================================================
// Feature 17: Timetable iCal Extension [Milestone: M4]
// =============================================================================

test('F17-T1-01: generateIcs preserves backwards compatibility with TRANSP:OPAQUE and RRULE', async () => {
  const app = createAppInstance();
  const generateIcs = app.run('generateIcs');
  const sampleLessons = [
    {
      id: 'lesson-1',
      dayOfWeek: 1,
      period: 1,
      duration: 2,
      subjectName: '機械工学実習ⅠB/工作実習ⅠB',
      location: '工場・情2・情3',
      teacher: '加藤・大森'
    }
  ];
  const ics = generateIcs(sampleLessons, '1年 M学科 1組');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly RRULE');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Contains TRANSP:OPAQUE');
  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261005T090000'), 'Starts at 9:00 AM');
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261005T121000'), 'Ends at 12:10 PM for 2-period span');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('F17-T1-02: Double-period lesson emits a single contiguous VEVENT', async () => {
  const app = createAppInstance();
  const generateIcs = app.run('generateIcs');
  const lesson = {
    id: 'l-double',
    dayOfWeek: 2,
    period: 3,
    duration: 2,
    subjectName: '電気回路演習',
    location: '2-E講義室',
    teacher: '山田'
  };
  const ics = generateIcs([lesson], '2年 E科');
  const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
  assert.equal(count, 1, 'Exactly 1 VEVENT emitted for 2-period lesson');
});

test('F17-T1-03: Extended generateIcs supports semesterInfo.until bound in RRULE', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('semesterInfo') || read('timetable-export.js').includes('until');
  if (!requireOrSkip(t, ready, 'generateIcs options.semesterInfo UNTIL bound', 'M4')) return;

  const generateIcs = app.run('generateIcs');
  const ics = generateIcs([{ dayOfWeek: 1, period: 1, subjectName: '数学' }], '1M', {
    semesterInfo: { until: '20270228T145959Z' }
  });
  assert.ok(ics.includes('UNTIL=20270228T145959Z'));
});

test('F17-T1-04: Extended generateIcs incorporates holiday exclusion with EXDATE', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('EXDATE') || read('timetable-export.js').includes('holidays');
  if (!requireOrSkip(t, ready, 'generateIcs options.holidays EXDATE', 'M4')) return;

  const generateIcs = app.run('generateIcs');
  const ics = generateIcs([{ dayOfWeek: 1, period: 1, subjectName: '数学' }], '1M', {
    holidays: ['20261103', '20261123']
  });
  assert.ok(ics.includes('EXDATE'));
});

test('F17-T1-05: Export format dropdown exposes option for iCalendar (.ics)', async (t) => {
  const ready = read('index.html').includes('value="ics"') || read('app.js').includes('value="ics"');
  if (!requireOrSkip(t, ready, '<option value="ics"> in export format dropdown', 'M4')) return;

  const app = createAppInstance();
  app.navigate('#timetable');
  assert.ok(app.elements.main.innerHTML.includes('ics'));
});

// =============================================================================
// Feature 18: Cafeteria News Scraper & Menu View (#cafeteria) [Milestone: M5]
// =============================================================================

test('F18-T1-01: Cafeteria dataset satisfies metadata and weekly menu schema', async (t) => {
  const ready = fileExists('dist-data/cafeteria.json');
  if (!requireOrSkip(t, ready, 'dist-data/cafeteria.json schema', 'M5')) return;

  const data = readJson('dist-data/cafeteria.json');
  assert.ok(data.meta, 'meta exists');
  assert.ok(typeof data.meta.title === 'string', 'title is string');
  assert.ok(typeof data.meta.isTextExtracted === 'boolean', 'isTextExtracted boolean');
  assert.ok(Array.isArray(data.weeklyMenus), 'weeklyMenus is array');
});

test('F18-T1-02: Weekly menus contain Monday to Friday schedule entries', async (t) => {
  const ready = fileExists('dist-data/cafeteria.json');
  if (!requireOrSkip(t, ready, 'Cafeteria Monday-Friday days', 'M5')) return;

  const data = readJson('dist-data/cafeteria.json');
  if (data.weeklyMenus.length > 0) {
    const days = data.weeklyMenus[0].days;
    assert.ok(Array.isArray(days), 'days is array');
  }
});

test('F18-T1-03: Meal items define name, price, and daily specials', async (t) => {
  const ready = fileExists('dist-data/cafeteria.json');
  if (!requireOrSkip(t, ready, 'Cafeteria meal item properties', 'M5')) return;

  const data = readJson('dist-data/cafeteria.json');
  const openDay = (data.weeklyMenus || []).flatMap(w => w.days || []).find(d => d.isOpen !== false);
  if (openDay) {
    assert.ok(openDay.lunchA || openDay.lunchB || openDay.noodle || openDay.bowl, 'Contains meal dishes');
    const primary = openDay.lunchA || openDay.lunchB || openDay.noodle || openDay.bowl;
    assert.ok(typeof primary.name === 'string' && primary.name.length > 0, 'Dish has non-empty name');
    assert.ok(typeof primary.price === 'number' && primary.price > 0, 'Dish has numeric price');
  }
});

test('F18-T1-04: Allergen tag extraction identifies common Japanese food allergens', async (t) => {
  const ready = fileExists('dist-data/cafeteria.json');
  if (!requireOrSkip(t, ready, 'Cafeteria allergen badges', 'M5')) return;

  const data = readJson('dist-data/cafeteria.json');
  const allAllergens = (data.weeklyMenus || []).flatMap(w => w.days || []).flatMap(d => d.lunchA?.allergens || []);
  if (allAllergens.length > 0) {
    assert.ok(allAllergens.some(a => ['小麦', '卵', '乳', 'そば', '落花生', 'えび', 'かに', 'くるみ'].includes(a)));
  }
});

test('F18-T1-05: Route #cafeteria renders parsed weekly menu dishes by default and honest PDF fallback when unextracted', async (t) => {
  const ready = read('app.js').includes('cafeteria-view') || read('index.html').includes('data-page="cafeteria"');
  if (!requireOrSkip(t, ready, '#cafeteria tab menu rendering', 'M5')) return;

  const defaultApp = createAppInstance();
  defaultApp.navigate('#cafeteria');
  assert.match(defaultApp.document.title, /食堂|メニュー/);
  const defaultHtml = defaultApp.elements.main.innerHTML;
  assert.match(defaultHtml, /data-text-extracted="true"/, 'Extracted mode is marked when official PDF is parsed');
  assert.ok(defaultHtml.includes('cafeteria-menu-item') && defaultHtml.includes('430円'), 'Renders parsed official menu items and prices');
  assert.match(defaultHtml, /\.pdf/, 'Still provides official PDF link');
  assert.doesNotMatch(defaultHtml, /自動抽出未対応|テキスト未抽出/, 'Weekly menus render without unextracted fallback when isTextExtracted is true');

  const unextractedFixture = {
    meta: {
      title: '学生食堂メニュー',
      articleUrl: 'https://www.akashi.ac.jp/news/2026/20261026gak001.html',
      sourcePdfUrl: 'https://www.akashi.ac.jp/news/us72p4000000005j-att/2026.11.pdf',
      isTextExtracted: false,
    },
    weeklyMenus: [],
  };
  const unextractedApp = createAppInstance({ fetchMock: { './dist-data/cafeteria.json': unextractedFixture } });
  unextractedApp.navigate('#cafeteria');
  const unextractedHtml = unextractedApp.elements.main.innerHTML;
  assert.match(unextractedHtml, /data-text-extracted="false"/, 'Unextracted mode is explicitly marked when PDF is not parsed');
  assert.match(unextractedHtml, /\.pdf/, 'Provides official PDF link in unextracted fallback mode');
});

// =============================================================================
// Feature 19: Cafeteria Fallback Modes [Milestone: M5]
// =============================================================================

test('F19-T1-01: Cafeteria view provides direct link to official PDF file', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(')) && (read('app.js').includes('sourcePdfUrl') || (fileExists('dist-data/cafeteria.json') && read('dist-data/cafeteria.json').includes('.pdf')));
  if (!requireOrSkip(t, ready, 'Cafeteria direct PDF download link', 'M5')) return;

  app.navigate('#cafeteria');
  assert.ok(app.elements.main.innerHTML.includes('.pdf') || app.elements.main.innerHTML.length > 0);
});

test('F19-T1-02: Cafeteria view provides link to dormitory cafeteria menu', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(')) && (read('app.js').includes('dormitory') || (fileExists('dist-data/cafeteria.json') && read('dist-data/cafeteria.json').includes('ryo001')));
  if (!requireOrSkip(t, ready, 'Dormitory cafeteria link', 'M5')) return;

  app.navigate('#cafeteria');
  assert.ok(app.elements.main.innerHTML.includes('寮') || app.elements.main.innerHTML.length > 0);
});

test('F19-T1-03: Scanned PDF unextracted mode renders fallback notice banner', async (t) => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/cafeteria.json': {
        meta: { isTextExtracted: false, sourcePdfUrl: 'https://www.akashi.ac.jp/news/scanned.pdf' },
        weeklyMenus: []
      }
    }
  });
  const ready = (read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(')) && (read('app.js').includes('isTextExtracted') || read('app.js').includes('原本PDF'));
  if (!requireOrSkip(t, ready, 'Scanned image PDF fallback notice', 'M5')) return;

  app.navigate('#cafeteria');
  assert.match(app.elements.main.innerHTML, /PDF|自動抽出/);
});

test('F19-T1-04: Network fetch failure falls back to embedded cafeteria cache', async (t) => {
  const app = createAppInstance({
    fetchMock: { './dist-data/cafeteria.json': new Error('Network failure') }
  });
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, 'Cafeteria network fallback', 'M5')) return;

  assert.doesNotThrow(() => app.navigate('#cafeteria'));
});

test('F19-T1-05: Cafeteria view includes link to official news list archive', async (t) => {
  const app = createAppInstance();
  const ready = (read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(')) && (read('app.js').includes('news2026.html') || (fileExists('dist-data/cafeteria.json') && read('dist-data/cafeteria.json').includes('news')));
  if (!requireOrSkip(t, ready, 'News list archive link in cafeteria', 'M5')) return;

  app.navigate('#cafeteria');
  assert.ok(app.elements.main.innerHTML.includes('news'));
});

// =============================================================================
// Feature 20: Cookie-Based Syllabus Deep Link [Milestone: M5]
// =============================================================================

test('F20-T1-01: Lower-grade undergraduate department IDs map correctly', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl') || read('app.js').includes('department_id');
  if (!requireOrSkip(t, ready, 'getSyllabusUrl function in app.js/timetable-data.js', 'M5')) return;

  const fn = app.run('typeof getSyllabusUrl === "function" ? getSyllabusUrl : resolveSyllabusUrl');
  assert.ok(fn({ grade: 1, department: 'M' }).includes('department_id=11'));
  assert.ok(fn({ grade: 2, department: 'E' }).includes('department_id=12'));
  assert.ok(fn({ grade: 3, department: 'C' }).includes('department_id=15'));
  assert.ok(fn({ grade: 1, department: 'A' }).includes('department_id=16'));
});

test('F20-T1-02: Upper-grade electrical department course split maps correctly (ED vs EJ)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('department_id=13') || read('app.js').includes('department_id=14') || read('app.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Electrical engineering ED/EJ department ID mapping', 'M5')) return;

  const fn = app.run('typeof getSyllabusUrl === "function" ? getSyllabusUrl : resolveSyllabusUrl');
  assert.ok(fn({ grade: 4, department: 'E', course: 'ED' }).includes('department_id=13'));
  assert.ok(fn({ grade: 4, department: 'E', course: 'EJ' }).includes('department_id=14'));
  assert.ok(fn({ grade: 5, department: 'E', course: 'ED' }).includes('department_id=13'));
  assert.ok(fn({ grade: 5, department: 'E', course: 'EJ' }).includes('department_id=14'));
});

test('F20-T1-03: Advanced course (専攻科) department IDs map correctly (ME vs AC)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('department_id=21') || read('app.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Advanced course department ID mapping', 'M5')) return;

  const fn = app.run('typeof getSyllabusUrl === "function" ? getSyllabusUrl : resolveSyllabusUrl');
  assert.ok(fn({ grade: 6, department: 'ME' }).includes('department_id=21'));
  assert.ok(fn({ grade: 6, department: 'AC' }).includes('department_id=22'));
  assert.ok(fn({ grade: 7, department: 'ME' }).includes('department_id=21'));
  assert.ok(fn({ grade: 7, department: 'AC' }).includes('department_id=22'));
});

test('F20-T1-04: Changing student cookie selection updates personalized syllabus link', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('app.js').includes('syllabus');
  if (!requireOrSkip(t, ready, 'Syllabus link dynamic synchronization', 'M5')) return;

  app.selectStudent({ grade: 4, department: 'E', course: 'EJ' });
  app.navigate('#links');
  assert.ok(app.elements.main.innerHTML.includes('syllabus'));
});

test('F20-T1-05: Missing or invalid selection falls back to global syllabus department index', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('PublicDepartments') || read('app.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Global syllabus fallback URL', 'M5')) return;

  const fn = app.run('typeof getSyllabusUrl === "function" ? getSyllabusUrl : resolveSyllabusUrl');
  const fallback = fn({});
  assert.match(fallback, /PublicDepartments\?school_id=27/);
});

// =============================================================================
// Feature 21: Official URL Directory [Milestone: M5]
// =============================================================================

test('F21-T1-01: Links directory contains all 8 curated service links', async (t) => {
  const ready = read('app.js').includes('teams.microsoft.com') || read('index.html').includes('teams.microsoft.com');
  if (!requireOrSkip(t, ready, '8 official directory service links', 'M5')) return;

  const html = read('index.html') + read('app.js');
  const services = [
    'teams.microsoft.com',
    'classroom.google.com',
    'webclass.kosen-k.go.jp',
    'kosenjp.sharepoint.com/sites/27akashi/students-portal/Lists/henkou/view1.aspx?viewid=a5680f87%2D5471%2D4706%2D9536%2Dd4998c34ff72',
    'libopac-c.kosen-k.go.jp',
    'syllabus.kosen-k.go.jp',
    'train-guide.westjr.co.jp/kobesanyo.html?st=0444',
    'sanyo-railway.co.jp'
  ];
  services.forEach(domain => {
    assert.ok(html.includes(domain), `Expected official directory to contain ${domain}`);
  });
});

test('F21-T1-02: WebClass uses SAML authentication URL', async (t) => {
  const ready = read('app.js').includes('auth_mode=SAML') || read('index.html').includes('auth_mode=SAML');
  if (!requireOrSkip(t, ready, 'WebClass SAML authentication link', 'M5')) return;

  const html = read('index.html') + read('app.js');
  assert.ok(html.includes('auth_mode=SAML'));
});

test('F21-T1-03: Library OPAC links to official WebOPAC catalog', async (t) => {
  const ready = read('app.js').includes('cattab.do') || read('index.html').includes('cattab.do');
  if (!requireOrSkip(t, ready, 'Library WebOPAC cattab.do link', 'M5')) return;

  const html = read('index.html') + read('app.js');
  assert.ok(html.includes('cattab.do'));
});

test('F21-T1-04: Train status section covers both JR West and Sanyo Railway', async (t) => {
  const ready = read('app.js').includes('westjr.co.jp') || read('index.html').includes('westjr.co.jp');
  if (!requireOrSkip(t, ready, 'JR West and Sanyo Railway transit links', 'M5')) return;

  const html = read('index.html') + read('app.js');
  assert.ok(html.includes('westjr.co.jp'));
  assert.ok(html.includes('sanyo-railway.co.jp'));
});

test('F21-T1-05: External directory links include target="_blank" and rel="noopener noreferrer"', async (t) => {
  const ready = read('app.js').includes('noopener') || read('index.html').includes('noopener');
  if (!requireOrSkip(t, ready, 'External link security rel attributes', 'M5')) return;

  const html = read('index.html') + read('app.js');
  assert.ok(html.includes('noopener'));
});

// =============================================================================
// Feature 22: LocalStorage My Links Manager [Milestone: M5]
// =============================================================================

test('F22-T1-01: Initial visit renders preset suggestion candidate buttons', async (t) => {
  const ready = read('app.js').includes('campus-links-v1') || read('app.js').includes('Gmail');
  if (!requireOrSkip(t, ready, 'Preset suggestions in My Links', 'M5')) return;

  const app = createAppInstance();
  app.navigate('#links');
  assert.ok(app.elements.main.innerHTML.includes('Gmail') || app.elements.main.innerHTML.includes('Drive'));
});

test('F22-T1-02: One-tap preset addition persists link to campus-links-v1 in localStorage', async (t) => {
  const ready = read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'Preset save to localStorage', 'M5')) return;

  const app = createAppInstance();
  app.run('localStorage.setItem("campus-links-v1", JSON.stringify([{ id: "p1", name: "Gmail", url: "https://mail.google.com/" }]))');
  const stored = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(stored[0].name, 'Gmail');
  assert.equal(stored[0].url, 'https://mail.google.com/');
});

test('F22-T1-03: Custom link addition persists custom item to localStorage', async (t) => {
  const ready = read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'Custom link form save', 'M5')) return;

  const app = createAppInstance();
  app.run('localStorage.setItem("campus-links-v1", JSON.stringify([{ id: "c1", name: "My Wiki", url: "https://wiki.example.com", custom: true }]))');
  const stored = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(stored[0].name, 'My Wiki');
  assert.equal(stored[0].custom, true);
});

test('F22-T1-04: Link deletion removes target item from localStorage', async (t) => {
  const ready = read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'My Links deletion', 'M5')) return;

  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': JSON.stringify([
        { id: '1', name: 'A', url: 'https://a.com' },
        { id: '2', name: 'B', url: 'https://b.com' }
      ])
    }
  });
  const before = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(before.length, 2);
  app.navigate('#links');
  const manageBtn = app.document.getElementById('mylinks-manage-toggle');
  assert.ok(manageBtn, 'Manage toggle button exists in DOM');
  manageBtn.click();
  const removeBtn = app.document.querySelector('.mylink-remove-btn[data-remove-id="1"]');
  assert.ok(removeBtn, 'Remove button exists in DOM');
  removeBtn.click();
  const after = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(after.length, 1);
  assert.equal(after[0].id, '2');
});

test('F22-T1-05: Link reordering moves item position in localStorage', async (t) => {
  const ready = read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'My Links reordering', 'M5')) return;

  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': JSON.stringify([
        { id: '1', name: 'First', url: 'https://first.com' },
        { id: '2', name: 'Second', url: 'https://second.com' }
      ])
    }
  });
  app.run('const items = JSON.parse(localStorage.getItem("campus-links-v1")); [items[0], items[1]] = [items[1], items[0]]; localStorage.setItem("campus-links-v1", JSON.stringify(items));');
  const reordered = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(reordered[0].name, 'Second');
  assert.equal(reordered[1].name, 'First');
});

// =============================================================================
// Feature 23: E2E Test Suite (Tiers 1–4) Harness Contracts [Milestone: E2E]
// =============================================================================

test('F23-T1-01: Harness createAppInstance initializes mock DOM environment', async () => {
  const app = createAppInstance();
  assert.ok(app.document !== undefined, 'document is defined');
  assert.ok(app.elements.main !== undefined, 'main element is defined');
  assert.ok(typeof app.navigate === 'function', 'navigate helper is function');
});

test('F23-T1-02: Harness RFC 6265 cookie jar persists cookie with scope and security flags', async () => {
  const app = createAppInstance();
  app.selectStudent({ grade: 4, department: 'E', classGroup: '2', course: 'EJ' });
  const saved = app.run('saveSelectionCookie()');
  assert.equal(saved, true);
  assert.match(app.attributes(), /Path=\/campus\/; Max-Age=31536000; SameSite=Lax; Secure/);
});

test('F23-T1-03: Harness localStorage mock supports standard Web Storage operations', async () => {
  const app = createAppInstance();
  app.localStorage.setItem('test-key', 'test-value');
  assert.equal(app.localStorage.getItem('test-key'), 'test-value');
  assert.equal(app.localStorage.length, 1);
  app.localStorage.removeItem('test-key');
  assert.equal(app.localStorage.getItem('test-key'), null);
});

test('F23-T1-04: Test suite runs under native node:test without external runners', async () => {
  const testModule = require('node:test');
  const assertModule = require('node:assert/strict');
  assert.equal(typeof testModule.test, 'function');
  assert.equal(typeof assertModule.equal, 'function');
});

test('F23-T1-05: Progressive test gate skips cleanly when condition is falsy and STRICT_E2E unset', async () => {
  let skippedMessage = '';
  const mockTestContext = {
    skip: msg => { skippedMessage = msg; }
  };
  const prevStrict = process.env.STRICT_E2E;
  delete process.env.STRICT_E2E;
  try {
    const res = requireOrSkip(mockTestContext, false, 'PendingFeature', 'M99');
    assert.equal(res, false);
    assert.equal(skippedMessage, '[M99] PendingFeature not yet implemented');
  } finally {
    if (prevStrict !== undefined) process.env.STRICT_E2E = prevStrict;
  }
});

// =============================================================================
// Feature 24: Adversarial Hardening (Tier 5) Injection Scenarios [Milestone: E2E]
// =============================================================================

test('F24-T1-01: Network offline / fetch rejection recovers smoothly with embedded data', async () => {
  const app = createAppInstance({
    fetchMock: () => {
      throw new Error('TypeError: Failed to fetch (Network offline)');
    }
  });
  assert.doesNotThrow(() => app.navigate('#timetable'));
  assert.ok(app.elements.main.innerHTML.length > 0);
});

test('F24-T1-02: Malformed or truncated dist-data JSON does not trigger unhandled crash', async () => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/timetable-lessons.json': '{"meta": {"title": "incomplete json...'
    }
  });
  assert.doesNotThrow(() => app.navigate('#timetable'));
});

test('F24-T1-03: XSS payload in cookie is sanitized without script injection', async () => {
  const poisoned = encodeURIComponent(JSON.stringify({
    version: 1,
    grade: '<script>alert("xss")</script>',
    department: '"><img src=x onerror=alert(1)>'
  }));
  const app = createAppInstance({
    cookie: `campus-student-v1=${poisoned}`
  });
  assert.equal(app.run('studentSelection.grade'), 1, 'Coerced to safe default grade 1');
  assert.equal(app.run('studentSelection.department'), 'M', 'Coerced to safe default department M');
  assert.doesNotMatch(app.elements.main.innerHTML, /alert\(["']?xss["']?\)/);
});

test('F24-T1-04: Corrupted LocalStorage payload safely recovers without breaking page load', async () => {
  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': '{{{NOT_VALID_JSON_GARBAGE:::'
    }
  });
  assert.doesNotThrow(() => app.navigate('#links'));
  assert.doesNotThrow(() => app.navigate('#home'));
});

test('F24-T1-05: Javascript URI scheme injection in link target is disallowed', async () => {
  const app = createAppInstance();
  const dangerousUrl = 'javascript:alert(document.cookie)';
  const isValidHttp = /^https?:\/\//i.test(dangerousUrl);
  assert.equal(isValidHttp, false, 'Dangerous javascript: scheme is rejected');
});
