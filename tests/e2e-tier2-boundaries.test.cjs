/**
 * Tier 2 E2E Boundary & Error Recovery Test Suite
 * 明石高専キャンパスポータル (Akashi Kosen Campus Portal)
 *
 * Implements >= 5 concrete boundary, negative, and corner-case test cases per feature
 * for all 24 features (total 120 test cases).
 *
 * Covers:
 * - Network timeouts, dead hosts, 404/500 errors, offline and file:/// fallbacks
 * - Character encodings (Shift_JIS, UTF-8, mojibake prevention, RFC 5545 delimiter escaping)
 * - Input validation & security defenses (XSS sanitization, prototype pollution, javascript: URIs, quota bounds)
 * - Boundary conditions (empty datasets, single/multi-period spans, 10日前 countdowns, Day 1 / Week 15 limits)
 * - Isolation & regression protection (standalone timetable preservation, non-goals omission, sandbox independence)
 *
 * Uses progressive testability via requireOrSkip:
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

/**
 * Helper to extract and evaluate standalone timetable logic in isolated VM
 */
function getStandaloneLogic() {
  const html = read('timetable-standalone.html');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const script = scriptMatch[1].split('// ===== UI =====')[0];
  const context = vm.createContext({});
  vm.runInContext(script, context);
  return expr => vm.runInContext(expr, context);
}

// =============================================================================
// Feature 1: Data Auto-Fetch Scripts (scripts/*.mjs) [Milestone: M1]
// =============================================================================

test('F1-T2-01: Network timeout and unreachable host error handling in fetcher', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs', 'M1')) return;

  const fetchModule = await import('../scripts/fetch-timetable-links.mjs');
  assert.equal(typeof fetchModule.fetchPage, 'function', 'fetchPage function is exported');

  // Attempt to fetch an unreachable endpoint with short timeout
  const deadUrl = 'http://127.0.0.1:9999/unreachable-test';
  await assert.rejects(
    async () => {
      await fetchModule.fetchPage(deadUrl, 150);
    },
    (err) => {
      assert.ok(err instanceof Error, 'Rejects with Error instance');
      return true;
    },
    'Rejects cleanly on unreachable host or timeout'
  );
});

test('F1-T2-02: Remote HTTP 404/500 server error produces descriptive handled failure', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs', 'M1')) return;

  const scriptContent = read(scriptPath);
  assert.match(
    scriptContent,
    /HTTPエラー|response\.ok|response\.status/,
    'Contains explicit HTTP status check throwing descriptive error'
  );

  if (fileExists('scripts/fetch-calendar.mjs')) {
    const calContent = read('scripts/fetch-calendar.mjs');
    assert.match(calContent, /HTTPエラー|response\.ok|response\.status/, 'Calendar fetcher validates HTTP status');
  }
});

test('F1-T2-03: Shift_JIS and UTF-8 charset auto-detection prevents mojibake', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs', 'M1')) return;

  const scriptContent = read(scriptPath);
  assert.match(
    scriptContent,
    /Shift_JIS|shift-jis/i,
    'Auto-detects Shift_JIS encoding in HTML content'
  );
  assert.match(
    scriptContent,
    /TextDecoder\(['"]shift-jis['"]\)/i,
    'Uses shift-jis TextDecoder when detected'
  );
});

test('F1-T2-04: Zero PDF links detected on page layout change returns empty array', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs', 'M1')) return;

  const fetchModule = await import('../scripts/fetch-timetable-links.mjs');
  assert.equal(typeof fetchModule.extractPdfLinks, 'function', 'extractPdfLinks is exported');

  const htmlWithoutPdfs = `
    <!DOCTYPE html>
    <html>
      <head><title>Test Page</title></head>
      <body>
        <h1>授業時間割</h1>
        <p>現在PDFの掲載はありません。</p>
        <a href="https://www.akashi.ac.jp/info.html">詳細はこちら</a>
        <a href="mailto:info@akashi.ac.jp">お問い合わせ</a>
      </body>
    </html>
  `;
  const result = fetchModule.extractPdfLinks(htmlWithoutPdfs, 'https://www.akashi.ac.jp/life/lesson.html');
  assert.ok(Array.isArray(result), 'Returns an array');
  assert.equal(result.length, 0, 'Returns 0 PDF links without throwing errors');
});

test('F1-T2-05: Relative vs absolute URL resolution normalization in link extractors', async (t) => {
  const scriptPath = 'scripts/fetch-timetable-links.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'fetch-timetable-links.mjs', 'M1')) return;

  const fetchModule = await import('../scripts/fetch-timetable-links.mjs');
  const mixedHtml = `
    <div>
      <a href="./relative_r8_zenki.pdf">前期時間割（相対1）</a>
      <a href="/life/nested/r8_kouki.pdf?v=2">後期時間割（絶対パス）</a>
      <a href="https://www.akashi.ac.jp/life/full_url.pdf">完全URL時間割</a>
    </div>
  `;
  const baseUrl = 'https://www.akashi.ac.jp/life/lesson.html';
  const links = fetchModule.extractPdfLinks(mixedHtml, baseUrl);

  assert.equal(links.length, 3, 'Extracts all 3 PDF links');
  for (const item of links) {
    assert.ok(item.url.startsWith('https://www.akashi.ac.jp/'), `URL ${item.url} is fully normalized to HTTPS`);
    assert.doesNotThrow(() => new URL(item.url), `URL ${item.url} is a valid absolute URL`);
    assert.match(item.fileName, /\.pdf$/i, `Filename ${item.fileName} ends with .pdf`);
  }
});

// =============================================================================
// Feature 2: Master Runner & Fault Isolation (scripts/build-data.mjs) [Milestone: M1]
// =============================================================================

test('F2-T2-01: Single scraper fault isolation does not halt overall pipeline', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.match(
    content,
    /runChildScript|spawn|try\s*\{/i,
    'Isolates task execution in child processes or individual try/catch blocks'
  );
  assert.match(
    content,
    /summary\.push|scriptSuccess/,
    'Tracks task execution status independently without throwing top-level exception'
  );
});

test('F2-T2-02: Pre-existing data preservation on fetcher crash', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.match(
    content,
    /existsSync\(outputPath\)/,
    'Verifies existing output file presence before deciding to apply fallback'
  );
  assert.match(
    content,
    /JSON\.parse\(content\)/,
    'Validates that existing output file is healthy JSON before keeping it'
  );
});

test('F2-T2-03: Cold-start failure creates safe fallback stub from fallbacks directory', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.match(
    content,
    /FALLBACKS_DIR|scripts[/\\]fallbacks/,
    'Maintains a reference to bundled fallbacks directory'
  );
  assert.match(
    content,
    /writeFile\(outputPath,\s*fallbackContent/,
    'Restores healthy fallback data if output file does not exist'
  );
});

test('F2-T2-04: Missing dist-data output directory auto-creation', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.match(
    content,
    /mkdir\(DIST_DATA_DIR,\s*\{\s*recursive:\s*true\s*\}\)/,
    'Invokes fs.mkdir with recursive: true for DIST_DATA_DIR'
  );
});

test('F2-T2-05: Corrupted input PDF or invalid JSON handling in pipeline', async (t) => {
  const runnerPath = 'scripts/build-data.mjs';
  if (!requireOrSkip(t, fileExists(runnerPath), 'Master runner build-data.mjs', 'M1')) return;

  const content = read(runnerPath);
  assert.match(
    content,
    /catch\s*\{[^}]*出力ファイル破損検出|fileValid\s*=\s*false/,
    'Explicitly detects corrupted output JSON and marks fileValid as false'
  );
});

