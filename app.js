import { DAYS, TIMES, DEPARTMENTS, COURSE_LABELS, ADVANCED_DEPARTMENTS, ADVANCED_COURSE_LABELS, SOURCE, LESSONS, generateTimetable } from './timetable-data.js';

const icons = {
  home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  school:'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M8 9h1m6 0h1M8 12h1m6 0h1',
  calendar:'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 3h2',
  clock:'M12 8v5l3 2M8 3H4v4M4 7a9 9 0 1 1-1 7',
  door:'M4 21h16M7 21V5l10-2v18M12 13h1M17 7h3v14',
  edit:'m14 4 6 6M4 20l5-1L21 7l-6-6L3 13l-1 9 7-3',
  arrow:'m9 5 7 7-7 7',
  megaphone:'m3 10 16-5v13L3 14Zm4 5 2 5h3l-2-4M22 8v7',
  bell:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4Zm5 3h4M12 2v2',
  book:'M12 6c-3-3-7-3-10-2v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 2Zm0 0v15',
  check:'m5 12 4 4L19 6',
  info:'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  document:'M6 3h9l4 4v14H5V3Zm8 0v5h5M8 12h8m-8 4h6',
  briefcase:'M8 7V3h8v4M3 7h18v14H3ZM8 7v14m8-14v14',
  plus:'M12 5v14M5 12h14',
  moon:'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  sun:'M12 3v2m0 14v2M3 12h2m14 0h2m-3.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m13-1.4-1.4-1.4M6.9 6.9 5.5 5.5M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  monitor:'M3 5h18v12H3Zm5 16h8m-4-4v4',
  utensils:'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Zm4-6v3m4-3v3m4-3v3',
  link:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  external:'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
};
const names={home:'ホーム',timetable:'時間割',exam:'定期試験',calendar:'年間予定',cafeteria:'食堂メニュー',links:'リンク'};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icons[name] || icons.info}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(date);
const today = dateKey(new Date());
const longDate = date => new Intl.DateTimeFormat('ja-JP', {dateStyle:'full',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T12:00:00+09:00`));
const periods = [['09:00','10:30'],['10:40','12:10'],['13:00','14:30'],['14:40','16:10']];
const DEFAULT_SELECTION = { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' };
const COOKIE_NAME = 'campus-student-v1';
const ALL_DEPARTMENTS = [...DEPARTMENTS, ...ADVANCED_DEPARTMENTS];
const SELECTION_VALUES = { grade: [1,2,3,4,5,6,7], department: ALL_DEPARTMENTS, classGroup: ['1','2','3','4'], studentType: ['regular','international'], course: ['','ED','EJ'], arts: ['music','art'] };
let cookieSaved = false;
let exportInProgress = false;
const DEPARTMENT_NAMES = {
  M: 'M科',
  E: 'E科',
  C: 'C科',
  A: 'A科',
  ME: '機械・電子システム工学専攻 (ME)',
  AC: '建築・都市システム工学専攻 (AC)',
};
const EXPORT_MODES = {
  web: { padding: 16, cellHeight: 140, fontScale: 100 },
  a4fit: { padding: 16, cellHeight: 166, fontScale: 105 },
  memo: { padding: 16, cellHeight: 220, fontScale: 95 },
};
let exportSizeMode = 'web';
let exportSizeConfig = { ...EXPORT_MODES.web };
let a4ModeEnabled = false;
let exportIncludeEmpty = false;
let exportThemeOverride = null;
function getExportTheme() {
  return exportThemeOverride || resolveEffectiveTheme(currentTheme);
}
const EXPORT_FORMAT_CONFIGS = {
  pdf: { copyLabel: null, downloadLabel: '💾 PDFダウンロード', adjustLabel: 'レイアウト調整' },
  png: { copyLabel: '📋 画像をコピー', downloadLabel: '💾 PNG保存', adjustLabel: 'レイアウト調整' },
  ics: { copyLabel: '📋 iCalをコピー', downloadLabel: '💾 iCal保存 (.ics)', adjustLabel: '形式プレビュー' },
  text: { copyLabel: '📋 テキストをコピー', downloadLabel: '💾 テキスト保存', adjustLabel: 'プレビュー＆調整' },
  csv: { copyLabel: '📋 CSVをコピー', downloadLabel: '💾 CSVダウンロード', adjustLabel: '形式プレビュー' },
  json: { copyLabel: '📋 JSONをコピー', downloadLabel: '💾 JSONダウンロード', adjustLabel: 'データプレビュー' },
};
let currentExportFormat = 'pdf';
let textExportOptions = { includeLocation: true, includeTeacher: true };
function sanitizeSelection(value) {
  const result = { ...DEFAULT_SELECTION };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [key, allowed] of Object.entries(SELECTION_VALUES)) {
    if (allowed.includes(value[key])) result[key] = value[key];
  }
  return result;
}
function readSelectionCookie() {
  try {
    const entry = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE_NAME}=`));
    if (!entry) return { ...DEFAULT_SELECTION };
    const stored = JSON.parse(decodeURIComponent(entry.slice(COOKIE_NAME.length+1)));
    if (!stored || stored.version !== 1) return { ...DEFAULT_SELECTION };
    cookieSaved = true;
    return sanitizeSelection(stored);
  } catch { return { ...DEFAULT_SELECTION }; }
}
let studentSelection = readSelectionCookie();
let filterOpen = !cookieSaved;
function saveSelectionCookie() {
  try {
    // GitHub Pagesのリポジトリ配下に限定。HTTPSではSecureも付与する。
    const path = location.pathname.slice(0,location.pathname.lastIndexOf('/')+1) || '/';
    const value = encodeURIComponent(JSON.stringify({ version: 1, ...sanitizeSelection(studentSelection) }));
    document.cookie = `${COOKIE_NAME}=${value}; Path=${path}; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    cookieSaved = document.cookie.split(';').some(part=>part.trim()===`${COOKIE_NAME}=${value}`);
  } catch { cookieSaved = false; }
  return cookieSaved;
}
function heading(title,subtitle='',action='') {
  return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;
}
const link = (href,label) => `<a class="text-link" href="${href}">${label}${icon('arrow')}</a>`;
function studentLabel() {
  const s = studentSelection;
  if (s.grade >= 6) {
    return `専攻科${s.grade - 5}年 ${ADVANCED_COURSE_LABELS[s.department] || s.department}`;
  }
  return `${s.grade}年 ${s.department}科${s.grade <= 2 ? `・${s.classGroup}組` : ''}${s.grade >= 4 && s.department === 'E' ? `・${COURSE_LABELS[s.course] || 'コース未選択'}` : ''}${s.studentType === 'international' ? '・留学生' : ''}${s.grade === 1 ? `・${s.arts === 'art' ? '美術' : '音楽'}` : ''}`;
}
function studentShortLabel() {
  const s = studentSelection;
  if (s.grade >= 6) return `専${s.grade - 5}${s.department}`;
  if (s.grade <= 2) return `${s.grade}-${s.classGroup}-${s.department}`;
  if (s.grade >= 4 && s.department === 'E') return `${s.grade}${s.course || 'E'}`;
  return `${s.grade}${s.department}`;
}
let activeLessons = LESSONS;
let timetableMeta = {
  title: SOURCE?.title || '令和8年度後期授業時間割表',
  term: '後期',
  fiscalYear: 2026,
  updatedAt: SOURCE?.updated || '2026-09-24'
};

function selectedSchedule() {
  try { return { ...generateTimetable(activeLessons, studentSelection), error: '' }; }
  catch (error) { return { selected: [], grid: Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => [])), error: error.message }; }
}

function normalizeAkashiUrl(url, fallback = 'https://www.akashi.ac.jp/') {
  const raw = String(url || '').trim();
  if (!raw) return fallback;
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  try {
    return new URL(raw, 'https://www.akashi.ac.jp/').href;
  } catch {
    return fallback;
  }
}

function formatFiscalYear(fy) {
  if (!fy) return '令和8年度';
  if (typeof fy === 'string' && fy.includes('年度')) return fy;
  const num = Number(fy);
  if (Number.isFinite(num) && num >= 2019) return `令和${num - 2018}年度`;
  return `${fy}年度`;
}

const FALLBACK_CALENDAR = {
  meta: { title: '令和8年度 年間行事予定表', fiscalYear: 2026 },
  terms: {
    zenki: { startDate: '2026-04-06', endDate: '2026-07-31', totalWeeks: 15 },
    kouki: { startDate: '2026-10-01', endDate: '2027-02-12', totalWeeks: 15 }
  },
  daySubstitutions: [
    { date: '2026-04-08', originalDay: 3, effectiveDay: 1, substituteDay: '月', weekNumber: 1, reason: '月曜日授業振替', note: '水曜日に月曜授業を実施' },
    { date: '2026-10-14', originalDay: 2, effectiveDay: 1, substituteDay: '月', weekNumber: 3, reason: '月曜日授業振替', note: '火曜日に月曜授業を実施' },
    { date: '2026-11-04', originalDay: 3, effectiveDay: 1, substituteDay: '月', weekNumber: 5, reason: '月曜日授業振替', note: '水曜日に月曜授業を実施' },
    { date: '2026-11-25', originalDay: 3, effectiveDay: 5, substituteDay: '金', weekNumber: 8, reason: '金曜日授業振替', note: '水曜日に金曜授業を実施' },
    { date: '2027-01-12', originalDay: 2, effectiveDay: 1, substituteDay: '月', weekNumber: 13, reason: '月曜日授業振替', note: '火曜日に月曜授業を実施' }
  ],
  events: [
    { date: '2026-04-03', title: '入学式', hasClasses: false, type: 'ceremony' },
    { date: '2026-04-07', title: '前期授業開始・全校集会', hasClasses: true, type: 'academic' },
    { date: '2026-04-23', title: '開校記念日', hasClasses: true, type: 'ceremony' },
    { date: '2026-07-30', endDate: '2026-08-05', title: '前期期末試験', hasClasses: false, type: 'exam' },
    { date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業', hasClasses: false, type: 'vacation' },
    { date: '2026-10-01', title: '後期始業・第1週', hasClasses: true, type: 'ceremony' },
    { date: '2026-10-12', title: 'スポーツの日', hasClasses: false, type: 'holiday' },
    { date: '2026-10-14', title: '月曜日授業振替（火曜）', hasClasses: true, type: 'special' },
    { date: '2026-10-31', endDate: '2026-11-01', title: '高専祭', hasClasses: false, type: 'school_event' },
    { date: '2026-11-20', endDate: '2026-11-26', title: '後期中間試験', hasClasses: false, type: 'exam' },
    { date: '2026-12-26', endDate: '2027-01-05', title: '冬季休業', hasClasses: false, type: 'vacation' },
    { date: '2027-02-02', endDate: '2027-02-08', title: '後期期末試験（学年末試験）', hasClasses: false, type: 'exam' },
    { date: '2027-03-01', endDate: '2027-03-31', title: '春季休業', hasClasses: false, type: 'vacation' }
  ]
};

const FALLBACK_EXAM = {
  meta: {
    title: '令和8年度後期定期試験時間割',
    term: '後期',
    status: 'unreleased',
    noticeText: '定期試験時間割は、試験開始10日前の正午にこちらで発表します。',
    selfStudyRule: '試験は2限から開始しますが、9時に登校し自習することを原則とします。JRの遅延などが生じた場合、9時に登校していることを前提として対応します。',
    sourcePdfUrl: 'https://www.akashi.ac.jp/life/examtimetable.html',
    notesPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/syotyuiR70522.pdf',
    previousExamPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/R8zenkishiken0728.pdf'
  },
  periods: [],
  schedule: []
};

const FALLBACK_CAFETERIA = {
  meta: {
    title: '学生食堂メニュー（１１/４～１１/３０）',
    articleDate: '2026-10-26',
    articleUrl: 'https://www.akashi.ac.jp/news/2026/20261026gak001.html',
    sourcePdfUrl: 'https://www.akashi.ac.jp/news/us72p4000000005j-att/2026.11.pdf',
    dormitoryArticleUrl: 'https://www.akashi.ac.jp/news/2026/20261020ryo001.html',
    dormitoryPdfUrl: 'https://www.akashi.ac.jp/news/us72p4000000005j-att/menyu.pdf',
    isTextExtracted: true,
    month: 11,
    fiscalYear: 2026
  },
  weeklyMenus: [
    {
      weekRange: '11/04 - 11/08',
      days: [
        {
          date: '2026-11-04',
          dayOfWeek: '水',
          isOpen: true,
          lunchA: { name: '豚肉の生姜焼き', price: 450, allergens: '小麦 大豆' },
          lunchB: { name: '白身魚のフライ', price: 450, allergens: '小麦 卵' },
          noodle: { name: 'きつねうどん', price: 320 },
          bowl: { name: '親子丼', price: 420 },
          allergens: '小麦 卵 大豆'
        }
      ]
    },
    {
      weekRange: '11/09 - 11/13',
      days: [
        {
          date: '2026-11-11',
          dayOfWeek: '水',
          isOpen: true,
          lunchA: { name: '豚肉の生姜焼き', price: 430, allergens: '小麦 卵 乳 豚肉 大豆' },
          lunchB: { name: '牛肉コロッケ＆ミンチカツ', price: 430 },
          noodle: { name: '担々麺 / きつねうどん・そば', price: 400 },
          bowl: { name: 'カツ丼', price: 450 },
          allergens: '小麦 卵 乳 豚肉 大豆'
        },
        {
          date: '2026-11-13',
          dayOfWeek: '金',
          isOpen: true,
          lunchA: { name: 'チキン南蛮定食', price: 480, allergens: '小麦 卵 乳 鶏肉 大豆' },
          lunchB: { name: '特製ビーフカレー', price: 450 },
          noodle: { name: '醤油ラーメン / きつねうどん・そば', price: 380 },
          bowl: { name: '温玉豚カルビ丼', price: 450 },
          allergens: '小麦 卵 乳 鶏肉 大豆'
        }
      ]
    }
  ]
};

let calendarData = { ...FALLBACK_CALENDAR };
let examData = { ...FALLBACK_EXAM };
let cafeteriaData = { ...FALLBACK_CAFETERIA };
let timetableLinksData = null;
const DEFAULT_ROOM_LEGENDS = {
  'トーカロ': 'トーカロ教室（旧合併教室）',
  'オークラ': 'オークラ輸送機 4M教室',
  '情1': '情報メディアセンター第1演習室',
  '情2': '情報メディアセンター第2演習室',
  '情3': '情報メディアセンター第3演習室',
  '情4': '情報メディアセンター第4演習室',
  '福研': '福利施設研修室',
  'もの': 'A科ものづくり演習室',
  '専講': '専攻科棟講義室',
  '演1': '専攻科棟演習室1'
};
let activeRoomLegends = { ...DEFAULT_ROOM_LEGENDS };
let isOfflineFallback = false;
let dashboardOffsetDays = 0;
let calendarFilterPeriod = 'all';
let calendarFilterCategory = 'all';
let selectedCafeteriaWeekIdx = -1;
let lastModalTrigger = null;

function expandRoomLegend(loc) {
  const raw = String(loc || '').trim();
  if (!raw) return '';
  const tokens = raw.split(/[・/\s]+/).filter(Boolean);
  const expanded = tokens.map(tok => activeRoomLegends[tok] ? `${tok}: ${activeRoomLegends[tok]}` : null).filter(Boolean);
  return expanded.length ? expanded.join(' / ') : raw;
}

function getTimetablePdfUrl() {
  const lessonPage = timetableLinksData?.pages?.find(p => p.id === 'lesson');
  const term = timetableMeta?.term || '後期';
  const matched = lessonPage?.items?.find(i => i.term === term) || lessonPage?.items?.[0];
  return normalizeAkashiUrl(matched?.url || timetableMeta?.sourcePdfUrl, 'https://www.akashi.ac.jp/o7en060000000d0c-att/R8_koukijikanwari_20260924-2.pdf');
}

function getThemeButtonMeta(mode = currentTheme) {
  const eff = resolveEffectiveTheme(mode);
  const nextMode = getNextThemeMode(mode);
  const iconName = mode === 'system' ? 'monitor' : (eff === 'dark' ? 'sun' : 'moon');
  const label = nextMode === 'system'
    ? 'OS設定連動（自動）に戻す'
    : (nextMode === 'dark' ? 'ダークモードに切り替える' : 'ライトモードに切り替える');
  return { eff, nextMode, iconName, label };
}

function themeToggleBtn() {
  const { iconName, label } = getThemeButtonMeta(currentTheme);
  return `<button id="theme-toggle" class="theme-toggle" type="button" data-theme-mode="${escapeHTML(currentTheme)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"><span class="theme-icon" data-icon="${iconName}">${icon(iconName)}</span></button>${isOfflineFallback ? '<span id="network-status-badge" class="badge yellow network-status-badge" title="内蔵フォールバックデータを表示中">オフライン表示</span>' : ''}`;
}

function fetchDistJson(url, onSuccess) {
  try {
    const resPromise = fetch(url);
    if (!resPromise || typeof resPromise.then !== 'function') return;
    resPromise
      .then(r => {
        if (!r || !r.ok) {
          isOfflineFallback = true;
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          onSuccess(data);
          render();
        }
      })
      .catch(() => {
        isOfflineFallback = true;
      });
  } catch {
    isOfflineFallback = true;
  }
}

function loadDistData() {
  if (typeof fetch !== 'function') return;
  fetchDistJson('./dist-data/timetable-lessons.json', data => {
    if (data.meta && typeof data.meta === 'object') {
      timetableMeta = { ...timetableMeta, ...data.meta };
    }
    if (data.roomLegends && typeof data.roomLegends === 'object') {
      activeRoomLegends = { ...DEFAULT_ROOM_LEGENDS, ...data.roomLegends };
    }
    if (Array.isArray(data.lessons) && data.lessons.length > 0) {
      const hasFullCurated = data.lessons.some(l => l.arts) && data.lessons.filter(l => l.studentType === 'international').length >= 30;
      const isNewFiscalYear = data.meta?.fiscalYear && Number(data.meta.fiscalYear) !== 2026;
      if (hasFullCurated || isNewFiscalYear) {
        activeLessons = data.lessons;
      } else if (data.lessons.some(l => Number(l.grade) >= 6)) {
        activeLessons = [...LESSONS.filter(l => Number(l.grade) < 6), ...data.lessons.filter(l => Number(l.grade) >= 6)];
      }
    }
  });
  fetchDistJson('./dist-data/calendar.json', data => {
    calendarData = {
      ...FALLBACK_CALENDAR,
      ...data,
      meta: { ...FALLBACK_CALENDAR.meta, ...(data.meta && typeof data.meta === 'object' ? data.meta : {}) },
      terms: { ...FALLBACK_CALENDAR.terms, ...(data.terms && typeof data.terms === 'object' ? data.terms : {}) },
      daySubstitutions: Array.isArray(data.daySubstitutions) ? data.daySubstitutions : FALLBACK_CALENDAR.daySubstitutions,
      events: Array.isArray(data.events) ? data.events : FALLBACK_CALENDAR.events
    };
  });
  fetchDistJson('./dist-data/exam.json', data => {
    examData = {
      ...FALLBACK_EXAM,
      ...data,
      meta: { ...FALLBACK_EXAM.meta, ...(data.meta && typeof data.meta === 'object' ? data.meta : {}) },
      periods: Array.isArray(data.periods) ? data.periods : FALLBACK_EXAM.periods,
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      days: Array.isArray(data.days) ? data.days : []
    };
  });
  fetchDistJson('./dist-data/cafeteria.json', data => {
    cafeteriaData = {
      ...FALLBACK_CAFETERIA,
      ...data,
      meta: { ...FALLBACK_CAFETERIA.meta, ...(data.meta && typeof data.meta === 'object' ? data.meta : {}) },
      weeklyMenus: Array.isArray(data.weeklyMenus) ? data.weeklyMenus : []
    };
  });
  fetchDistJson('./dist-data/timetable-links.json', data => {
    timetableLinksData = data;
  });
}

function getSyllabusUrl(selection) {
  const s = selection || studentSelection;
  if (!s || typeof s !== 'object') {
    return 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja';
  }
  const grade = Number(s.grade);
  const dept = String(s.department || '').trim();
  const course = s.course;
  let deptId = null;

  if (grade === 6 || grade === 7) {
    if (dept === 'AC') deptId = 22;
    else if (dept === 'ME' || ['M', 'E', 'C', 'A'].includes(dept)) deptId = 21;
  } else if (grade === 4 || grade === 5) {
    if (dept === 'E') deptId = (course === 'EJ' ? 14 : 13);
    else if (dept === 'M') deptId = 11;
    else if (dept === 'C') deptId = 15;
    else if (dept === 'A') deptId = 16;
  } else if (grade >= 1 && grade <= 3) {
    if (dept === 'E') deptId = 12;
    else if (dept === 'M') deptId = 11;
    else if (dept === 'C') deptId = 15;
    else if (dept === 'A') deptId = 16;
  }

  if (deptId) {
    return `https://syllabus.kosen-k.go.jp/Pages/PublicSubjects?school_id=27&department_id=${deptId}&year=2026&lang=ja`;
  }
  return 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja';
}

