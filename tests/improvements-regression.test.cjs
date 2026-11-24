/**
 * Regression test suite for v2 bug fixes, responsive/theme improvements, and UX features.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAppInstance, read, readJson, ROOT_DIR } = require('./e2e-harness.cjs');

// =============================================================================
// 1. Theme, Color System, & Manifest Parity
// =============================================================================

test('IMP-01: index.html and portal.html stay identical and link manifest.webmanifest', () => {
  const idx = read('index.html');
  const portal = read('portal.html');
  assert.equal(idx, portal, 'index.html and portal.html must remain byte-for-byte identical');
  assert.match(idx, /<link\s+rel="manifest"\s+href="\.\/manifest\.webmanifest"/);
  assert.match(idx, /<meta\s+name="color-scheme"/);
  assert.match(idx, /<meta\s+name="theme-color"/);
  assert.match(idx, /localStorage\.getItem\('campus-theme'\)/);
});

test('IMP-02: manifest.webmanifest is valid JSON and mirrored by vite.config.mjs', () => {
  const manifestRaw = fs.readFileSync(path.join(ROOT_DIR, 'manifest.webmanifest'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  const viteCfg = read('vite.config.mjs');
  assert.match(viteCfg, /manifest\.webmanifest/);
  assert.match(viteCfg, /dist\/manifest\.webmanifest/);
});

test('IMP-03: styles.css includes dark mode overrides, focus suppression, no size-modal zoom, and print rules', () => {
  const css = read('styles.css');
  assert.match(css, /\[data-theme="dark"\][^}]*color-scheme:\s*dark/);
  assert.match(css, /\[data-theme="dark"\][^}]*background:\s*var\(--bg\)/);
  assert.match(css, /\[data-theme="dark"\]\s*\.alert-info/);
  assert.match(css, /\[data-theme="dark"\]\s*\.badge\.yellow/);
  assert.match(css, /\[data-theme="dark"\]\s*\.badge\.blue/);
  assert.match(css, /\[data-theme="dark"\]\s*\.badge\.rose/);
  assert.match(css, /\[data-theme="dark"\]\s*\.real-timetable\s+thead\s+th:first-child/);
  assert.match(css, /#main:focus\{outline:none\}/);
  assert.match(css, /\.size-paper\.a4-mode\s+\.real-timetable\{height:auto!important\}/);
  assert.doesNotMatch(css, /\.size-paper-wrap[^{]*\{[^}]*zoom\s*:/);
  assert.match(css, /@media print\{[\s\S]*\.toast[\s\S]*display:none!important/);
});

test('IMP-04: 3-way system/light/dark theme cycle and decoupled export theme work independently', () => {
  const app = createAppInstance();
  app.navigate('#timetable');
  const toggle = app.document.getElementById('theme-toggle');
  assert.ok(toggle, 'theme-toggle exists');
  assert.equal(toggle.getAttribute('data-theme-mode'), 'system');

  app.context.setTheme('light');
  assert.equal(toggle.getAttribute('data-theme-mode'), 'light');
  const nextFromLight = app.context.getNextThemeMode('light');
  assert.ok(nextFromLight === 'system' || nextFromLight === 'dark');

  app.context.setTheme('dark');
  assert.equal(toggle.getAttribute('data-theme-mode'), 'dark');
  const beforeThemeMode = toggle.getAttribute('data-theme-mode');
  const beforeStoredTheme = app.localStorage.getItem('campus-theme');

  app.click('#size-modal-theme-toggle');
  const expPaper = app.document.getElementById('size-modal-paper');
  assert.ok(expPaper, 'size-modal-paper exists');
  assert.equal(toggle.getAttribute('data-theme-mode'), beforeThemeMode, 'global theme-toggle unchanged');
  assert.equal(app.localStorage.getItem('campus-theme'), beforeStoredTheme, 'campus-theme storage unchanged');
});

// =============================================================================
// 2. Calendar, iCal, Timetable Export, Exam, & Badges
// =============================================================================

test('IMP-05: exportCalendarIcs writes single .ics extension and generateIcs/generateCalendarIcs include Tokyo timezone', async () => {
  const mod = await import('../timetable-export.js');
  const ttIcs = mod.generateIcs(
    [{ dayOfWeek: 1, period: 1, duration: 1, subjectName: '応用数学', location: '講義室1', teacher: '教員A' }],
    '4年M科',
    {
      semesterInfo: { fiscalYear: 2026, term: '後期', start: '2026-09-24', end: '2027-02-05' },
      holidays: ['2026-10-12'],
    }
  );
  assert.match(ttIcs, /BEGIN:VTIMEZONE/);
  assert.match(ttIcs, /TZID:Asia\/Tokyo/);
  assert.match(ttIcs, /EXDATE;TZID=Asia\/Tokyo:20261012T090000/);

  const calIcs = mod.generateCalendarIcs({
    fiscalYear: 2026,
    events: [
      { date: '2026-10-14', title: '月曜授業', category: 'substitution', substituteDay: 'monday' },
    ],
  });
  assert.match(calIcs, /X-WR-TIMEZONE:Asia\/Tokyo/);
  assert.match(calIcs, /SUMMARY:.*月曜授業/);

  const origDoc = globalThis.document;
  const origUrl = globalThis.URL;
  const origSetTimeout = globalThis.setTimeout;
  const captured = [];
  try {
    globalThis.URL = {
      createObjectURL: () => 'blob:mock-ics',
      revokeObjectURL: () => {},
    };
    globalThis.setTimeout = () => 0;
    globalThis.document = {
      createElement: () => ({
        href: '',
        download: '',
        click: () => {},
        remove: () => {},
      }),
      body: {
        append: (node) => captured.push(node),
      },
    };
    mod.exportCalendarIcs({ events: [] }, 'akashi-calendar-2026.ics');
    assert.equal(captured[0].download, 'akashi-calendar-2026.ics', 'must not append .ics.ics');
  } finally {
    globalThis.document = origDoc;
    globalThis.URL = origUrl;
    globalThis.setTimeout = origSetTimeout;
  }
});

test('IMP-06: generateText avoids double parentheses and formatStudentShortBadge formats 専1ME/専2AC', async () => {
  const mod = await import('../timetable-export.js');
  assert.equal(mod.formatStudentShortBadge('専攻科1年 機械・電子システム工学専攻(ME)'), '専1ME');
  assert.equal(mod.formatStudentShortBadge('専攻科2年 建築・都市システム工学専攻(AC)'), '専2AC');

  const text = mod.generateText(
    [
      {
        dayOfWeek: 1,
        period: 1,
        duration: 1,
        subjectName: '応用数学',
        location: '講義室1',
        teacher: '教員A',
      },
    ],
    '4年M科'
  );
  assert.ok(text.includes('(教員A)'), 'contains single parentheses around teacher');
  assert.doesNotMatch(text, /\(\([^)]+\)\)/, 'must not double-wrap teacher parentheses');
});

test('IMP-07: calendar.json contains 2026-10-14 Wednesday substitution without duplicate dates and Sep 24 starts week 1', () => {
  const cal = readJson('dist-data/calendar.json');
  const subs = cal.daySubstitutions || [];
  const oct14 = subs.find(s => s.date === '2026-10-14');
  assert.ok(oct14, '2026-10-14 substitution entry exists in calendar.json');
  assert.equal(oct14.originalDay, 3, '2026-10-14 is Wednesday (originalDay=3)');

  const subDates = subs.map(s => s.date);
  assert.equal(new Set(subDates).size, subDates.length, 'substitution dates must be deduplicated');

  const app = createAppInstance({ mockDate: '2026-09-24T09:00:00+09:00' });
  const weekInfo = app.context.getAcademicWeek(new Date('2026-09-24T09:00:00+09:00'));
  assert.equal(weekInfo.week, 1, 'Sep 24 is week 1 of 後期');
});

test('IMP-08: Nov 24 no longer triggers false hardcoded exam banner', () => {
  const app = createAppInstance({ mockDate: '2026-11-24T09:00:00+09:00' });
  app.navigate('#timetable');
  const mainHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.doesNotMatch(mainHtml, /定期試験期間/, 'Nov 24 must not show hardcoded exam period banner');
});

// =============================================================================
// 3. UX Features: Profile Switcher, Live Period, Search, Calendar Month, Cafeteria, MyLinks Edit+Undo
// =============================================================================

test('IMP-09: home shows global profile switcher modal and live period badge during weekday class', () => {
  const app = createAppInstance({ mockDate: '2026-10-05T09:30:00+09:00' });
  app.selectStudent({ grade: '4', department: 'M' });
  const html = app.document.getElementById('main')?.innerHTML || '';
  assert.ok(app.document.getElementById('open-profile-switcher'), 'global profile switcher button exists');
  assert.ok(app.document.getElementById('profile-switcher-modal'), 'profile switcher modal exists');
  assert.match(html, /live-status-badge/, 'live period status badge rendered on #home');

  const modal = app.document.getElementById('profile-switcher-modal');
  modal.hidden = true;
  app.document.getElementById('open-profile-switcher').click();
  assert.equal(modal?.hidden, false, 'clicking profile switcher opens modal');
});

test('IMP-10: timetable search/room trigger, exam countdown, calendar search/month view, and cafeteria allergen filter render', () => {
  const ttApp = createAppInstance();
  ttApp.navigate('#timetable');
  ttApp.selectStudent({ grade: '4', department: 'M' });
  const ttHtml = ttApp.document.getElementById('main')?.innerHTML || '';
  assert.ok(ttApp.document.getElementById('timetable-search-input'), 'timetable search input exists');
  assert.match(ttHtml, /lesson-location-btn/, 'room trigger buttons render inside timetable');

  const sizeModal = ttApp.document.getElementById('export-size-modal');
  ttApp.click('#open-size-modal');
  assert.equal(sizeModal?.hidden, false, 'size modal opens');
  ttApp.context.closeSizeAdjustModal();
  const sheetStyle = ttApp.document.getElementById('timetable-sheet')?.style || {};
  assert.equal(sheetStyle['--exp-cell-h'], undefined, 'closing size modal does not mutate live timetable-sheet style');

  const examApp = createAppInstance({ mockDate: '2027-01-25T09:00:00+09:00' });
  examApp.navigate('#exam');
  const examHtml = examApp.document.getElementById('main')?.innerHTML || '';
  assert.ok(examApp.document.getElementById('exam-search-input'), 'exam search input exists');
  assert.match(examHtml, /exam-countdown-bar/, 'exam countdown bar renders ahead of scheduled exam');

  const calApp = createAppInstance();
  calApp.navigate('#calendar');
  const calListHtml = calApp.document.getElementById('main')?.innerHTML || '';
  assert.ok(calApp.document.getElementById('calendar-search-input'), 'calendar search input exists');
  assert.match(calListHtml, /data-cal-view="month"/, 'month view toggle exists');
  calApp.run("calendarViewMode = 'month'; render();");
  const calMonthHtml = calApp.document.getElementById('main')?.innerHTML || '';
  assert.match(calMonthHtml, /cal-month-grid/, 'month view renders cal-month-grid');

  const cafeApp = createAppInstance();
  cafeApp.navigate('#cafeteria');
  const cafeHtml = cafeApp.document.getElementById('main')?.innerHTML || '';
  assert.match(cafeHtml, /data-allergen-chip=/, 'cafeteria allergen chips render');
  cafeApp.run("selectedAllergenFilter = '小麦'; render();");
  const cafeFilteredHtml = cafeApp.document.getElementById('main')?.innerHTML || '';
  assert.match(cafeFilteredHtml, /has-allergen-alert/, 'matching cafeteria items receive allergen alert');
  assert.ok(cafeHtml.includes('cafeteria-day-dishes') && cafeHtml.includes('dish-badge'), 'cafeteria renders structured menu fields');
});

test('IMP-11: MyLinks supports novalidate, duplicate URL rejection, inline edit, and delete undo toast', () => {
  const app = createAppInstance();
  app.navigate('#links');
  const mainHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(mainHtml, /<form[^>]*id="mylink-form"[^>]*novalidate/, 'mylink-form has novalidate');

  const first = app.context.addMyLink({ name: 'LMS', url: 'https://example.org/lms' });
  assert.equal(first.success, true);
  const dup = app.context.addMyLink({ name: 'LMS Dup', url: 'https://example.org/lms/' });
  assert.equal(dup.success, false, 'duplicate normalized URL rejected');

  const updated = app.context.updateMyLink(first.item.id, { name: 'LMS Updated', url: 'https://example.org/v2' });
  assert.equal(updated.success, true);
  assert.equal(updated.item.name, 'LMS Updated');

  app.context.render();
  const linksHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(linksHtml, new RegExp(`data-edit-id="${first.item.id}"`), 'inline edit button renders');

  const removeBtns = app.document.querySelectorAll('.mylink-remove-btn');
  assert.equal(removeBtns.length, 1);
  removeBtns[0].click();
  assert.equal(app.context.loadMyLinks().length, 0, 'link removed on delete click');
  const toast = app.document.getElementById('portal-toast');
  assert.ok(toast && !toast.hidden, 'undo toast is shown after delete');
  const undoBtn = toast.children.find(c => c.className === 'toast-action');
  assert.ok(undoBtn, 'undo button rendered inside toast');
  undoBtn.click();
  const restored = app.context.loadMyLinks();
  assert.equal(restored.length, 1, 'undo restores deleted link');
  assert.equal(restored[0].id, first.item.id);
});

test('IMP-12: keyboard shortcuts Alt+1..6 navigate tabs and / focuses search only outside inputs', () => {
  const app = createAppInstance();
  ['export-size-modal', 'data-preview-modal', 'profile-switcher-modal'].forEach(id => {
    app.document.getElementById(id).hidden = true;
  });
  assert.equal(app.window.location.hash || '#home', '#home');

  app.window.dispatchEvent({
    type: 'keydown',
    key: '2',
    altKey: true,
    ctrlKey: false,
    metaKey: false,
    target: { tagName: 'BODY' },
    preventDefault() {},
  });
  assert.equal(app.window.location.hash, '#timetable', 'Alt+2 navigates to #timetable');
  app.window.dispatchEvent({ type: 'hashchange' });

  const searchInput = app.document.getElementById('timetable-search-input');
  assert.ok(searchInput, 'timetable search input rendered after Alt+2');
  assert.notEqual(app.document.activeElement, searchInput);

  app.window.dispatchEvent({
    type: 'keydown',
    key: '/',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: { tagName: 'INPUT' },
    preventDefault() {},
  });
  assert.notEqual(app.document.activeElement, searchInput, '/ inside INPUT does not steal focus');

  app.window.dispatchEvent({
    type: 'keydown',
    key: '/',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: { tagName: 'BODY' },
    preventDefault() {},
  });
  assert.equal(app.document.activeElement, searchInput, '/ outside inputs focuses timetable search input');
});