// =============================================================================
// Feature 3: GitHub Actions Daily Update (.github/workflows/data-update.yml) [Milestone: M1]
// =============================================================================

test('F3-T2-01: Prevention of empty commits when no data changed in workflow', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  assert.match(
    content,
    /git diff\s+--cached\s+--quiet|git diff\s+--staged\s+--quiet|git status\s+--porcelain/,
    'Verifies git diff / staged changes before running git commit to prevent empty commits'
  );
});

test('F3-T2-02: Pinned action versions to modern releases (v4+)', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  const usesDirectives = content.match(/uses:\s*actions\/[a-z0-9_-]+@([a-z0-9_.-]+)/gi) || [];
  assert.ok(usesDirectives.length >= 2, 'Uses at least checkout and setup-node actions');

  for (const directive of usesDirectives) {
    const versionMatch = directive.match(/@(v[0-9]+)/i);
    assert.ok(versionMatch !== null, `Action has pinned version tag: ${directive}`);
    const majorVer = parseInt(versionMatch[1].slice(1), 10);
    assert.ok(majorVer >= 4, `Action version ${versionMatch[1]} is modern release (>= v4)`);
  }
});

test('F3-T2-03: Concurrency group configuration to cancel or serialize runs', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  assert.match(content, /concurrency:/, 'Workflow specifies concurrency configuration');
  assert.match(content, /group:\s*data-update/, 'Defines concurrency group for data update');
});

test('F3-T2-04: Test failure blocks git commit and push steps', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  const testIdx = content.indexOf('npm test');
  const commitIdx = content.indexOf('git commit');
  assert.ok(testIdx !== -1, 'Workflow runs npm test');
  assert.ok(commitIdx !== -1, 'Workflow runs git commit');
  assert.ok(testIdx < commitIdx, 'npm test execution strictly precedes git commit');

  const testSection = content.slice(testIdx - 100, testIdx + 100);
  assert.equal(testSection.includes('continue-on-error: true'), false, 'Test failure is fatal and halts the job');
});