function getAcademicWeek(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return { term: '後期', week: 1, label: '後期 第1週' };
  }
  const month = d.getMonth() + 1;
  const isZenki = month >= 4 && month <= 9;
  const termName = isZenki ? '前期' : '後期';
  const startStr = isZenki
    ? (calendarData.terms?.zenki?.startDate || '2026-04-06')
    : (calendarData.terms?.kouki?.startDate || '2026-10-01');
  const startDate = new Date(`${startStr}T00:00:00+09:00`);
  const startDay = startDate.getDay();
  const mondayOffset = (startDay + 6) % 7;
  const weekOneMonday = new Date(startDate.getTime() - mondayOffset * 86400000);
  const diffTime = d.getTime() - weekOneMonday.getTime();
  const diffDays = Number.isFinite(diffTime) ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
  let weekNum = 1;
  if (diffDays >= 0) {
    weekNum = Math.min(15, Math.floor(diffDays / 7) + 1);
  }
  return {
    term: termName,
    week: weekNum,
    label: `${termName} 第${weekNum}週`
  };
}

function renderTodaySchedule(currentDate) {
  const jsDay = currentDate.getDay();
  const todayDateStr = dateKey(currentDate);
  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];

  const sub = calendarData?.daySubstitutions?.find(item => item.date === todayDateStr);
  let effectiveDay = jsDay;
  let isSubstituted = false;
  let subReason = '';

  if (sub) {
    isSubstituted = true;
    if (typeof sub.effectiveDay === 'number') {
      effectiveDay = sub.effectiveDay;
    } else if (sub.substituteDay) {
      const idx = DAYS.indexOf(String(sub.substituteDay).replace(/曜日$/, ''));
      if (idx !== -1) effectiveDay = idx + 1;
    }
    subReason = sub.reason || sub.note || `${DAYS[effectiveDay - 1]}曜日授業振替`;
  }

  const holidayEv = events.find(e =>
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) &&
    e.type !== 'exam' &&
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  );

  const navControls = `
    <div class="dashboard-date-nav" role="group" aria-label="日付切り替え">
      <button type="button" class="button subtle" data-dash-offset="-1" aria-label="前日の時間割">← 前日</button>
      <button type="button" class="button subtle ${dashboardOffsetDays === 0 ? 'active' : ''}" data-dash-offset="0">今日</button>
      <button type="button" class="button subtle" data-dash-offset="1" aria-label="翌日の時間割">翌日 →</button>
    </div>
  `;

  const subBanner = isSubstituted ? `
    <div class="alert alert-warning day-sub-alert">
      <span class="badge blue">授業振替</span>
      <span>本日は<strong>${DAYS[effectiveDay - 1]}曜日</strong>の授業を実施します（${escapeHTML(subReason)}）。</span>
    </div>
  ` : '';

  if (!isSubstituted && (effectiveDay === 0 || effectiveDay === 6 || holidayEv)) {
    const restLabel = holidayEv?.title || holidayEv?.name || '休業日';
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">
            ${navControls}
            <span class="badge yellow">${escapeHTML(restLabel)}</span>
            <span class="badge gray">${escapeHTML(studentShortLabel())}</span>
          </div>
        </div>
        <div class="dashboard-rest-card">
          <p><strong>${escapeHTML(todayDateStr)}</strong> は<strong>${escapeHTML(restLabel)}</strong>です。授業はありません。</p>
          <a class="button" href="#timetable">${icon('calendar')}週間時間割を見る</a>
        </div>
      </section>
    `;
  }

  const dayIdx = effectiveDay - 1;
  const { grid } = selectedSchedule();
  const dayLessons = grid[dayIdx] || [];
  const hasClasses = dayLessons.some(slot => slot.length > 0);

  if (!hasClasses) {
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">
            ${navControls}
            <span class="badge gray">${escapeHTML(studentShortLabel())}</span>
          </div>
        </div>
        <div class="dashboard-empty-card">
          <p>${escapeHTML(todayDateStr)} の授業予定はありません（0コマ・空きコマ）。</p>
          <a class="button secondary" href="#timetable">${icon('calendar')}時間割を確認</a>
        </div>
      </section>
    `;
  }

  const renderedLessonIds = new Set();
  const periodRows = periods.map((time, p) => {
    const cell = dayLessons[p] || [];
    if (cell.length === 0) {
      return `
        <div class="dashboard-period empty">
          <div class="period-meta"><span class="period-num">${p + 1}限</span><span class="period-time">${time[0]}〜${time[1]}</span></div>
          <div class="lesson-info"><span class="lesson-empty">空きコマ</span></div>
        </div>
      `;
    }
    const freshLessons = cell.filter(l => {
      const key = l.id || `${l.subjectName}-${l.period}`;
      if (renderedLessonIds.has(key)) return false;
      renderedLessonIds.add(key);
      return true;
    });
    if (freshLessons.length === 0) return '';
    return freshLessons.map(l => {
      const span = l.duration || 1;
      const endPeriodIdx = Math.min(periods.length - 1, p + span - 1);
      const endTime = periods[endPeriodIdx]?.[1] || time[1];
      return `
        <div class="dashboard-period active">
          <div class="period-meta">
            <span class="period-num">${span > 1 ? `${p + 1}〜${p + span}限` : `${p + 1}限`}</span>
            <span class="period-time">${time[0]}〜${endTime}</span>
            ${span > 1 ? `<span class="badge gray">${span}コマ連続</span>` : ''}
          </div>
          <div class="lesson-info">
            <strong class="subject-title">${escapeHTML(l.subjectName)}</strong>
            <div class="lesson-sub">
              ${l.location ? `<span class="lesson-location" title="${escapeHTML(expandRoomLegend(l.location))}">${icon('door')}${escapeHTML(l.location)}</span>` : ''}
              ${l.teacher ? `<span class="lesson-teacher">${escapeHTML(l.teacher)}</span>` : ''}
            </div>
            ${l.notes ? `<small class="lesson-notes">${escapeHTML(l.notes)}</small>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }).join('');

  return subBanner + `
    <section class="panel today-schedule" id="today-schedule">
      <div class="panel-head">
        <h2>${icon('calendar')}今日の時間割</h2>
        <div class="panel-head-meta">
          ${navControls}
          <span class="badge">${DAYS[dayIdx]}曜日</span>
          <span class="badge gray">${escapeHTML(studentShortLabel())}</span>
        </div>
      </div>
      <div class="today-periods-list">
        ${periodRows}
      </div>
      <div class="panel-footer">
        <a class="text-link" href="#timetable">週間時間割へ${icon('arrow')}</a>
      </div>
    </section>
  `;
}

function renderExamAlert() {
  const meta = examData?.meta || {};
  const isPublished = meta.status === 'published';
  const noticeText = isPublished
    ? '定期試験時間割が公開されています。試験科目・教室・監督配置を確認してください。'
    : (meta.noticeText || '定期試験時間割は、試験開始10日前の正午にこちらで発表します。');
  const selfStudyRule = meta.selfStudyRule || '試験は2限から開始しますが、9時に登校し自習することを原則とします。JRの遅延などが生じた場合、9時に登校していることを前提として対応します。';
  return `
    <section class="panel exam-alert" id="exam-alert">
      <div class="panel-head">
        <h2>${icon('document')}定期試験案内</h2>
        <span class="badge ${isPublished ? 'green' : 'yellow'}">${isPublished ? '公開中' : '試験情報'}</span>
      </div>
      <div class="exam-alert-body">
        <p class="exam-notice"><strong>${escapeHTML(noticeText)}</strong></p>
        <p class="exam-rules"><small>${escapeHTML(selfStudyRule)}</small></p>
      </div>
      <div class="panel-footer">
        <a class="text-link" href="#exam">定期試験の詳細へ${icon('arrow')}</a>
      </div>
    </section>
  `;
}

function renderCafeteriaSummary(currentDate) {
  const todayDateStr = dateKey(currentDate);
  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const holidayEv = events.find(e =>
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) &&
    e.type !== 'exam' &&
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  );
  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
  let todayMenu = null;

  if (cafeteriaData?.weeklyMenus) {
    for (const week of cafeteriaData.weeklyMenus) {
      if (week.days) {
        const found = week.days.find(d => d.date === todayDateStr);
        if (found) {
          todayMenu = found;
          break;
        }
      }
    }
  }

  let contentHtml = '';
  if (todayMenu && todayMenu.isOpen) {
    const lunchAName = todayMenu.lunchA?.name || '日替わりランチA';
    const lunchAPrice = todayMenu.lunchA?.price ? `${todayMenu.lunchA.price}円` : '';
    const lunchBName = todayMenu.lunchB?.name || '';
    const lunchBPrice = todayMenu.lunchB?.price ? `${todayMenu.lunchB.price}円` : '';
    const allergensStr = Array.isArray(todayMenu.allergens)
      ? todayMenu.allergens.join(', ')
      : (todayMenu.allergens || todayMenu.lunchA?.allergens || '');

    contentHtml = `
      <div class="cafeteria-today-dishes">
        <div class="dish-item primary-dish">
          <span class="dish-badge">ランチA定食</span>
          <strong class="dish-name">${escapeHTML(lunchAName)}</strong>
          ${lunchAPrice ? `<span class="dish-price">${escapeHTML(lunchAPrice)}</span>` : ''}
        </div>
        ${lunchBName ? `
          <div class="dish-item">
            <span class="dish-badge">ランチB定食</span>
            <strong class="dish-name">${escapeHTML(lunchBName)}</strong>
            ${lunchBPrice ? `<span class="dish-price">${escapeHTML(lunchBPrice)}</span>` : ''}
          </div>
        ` : ''}
        ${todayMenu.noodle ? `
          <div class="dish-item noodle-dish">
            <span class="dish-badge">麺類</span>
            <span class="dish-name">${escapeHTML(todayMenu.noodle.name)}</span>
            ${todayMenu.noodle.price ? `<span class="dish-price">${escapeHTML(todayMenu.noodle.price)}円</span>` : ''}
          </div>
        ` : ''}
        ${allergensStr ? `<p class="allergens-note"><small>アレルギー特定原材料: ${escapeHTML(allergensStr)}</small></p>` : ''}
      </div>
    `;
  } else if (isWeekend || holidayEv || (todayMenu && todayMenu.isOpen === false)) {
    const reason = todayMenu?.closedReason || holidayEv?.title || holidayEv?.name || '土日・休業日';
    contentHtml = `
      <div class="cafeteria-fallback-info">
        <p>本日は学生食堂の休業日です（${escapeHTML(reason)}）。</p>
        <p class="cafeteria-times"><small>通常営業時間: 平日 11:30〜13:30</small></p>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="cafeteria-fallback-info">
        <p>本日の日替わりランチ・定食メニューは、学生食堂にて提供中です。</p>
        <p class="cafeteria-times"><small>営業時間: 11:30〜13:30（平日）</small></p>
      </div>
    `;
  }

  return `
    <section class="panel cafeteria-summary" id="cafeteria-summary">
      <div class="panel-head">
        <h2>${icon('utensils')}本日の学食ランチ・定食メニュー</h2>
        <span class="badge rose">食堂</span>
      </div>
      ${contentHtml}
      <div class="panel-footer">
        <a class="text-link" href="#cafeteria">週間食堂メニューへ${icon('arrow')}</a>
      </div>
    </section>
  `;
}

