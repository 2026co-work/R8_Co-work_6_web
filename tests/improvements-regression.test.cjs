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
  assert.match(css, /\[data-theme="dark"\]\s*\.export-sheet\[data-theme="light"\]\s*\.real-timetable\s+thead\s+th\.is-today-col/);
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

test('IMP-07: calendar.json matches official R8 PDF substitutions (incl. 2026-11-25) without duplicates and Sep 24 starts week 1', () => {
  const cal = readJson('dist-data/calendar.json');
  const subs = cal.daySubstitutions || [];
  const nov25 = subs.find(s => s.date === '2026-11-25');
  assert.ok(nov25, '2026-11-25 substitution entry exists in calendar.json');
  assert.equal(nov25.originalDay, 3, '2026-11-25 is Wednesday (originalDay=3)');
  assert.equal(nov25.effectiveDay, 1, '2026-11-25 conducts Monday schedule (effectiveDay=1)');
  assert.equal(subs.find(s => s.date === '2026-10-14'), undefined, '2026-10-14 is not a substitution in official R8 calendar PDF');

  const subDates = subs.map(s => s.date);
  assert.equal(new Set(subDates).size, subDates.length, 'substitution dates must be deduplicated');

  const app = createAppInstance({ mockDate: '2026-09-24T09:00:00+09:00' });
  const weekInfo = app.context.getAcademicWeek(new Date('2026-09-24T09:00:00+09:00'));
  assert.equal(weekInfo.week, 1, 'Sep 24 is week 1 of 後期');

  const subApp = createAppInstance({ mockDate: '2026-11-25T09:00:00+09:00' });
  subApp.navigate('#home');
  const subHtml = subApp.document.getElementById('main')?.innerHTML || '';
  assert.match(subHtml, /月曜日/, '2026-11-25 home schedule reflects Monday substitution');
  assert.match(subHtml, /基本時間割（年間予定の振替反映）/, 'Plan A disclaimer is shown on home schedule');
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

test('IMP-10: timetable room legends modal, exam countdown, calendar month/week tags/list view, and cafeteria allergen filter render', () => {
  const ttApp = createAppInstance();
  ttApp.navigate('#timetable');
  ttApp.selectStudent({ grade: '4', department: 'M' });
  const ttHtml = ttApp.document.getElementById('main')?.innerHTML || '';
  assert.doesNotMatch(ttHtml, /timetable-search-input/, 'timetable search input is removed');
  assert.ok(ttApp.document.getElementById('open-room-legends-modal'), 'room legends modal trigger button exists');
  assert.match(ttHtml, /lesson-location-btn/, 'room trigger buttons render inside timetable');
  const roomModal = ttApp.document.getElementById('room-legends-modal');
  roomModal.hidden = true;
  ttApp.document.getElementById('open-room-legends-modal').click();
  assert.equal(roomModal?.hidden, false, 'clicking room legends button opens popup modal');
  ttApp.context.closeRoomLegendsModal();
  assert.equal(roomModal?.hidden, true, 'closing room legends modal hides it');

  const sizeModal = ttApp.document.getElementById('export-size-modal');
  sizeModal.hidden = true;
  ttApp.document.getElementById('export-adjust-open').click();
  assert.equal(sizeModal?.hidden, false, 'size modal opens via #export-adjust-open');
  ttApp.context.closeSizeAdjustModal();
  const sheetStyle = ttApp.document.getElementById('timetable-sheet')?.style || {};
  assert.equal(sheetStyle['--exp-cell-h'], undefined, 'closing size modal does not mutate live timetable-sheet style');

  const examApp = createAppInstance({ mockDate: '2027-01-25T09:00:00+09:00' });
  examApp.navigate('#exam');
  const examHtml = examApp.document.getElementById('main')?.innerHTML || '';
  assert.ok(examApp.document.getElementById('exam-search-input'), 'exam search input exists');
  assert.match(examHtml, /exam-countdown-bar/, 'exam countdown bar renders ahead of scheduled exam');

  const calApp = createAppInstance({ mockDate: '2026-11-26T09:00:00+09:00' });
  calApp.navigate('#calendar');
  const calMonthHtml = calApp.document.getElementById('main')?.innerHTML || '';
  assert.match(calMonthHtml, /cal-month-grid/, 'calendar defaults to month grid');
  assert.match(calMonthHtml, /cal-month-week-tag/, 'calendar month cells render per-weekday week tags');
  assert.match(calMonthHtml, /前期 iCal DL/, 'calendar exposes zenki iCal DL');
  assert.match(calMonthHtml, /後期 iCal DL/, 'calendar exposes kouki iCal DL');
  assert.match(calMonthHtml, /通年 iCal DL/, 'calendar exposes all-year iCal DL');
  calApp.run("calendarViewMode = 'list'; render();");
  const calListHtml = calApp.document.getElementById('main')?.innerHTML || '';
  assert.ok(calApp.document.getElementById('calendar-search-input'), 'calendar search input exists in list view');
  assert.match(calListHtml, /cal-anchor-zenki/, 'list view includes zenki anchor divider');
  assert.match(calListHtml, /cal-anchor-kouki/, 'list view includes kouki anchor divider');

  const cafeApp = createAppInstance();
  cafeApp.navigate('#cafeteria');
  const cafeHtml = cafeApp.document.getElementById('main')?.innerHTML || '';
  assert.match(cafeHtml, /data-allergen-chip="小麦"/, 'cafeteria official allergen chip 小麦 renders');
  assert.match(cafeHtml, /data-allergen-chip="そば"/, 'cafeteria official allergen chip そば renders');
  assert.match(cafeHtml, /data-allergen-chip="くるみ"/, 'cafeteria official allergen chip くるみ renders');
  cafeApp.run("selectedAllergenFilter = '小麦'; render();");
  const cafeFilteredHtml = cafeApp.document.getElementById('main')?.innerHTML || '';
  assert.match(cafeFilteredHtml, /has-allergen-alert/, 'matching cafeteria items receive allergen alert');
  assert.ok(cafeHtml.includes('cafeteria-day-dishes') && cafeHtml.includes('dish-badge'), 'cafeteria renders structured menu fields');
});

test('IMP-11: MyLinks supports novalidate, duplicate URL rejection, manage-mode inline edit, and delete undo toast', () => {
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
  const tileHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(tileHtml, /class="link-tile"/, 'default MyLinks renders clean Favicon link tiles');
  app.document.getElementById('mylinks-manage-toggle').click();
  const linksHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(linksHtml, new RegExp(`data-edit-id="${first.item.id}"`), 'inline edit button renders in manage mode');

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

test('IMP-12: keyboard shortcuts Alt+1..4 navigate active tabs and / focuses calendar search only outside inputs', () => {
  const app = createAppInstance();
  ['export-size-modal', 'data-preview-modal', 'ical-preview-modal', 'room-legends-modal', 'profile-switcher-modal'].forEach(id => {
    const el = app.document.getElementById(id);
    if (el) el.hidden = true;
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

  app.window.dispatchEvent({
    type: 'keydown',
    key: '3',
    altKey: true,
    ctrlKey: false,
    metaKey: false,
    target: { tagName: 'BODY' },
    preventDefault() {},
  });
  assert.equal(app.window.location.hash, '#calendar', 'Alt+3 navigates to #calendar');
  app.window.dispatchEvent({ type: 'hashchange' });
  app.run("calendarViewMode = 'list'; render();");

  const searchInput = app.document.getElementById('calendar-search-input');
  assert.ok(searchInput, 'calendar search input rendered in list mode');
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
  assert.equal(app.document.activeElement, searchInput, '/ outside inputs focuses calendar search input');
});

test('IMP-13: v3 data honesty, verified PDF URLs, contrast fix, and copy/emoji cleanup invariants hold', () => {
  const cafeDist = readJson('dist-data/cafeteria.json');
  const cafeFallback = readJson('scripts/fallbacks/cafeteria.json');
  assert.equal(cafeDist.meta?.isTextExtracted, true);
  assert.equal(cafeDist.weeklyMenus?.length, 5);
  const nov04 = cafeDist.weeklyMenus.flatMap(w => w.days).find(d => d.date === '2026-11-04');
  assert.equal(nov04?.lunchA?.name, '照りマヨチキン', '11/04 lunchA reflects real PDF, not fabricated dish');
  assert.notEqual(nov04?.lunchA?.name, '豚肉の生姜焼き');
  const officialAllergens = new Set(['小麦', '卵', '乳', 'そば', '落花生', 'えび', 'かに', 'くるみ']);
  for (const d of cafeDist.weeklyMenus.flatMap(w => w.days)) {
    for (const al of (d.allergens || [])) {
      assert.ok(officialAllergens.has(al), `allergen "${al}" must be in official 8`);
    }
  }
  assert.equal(cafeFallback.meta?.isTextExtracted, false);
  assert.deepEqual(cafeFallback.weeklyMenus, []);

  const linksDist = readJson('dist-data/timetable-links.json');
  const appSrc = read('app.js');
  assert.match(JSON.stringify(linksDist), /o7en060000000c2u-att\/R8_koukijikanwari_20260924-2\.pdf/);
  assert.doesNotMatch(JSON.stringify(linksDist), /o7en060000000d0c-att\/R8_koukijikanwari_20260924-2\.pdf/);
  assert.match(appSrc, /o7en060000000c2u-att\/R8_koukijikanwari_20260924-2\.pdf/);
  assert.doesNotMatch(appSrc, /o7en060000000d0c-att\/R8_koukijikanwari_20260924-2\.pdf/);

  assert.equal(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(appSrc), false, 'app.js contains zero OS emojis');
  for (const banned of ['— Campus', '（Dormitory）', '空きコマ', '特別略称なし', 'キャンパスポータル']) {
    assert.equal(appSrc.includes(banned), false, `app.js must not include "${banned}"`);
  }

  const css = read('styles.css');
  assert.match(css, /\.sidebar\s+\.brand\s+small\{[^}]*color:rgba\(255,255,255/);
  assert.ok(css.includes('.size-paper.a4-mode .real-timetable{height:auto!important}'));
  assert.equal(read('index.html'), read('portal.html'));
});

test('IMP-14: Favicons, MS365 SharePoint URL, hidden exam/cafeteria nav, per-weekday lesson week count, and iCal options work', async () => {
  const indexHtml = read('index.html');
  assert.match(indexHtml, /<a href="#exam"[^>]*hidden/, '#exam nav link is hidden');
  assert.match(indexHtml, /<a href="#cafeteria"[^>]*hidden/, '#cafeteria nav link is hidden');

  const app = createAppInstance({ mockDate: '2026-11-26T09:00:00+09:00' });
  app.navigate('#links');
  const linksHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.ok(
    linksHtml.includes('https://kosenjp.sharepoint.com/sites/27akashi/students-portal/Lists/henkou/view1.aspx?viewid=a5680f87%2D5471%2D4706%2D9536%2Dd4998c34ff72'),
    'MS365 Student Portal uses exact SharePoint URL'
  );
  assert.match(linksHtml, /google\.com\/s2\/favicons\?domain=/, 'Link tiles include favicon images');

  // Per-weekday lesson week calculation on 2026-11-25 (Wed conducting Mon schedule)
  const weeksMap = app.run('computeAcademicLessonWeeks()');
  const nov25 = weeksMap.get('2026-11-25');
  const nov26 = weeksMap.get('2026-11-26');
  assert.ok(nov25 && nov25.isSubstituted && nov25.dayLabel === '月', '2026-11-25 is counted as substituted Monday class');
  assert.ok(nov26 && !nov26.isSubstituted && nov26.dayLabel === '木', '2026-11-26 is counted as Thursday class');
  assert.notEqual(nov25.weekNum, nov26.weekNum, 'Per-weekday week counts reflect real calendar shifts');

  // iCal options: calendar-aligned vs simple 4x5 + includeCalendarEvents + term-sliced calendar iCal
  const exp = await import('../timetable-export.js');
  const calData = readJson('dist-data/calendar.json');
  const sampleLessons = [
    { id: 'm1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '月曜数学', location: '4M', teacher: '山田' },
    { id: 'w1', dayOfWeek: 3, period: 1, duration: 1, subjectName: '水曜物理', location: '4M', teacher: '佐藤' }
  ];
  const calModeIcs = exp.generateIcs(sampleLessons, '4M', {
    fiscalYear: 2026,
    term: '後期',
    holidays: ['2026-11-23'],
    daySubstitutions: calData.daySubstitutions,
    mode: 'calendar',
    includeCalendarEvents: true,
    calendarData: calData
  });
  assert.match(calModeIcs, /EXDATE;TZID=Asia\/Tokyo:20261123T090000/, 'Calendar mode excludes holidays');
  assert.match(calModeIcs, /UID:sub-20261125-m1@akashi-kosen/, 'Calendar mode adds substituted Monday lesson on 11/25');
  assert.match(calModeIcs, /DTSTART;VALUE=DATE:/, 'includeCalendarEvents bundles all-day calendar events');

  const simpleModeIcs = exp.generateIcs(sampleLessons, '4M', {
    fiscalYear: 2026,
    term: '後期',
    holidays: ['2026-11-23'],
    daySubstitutions: calData.daySubstitutions,
    mode: 'simple'
  });
  assert.doesNotMatch(simpleModeIcs, /EXDATE/, 'Simple 4x5 mode omits EXDATE');
  assert.doesNotMatch(simpleModeIcs, /UID:sub-/, 'Simple 4x5 mode omits substituted-day VEVENTs');

  const zenkiCalIcs = exp.generateCalendarIcs(calData, { period: 'zenki' });
  const koukiCalIcs = exp.generateCalendarIcs(calData, { period: 'kouki' });
  assert.match(zenkiCalIcs, /前期/, 'Zenki calendar iCal labeled 前期');
  assert.match(zenkiCalIcs, /20260407/, 'Zenki includes April start');
  assert.doesNotMatch(zenkiCalIcs, /20261123/, 'Zenki excludes November holiday');
  assert.match(koukiCalIcs, /後期/, 'Kouki calendar iCal labeled 後期');
  assert.match(koukiCalIcs, /20261123/, 'Kouki includes November holiday');
  assert.doesNotMatch(koukiCalIcs, /20260407/, 'Kouki excludes April start');
});

test('IMP-15: Mobile-first 3-step onboarding card, apple-touch-icon, and sidebar help modal work', () => {
  const idx = read('index.html');
  assert.match(idx, /rel="apple-touch-icon"/, 'index.html includes apple-touch-icon for iOS home screen');
  assert.match(idx, /id="open-help-modal"/, 'index.html includes sidebar help button');

  const app = createAppInstance({ mockDate: '2026-11-26T09:00:00+09:00' });
  app.navigate('#home');
  const homeHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(homeHtml, /class="onboarding-steps"/, 'Initial #home renders 3-step onboarding list');
  assert.match(homeHtml, /所属を選ぶ/, 'Onboarding CTA lets user pick profile directly');
  assert.match(homeHtml, /id="help-modal"/, 'Help modal is mounted');

  const helpModal = app.document.getElementById('help-modal');
  assert.equal(helpModal.hidden, true, 'Help modal is hidden initially');
  app.document.getElementById('open-help-modal').click();
  assert.equal(helpModal.hidden, false, 'Clicking sidebar help button opens help modal');
  app.context.closeHelpModal();
  assert.equal(helpModal.hidden, true, 'closeHelpModal hides help modal');
});

test('IMP-16: Plan A minimal speed-dial リンク集, icon-only toggle, hide/restore defaults, unified reorder, and #home sync work', () => {
  const idx = read('index.html');
  assert.match(idx, /id="links"[^>]*>.*リンク集<\/a>/, 'Sidebar tab is renamed to リンク集');
  assert.doesNotMatch(idx, /リンク・シラバス/, 'Old tab name リンク・シラバス is removed');

  const app = createAppInstance({ mockDate: '2026-11-26T09:00:00+09:00' });
  app.selectStudent({ grade: '4', department: 'M' });
  app.navigate('#links');
  const linksHtml = app.document.getElementById('main')?.innerHTML || '';

  // 1. Minimal heading & 8 unified defaults (zero categories, zero sub-descriptions, no Shinki Bus, no all-dept syllabus tile)
  assert.match(linksHtml, /<h1>リンク集<\/h1>/, 'Page heading is リンク集');
  assert.match(linksHtml, /class="speed-dial-grid"/, 'Plan A speed-dial grid renders');
  assert.match(linksHtml, /data-open-link-add="1"/, 'Add tile renders inside speed-dial grid');
  assert.match(linksHtml, /授業変更リスト/, 'SharePoint link is labeled 授業変更リスト');
  assert.match(linksHtml, /train-guide\.westjr\.co\.jp\/kobesanyo\.html\?st=0444/, 'JR Kobe Line uses station 0444 URL');
  assert.match(linksHtml, /sanyo-railway\.co\.jp\/railway\/delay\/index\.html/, 'Sanyo Railway uses delay certificate URL');
  assert.doesNotMatch(linksHtml, /shinkibus/, 'Shinki Bus is removed');
  assert.doesNotMatch(linksHtml, /シラバス検索（全学科）/, 'All-dept syllabus tile is removed');
  assert.doesNotMatch(linksHtml, /links-category-section|link-tile-sub/, 'Zero category sections and zero sub-descriptions');
  assert.match(linksHtml, /class="links-archive-quiet"/, 'PDF archive is rendered as quiet disclosure');
  for (const b of ['syllabus', 'henkou', 'webclass', 'opac', 'jr']) {
    assert.match(linksHtml, new RegExp(`data-brand="${b}"`), `Built-in ${b} tile uses crisp brand inline SVG badge`);
  }

  // 2. Icon-only mode persists inside campus-links-v1 (strict whitelist) and mirrors to #home
  app.document.getElementById('links-icon-only-toggle').click();
  const storedAfterIconOnly = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.equal(storedAfterIconOnly.version, 2);
  assert.equal(storedAfterIconOnly.iconOnly, true);
  assert.equal(app.localStorage.length, 1, 'No extra localStorage keys introduced');
  assert.match(app.document.getElementById('main')?.innerHTML || '', /speed-dial-grid is-icon-only/);

  app.navigate('#home');
  const homeIconOnlyHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.match(homeIconOnlyHtml, /id="quick-links"/);
  assert.match(homeIconOnlyHtml, /speed-dial-grid is-icon-only/, '#home quick links syncs icon-only mode');
  assert.match(homeIconOnlyHtml, /授業変更リスト/, '#home quick links shows unified defaults');

  // Toggle icon-only back off
  app.navigate('#links');
  app.document.getElementById('links-icon-only-toggle').click();
  assert.equal(JSON.parse(app.localStorage.getItem('campus-links-v1')).length, 0, 'Unmodified state collapses back to plain Array');

  // 3. Custom link + hide default + unified reorder + #home sync + restore defaults preserving custom links
  const added = app.context.addMyLink({ name: 'GitHub', url: 'https://github.com/' });
  assert.equal(added.success, true);
  app.context.hideDefaultLink('default:teams');
  app.context.reorderMyLink(added.item.id, 'up');

  const resolvedAfterEdit = app.context.getResolvedLinks();
  assert.equal(resolvedAfterEdit.some(x => x.id === 'default:teams'), false, 'Hidden default is omitted from resolved list');
  assert.equal(resolvedAfterEdit.findIndex(x => x.id === added.item.id), resolvedAfterEdit.length - 2, 'Custom link moved up across default boundary');

  app.navigate('#home');
  const homeSyncedHtml = app.document.getElementById('main')?.innerHTML || '';
  assert.equal(homeSyncedHtml.includes('https://teams.microsoft.com'), false, '#home reflects hidden default');
  assert.ok(homeSyncedHtml.includes('GitHub'), '#home reflects custom link');

  app.context.restoreDefaultLinks();
  const resolvedRestored = app.context.getResolvedLinks();
  assert.equal(resolvedRestored.some(x => x.id === 'default:teams'), true, 'Restore brings back hidden default');
  assert.equal(resolvedRestored.some(x => x.id === added.item.id), true, 'Restore preserves custom link');
  const collapsed = JSON.parse(app.localStorage.getItem('campus-links-v1'));
  assert.ok(Array.isArray(collapsed) && collapsed.length === 1 && collapsed[0].name === 'GitHub', 'Restored state collapses cleanly back to plain Array');

  // 4. Link editor modal open/close lifecycle
  app.navigate('#links');
  ['export-size-modal', 'data-preview-modal', 'ical-preview-modal', 'room-legends-modal', 'help-modal', 'profile-switcher-modal'].forEach(id => {
    const el = app.document.getElementById(id);
    if (el) el.hidden = true;
  });
  const editorModal = app.document.getElementById('link-editor-modal');
  assert.equal(editorModal.hidden, true, 'Link editor modal starts hidden');
  app.context.openLinkEditorModal('edit', 'default:henkou');
  assert.equal(editorModal.hidden, false, 'openLinkEditorModal opens modal');
  assert.equal(app.context.getOpenModalEl()?.id, 'link-editor-modal', 'getOpenModalEl detects link-editor-modal');
  app.context.closeLinkEditorModal();
  assert.equal(editorModal.hidden, true, 'closeLinkEditorModal hides modal');
});