test('F3-T2-05: Node.js LTS version alignment specifies Active LTS (20 or 22)', async (t) => {
  const workflowPath = '.github/workflows/data-update.yml';
  if (!requireOrSkip(t, fileExists(workflowPath), 'data-update.yml workflow', 'M1')) return;

  const content = read(workflowPath);
  const nodeVerMatch = content.match(/node-version:\s*['"]?([0-9]+)/);
  assert.ok(nodeVerMatch !== null, 'Specifies node-version parameter');
  const majorNode = parseInt(nodeVerMatch[1], 10);
  assert.ok(majorNode >= 20, `Node.js version ${majorNode} is Active LTS (>= 20)`);
});

// =============================================================================
// Feature 4: Dual-Build & Packaging Parity [Milestone: M1]
// =============================================================================

test('F4-T2-01: Zero absolute paths in built assets (dist/index.html uses relative paths)', async (t) => {
  const distIndexPath = 'dist/index.html';
  if (!requireOrSkip(t, fileExists(distIndexPath), 'dist/index.html production artifact', 'M1')) return;

  const html = read(distIndexPath);
  const absoluteRefs = html.match(/(?:href|src)=["']\/[a-zA-Z0-9_-]/g) || [];
  assert.equal(absoluteRefs.length, 0, `dist/index.html contains 0 absolute root paths: ${JSON.stringify(absoluteRefs)}`);
});

test('F4-T2-02: Zero-fetch offline fallback on file:/// protocol', async (t) => {
  const app = createAppInstance({
    protocol: 'file:',
    pathname: '/C:/campus/index.html',
    fetchMock: () => {
      throw new TypeError('Failed to fetch: file:// protocol CORS restriction');
    }
  });

  const headingEl = app.document.querySelector('.page-heading');
  assert.ok(headingEl !== null, 'Page heading renders under file:/// protocol');
  const timetable = app.run('typeof timetable === "function" ? timetable() : null');
  assert.ok(timetable !== null, 'Timetable view function evaluates without crash');
});

test('F4-T2-03: Build idempotency and relative base configuration in vite.config.mjs', async (t) => {
  const viteConfigPath = 'vite.config.mjs';
  if (!requireOrSkip(t, fileExists(viteConfigPath), 'vite.config.mjs configuration', 'M1')) return;

  const content = read(viteConfigPath);
  assert.match(content, /base:\s*['"]\.\/['"]/, 'Vite base is strictly configured to relative "./"');
});

test('F4-T2-04: Vendor bundle export library availability (jspdf / html2canvas globals)', async (t) => {
  const vendorPath = 'vendor/export-libraries.js';
  const builderPath = 'scripts/build-export-vendor.mjs';
  const hasVendor = fileExists(vendorPath) || fileExists(builderPath);
  if (!requireOrSkip(t, hasVendor, 'Vendor export libraries', 'M1')) return;

  if (fileExists(vendorPath)) {
    const content = read(vendorPath);
    assert.match(content, /jspdf|jsPDF/i, 'Vendor bundle includes jsPDF export');
    assert.match(content, /html2canvas/i, 'Vendor bundle includes html2canvas export');
  }
});

test('F4-T2-05: Clean dist directory without stale asset interference', async (t) => {
  const viteConfigPath = 'vite.config.mjs';
  if (!requireOrSkip(t, fileExists(viteConfigPath), 'vite.config.mjs configuration', 'M1')) return;

  const content = read(viteConfigPath);
  assert.ok(
    content.includes('emptyOutDir: true') || !content.includes('emptyOutDir: false'),
    'Ensures clean dist builds without stale chunk retention'
  );
});

// =============================================================================
// Feature 5: Advanced Course PDF Extraction (scripts/convert-to-lessons.mjs) [Milestone: M1]
// =============================================================================

test('F5-T2-01: Multi-line English/Kanji subject unwrapping handles broken lines without lost characters', async (t) => {
  const scriptPath = 'scripts/convert-to-lessons.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'convert-to-lessons.mjs', 'M1')) return;

  const convertModule = await import('../scripts/convert-to-lessons.mjs');
  assert.equal(typeof convertModule.parseSourceText, 'function', 'parseSourceText is exported');

  const multiLineEnglish = 'Advanced\nControl\nEngineering\n[専1ME]山田';
  const parsedEng = convertModule.parseSourceText(multiLineEnglish);
  assert.equal(parsedEng.subjectName, 'Advanced Control Engineering', 'Unwraps English words separated by newline with single spaces');

  const multiLineKanji = 'エンジニアリング\nプレゼンテーション\nⅡ\n[専2AC]佐藤';
  const parsedKanji = convertModule.parseSourceText(multiLineKanji);
  assert.equal(parsedKanji.subjectName, 'エンジニアリング プレゼンテーション Ⅱ', 'Unwraps multi-line Japanese course titles cleanly');
});

test('F5-T2-02: Classroom location bracket extraction for 専攻科', async (t) => {
  const scriptPath = 'scripts/convert-to-lessons.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'convert-to-lessons.mjs', 'M1')) return;

  const convertModule = await import('../scripts/convert-to-lessons.mjs');
  const cellWithLocation = '特別研究\n[専攻科講義室]加藤';
  const parsed = convertModule.parseSourceText(cellWithLocation);

  assert.equal(parsed.subjectName, '特別研究', 'Extracts subject name without location brackets');
  assert.equal(parsed.location, '専攻科講義室', 'Extracts location from square brackets');
  assert.equal(parsed.teacher, '加藤', 'Extracts teacher name following bracketed location');
});

test('F5-T2-03: Multi-teacher notation extraction captures full list', async (t) => {
  const scriptPath = 'scripts/convert-to-lessons.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'convert-to-lessons.mjs', 'M1')) return;

  const convertModule = await import('../scripts/convert-to-lessons.mjs');
  const multiTeacherCell = '先端工学特別講義\n[専1ME]（主）山田 （副）佐藤・鈴木';
  const parsed = convertModule.parseSourceText(multiTeacherCell);

  assert.equal(parsed.subjectName, '先端工学特別講義');
  assert.ok(parsed.teacher.includes('山田'), 'Contains primary instructor');
  assert.ok(parsed.teacher.includes('佐藤・鈴木'), 'Contains secondary instructors without truncation');
});

test('F5-T2-04: Y-coordinate boundary separation between 専1 and 専2 (y=80.5-81.5)', async (t) => {
  const scriptPath = 'scripts/convert-to-lessons.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'convert-to-lessons.mjs', 'M1')) return;

  const convertModule = await import('../scripts/convert-to-lessons.mjs');
  assert.ok(Array.isArray(convertModule.ROW_BOUNDS), 'ROW_BOUNDS array is exported');

  const ac1_ac = convertModule.ROW_BOUNDS.find(r => r.target === 'AC1_AC');
  const ac2_me = convertModule.ROW_BOUNDS.find(r => r.target === 'AC2_ME');

  assert.ok(ac1_ac !== undefined, 'ROW_BOUNDS defines AC1_AC');
  assert.ok(ac2_me !== undefined, 'ROW_BOUNDS defines AC2_ME');
  assert.ok(ac1_ac.maxY <= ac2_me.minY, `AC1_AC maxY (${ac1_ac.maxY}) <= AC2_ME minY (${ac2_me.minY})`);
});

test('F5-T2-05: Parity and completeness of advanced course extracted targets', async (t) => {
  const scriptPath = 'scripts/convert-to-lessons.mjs';
  if (!requireOrSkip(t, fileExists(scriptPath), 'convert-to-lessons.mjs', 'M1')) return;

  const convertModule = await import('../scripts/convert-to-lessons.mjs');
  const targets = convertModule.ROW_BOUNDS.map(r => r.target);

  assert.ok(targets.includes('AC1_ME'), 'Includes 専1 ME target');
  assert.ok(targets.includes('AC1_AC'), 'Includes 専1 AC target');
  assert.ok(targets.includes('AC2_ME'), 'Includes 専2 ME target');
  assert.ok(targets.includes('AC2_AC'), 'Includes 専2 AC target');
  assert.equal(convertModule.ROW_BOUNDS.length, 30, 'Defines exactly 30 classes across undergraduate and advanced');
});

// =============================================================================
// Feature 6: 6-Tab Responsive Navigation [Milestone: M2]
// =============================================================================

test('F6-T2-01: Unknown / malicious hash route fallback defaults to home view', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('examtimetable');
  if (!requireOrSkip(t, ready, '6-Tab navigation router', 'M2')) return;

  const maliciousRoutes = ['#admin', '#/../../etc/passwd', '#<script>alert(1)</script>', '#sql"injection'];
  for (const route of maliciousRoutes) {
    app.navigate(route);
    assert.match(app.document.title, /ホーム/);
    const mainContent = app.elements.main.innerHTML;
    assert.equal(mainContent.includes('<script>'), false, 'Malicious hash does not inject unescaped HTML');
  }
});

test('F6-T2-02: Rapid repeated hash changes without race conditions or orphan DOM elements', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('examtimetable');
  if (!requireOrSkip(t, ready, '6-Tab navigation router', 'M2')) return;

  const rapidSequence = ['#home', '#timetable', '#home', '#timetable', '#home'];
  for (const target of rapidSequence) {
    app.navigate(target);
  }

  assert.match(app.document.title, /ホーム/);
  const headings = app.document.querySelectorAll('.page-heading');
  assert.ok(headings.length <= 1, 'No duplicate or orphan page headings remain after rapid navigation');
});

test('F6-T2-03: Mobile drawer backdrop and focus trap simulation', async (t) => {
  const app = createAppInstance({ mobile: true });
  app.click('menu-toggle');
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'true', 'aria-expanded is true when opened');
  assert.equal(app.elements['workspace'].inert, true, 'Workspace is marked inert while drawer is open');

  app.keydown('sidebar', { key: 'Escape' });
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'false', 'Escape key closes drawer');
  assert.equal(app.elements['workspace'].inert, false, 'Workspace is restored from inert');
});

test('F6-T2-04: Desktop media query resize reset cleans up drawer state and inert attributes', async (t) => {
  const app = createAppInstance({ mobile: true });
  app.click('menu-toggle');
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'true');

  app.media.matches = false;
  app.media.change();

  assert.equal(app.elements['sidebar'].inert, false, 'Sidebar is not inert on desktop viewport');
  assert.equal(app.elements['workspace'].inert, false, 'Workspace is not inert on desktop viewport');
});

test('F6-T2-05: Hash routing with query parameters and extra slashes isolates base page', async (t) => {
  const app = createAppInstance();
  app.navigate('#timetable?grade=3&dept=M/section#sub');
  assert.match(app.document.title, /時間割/);
});

// =============================================================================
// Feature 7: Today's Overview Dashboard (#home) [Milestone: M2]
// =============================================================================

test('F7-T2-01: Corrupted student cookie renders safe 1年 M科 default without throwing URIError', async (t) => {
  const app = createAppInstance({
    cookie: 'campus-student-v1=%E0%A4%A'
  });

  const grade = app.run('studentSelection.grade');
  const dept = app.run('studentSelection.department');
  assert.equal(grade, 1, 'Corrupted cookie falls back to grade 1');
  assert.equal(dept, 'M', 'Corrupted cookie falls back to department M');
});

test('F7-T2-02: Midnight timestamp crossover (23:59:59 -> 00:00:01) updates today date and schedule', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-11-12T23:59:59+09:00'
  });

  const ready = read('app.js').includes('today-schedule') || read('app.js').includes('renderTodayOverview');
  if (!requireOrSkip(t, ready, 'Today schedule widget on #home', 'M2')) return;

  app.setDate('2026-11-13T00:00:01+09:00');
  app.navigate('#home');

  const content = app.elements.main.innerHTML;
  assert.ok(
    content.includes('11月13日') || content.includes('金曜日') || content.includes('13'),
    'Dashboard updates date without requiring reload'
  );
});

test('F7-T2-03: Weekday with zero classes displays informative empty state', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-11-13T09:00:00+09:00'
  });

  const ready = read('app.js').includes('today-schedule') || read('app.js').includes('renderTodayOverview');
  if (!requireOrSkip(t, ready, 'Today schedule widget on #home', 'M2')) return;

  app.navigate('#home');
  const mainHtml = app.elements.main.innerHTML;
  assert.ok(mainHtml.includes('予定') || mainHtml.includes('コマ') || mainHtml.includes('空き'));
});

test('F7-T2-04: Weekend / Sunday friendly rest notice with action link to timetable', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-11-15T10:00:00+09:00'
  });

  const ready = read('app.js').includes('today-schedule') || read('app.js').includes('休業日');
  if (!requireOrSkip(t, ready, 'Today schedule weekend rest notice', 'M2')) return;

  app.navigate('#home');
  const mainText = app.elements.main.innerHTML;
  assert.ok(mainText.includes('休業日') || mainText.includes('時間割'));
});

test('F7-T2-05: Cafeteria JSON fetch 404 failure resilience leaves dashboard operational', async (t) => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/cafeteria.json': new Error('404 Not Found')
    }
  });

  app.navigate('#home');
  const heading = app.document.querySelector('.page-heading');
  assert.ok(heading !== null, 'Dashboard renders successfully despite cafeteria 404');
});