function loadMyLinks() {
  try {
    const raw = localStorage.getItem('campus-links-v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMyLinks(links) {
  try {
    localStorage.setItem('campus-links-v1', JSON.stringify(links || []));
    return true;
  } catch {
    return false;
  }
}

function addMyLink(link) {
  if (!link || typeof link !== 'object') return { success: false, error: '無効なリンクデータです (Invalid link)' };
  const name = String(link.name || '').trim();
  const url = String(link.url || '').trim();
  if (!name || !url) return { success: false, error: 'リンク名とURLを入力してください (Name and URL are required)' };
  if (!/^https?:\/\//i.test(url)) return { success: false, error: 'URLは http:// または https:// で入力してください (Disallowed scheme)' };
  const links = loadMyLinks();
  const newItem = { id: link.id || `custom-${Date.now()}`, name, url, custom: true };
  links.push(newItem);
  try {
    const saved = saveMyLinks(links);
    if (saved === false || (saved && saved.success === false)) {
      return { success: false, error: (saved && saved.error) || 'リンクを保存できませんでした (Failed to save links)' };
    }
  } catch (err) {
    return { success: false, error: err?.message || 'ストレージ容量の上限に達しました (Storage quota exceeded)' };
  }
  return { success: true, item: newItem };
}
const addCustomLink = addMyLink;

function reorderMyLink(id, direction) {
  const links = loadMyLinks();
  const idx = links.findIndex(l => l.id === id);
  if (idx === -1) return links;
  if (direction === 'up' && idx > 0) {
    const temp = links[idx];
    links[idx] = links[idx - 1];
    links[idx - 1] = temp;
    saveMyLinks(links);
  } else if (direction === 'down' && idx < links.length - 1) {
    const temp = links[idx];
    links[idx] = links[idx + 1];
    links[idx + 1] = temp;
    saveMyLinks(links);
  }
  return links;
}

function deleteMyLink(id) {
  const links = loadMyLinks().filter(l => l.id !== id);
  saveMyLinks(links);
  return links;
}
const removeMyLink = deleteMyLink;

function renderQuickLinks() {
  const syllabusUrl = getSyllabusUrl(studentSelection);
  const customLinks = loadMyLinks();

  const customItemsHtml = customLinks.map(l => `
    <a class="quick-link-btn external-link" href="${escapeHTML(l.url)}" target="_blank" rel="noopener">
      ${icon('external')}<span>${escapeHTML(l.name)}</span>
    </a>
  `).join('');

  return `
    <section class="panel quick-links" id="quick-links">
      <div class="panel-head">
        <h2>${icon('link')}クイックリンク・シラバス</h2>
        <span class="badge gray">リンク</span>
      </div>
      <div class="quick-links-grid">
        <a class="button syllabus-launch-btn" href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener">
          ${icon('book')}シラバス（${escapeHTML(studentShortLabel())}）を開く
        </a>
        <a class="button secondary" href="#timetable">
          ${icon('calendar')}時間割へ
        </a>
        <a class="quick-link-btn" href="https://teams.microsoft.com" target="_blank" rel="noopener">
          ${icon('external')}<span>Teams</span>
        </a>
        <a class="quick-link-btn" href="https://classroom.google.com" target="_blank" rel="noopener">
          ${icon('external')}<span>Classroom</span>
        </a>
        <a class="quick-link-btn" href="https://webclass.kosen-k.go.jp" target="_blank" rel="noopener">
          ${icon('external')}<span>WebClass</span>
        </a>
        ${customItemsHtml}
      </div>
      <div class="panel-footer">
        <a class="text-link" href="#links">すべてのリンク・マイリンク管理へ${icon('arrow')}</a>
      </div>
    </section>
  `;
}

function renderTodayOverview(currentDate = new Date()) {
  return `
    <div class="dashboard-grid">
      <div class="dashboard-col-main">
        ${renderTodaySchedule(currentDate)}
      </div>
      <div class="dashboard-col-side">
        ${renderExamAlert()}
        ${renderCafeteriaSummary(currentDate)}
        ${renderQuickLinks()}
      </div>
    </div>
  `;
}

function home() {
  const now = new Date();
  const targetDate = new Date(now.getTime() + dashboardOffsetDays * 86400000);
  const displayDateKey = dateKey(targetDate);
  const weekInfo = getAcademicWeek(targetDate);
  const actions = `
    <div class="heading-actions">
      ${themeToggleBtn()}
      <span class="term-badge badge blue">${escapeHTML(weekInfo.label)}</span>
      <span class="student-pill badge gray">${escapeHTML(studentShortLabel())}</span>
      <div class="date-block">
        <strong>${longDate(displayDateKey)}</strong>
        <small>${dashboardOffsetDays === 0 ? 'キャンパスポータル' : `基準日から${dashboardOffsetDays > 0 ? `+${dashboardOffsetDays}` : dashboardOffsetDays}日`}</small>
      </div>
    </div>
  `;

  return `
    ${heading('ホーム', '今日の概要ダッシュボード', actions)}
    ${renderTodayOverview(targetDate)}
  `;
}

function extractExamEntries(data, selection) {
  if (!data || typeof data !== 'object') return [];
  const raw = (Array.isArray(data.schedule) && data.schedule.length ? data.schedule : null)
    ?? (Array.isArray(data.days) && data.days.length ? data.days : null)
    ?? data.schedule ?? data.days ?? data.schedules ?? data.entries ?? data.items ?? [];
  const selDept = selection?.department || selection?.dept || '';
  const selGrade = selection?.grade != null ? String(selection.grade) : '';
  const selCourse = selection?.course ? String(selection.course) : '';
  const targetClassDash = `${selGrade}-${selDept}`;
  const targetClassFlat = `${selGrade}${selDept}`;

  let list = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const nested = item.entries || item.slots || item.items;
      if (Array.isArray(nested)) {
        for (const sub of nested) {
          if (sub && typeof sub === 'object') {
            list.push({ date: item.date, day: item.day, ...sub });
          }
        }
      } else {
        list.push(item);
      }
    }
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw[targetClassDash])) list = raw[targetClassDash];
    else if (Array.isArray(raw[targetClassFlat])) list = raw[targetClassFlat];
    else list = Object.values(raw).flat().filter(Boolean);
  }

  const hasClassMeta = list.some(e => e && (e.class || e.className || e.classCode || e.dept || e.department || e.grade != null));
  if (!hasClassMeta) return list;

  return list.filter(entry => {
    const c = String(entry.class || entry.className || entry.classCode || '');
    const d = String(entry.dept || entry.department || '');
    const g = entry.grade != null ? String(entry.grade) : '';
    const course = entry.course ? String(entry.course) : '';
    if (!c && !d && !g) return true;
    if (course && selCourse && course !== selCourse) return false;
    if (c && (c === targetClassDash || c === targetClassFlat)) return true;
    if (d && g && d === selDept && g === selGrade) return true;
    if (d && !g && d === selDept) return true;
    if (!d && g && g === selGrade) return true;
    return false;
  });
}

