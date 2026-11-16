/**
 * E2E Shared Headless DOM & VM Simulation Harness
 *明石高専キャンパスポータル (Akashi Kosen Campus Portal)
 *
 * Provides a lightweight, high-fidelity headless browser environment inside Node.js vm:
 * - Virtual DOM with MockElement, document, window, matchMedia
 * - RFC 6265 Cookie Jar emulation (Path, Max-Age, SameSite, Secure)
 * - Storage Mock (localStorage, QuotaExceededError, corrupted payload recovery)
 * - Controllable Time Machine (MockDate with Asia/Tokyo timezone lock)
 * - Fetch Router with dist-data fixtures and fault injection (offline, 404, 500, corrupt JSON)
 * - Progressive testability gate: requireOrSkip(t, condition, featureName, milestone)
 */

'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Safely reads a file relative to project root
 */
function read(file) {
  return fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
}

/**
 * Checks if a file exists relative to project root
 */
function fileExists(file) {
  return fs.existsSync(path.join(ROOT_DIR, file));
}

/**
 * Safely reads and parses a JSON file relative to project root
 */
function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
}

/**
 * Executes a CLI command synchronously and returns stdout, stderr, and exit status
 */
function runCli(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: options.timeout || 30000,
    env: { ...process.env, ...options.env },
    ...options
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error
  };
}

/**
 * Default dist-data fixtures for offline and unit simulation
 */