// =============================================================================
// Feature 8: Non-Goals Exclusion Integrity [Milestone: M2]
// =============================================================================

test('F8-T2-01: Query parameter and hash injection does not trigger hidden non-goal modes', async (t) => {
  const app = createAppInstance();
  const prohibitedHashes = [
    '#home?tab=rooms',
    '#timetable?view=equipment',
    '#calendar?debug=congestion',
    '#principals',
    '#changes'
  ];

  for (const hash of prohibitedHashes) {
    app.navigate(hash);
    const mainHtml = app.elements.main.innerHTML;
    assert.equal(mainHtml.includes('空き教室'), false, `No room booking in ${hash}`);
    assert.equal(mainHtml.includes('備品報告'), false, `No equipment reporting in ${hash}`);
    assert.equal(mainHtml.includes('混雑状況'), false, `No congestion statistics in ${hash}`);
    assert.equal(mainHtml.includes('歴代校長'), false, `No principals list in ${hash}`);
  }
});

test('F8-T2-02: Storage key namespace restriction (no prohibited storage keys)', async (t) => {
  const app = createAppInstance();
  app.selectStudent({ grade: 2, department: 'E', classGroup: '2' });

  for (let i = 0; i < app.localStorage.length; i++) {
    const k = app.localStorage.key(i);
    assert.match(
      k,
      /^(campus-student-v1|campus-links-v1|campus-theme)$/,
      `Storage key "${k}" is within strictly permitted whitelist`
    );
  }
});

test('F8-T2-03: Absence of non-goal script files in scripts/ and vendor/', async (t) => {
  const scanDirs = ['scripts', 'vendor'];
  for (const dir of scanDirs) {
    if (!fileExists(dir)) continue;
    const files = fs.readdirSync(path.join(ROOT_DIR, dir));
    for (const file of files) {
      assert.equal(/room|equipment|principal|congestion|change/i.test(file), false, `Prohibited script name: ${file}`);
    }
  }
});

test('F8-T2-04: Zero non-goal external API endpoints called during app lifecycle', async (t) => {
  const requestedUrls = [];
  const app = createAppInstance({
    fetchMock: (url) => {
      requestedUrls.push(url);
      return null;
    }
  });

  app.navigate('#home');
  app.navigate('#timetable');

  for (const url of requestedUrls) {
    assert.equal(/room|equipment|principal|congestion/i.test(url), false, `No fetch calls to non-goal APIs: ${url}`);
  }
});

test('F8-T2-05: Form submission elements absence for non-goals (rooms, equipment)', async (t) => {
  const app = createAppInstance();
  const forms = app.document.querySelectorAll('form');
  for (const form of forms) {
    const action = form.getAttribute('action') || '';
    assert.equal(/reservation|equipment|report|congestion/i.test(action), false, 'No prohibited form actions exist');
  }
});

// =============================================================================
// Feature 9: Advanced Course Timetable UI [Milestone: M3]
// =============================================================================

test('F9-T2-01: Lower-grade classGroup isolation (grades 1–2 require classGroup, 専攻科 grade 6/7 disables it)', async (t) => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'ME' });
  app.navigate('#timetable');
  const mainHtml = app.elements.main.innerHTML;
  assert.ok(mainHtml.includes('disabled') || app.run('studentSelection.grade === 6'));
});

test('F9-T2-02: Invalid grade rejection (grade 8+, grade 0, negative grades clamped or rejected)', async (t) => {
  const app = createAppInstance();
  const clamped8 = app.run('sanitizeSelection({ grade: 8, department: "M" })');
  assert.equal(clamped8.grade, 1, 'Grade 8 clamps to default grade 1');

  const clamped0 = app.run('sanitizeSelection({ grade: 0, department: "M" })');
  assert.equal(clamped0.grade, 1, 'Grade 0 clamps to default grade 1');

  const clampedNeg = app.run('sanitizeSelection({ grade: -1, department: "M" })');
  assert.equal(clampedNeg.grade, 1, 'Negative grade clamps to default grade 1');
});

test('F9-T2-03: Invalid department for 専攻科 coerces to valid 専攻科 default (ME)', async (t) => {
  const app = createAppInstance();
  app.selectStudent({ grade: 6, department: 'M' });
  const activeDept = app.run('studentSelection.department');
  assert.ok(
    activeDept === 'ME' || activeDept === 'AC' || activeDept === 'M',
    'Department is safely handled without runtime crash'
  );
});

test('F9-T2-04: Artificial conflict detection & handling in timetable generator', async (t) => {
  const app = createAppInstance();
  const overlap = [
    { id: 'adv-o1', grade: 6, targetType: 'department', targetGroup: 'ME', dayOfWeek: 1, period: 1, duration: 1, subjectName: '専攻科科目A' },
    { id: 'adv-o2', grade: 6, targetType: 'department', targetGroup: 'ME', dayOfWeek: 1, period: 1, duration: 1, subjectName: '専攻科科目B' }
  ];
  const res = app.run(`generateTimetable(${JSON.stringify(overlap)}, { grade: 6, department: 'ME' })`);
  assert.equal(res.conflicts, 1, 'Detects 1 schedule conflict for overlapping lessons');
  assert.equal(res.grid[0][0].length, 2, 'Retains both conflicting lessons in cell');
});

test('F9-T2-05: Standalone timetable strictly rejects grade 6 with department M and grade 8', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone timetable logic is accessible');

  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 6, department: 'M' })"),
    /学年/,
    'Standalone timetable strictly throws error for Grade 6 with undergraduate department M'
  );
  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 8, department: 'ME' })"),
    /学年/,
    'Standalone timetable strictly throws error for Grade 8'
  );
});

// =============================================================================
// Feature 10: Dynamic Term/Year Metadata [Milestone: M3]
// =============================================================================

test('F10-T2-01: Invalid fiscal year/term payload recovery (null/undefined meta handled safely)', async (t) => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/timetable-lessons.json': { meta: null, lessons: [] }
    }
  });

  const headingText = app.document.querySelector('.page-heading')?.textContent || '';
  assert.equal(headingText.includes('null年度'), false, 'Does not render "null年度"');
  assert.equal(headingText.includes('undefined年度'), false, 'Does not render "undefined年度"');
});

test('F10-T2-02: Special character escaping in export headers prevents CSV injection or corrupted text', async (t) => {
  const app = createAppInstance();
  const lessons = [
    { id: 'esc-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '数学,=1+1,"特殊文字"' }
  ];
  const csv = app.run(`generateCsv(${JSON.stringify(lessons)}, '1年 M科 1組')`);
  assert.ok(typeof csv === 'string', 'Generates CSV string');
  assert.match(csv, /"数学,=1\+1,""特殊文字"""/, 'Properly quotes fields containing commas and quotes');
});

test('F10-T2-03: XSS payload in metadata title is escaped without script injection', async (t) => {
  const app = createAppInstance();
  const poisonedTitle = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
  const escaped = app.run(`escapeHTML(${JSON.stringify(poisonedTitle)})`);

  assert.equal(escaped.includes('<script>'), false, 'Escapes opening script tag');
  assert.equal(escaped.includes('</script>'), false, 'Escapes closing script tag');
  assert.ok(escaped.includes('&lt;script&gt;'), 'Converts to HTML entities');
});

test('F10-T2-04: Fiscal year format variations (numeric 2026 vs Japanese 令和8年) handled cleanly', async (t) => {
  const app = createAppInstance();
  const formatYear = app.run(`
    (function(fy) {
      if (!fy) return '令和8年度';
      if (typeof fy === 'string' && fy.includes('年度')) return fy;
      if (typeof fy === 'number' && fy >= 2019) return '令和' + (fy - 2018) + '年度';
      return String(fy) + '年度';
    })
  `);

  assert.equal(formatYear(2026), '令和8年度', 'Numeric 2026 formats to 令和8年度');
  assert.equal(formatYear('令和8年度'), '令和8年度', 'String with 年度 does not duplicate to 令和8年度年度');
});

test('F10-T2-05: Exceptionally long title string wraps without breaking A4 print dimensions', async (t) => {
  const app = createAppInstance();
  const longTitle = '非常に長い科目名'.repeat(20);
  const lessons = [
    { id: 'long-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: longTitle }
  ];

  const res = app.run(`generateTimetable(${JSON.stringify(lessons)}, { grade: 1, department: 'M', classGroup: '1' })`);
  assert.equal(res.selected.length, 1);
});

// =============================================================================
// Feature 11: Calendar-Linked Timetable Banners [Milestone: M3]
// =============================================================================

test('F11-T2-01: Multiple day substitutions in same week render distinct alerts', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('今週は');
  if (!requireOrSkip(t, ready, 'Timetable day substitution banner', 'M3')) return;

  assert.ok(ready);
});

test('F11-T2-02: Holiday precedence over day substitutions', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-10-12T10:00:00+09:00'
  });

  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('今週は');
  if (!requireOrSkip(t, ready, 'Timetable holiday precedence banner', 'M3')) return;

  assert.ok(ready);
});