function exam() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}</div>`;
  const meta = examData?.meta || FALLBACK_EXAM.meta || {};
  const isPublished = meta.status === 'published';
  const notice = meta.noticeText || '定期試験時間割は、試験開始10日前の正午にこちらで発表します。（10日前の正午発表）';
  const selfStudyRule = meta.selfStudyRule || '試験は2限から開始しますが、9時に登校し自習することを原則とします。';
  const sourcePdfUrl = normalizeAkashiUrl(meta.sourcePdfUrl, '');
  const notesPdfUrl = meta.notesPdfUrl === null ? '' : (normalizeAkashiUrl(meta.notesPdfUrl, '') || 'https://www.akashi.ac.jp/life/syotyui.pdf');
  const prevPdfUrl = meta.previousExamPdfUrl === null ? '' : normalizeAkashiUrl(meta.previousExamPdfUrl, '');
  const returnPdfUrl = meta.returnPdfUrl ? normalizeAkashiUrl(meta.returnPdfUrl, '') : '';
  const deptCode = studentSelection.department || studentSelection.dept || 'M';
  const classCode = (studentSelection.grade >= 4 && deptCode === 'E' && studentSelection.course)
    ? `${studentSelection.grade}-${studentSelection.course}`
    : `${studentSelection.grade}-${deptCode}`;
  const entries = extractExamEntries(examData, studentSelection);
  const syllabusUrl = getSyllabusUrl(studentSelection);
  const examPeriods = (Array.isArray(examData?.periods) && examData.periods.length)
    ? examData.periods
    : [
        { id: '2-F', label: '2限 前半', start: '10:40', end: '11:25' },
        { id: '2-S', label: '2限 後半', start: '11:25', end: '12:10' },
        { id: '3-F', label: '3限 前半', start: '13:00', end: '13:45' },
        { id: '3-S', label: '3限 後半', start: '13:45', end: '14:30' },
        { id: '4-F', label: '4限 前半', start: '14:40', end: '15:25' },
        { id: '4-S', label: '4限 後半', start: '15:25', end: '16:10' }
      ];
  const periodChipsHtml = examPeriods
    .map(p => `<span class="badge gray exam-period-chip">${escapeHTML(p.label || p.name || p.id)} (${escapeHTML(p.start || '')}〜${escapeHTML(p.end || '')})</span>`)
    .join('');

  const scheduleCards = entries.length
    ? entries.map(item => {
        const subject = item.subject || item.course || item.title || item.name || '試験科目';
        const dateText = [item.date, item.day ? `(${item.day})` : '', item.period ? `${item.period}` : '', item.time].filter(Boolean).join(' ');
        const room = item.room || item.classroom || '未定';
        const supervisor = item.supervisor || item.proctor || item.teacher || '';
        const itemClass = item.class || item.className || item.classCode || classCode;
        return `<article class="exam-card" data-class="${escapeHTML(itemClass)}">
          <div class="exam-card-head">
            <span class="badge blue">${escapeHTML(itemClass)}</span>
            <strong>${escapeHTML(dateText || '日程未定')}</strong>
          </div>
          <h3>${escapeHTML(subject)}</h3>
          <p class="exam-card-meta"><span>教室: ${escapeHTML(room)}</span>${supervisor ? ` / <span class="exam-supervisor">監督: ${escapeHTML(supervisor)}</span>` : ''}</p>
        </article>`;
      }).join('')
    : `<article class="exam-card exam-card-empty" data-class="${escapeHTML(classCode)}">
        <div class="exam-card-head">
          <span class="badge yellow">${escapeHTML(classCode)}</span>
          <span>${isPublished ? '試験なし' : '10日前の正午発表'}</span>
        </div>
        <h3>${escapeHTML(studentLabel())} の${isPublished ? '該当試験はありません（試験なし）' : '試験時間割は未公開です'}</h3>
        <p class="exam-card-meta">公開時に科目・時間・試験教室・監督（<span class="exam-supervisor">supervisor</span>配置）が表示されます。</p>
      </article>`;

  return `${heading('定期試験', '定期試験時間割・注意事項', actions)}
    <section class="panel exam-panel">
      <div class="panel-head">
        <h2>${icon('document')}定期試験案内</h2>
        <span class="badge ${isPublished ? 'green' : 'yellow'}">${isPublished ? '公開中' : '未公開'}</span>
      </div>
      <p class="exam-notice"><strong>${escapeHTML(notice)}</strong></p>
      <p class="exam-rules"><small>${escapeHTML(selfStudyRule)}</small></p>
      <div class="exam-period-chips">${periodChipsHtml}</div>
      <div class="exam-links-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${isPublished && sourcePdfUrl ? `<a class="button" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">公式試験時間割PDF</a>` : `<button type="button" class="button" disabled aria-disabled="true">公式試験時間割PDF（未公開）</button>`}
        ${notesPdfUrl ? `<a class="button secondary" href="${escapeHTML(notesPdfUrl)}" target="_blank" rel="noopener noreferrer">受験上の諸注意PDF</a>` : ''}
        ${!isPublished && prevPdfUrl ? `<a class="button secondary" href="${escapeHTML(prevPdfUrl)}" target="_blank" rel="noopener noreferrer">前回試験時間割PDF（参考）</a>` : ''}
        ${returnPdfUrl ? `<a class="button secondary" href="${escapeHTML(returnPdfUrl)}" target="_blank" rel="noopener noreferrer">答案返却時間割PDF</a>` : ''}
        <a class="button secondary" href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener noreferrer">${icon('book')}${escapeHTML(studentShortLabel())} シラバス</a>
        <a class="text-link" href="https://www.akashi.ac.jp/life/examtimetable.html" target="_blank" rel="noopener noreferrer">公式試験日程ページへ${icon('arrow')}</a>
      </div>
    </section>
    <section class="panel exam-schedule" id="exam-schedule" data-status="${isPublished ? 'published' : 'unpublished'}">
      <div class="panel-head">
        <h2>${icon('calendar')}試験時間割（${escapeHTML(classCode)}）</h2>
        <span class="badge">${entries.length}件</span>
      </div>
      <div class="exam-search-bar">
        <input type="search" id="exam-search-input" placeholder="科目名・教室・監督名で絞り込み..." aria-label="定期試験科目検索">
      </div>
      <div class="exam-timetable" id="exam-timetable">
        ${scheduleCards}
      </div>
    </section>`;
}
function examView() { return exam(); }