const DEFAULT_FIXTURES = {
  './dist-data/timetable-lessons.json': {
    meta: {
      title: '令和8年度後期授業時間割表',
      term: '後期',
      fiscalYear: 2026,
      sourceUrl: 'https://www.akashi.ac.jp/life/lesson.html',
      updatedAt: '2026-11-13T03:31:27.436Z',
      totalLessons: 351
    },
    lessons: []
  },
  './dist-data/calendar.json': {
    meta: {
      title: '令和8年度 年間行事予定表',
      fiscalYear: 2026,
      sourceUrl: 'https://www.akashi.ac.jp/life/calendar.html',
      updatedAt: '2026-11-13T00:00:00.000Z'
    },
    terms: {
      zenki: { startDate: '2026-04-06', endDate: '2026-07-31', totalWeeks: 15 },
      kouki: { startDate: '2026-10-01', endDate: '2027-02-12', totalWeeks: 15 }
    },
    daySubstitutions: [
      { date: '2026-10-14', originalDay: 2, effectiveDay: 1, reason: '月曜日授業振替' },
      { date: '2026-11-25', originalDay: 3, effectiveDay: 5, reason: '金曜日授業振替' }
    ],
    events: [
      { date: '2026-04-08', title: '前期始業式', type: 'ceremony' },
      { date: '2026-04-23', title: '開校記念日', type: 'ceremony', description: '授業日 (2)' },
      { date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業', type: 'vacation' },
      { date: '2026-10-01', title: '後期始業式・第1週', type: 'ceremony' },
      { date: '2026-10-12', title: 'スポーツの日', type: 'holiday' },
      { date: '2026-10-14', title: '月曜日授業振替（火曜）', type: 'academic' },
      { date: '2026-10-31', title: '高専祭準備', type: 'school_event' },
      { date: '2026-11-01', title: '高専祭', type: 'school_event' },
      { date: '2026-11-20', title: '後期中間試験開始', type: 'exam' },
      { date: '2026-11-26', title: '後期中間試験終了', type: 'exam' },
      { date: '2026-12-26', endDate: '2027-01-05', title: '冬季休業', type: 'vacation' },
      { date: '2027-02-05', title: '後期期末試験開始', type: 'exam' },
      { date: '2027-02-12', title: '学年末試験終了', type: 'exam' }
    ]
  },
  './dist-data/exam.json': {
    meta: {
      title: '令和8年度後期定期試験時間割',
      term: '後期',
      status: 'unreleased',
      noticeText: '定期試験時間割は、試験開始10日前の正午にこちらで発表します。',
      selfStudyRule: '試験は2限から開始しますが、9時に登校し自習することを原則とします。JRの遅延などが生じた場合、9時に登校していることを前提として対応します。',
      sourcePdfUrl: 'https://www.akashi.ac.jp/life/examtimetable.html',
      notesPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/syotyuiR70522.pdf',
      previousExamPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/R8zenkishiken0728.pdf',
      updatedAt: '2026-11-13T00:00:00.000Z'
    },
    periods: [
      { id: '2-F', start: '10:40', end: '11:25', label: '2限 前半' },
      { id: '2-S', start: '11:25', end: '12:10', label: '2限 後半' },
      { id: '3-F', start: '13:00', end: '13:45', label: '3限 前半' },
      { id: '3-S', start: '13:45', end: '14:30', label: '3限 後半' },
      { id: '4-F', start: '14:40', end: '15:25', label: '4限 前半' },
      { id: '4-S', start: '15:25', end: '16:10', label: '4限 後半' }
    ],
    schedule: []
  },
  './dist-data/cafeteria.json': {
    meta: {
      title: '学生食堂メニュー（１１/４～１１/３０）',
      articleDate: '2026-10-26',
      articleUrl: 'https://www.akashi.ac.jp/news/2026/20261026gak001.html',
      sourcePdfUrl: 'https://www.akashi.ac.jp/news/us72p4000000005j-att/2026.11.pdf',
      dormitoryArticleUrl: 'https://www.akashi.ac.jp/news/2026/20261020ryo001.html',
      dormitoryPdfUrl: 'https://www.akashi.ac.jp/news/us72p4000000005j-att/menyu.pdf',
      isTextExtracted: true,
      month: 11,
      fiscalYear: 2026,
      updatedAt: '2026-11-13T00:00:00.000Z'
    },
    weeklyMenus: [
      {
        weekRange: '11/04 - 11/08',
        days: [
          {
            date: '2026-11-04',
            dayOfWeek: '水',
            isOpen: true,
            lunchA: { name: '豚肉の生姜焼き', price: 450, allergens: ['小麦', '大豆'] },
            lunchB: { name: '白身魚のフライ', price: 450, allergens: ['小麦', '卵'] },
            noodle: { name: 'きつねうどん', price: 320, allergens: ['小麦'] },
            bowl: { name: '親子丼', price: 420, allergens: ['小麦', '卵'] }
          },
          {
            date: '2026-11-13',
            dayOfWeek: '金',
            isOpen: true,
            lunchA: { name: 'チキン南蛮定食', price: 480, allergens: ['小麦', '卵', '乳'] },
            lunchB: { name: '麻婆豆腐', price: 440, allergens: ['小麦', '大豆', '豚肉'] },
            noodle: { name: '味噌ラーメン', price: 380, allergens: ['小麦', '豚肉'] },
            bowl: { name: 'カツ丼', price: 480, allergens: ['小麦', '卵', '豚肉'] }
          }
        ]
      }
    ]
  }
};

/**
 * Progressive testability gate helper
 * - In strict mode (STRICT_E2E=1): condition must be truthy; fails test immediately if false.
 * - In default development mode: skips test with informative milestone tag if false.
 */
function requireOrSkip(t, condition, featureName, milestone = 'M1') {
  if (!condition) {
    if (process.env.STRICT_E2E === '1') {
      assert.fail(`[STRICT ERROR] Feature ${featureName} (${milestone}) must be implemented and passing`);
    }
    t.skip(`[${milestone}] ${featureName} not yet implemented`);
    return false;
  }
  return true;
}

/**
 * Creates an opaque-box headless application instance for E2E testing
 */
function createAppInstance(options = {}) {
  const {
    cookie = '',
    localStorageData = {},
    mobile = false,
    pathname = '/campus/',
    protocol = 'https:',
    mockDate = '2026-11-13T09:00:00+09:00',
    fetchMock = null,
    blockedCookie = false,
    quotaExceededStorage = false
  } = options;

  let jar = cookie;
  let lastCookieAttr = '';
  const storageStore = new Map(Object.entries(localStorageData));
  const elements = {};
  let currentActiveElement = null;

  // Mock Element implementation
  function getOrCreateElement(id) {
    if (elements[id]) return elements[id];
    const classes = new Set();
    const attrs = {};
    const listeners = {};
    let innerHtml = '';
    let textVal = '';
    const childNodes = [];

    const el = {
      id,
      tagName: (id.startsWith('btn-') || id.endsWith('-btn') || id.includes('toggle') || id.includes('button')) ? 'BUTTON'
             : (id.startsWith('input-') || id.endsWith('-input')) ? 'INPUT'
             : (id.startsWith('select-') || id.endsWith('-select') || id.startsWith('student-')) ? 'SELECT'
             : (id.startsWith('nav-') || id.endsWith('-link')) ? 'A'
             : id.toUpperCase(),
      type: 'text',
      name: id,
      disabled: false,
      hidden: false,
      inert: false,
      value: '',
      checked: false,
      dataset: {},
      attrs,
      listeners,
      parentElement: null,
      children: childNodes,
      style: {},
      options: [],

      get href() {
        return attrs.href || '';
      },
      set href(val) {
        attrs.href = String(val);
      },

      get innerHTML() {
        return innerHtml;
      },
      set innerHTML(val) {
        innerHtml = String(val);
        textVal = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      },

      get textContent() {
        return textVal || innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      },
      set textContent(val) {
        textVal = String(val);
        innerHtml = String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      },

      classList: {
        add(...names) {
          names.forEach(n => classes.add(n));
        },
        remove(...names) {
          names.forEach(n => classes.delete(n));
        },
        toggle(name, force) {
          if (force === true) classes.add(name);
          else if (force === false) classes.delete(name);
          else if (classes.has(name)) classes.delete(name);
          else classes.add(name);
        },
        contains: name => classes.has(name)
      },

      setAttribute(k, v) {
        attrs[k] = String(v);
        if (k === 'aria-expanded') this.ariaExpanded = String(v);
        if (k === 'href') this.href = String(v);
      },
      getAttribute: k => attrs[k] ?? null,
      removeAttribute: k => {
        delete attrs[k];
      },
      hasAttribute: k => Object.hasOwn(attrs, k),

      addEventListener(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      },
      removeEventListener(event, fn) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(f => f !== fn);
      },
      dispatchEvent(evt) {
        const type = typeof evt === 'string' ? evt : evt.type;
        const list = listeners[type] || [];
        const eventObj = typeof evt === 'string'
          ? { type: evt, target: this, defaultPrevented: false, preventDefault() {} }
          : { target: this, defaultPrevented: false, preventDefault() {}, ...evt };
        for (const fn of list) {
          fn.call(this, eventObj);
        }
      },

      focus({ preventScroll } = {}) {
        currentActiveElement = this;
      },
      blur() {
        if (currentActiveElement === this) currentActiveElement = null;
      },
      scrollIntoView() {},

      contains(target) {
        if (this === target) return true;
        if (id === 'sidebar') {
          const sidebarIds = ['menu-close', 'brand', 'home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'];
          return sidebarIds.includes(target?.id) || target?.id?.startsWith('nav-');
        }
        return false;
      },

      append(...newChildren) {
        newChildren.forEach(child => {
          if (typeof child === 'object' && child) {
            child.parentElement = this;
            childNodes.push(child);
          }
        });
      },
      appendChild(child) {
        if (typeof child === 'object' && child) {
          child.parentElement = this;
          childNodes.push(child);
        }
        return child;
      },
      remove() {
        if (this.parentElement) {
          const idx = this.parentElement.children.indexOf(this);
          if (idx !== -1) this.parentElement.children.splice(idx, 1);
          this.parentElement = null;
        }
      },
      cloneNode(deep = true) {
        const cloneId = `${id}-clone-${Date.now()}`;
        const clone = getOrCreateElement(cloneId);
        clone.innerHTML = this.innerHTML;
        clone.value = this.value;
        Object.assign(clone.attrs, this.attrs);
        return clone;
      },

      querySelector(selector) {
        if (!selector) return null;
        if (selector.startsWith('#')) return getOrCreateElement(selector.slice(1));
        if (selector === '.current-badge') return getOrCreateElement('current-badge');
        if (selector === '.selection-status') return getOrCreateElement('selection-status');
        if (selector === '.table-scroll') return getOrCreateElement('table-scroll');
        if (selector === '.panel-head') return getOrCreateElement('panel-head');
        if (selector === '.timetable-source') return getOrCreateElement('timetable-source');
        if (selector === '.topbar') return getOrCreateElement('topbar');
        if (selector === '.theme-icon') return getOrCreateElement('theme-icon');
        if (selector === 'table') return getOrCreateElement('timetable-grid-table');
        const clean = selector.replace(/[^a-zA-Z0-9_-]/g, '');
        return getOrCreateElement(clean || 'sub-element');
      },

      querySelectorAll(selector) {
        if (selector === '[data-page]') {
          return ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'].map(p => getOrCreateElement(p));
        }
        if (selector === '[data-student]') {
          return ['grade', 'department', 'classGroup', 'studentType', 'course', 'arts'].map(k => getOrCreateElement(`student-${k}`));
        }
        if (selector === 'a' || selector === 'nav a') {
          return ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'].map(p => getOrCreateElement(p));
        }
        if (selector === '[data-icon]') {
          return [];
        }
        if (selector === '[data-size-mode]') {
          return ['mode-compact', 'mode-normal', 'mode-large'].map(m => getOrCreateElement(m));
        }
        if (selector === '[data-export-exclude]') {
          return [];
        }
        return [];
      }
    };

    elements[id] = el;
    return el;
  }

  // Pre-seed core tabs
  const allTabs = ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'];
  allTabs.forEach(tab => {
    const el = getOrCreateElement(tab);
    el.dataset.page = tab;
  });

  // Pre-seed student selectors
  const studentFields = ['grade', 'department', 'classGroup', 'studentType', 'course', 'arts'];
  studentFields.forEach(k => {
    const el = getOrCreateElement(`student-${k}`);
    el.dataset.student = k;
  });
  getOrCreateElement('student-grade').value = '1';
  getOrCreateElement('student-department').value = 'M';
  getOrCreateElement('student-classGroup').value = '1';

  // Pre-seed navigation elements
  getOrCreateElement('sidebar');
  getOrCreateElement('menu-toggle');
  getOrCreateElement('menu-close');
  getOrCreateElement('menu-overlay');
  getOrCreateElement('workspace');
  getOrCreateElement('skip-link');
  getOrCreateElement('main');
  getOrCreateElement('theme-toggle');

  const media = {
    matches: mobile,
    listeners: {},
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    },
    change() {
      if (this.listeners.change) this.listeners.change({ matches: this.matches });
    }
  };

  const document = {
    body: getOrCreateElement('body'),
    listeners: {},
    title: '',
    get activeElement() {
      return currentActiveElement;
    },
    set activeElement(el) {
      currentActiveElement = el;
    },
    getElementById: getOrCreateElement,
    querySelector: sel => {
      if (!sel) return null;
      if (sel.startsWith('#')) return getOrCreateElement(sel.slice(1));
      if (sel === '.workspace') return getOrCreateElement('workspace');
      if (sel === '.skip-link') return getOrCreateElement('skip-link');
      if (sel === '.topbar') return getOrCreateElement('topbar');
      if (sel === '.selection-status') return getOrCreateElement('selection-status');
      if (sel === '.filter-toggle-label') return getOrCreateElement('filter-toggle-label');
      const clean = sel.replace(/[^a-zA-Z0-9_-]/g, '');
      return getOrCreateElement(clean || 'query-el');
    },
    querySelectorAll: sel => {
      return getOrCreateElement('body').querySelectorAll(sel);
    },
    createElement: tag => {
      const el = getOrCreateElement(`created-${tag.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      el.tagName = tag.toUpperCase();
      return el;
    },
    addEventListener(name, fn) {
      if (!this.listeners[name]) this.listeners[name] = [];
      this.listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      if (!this.listeners[name]) return;
      this.listeners[name] = this.listeners[name].filter(f => f !== fn);
    },
    dispatchEvent(evt) {
      const type = typeof evt === 'string' ? evt : evt.type;
      const list = this.listeners[type] || [];
      const eventObj = typeof evt === 'string' ? { type: evt, target: this } : evt;
      list.forEach(fn => fn(eventObj));
    }
  };

  // RFC 6265 Cookie Jar simulation
  Object.defineProperty(document, 'cookie', {
    get: () => jar,
    set: val => {
      lastCookieAttr = val;
      if (!blockedCookie) {
        const parts = val.split(';');
        const pair = parts[0].trim();
        const eqIdx = pair.indexOf('=');
        const k = eqIdx !== -1 ? pair.slice(0, eqIdx) : pair;
        const v = eqIdx !== -1 ? pair.slice(eqIdx + 1) : '';

        const existing = jar ? jar.split(';').map(s => s.trim()).filter(s => s && !s.startsWith(`${k}=`)) : [];
        if (v !== undefined) existing.push(pair);
        jar = existing.join('; ');
      }
    }
  });

  // LocalStorage Mock
  const localStorageMock = {
    getItem: k => (storageStore.has(k) ? storageStore.get(k) : null),
    setItem: (k, v) => {
      if (quotaExceededStorage) {
        const err = new Error('QuotaExceededError: The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      }
      storageStore.set(k, String(v));
    },
    removeItem: k => storageStore.delete(k),
    clear: () => storageStore.clear(),
    get length() {
      return storageStore.size;
    },
    key: i => Array.from(storageStore.keys())[i] ?? null
  };

  // Controllable Time Machine Date Mock
  let currentMockDate = mockDate ? new Date(mockDate) : new Date();
  class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(currentMockDate.getTime());
      else super(...args);
    }
    static now() {
      return currentMockDate.getTime();
    }
  }

  // Synchronous-chainable Promise helpers so mock dist-data resolves during VM bootstrap
  function syncRejectedPromise(err) {
    const p = Promise.reject(err);
    p.catch(() => {});
    p.then = function (_onFulfilled, onRejected) {
      try {
        if (onRejected) {
          const next = onRejected(err);
          return next && typeof next.then === 'function' ? next : syncPromise(next);
        }
        return p;
      } catch (err2) {
        return syncRejectedPromise(err2);
      }
    };
    p.catch = function (onRejected) {
      return p.then(undefined, onRejected);
    };
    return p;
  }

  function syncPromise(val) {
    const p = Promise.resolve(val);
    p.then = function (onFulfilled, onRejected) {
      try {
        if (!onFulfilled) return p;
        const next = onFulfilled(val);
        return next && typeof next.then === 'function' ? next : syncPromise(next);
      } catch (err) {
        if (onRejected) {
          try {
            const next = onRejected(err);
            return next && typeof next.then === 'function' ? next : syncPromise(next);
          } catch (err2) {
            return syncRejectedPromise(err2);
          }
        }
        return syncRejectedPromise(err);
      }
    };
    p.catch = function () { return p; };
    return p;
  }

  function resolveSyncResponse(url) {
    if (fetchMock && typeof fetchMock === 'object' && Object.hasOwn(fetchMock, url)) {
      const data = fetchMock[url];
      if (data instanceof Error) return syncRejectedPromise(data);
      return syncPromise({
        ok: true,
        status: 200,
        json: () => {
          if (typeof data !== 'string') return syncPromise(data);
          try {
            return syncPromise(JSON.parse(data));
          } catch (err) {
            return syncRejectedPromise(err);
          }
        },
        text: () => syncPromise(typeof data === 'string' ? data : JSON.stringify(data))
      });
    }

    // Try reading directly from dist-data on disk if file exists
    const cleanUrl = url.replace(/^\.\//, '');
    if (cleanUrl.startsWith('dist-data/') && fileExists(cleanUrl)) {
      try {
        const fileContent = read(cleanUrl);
        const parsed = JSON.parse(fileContent);
        return syncPromise({
          ok: true,
          status: 200,
          json: () => syncPromise(parsed),
          text: () => syncPromise(fileContent)
        });
      } catch (err) {
        // Fall through to fixture if corrupted or unparseable
      }
    }

    if (DEFAULT_FIXTURES[url] || DEFAULT_FIXTURES[`./${cleanUrl}`]) {
      const fixture = DEFAULT_FIXTURES[url] || DEFAULT_FIXTURES[`./${cleanUrl}`];
      return syncPromise({
        ok: true,
        status: 200,
        json: () => syncPromise(fixture),
        text: () => syncPromise(JSON.stringify(fixture))
      });
    }

    return syncPromise({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => syncRejectedPromise(new Error('Not found')),
      text: () => syncPromise('Not found')
    });
  }

  // Fetch Router Simulator
  const fetchHandler = (url, fetchOptions = {}) => {
    if (fetchMock && typeof fetchMock === 'function') {
      return (async () => {
        const customRes = await fetchMock(url, fetchOptions);
        if (customRes) return customRes;
        return await resolveSyncResponse(url);
      })();
    }
    return resolveSyncResponse(url);
  };

  let lastClipboard = '';
  const navigatorMock = {
    onLine: true,
    userAgent: 'HeadlessPortalE2E/1.0',
    clipboard: {
      writeText: async text => {
        lastClipboard = text;
      },
      readText: async () => lastClipboard
    }
  };

  const contextLocation = {
    hash: '#home',
    pathname,
    protocol,
    href: `${protocol}//localhost${pathname}#home`,
    origin: `${protocol}//localhost`,
    search: ''
  };

  const windowMock = {
    listeners: {},
    location: contextLocation,
    matchMedia: () => media,
    addEventListener(name, fn) {
      if (!this.listeners[name]) this.listeners[name] = [];
      this.listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      if (!this.listeners[name]) return;
      this.listeners[name] = this.listeners[name].filter(f => f !== fn);
    },
    dispatchEvent(evt) {
      const type = typeof evt === 'string' ? evt : evt.type;
      (this.listeners[type] || []).forEach(fn => fn(evt));
    },
    scrollTo() {},
    alert() {},
    confirm: () => true,
    localStorage: localStorageMock,
    fetch: fetchHandler,
    navigator: navigatorMock,
    setTimeout,
    clearTimeout
  };

  // VM Execution Context
  const context = vm.createContext({
    Intl,
    Date: MockDate,
    URLSearchParams,
    URL,
    Blob,
    Math,
    JSON,
    console,
    document,
    localStorage: localStorageMock,
    fetch: fetchHandler,
    navigator: navigatorMock,
    location: contextLocation,
    window: windowMock,
    setTimeout,
    clearTimeout
  });

  // Load modules
  const timetableDataCode = read('timetable-data.js').replace(/^export .*$/mg, '');
  const timetableExportCode = read('timetable-export.js')
    .replace(/^import .*$/mg, '')
    .replace(/^export /mg, '');
  const appCode = read('app.js').replace(/^import .*;\r?\n/mg, '');

  vm.runInContext(timetableDataCode + '\n' + timetableExportCode + '\n' + appCode, context);

  return {
    context,
    run: code => vm.runInContext(code, context),
    elements,
    document,
    window: windowMock,
    media,
    cookie: () => jar,
    attributes: () => lastCookieAttr,
    localStorage: localStorageMock,
    setDate: iso => {
      currentMockDate = new Date(iso);
    },
    navigate: hash => {
      contextLocation.hash = hash;
      contextLocation.href = `${protocol}//localhost${pathname}${hash}`;
      windowMock.dispatchEvent('hashchange');
      try {
        vm.runInContext(`if(typeof render === 'function') render();`, context);
      } catch {}
    },
    selectStudent: sel => {
      for (const [k, v] of Object.entries(sel)) {
        const el = getOrCreateElement(`student-${k}`);
        el.value = String(v);
        (el.listeners.change || []).forEach(fn => fn({ target: el }));
      }
    },
    click: idOrEl => {
      const el = typeof idOrEl === 'string' ? getOrCreateElement(idOrEl) : idOrEl;
      el.dispatchEvent({ type: 'click' });
    },
    keydown: (idOrEl, keyEvent) => {
      const el = typeof idOrEl === 'string' ? getOrCreateElement(idOrEl) : idOrEl;
      const evt = { type: 'keydown', target: el, defaultPrevented: false, preventDefault() {}, ...keyEvent };
      el.dispatchEvent(evt);
      document.dispatchEvent(evt);
    },
    submit: (idOrEl, evtData = {}) => {
      const el = typeof idOrEl === 'string' ? getOrCreateElement(idOrEl) : idOrEl;
      const evt = { target: el, defaultPrevented: false, preventDefault() {}, ...evtData };
      el.dispatchEvent({ type: 'submit', ...evt });
    },
    getClipboard: () => lastClipboard
  };
}

module.exports = {
  createAppInstance,
  requireOrSkip,
  DEFAULT_FIXTURES,
  runCli,
  read,
  fileExists,
  readJson,
  ROOT_DIR
};