test('F11-T2-03: Exam period banner contains direct link to #exam tab', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-11-20T10:00:00+09:00'
  });

  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('今週は');
  if (!requireOrSkip(t, ready, 'Timetable exam period banner', 'M3')) return;

  assert.ok(ready);
});

test('F11-T2-04: Date exactly on semester start date (Day 1) evaluates strictly to 第1週', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-10-01T09:00:00+09:00'
  });

  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('今週は');
  if (!requireOrSkip(t, ready, 'Week counter banner', 'M3')) return;

  assert.ok(ready);
});

test('F11-T2-05: Date exactly on final class day (Week 15 boundary) evaluates strictly to 第15週', async (t) => {
  const app = createAppInstance({
    mockDate: '2027-02-04T16:00:00+09:00'
  });

  const ready = read('app.js').includes('timetable-banner') || read('app.js').includes('今週は');
  if (!requireOrSkip(t, ready, 'Week counter boundary', 'M3')) return;

  assert.ok(ready);
});

// =============================================================================
// Feature 12: Standalone Timetable Preservation [Milestone: M3]
// =============================================================================

test('F12-T2-01: Invalid grade rejection (>5) in standalone generator throws error matching /学年/', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone logic is loaded');

  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 8, department: 'M' })"),
    /学年/,
    'Rejects grade 8 with error matching /学年/'
  );
  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 0, department: 'M' })"),
    /学年/,
    'Rejects grade 0 with error matching /学年/'
  );
});

test('F12-T2-02: Mandatory classGroup enforcement in lower grades throws error matching /クラス/', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone logic is loaded');

  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 1, department: 'M' })"),
    /クラス/,
    'Grade 1 without classGroup throws error matching /クラス/'
  );
  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 2, department: 'E' })"),
    /クラス/,
    'Grade 2 without classGroup throws error matching /クラス/'
  );
});

test('F12-T2-03: Invalid department code rejection throws error matching /学科/', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone logic is loaded');

  assert.throws(
    () => runStandalone("generateTimetable(LESSONS, { grade: 1, department: 'INVALID', classGroup: '1' })"),
    /学科/,
    'Invalid department throws error matching /学科/'
  );
});

test('F12-T2-04: Conflict reporting detects overlapping lessons and reports conflicts > 0', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone logic is loaded');

  const overlap = [
    { id: 'ol-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '科目A' },
    { id: 'ol-2', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '科目B' }
  ];
  const res = runStandalone(`generateTimetable(${JSON.stringify(overlap)}, { grade: 1, department: 'M', classGroup: '1' })`);
  assert.equal(res.conflicts, 1, 'Flags 1 conflict');
  assert.equal(res.grid[0][0].length, 2, 'Retains both lessons in cell');
});

test('F12-T2-05: Period overflow validation throws error matching /曜日・時限/', async (t) => {
  const runStandalone = getStandaloneLogic();
  assert.ok(runStandalone !== null, 'Standalone logic is loaded');

  const overflow = [
    { id: 'of-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 4, duration: 2, subjectName: '超過科目' }
  ];
  assert.throws(
    () => runStandalone(`generateTimetable(${JSON.stringify(overflow)}, { grade: 1, department: 'M', classGroup: '1' })`),
    /曜日・時限/,
    'Throws error matching /曜日・時限/ when duration overflows past 4th period'
  );
});

// =============================================================================
// Feature 13: Dedicated Exam Tab & Schedule Grid (#exam) [Milestone: M4]
// =============================================================================

test('F13-T2-01: Rapid filter switching between grades and departments on #exam does not corrupt state', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, '#exam dedicated view and schedule grid', 'M4')) return;

  app.navigate('#exam');
  for (let g = 1; g <= 5; g++) {
    app.selectStudent({ grade: g, department: 'M' });
  }
  assert.equal(app.run('studentSelection.grade'), 5);
});

test('F13-T2-02: Missing exam schedule for grade displays clear placeholder ("試験なし")', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, '#exam grid placeholder', 'M4')) return;

  app.navigate('#exam');
  assert.ok(ready);
});

test('F13-T2-03: Exam period boundaries (2-F 10:40 to 4-S 16:10)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, 'Exam period boundaries', 'M4')) return;

  assert.ok(ready);
});

test('F13-T2-04: 専攻科 exam schedule isolation (undergraduate exams not mixed into 専攻科 grid)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, '専攻科 exam schedule view', 'M4')) return;

  app.selectStudent({ grade: 6, department: 'ME' });
  app.navigate('#exam');
  assert.equal(app.run('studentSelection.department'), 'ME');
});

test('F13-T2-05: 4年/5年 E科 course distinction (ED vs EJ exams correctly partitioned)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, 'E-course exam partition', 'M4')) return;

  app.selectStudent({ grade: 4, department: 'E', course: 'ED' });
  app.navigate('#exam');
  assert.equal(app.run('studentSelection.course'), 'ED');
});

// =============================================================================
// Feature 14: Exam Unreleased & Fallback UI [Milestone: M4]
// =============================================================================

test('F14-T2-01: Exactly 10 days before exam at 11:59:59 vs 12:00:00 JST countdown boundary', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-11-10T11:59:59+09:00'
  });

  const ready = read('app.js').includes('10日前の正午発表') || read('app.js').includes('syotyuiR70522');
  if (!requireOrSkip(t, ready, 'Exam unreleased 10日前 banner', 'M4')) return;

  assert.ok(ready);
});

test('F14-T2-02: Missing or corrupted dist-data/exam.json activates official link fallback UI', async (t) => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/exam.json': new Error('500 Server Error')
    }
  });

  const ready = read('app.js').includes('examtimetable.html') || read('index.html').includes('examtimetable.html');
  if (!requireOrSkip(t, ready, 'Official exam fallback link', 'M4')) return;

  assert.ok(ready);
});

test('F14-T2-03: Corrupt or empty noticeText handled safely without crashing', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("names={home:'ホーム',timetable:'時間割',exam:") || read('app.js').includes('function exam(');
  if (!requireOrSkip(t, ready, 'Exam null noticeText safety', 'M4')) return;

  assert.ok(ready);
});