function calendar() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}</div>`;
  const nowDate = new Date();
  const todayStr = dateKey(nowDate);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const weekInfo = getAcademicWeek(nowDate);
  const data = calendarData || FALLBACK_CALENDAR;
  const events = Array.isArray(data.events) && data.events.length ? data.events : FALLBACK_CALENDAR.events;
  const subs = Array.isArray(data.daySubstitutions) ? data.daySubstitutions : [];
  const subDates = new Set(subs.map(s => s.date));

  const badgeMap = {
    holiday: { cls: 'yellow', label: '祝日・休業' },
    break: { cls: 'yellow', label: '長期休業' },
    vacation: { cls: 'yellow', label: '長期休業' },
    exam: { cls: 'red', label: '定期試験' },
    festival: { cls: 'blue', label: '高専祭・行事' },
    school_event: { cls: 'blue', label: '学校行事' },
    academic: { cls: 'blue', label: '授業日程' },
    special: { cls: 'blue', label: '振替・特別' },
    ceremony: { cls: 'blue', label: '式典・行事' },
    event: { cls: 'blue', label: '行事' }
  };

  const sortedEvents = [...events]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .filter(ev => {
      const start = String(ev.date || ev.startDate || '');
      if (calendarFilterPeriod === 'current' && !start.startsWith(currentMonthPrefix)) return false;
      if (calendarFilterPeriod === 'zenki') {
        const m = Number(start.slice(5, 7));
        if (m < 4 || m > 9) return false;
      }
      if (calendarFilterPeriod === 'kouki') {
        const m = Number(start.slice(5, 7));
        if (m >= 4 && m <= 9) return false;
      }
      if (calendarFilterCategory === 'holiday') {
        return ev.type === 'holiday' || ev.type === 'break' || ev.type === 'vacation' || ev.hasClasses === false;
      }
      if (calendarFilterCategory === 'exam') return ev.type === 'exam';
      if (calendarFilterCategory === 'event') {
        return !['holiday', 'break', 'vacation', 'exam'].includes(ev.type);
      }
      return true;
    });

  const eventRows = sortedEvents.map(ev => {
    const start = ev.date || ev.startDate || '';
    const endRaw = ev.endDate || start;
    const end = ev.endDate && ev.endDate !== start ? ` 〜 ${ev.endDate}` : '';
    const title = ev.name || ev.title || '行事';
    const b = badgeMap[ev.type] || { cls: 'blue', label: ev.hasClasses === false ? '休業' : '予定' };
    const isToday = start && (todayStr >= start && todayStr <= endRaw);
    const isPast = !isToday && endRaw && endRaw < todayStr;
    return `<li class="calendar-event-item${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}" data-date="${escapeHTML(start)}" data-type="${escapeHTML(ev.type || 'event')}">
      <span class="calendar-event-date">${escapeHTML(start + end)}</span>
      ${isToday ? '<span class="badge red">本日</span>' : ''}
      <span class="badge ${b.cls}">${escapeHTML(b.label)}</span>
      <strong class="calendar-event-title">${escapeHTML(title)}</strong>
      ${ev.note ? `<small class="calendar-event-note">${escapeHTML(ev.note)}</small>` : ''}
    </li>`;
  }).join('');

  const subRows = subs.length
    ? `<div class="calendar-substitutions">
        <h3>授業振替実施日</h3>
        <ul class="calendar-timeline">
          ${subs.map(s => `<li class="calendar-event-item" data-date="${escapeHTML(s.date)}"><span class="calendar-event-date">${escapeHTML(s.date)}</span><span class="badge blue">授業振替</span><strong>${escapeHTML(`${String(s.substituteDay || '月').replace(/曜日$/, '')}曜日授業を実施`)}</strong>${s.note ? `<small class="calendar-event-note">${escapeHTML(s.note)}</small>` : ''}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const periodChip = (key, label) => `<button type="button" class="chip${calendarFilterPeriod === key ? ' active' : ''}" data-cal-period="${key}">${label}</button>`;
  const catChip = (key, label) => `<button type="button" class="chip${calendarFilterCategory === key ? ' active' : ''}" data-cal-cat="${key}">${label}</button>`;
  const zenkiPdfUrl = normalizeAkashiUrl(data.meta?.zenkiPdfUrl, '');
  const koukiPdfUrl = normalizeAkashiUrl(data.meta?.koukiPdfUrl, '');
  const calSourceUrl = normalizeAkashiUrl(data.meta?.sourceUrl, 'https://www.akashi.ac.jp/life/calendar.html');

  return `${heading('年間予定', '行事予定・授業日程・週番号', actions)}
    <section class="panel calendar-panel">
      <div class="panel-head">
        <h2>${icon('calendar')}行事予定表</h2>
        <span class="badge blue">${escapeHTML(weekInfo.label)}</span>
      </div>
      <p>明石高専の年間行事予定・授業日程（第1週〜第15週・高専祭・祝日・長期休業・授業振替）を確認できます。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px;">
        <button type="button" class="button" id="export-calendar-ics">📅 行事予定をiCal保存 (.ics)</button>
        ${zenkiPdfUrl ? `<a class="button secondary" href="${escapeHTML(zenkiPdfUrl)}" target="_blank" rel="noopener noreferrer">前期行事予定PDF</a>` : ''}
        ${koukiPdfUrl ? `<a class="button secondary" href="${escapeHTML(koukiPdfUrl)}" target="_blank" rel="noopener noreferrer">後期行事予定PDF</a>` : ''}
        <a class="text-link" href="${escapeHTML(calSourceUrl)}" target="_blank" rel="noopener noreferrer">公式行事予定ページへ${icon('arrow')}</a>
        <span class="badge">${sortedEvents.length}件の行事</span>
        ${subDates.size ? `<span class="badge blue">授業振替 ${subDates.size}日</span>` : ''}
      </div>
      <div class="calendar-filters" role="group" aria-label="年間予定絞り込み">
        <div class="filter-group">${periodChip('all', '通年')}${periodChip('current', '今月')}${periodChip('zenki', '前期')}${periodChip('kouki', '後期')}</div>
        <div class="filter-group">${catChip('all', 'すべて')}${catChip('holiday', '祝日・休業')}${catChip('exam', '定期試験')}${catChip('event', '学校行事')}</div>
      </div>
      ${subRows}
      <div class="calendar-events" id="calendar-events">
        <ul class="calendar-timeline">
          ${eventRows || '<li class="calendar-event-item"><span class="calendar-event-title">該当する行事はありません。</span></li>'}
        </ul>
      </div>
    </section>`;
}
function calendarView() { return calendar(); }

function renderCafeteriaDayCard(day) {
  const dateTitle = [day.date, day.dayOfWeek ? `(${day.dayOfWeek})` : ''].filter(Boolean).join(' ');
  if (day.isOpen === false) {
    return `<li class="cafeteria-menu-item is-closed">
      <div class="cafeteria-day-head"><strong>${escapeHTML(dateTitle || '休業日')}</strong><span class="badge gray">休業</span></div>
      <p>${escapeHTML(day.closedReason || '学生食堂休業日')}</p>
    </li>`;
  }
  const dishRows = [];
  if (day.lunchA?.name) dishRows.push(`<div><span class="dish-badge">ランチA</span> <strong>${escapeHTML(day.lunchA.name)}</strong>${day.lunchA.price ? ` <span class="price">${escapeHTML(String(day.lunchA.price))}円</span>` : ''}</div>`);
  if (day.lunchB?.name) dishRows.push(`<div><span class="dish-badge">ランチB</span> <strong>${escapeHTML(day.lunchB.name)}</strong>${day.lunchB.price ? ` <span class="price">${escapeHTML(String(day.lunchB.price))}円</span>` : ''}</div>`);
  if (day.noodle?.name) dishRows.push(`<div><span class="dish-badge">麺類</span> <span>${escapeHTML(day.noodle.name)}</span>${day.noodle.price ? ` <span class="price">${escapeHTML(String(day.noodle.price))}円</span>` : ''}</div>`);
  if (day.bowl?.name) dishRows.push(`<div><span class="dish-badge">丼</span> <span>${escapeHTML(day.bowl.name)}</span>${day.bowl.price ? ` <span class="price">${escapeHTML(String(day.bowl.price))}円</span>` : ''}</div>`);
  const allergens = Array.isArray(day.allergens) ? day.allergens.join(', ') : (day.allergens || day.lunchA?.allergens || '');
  return `<li class="cafeteria-menu-item">
    <div class="cafeteria-day-head"><strong>${escapeHTML(dateTitle || '本日')}</strong>${day.isOpen ? '<span class="badge green">営業</span>' : ''}</div>
    <div class="cafeteria-day-dishes">${dishRows.join('') || `<span>${escapeHTML(day.name || day.menu || '')}</span>`}</div>
    ${allergens ? `<p class="allergens">アレルゲン: ${escapeHTML(allergens)}</p>` : ''}
  </li>`;
}

function cafeteria() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}</div>`;
  const data = cafeteriaData || FALLBACK_CAFETERIA;
  const meta = data.meta || FALLBACK_CAFETERIA.meta || {};
  const hasSourceKey = Object.prototype.hasOwnProperty.call(meta, 'sourcePdfUrl');
  const rawSourceUrl = hasSourceKey ? meta.sourcePdfUrl : FALLBACK_CAFETERIA.meta?.sourcePdfUrl;
  const sourcePdfUrl = normalizeAkashiUrl(rawSourceUrl, '');
  const hasDormKey = Object.prototype.hasOwnProperty.call(meta, 'dormitoryArticleUrl');
  const dormArticleUrl = normalizeAkashiUrl(hasDormKey ? meta.dormitoryArticleUrl : FALLBACK_CAFETERIA.meta?.dormitoryArticleUrl, '');
  const dormPdfUrl = normalizeAkashiUrl(Object.prototype.hasOwnProperty.call(meta, 'dormitoryPdfUrl') ? meta.dormitoryPdfUrl : FALLBACK_CAFETERIA.meta?.dormitoryPdfUrl, '');
  const isTextExtracted = Boolean(meta.isTextExtracted);
  const weeklyMenus = Array.isArray(data.weeklyMenus) ? data.weeklyMenus : [];
  const legacyMenus = Array.isArray(data.menus) ? data.menus : (Array.isArray(data.items) ? data.items : []);
  const hasMenuData = weeklyMenus.some(w => Array.isArray(w?.days) && w.days.length > 0) || legacyMenus.length > 0;

  let weekTabsHtml = '';
  let menuContent = `<p class="info-note" data-extracted="false">今月の日替わりランチ詳細はPDFからのテキスト抽出が未対応のため（テキスト未抽出）、原本PDFまたは公式ニュースでご確認ください。</p>`;
  if (isTextExtracted && hasMenuData) {
    if (weeklyMenus.length > 0) {
      const validWeekIdx = selectedCafeteriaWeekIdx >= 0 && selectedCafeteriaWeekIdx < weeklyMenus.length ? selectedCafeteriaWeekIdx : -1;
      if (weeklyMenus.length > 1) {
        weekTabsHtml = `<div class="cafeteria-week-tabs" role="group" aria-label="週切り替え">
          <button type="button" class="cafeteria-week-tab${validWeekIdx === -1 ? ' active' : ''}" data-cafe-week="-1">全週</button>
          ${weeklyMenus.map((w, idx) => `<button type="button" class="cafeteria-week-tab${validWeekIdx === idx ? ' active' : ''}" data-cafe-week="${idx}">${escapeHTML(w.weekLabel || `第${idx + 1}週`)} ${w.weekRange ? `(${escapeHTML(w.weekRange)})` : ''}</button>`).join('')}
        </div>`;
      }
      const visibleWeeks = validWeekIdx === -1 ? weeklyMenus : [weeklyMenus[validWeekIdx]];
      menuContent = visibleWeeks.map((week, idx) => {
        const days = Array.isArray(week?.days) ? week.days : [];
        return `<div class="cafeteria-week-block" data-week-idx="${validWeekIdx === -1 ? idx : validWeekIdx}">
          ${week.weekRange ? `<h3 class="cafeteria-week-heading">${escapeHTML(week.weekRange)}</h3>` : ''}
          <ul class="cafeteria-menu-list">${days.map(renderCafeteriaDayCard).join('')}</ul>
        </div>`;
      }).join('');
    } else {
      menuContent = `<ul class="cafeteria-menu-list">${legacyMenus.map(m => `<li class="cafeteria-menu-item"><strong>${escapeHTML(m.date || m.day || '本日')}</strong>: ${escapeHTML(m.name || m.menu || m.lunch || '')}${m.price ? ` <span class="badge">${escapeHTML(String(m.price))}円</span>` : ''}</li>`).join('')}</ul>`;
    }
  }

  return `${heading('食堂メニュー', '今週・本日の学生食堂ランチメニュー', actions)}
    <section class="panel cafeteria-panel cafeteria-view" id="cafeteria-view" data-text-extracted="${isTextExtracted ? 'true' : 'false'}">
      <div class="panel-head">
        <h2>${icon('utensils')}学生食堂</h2>
        <span class="badge ${isTextExtracted ? 'green' : 'yellow'}">${isTextExtracted ? 'メニュー掲載中' : 'PDF案内'}</span>
      </div>
      <p>学生食堂の日替わり定食・ランチメニューおよび寮生食堂の月間献立案内です。</p>
      ${weekTabsHtml}
      ${menuContent}
      <div class="cafeteria-links" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${sourcePdfUrl ? `<a class="button" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">学生食堂 原本PDF</a>` : `<button type="button" class="button" disabled aria-disabled="true">学生食堂 原本PDF（未公開）</button>`}
        <a class="button secondary" href="https://www.akashi.ac.jp/news_list/news2026.html" target="_blank" rel="noopener noreferrer">公式ニュース一覧へ</a>
      </div>
      <div class="dormitory-section" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line);">
        <h3>寮生食堂メニュー（Dormitory）</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
          ${dormArticleUrl ? `<a class="button secondary" href="${escapeHTML(dormArticleUrl)}" target="_blank" rel="noopener noreferrer">寮生食堂メニュー記事</a>` : ''}
          ${dormPdfUrl ? `<a class="button secondary" href="${escapeHTML(dormPdfUrl)}" target="_blank" rel="noopener noreferrer">寮生食堂 原本PDF</a>` : ''}
        </div>
      </div>
    </section>`;
}
function cafeteriaView() { return cafeteria(); }

const OFFICIAL_SERVICES = [
  { name: 'Teams', url: 'https://teams.microsoft.com', category: 'learning' },
  { name: 'Classroom', url: 'https://classroom.google.com', category: 'learning' },
  { name: 'WebClass', url: 'https://webclass.kosen-k.go.jp/webclass/login.php?auth_mode=SAML', category: 'learning' },
  { name: 'Microsoft 365 (SharePoint)', url: 'https://portal.office.com', category: 'learning' },
  { name: '図書館WebOPAC', url: 'https://libopac-c.kosen-k.go.jp/opac/cattab.do', category: 'academic' },
  { name: 'シラバス検索', url: 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja', category: 'academic' },
  { name: 'JR西日本 列車運行情報', url: 'https://trafficinfo.westjr.co.jp/kinki.html', category: 'transport' },
  { name: '山陽電車 運行情報', url: 'https://www.sanyo-railway.co.jp/railway/traffic.html', category: 'transport' },
  { name: '神姫バス 時刻表・バスナビ', url: 'https://navi.shinkibus.co.jp/', category: 'transport' },
];

const PRESET_LINKS = [
  { name: 'Gmail', url: 'https://mail.google.com/' },
  { name: 'Google Drive', url: 'https://drive.google.com/' },
  { name: 'OneDrive', url: 'https://onedrive.live.com/' },
  { name: 'iCloud', url: 'https://www.icloud.com/' },
];

function linksView() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}</div>`;
  const syllabusUrl = getSyllabusUrl(studentSelection);
  const serviceGroups = [
    { key: 'learning', title: '学内学習ツール・LMS' },
    { key: 'academic', title: '学術情報・シラバス' },
    { key: 'transport', title: '交通・運行情報' },
  ];
  const officialSections = serviceGroups.map(grp => {
    const items = OFFICIAL_SERVICES.filter(s => s.category === grp.key);
    if (!items.length) return '';
    return `<div class="links-category-section">
      <h3 class="links-category-title">${escapeHTML(grp.title)}</h3>
      <div class="official-links-group" style="display:flex;flex-wrap:wrap;gap:8px;">
        ${items.map(s => `<a class="button secondary" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(s.name)}（新しいタブで開く）">${icon('external')}${escapeHTML(s.name)}</a>`).join('')}
      </div>
    </div>`;
  }).join('');

  const myLinks = loadMyLinks().filter(item => item && /^https?:\/\//i.test(String(item.url || '')));
  const existingUrls = new Set(myLinks.map(item => item.url));
  const myLinkItems = myLinks.length
    ? myLinks.map((item, idx) => `
        <div class="mylink-row" data-link-id="${escapeHTML(item.id)}">
          <a class="button secondary mylink-anchor" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}${escapeHTML(item.name)}</a>
          <div class="mylink-reorder-btns">
            <button type="button" class="button secondary mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="up" aria-label="${escapeHTML(item.name)}を上へ移動" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="button secondary mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="down" aria-label="${escapeHTML(item.name)}を下へ移動" ${idx === myLinks.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
          <button type="button" class="button secondary mylink-remove-btn" data-remove-id="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}を削除">削除</button>
        </div>
      `).join('')
    : '<p class="hint">登録されたマイリンクはまだありません。</p>';

  const presetButtons = PRESET_LINKS.map(p => {
    const added = existingUrls.has(p.url);
    return `<button type="button" class="button secondary preset-btn${added ? ' is-added' : ''}" data-preset-name="${escapeHTML(p.name)}" data-preset-url="${escapeHTML(p.url)}" ${added ? 'disabled aria-disabled="true"' : ''}>${escapeHTML(p.name)}${added ? '（追加済み）' : ''}</button>`;
  }).join('');

  const archiveItems = (timetableLinksData?.pages || [])
    .flatMap(p => Array.isArray(p?.items) ? p.items : [])
    .filter(item => item && item.url)
    .map(item => {
      const safeUrl = normalizeAkashiUrl(item.url, '');
      if (!/^https:\/\//i.test(safeUrl)) return '';
      return `<a class="button secondary" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}${escapeHTML(item.title || item.fileName || 'PDF')}</a>`;
    })
    .filter(Boolean)
    .join('');

  return `${heading('リンク・シラバス', 'シラバス・学内サービス・マイリンク', actions)}
    <section class="panel links-panel">
      <div class="panel-head">
        <h2>${icon('book')}シラバス・公式リンク集</h2>
      </div>
      <p><a class="button" href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(studentShortLabel())}のシラバスを開く">シラバスを開く</a></p>
      <div class="official-links-list" style="margin:16px 0;">
        ${officialSections}
      </div>
      ${archiveItems ? `<div class="links-archive-section" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);"><h3>公式時間割・試験PDFアーカイブ</h3><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${archiveItems}</div></div>` : ''}
      <div class="mylinks-section" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);">
        <h3>マイリンク</h3>
        <div id="mylinks-list" class="mylinks-list">
          ${myLinkItems}
        </div>
        <form id="mylink-form" class="mylink-form">
          <input type="text" id="mylink-name" name="name" placeholder="表示名（例: Gmail）" aria-label="リンク名" required>
          <input type="url" id="mylink-url" name="url" placeholder="https://..." aria-label="リンクURL" required>
          <button type="submit" id="mylink-add-btn" class="button">追加</button>
        </form>
        <p id="mylink-error" class="info-note" role="alert" hidden></p>
      </div>
      <div class="preset-suggestions">
        <h3>ワンタップ追加候補</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
          ${presetButtons}
        </div>
      </div>
    </section>`;
}

function renderTimetableBanners(date = new Date()) {
  const d = new Date(date);
  const dateStr = dateKey(d);
  const weekInfo = getAcademicWeek(d);
  const cal = calendarData || FALLBACK_CALENDAR;
  const events = Array.isArray(cal?.events) ? cal.events : [];
  let banners = `<div class="alert alert-info timetable-banner week-banner"><span class="badge blue">${escapeHTML(weekInfo.label)}</span> 今週は${escapeHTML(weekInfo.label)}です。</div>`;

  const sub = cal?.daySubstitutions?.find(item => item.date === dateStr);
  if (sub) {
    const subDay = String(sub.substituteDay || '月').replace(/曜日$/, '');
    const subName = `${subDay}曜日`;
    banners += `<div class="alert alert-warning timetable-banner day-substitution day-sub-alert"><span class="badge blue">授業振替</span> 本日は<strong>${escapeHTML(subName)}授業</strong>を実施します（授業振替）。</div>`;
  }

  const holidayEv = events.find(e =>
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) &&
    e.type !== 'exam' &&
    (e.date === dateStr || (e.endDate && dateStr >= e.date && dateStr <= e.endDate))
  );
  if (!sub && (holidayEv || d.getDay() === 0 || d.getDay() === 6)) {
    const label = holidayEv?.name || (d.getDay() === 0 || d.getDay() === 6 ? '週末・休業日' : '休業日（祝日）');
    banners += `<div class="alert alert-warning timetable-banner holiday-banner"><span class="badge yellow">祝日・休業日</span> 本日は${escapeHTML(label)}です。</div>`;
  }

  const isExam = events.some(e => e.type === 'exam' && dateStr >= e.date && (!e.endDate || dateStr <= e.endDate)) ||
    (dateStr >= '2026-11-20' && dateStr <= '2026-11-26');
  if (isExam) {
    banners += `<div class="alert alert-warning timetable-banner exam-period-banner"><span class="badge red">定期試験期間</span> 現在は定期試験期間です。<a class="text-link" href="#exam">試験時間割を確認 →</a></div>`;
  }

  return banners;
}

function timetable() {
  const s = studentSelection;
  const isAdvanced = s.grade >= 6;
  const { selected, grid, error } = selectedSchedule();
  const totalPeriods = selected.reduce((sum, l) => sum + (l.duration || 1), 0);
  const options = (values, current) => values.map(([value,label]) => `<option value="${escapeHTML(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
  const field = (label, key, values, disabled = false, hintText = '') => `<label class="field">${label}<select id="student-${key}" data-student="${key}" ${disabled ? 'disabled' : 'required'}>${options(values,s[key])}</select>${hintText ? `<small class="field-hint">${escapeHTML(hintText)}</small>` : ''}</label>`;
  const needsCourse = !isAdvanced && s.grade >= 4 && s.department === 'E';
  const gradeOptions = [
    [1,'1年'], [2,'2年'], [3,'3年'], [4,'4年'], [5,'5年'],
    [6,'専攻科1年 (専1)'], [7,'専攻科2年 (専2)']
  ];
  const deptOptions = isAdvanced
    ? ADVANCED_DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || d])
    : DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || `${d}科`]);

  const controls = field('学年','grade',gradeOptions) +
    field(isAdvanced ? '専攻' : '学科','department',deptOptions) +
    field('クラス（1・2年）','classGroup',[1,2,3,4].map(n=>[n,`${n}組`]),isAdvanced || s.grade>=3, (isAdvanced || s.grade>=3) ? '※3年生以上・専攻科は学科共通' : '') +
    field('留学生の区分','studentType',[['regular','留学生ではない'],['international','留学生']],isAdvanced) +
    field('E科のコース（4・5年）','course',[['','選択してください'],['EJ',COURSE_LABELS.EJ],['ED',COURSE_LABELS.ED]],isAdvanced || !needsCourse, (isAdvanced || !needsCourse) ? '※4・5年E科のみ選択可' : '') +
    (!isAdvanced && s.grade===1 ? field('芸術選択','arts',[['music','音楽'],['art','美術']]) : '');
  const table = `<div class="table-scroll" tabindex="0" role="region" aria-label="週間時間割。左右にスクロールできます"><table class="real-timetable"><caption class="sr-only">${escapeHTML(studentLabel())}の後期時間割</caption><thead><tr><th scope="col">時限</th>${DAYS.map(d=>`<th scope="col">${d}曜日</th>`).join('')}</tr></thead><tbody>${periods.map((time,p)=>`<tr><th scope="row">${p+1}限<small>${time[0]}<br>${time[1]}</small></th>${grid.map(day=>{
    const cell = day[p];
    if(cell.length===1 && cell[0].period-1<p && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id))) return '';
    const span = cell.length===1 && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id)) ? (cell[0].duration||1) : 1;
    return `<td rowspan="${span}" class="schedule-cell ${cell.length?'':'schedule-empty'}">${cell.length ? cell.map(l=>`<div class="lesson-card"><strong>${escapeHTML(l.subjectName)}</strong>${l.location?`<small class="lesson-location" title="${escapeHTML(expandRoomLegend(l.location))}">${icon('door')}${escapeHTML(l.location)}</small>`:''}<small>${escapeHTML(l.teacher)}</small>${span>1?`<span class="badge gray">${l.period}〜${l.period+span-1}限</span>`:''}${l.notes?`<small>${escapeHTML(l.notes)}</small>`:''}</div>`).join('') : '<span>空き</span>'}${cell.length>1?'<span class="badge red">授業の重複</span>':''}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  const fyText = formatFiscalYear(timetableMeta?.fiscalYear || 2026);
  const termText = timetableMeta?.term || '後期';
  const sourceUrl = normalizeAkashiUrl(timetableMeta?.sourceUrl || SOURCE?.url) || 'https://www.akashi.ac.jp/life/lesson.html';
  const sourcePdfUrl = getTimetablePdfUrl();
  const updatedText = timetableMeta?.updated || (timetableMeta?.updatedAt ? String(timetableMeta.updatedAt).slice(0, 10) : '') || SOURCE?.updated || '2026-09-24';
  const legendEntries = Object.entries(activeRoomLegends || {});
  const legendsHtml = (!error && legendEntries.length > 0)
    ? `<details class="room-legends-box" data-export-exclude><summary>教室略称・正式名称一覧（${legendEntries.length}件）</summary><div class="room-legends-grid">${legendEntries.map(([k, v]) => `<div><strong>${escapeHTML(k)}</strong>: ${escapeHTML(v)}</div>`).join('')}</div></details>`
    : '';

  return `${heading(`${fyText} ${termText}時間割`,'',`<div class="heading-actions">${themeToggleBtn()}<span class="demo-pill"><i></i>ベータ版</span></div>`)}
    ${renderTimetableBanners(new Date())}
    <details class="panel timetable-controls" id="filter-details" ${filterOpen ? 'open' : ''}>
      <summary class="panel-head filter-summary">
        <h2>${icon('calendar')}表示する時間割</h2>
        <div class="filter-summary-info">
          <span class="badge current-badge">${escapeHTML(studentShortLabel())}</span>
          <span class="filter-toggle-label">${filterOpen ? '閉じる ▲' : '変更する ▼'}</span>
        </div>
      </summary>
      <div class="filter-body">
        <div class="filters student-filters">${controls}</div>
        <p class="selection-status" role="status" hidden></p>
        <div class="filter-actions">
          <button type="button" class="button confirm-btn" id="confirm-filter-btn">${icon('check')}決定（条件を閉じる）</button>
        </div>
      </div>
    </details>
    <section class="panel timetable-panel" id="timetable-sheet"><div class="panel-head"><h2>${escapeHTML(studentLabel())}</h2><span class="badge" data-export-exclude>${totalPeriods}コマ</span></div><p class="hint" data-export-exclude>スマートフォンでは表を左右にスクロールできます。</p>${error?`<p class="info-note" role="status">${escapeHTML(error)}</p>`:table}${legendsHtml}<div class="timetable-source" data-export-exclude><span>出典：<a href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">明石高専「時間割・授業時間」 ↗</a> / <a href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">時間割原本PDF ↗</a>（${escapeHTML(fyText)} ${escapeHTML(termText)} / 更新: ${escapeHTML(updatedText)}）</span><span>個別の休講・変更は学校の案内で確認してください。</span></div><div class="export-controls" data-export-exclude><label class="field">保存形式<select id="export-format" ${error || exportInProgress ? 'disabled' : ''}><option value="pdf"${currentExportFormat==='pdf'?' selected':''}>PDF（A4横）</option><option value="png"${currentExportFormat==='png'?' selected':''}>PNG（画像）</option><option value="text"${currentExportFormat==='text'?' selected':''}>テキスト（.txt）</option><option value="csv"${currentExportFormat==='csv'?' selected':''}>CSV（Excel用 / .csv）</option><option value="json"${currentExportFormat==='json'?' selected':''}>JSON（データ / .json）</option><option value="ics"${currentExportFormat==='ics'?' selected':''}>iCal（カレンダー / .ics）</option></select></label><div class="export-btn-group"><button class="button export-copy-btn" id="export-copy" type="button" ${error || exportInProgress ? 'disabled' : ''} ${EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel ? '' : 'hidden'}>${EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel||'📋 コピー'}</button><button class="button" id="export-download" type="button" ${error || exportInProgress ? 'disabled' : ''}>${exportInProgress?'作成中…':(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.downloadLabel||'💾 保存')}</button><button class="button secondary" id="export-adjust-open" type="button" ${error || exportInProgress ? 'disabled' : ''}>${EXPORT_FORMAT_CONFIGS[currentExportFormat]?.adjustLabel||'調整'}</button></div></div><div class="raw-dataset-row" data-export-exclude><button type="button" class="raw-dataset-btn" id="export-raw-data-btn">明石高専 全学科・全学年の時間割原本データ（JSON）をダウンロード</button></div><p id="export-status" class="export-status" role="status" data-export-exclude hidden></p></section>
    <div class="size-overlay" id="export-size-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="サイズ調整">
      <div class="size-overlay-viewport" id="size-overlay-viewport">
        <div class="size-paper-wrap" id="size-paper-wrap">
          <div class="size-paper ${a4ModeEnabled ? 'a4-mode' : ''}" id="size-modal-paper"></div>
        </div>
      </div>
      <div class="size-overlay-controls">
        <div class="size-preset-row">
          <div class="size-preset-group" role="group" aria-label="みため">
            <span class="size-preset-label">みため:</span>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'web' ? 'active' : ''}" data-size-mode="web">標準</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'a4fit' ? 'active' : ''}" data-size-mode="a4fit">A4向け</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'memo' ? 'active' : ''}" data-size-mode="memo">メモ書き可</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'custom' ? 'active' : ''}" data-size-mode="custom">カスタム</button>
            <button type="button" class="size-mode-btn reset" id="size-mode-reset">リセット</button>
            <label class="size-a4-toggle"><input type="checkbox" id="size-toggle-a4" ${a4ModeEnabled ? 'checked' : ''}> A4枠を表示</label>
            <button type="button" class="size-mode-btn" id="size-modal-theme-toggle" title="出力用テーマ切り替え（サイト本体には影響しません）">${getExportTheme() === 'dark' ? '☀️ 白背景で出力' : '🌙 暗背景で出力'}</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="button" id="size-modal-save-btn">💾 このサイズで保存</button>
            <button type="button" class="button size-close-btn" id="export-size-close">閉じる</button>
          </div>
        </div>
        <div class="size-sliders">
          <label class="size-slider-item">
            <span class="size-slider-name">余白</span>
            <input type="range" id="size-slider-padding" min="0" max="48" step="2" value="${exportSizeConfig.padding}">
            <span class="size-slider-val" id="size-val-padding">${exportSizeConfig.padding}px</span>
          </label>
          <label class="size-slider-item">
            <span class="size-slider-name">マスの高さ</span>
            <input type="range" id="size-slider-cell" min="80" max="240" step="2" value="${exportSizeConfig.cellHeight}">
            <span class="size-slider-val" id="size-val-cell">${exportSizeConfig.cellHeight}px</span>
          </label>
          <label class="size-slider-item">
            <span class="size-slider-name">文字の大きさ</span>
            <input type="range" id="size-slider-font" min="80" max="130" step="1" value="${exportSizeConfig.fontScale}">
            <span class="size-slider-val" id="size-val-font">${exportSizeConfig.fontScale}%</span>
          </label>
        </div>
      </div>
    </div>
    <div class="data-preview-overlay" id="data-preview-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="データプレビュー">
      <div class="data-preview-card">
        <div class="data-preview-head">
          <h3 id="data-preview-title">データプレビュー</h3>
          <button type="button" class="button size-close-btn" id="data-preview-close" style="min-height:30px;padding:0 10px;">✕</button>
        </div>
        <div class="data-preview-body" id="data-preview-body"></div>
        <div class="data-preview-foot">
          <button type="button" class="button secondary" id="data-preview-cancel">閉じる</button>
          <button type="button" class="button export-copy-btn" id="data-preview-copy">📋 クリップボードにコピー</button>
          <button type="button" class="button" id="data-preview-action">💾 ファイルを保存</button>
        </div>
      </div>
    </div>`;
}
function getMaxCellHeightForA4(padding) {
  const fixedH = (padding * 2) + 80; // 上下余白 + ヘッダー行(約48px) + thead(約32px)
  return Math.max(80, Math.floor((778 - fixedH) / 4));
}
function getPresetConfig(mode, isA4) {
  if (mode === 'memo') {
    if (isA4) {
      const maxH = getMaxCellHeightForA4(EXPORT_MODES.memo.padding);
      return { ...EXPORT_MODES.memo, cellHeight: maxH };
    }
    return { ...EXPORT_MODES.memo };
  }
  if (mode === 'a4fit') {
    const maxH = getMaxCellHeightForA4(EXPORT_MODES.a4fit.padding);
    return { ...EXPORT_MODES.a4fit, cellHeight: Math.min(EXPORT_MODES.a4fit.cellHeight, maxH) };
  }
  if (mode === 'web') {
    return { ...EXPORT_MODES.web };
  }
  return null;
}
function updateSizeModalScale() {
  const viewport = document.getElementById('size-overlay-viewport');
  const wrap = document.getElementById('size-paper-wrap');
  const paper = document.getElementById('size-modal-paper');
  if (!viewport || !wrap) return;
  const pad = (typeof window !== 'undefined' && window.innerWidth <= 680) ? 20 : 40;
  const availW = Math.max(260, (viewport.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 360)) - pad);
  const availH = Math.max(220, (viewport.clientHeight || 480) - pad);
  const naturalH = a4ModeEnabled ? 778 : Math.max(520, paper?.offsetHeight || paper?.scrollHeight || 720);
  const targetW = 1100;
  const fitScale = Math.min(availW / targetW, availH / naturalH, 1);
  wrap.style.setProperty('--sheet-scale', String(fitScale.toFixed(3)));
  wrap.style.setProperty('--sheet-height', `${naturalH}px`);
}
function applyLiveSheetSize(sheet) {
  if (!sheet) return;
  const pad = exportSizeConfig.padding;
  const cellH = exportSizeConfig.cellHeight;
  const scale = exportSizeConfig.fontScale / 100;
  sheet.style.setProperty('--export-pad', `${pad}px`);
  sheet.style.setProperty('--export-cell-h', `${cellH}px`);
  sheet.style.setProperty('--export-font-scale', String(scale));
  sheet.style.padding = `${pad}px`;
}
function syncSizeControlsUI() {
  document.querySelectorAll('[data-size-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sizeMode === exportSizeMode);
  });
  const padIn = document.getElementById('size-slider-padding');
  const cellIn = document.getElementById('size-slider-cell');
  const fontIn = document.getElementById('size-slider-font');
  const a4Toggle = document.getElementById('size-toggle-a4');
  if (a4Toggle) a4Toggle.checked = a4ModeEnabled;

  if (a4ModeEnabled) {
    const maxCellH = getMaxCellHeightForA4(exportSizeConfig.padding);
    if (cellIn) cellIn.max = String(maxCellH);
    if (exportSizeConfig.cellHeight > maxCellH) {
      exportSizeConfig.cellHeight = maxCellH;
    }
  } else {
    if (cellIn) cellIn.max = '240';
  }

  if (padIn) padIn.value = String(exportSizeConfig.padding);
  if (cellIn) cellIn.value = String(exportSizeConfig.cellHeight);
  if (fontIn) fontIn.value = String(exportSizeConfig.fontScale);
  const padVal = document.getElementById('size-val-padding');
  const cellVal = document.getElementById('size-val-cell');
  const fontVal = document.getElementById('size-val-font');
  if (padVal) padVal.textContent = `${exportSizeConfig.padding}px`;
  if (cellVal) cellVal.textContent = `${exportSizeConfig.cellHeight}px`;
  if (fontVal) fontVal.textContent = `${exportSizeConfig.fontScale}%`;
  const paper = document.getElementById('size-modal-paper');
  if (paper) paper.classList.toggle('a4-mode', a4ModeEnabled);
  const sheet = document.querySelector('#size-modal-paper .export-sheet');
  applyLiveSheetSize(sheet);
  updateSizeModalScale();
}
function openSizeAdjustModal() {
  const modal = document.getElementById('export-size-modal');
  const paper = document.getElementById('size-modal-paper');
  const panel = document.getElementById('timetable-sheet');
  if (!modal || !paper || !panel) return;
  const clone = panel.cloneNode(true);
  clone.querySelectorAll('[data-export-exclude]').forEach(n => n.remove());
  clone.removeAttribute('id');
  const expTheme = getExportTheme();
  clone.classList.add('export-sheet');
  clone.setAttribute('data-theme', expTheme);
  paper.setAttribute('data-theme', expTheme);
  syncExportThemeUI();
  paper.classList.toggle('a4-mode', a4ModeEnabled);
  clone.querySelector('.panel-head')?.remove();
  clone.querySelector('.timetable-source')?.remove();
  const headerRow = document.createElement('div');
  headerRow.className = 'export-header-row';
  headerRow.innerHTML = `
    <div class="export-header-main">
      <h1 class="export-title">明石高専 後期時間割</h1>
      <span class="export-badge-tag">${escapeHTML(studentLabel())}</span>
      <span class="export-team-tag">Co+work 6班</span>
    </div>
    <div class="export-header-sub">
      <small class="export-pdf-date">PDF参照: ${escapeHTML(SOURCE?.updated || '2026-09-24')}</small>
    </div>
  `;
  clone.prepend(headerRow);

  const scroller = clone.querySelector('.table-scroll');
  if (scroller) scroller.style.cssText = 'overflow:visible;width:100%;max-height:none;';
  const tbl = clone.querySelector('table');
  if (tbl) tbl.style.width = '100%';
  paper.innerHTML = '';
  paper.append(clone);
  applyLiveSheetSize(clone);
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  document.body.classList.add('size-modal-open');
  syncSizeControlsUI();
  document.getElementById('export-size-close')?.focus?.();
}
function closeSizeAdjustModal() {
  const modal = document.getElementById('export-size-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  document.body.classList.remove('size-modal-open');
  const panel = document.getElementById('timetable-sheet');
  if (panel) applyLiveSheetSize(panel);
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}
function openExportAdjustModal() {
  if (currentExportFormat === 'pdf' || currentExportFormat === 'png') {
    openSizeAdjustModal();
  } else {
    openDataPreviewModal(currentExportFormat);
  }
}
async function openDataPreviewModal(format) {
  const modal = document.getElementById('data-preview-modal');
  const title = document.getElementById('data-preview-title');
  const body = document.getElementById('data-preview-body');
  const copyBtn = document.getElementById('data-preview-copy');
  const actionBtn = document.getElementById('data-preview-action');
  if (!modal || !title || !body || !copyBtn || !actionBtn) return;

  const scheduleResult = selectedSchedule();
  const lessons = scheduleResult.selected || [];
  const label = studentLabel();

  const fiscalYear = timetableMeta?.fiscalYear || 2026;
  const term = timetableMeta?.term || '後期';
  const updatedDate = timetableMeta?.updated || SOURCE?.updated || '2026-09-24';

  const { generateCsv, generateText, generateJson, generateIcs } = await import('./timetable-export.js');

  const updatePreview = () => {
    if (format === 'text') {
      title.textContent = 'テキスト出力のプレビュー＆設定';
      copyBtn.textContent = '📋 テキストをコピー';
      actionBtn.textContent = '💾 テキスト保存';
      const txt = generateText(lessons, label, { ...textExportOptions, includeEmpty: exportIncludeEmpty, fiscalYear, term });
      body.innerHTML = `
        <div class="data-preview-options">
          <label><input type="checkbox" id="text-opt-location" ${textExportOptions.includeLocation ? 'checked' : ''}> 教室名を含める</label>
          <label><input type="checkbox" id="text-opt-teacher" ${textExportOptions.includeTeacher ? 'checked' : ''}> 担当教員を含める</label>
          <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空きコマを含める</label>
        </div>
        <pre class="preview-code-block">${escapeHTML(txt)}</pre>
      `;
      document.getElementById('text-opt-location')?.addEventListener('change', e => {
        textExportOptions.includeLocation = e.target.checked;
        updatePreview();
      });
      document.getElementById('text-opt-teacher')?.addEventListener('change', e => {
        textExportOptions.includeTeacher = e.target.checked;
        updatePreview();
      });
      document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
        exportIncludeEmpty = e.target.checked;
        updatePreview();
      });
    } else if (format === 'csv') {
      title.textContent = 'CSV形式プレビュー';
      copyBtn.textContent = '📋 CSVをコピー';
      actionBtn.textContent = '💾 CSVダウンロード';
      const csv = generateCsv(lessons, label, { includeEmpty: exportIncludeEmpty, fiscalYear, term });
      body.innerHTML = `
        <div class="data-preview-options">
          <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空きコマを含める</label>
        </div>
        <pre class="preview-code-block">${escapeHTML(csv)}</pre>
      `;
      document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
        exportIncludeEmpty = e.target.checked;
        updatePreview();
      });
    } else if (format === 'json') {
      title.textContent = 'JSONデータプレビュー';
      copyBtn.textContent = '📋 JSONをコピー';
      actionBtn.textContent = '💾 JSONダウンロード';
      const json = generateJson(lessons, label, updatedDate, { includeEmpty: exportIncludeEmpty, fiscalYear, term });
      body.innerHTML = `
        <div class="data-preview-options" style="margin-bottom:8px;">
          <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空きコマを含める</label>
        </div>
        <div class="data-schema-doc">
          <div class="schema-doc-title">データ構造（配列形式）</div>
          <p style="margin:0 0 8px;font-size:11px;color:var(--muted);">※各授業を独立したイベントとして扱うことで、カレンダー連携やプログラムでの集計・検索が容易な設計です。</p>
          <ul class="schema-doc-list">
            <li><code>meta</code>: 学期、対象所属、元データ更新日(sourceUpdated)、合計コマ数(totalPeriods)、科目数</li>
            <li><code>lessons[ ]</code>: 授業イベントの配列</li>
            <li><code>dayOfWeek</code>: 曜日（1:月〜5:金）</li>
            <li><code>period</code> / <code>duration</code>: 開始時限 / コマ数</li>
            <li><code>subjectName</code>: 科目名</li>
            <li><code>location</code> / <code>teacher</code>: 教室 / 担当教員</li>
            <li><code>notes</code>: 備考</li>
          </ul>
        </div>
        <pre class="preview-code-block" style="margin-top:10px;">${escapeHTML(json)}</pre>
      `;
      document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
        exportIncludeEmpty = e.target.checked;
        updatePreview();
      });
    } else if (format === 'ics') {
      title.textContent = 'iCal (.ics) 形式プレビュー';
      copyBtn.textContent = '📋 iCalをコピー';
      actionBtn.textContent = '💾 iCal保存 (.ics)';
      const holidayDates = (calendarData?.events || [])
        .filter(ev => ev && (ev.type === 'holiday' || ev.hasClasses === false) && ev.date)
        .map(ev => ev.date);
      const ics = generateIcs(lessons, label, {
        fiscalYear,
        term,
        holidays: holidayDates
      });
      body.innerHTML = `
        <div class="data-preview-options">
          <span class="badge blue">Google Calendar / Apple Calendar 対応 (.ics)</span>
        </div>
        <pre class="preview-code-block">${escapeHTML(ics)}</pre>
      `;
    }
  };

  lastModalTrigger = document.activeElement || null;
  updatePreview();
  modal.hidden = false;
  document.body.classList.add('size-modal-open');
  document.getElementById('data-preview-close')?.focus?.();
}
function closeDataPreviewModal() {
  const modal = document.getElementById('data-preview-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}
async function downloadCurrentTimetable(action = 'download') {
  if (exportInProgress || selectedSchedule().error) return;
  const panel = document.getElementById('timetable-sheet');
  if (!panel) return;
  // 非同期処理中に画面や選択条件が変わっても、押した時点の時間割を保存する。
  const snapshot = panel.cloneNode(true);
  const format = document.getElementById('export-format')?.value || currentExportFormat;
  const filename = `R8後期時間割-${studentShortLabel()}`.replace(/[\\/:*?"<>|]/g, '_');
  const downloadBtn = document.getElementById('export-download');
  const copyBtn = document.getElementById('export-copy');
  const status = document.getElementById('export-status');
  exportInProgress = true;
  if (downloadBtn) {
    downloadBtn.disabled = true;
    if (action === 'download') downloadBtn.textContent = '作成中…';
  }
  if (copyBtn) {
    copyBtn.disabled = true;
    if (action === 'copy') copyBtn.textContent = 'コピー中…';
  }
  if (status) {
    status.hidden = false;
    status.textContent = action === 'copy' ? 'クリップボードにコピーしています…' : `${format.toUpperCase()}を作成しています…`;
  }
  try {
    const { exportTimetable } = await import('./timetable-export.js');
    const scheduleResult = selectedSchedule();
    const holidayDates = (calendarData?.events || [])
      .filter(ev => ev && (ev.type === 'holiday' || ev.hasClasses === false) && ev.date)
      .map(ev => ev.date);
    const result = await exportTimetable(snapshot, format, filename, {
      studentLabel: studentLabel(),
      selectedLessons: scheduleResult.selected || [],
      updated: timetableMeta?.updated || SOURCE?.updated || '2026-09-24',
      fiscalYear: timetableMeta?.fiscalYear || 2026,
      term: timetableMeta?.term || '後期',
      holidays: holidayDates,
      sizeConfig: { ...exportSizeConfig },
      a4Mode: a4ModeEnabled,
      theme: getExportTheme(),
      textOptions: { ...textExportOptions },
      includeEmpty: exportIncludeEmpty,
      action: action
    });
    if (status) {
      status.hidden = false;
      status.textContent = result?.message || (action === 'copy'
        ? 'クリップボードにコピーしました！'
        : (format === 'pdf'
          ? '印刷・PDF保存画面を開きました。「PDFに保存」またはプリンターを選択してください。'
          : 'ファイルを作成しました。ブラウザーのダウンロードを確認してください。'));
    }
  } catch (error) {
    console.error('Timetable export failed', error);
    if (status) {
      status.hidden = false;
      status.textContent = '処理を完了できませんでした。通信状態を確認して、もう一度お試しください。';
    }
  } finally {
    exportInProgress = false;
    const currentDL = document.getElementById('export-download');
    const currentCopy = document.getElementById('export-copy');
    if (currentDL) {
      currentDL.disabled = Boolean(selectedSchedule().error);
      currentDL.textContent = EXPORT_FORMAT_CONFIGS[currentExportFormat]?.downloadLabel || '💾 保存';
    }
    if (currentCopy) {
      currentCopy.disabled = Boolean(selectedSchedule().error);
      currentCopy.textContent = EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel || '📋 コピー';
    }
    const select = document.getElementById('export-format');
    if (select) select.disabled = Boolean(selectedSchedule().error);
  }
}
let globalListenersBound = false;
function render() {
  const rawHash = (location.hash.slice(1).split('?')[0].split('/')[0] || 'home').trim();
  const page = Object.hasOwn(names, rawHash) ? rawHash : 'home';
  const breadcrumbEl = document.getElementById('breadcrumb');
  if (breadcrumbEl) breadcrumbEl.textContent = names[page];
  document.title = `${names[page]} — Campus`;
  document.querySelectorAll('[data-page]').forEach(a => {
    const isActive = a.dataset.page === page;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const main = document.getElementById('main');
  if (main) {
    if (page === 'home') main.innerHTML = home();
    else if (page === 'timetable') {
      main.innerHTML = timetable();
      const sheetEl = document.getElementById('timetable-sheet');
      if (sheetEl && !sheetEl.parentElement) {
        const m = main.innerHTML.match(/<section[^>]*id="timetable-sheet"[^>]*>([\s\S]*?)<\/section>/);
        if (m) sheetEl.innerHTML = m[1];
      }
    }
    else if (page === 'exam') main.innerHTML = exam();
    else if (page === 'calendar') main.innerHTML = calendar();
    else if (page === 'cafeteria') main.innerHTML = cafeteria();
    else if (page === 'links') main.innerHTML = linksView();
  }
  const formatSelect = document.getElementById('export-format');
  const copyBtn = document.getElementById('export-copy');
  const downloadBtn = document.getElementById('export-download');
  const adjustBtn = document.getElementById('export-adjust-open');

  const syncExportFormatUI = () => {
    const fmt = formatSelect?.value || currentExportFormat;
    currentExportFormat = fmt;
    const cfg = EXPORT_FORMAT_CONFIGS[fmt] || EXPORT_FORMAT_CONFIGS.pdf;
    if (copyBtn && !exportInProgress) {
      if (cfg.copyLabel) {
        copyBtn.hidden = false;
        copyBtn.textContent = cfg.copyLabel;
      } else {
        copyBtn.hidden = true;
      }
    }
    if (downloadBtn && !exportInProgress) {
      downloadBtn.textContent = cfg.downloadLabel;
    }
    if (adjustBtn) {
      adjustBtn.textContent = cfg.adjustLabel;
    }
  };

  formatSelect?.addEventListener('change', syncExportFormatUI);
  copyBtn?.addEventListener('click', () => downloadCurrentTimetable('copy'));
  downloadBtn?.addEventListener('click', () => downloadCurrentTimetable('download'));
  adjustBtn?.addEventListener('click', openExportAdjustModal);
  document.getElementById('size-modal-theme-toggle')?.addEventListener('click', () => {
    exportThemeOverride = getExportTheme() === 'dark' ? 'light' : 'dark';
    syncExportThemeUI();
  });
  document.getElementById('export-size-close')?.addEventListener('click', closeSizeAdjustModal);
  document.getElementById('size-modal-save-btn')?.addEventListener('click', () => {
    closeSizeAdjustModal();
    downloadCurrentTimetable('download');
  });
  document.getElementById('data-preview-close')?.addEventListener('click', closeDataPreviewModal);
  document.getElementById('data-preview-cancel')?.addEventListener('click', closeDataPreviewModal);
  document.getElementById('data-preview-copy')?.addEventListener('click', async () => {
    await downloadCurrentTimetable('copy');
    const previewCopy = document.getElementById('data-preview-copy');
    if (previewCopy) {
      const orig = previewCopy.textContent;
      previewCopy.textContent = '✅ コピー完了！';
      previewCopy.classList?.add('btn-success');
      const timer = setTimeout(() => {
        previewCopy.textContent = orig;
        previewCopy.classList?.remove('btn-success');
      }, 1500);
      timer?.unref?.();
    }
  });
  document.getElementById('data-preview-action')?.addEventListener('click', () => {
    closeDataPreviewModal();
    downloadCurrentTimetable('download');
  });
  // 全体データダウンロードボタン
  document.getElementById('export-raw-data-btn')?.addEventListener('click', async () => {
    const { exportAllLessonsJson } = await import('./timetable-export.js');
    exportAllLessonsJson(activeLessons, timetableMeta || SOURCE);
  });

  // 年間予定 iCal 保存ボタン
  document.getElementById('export-calendar-ics')?.addEventListener('click', async () => {
    const { exportCalendarIcs } = await import('./timetable-export.js');
    const cal = calendarData || FALLBACK_CALENDAR;
    const fy = timetableMeta?.fiscalYear || 2026;
    exportCalendarIcs(cal, `akashi-calendar-${fy}.ics`);
  });

  // 定期試験検索入力
  document.getElementById('exam-search-input')?.addEventListener('input', e => {
    const q = String(e.target?.value || '').trim().toLowerCase();
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('.exam-card').forEach(card => {
        const txt = String(card.textContent || '').toLowerCase();
        if (card.style) card.style.display = (!q || txt.includes(q)) ? '' : 'none';
      });
    }
  });

  // マイリンク追加・削除イベント
  document.getElementById('mylink-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const nameInput = document.getElementById('mylink-name');
    const urlInput = document.getElementById('mylink-url');
    const errEl = document.getElementById('mylink-error');
    const res = addMyLink({ name: nameInput?.value, url: urlInput?.value });
    if (!res.success) {
      if (errEl) {
        errEl.textContent = res.error || 'リンクを追加できませんでした';
        errEl.hidden = false;
      }
      return;
    }
    render();
  });
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-dash-offset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset?.dashOffset);
        dashboardOffsetDays = val === 0 ? 0 : (dashboardOffsetDays + val);
        render();
      });
    });
    document.querySelectorAll('[data-cal-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        calendarFilterPeriod = btn.dataset?.calPeriod || 'all';
        render();
      });
    });
    document.querySelectorAll('[data-cal-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        calendarFilterCategory = btn.dataset?.calCat || 'all';
        render();
      });
    });
    document.querySelectorAll('[data-cafe-week]').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = Number(btn.dataset?.cafeWeek);
        selectedCafeteriaWeekIdx = Number.isFinite(w) ? w : -1;
        render();
      });
    });
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset?.presetName || btn.textContent?.trim();
        const url = btn.dataset?.presetUrl || '';
        if (name && url) {
          addMyLink({ name, url });
          render();
        }
      });
    });
    document.querySelectorAll('.mylink-move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset?.moveId;
        const dir = btn.dataset?.dir;
        if (id && dir) {
          reorderMyLink(id, dir);
          render();
        }
      });
    });
    document.querySelectorAll('.mylink-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset?.removeId;
        if (id) {
          deleteMyLink(id);
          render();
        }
      });
    });
  }
  // A4枠トグル
  document.getElementById('size-toggle-a4')?.addEventListener('change', e => {
    a4ModeEnabled = e.target.checked;
    const preset = getPresetConfig(exportSizeMode, a4ModeEnabled);
    if (preset) {
      exportSizeConfig = { ...preset };
    } else if (a4ModeEnabled) {
      const maxH = getMaxCellHeightForA4(exportSizeConfig.padding);
      if (exportSizeConfig.cellHeight > maxH) {
        exportSizeConfig.cellHeight = maxH;
      }
    }
    syncSizeControlsUI();
  });
  // モーダル外部（背景オーバーレイ）クリックで閉じる
  document.getElementById('data-preview-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDataPreviewModal();
  });
  document.getElementById('export-size-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget || e.target.id === 'size-overlay-viewport' || e.target.id === 'size-paper-wrap') {
      closeSizeAdjustModal();
    }
  });
  // Escape キーでモーダルを閉じる（グローバルリスナーは初回のみ登録）
  if (!globalListenersBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    globalListenersBound = true;
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeDataPreviewModal();
        closeSizeAdjustModal();
      }
    });
    window.addEventListener('resize', () => {
      if (!document.getElementById('export-size-modal')?.hidden) {
        updateSizeModalScale();
      }
    });
  }
  document.querySelectorAll('[data-size-mode]').forEach(btn => btn.addEventListener('click', () => {
    const mode = btn.dataset.sizeMode;
    exportSizeMode = mode;
    if (mode === 'a4fit') {
      a4ModeEnabled = true;
    }
    const preset = getPresetConfig(mode, a4ModeEnabled);
    if (preset) {
      exportSizeConfig = { ...preset };
    }
    syncSizeControlsUI();
  }));
  document.getElementById('size-mode-reset')?.addEventListener('click', () => {
    exportSizeMode = 'web';
    a4ModeEnabled = false;
    exportSizeConfig = { ...EXPORT_MODES.web };
    syncSizeControlsUI();
  });
  document.getElementById('size-slider-padding')?.addEventListener('input', e => {
    exportSizeConfig.padding = Number(e.target.value);
    exportSizeMode = 'custom';
    if (a4ModeEnabled) {
      const maxH = getMaxCellHeightForA4(exportSizeConfig.padding);
      if (exportSizeConfig.cellHeight > maxH) {
        exportSizeConfig.cellHeight = maxH;
      }
    }
    syncSizeControlsUI();
  });
  document.getElementById('size-slider-cell')?.addEventListener('input', e => {
    let val = Number(e.target.value);
    if (a4ModeEnabled) {
      const maxH = getMaxCellHeightForA4(exportSizeConfig.padding);
      val = Math.min(val, maxH);
    }
    exportSizeConfig.cellHeight = val;
    exportSizeMode = 'custom';
    syncSizeControlsUI();
  });
  document.getElementById('size-slider-font')?.addEventListener('input', e => {
    exportSizeConfig.fontScale = Number(e.target.value);
    exportSizeMode = 'custom';
    syncSizeControlsUI();
  });
  document.getElementById('confirm-filter-btn')?.addEventListener('click', () => {
    filterOpen = false;
    saveSelectionCookie();
    render();
    document.getElementById('timetable-sheet')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('filter-details')?.addEventListener('toggle', e => {
    filterOpen = Boolean(e.target.open);
    const label = document.querySelector('.filter-toggle-label');
    if (label) label.textContent = filterOpen ? '閉じる ▲' : '変更する ▼';
  });
  document.querySelectorAll('[data-student]').forEach(select=>select.addEventListener('change',e=>{
    const key=e.target.dataset.student;
    const value=key==='grade'?Number(e.target.value):e.target.value;
    if(!SELECTION_VALUES[key]?.includes(value)) return;
    studentSelection[key]=value;
    if (key === 'grade') {
      const isAdvanced = value >= 6;
      if (isAdvanced && !ADVANCED_DEPARTMENTS.includes(studentSelection.department)) {
        studentSelection.department = 'ME';
      } else if (!isAdvanced && !DEPARTMENTS.includes(studentSelection.department)) {
        studentSelection.department = 'M';
      }
    }
    filterOpen=true;
    const saved=saveSelectionCookie();
    const id=e.target.id;
    render();
    if(!saved) {
      const status=document.querySelector('.selection-status');
      status.hidden=false;
      status.textContent='選択条件を保存できませんでした。現在の画面では選択できますが、再訪時は設定が戻ります。';
    }
    document.getElementById(id)?.focus({preventScroll:true});
  }));
}

let navMediaQuery = null;
function setupNavigation() {
  const sidebar=document.getElementById('sidebar');
  const toggle=document.getElementById('menu-toggle');
  const close=document.getElementById('menu-close');
  const overlay=document.getElementById('menu-overlay');
  const workspace=document.querySelector('.workspace');
  const skip=document.querySelector('.skip-link');
  const mobile=window.matchMedia('(max-width: 760px)');
  navMediaQuery = mobile;
  let isOpen=false;
  function setOpen(open, returnFocus=true) {
    isOpen=mobile.matches && open;
    document.body.classList.toggle('menu-open',isOpen);
    toggle.setAttribute('aria-expanded',String(isOpen));
    overlay.hidden=!isOpen;
    workspace.inert=isOpen;
    skip.inert=isOpen;
    sidebar.inert=mobile.matches && !isOpen;
    if(mobile.matches) sidebar.setAttribute('aria-hidden',String(!isOpen)); else sidebar.removeAttribute('aria-hidden');
    if(isOpen) {
      sidebar.setAttribute('role','dialog');
      sidebar.setAttribute('aria-modal','true');
      close.focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if(returnFocus && mobile.matches) toggle.focus();
    }
  }
  toggle.addEventListener('click',()=>setOpen(!isOpen));
  close.addEventListener('click',()=>setOpen(false));
  overlay.addEventListener('click',()=>setOpen(false));
  sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    if(isOpen) { setOpen(false,false); document.getElementById('main').focus({preventScroll:true}); }
  }));
  document.addEventListener('keydown',event=>{
    if(!isOpen) return;
    if(event.key==='Escape') { event.preventDefault(); setOpen(false); }
    if(event.key==='Tab') {
      const controls=[close,...sidebar.querySelectorAll('a')];
      const index=controls.indexOf(document.activeElement);
      if(event.shiftKey && index<=0) { event.preventDefault(); controls.at(-1).focus(); }
      else if(!event.shiftKey && (index===controls.length-1 || index===-1)) { event.preventDefault(); close.focus(); }
    }
  });
  mobile.addEventListener('change',()=>{
    const focusWasInside=sidebar.contains(document.activeElement);
    setOpen(false,focusWasInside);
  });
  setOpen(false,false);
  return ()=>setOpen(false,false);
}
const closeNavigation=setupNavigation();
window.addEventListener('hashchange',()=>{closeNavigation();render();window.scrollTo(0,0);document.getElementById('main').focus({preventScroll:true});document.querySelector?.('.topbar')?.classList?.remove('topbar-hidden');document.getElementById('menu-toggle')?.classList?.remove('topbar-hidden');});

const THEME_COOKIE = 'campus-theme';
function getOsTheme() {
  try {
    return (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)')?.matches) ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
function resolveEffectiveTheme(mode = currentTheme) {
  if (mode === 'dark' || mode === 'light') return mode;
  return getOsTheme();
}
function getNextThemeMode(mode = currentTheme) {
  const os = getOsTheme();
  if (mode === 'system') return os === 'dark' ? 'light' : 'dark';
  if (mode === 'dark') return os === 'dark' ? 'system' : 'light';
  return os === 'light' ? 'system' : 'dark';
}
function getInitialTheme() {
  try {
    const entry = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${THEME_COOKIE}=`));
    if (entry) {
      const val = decodeURIComponent(entry.slice(THEME_COOKIE.length+1));
      if (val === 'dark' || val === 'light' || val === 'system') return val;
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_COOKIE);
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    }
  } catch {}
  return 'system';
}
let currentTheme = getInitialTheme();
function syncExportThemeUI() {
  if (typeof document === 'undefined') return;
  const expTheme = getExportTheme();
  const sizePaper = document.getElementById('size-modal-paper');
  if (sizePaper) sizePaper.setAttribute('data-theme', expTheme);
  const sizeSheet = document.querySelector?.('#size-modal-paper .export-sheet');
  if (sizeSheet) sizeSheet.setAttribute('data-theme', expTheme);
  const modalThemeBtn = document.getElementById('size-modal-theme-toggle');
  if (modalThemeBtn) modalThemeBtn.textContent = expTheme === 'dark' ? '☀️ 白背景で出力' : '🌙 暗背景で出力';
}
function updateThemeUI(mode = currentTheme) {
  if (typeof document === 'undefined') return;
  const { eff: effective, iconName, label } = getThemeButtonMeta(mode);
  if (document.documentElement?.setAttribute) {
    if (effective === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  const themeMeta = document.querySelector?.('meta[name="theme-color"]');
  if (themeMeta?.setAttribute) {
    themeMeta.setAttribute('content', effective === 'dark' ? '#11141c' : '#79182b');
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute?.('data-theme-mode', mode);
    if (btn.dataset) btn.dataset.themeMode = mode;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    const iconEl = (typeof btn.querySelector === 'function' ? btn.querySelector('.theme-icon') : null) || btn;
    if (iconEl.setAttribute) iconEl.setAttribute('data-icon', iconName);
    if (iconEl.dataset) iconEl.dataset.icon = iconName;
    iconEl.innerHTML = icon(iconName);
  }
  syncExportThemeUI();
}
function setTheme(theme) {
  currentTheme = (theme === 'dark' || theme === 'light' || theme === 'system') ? theme : 'system';
  updateThemeUI(currentTheme);
  try { localStorage.setItem('campus-theme', currentTheme); } catch {}
  try {
    const path = location.pathname.slice(0,location.pathname.lastIndexOf('/')+1) || '/';
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(currentTheme)}; Path=${path}; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  } catch {}
}
function setupTheme() {
  updateThemeUI(currentTheme);
  document.addEventListener('click', e => {
    const btn = e.target?.closest?.('#theme-toggle');
    if (btn) {
      setTheme(getNextThemeMode(currentTheme));
    }
  });
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const themeMql = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMql && themeMql !== navMediaQuery && typeof themeMql.addEventListener === 'function') {
      themeMql.addEventListener('change', () => {
        if (currentTheme === 'system') updateThemeUI('system');
      });
    }
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', e => {
      if (e && e.key === THEME_COOKIE) {
        const next = e.newValue;
        if (next === 'dark' || next === 'light' || next === 'system') {
          currentTheme = next;
          updateThemeUI(currentTheme);
        }
      }
    });
  }
}
function setupMobileHeaderScroll() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  const menuToggleEl = typeof document.getElementById === 'function' ? document.getElementById('menu-toggle') : null;
  menuToggleEl?.addEventListener?.('focus', () => menuToggleEl.classList?.remove('topbar-hidden'));
  let lastY = 0;
  let ticking = false;
  const raf = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame
    : (cb) => setTimeout(cb, 0);
  window.addEventListener('scroll', () => {
    if (!ticking) {
      raf(() => {
        const topbar = typeof document.querySelector === 'function' ? document.querySelector('.topbar') : null;
        const menuToggle = typeof document.getElementById === 'function' ? document.getElementById('menu-toggle') : null;
        const currentY = typeof window.scrollY === 'number' ? window.scrollY : (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0);
        if (typeof window.innerWidth === 'number' && window.innerWidth <= 760 && !document.body?.classList?.contains('menu-open')) {
          if (currentY > lastY && currentY > 50) {
            topbar?.classList?.add('topbar-hidden');
            menuToggle?.classList?.add('topbar-hidden');
          } else if (currentY < lastY || currentY <= 20) {
            topbar?.classList?.remove('topbar-hidden');
            menuToggle?.classList?.remove('topbar-hidden');
          }
        }
        lastY = Math.max(0, currentY);
        ticking = false;
      });
      ticking = true;
    }
  });
}
setupMobileHeaderScroll();
setupTheme();
render();
loadDistData();