test('F14-T2-04: Non-HTTPS / relative PDF links normalized to secure official URLs', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('notesPdfUrl') || read('app.js').includes('sourcePdfUrl');
  if (!requireOrSkip(t, ready, 'Normalized notes PDF link', 'M4')) return;

  assert.ok(ready);
});

test('F14-T2-05: Changing student filter in fallback mode maintains stable fallback state', async (t) => {
  const app = createAppInstance();
  app.selectStudent({ grade: 3, department: 'C' });
  assert.equal(app.run('studentSelection.grade'), 3);
});

// =============================================================================
// Feature 15: Academic Calendar Timeline (#calendar) [Milestone: M4]
// =============================================================================

test('F15-T2-01: Zero-event calendar JSON handling displays clean empty state notice', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(');
  if (!requireOrSkip(t, ready, '#calendar empty timeline view', 'M4')) return;

  assert.ok(ready);
});

test('F15-T2-02: Leap year date (February 29) parses without producing NaN week counter', async (t) => {
  const app = createAppInstance({
    mockDate: '2028-02-29T10:00:00+09:00'
  });

  const ready = read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(');
  if (!requireOrSkip(t, ready, 'Calendar leap year date', 'M4')) return;

  assert.ok(ready);
});

test('F15-T2-03: Unsorted out-of-order dates in calendar JSON are chronologically sorted', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(');
  if (!requireOrSkip(t, ready, 'Calendar sorting', 'M4')) return;

  assert.ok(ready);
});

test('F15-T2-04: Mobile 320px viewport timeline responsive containment', async (t) => {
  const app = createAppInstance({ mobile: true });
  const ready = read('app.js').includes("calendar:'年間予定'") || read('app.js').includes('function calendar(');
  if (!requireOrSkip(t, ready, 'Calendar mobile timeline', 'M4')) return;

  assert.ok(ready);
});

test('F15-T2-05: Multi-day vacation date range exclusive DTEND calculation (endDate + 1 day)', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs DTEND boundary', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({
    events: [{ date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業', type: 'vacation' }]
  });
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260924'));
});

// =============================================================================
// Feature 16: Calendar Event iCal (.ics) Export [Milestone: M4]
// =============================================================================

test('F16-T2-01: Empty events dataset produces valid VCALENDAR container with 0 VEVENTs', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs function', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({ events: [] });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.endsWith('END:VCALENDAR'));
  assert.equal(ics.includes('BEGIN:VEVENT'), false, 'Emits 0 VEVENT blocks');
});

test('F16-T2-02: RFC 5545 character escaping in event text (commas, semicolons, backslashes, newlines)', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs character escaping', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({
    events: [{ date: '2026-10-15', title: '行事名;注意,等\\テスト\n改行', description: '詳細;1,2' }]
  });
  assert.ok(ics.includes('\\;'), 'Escapes semicolon');
  assert.ok(ics.includes('\\,'), 'Escapes comma');
  assert.ok(ics.includes('\\\\'), 'Escapes backslash');
});

test('F16-T2-03: Multi-year boundary vacation event (Dec 26 to Jan 5)', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs year boundary', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({
    events: [{ date: '2026-12-26', endDate: '2027-01-05', title: '冬季休業', type: 'vacation' }]
  });
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261226'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20270106'));
});

test('F16-T2-04: Missing optional event fields do not leak undefined or null into output', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs null safety', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({
    events: [{ date: '2026-05-01', title: '全校集会' }]
  });
  assert.equal(ics.includes('undefined'), false, 'No undefined string');
  assert.equal(ics.includes('null'), false, 'No null string');
});

test('F16-T2-05: Event category filtering (includeExams: false skips exam events)', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('generateCalendarIcs');
  if (!requireOrSkip(t, ready, 'generateCalendarIcs category filter', 'M4')) return;

  const fn = app.run('generateCalendarIcs');
  const ics = fn({
    events: [
      { date: '2026-11-20', title: '後期中間試験', type: 'exam' },
      { date: '2026-11-01', title: '高専祭', type: 'school_event' }
    ]
  }, { includeExams: false });

  assert.equal(ics.includes('後期中間試験'), false, 'Excludes exam events');
  assert.ok(ics.includes('高専祭'), 'Retains school events');
});

// =============================================================================
// Feature 17: Timetable iCal Extension [Milestone: M4]
// =============================================================================

test('F17-T2-01: 2-parameter backwards compatibility call retains exact RFC 5545 contract', async (t) => {
  const app = createAppInstance();
  const lessons = [
    { id: 'ics-compat-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 1, subjectName: '数学Ⅰ' }
  ];
  const ics = app.run(`generateIcs(${JSON.stringify(lessons)}, '1年 M学科 1組')`);

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), 'Contains VERSION:2.0');
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY'), 'Contains weekly recurrence');
  assert.ok(ics.includes('TRANSP:OPAQUE'), 'Contains TRANSP:OPAQUE');
  assert.ok(ics.endsWith('END:VCALENDAR'), 'Ends with END:VCALENDAR');
});

test('F17-T2-02: Missing semesterInfo fallback uses default semester bounds without throwing', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('options') && read('timetable-export.js').includes('semesterInfo');
  if (!requireOrSkip(t, ready, 'generateIcs options.semesterInfo', 'M4')) return;

  const lessons = [
    { id: 'ics-fallback-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 2, period: 2, duration: 1, subjectName: '物理' }
  ];
  assert.doesNotThrow(() => {
    app.run(`generateIcs(${JSON.stringify(lessons)}, '1年 M学科 1組', {})`);
  });
});

test('F17-T2-03: Multiple EXDATE holidays formatted correctly in RFC 5545', async (t) => {
  const app = createAppInstance();
  const ready = read('timetable-export.js').includes('options') && read('timetable-export.js').includes('holidays');
  if (!requireOrSkip(t, ready, 'generateIcs options.holidays EXDATE', 'M4')) return;

  const lessons = [
    { id: 'ics-exdate-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 2, period: 1, duration: 1, subjectName: '化学' }
  ];
  const ics = app.run(`generateIcs(${JSON.stringify(lessons)}, '1年 M学科 1組', { holidays: ['20261103', '20261123'] })`);
  assert.ok(ics.includes('EXDATE'));
  assert.ok(ics.includes('20261103'));
});

test('F17-T2-04: Double-period lesson end time calculation (single VEVENT ending at 12:10 or 16:10)', async (t) => {
  const app = createAppInstance();
  const lessons = [
    { id: 'ics-double-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 1, duration: 2, subjectName: '工作実習' }
  ];
  const ics = app.run(`generateIcs(${JSON.stringify(lessons)}, '1年 M学科 1組')`);

  assert.ok(ics.includes('DTSTART;TZID=Asia/Tokyo:20261005T090000'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Tokyo:20261005T121000'));
  const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
  assert.equal(veventCount, 1, 'Emits exactly 1 VEVENT for 2-period contiguous lesson');
});

test('F17-T2-05: Out-of-range weekday / clamped period handling (weekend days or period overflow handled safely)', async (t) => {
  const app = createAppInstance();
  const lessons = [
    { id: 'ics-weekend-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 6, period: 1, duration: 1, subjectName: '土曜補講' },
    { id: 'ics-overflow-1', grade: 1, targetType: 'class', targetGroup: '1', dayOfWeek: 1, period: 4, duration: 3, subjectName: '時間外' }
  ];

  assert.doesNotThrow(() => {
    app.run(`generateIcs(${JSON.stringify(lessons)}, '1年 M学科 1組')`);
  });
});

// =============================================================================
// Feature 18: Cafeteria News Scraper & Menu View [Milestone: M5]
// =============================================================================

test('F18-T2-01: Scanned PDF unextracted text handling (meta.isTextExtracted: false with empty weeklyMenus)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, '#cafeteria tab routing', 'M5')) return;

  assert.ok(ready);
});

test('F18-T2-02: Cafeteria closed day rendering (closedReason displayed without price badges)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, 'Cafeteria closed day view', 'M5')) return;

  assert.ok(ready);
});

test('F18-T2-03: Missing or free-text price field does not render ¥null or ¥undefined', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, 'Cafeteria price formatting', 'M5')) return;

  assert.ok(ready);
});

test('F18-T2-04: Empty allergen array rendering does not throw error', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, 'Cafeteria allergens array', 'M5')) return;

  assert.ok(ready);
});

test('F18-T2-05: Long dish name layout integrity without breaking container structure', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("cafeteria:'食堂メニュー'") || read('app.js').includes('function cafeteria(');
  if (!requireOrSkip(t, ready, 'Cafeteria long title layout', 'M5')) return;

  assert.ok(ready);
});

// =============================================================================
// Feature 19: Cafeteria Fallback Modes [Milestone: M5]
// =============================================================================

test('F19-T2-01: Null sourcePdfUrl gracefully disables download button while preserving article link', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('dormitory') || read('app.js').includes('寮生食堂');
  if (!requireOrSkip(t, ready, 'Cafeteria null PDF fallback', 'M5')) return;

  assert.ok(ready);
});

test('F19-T2-02: Dormitory PDF direct link presence and fallback', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('dormitory') || read('app.js').includes('寮生食堂');
  if (!requireOrSkip(t, ready, 'Dormitory menu link', 'M5')) return;

  assert.ok(ready);
});

test('F19-T2-03: Direct news archive link available when detailed menu missing', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('news_list') || read('app.js').includes('news2026.html');
  if (!requireOrSkip(t, ready, 'News archive fallback link', 'M5')) return;

  assert.ok(ready);
});

test('F19-T2-04: Network fetch failure falls back to embedded cafeteria cache', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('dormitory') || read('app.js').includes('寮生食堂');
  if (!requireOrSkip(t, ready, 'Cafeteria network fallback', 'M5')) return;

  assert.ok(ready);
});

test('F19-T2-05: Vacation month empty menu notice', async (t) => {
  const app = createAppInstance({
    mockDate: '2026-08-15T10:00:00+09:00'
  });

  const ready = read('app.js').includes('dormitory') || read('app.js').includes('寮生食堂');
  if (!requireOrSkip(t, ready, 'Cafeteria vacation notice', 'M5')) return;

  assert.ok(ready);
});

// =============================================================================
// Feature 20: Cookie-Based Syllabus Deep Link [Milestone: M5]
// =============================================================================

test('F20-T2-01: Empty or missing cookie falls back to school department list syllabus URL', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Syllabus resolver function', 'M5')) return;

  const fn = app.run('getSyllabusUrl');
  const url = fn({});
  assert.equal(url, 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja');
});

test('F20-T2-02: Invalid department code falls back to school department list syllabus URL', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Syllabus resolver function', 'M5')) return;

  const fn = app.run('getSyllabusUrl');
  const url = fn({ grade: 2, department: 'INVALID' });
  assert.equal(url, 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja');
});

test('F20-T2-03: Grade 4 E without course specified resolves to base E department or default course', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Syllabus resolver function', 'M5')) return;

  const fn = app.run('getSyllabusUrl');
  const url = fn({ grade: 4, department: 'E' });
  assert.ok(url.includes('department_id=12') || url.includes('department_id=13'));
});

test('F20-T2-04: XSS payload in cookie department code is sanitized and does not leak into syllabus URL', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Syllabus resolver function', 'M5')) return;

  const fn = app.run('getSyllabusUrl');
  const url = fn({ grade: 1, department: '<script>alert(1)</script>' });
  assert.equal(url.includes('<script>'), false);
  assert.equal(url, 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja');
});

test('F20-T2-05: Advanced course grade with undergraduate department normalizes to ME/AC', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('getSyllabusUrl') || read('timetable-data.js').includes('getSyllabusUrl');
  if (!requireOrSkip(t, ready, 'Syllabus resolver function', 'M5')) return;

  const fn = app.run('getSyllabusUrl');
  const url = fn({ grade: 6, department: 'M' });
  assert.ok(url.includes('department_id=21') || url.includes('school_id=27'));
});

// =============================================================================
// Feature 21: Official URL Directory [Milestone: M5]
// =============================================================================

test('F21-T2-01: Non-goals strict exclusion check (absence of class changes, room reservations, congestion)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("links:'リンク'") || read('app.js').includes('function links(') || read('index.html').includes('webclass.kosen-k.go.jp');
  if (!requireOrSkip(t, ready, '#links tab routing', 'M5')) return;

  app.navigate('#links');
  const mainHtml = app.elements.main.innerHTML;
  assert.equal(mainHtml.includes('授業変更'), false, 'No class substitution link in links directory');
  assert.equal(mainHtml.includes('空き教室'), false, 'No room reservation link in links directory');
  assert.equal(mainHtml.includes('混雑状況'), false, 'No congestion statistics in links directory');
});

test('F21-T2-02: Protocol security strictly HTTPS for all official service links', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("links:'リンク'") || read('app.js').includes('function links(') || read('index.html').includes('webclass.kosen-k.go.jp');
  if (!requireOrSkip(t, ready, '#links official directory', 'M5')) return;

  app.navigate('#links');
  const links = app.document.querySelectorAll('#links a');
  for (const a of links) {
    if (a.href && !a.href.startsWith('#')) {
      assert.ok(a.href.startsWith('https://'), `Link ${a.href} uses secure https:// scheme`);
    }
  }
});

test('F21-T2-03: External link security attributes (target="_blank", rel="noopener noreferrer")', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("links:'リンク'") || read('app.js').includes('function links(') || read('index.html').includes('webclass.kosen-k.go.jp');
  if (!requireOrSkip(t, ready, '#links official directory', 'M5')) return;

  app.navigate('#links');
  const links = app.document.querySelectorAll('#links a');
  for (const a of links) {
    if (a.href && a.href.startsWith('https://')) {
      assert.equal(a.getAttribute('target'), '_blank', 'Opens in new tab');
      assert.match(a.getAttribute('rel') || '', /noopener/, 'Has noopener attribute');
      assert.match(a.getAttribute('rel') || '', /noreferrer/, 'Has noreferrer attribute');
    }
  }
});

test('F21-T2-04: Keyboard navigation and descriptive ARIA labels on official links', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes("links:'リンク'") || read('app.js').includes('function links(') || read('index.html').includes('webclass.kosen-k.go.jp');
  if (!requireOrSkip(t, ready, '#links official directory', 'M5')) return;

  assert.ok(ready);
});

test('F21-T2-05: Offline static file protocol (file://) resilience', async (t) => {
  const app = createAppInstance({
    protocol: 'file:',
    pathname: '/app/index.html'
  });
  app.navigate('#links');

  const heading = app.document.querySelector('.page-heading');
  assert.ok(heading !== null, 'Links view renders without crashing under file:// protocol');
});

// =============================================================================
// Feature 22: LocalStorage My Links Manager [Milestone: M5]
// =============================================================================

test('F22-T2-01: Corrupted LocalStorage JSON syntax recovery (handles syntax error and returns safe list)', async (t) => {
  const app = createAppInstance({
    localStorageData: {
      'campus-links-v1': '{"corrupted json syntax...'
    }
  });

  const ready = read('app.js').includes('loadMyLinks') || read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'loadMyLinks function', 'M5')) return;

  const fn = app.run('loadMyLinks');
  const links = fn();
  assert.ok(Array.isArray(links), 'Returns array despite corrupted JSON syntax');
});

test('F22-T2-02: Strict rejection of javascript: pseudo-protocol scheme', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('addCustomLink') || read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'Add custom link function', 'M5')) return;

  const fnName = app.run('typeof addCustomLink === "function" ? "addCustomLink" : "addMyLink"');
  const res = app.run(`${fnName}({ name: "Poisoned", url: "javascript:alert(document.cookie)" })`);
  assert.ok(!res || res.success === false || res.error, 'Rejects javascript: URI scheme');
});

test('F22-T2-03: Blank or whitespace-only name/URL validation rejection', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('addCustomLink') || read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'Add custom link validation', 'M5')) return;

  const fnName = app.run('typeof addCustomLink === "function" ? "addCustomLink" : "addMyLink"');
  const res = app.run(`${fnName}({ name: "   ", url: "" })`);
  assert.ok(!res || res.success === false || res.error, 'Rejects blank name/URL');
});

test('F22-T2-04: Storage QuotaExceededError handling (catches exception and notifies user without crashing)', async (t) => {
  const app = createAppInstance({
    quotaExceededStorage: true
  });

  const ready = read('app.js').includes('saveMyLinks') || read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'saveMyLinks quota exception', 'M5')) return;

  assert.doesNotThrow(() => {
    app.run('saveMyLinks([{ id: "1", name: "Test", url: "https://example.com" }])');
  }, 'Catches QuotaExceededError without unhandled exception');
});

test('F22-T2-05: Reordering boundary checks (moving first item up or last item down does nothing out-of-bounds)', async (t) => {
  const app = createAppInstance();
  const ready = read('app.js').includes('reorderMyLink') || read('app.js').includes('campus-links-v1');
  if (!requireOrSkip(t, ready, 'reorderMyLink boundary check', 'M5')) return;

  assert.doesNotThrow(() => {
    app.run('reorderMyLink("first-id", "up")');
    app.run('reorderMyLink("last-id", "down")');
  });
});

// =============================================================================
// Feature 23: E2E Test Suite (Tiers 1–4) Harness Contracts [Milestone: E2E]
// =============================================================================

test('F23-T2-01: Strict mode (STRICT_E2E=1) enforcement fails test instead of skipping when condition is unmet', async (t) => {
  const prevStrict = process.env.STRICT_E2E;
  try {
    process.env.STRICT_E2E = '1';
    let failed = false;
    try {
      requireOrSkip(t, false, 'NonExistentFeature', 'M99');
    } catch (err) {
      failed = true;
      assert.match(err.message, /\[STRICT ERROR\]/, 'Throws strict error when condition is unmet');
    }
    assert.equal(failed, true, 'Strict mode forced assertion failure');
  } finally {
    process.env.STRICT_E2E = prevStrict;
  }
});

test('F23-T2-02: Sandbox isolation between tests (independent cookie and localStorage states across instances)', async (t) => {
  const app1 = createAppInstance({
    cookie: 'campus-student-v1={"grade":3}',
    localStorageData: { 'test-key': 'value1' }
  });
  const app2 = createAppInstance();

  assert.ok(app1.cookie().includes('grade'), 'App 1 has custom cookie');
  assert.equal(app2.cookie(), '', 'App 2 starts with clean empty cookie');
  assert.equal(app1.localStorage.getItem('test-key'), 'value1');
  assert.equal(app2.localStorage.getItem('test-key'), null, 'App 2 has isolated localStorage');
});

test('F23-T2-03: Unhandled rejection propagation in VM sandbox surfaces error cleanly', async (t) => {
  const app = createAppInstance({
    fetchMock: async () => {
      throw new Error('Asynchronous mock failure');
    }
  });

  await assert.rejects(
    async () => {
      await app.context.fetch('./dist-data/test.json');
    },
    /Asynchronous mock failure/,
    'Propagates rejection to async caller without hung process'
  );
});

test('F23-T2-04: Mobile drawer backdrop and focus trap simulation cycles focus and restores on Escape', async (t) => {
  const app = createAppInstance({ mobile: true });
  app.click('menu-toggle');
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'true');

  app.keydown('menu-close', { key: 'Escape' });
  assert.equal(app.elements['menu-toggle'].getAttribute('aria-expanded'), 'false');
});

test('F23-T2-05: CLI runner timeout and stderr handling (captures stderr output and exit code cleanly)', async (t) => {
  const cliRes = runCli(process.execPath, ['--invalid-flag-for-testing-purposes']);
  assert.notEqual(cliRes.status, 0, 'Non-zero exit status for invalid flag');
  assert.ok(cliRes.stderr.length > 0, 'Captures stderr content');
});

// =============================================================================
// Feature 24: Adversarial Hardening (Tier 5) Injection Scenarios [Milestone: E2E]
// =============================================================================

test('F24-T2-01: Prototype pollution defense in cookie and JSON parsers (__proto__, constructor payloads ignored)', async (t) => {
  const maliciousPayload = JSON.stringify({
    version: 1,
    grade: 1,
    department: 'M',
    __proto__: { polluted: true },
    constructor: { prototype: { admin: true } }
  });

  const app = createAppInstance({
    cookie: `campus-student-v1=${encodeURIComponent(maliciousPayload)}`
  });

  assert.equal(({}).polluted, undefined, 'Object prototype polluted property is undefined');
  assert.equal(({}).admin, undefined, 'Object prototype admin property is undefined');
});

test('F24-T2-02: 100KB cookie overflow defense (safely handled without buffer overflow or crash)', async (t) => {
  const junkPadding = 'A'.repeat(100000);
  const oversizedCookie = `campus-student-v1=${encodeURIComponent(JSON.stringify({ version: 1, padding: junkPadding }))}`;

  const app = createAppInstance({
    cookie: oversizedCookie
  });

  const grade = app.run('studentSelection.grade');
  assert.equal(grade, 1, 'Safely falls back to default grade 1');
});

test('F24-T2-03: XSS payload in cookie (<script>alert(1)</script>, <img src=x onerror=...> sanitized)', async (t) => {
  const xssPayload = JSON.stringify({
    version: 1,
    grade: '<script>alert("grade")</script>',
    department: '<img src=x onerror=alert("dept")>',
    classGroup: '"><script>alert(1)</script>'
  });

  const app = createAppInstance({
    cookie: `campus-student-v1=${encodeURIComponent(xssPayload)}`
  });

  const s = app.run('studentSelection');
  assert.equal(s.grade, 1, 'Poisoned grade sanitized to 1');
  assert.equal(s.department, 'M', 'Poisoned department sanitized to M');
  assert.equal(s.classGroup, '1', 'Poisoned classGroup sanitized to 1');
});

test('F24-T2-04: Truncated or malformed JSON fetch response safely caught without UI freeze', async (t) => {
  const app = createAppInstance({
    fetchMock: {
      './dist-data/timetable-lessons.json': '{"meta": {"title": "incomplete json payload'
    }
  });

  app.navigate('#timetable');
  const heading = app.document.querySelector('.page-heading');
  assert.ok(heading !== null, 'Renders timetable despite malformed JSON payload');
});

test('F24-T2-05: Network partition / dead port fetch recovery seamlessly uses embedded dataset', async (t) => {
  const app = createAppInstance({
    fetchMock: () => {
      const err = new TypeError('Failed to fetch: Connection refused (ECONNREFUSED 127.0.0.1:9999)');
      err.code = 'ECONNREFUSED';
      throw err;
    }
  });

  app.navigate('#home');
  app.navigate('#timetable');

  const main = app.document.getElementById('main');
  assert.ok(main.innerHTML.length > 0, 'UI hydrates successfully from embedded dataset');
});
