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
  download:'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  copy:'M9 9h10v10H9ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  sliders:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',
  search:'m21 21-4.3-4.3M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
  alert:'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  chevronLeft:'m15 18-6-6 6-6',
  chevronRight:'m9 18 6-6-6-6',
  close:'M18 6 6 18M6 6l12 12',
  grid:'M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z',
  rotate:'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
  clipboardList:'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M9 12h6M9 16h4',
  lmsScreen:'M3 5h18v12H3Zm5 16h8m-4-4v4M7.5 9l1.8 4.5L12 10l2.7 3.5L16.5 9',
  libraryBooks:'M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 19.5ZM9 4h5v16H9M14 5l4.5-.8L20 19l-4.5.8Z',
  train:'M7 4h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3ZM4 11h16M8.5 15h.01M15.5 15h.01M8 18l-2 3M16 18l2 3',
  atom:'M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0M12 3c2.3 0 4.2 4 4.2 9s-1.9 9-4.2 9-4.2-4-4.2-9 1.9-9 4.2-9ZM4.5 16.3c-1.2-2.1 1.4-5.7 5.7-8.2s8.7-2.8 9.9-.7-1.4 5.7-5.7 8.2-8.7 2.8-9.9.7ZM4.5 7.7c1.2-2.1 5.6-1.8 9.9.7s6.9 6.1 5.7 8.2-5.6 1.8-9.9-.7-6.9-6.1-5.7-8.2Z',
};
const FEATURE_FLAGS = { exam: false, cafeteria: false };
const MS365_PORTAL_URL = 'https://kosenjp.sharepoint.com/sites/27akashi/students-portal/Lists/henkou/view1.aspx?viewid=a5680f87%2D5471%2D4706%2D9536%2Dd4998c34ff72';
const names={home:'ホーム',timetable:'時間割',exam:'定期試験',calendar:'年間予定',cafeteria:'食堂メニュー',links:'リンク集'};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icons[name] || icons.info}"/></svg>`;
const setBtnContent = (el, iconName, text) => {
  if (!el) return;
  el.innerHTML = iconName ? `${icon(iconName)}${escapeHTML(text)}` : escapeHTML(text);
};
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const JST_WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function getJstParts(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: '2026-10-05', year: 2026, month: 10, day: 5, weekdayNum: 1, hour: 9, minute: 0 };
  }
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const map = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);
  const weekdayNum = JST_WEEKDAYS[map.weekday] ?? 0;
  const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dateStr, year, month, day, weekdayNum, hour, minute };
}
const dateKey = date => getJstParts(date).dateStr;
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
  a4fit: { padding: 16, cellHeight: 166, fontScale: 120 },
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
  pdf: { copyLabel: null, downloadLabel: 'PDF保存', adjustLabel: 'プレビュー・PDF出力' },
  png: { copyLabel: '画像をコピー', downloadLabel: 'PNG保存', adjustLabel: 'プレビュー・PNG出力' },
  ics: { copyLabel: null, downloadLabel: 'カレンダー形式で出力', adjustLabel: 'プレビュー & カレンダー形式で保存' },
  text: { copyLabel: 'テキストをコピー', downloadLabel: 'テキスト保存', adjustLabel: 'プレビュー・出力' },
  csv: { copyLabel: 'CSVをコピー', downloadLabel: 'CSV保存', adjustLabel: 'プレビュー・出力' },
  json: { copyLabel: 'JSONをコピー', downloadLabel: 'JSON保存', adjustLabel: 'プレビュー・出力' },
  'all-json': { copyLabel: '全授業JSONをコピー', downloadLabel: '全授業JSON保存', adjustLabel: 'プレビュー・出力' },
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
  meta: { title: '令和8年度 行事予定表', fiscalYear: 2026 },
  terms: {
    zenki: { startDate: '2026-04-01', classesStartDate: '2026-04-07', totalWeeks: 15 },
    kouki: { startDate: '2026-09-24', classesStartDate: '2026-09-24', winterVacationEnd: '2027-01-04', examStartDate: '2027-02-02', examEndDate: '2027-02-08', totalWeeks: 15 }
  },
  daySubstitutions: [
    { date: '2026-04-28', originalDay: 2, effectiveDay: 3, substituteDay: '水', weekNumber: 4, reason: '年間予定表に基づく水曜日授業振替', note: '火曜日に水曜授業を実施（TOEIC IPテスト）' },
    { date: '2026-05-08', originalDay: 5, effectiveDay: 1, substituteDay: '月', weekNumber: 5, reason: '年間予定表に基づく月曜日授業振替', note: '金曜日に月曜授業を実施' },
    { date: '2026-11-04', originalDay: 3, effectiveDay: 1, substituteDay: '月', weekNumber: 7, reason: '年間予定表に基づく月曜日授業振替', note: '水曜日に月曜授業を実施（全校清掃日）' },
    { date: '2026-11-25', originalDay: 3, effectiveDay: 1, substituteDay: '月', weekNumber: 10, reason: '年間予定表に基づく月曜日授業振替', note: '水曜日に月曜授業を実施' },
    { date: '2027-01-12', originalDay: 2, effectiveDay: 1, substituteDay: '月', weekNumber: 13, reason: '年間予定表に基づく月曜日授業振替', note: '火曜日に月曜授業を実施' }
  ],
  events: [
    { date: '2026-04-03', title: '入学式・入寮式', hasClasses: false, type: 'ceremony' },
    { date: '2026-04-07', title: '前期授業開始', hasClasses: true, type: 'academic' },
    { date: '2026-04-23', title: '開校記念日', hasClasses: true, type: 'academic' },
    { date: '2026-07-30', endDate: '2026-08-05', title: '前期試験期間', hasClasses: false, type: 'exam' },
    { date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業', hasClasses: false, type: 'vacation' },
    { date: '2026-09-24', title: '後期授業開始（全校集会）', hasClasses: true, type: 'academic' },
    { date: '2026-10-12', title: 'スポーツの日', hasClasses: false, type: 'holiday' },
    { date: '2026-10-30', title: '高専祭準備', hasClasses: false, type: 'event' },
    { date: '2026-10-31', endDate: '2026-11-01', title: '高専祭', hasClasses: false, type: 'event' },
    { date: '2026-11-02', title: '臨時休業', hasClasses: false, type: 'holiday' },
    { date: '2026-11-03', title: '文化の日', hasClasses: false, type: 'holiday' },
    { date: '2026-11-19', endDate: '2026-11-20', title: '全校避難訓練・スポーツ大会', hasClasses: false, type: 'event' },
    { date: '2026-11-23', title: '勤労感謝の日', hasClasses: false, type: 'holiday' },
    { date: '2026-12-26', endDate: '2027-01-04', title: '冬季休業', hasClasses: false, type: 'vacation' },
    { date: '2027-01-14', title: 'Co+work最終報告会', hasClasses: false, type: 'event' },
    { date: '2027-02-02', endDate: '2027-02-08', title: '後期試験期間（学年末試験）', hasClasses: false, type: 'exam' },
    { date: '2027-03-01', endDate: '2027-03-31', title: '学年末休業', hasClasses: false, type: 'vacation' }
  ]
};

const FALLBACK_EXAM = {
  meta: {
    title: '令和8年度学年末試験（後期期末試験）時間割',
    term: '後期',
    status: 'scheduled',
    noticeText: '定期試験時間割は、試験開始10日前の正午にこちらで発表します。',
    selfStudyRule: '試験は2限から開始しますが、9時に登校し自習することを原則とします。JRの遅延などが生じた場合、9時に登校していることを前提として対応します。',
    sourceUrl: 'https://www.akashi.ac.jp/life/examtimetable.html',
    sourcePdfUrl: '',
    notesPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/syotyuiR70522.pdf',
    previousExamPdfUrl: 'https://www.akashi.ac.jp/o7en060000000car-att/R8zenkishiken0728.pdf',
    examStartDate: '2027-02-02',
    examEndDate: '2027-02-08'
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
    dormitoryPdfUrl: 'https://www.akashi.ac.jp/news/biub2r0000001vxh-att/menyu.pdf',
    isTextExtracted: false,
    month: 11,
    fiscalYear: 2026
  },
  weeklyMenus: []
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
let onboardingDismissed = false;
let firstVisitSpotlightDismissed = false;
let forceSpotlightReplay = false;
let spotlightStep = 0;
let activeHelpTab = 'home';
let draftProfile = null;
let calendarSearchQuery = '';
let calendarHidePast = false;
let calendarViewMode = 'month';
let calendarMonthOffset = 0;
let calendarSelectedDate = '';
let selectedAllergenFilter = '';
let myLinksManageMode = false;
let linkModalMode = 'add';
let dragLinkId = '';
let lastLinksSnapshot = null;
let icalModalState = {
  source: 'timetable',
  includeLessons: true,
  mode: 'calendar',
  includeCalendarEvents: false,
  includeExams: true,
  period: 'kouki',
  year: 2026,
  month: 11
};

function getUrlHostname(url) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function renderFavicon(url, label = '') {
  const host = getUrlHostname(url);
  const initial = (String(label || host || 'L').trim().charAt(0) || 'L').toUpperCase();
  if (!host) {
    return `<span class="link-favicon" aria-hidden="true"><span class="link-favicon-fallback">${escapeHTML(initial)}</span></span>`;
  }
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  return `<span class="link-favicon has-img" aria-hidden="true"><img src="${escapeHTML(src)}" alt="" width="22" height="22" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.classList.remove('has-img');if(this.nextElementSibling)this.nextElementSibling.style.display='flex'"><span class="link-favicon-fallback" style="display:none">${escapeHTML(initial)}</span></span>`;
}

function computeAcademicLessonWeeks(cal = calendarData || FALLBACK_CALENDAR) {
  const map = new Map();
  if (!cal || typeof cal !== 'object') return map;
  const events = Array.isArray(cal.events) ? cal.events : [];
  const subs = Array.isArray(cal.daySubstitutions) ? cal.daySubstitutions : [];
  const subByDate = new Map();
  for (const s of subs) {
    if (!s?.date) continue;
    let eff = Number(s.effectiveDay);
    if (!(eff >= 1 && eff <= 5) && s.substituteDay) {
      const idx = DAYS.indexOf(String(s.substituteDay).replace(/曜日$/, ''));
      if (idx >= 0) eff = idx + 1;
    }
    if (eff >= 1 && eff <= 5) {
      subByDate.set(s.date, { effectiveDay: eff, note: s.note || s.reason || '' });
    }
  }

  const termDefs = [
    {
      key: 'zenki',
      name: '前期',
      start: cal.terms?.zenki?.classesStartDate || cal.terms?.zenki?.startDate || '2026-04-07',
      end: cal.terms?.zenki?.examStartDate || '2026-07-30',
      maxWeeks: Number(cal.terms?.zenki?.totalWeeks) || 15
    },
    {
      key: 'kouki',
      name: '後期',
      start: cal.terms?.kouki?.classesStartDate || cal.terms?.kouki?.startDate || '2026-09-24',
      end: cal.terms?.kouki?.examStartDate || '2027-02-02',
      maxWeeks: Number(cal.terms?.kouki?.totalWeeks) || 15
    }
  ];

  for (const term of termDefs) {
    const startDt = new Date(`${term.start}T00:00:00Z`);
    const endDt = new Date(`${term.end}T00:00:00Z`);
    if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) continue;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const cur = new Date(startDt.getTime());
    let guard = 0;
    while (cur < endDt && guard < 220) {
      const ds = cur.toISOString().slice(0, 10);
      const dow = cur.getUTCDay();
      const sub = subByDate.get(ds);
      const dayEvents = events.filter(ev => {
        const s = ev?.date || ev?.startDate || '';
        const e = ev?.endDate || s;
        return s && ds >= s && ds <= e;
      });
      const isSpare = dayEvents.some(ev => String(ev?.title || '').includes('予備日'));
      if (isSpare) {
        map.set(ds, { term: term.name, termKey: term.key, isSpare: true, isSubstituted: false, dayLabel: DAYS[dow - 1] || '', weekNum: 0 });
      } else if (sub) {
        counts[sub.effectiveDay] = Math.min(term.maxWeeks, counts[sub.effectiveDay] + 1);
        map.set(ds, {
          term: term.name,
          termKey: term.key,
          effectiveDay: sub.effectiveDay,
          dayLabel: DAYS[sub.effectiveDay - 1],
          weekNum: counts[sub.effectiveDay],
          isSubstituted: true,
          isSpare: false
        });
      } else if (dow >= 1 && dow <= 5) {
        const isNoClass = dayEvents.some(ev =>
          ev.hasClasses === false || ['holiday', 'vacation', 'break', 'exam'].includes(ev.type)
        );
        if (!isNoClass) {
          counts[dow] = Math.min(term.maxWeeks, counts[dow] + 1);
          map.set(ds, {
            term: term.name,
            termKey: term.key,
            effectiveDay: dow,
            dayLabel: DAYS[dow - 1],
            weekNum: counts[dow],
            isSubstituted: false,
            isSpare: false
          });
        }
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
      guard++;
    }
  }
  return map;
}

function expandRoomLegend(loc) {
  const raw = String(loc || '').trim();
  if (!raw) return '';
  const tokens = raw.split(/[・/\s]+/).filter(Boolean);
  const expanded = tokens.map(tok => activeRoomLegends[tok] ? `${tok}: ${activeRoomLegends[tok]}` : null).filter(Boolean);
  return expanded.length ? expanded.join(' / ') : raw;
}
function renderLocationTrigger(loc) {
  const raw = String(loc || '').trim();
  if (!raw) return '';
  const expanded = expandRoomLegend(raw);
  if (expanded === raw) {
    return `<span class="lesson-location">${icon('door')}${escapeHTML(raw)}</span>`;
  }
  return `<button type="button" class="lesson-location lesson-location-btn" data-room-raw="${escapeHTML(raw)}" data-room-full="${escapeHTML(expanded)}" title="${escapeHTML(expanded)}" aria-label="教室 ${escapeHTML(raw)} の正式名称を表示">${icon('door')}${escapeHTML(raw)}</button>`;
}
function renderRoomPopoverBox() {
  return `<div class="alert alert-info room-legend-popover" id="room-legend-popover" data-export-exclude role="status" aria-live="polite" hidden><span id="room-legend-popover-text"></span><button type="button" class="button subtle size-close-btn" id="room-legend-close" aria-label="教室情報を閉じる" style="min-height:26px;padding:0 8px;margin-left:auto;">${icon('close')}</button></div>`;
}

function getTimetablePdfUrl() {
  const lessonPage = timetableLinksData?.pages?.find(p => p.id === 'lesson');
  const term = timetableMeta?.term || '後期';
  const matched = lessonPage?.items?.find(i => i.term === term) || lessonPage?.items?.[0];
  return normalizeAkashiUrl(matched?.url || timetableMeta?.sourcePdfUrl, 'https://www.akashi.ac.jp/o7en060000000c2u-att/R8_koukijikanwari_20260924-2.pdf');
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

function studentPillBtn() {
  return `<button type="button" class="student-pill badge gray profile-switch-trigger" id="open-profile-switcher" aria-label="所属 ${escapeHTML(studentLabel())} を変更" title="学年・学科・コースを変更">${escapeHTML(studentShortLabel())} ▾</button>`;
}

function pageHelpBtn(page = 'home', spotlight = false) {
  return `<span class="page-help-wrap${spotlight ? ' is-spotlight-target' : ''}">
    <button type="button" class="button subtle page-help-btn${spotlight ? ' is-spotlight-target' : ''}" data-open-help="${escapeHTML(page)}" aria-label="${escapeHTML(names[page] || 'このページ')}の使い方">${icon('info')}使い方</button>
  </span>`;
}

function buildStudentFilterControls(selection, prefix = 'student', dataAttr = 'data-student') {
  const s = selection || studentSelection;
  const isAdvanced = Number(s.grade) >= 6;
  const options = (values, current) => values.map(([value, label]) => `<option value="${escapeHTML(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
  const field = (label, key, values, disabled = false, hintText = '') => `<label class="field">${label}<select id="${prefix}-${key}" ${dataAttr}="${key}" ${disabled ? 'disabled' : 'required'}>${options(values, s[key])}</select>${hintText ? `<small class="field-hint">${escapeHTML(hintText)}</small>` : ''}</label>`;
  const needsCourse = !isAdvanced && Number(s.grade) >= 4 && s.department === 'E';
  const gradeOptions = [
    [1, '1年'], [2, '2年'], [3, '3年'], [4, '4年'], [5, '5年'],
    [6, '専攻科1年 (専1)'], [7, '専攻科2年 (専2)']
  ];
  const deptOptions = isAdvanced
    ? ADVANCED_DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || d])
    : DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || `${d}科`]);
  return field('学年', 'grade', gradeOptions) +
    field(isAdvanced ? '専攻' : '学科', 'department', deptOptions) +
    field('クラス', 'classGroup', [1, 2, 3, 4].map(n => [n, `${n}組`]), isAdvanced || Number(s.grade) >= 3) +
    field('留学生区分', 'studentType', [['regular', '留学生でない'], ['international', '留学生']], isAdvanced) +
    field('コース（4・5年E科）', 'course', [['', '選択してください'], ['EJ', COURSE_LABELS.EJ], ['ED', COURSE_LABELS.ED]], isAdvanced || !needsCourse) +
    (!isAdvanced && Number(s.grade) === 1 ? field('芸術選択', 'arts', [['music', '音楽'], ['art', '美術']]) : '');
}

function renderProfileSwitcherModal() {
  return `<div class="data-preview-overlay profile-modal-overlay" id="profile-switcher-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="所属設定">
    <div class="data-preview-card profile-modal-card">
      <div class="data-preview-head">
        <h3>所属設定</h3>
        <button type="button" class="button size-close-btn" id="profile-modal-close" aria-label="閉じる" style="min-height:30px;padding:0 8px;">${icon('close')}</button>
      </div>
      <div class="data-preview-body">
        <div class="filters student-filters" id="profile-modal-fields"></div>
        <p class="selection-status" id="profile-modal-status" role="status" hidden></p>
      </div>
      <div class="data-preview-foot">
        <button type="button" class="button secondary" id="profile-modal-cancel">キャンセル</button>
        <button type="button" class="button" id="profile-modal-save">${icon('check')}適用</button>
      </div>
    </div>
  </div>`;
}

function themeToggleBtn() {
  const { iconName, label } = getThemeButtonMeta(currentTheme);
  return `<button id="theme-toggle" class="theme-toggle" type="button" data-theme-mode="${escapeHTML(currentTheme)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"><span class="theme-icon" data-icon="${iconName}">${icon(iconName)}</span></button>${isOfflineFallback ? '<span id="network-status-badge" class="badge yellow network-status-badge" title="内蔵フォールバックデータを表示中">オフライン表示</span>' : ''}`;
}

let batchLoadingDist = false;
let pendingDistFetches = 0;
let distRenderDirty = false;
function safeDistRender() {
  if (typeof document === 'undefined') { render(); return; }
  const openModal = getOpenModalEl();
  const activeEl = document.activeElement;
  const mainEl = document.getElementById('main');
  const editingInMain = Boolean(mainEl && activeEl && mainEl.contains?.(activeEl) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName));
  if (openModal || editingInMain) {
    distRenderDirty = true;
    return;
  }
  distRenderDirty = false;
  render();
}
function fetchDistJson(url, onSuccess) {
  try {
    const resPromise = fetch(url);
    if (!resPromise || typeof resPromise.then !== 'function') return;
    pendingDistFetches++;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pendingDistFetches = Math.max(0, pendingDistFetches - 1);
      if (!batchLoadingDist && pendingDistFetches === 0 && distRenderDirty) {
        safeDistRender();
      }
    };
    resPromise
      .then(r => {
        if (!r || !r.ok) {
          isOfflineFallback = true;
          distRenderDirty = true;
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          onSuccess(data);
          distRenderDirty = true;
        }
        finish();
      })
      .catch(() => {
        isOfflineFallback = true;
        distRenderDirty = true;
        finish();
      });
  } catch {
    isOfflineFallback = true;
    distRenderDirty = true;
  }
}

function loadDistData() {
  if (typeof fetch !== 'function') return;
  batchLoadingDist = true;
  distRenderDirty = false;
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
  batchLoadingDist = false;
  if (pendingDistFetches === 0 && distRenderDirty) {
    safeDistRender();
  }
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
    const syllabusYear = Number(timetableMeta?.fiscalYear) || 2026;
    return `https://syllabus.kosen-k.go.jp/Pages/PublicSubjects?school_id=27&department_id=${deptId}&year=${syllabusYear}&lang=ja`;
  }
  return 'https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja';
}

function getAcademicWeek(date = new Date()) {
  const { dateStr, month } = getJstParts(date);
  if (!dateStr) return { term: '後期', week: 1, label: '後期 第1週' };
  const zenkiStart = calendarData.terms?.zenki?.classesStartDate || calendarData.terms?.zenki?.startDate || '2026-04-06';
  const koukiStart = calendarData.terms?.kouki?.classesStartDate || calendarData.terms?.kouki?.startDate || '2026-09-24';
  const isKouki = dateStr >= koukiStart || month <= 3;
  const termName = isKouki ? '後期' : '前期';
  const startStr = isKouki ? koukiStart : zenkiStart;
  const startParts = getJstParts(new Date(`${startStr}T00:00:00+09:00`));
  const mondayOffset = (startParts.weekdayNum + 6) % 7;
  const weekOneMondayMs = new Date(`${startStr}T00:00:00+09:00`).getTime() - mondayOffset * 86400000;
  const currentMidnightMs = new Date(`${dateStr}T00:00:00+09:00`).getTime();
  const diffTime = currentMidnightMs - weekOneMondayMs;
  const diffDays = Number.isFinite(diffTime) ? Math.floor(diffTime / 86400000) : 0;
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
  const { dateStr: todayDateStr, weekdayNum: jsDay, hour: jstHour, minute: jstMinute } = getJstParts(currentDate);
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
      <button type="button" class="button subtle icon-btn" data-dash-offset="-1" aria-label="前日の時間割" aria-pressed="false">${icon('chevronLeft')}</button>
      <button type="button" class="button subtle ${dashboardOffsetDays === 0 ? 'active' : ''}" data-dash-offset="0" aria-pressed="${dashboardOffsetDays === 0 ? 'true' : 'false'}">今日</button>
      <button type="button" class="button subtle icon-btn" data-dash-offset="1" aria-label="翌日の時間割" aria-pressed="false">${icon('chevronRight')}</button>
    </div>
  `;

  const subBanner = isSubstituted ? `
    <div class="alert alert-warning day-sub-alert">
      <span class="badge blue">授業振替</span>
      <span><strong>${DAYS[effectiveDay - 1]}曜日</strong>の授業を実施（${escapeHTML(subReason)}）</span>
    </div>
  ` : '';

  const renderTodayShell = (badgesHtml, bodyHtml) => `
    <section class="panel today-schedule" id="today-schedule">
      <div class="panel-head">
        <h2>${icon('calendar')}今日の時間割</h2>
        ${badgesHtml ? `<div class="panel-head-meta">${badgesHtml}</div>` : ''}
        ${navControls}
      </div>
      ${subBanner}
      ${bodyHtml}
    </section>
  `;

  if (!isSubstituted && (effectiveDay === 0 || effectiveDay === 6 || holidayEv)) {
    const restLabel = holidayEv?.title || holidayEv?.name || '休業日';
    return renderTodayShell(
      `<span class="badge yellow">${escapeHTML(restLabel)}</span>`,
      `<div class="dashboard-rest-card">
        <p><strong>${escapeHTML(todayDateStr)}</strong> — ${escapeHTML(restLabel)}（授業予定なし）</p>
        <a class="button" href="#timetable">${icon('calendar')}週間時間割を見る</a>
      </div>`
    );
  }

  const examEv = !isSubstituted ? events.find(e =>
    e.type === 'exam' &&
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  ) : null;
  if (examEv) {
    const examLabel = examEv.title || examEv.name || '定期試験期間';
    return renderTodayShell(
      `<span class="badge red">${escapeHTML(examLabel)}</span>`,
      `<div class="dashboard-rest-card">
        <p><strong>${escapeHTML(todayDateStr)}</strong> — ${escapeHTML(examLabel)}</p>
        ${FEATURE_FLAGS.exam
          ? `<a class="button" href="#exam">${icon('document')}試験時間割を見る</a>`
          : `<a class="button" href="#calendar">${icon('calendar')}年間予定を見る</a>`}
      </div>`
    );
  }

  const dayIdx = effectiveDay - 1;
  const { grid, error: schedError } = selectedSchedule();
  if (schedError) {
    return renderTodayShell(
      '',
      `<div class="dashboard-empty-card">
        <p>${escapeHTML(schedError)}</p>
        <button type="button" class="button profile-switch-trigger" id="home-fix-profile-btn">${icon('edit')}所属を設定する</button>
      </div>`
    );
  }
  const dayLessons = grid[dayIdx] || [];
  const hasClasses = dayLessons.some(slot => slot.length > 0);

  if (!hasClasses) {
    return renderTodayShell(
      '',
      `<div class="dashboard-empty-card">
        <p>${escapeHTML(todayDateStr)} — 授業予定なし</p>
        <a class="button secondary" href="#timetable">${icon('calendar')}時間割を見る</a>
      </div>`
    );
  }

  const isLiveToday = dashboardOffsetDays === 0;
  const nowMinutes = jstHour * 60 + jstMinute;
  const toMinutes = hhmm => {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  let currentLessonKey = null;
  let nextLessonKey = null;
  let lastClassEndMin = -1;
  if (isLiveToday) {
    const scanIds = new Set();
    for (let pIdx = 0; pIdx < periods.length; pIdx++) {
      const slot = dayLessons[pIdx] || [];
      for (const l of slot) {
        const key = l.id || `${l.subjectName}-${l.period}`;
        if (scanIds.has(key)) continue;
        scanIds.add(key);
        const span = l.duration || 1;
        const startMin = toMinutes(periods[pIdx]?.[0]);
        const endMin = toMinutes(periods[Math.min(periods.length - 1, pIdx + span - 1)]?.[1] || periods[pIdx]?.[1]);
        if (endMin > lastClassEndMin) lastClassEndMin = endMin;
        if (!currentLessonKey && nowMinutes >= startMin && nowMinutes < endMin) {
          currentLessonKey = key;
        } else if (!nextLessonKey && nowMinutes < startMin) {
          nextLessonKey = key;
        }
      }
    }
  }
  const allDoneToday = isLiveToday && lastClassEndMin >= 0 && nowMinutes >= lastClassEndMin;

  const renderedLessonIds = new Set();
  const periodRows = periods.map((time, p) => {
    const cell = dayLessons[p] || [];
    if (cell.length === 0) {
      return `
        <div class="dashboard-period empty">
          <div class="period-meta"><span class="period-num">${p + 1}限</span><span class="period-time">${time[0]}〜${time[1]}</span></div>
          <div class="lesson-info"><span class="lesson-empty" aria-label="授業なし"></span></div>
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
      const key = l.id || `${l.subjectName}-${l.period}`;
      const span = l.duration || 1;
      const endPeriodIdx = Math.min(periods.length - 1, p + span - 1);
      const endTime = periods[endPeriodIdx]?.[1] || time[1];
      const startMin = toMinutes(time[0]);
      const endMin = toMinutes(endTime);
      const isCurrent = isLiveToday && currentLessonKey === key;
      const isNext = isLiveToday && !isCurrent && nextLessonKey === key;
      const liveBadge = isCurrent
        ? `<span class="badge red live-status-badge">授業中・残り${Math.max(1, endMin - nowMinutes)}分</span>`
        : (isNext ? `<span class="badge blue live-status-badge">次の授業・あと${Math.max(1, startMin - nowMinutes)}分</span>` : '');
      return `
        <div class="dashboard-period active${isCurrent ? ' is-current' : ''}${isNext ? ' is-next' : ''}">
          <div class="period-meta">
            <span class="period-num">${span > 1 ? `${p + 1}〜${p + span}限` : `${p + 1}限`}</span>
            <span class="period-time">${time[0]}〜${endTime}</span>
          </div>
          <div class="lesson-info">
            <div class="subject-title-row">
              <strong class="subject-title">${escapeHTML(l.subjectName)}</strong>
              ${liveBadge}
            </div>
            <div class="lesson-sub">
              ${l.location ? renderLocationTrigger(l.location) : ''}
              ${l.teacher ? `<span class="lesson-teacher">${escapeHTML(l.teacher)}</span>` : ''}
            </div>
            ${l.notes ? `<small class="lesson-notes">${escapeHTML(l.notes)}</small>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }).join('');

  return renderTodayShell(
    `${allDoneToday ? '<span class="badge gray">授業終了</span>' : ''}<span class="badge gray">${DAYS[dayIdx]}曜</span>`,
    `<div class="today-periods-list">
      ${periodRows}
    </div>
    ${renderRoomPopoverBox()}
    <div class="panel-footer panel-footer-split">
      <span class="schedule-disclaimer">各授業の振り替え情報は<a href="${escapeHTML(MS365_PORTAL_URL)}" target="_blank" rel="noopener noreferrer">授業変更リスト ↗</a>をご確認ください。</span>
      <a class="text-link" href="#timetable">週間時間割へ${icon('arrow')}</a>
    </div>`
  );
}

function getExamCountdownInfo() {
  const { dateStr: todayStr } = getJstParts(new Date());
  const meta = examData?.meta || {};
  let startStr = meta.examStartDate || '';
  let endStr = meta.examEndDate || '';
  let title = meta.title || '定期試験';
  if (!startStr || (endStr && endStr < todayStr) || (!endStr && startStr < todayStr)) {
    const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
    const nextExam = [...events]
      .filter(e => e && e.type === 'exam' && (e.endDate || e.date || '') >= todayStr)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))[0];
    if (nextExam?.date) {
      startStr = nextExam.date;
      endStr = nextExam.endDate || nextExam.date;
      title = nextExam.title || nextExam.name || title;
    }
  }
  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return null;
  const startMs = new Date(`${startStr}T00:00:00Z`).getTime();
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const daysUntil = Math.round((startMs - todayMs) / 86400000);
  const inExam = todayStr >= startStr && (!endStr || todayStr <= endStr);
  return { startStr, endStr, title, daysUntil, inExam };
}

function renderExamCountdownBar() {
  const info = getExamCountdownInfo();
  if (!info) return '';
  if (info.inExam) {
    return `<div class="exam-countdown-bar"><span class="badge red">試験実施中</span><span class="hint" style="margin:0;">${escapeHTML(info.startStr)}${info.endStr && info.endStr !== info.startStr ? `〜${escapeHTML(info.endStr)}` : ''}</span></div>`;
  }
  if (info.daysUntil >= 0) {
    return `<div class="exam-countdown-bar"><span class="badge blue">試験開始まであと ${info.daysUntil}日</span><span class="hint" style="margin:0;">${escapeHTML(info.startStr)}${info.endStr ? `〜${escapeHTML(info.endStr.slice(5))}` : ''}</span></div>`;
  }
  return '';
}

function renderExamAlert() {
  const meta = examData?.meta || {};
  const isPublished = meta.status === 'published';
  const info = getExamCountdownInfo();
  const nearOrPublished = isPublished || Boolean(info && (info.inExam || info.daysUntil <= 14));
  const noticeText = isPublished
    ? '定期試験時間割が公開されています。科目・教室・監督を確認してください。'
    : (nearOrPublished
      ? (meta.noticeText || '定期試験時間割は、試験開始10日前の正午に発表します。')
      : '発表は開始10日前の正午です（9時登校・2限開始）。');
  const selfStudyRule = nearOrPublished
    ? (meta.selfStudyRule || '試験は2限から開始しますが、9時に登校し自習することを原則とします。')
    : '';
  const showSeparateRule = Boolean(selfStudyRule && !noticeText.includes('9時に登校'));
  return `
    <section class="panel exam-alert" id="exam-alert">
      <div class="panel-head">
        <h2>${icon('document')}定期試験</h2>
        ${isPublished ? '<span class="badge green">公開中</span>' : ''}
      </div>
      <div class="exam-alert-body">
        ${renderExamCountdownBar()}
        <p class="exam-notice">${escapeHTML(noticeText)}</p>
        ${showSeparateRule ? `<p class="exam-rules"><small>${escapeHTML(selfStudyRule)}</small></p>` : ''}
      </div>
      <div class="panel-footer">
        <a class="text-link" href="#exam">試験詳細${icon('arrow')}</a>
      </div>
    </section>
  `;
}

function renderCafeteriaSummary(currentDate) {
  const { dateStr: todayDateStr, weekdayNum } = getJstParts(currentDate);
  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const holidayEv = events.find(e =>
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) &&
    e.type !== 'exam' &&
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  );
  const isWeekend = weekdayNum === 0 || weekdayNum === 6;
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

  const isTextExtracted = Boolean(cafeteriaData?.meta?.isTextExtracted);
  const hasSourceKey = Object.prototype.hasOwnProperty.call(cafeteriaData?.meta || {}, 'sourcePdfUrl');
  const rawSourcePdfUrl = hasSourceKey ? cafeteriaData?.meta?.sourcePdfUrl : FALLBACK_CAFETERIA.meta?.sourcePdfUrl;
  const sourcePdfUrl = normalizeAkashiUrl(rawSourcePdfUrl, '');
  const articleUrl = normalizeAkashiUrl(cafeteriaData?.meta?.articleUrl, '');

  let contentHtml = '';
  if (isTextExtracted && todayMenu && todayMenu.isOpen) {
    const lunchAName = todayMenu.lunchA?.name || '';
    const lunchAPrice = todayMenu.lunchA?.price ? `${todayMenu.lunchA.price}円` : '';
    const lunchBName = todayMenu.lunchB?.name || '';
    const lunchBPrice = todayMenu.lunchB?.price ? `${todayMenu.lunchB.price}円` : '';
    const allergensStr = Array.isArray(todayMenu.allergens)
      ? todayMenu.allergens.join('・')
      : (todayMenu.allergens || (Array.isArray(todayMenu.lunchA?.allergens) ? todayMenu.lunchA.allergens.join('・') : (todayMenu.lunchA?.allergens || '')));

    contentHtml = `
      <div class="cafeteria-today-dishes">
        ${todayMenu.notice ? `<p class="cafeteria-day-notice">${escapeHTML(todayMenu.notice)}</p>` : ''}
        ${lunchAName ? `
          <div class="dish-item primary-dish">
            <span class="dish-badge">Aランチ</span>
            <strong class="dish-name">${escapeHTML(lunchAName)}</strong>
            ${lunchAPrice ? `<span class="dish-price">${escapeHTML(lunchAPrice)}</span>` : ''}
          </div>
        ` : ''}
        ${lunchBName ? `
          <div class="dish-item">
            <span class="dish-badge">Bランチ</span>
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
        ${todayMenu.bowl ? `
          <div class="dish-item bowl-dish">
            <span class="dish-badge">丼</span>
            <span class="dish-name">${escapeHTML(todayMenu.bowl.name)}</span>
            ${todayMenu.bowl.price ? `<span class="dish-price">${escapeHTML(todayMenu.bowl.price)}円</span>` : ''}
          </div>
        ` : ''}
        ${allergensStr ? `<p class="allergens-note"><small>アレルゲン: ${escapeHTML(allergensStr)}</small></p>` : ''}
      </div>
    `;
  } else if (isWeekend || holidayEv || (todayMenu && todayMenu.isOpen === false)) {
    const reason = todayMenu?.closedReason || todayMenu?.notice || holidayEv?.title || holidayEv?.name || '土日・休業日';
    contentHtml = `
      <div class="cafeteria-fallback-info">
        <p>休業（${escapeHTML(reason)}）</p>
        <p class="cafeteria-times"><small>営業時間: 平日 11:30〜13:30</small></p>
      </div>
    `;
  } else if (!isTextExtracted) {
    contentHtml = `
      <div class="cafeteria-fallback-info">
        <p>日替わり献立は公式PDFをご確認ください。</p>
        ${(sourcePdfUrl || articleUrl) ? `<div class="cafeteria-summary-actions">
          ${sourcePdfUrl ? `<a class="button secondary" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}今月の献立PDF</a>` : ''}
          ${articleUrl ? `<a class="text-link" href="${escapeHTML(articleUrl)}" target="_blank" rel="noopener noreferrer">公式案内${icon('arrow')}</a>` : ''}
        </div>` : ''}
        <p class="cafeteria-times"><small>営業時間: 平日 11:30〜13:30</small></p>
      </div>
    `;
  } else {
    const allDates = (cafeteriaData?.weeklyMenus || [])
      .flatMap(w => (Array.isArray(w?.days) ? w.days : []))
      .map(d => d?.date)
      .filter(Boolean)
      .sort();
    const rangeNote = allDates.length >= 2
      ? `（掲載期間: ${allDates[0].slice(5).replace('-', '/')}〜${allDates[allDates.length - 1].slice(5).replace('-', '/')}）`
      : '';
    contentHtml = `
      <div class="cafeteria-fallback-info">
        <p>本日の献立は未掲載です${escapeHTML(rangeNote)}。</p>
        ${(sourcePdfUrl || articleUrl) ? `<div class="cafeteria-summary-actions">
          ${sourcePdfUrl ? `<a class="button secondary" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}公式献立PDF</a>` : ''}
          ${articleUrl ? `<a class="text-link" href="${escapeHTML(articleUrl)}" target="_blank" rel="noopener noreferrer">公式案内${icon('arrow')}</a>` : ''}
        </div>` : ''}
        <p class="cafeteria-times"><small>営業時間: 平日 11:30〜13:30</small></p>
      </div>
    `;
  }

  return `
    <section class="panel cafeteria-summary" id="cafeteria-summary">
      <div class="panel-head">
        <h2>${icon('utensils')}学生食堂</h2>
      </div>
      ${contentHtml}
      <div class="panel-footer">
        <a class="text-link" href="#cafeteria">食堂メニューへ${icon('arrow')}</a>
      </div>
    </section>
  `;
}

const DEFAULT_LINKS = [
  { id: 'default:syllabus', name: 'シラバス', dynamicSyllabus: true, brand: 'syllabus', brandIcon: 'book' },
  { id: 'default:henkou', name: '授業変更リスト', url: MS365_PORTAL_URL, brand: 'henkou', brandIcon: 'clipboardList' },
  { id: 'default:teams', name: 'Teams', url: 'https://teams.microsoft.com/v2/' },
  { id: 'default:classroom', name: 'Classroom', url: 'https://classroom.google.com/u/0/h' },
  { id: 'default:webclass', name: 'WebClass', url: 'https://webclass.kosen-k.go.jp/webclass/login.php?auth_mode=SAML', brand: 'webclass', brandIcon: 'lmsScreen' },
  { id: 'default:physics', name: '物理', fullName: '物理（1・2年）', url: 'https://sites.google.com/s.akashi.ac.jp/physics', brand: 'physics', brandIcon: 'atom', maxGrade: 2 },
  { id: 'default:opac', name: '図書館OPAC', url: 'https://libopac-c.kosen-k.go.jp/webopac29/cattab.do', brand: 'opac', brandIcon: 'libraryBooks' },
  { id: 'default:jr', name: 'JR神戸線', fullName: 'JR神戸線 列車走行位置（魚住駅）', url: 'https://www.train-guide.westjr.co.jp/kobesanyo.html?st=0444', brand: 'jr', brandIcon: 'train' },
  { id: 'default:sanyo', name: '山陽電車', fullName: '山陽電車 遅延証明書', url: 'https://www.sanyo-railway.co.jp/railway/delay/index.html' },
];
const DEFAULT_LINK_IDS = new Set(DEFAULT_LINKS.map(d => d.id));

function isValidHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

function sanitizeCustomLinksArray(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.id || '').trim();
    const name = String(item.name || '').trim();
    const url = String(item.url || '').trim();
    if (!id || !name || !isValidHttpUrl(url) || DEFAULT_LINK_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...item, id, name, url, custom: true });
  }
  return out;
}

function emptyLinksState() {
  return { custom: [], order: [], hidden: [], overrides: {}, iconOnly: false };
}

function cloneLinksState(state) {
  const s = state || emptyLinksState();
  const overrides = {};
  for (const [k, v] of Object.entries(s.overrides || {})) {
    if (v && typeof v === 'object') overrides[k] = { ...v };
  }
  return {
    custom: (s.custom || []).map(x => ({ ...x })),
    order: [...(s.order || [])],
    hidden: [...(s.hidden || [])],
    overrides,
    iconOnly: Boolean(s.iconOnly),
  };
}

function loadLinksState() {
  try {
    const raw = localStorage.getItem('campus-links-v1');
    if (!raw) return emptyLinksState();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        custom: sanitizeCustomLinksArray(parsed),
        order: [],
        hidden: [],
        overrides: {},
        iconOnly: false,
      };
    }
    if (parsed && typeof parsed === 'object') {
      const custom = sanitizeCustomLinksArray(parsed.custom);
      const order = Array.isArray(parsed.order)
        ? parsed.order.filter(id => typeof id === 'string' && id.trim().length > 0)
        : [];
      const hidden = Array.isArray(parsed.hidden)
        ? Array.from(new Set(parsed.hidden.filter(id => DEFAULT_LINK_IDS.has(id))))
        : [];
      const overrides = {};
      if (parsed.overrides && typeof parsed.overrides === 'object' && !Array.isArray(parsed.overrides)) {
        for (const [id, ov] of Object.entries(parsed.overrides)) {
          if (!DEFAULT_LINK_IDS.has(id) || !ov || typeof ov !== 'object') continue;
          const clean = {};
          if (typeof ov.name === 'string' && ov.name.trim()) clean.name = ov.name.trim();
          if (typeof ov.url === 'string' && isValidHttpUrl(ov.url)) clean.url = ov.url.trim();
          if (Object.keys(clean).length > 0) overrides[id] = clean;
        }
      }
      return {
        custom,
        order,
        hidden,
        overrides,
        iconOnly: Boolean(parsed.iconOnly),
      };
    }
    return emptyLinksState();
  } catch {
    return emptyLinksState();
  }
}

function saveLinksState(state) {
  try {
    const s = state || emptyLinksState();
    const custom = Array.isArray(s.custom) ? s.custom : [];
    const order = Array.isArray(s.order) ? s.order : [];
    const hidden = Array.isArray(s.hidden) ? s.hidden : [];
    const overrides = (s.overrides && typeof s.overrides === 'object') ? s.overrides : {};
    const iconOnly = Boolean(s.iconOnly);
    const isMinimalArray = hidden.length === 0 && order.length === 0 && Object.keys(overrides).length === 0 && !iconOnly;
    const payload = isMinimalArray
      ? custom
      : { version: 2, custom, order, hidden, overrides, iconOnly };
    localStorage.setItem('campus-links-v1', JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function isLinksCustomized(state = loadLinksState()) {
  return (state.hidden?.length || 0) > 0
    || (state.order?.length || 0) > 0
    || Object.keys(state.overrides || {}).length > 0;
}

function getResolvedLinks(selection = studentSelection, state = loadLinksState()) {
  const hiddenSet = new Set(state.hidden || []);
  const overrides = state.overrides || {};
  const gradeNum = Number(selection?.grade ?? studentSelection?.grade ?? 1);
  const dynamicSyllabusUrl = getSyllabusUrl(selection);
  const canonical = [];
  const byId = new Map();

  for (const def of DEFAULT_LINKS) {
    if (hiddenSet.has(def.id)) continue;
    if (def.maxGrade && gradeNum > def.maxGrade) continue;
    const ov = overrides[def.id] || {};
    const resolvedUrl = def.dynamicSyllabus
      ? (ov.url || dynamicSyllabusUrl)
      : (ov.url || def.url);
    const resolvedName = ov.name || def.name;
    const resolvedFullName = def.dynamicSyllabus
      ? (ov.name ? resolvedName : `シラバス（${studentShortLabel()}）`)
      : (ov.name ? resolvedName : (def.fullName || def.name));
    const item = {
      id: def.id,
      name: resolvedName,
      fullName: resolvedFullName,
      url: resolvedUrl,
      isDefault: true,
      isSyllabus: Boolean(def.dynamicSyllabus),
      usesDynamicSyllabusUrl: Boolean(def.dynamicSyllabus && !ov.url),
      brand: !ov.url ? (def.brand || '') : '',
      brandIcon: !ov.url ? (def.brandIcon || '') : '',
      custom: false,
    };
    canonical.push(item);
    byId.set(item.id, item);
  }

  for (const c of (state.custom || [])) {
    if (!c || !c.id || byId.has(c.id) || !isValidHttpUrl(c.url)) continue;
    const item = {
      ...c,
      fullName: c.name,
      isDefault: false,
      isSyllabus: false,
      usesDynamicSyllabusUrl: false,
      custom: true,
    };
    canonical.push(item);
    byId.set(item.id, item);
  }

  if (!Array.isArray(state.order) || state.order.length === 0) {
    return canonical;
  }

  const ordered = [];
  const used = new Set();
  for (const id of state.order) {
    if (byId.has(id) && !used.has(id)) {
      ordered.push(byId.get(id));
      used.add(id);
    }
  }
  for (const item of canonical) {
    if (!used.has(item.id)) {
      ordered.push(item);
      used.add(item.id);
    }
  }
  return ordered;
}

function getCanonicalIds(state, selection = studentSelection) {
  const hiddenSet = new Set(state.hidden || []);
  const gradeNum = Number(selection?.grade ?? studentSelection?.grade ?? 1);
  const defIds = DEFAULT_LINKS.filter(d => !hiddenSet.has(d.id) && (!d.maxGrade || gradeNum <= d.maxGrade)).map(d => d.id);
  const customIds = (state.custom || []).map(c => c.id);
  return [...defIds, ...customIds];
}

function normalizeOrderField(state, ids) {
  const canonical = getCanonicalIds(state);
  const same = ids.length === canonical.length && ids.every((id, i) => id === canonical[i]);
  state.order = same ? [] : ids;
}

function loadMyLinks() {
  return loadLinksState().custom;
}

function saveMyLinks(links) {
  const state = loadLinksState();
  state.custom = Array.isArray(links) ? links : [];
  if (state.order.length > 0) {
    const validIds = new Set([...DEFAULT_LINK_IDS, ...state.custom.map(c => c.id)]);
    state.order = state.order.filter(id => validIds.has(id));
    normalizeOrderField(state, state.order);
  }
  return saveLinksState(state);
}

function normalizeLinkUrl(u) {
  return String(u || '').trim().replace(/\/+$/, '').toLowerCase();
}
let myLinkSeq = 0;
let editingMyLinkId = '';
let lastDeletedMyLink = null;
let toastTimer = null;

function validateMyLinkInput(link) {
  if (!link || typeof link !== 'object') return { valid: false, error: '無効なリンクデータです。' };
  const name = String(link.name || '').trim();
  const url = String(link.url || '').trim();
  if (!name || !url) return { valid: false, error: '表示名とURLを両方入力してください。' };
  if (!/^https?:\/\//i.test(url)) return { valid: false, error: 'URLは http:// または https:// で入力してください。' };
  if (typeof URL === 'function') {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname) return { valid: false, error: '有効なURL（例: https://example.com）を入力してください。' };
    } catch {
      return { valid: false, error: '有効なURL（例: https://example.com）を入力してください。' };
    }
  } else if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
    return { valid: false, error: '有効なURL（例: https://example.com）を入力してください。' };
  }
  return { valid: true, name, url };
}

function persistLinksState(state) {
  try {
    const saved = saveLinksState(state);
    if (saved === false || (saved && saved.success === false)) {
      return { success: false, error: (saved && saved.error) || 'リンクを保存できませんでした。' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'ストレージ容量の上限に達しました。' };
  }
}

function addMyLink(link) {
  const v = validateMyLinkInput(link);
  if (!v.valid) return { success: false, error: v.error };
  const state = loadLinksState();
  const resolved = getResolvedLinks(studentSelection, state);
  if (!link.id && resolved.some(l => normalizeLinkUrl(l.url) === normalizeLinkUrl(v.url))) {
    return { success: false, error: 'このURLはすでに登録されています。' };
  }
  const newItem = { id: link.id || `custom-${Date.now()}-${++myLinkSeq}`, name: v.name, url: v.url, custom: true };
  state.custom.push(newItem);
  if (state.order.length > 0) {
    state.order.push(newItem.id);
    normalizeOrderField(state, state.order);
  }
  const persisted = persistLinksState(state);
  if (!persisted.success) return persisted;
  return { success: true, item: newItem };
}
const addCustomLink = addMyLink;

function updateMyLink(id, link) {
  if (!id) return { success: false, error: '対象のリンクIDが見つかりません。' };
  const state = loadLinksState();
  const isDef = DEFAULT_LINK_IDS.has(id);
  const defItem = isDef ? DEFAULT_LINKS.find(d => d.id === id) : null;
  const candidateUrl = (defItem?.dynamicSyllabus && !String(link?.url || '').trim())
    ? getSyllabusUrl(studentSelection)
    : link?.url;
  const v = validateMyLinkInput({ name: link?.name, url: candidateUrl });
  if (!v.valid) return { success: false, error: v.error };

  const resolved = getResolvedLinks(studentSelection, state);
  if (resolved.some(l => l.id !== id && normalizeLinkUrl(l.url) === normalizeLinkUrl(v.url))) {
    return { success: false, error: 'このURLはすでに登録されています。' };
  }

  if (isDef && defItem) {
    const ov = {};
    if (v.name !== defItem.name) ov.name = v.name;
    const defaultUrl = defItem.dynamicSyllabus ? getSyllabusUrl(studentSelection) : defItem.url;
    if (normalizeLinkUrl(v.url) !== normalizeLinkUrl(defaultUrl)) ov.url = v.url;
    if (Object.keys(ov).length > 0) state.overrides[id] = ov;
    else delete state.overrides[id];
    const persisted = persistLinksState(state);
    if (!persisted.success) return persisted;
    return { success: true, item: { id, name: v.name, url: v.url, isDefault: true } };
  }

  const idx = state.custom.findIndex(l => l.id === id);
  if (idx === -1) return { success: false, error: '対象のマイリンクが見つかりませんでした。' };
  state.custom[idx] = { ...state.custom[idx], name: v.name, url: v.url };
  const persisted = persistLinksState(state);
  if (!persisted.success) return persisted;
  return { success: true, item: state.custom[idx], links: state.custom };
}

function moveUnifiedLink(id, direction) {
  const state = loadLinksState();
  const resolved = getResolvedLinks(studentSelection, state);
  const idx = resolved.findIndex(l => l.id === id);
  if (idx === -1) return state.custom;
  const delta = (direction === 'up' || direction === -1) ? -1 : ((direction === 'down' || direction === 1) ? 1 : 0);
  const nextIdx = idx + delta;
  if (delta === 0 || nextIdx < 0 || nextIdx >= resolved.length) return state.custom;

  const a = resolved[idx];
  const b = resolved[nextIdx];
  if (state.order.length === 0 && a.custom && b.custom) {
    const ciA = state.custom.findIndex(c => c.id === a.id);
    const ciB = state.custom.findIndex(c => c.id === b.id);
    if (ciA !== -1 && ciB !== -1) {
      [state.custom[ciA], state.custom[ciB]] = [state.custom[ciB], state.custom[ciA]];
      saveLinksState(state);
      return state.custom;
    }
  }
  const ids = resolved.map(x => x.id);
  [ids[idx], ids[nextIdx]] = [ids[nextIdx], ids[idx]];
  normalizeOrderField(state, ids);
  saveLinksState(state);
  return state.custom;
}

function reorderUnifiedLinkByDrop(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return false;
  const state = loadLinksState();
  const ids = getResolvedLinks(studentSelection, state).map(x => x.id);
  const fromIdx = ids.indexOf(fromId);
  const toIdx = ids.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1) return false;
  const [moved] = ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, moved);
  normalizeOrderField(state, ids);
  return saveLinksState(state);
}

function reorderMyLink(id, direction) {
  return moveUnifiedLink(id, direction);
}

function deleteMyLink(id) {
  const state = loadLinksState();
  state.custom = state.custom.filter(l => l.id !== id);
  if (state.order.length > 0) {
    state.order = state.order.filter(x => x !== id);
    normalizeOrderField(state, state.order);
  }
  saveLinksState(state);
  return state.custom;
}
const removeMyLink = deleteMyLink;

function hideDefaultLink(id) {
  if (!DEFAULT_LINK_IDS.has(id)) return false;
  const state = loadLinksState();
  if (!state.hidden.includes(id)) state.hidden.push(id);
  if (state.order.length > 0) {
    state.order = state.order.filter(x => x !== id);
    normalizeOrderField(state, state.order);
  }
  return saveLinksState(state);
}

function restoreDefaultLinks() {
  const state = loadLinksState();
  state.hidden = [];
  state.overrides = {};
  state.order = [];
  return saveLinksState(state);
}

function toggleLinksIconOnly() {
  const state = loadLinksState();
  state.iconOnly = !state.iconOnly;
  saveLinksState(state);
  return state.iconOnly;
}

function restoreMyLink(item, index = 0) {
  if (!item || typeof item !== 'object' || !item.id) return loadMyLinks();
  const state = loadLinksState();
  if (state.custom.some(l => l.id === item.id)) return state.custom;
  const insertAt = Math.max(0, Math.min(state.custom.length, Number.isFinite(index) ? index : state.custom.length));
  state.custom.splice(insertAt, 0, { ...item });
  persistLinksState(state);
  return state.custom;
}

function showToast(message, options = {}) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const body = document.body;
  if (!body || typeof body.append !== 'function') return;
  let toast = document.getElementById('portal-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'portal-toast';
    toast.className = 'toast';
    toast.setAttribute?.('role', 'status');
    toast.setAttribute?.('aria-live', 'polite');
    body.append(toast);
  }
  while (toast.firstChild && typeof toast.removeChild === 'function') {
    toast.removeChild(toast.firstChild);
  }
  toast.textContent = '';
  const msgSpan = document.createElement('span');
  msgSpan.textContent = String(message || '');
  toast.append?.(msgSpan);
  if (options.undoLabel && typeof options.onUndo === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast-action';
    actionBtn.textContent = options.undoLabel;
    actionBtn.addEventListener?.('click', () => {
      if (toastTimer && typeof clearTimeout === 'function') {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      toast.hidden = true;
      options.onUndo();
    });
    toast.append?.(actionBtn);
  }
  toast.hidden = false;
  if (toastTimer && typeof clearTimeout === 'function') {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (typeof setTimeout === 'function') {
    const duration = Number(options.duration) > 0 ? Number(options.duration) : 4500;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      toastTimer = null;
    }, duration);
  }
}

function renderDialVisual(item) {
  if (item.brandIcon) {
    return icon(item.brandIcon);
  }
  return renderFavicon(item.url, item.name);
}

function renderSpeedDialGrid(items, { editable = false, includeAdd = false, iconOnly = false } = {}) {
  const cls = ['speed-dial-grid'];
  if (iconOnly && !editable) cls.push('is-icon-only');
  if (editable) cls.push('is-edit');

  const cells = items.map((item, idx) => {
    const tip = item.fullName || item.name;
    const labelCls = (iconOnly && !editable) ? 'dial-label sr-only' : 'dial-label';
    const sylAttr = item.isSyllabus ? ' data-syllabus="1"' : '';
    const brandAttr = item.brand ? ` data-brand="${escapeHTML(item.brand)}"` : '';
    if (!editable) {
      return `<div class="dial-cell">
        <a class="link-tile"${sylAttr}${brandAttr} href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(tip)}" aria-label="${escapeHTML(tip)}（新しいタブで開く）">
          <span class="dial-icon">${renderDialVisual(item)}</span>
          <span class="${labelCls}">${escapeHTML(item.name)}</span>
        </a>
      </div>`;
    }
    const removeBtn = item.custom
      ? `<button type="button" class="dial-remove-btn mylink-remove-btn" data-remove-id="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}を削除" title="削除">${icon('close')}</button>`
      : `<button type="button" class="dial-remove-btn link-hide-btn" data-hide-id="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}を非表示" title="非表示にする">${icon('close')}</button>`;
    return `<div class="dial-cell" draggable="true" data-drag-id="${escapeHTML(item.id)}">
      ${removeBtn}
      <button type="button" class="dial-tile-btn" data-edit-id="${escapeHTML(item.id)}"${sylAttr}${brandAttr} title="タップして編集" aria-label="${escapeHTML(item.name)}を編集">
        <span class="dial-icon">${renderDialVisual(item)}</span>
        <span class="dial-label">${escapeHTML(item.name)}</span>
      </button>
      <div class="dial-move-row">
        <button type="button" class="dial-move-btn mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="up" aria-label="${escapeHTML(item.name)}を前へ移動" ${idx === 0 ? 'disabled' : ''}>${icon('chevronLeft')}</button>
        <button type="button" class="dial-move-btn mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="down" aria-label="${escapeHTML(item.name)}を後ろへ移動" ${idx === items.length - 1 ? 'disabled' : ''}>${icon('chevronRight')}</button>
      </div>
    </div>`;
  }).join('');

  const addCell = includeAdd
    ? `<div class="dial-cell dial-cell-add">
        <button type="button" class="dial-tile-btn dial-tile-add" data-open-link-add="1" title="リンクを追加" aria-label="リンクを追加">
          <span class="dial-icon">${icon('plus')}</span>
          <span class="${(iconOnly && !editable) ? 'dial-label sr-only' : 'dial-label'}">追加</span>
        </button>
      </div>`
    : '';

  return `<div class="${cls.join(' ')}">${cells}${addCell}</div>`;
}

function renderQuickLinks() {
  const linksState = loadLinksState();
  const resolved = getResolvedLinks(studentSelection, linksState);
  const gridHtml = resolved.length
    ? renderSpeedDialGrid(resolved, { editable: false, includeAdd: false, iconOnly: linksState.iconOnly })
    : '<p class="empty-inline">リンクがありません。「編集」から追加できます。</p>';

  return `
    <section class="panel quick-links" id="quick-links">
      <div class="panel-head">
        <h2>${icon('link')}リンク</h2>
        <a class="text-link" href="#links">編集${icon('arrow')}</a>
      </div>
      ${gridHtml}
    </section>
  `;
}

function renderTodayOverview(currentDate = new Date()) {
  const sidePanels = [
    renderQuickLinks(),
    FEATURE_FLAGS.exam ? renderExamAlert() : '',
    FEATURE_FLAGS.cafeteria ? renderCafeteriaSummary(currentDate) : ''
  ].filter(Boolean).join('\n');
  return `
    <div class="dashboard-grid">
      <div class="dashboard-col-main">
        ${renderTodaySchedule(currentDate)}
      </div>
      <div class="dashboard-col-side">
        ${sidePanels}
      </div>
    </div>
  `;
}

function home() {
  const now = new Date();
  const targetDate = new Date(now.getTime() + dashboardOffsetDays * 86400000);
  const displayDateKey = dateKey(targetDate);
  const weekInfo = getAcademicWeek(targetDate);
  const showSpotlight = ((!cookieSaved && !firstVisitSpotlightDismissed) || forceSpotlightReplay) && spotlightStep === 1;
  const actions = `
    <div class="heading-actions">
      ${themeToggleBtn()}
      ${pageHelpBtn('home', showSpotlight)}
      <span class="term-badge badge blue">${escapeHTML(weekInfo.label)}</span>
      ${studentPillBtn()}
      <div class="date-block">
        <strong>${longDate(displayDateKey)}${dashboardOffsetDays === 0 ? '' : ` (${dashboardOffsetDays > 0 ? `+${dashboardOffsetDays}` : dashboardOffsetDays}日)`}</strong>
      </div>
    </div>
  `;
  const onboardingHtml = (!cookieSaved && !onboardingDismissed)
    ? `<div class="onboarding-banner" id="onboarding-banner" role="region" aria-label="初期設定">
        <div class="onboarding-body">
          <div class="onboarding-title">あなたの時間割・授業変更をすぐ表示</div>
          <p class="onboarding-sub">仮設定中：<strong>${escapeHTML(studentLabel())}</strong></p>
        </div>
        <div class="onboarding-actions">
          <button type="button" class="button profile-switch-trigger" id="onboarding-open-profile">${icon('edit')}所属を選ぶ</button>
          <button type="button" class="button subtle" id="onboarding-dismiss">あとで</button>
        </div>
      </div>`
    : '';

  return `
    ${heading('ホーム', '', actions)}
    ${onboardingHtml}
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
  const targetAdvDash = Number(selGrade) >= 6 ? `専${Number(selGrade) - 5}-${selDept}` : '';
  const targetAdvFlat = Number(selGrade) >= 6 ? `専${Number(selGrade) - 5}${selDept}` : '';

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
    else if (targetAdvDash && Array.isArray(raw[targetAdvDash])) list = raw[targetAdvDash];
    else if (targetAdvFlat && Array.isArray(raw[targetAdvFlat])) list = raw[targetAdvFlat];
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
    if (c && (c === targetClassDash || c === targetClassFlat || (targetAdvDash && (c === targetAdvDash || c === targetAdvFlat)))) return true;
    if (d && g && d === selDept && g === selGrade) return true;
    if (d && !g && d === selDept) return true;
    if (!d && g && g === selGrade) return true;
    return false;
  });
}

function exam() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${pageHelpBtn('exam')}${studentPillBtn()}</div>`;
  const meta = examData?.meta || FALLBACK_EXAM.meta || {};
  const isPublished = meta.status === 'published';
  const notice = meta.noticeText || '定期試験時間割は、試験開始10日前の正午にこちらで発表します。（10日前の正午発表）';
  const selfStudyRule = meta.selfStudyRule || '試験は2限から開始しますが、9時に登校し自習することを原則とします。';
  const showSeparateRule = selfStudyRule && !notice.includes('9時に登校');
  const sourcePdfUrl = normalizeAkashiUrl(meta.sourcePdfUrl, '');
  const notesPdfUrl = meta.notesPdfUrl ? normalizeAkashiUrl(meta.notesPdfUrl, '') : '';
  const prevPdfUrl = meta.previousExamPdfUrl === null ? '' : normalizeAkashiUrl(meta.previousExamPdfUrl, '');
  const returnPdfUrl = meta.returnPdfUrl ? normalizeAkashiUrl(meta.returnPdfUrl, '') : '';
  const isPrevReturnPdf = Boolean(returnPdfUrl && !isPublished && (/20260805|zenki/i.test(returnPdfUrl) || (meta.term === '後期' && !returnPdfUrl.includes('kouki'))));
  const deptCode = studentSelection.department || studentSelection.dept || 'M';
  const classCode = studentSelection.grade >= 6
    ? `専${studentSelection.grade - 5}${deptCode}`
    : ((studentSelection.grade >= 4 && deptCode === 'E' && studentSelection.course)
      ? `${studentSelection.grade}-${studentSelection.course}`
      : `${studentSelection.grade}-${deptCode}`);
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
    .map(p => `<span class="exam-period-item"><strong>${escapeHTML(p.id || p.label)}</strong> <span>${escapeHTML(p.start || '')}–${escapeHTML(p.end || '')}</span></span>`)
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
    : `<p class="empty-inline" data-class="${escapeHTML(classCode)}">${escapeHTML(studentLabel())} — ${isPublished ? '該当する試験はありません。' : '試験時間割は試験開始10日前の正午に公開されます。'}</p>`;

  return `${heading('定期試験', '', actions)}
    <section class="panel exam-panel">
      <div class="panel-head">
        <h2>${icon('document')}定期試験案内</h2>
        ${isPublished ? '<span class="badge green">公開中</span>' : ''}
      </div>
      ${renderExamCountdownBar()}
      <p class="exam-notice">${escapeHTML(notice)}</p>
      ${showSeparateRule ? `<p class="exam-rules"><small>${escapeHTML(selfStudyRule)}</small></p>` : ''}
      <div class="exam-period-strip" aria-label="試験時間帯一覧"><span class="strip-label">試験時間帯</span>${periodChipsHtml}</div>
      <div class="exam-links-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${isPublished && sourcePdfUrl ? `<a class="button" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">公式試験時間割PDF</a>` : ''}
        ${notesPdfUrl ? `<a class="button secondary" href="${escapeHTML(notesPdfUrl)}" target="_blank" rel="noopener noreferrer">受験上の諸注意PDF</a>` : ''}
        ${!isPublished && prevPdfUrl ? `<a class="button secondary" href="${escapeHTML(prevPdfUrl)}" target="_blank" rel="noopener noreferrer">前回試験時間割PDF（参考）</a>` : ''}
        ${returnPdfUrl ? `<a class="button secondary" href="${escapeHTML(returnPdfUrl)}" target="_blank" rel="noopener noreferrer">${isPrevReturnPdf ? '前期 答案返却時間割PDF（参考）' : '答案返却時間割PDF'}</a>` : ''}
        <a class="button secondary" href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener noreferrer">${icon('book')}${escapeHTML(studentShortLabel())} シラバス</a>
        <a class="text-link" href="https://www.akashi.ac.jp/life/examtimetable.html" target="_blank" rel="noopener noreferrer">公式試験日程${icon('arrow')}</a>
      </div>
    </section>
    <section class="panel exam-schedule" id="exam-schedule" data-status="${isPublished ? 'published' : 'unpublished'}">
      <div class="panel-head">
        <h2>${icon('calendar')}試験時間割（${escapeHTML(classCode)}）</h2>
        ${entries.length > 0 ? `<span class="badge" id="exam-count-badge" data-total="${entries.length}">${entries.length}件</span>` : ''}
      </div>
      <div class="exam-search-bar"${entries.length === 0 ? ' hidden' : ''}>
        <input type="search" id="exam-search-input" placeholder="科目名・教室・監督名で絞り込み..." aria-label="定期試験科目検索">
      </div>
      <div class="exam-timetable" id="exam-timetable">
        ${scheduleCards}
      </div>
      <p id="exam-search-empty" class="info-note" role="status" hidden>該当する試験科目はありません。</p>
    </section>`;
}
function examView() { return exam(); }

function renderMonthCalendarGrid(config = {}) {
  const {
    year,
    month,
    events = [],
    subs = [],
    todayStr = dateKey(new Date()),
    lessonWeeksMap = null,
    scheduleOverlay = null,
    navAttr = 'data-cal-month',
    viewId = 'calendar-month-view',
    selectable = false,
    selectedDate = ''
  } = config;
  const firstOfTarget = new Date(Date.UTC(year, month - 1, 1));
  const y = firstOfTarget.getUTCFullYear();
  const m = firstOfTarget.getUTCMonth() + 1;
  const monthPrefix = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = firstOfTarget.getUTCDay();
  const resolvedSelected = selectable
    ? (selectedDate && selectedDate.startsWith(monthPrefix)
        ? selectedDate
        : (todayStr.startsWith(monthPrefix) ? todayStr : `${monthPrefix}-01`))
    : '';
  let selectedDetailInfo = null;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-month-cell is-pad"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const dayEvents = events.filter(ev => {
      const s = ev.date || ev.startDate || '';
      const e = ev.endDate || s;
      return s && ds >= s && ds <= e;
    });
    const subDay = subs.find(s => s && s.date === ds);
    const weekInfo = lessonWeeksMap ? lessonWeeksMap.get(ds) : null;
    const weekTagHtml = weekInfo
      ? (weekInfo.isSpare
          ? '<span class="cal-month-week-tag is-spare" title="予備日">予備</span>'
          : `<span class="cal-month-week-tag${weekInfo.isSubstituted ? ' is-sub' : ''}" title="${escapeHTML(`${weekInfo.term} ${weekInfo.dayLabel}曜 第${weekInfo.weekNum}週${weekInfo.isSubstituted ? '（振替）' : ''}`)}">${escapeHTML(`${weekInfo.dayLabel}${weekInfo.weekNum}`)}</span>`)
      : '';

    const lessonPills = [];
    if (scheduleOverlay && Array.isArray(scheduleOverlay.lessons)) {
      const { lessons, mode, startDate, endDate, holidaySet, subMap } = scheduleOverlay;
      const inRange = (!startDate || ds >= startDate) && (!endDate || ds <= endDate);
      if (inRange) {
        let effDow = 0;
        if (mode === 'simple') {
          if (dow >= 1 && dow <= 5) effDow = dow;
        } else {
          const subEntry = subMap?.get(ds);
          if (subEntry) effDow = subEntry.effectiveDay;
          else if (dow >= 1 && dow <= 5 && !holidaySet?.has(ds)) effDow = dow;
        }
        if (effDow >= 1 && effDow <= 5) {
          const dayLessons = lessons.filter(l => l.dayOfWeek === effDow);
          for (const l of dayLessons.slice(0, 2)) {
            lessonPills.push(`<span class="cal-month-pill is-lesson" title="${escapeHTML(`${l.period}限 ${l.subjectName}`)}">${escapeHTML(l.subjectName)}</span>`);
          }
          if (dayLessons.length > 2) {
            lessonPills.push(`<span class="cal-month-more">+${dayLessons.length - 2}コマ</span>`);
          }
        }
      }
    }

    const eventDots = [];
    const eventPills = [
      ...dayEvents.slice(0, scheduleOverlay ? 1 : 2).map(ev => {
        const cls = ev.type === 'exam' ? 'is-exam' : ((ev.type === 'holiday' || ev.type === 'break' || ev.type === 'vacation' || ev.hasClasses === false) ? 'is-holiday' : 'is-event');
        eventDots.push(`<span class="cal-dot ${cls}"></span>`);
        return `<span class="cal-month-pill ${cls}" title="${escapeHTML(ev.title || ev.name || '')}">${escapeHTML(ev.title || ev.name || '')}</span>`;
      }),
      ...(subDay ? (() => {
        eventDots.push('<span class="cal-dot is-sub"></span>');
        return [`<span class="cal-month-pill is-sub">${escapeHTML(String(subDay.substituteDay || '月').replace(/曜日$/, ''))}曜授業</span>`];
      })() : [])
    ];
    const allPills = [...eventPills, ...lessonPills].slice(0, 4);
    const totalItems = dayEvents.length + (subDay ? 1 : 0) + lessonPills.length;
    const extraCount = Math.max(0, totalItems - allPills.length);
    const isHoliday = !subDay && dayEvents.some(e => e.type === 'holiday' || e.type === 'vacation' || e.type === 'break' || e.hasClasses === false);
    const isWeekend = dow === 0 || dow === 6;
    const isSelected = selectable && ds === resolvedSelected;
    if (isSelected) {
      selectedDetailInfo = { ds, dow, dayEvents, subDay, weekInfo, isHoliday, isWeekend };
    }
    const cellCls = [
      'cal-month-cell',
      ds === todayStr ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
      isHoliday ? 'is-holiday-cell is-rest' : (isWeekend ? 'is-weekend is-rest' : ''),
      dow === 0 ? 'is-sun' : (dow === 6 ? 'is-sat' : '')
    ].filter(Boolean).join(' ');

    const innerHtml = `
      <div class="cal-month-cell-head"><span class="cal-month-daynum">${d}</span>${weekTagHtml}</div>
      <div class="cal-month-dots" aria-hidden="true">${eventDots.slice(0, 3).join('')}</div>
      <div class="cal-month-pills">${allPills.join('')}${extraCount > 0 ? `<span class="cal-month-more">+${extraCount}</span>` : ''}</div>
    `;
    if (selectable) {
      cells.push(`<button type="button" class="${cellCls}" data-date="${ds}" data-cal-select="${ds}" aria-pressed="${isSelected ? 'true' : 'false'}">${innerHtml}</button>`);
    } else {
      cells.push(`<div class="${cellCls}" data-date="${ds}">${innerHtml}</div>`);
    }
  }

  let mobileDetailHtml = '';
  if (selectable && selectedDetailInfo) {
    const { ds, dow, dayEvents, subDay, weekInfo, isHoliday, isWeekend } = selectedDetailInfo;
    const dowName = ['日', '月', '火', '水', '木', '金', '土'][dow] || '';
    const detailItems = [];
    for (const ev of dayEvents) {
      detailItems.push(`<span class="badge ${ev.type === 'exam' ? 'red' : (ev.hasClasses === false || ['holiday', 'break', 'vacation'].includes(ev.type) ? 'yellow' : 'blue')}">${escapeHTML(ev.title || ev.name || '行事')}</span>`);
    }
    if (subDay) {
      const sDay = String(subDay.substituteDay || '月').replace(/曜日$/, '');
      detailItems.push(`<span class="badge blue">${escapeHTML(`${sDay}曜日授業を実施`)}${subDay.note ? `（${escapeHTML(subDay.note)}）` : ''}</span>`);
    }
    const weekText = weekInfo
      ? (weekInfo.isSpare ? '予備日' : `${weekInfo.term} ${weekInfo.dayLabel}曜 第${weekInfo.weekNum}週${weekInfo.isSubstituted ? '（振替）' : ''}`)
      : (isHoliday ? '休業日' : (isWeekend ? '週末・休業日' : '授業日外'));
    mobileDetailHtml = `<div class="cal-mobile-detail" id="cal-mobile-detail" aria-live="polite">
      <div class="cal-mobile-detail-head">
        <strong>${escapeHTML(ds)} (${dowName})</strong>
        <span class="cal-mobile-week-meta">${escapeHTML(weekText)}</span>
      </div>
      <div class="cal-mobile-detail-body">${detailItems.length ? detailItems.join('') : '<span class="hint" style="margin:0;">予定・行事はありません。</span>'}</div>
    </div>`;
  }

  return `<div class="calendar-month-view" id="${escapeHTML(viewId)}">
    <div class="cal-month-nav">
      <button type="button" class="cal-nav-arrow" ${navAttr}="-1" aria-label="前の月">${icon('chevronLeft')}</button>
      <strong class="cal-month-title">${y}年 ${m}月</strong>
      <button type="button" class="cal-nav-arrow" ${navAttr}="1" aria-label="次の月">${icon('chevronRight')}</button>
      <button type="button" class="cal-nav-today" ${navAttr}="0">今月</button>
    </div>
    <div class="cal-month-grid">
      ${['日', '月', '火', '水', '木', '金', '土'].map(w => `<div class="cal-month-head">${w}</div>`).join('')}
      ${cells.join('')}
    </div>
    ${mobileDetailHtml}
  </div>`;
}

function renderCalendarMonthGrid(events, subs, todayStr) {
  const [baseY, baseM] = todayStr.slice(0, 7).split('-').map(Number);
  const target = new Date(Date.UTC(baseY, (baseM - 1) + calendarMonthOffset, 1));
  return renderMonthCalendarGrid({
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    events,
    subs,
    todayStr,
    lessonWeeksMap: computeAcademicLessonWeeks(calendarData || FALLBACK_CALENDAR),
    navAttr: 'data-cal-month',
    viewId: 'calendar-month-view',
    selectable: true,
    selectedDate: calendarSelectedDate
  });
}

function calendar() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${pageHelpBtn('calendar')}${studentPillBtn()}</div>`;
  const nowDate = new Date();
  const todayStr = dateKey(nowDate);
  const weekInfo = getAcademicWeek(nowDate);
  const data = calendarData || FALLBACK_CALENDAR;
  const events = Array.isArray(data.events) && data.events.length ? data.events : FALLBACK_CALENDAR.events;
  const subs = Array.isArray(data.daySubstitutions) ? data.daySubstitutions : [];
  const koukiStart = data.terms?.kouki?.classesStartDate || data.terms?.kouki?.startDate || '2026-09-24';

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

  const sortedEvents = [...events].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  const timelineEntries = [
    ...sortedEvents.map(ev => {
      const start = ev.date || ev.startDate || '';
      const endRaw = ev.endDate || start;
      const end = ev.endDate && ev.endDate !== start ? ` 〜 ${ev.endDate}` : '';
      const title = ev.name || ev.title || '行事';
      const b = badgeMap[ev.type] || { cls: 'blue', label: ev.hasClasses === false ? '休業' : '予定' };
      const isToday = start && (todayStr >= start && todayStr <= endRaw);
      const isPast = !isToday && endRaw && endRaw < todayStr;
      return {
        sortDate: start,
        isKouki: start >= koukiStart || Number(start.slice(5, 7)) <= 3,
        html: `<li class="calendar-event-item${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}" data-date="${escapeHTML(start)}" data-type="${escapeHTML(ev.type || 'event')}">
      <span class="calendar-event-date">${escapeHTML(start + end)}</span>
      ${isToday ? '<span class="badge red">本日</span>' : ''}
      <span class="badge ${b.cls}">${escapeHTML(b.label)}</span>
      <strong class="calendar-event-title">${escapeHTML(title)}</strong>
      ${ev.note ? `<small class="calendar-event-note">${escapeHTML(ev.note)}</small>` : ''}
    </li>`
      };
    }),
    ...subs.filter(Boolean).map(s => {
      const ds = String(s.date || '');
      const title = `${String(s.substituteDay || '月').replace(/曜日$/, '')}曜日授業を実施`;
      const isToday = ds === todayStr;
      const isPast = ds < todayStr;
      return {
        sortDate: ds,
        isKouki: ds >= koukiStart || Number(ds.slice(5, 7)) <= 3,
        html: `<li class="calendar-event-item${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}" data-date="${escapeHTML(ds)}" data-type="substitution">
      <span class="calendar-event-date">${escapeHTML(ds)}</span>
      ${isToday ? '<span class="badge red">本日</span>' : ''}
      <span class="badge blue">授業振替</span>
      <strong class="calendar-event-title">${escapeHTML(title)}</strong>
      ${s.note ? `<small class="calendar-event-note">${escapeHTML(s.note)}</small>` : ''}
    </li>`
      };
    })
  ].sort((a, b) => String(a.sortDate).localeCompare(String(b.sortDate)));

  const zenkiEntries = timelineEntries.filter(x => !x.isKouki);
  const koukiEntries = timelineEntries.filter(x => x.isKouki);
  const groupedListParts = [];
  if (zenkiEntries.length > 0) {
    groupedListParts.push('<li class="calendar-term-divider" id="cal-anchor-zenki">前期（4月〜9月）</li>');
    groupedListParts.push(...zenkiEntries.map(x => x.html));
  }
  if (koukiEntries.length > 0) {
    groupedListParts.push('<li class="calendar-term-divider" id="cal-anchor-kouki">後期（9月〜3月）</li>');
    groupedListParts.push(...koukiEntries.map(x => x.html));
  }
  const eventRows = groupedListParts.join('');

  const zenkiPdfUrl = normalizeAkashiUrl(data.meta?.zenkiPdfUrl, '');
  const koukiPdfUrl = normalizeAkashiUrl(data.meta?.koukiPdfUrl, '');
  const calSourceUrl = normalizeAkashiUrl(data.meta?.sourceUrl, 'https://www.akashi.ac.jp/life/calendar.html');
  const calSourceLinks = [
    `<a href="${escapeHTML(calSourceUrl)}" target="_blank" rel="noopener noreferrer">明石高専 公式行事予定 ↗</a>`,
    zenkiPdfUrl ? `<a href="${escapeHTML(zenkiPdfUrl)}" target="_blank" rel="noopener noreferrer">前期PDF ↗</a>` : '',
    koukiPdfUrl ? `<a href="${escapeHTML(koukiPdfUrl)}" target="_blank" rel="noopener noreferrer">後期PDF ↗</a>` : ''
  ].filter(Boolean).join(' / ');

  const mainBodyHtml = calendarViewMode === 'month'
    ? renderCalendarMonthGrid(events, subs, todayStr)
    : `<div class="calendar-events" id="calendar-events"><ul class="calendar-timeline" id="calendar-timeline-list">${eventRows || '<li class="calendar-event-item"><span class="calendar-event-title">該当する行事はありません。</span></li>'}</ul></div>`;

  return `${heading('行事予定', '', actions)}
    <section class="panel calendar-panel">
      <div class="calendar-filters" role="group" aria-label="年間予定の表示切替と移動">
        <div class="cal-view-tabs" role="tablist" aria-label="表示形式">
          <button type="button" class="cal-view-tab${calendarViewMode === 'month' ? ' is-active' : ''}" data-cal-view="month" role="tab" aria-selected="${calendarViewMode === 'month' ? 'true' : 'false'}">カレンダー</button>
          <button type="button" class="cal-view-tab${calendarViewMode === 'list' ? ' is-active' : ''}" data-cal-view="list" role="tab" aria-selected="${calendarViewMode === 'list' ? 'true' : 'false'}">イベント一覧</button>
        </div>
        <span class="badge blue cal-week-badge">${escapeHTML(weekInfo.label)} / 全15週</span>
        <div class="cal-term-jump">
          <button type="button" class="cal-jump-link" data-cal-jump="zenki">前期 (4月)</button>
          <span class="cal-jump-sep" aria-hidden="true">/</span>
          <button type="button" class="cal-jump-link" data-cal-jump="kouki">後期 (9月)</button>
        </div>
      </div>
      ${mainBodyHtml}
      <div class="calendar-export-footer" data-export-exclude>
        <button type="button" class="button" id="export-calendar-ics" data-open-ical-preview="calendar:all">${icon('download')}プレビュー &amp; カレンダー形式で保存</button>
      </div>
      <div class="timetable-source" data-export-exclude><span>出典：${calSourceLinks}</span><span>最新の変更は公式案内をご確認ください。</span></div>
    </section>`;
}
function calendarView() { return calendar(); }

function renderCafeteriaDayCard(day, todayStr = '', allergenAlert = '') {
  const dateTitle = [day.date, day.dayOfWeek ? `(${day.dayOfWeek})` : ''].filter(Boolean).join(' ');
  const isToday = Boolean(todayStr && day.date === todayStr);
  if (day.isOpen === false) {
    return `<li class="cafeteria-menu-item is-closed${isToday ? ' is-today' : ''}">
      <div class="cafeteria-day-head"><strong>${escapeHTML(dateTitle || '休業日')}</strong>${isToday ? '<span class="badge red">本日</span>' : ''}<span class="badge gray">休業</span></div>
      <p>${escapeHTML(day.closedReason || day.notice || '学生食堂休業日')}</p>
    </li>`;
  }
  const fmtDish = (badge, item, strong = false) => {
    if (!item?.name) return '';
    const titleHtml = strong ? `<strong>${escapeHTML(item.name)}</strong>` : `<span>${escapeHTML(item.name)}</span>`;
    const priceHtml = item.price ? ` <span class="price">${escapeHTML(String(item.price))}円</span>` : '';
    const kcalHtml = item.kcal ? ` <small class="dish-kcal">${escapeHTML(String(item.kcal))}kcal</small>` : '';
    const detailsHtml = item.details ? ` <small class="dish-details">(${escapeHTML(item.details)})</small>` : '';
    return `<div><span class="dish-badge">${badge}</span> ${titleHtml}${priceHtml}${kcalHtml}${detailsHtml}</div>`;
  };
  const dishRows = [
    fmtDish('Aランチ', day.lunchA, true),
    fmtDish('Bランチ', day.lunchB, true),
    fmtDish('麺類', day.noodle, false),
    fmtDish('丼', day.bowl, false)
  ].filter(Boolean);
  const toAllergenText = (val) => Array.isArray(val) ? val.join('・') : String(val || '');
  const rawAllergens = [
    toAllergenText(day.allergens),
    toAllergenText(day.lunchA?.allergens),
    toAllergenText(day.lunchB?.allergens),
    toAllergenText(day.noodle?.allergens),
    toAllergenText(day.bowl?.allergens)
  ].filter(Boolean).join(' ');
  const allergens = toAllergenText(day.allergens) || toAllergenText(day.lunchA?.allergens);
  const hasAllergenAlert = Boolean(allergenAlert && rawAllergens.includes(allergenAlert));
  return `<li class="cafeteria-menu-item${isToday ? ' is-today' : ''}${hasAllergenAlert ? ' has-allergen-alert' : ''}">
    <div class="cafeteria-day-head"><strong>${escapeHTML(dateTitle || '本日')}</strong><span class="panel-head-meta">${isToday ? '<span class="badge red">本日</span>' : ''}${hasAllergenAlert ? `<span class="badge red">${icon('alert')}${escapeHTML(allergenAlert)}を含む</span>` : ''}</span></div>
    ${day.notice ? `<p class="cafeteria-day-notice">${escapeHTML(day.notice)}</p>` : ''}
    <div class="cafeteria-day-dishes">${dishRows.join('') || `<span>${escapeHTML(day.name || day.menu || '')}</span>`}</div>
    ${allergens ? `<p class="allergens">アレルゲン: ${escapeHTML(allergens)}</p>` : ''}
  </li>`;
}

function cafeteria() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${pageHelpBtn('cafeteria')}${studentPillBtn()}</div>`;
  const todayStr = dateKey(new Date());
  const data = cafeteriaData || FALLBACK_CAFETERIA;
  const meta = data.meta || FALLBACK_CAFETERIA.meta || {};
  const hasSourceKey = Object.prototype.hasOwnProperty.call(meta, 'sourcePdfUrl');
  const rawSourceUrl = hasSourceKey ? meta.sourcePdfUrl : FALLBACK_CAFETERIA.meta?.sourcePdfUrl;
  const sourcePdfUrl = normalizeAkashiUrl(rawSourceUrl, '');
  const hasDormKey = Object.prototype.hasOwnProperty.call(meta, 'dormitoryArticleUrl');
  const dormArticleUrl = normalizeAkashiUrl(hasDormKey ? meta.dormitoryArticleUrl : FALLBACK_CAFETERIA.meta?.dormitoryArticleUrl, '');
  const dormPdfUrl = normalizeAkashiUrl(Object.prototype.hasOwnProperty.call(meta, 'dormitoryPdfUrl') ? meta.dormitoryPdfUrl : FALLBACK_CAFETERIA.meta?.dormitoryPdfUrl, '');
  const articleUrl = normalizeAkashiUrl(meta.articleUrl, '');
  const isTextExtracted = Boolean(meta.isTextExtracted);
  const weeklyMenus = Array.isArray(data.weeklyMenus) ? data.weeklyMenus : [];
  const legacyMenus = Array.isArray(data.menus) ? data.menus : (Array.isArray(data.items) ? data.items : []);
  const hasMenuData = weeklyMenus.some(w => Array.isArray(w?.days) && w.days.length > 0) || legacyMenus.length > 0;
  const hasAllergenData = weeklyMenus.some(w => (w?.days || []).some(d => d?.allergens || d?.lunchA?.allergens || d?.lunchB?.allergens || d?.noodle?.allergens || d?.bowl?.allergens));
  const allergenChoices = ['小麦', '卵', '乳', 'そば', '落花生', 'えび', 'かに', 'くるみ'];
  const allergenChipsHtml = hasMenuData && isTextExtracted && hasAllergenData
    ? `<div class="cafeteria-allergen-filter" role="group" aria-label="アレルゲン注意ハイライト">
        <span class="strip-label">アレルゲン</span>
        ${allergenChoices.map(al => `<button type="button" class="chip${selectedAllergenFilter === al ? ' active' : ''}" data-allergen-chip="${al}" aria-pressed="${selectedAllergenFilter === al ? 'true' : 'false'}">${al}</button>`).join('')}
        ${selectedAllergenFilter ? '<button type="button" class="chip" data-allergen-chip="">解除</button>' : ''}
      </div>`
    : '';

  let weekTabsHtml = '';
  let menuContent = `<p class="info-note" data-extracted="false">日替わり献立の詳細はPDF版（自動抽出未対応）をご確認ください。</p>`;
  if (isTextExtracted && hasMenuData) {
    if (weeklyMenus.length > 0) {
      const validWeekIdx = selectedCafeteriaWeekIdx >= 0 && selectedCafeteriaWeekIdx < weeklyMenus.length ? selectedCafeteriaWeekIdx : -1;
      if (weeklyMenus.length > 1) {
        weekTabsHtml = `<div class="cafeteria-week-tabs" role="group" aria-label="週切り替え">
          <button type="button" class="cafeteria-week-tab${validWeekIdx === -1 ? ' active' : ''}" data-cafe-week="-1" aria-pressed="${validWeekIdx === -1 ? 'true' : 'false'}">全週</button>
          ${weeklyMenus.map((w, idx) => {
            const includesToday = Array.isArray(w?.days) && w.days.some(d => d?.date === todayStr);
            return `<button type="button" class="cafeteria-week-tab${validWeekIdx === idx ? ' active' : ''}" data-cafe-week="${idx}" aria-pressed="${validWeekIdx === idx ? 'true' : 'false'}">${escapeHTML(w.weekLabel || `第${idx + 1}週`)} ${w.weekRange ? `(${escapeHTML(w.weekRange)})` : ''}${includesToday ? '・今週' : ''}</button>`;
          }).join('')}
        </div>`;
      }
      const visibleWeeks = validWeekIdx === -1 ? weeklyMenus : [weeklyMenus[validWeekIdx]];
      menuContent = visibleWeeks.map((week, idx) => {
        const days = Array.isArray(week?.days) ? week.days : [];
        return `<div class="cafeteria-week-block" data-week-idx="${validWeekIdx === -1 ? idx : validWeekIdx}">
          ${week.weekRange ? `<h3 class="cafeteria-week-heading">${escapeHTML(week.weekRange)}</h3>` : ''}
          <ul class="cafeteria-menu-list">${days.map(d => renderCafeteriaDayCard(d, todayStr, selectedAllergenFilter)).join('')}</ul>
        </div>`;
      }).join('');
    } else {
      menuContent = `<ul class="cafeteria-menu-list">${legacyMenus.map(m => `<li class="cafeteria-menu-item"><strong>${escapeHTML(m.date || m.day || '本日')}</strong>: ${escapeHTML(m.name || m.menu || m.lunch || '')}${m.price ? ` <span class="badge">${escapeHTML(String(m.price))}円</span>` : ''}</li>`).join('')}</ul>`;
    }
  }
  const menuFootnote = isTextExtracted && hasMenuData
    ? `<p class="hint" style="margin:6px 0 0;">※表示価格は税込。「小麦・卵・乳・そば・落花生・えび・かに・くるみ」を含む設備で調理しています。</p>`
    : '';
  return `${heading('食堂メニュー', '', actions)}
    <section class="panel cafeteria-panel cafeteria-view" id="cafeteria-view" data-text-extracted="${isTextExtracted ? 'true' : 'false'}">
      <div class="panel-head">
        <h2>${icon('utensils')}学生食堂</h2>
      </div>
      ${weekTabsHtml}
      ${allergenChipsHtml}
      ${menuContent}
      ${menuFootnote}
      <div class="cafeteria-links" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${sourcePdfUrl ? `<a class="button" href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}今月の献立PDF</a>` : ''}
        ${articleUrl ? `<a class="button secondary" href="${escapeHTML(articleUrl)}" target="_blank" rel="noopener noreferrer">食堂メニュー案内記事</a>` : ''}
        <a class="text-link" href="https://www.akashi.ac.jp/news_list/news2026.html" target="_blank" rel="noopener noreferrer">公式ニュース一覧${icon('arrow')}</a>
      </div>
      <div class="dormitory-section" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line);">
        <h3>寮生食堂メニュー</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
          ${dormPdfUrl ? `<a class="button secondary" href="${escapeHTML(dormPdfUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}寮生食堂 PDF</a>` : ''}
          ${dormArticleUrl ? `<a class="button secondary" href="${escapeHTML(dormArticleUrl)}" target="_blank" rel="noopener noreferrer">寮生食堂メニュー記事</a>` : ''}
        </div>
      </div>
    </section>`;
}
function cafeteriaView() { return cafeteria(); }

const PRESET_LINKS = [
  { name: 'Gmail', url: 'https://mail.google.com/' },
  { name: 'Google Drive', url: 'https://drive.google.com/' },
  { name: 'OneDrive', url: 'https://onedrive.live.com/' },
  { name: 'iCloud', url: 'https://www.icloud.com/' },
  { name: '物理（1・2年）', url: 'https://sites.google.com/s.akashi.ac.jp/physics', minGrade: 3 },
];

function renderLinkEditorModal(resolvedLinks = []) {
  const existingUrls = new Set(resolvedLinks.map(item => normalizeLinkUrl(item.url)));
  const gradeNum = Number(studentSelection?.grade ?? 1);
  const presetButtons = PRESET_LINKS
    .filter(p => !p.minGrade || gradeNum >= p.minGrade)
    .map(p => {
      const added = existingUrls.has(normalizeLinkUrl(p.url));
      return `<button type="button" class="preset-btn${added ? ' is-added' : ''}" data-preset-name="${escapeHTML(p.name)}" data-preset-url="${escapeHTML(p.url)}" ${added ? 'disabled aria-disabled="true"' : ''}>${renderFavicon(p.url, p.name)}<span>${escapeHTML(p.name)}${added ? '（済）' : ''}</span></button>`;
    }).join('');

  return `<div class="data-preview-overlay" id="link-editor-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-labelledby="link-editor-title">
    <div class="data-preview-card link-editor-modal-card">
      <div class="data-preview-head">
        <h3 id="link-editor-title">リンクを追加</h3>
        <button type="button" class="button size-close-btn" id="link-modal-close" aria-label="閉じる" style="min-height:30px;padding:0 8px;">${icon('close')}</button>
      </div>
      <form id="mylink-form" novalidate>
        <div class="data-preview-body">
          <label class="field">表示名<input type="text" id="mylink-name" name="name" maxlength="32" placeholder="例: Gmail" aria-label="リンク名" required autocomplete="off"></label>
          <label class="field">URL<input type="url" id="mylink-url" name="url" placeholder="https://..." aria-label="リンクURL" inputmode="url" autocapitalize="off" required autocomplete="off"><small class="field-hint" id="link-modal-syllabus-note" hidden>※ 空欄または初期URLのままにすると、所属設定（${escapeHTML(studentShortLabel())}）に合わせてシラバスURLが自動連動します。</small></label>
          <p id="mylink-error" class="info-note link-modal-error" role="alert" hidden></p>
          <div class="link-modal-presets" id="link-modal-presets-wrap">
            <p class="link-modal-presets-label">よく使うサービスから1タップ追加</p>
            <div class="link-preset-chips">${presetButtons}</div>
          </div>
        </div>
        <div class="data-preview-foot link-modal-foot">
          <button type="button" class="button danger-text" id="link-modal-delete-btn" hidden>削除</button>
          <div class="link-modal-foot-right">
            <button type="button" class="button secondary" id="link-modal-cancel">キャンセル</button>
            <button type="submit" id="mylink-add-btn" class="button">追加</button>
          </div>
        </div>
      </form>
    </div>
  </div>`;
}

function linksView() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${pageHelpBtn('links')}${studentPillBtn()}</div>`;
  const linksState = loadLinksState();
  const resolvedLinks = getResolvedLinks(studentSelection, linksState);
  const customized = isLinksCustomized(linksState);

  const editBarHtml = myLinksManageMode ? `
    <div class="links-edit-bar">
      <span class="links-edit-hint">タップで編集・ドラッグまたは左右ボタンで並び替え</span>
      <div class="links-edit-bar-actions">
        <button type="button" class="button subtle" data-open-link-add="1">${icon('plus')}リンクを追加</button>
        <button type="button" class="button subtle" id="links-restore-defaults" ${customized ? '' : 'disabled'}>${icon('rotate')}初期設定に戻す</button>
      </div>
    </div>` : '';

  const archiveList = (timetableLinksData?.pages || [])
    .flatMap(p => Array.isArray(p?.items) ? p.items : [])
    .filter(item => item && item.url)
    .map(item => {
      const safeUrl = normalizeAkashiUrl(item.url, '');
      if (!/^https:\/\//i.test(safeUrl)) return '';
      return `<a class="links-archive-chip" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${icon('document')}<span>${escapeHTML(item.title || item.fileName || 'PDF')}</span></a>`;
    })
    .filter(Boolean);

  return `${heading('リンク集', '', actions)}
    <section class="panel links-panel" id="links-panel">
      <div class="links-toolbar">
        <div class="links-toolbar-meta"><span>${resolvedLinks.length}件</span></div>
        <div class="links-toolbar-actions">
          <button type="button" class="button subtle${linksState.iconOnly ? ' is-active' : ''}" id="links-icon-only-toggle" aria-pressed="${linksState.iconOnly ? 'true' : 'false'}">${icon('grid')}アイコンのみ</button>
          <button type="button" class="button subtle${myLinksManageMode ? ' is-active' : ''}" id="mylinks-manage-toggle" aria-pressed="${myLinksManageMode ? 'true' : 'false'}">${icon(myLinksManageMode ? 'check' : 'edit')}${myLinksManageMode ? '完了' : '編集'}</button>
        </div>
      </div>
      ${renderSpeedDialGrid(resolvedLinks, { editable: myLinksManageMode, includeAdd: true, iconOnly: linksState.iconOnly })}
      ${editBarHtml}
    </section>
    ${archiveList.length ? `<details class="links-archive-quiet"><summary>${icon('chevronRight')}公式PDFアーカイブ（${archiveList.length}件）</summary><div class="links-archive-list">${archiveList.join('')}</div></details>` : ''}
    ${renderLinkEditorModal(resolvedLinks)}`;
}

function renderTimetableBanners(date = new Date()) {
  const { dateStr, weekdayNum } = getJstParts(date);
  const cal = calendarData || FALLBACK_CALENDAR;
  const events = Array.isArray(cal?.events) ? cal.events : [];
  let banners = '';

  const sub = cal?.daySubstitutions?.find(item => item.date === dateStr);
  if (sub) {
    const subDay = String(sub.substituteDay || '月').replace(/曜日$/, '');
    const subName = `${subDay}曜日`;
    banners += `<div class="alert alert-warning timetable-banner day-substitution day-sub-alert"><span class="badge blue">授業振替</span> 本日は<strong>${escapeHTML(subName)}授業</strong>を実施します。</div>`;
  }

  const holidayEv = events.find(e =>
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) &&
    e.type !== 'exam' &&
    (e.date === dateStr || (e.endDate && dateStr >= e.date && dateStr <= e.endDate))
  );
  if (!sub && (holidayEv || weekdayNum === 0 || weekdayNum === 6)) {
    const label = holidayEv?.title || holidayEv?.name || (weekdayNum === 0 || weekdayNum === 6 ? '週末・休業日' : '休業日（祝日）');
    banners += `<div class="alert alert-warning timetable-banner holiday-banner"><span class="badge yellow">祝日・休業日</span> 本日は${escapeHTML(label)}です。</div>`;
  }

  const isExam = events.some(e => e.type === 'exam' && dateStr >= e.date && (!e.endDate || dateStr <= e.endDate));
  if (isExam) {
    const examLink = FEATURE_FLAGS.exam
      ? '<a class="text-link" href="#exam">試験時間割を確認 →</a>'
      : '<a class="text-link" href="#calendar">年間予定を確認 →</a>';
    banners += `<div class="alert alert-warning timetable-banner exam-period-banner"><span class="badge red">定期試験期間</span> 現在は定期試験期間です。${examLink}</div>`;
  }

  return banners;
}

function timetable() {
  const s = studentSelection;
  const isAdvanced = s.grade >= 6;
  const { selected, grid, error } = selectedSchedule();
  const totalPeriods = selected.reduce((sum, l) => sum + (l.duration || 1), 0);
  const controls = buildStudentFilterControls(s, 'student', 'data-student');
  const fyText = formatFiscalYear(timetableMeta?.fiscalYear || 2026);
  const termText = timetableMeta?.term || '後期';
  const { weekdayNum: todayWeekdayNum } = getJstParts(new Date());
  const todayDayIdx = (todayWeekdayNum >= 1 && todayWeekdayNum <= 5) ? (todayWeekdayNum - 1) : -1;
  const table = `<div class="table-scroll" tabindex="0" role="region" aria-label="週間時間割。左右にスクロールできます"><table class="real-timetable"><caption class="sr-only">${escapeHTML(studentLabel())}の${escapeHTML(fyText)}${escapeHTML(termText)}時間割</caption><thead><tr><th scope="col">時限</th>${DAYS.map((d, dIdx)=>`<th scope="col" class="${dIdx === todayDayIdx ? 'is-today-col' : ''}">${d}曜日${dIdx === todayDayIdx ? ' <span class="today-col-tag" data-export-exclude>今日</span>' : ''}</th>`).join('')}</tr></thead><tbody>${periods.map((time,p)=>`<tr><th scope="row">${p+1}限<small>${time[0]}<br>${time[1]}</small></th>${grid.map((day, dIdx)=>{
    const cell = day[p];
    if(cell.length===1 && cell[0].period-1<p && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id))) return '';
    const span = cell.length===1 && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id)) ? (cell[0].duration||1) : 1;
    return `<td rowspan="${span}" class="schedule-cell ${cell.length?'':'schedule-empty'}${dIdx === todayDayIdx ? ' is-today-col' : ''}">${cell.length ? cell.map(l=>`<div class="lesson-card"><strong>${escapeHTML(l.subjectName)}</strong>${l.location?renderLocationTrigger(l.location):''}<small>${escapeHTML(l.teacher)}</small>${span>1?`<span class="badge gray">${l.period}〜${l.period+span-1}限</span>`:''}${l.notes?`<small>${escapeHTML(l.notes)}</small>`:''}</div>`).join('') : ''}${cell.length>1?'<span class="badge red">授業の重複</span>':''}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  const sourceUrl = normalizeAkashiUrl(timetableMeta?.sourceUrl || SOURCE?.url) || 'https://www.akashi.ac.jp/life/lesson.html';
  const sourcePdfUrl = getTimetablePdfUrl();
  const updatedText = timetableMeta?.updated || (timetableMeta?.updatedAt ? String(timetableMeta.updatedAt).slice(0, 10) : '') || SOURCE?.updated || '2026-09-24';

  return `${heading(`${fyText} ${termText}時間割`,'',`<div class="heading-actions">${themeToggleBtn()}${pageHelpBtn('timetable')}</div>`)}
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
          <button type="button" class="button confirm-btn" id="confirm-filter-btn">${icon('check')}決定</button>
        </div>
      </div>
    </details>
    <section class="panel timetable-panel" id="timetable-sheet"><div class="panel-head"><h2>${escapeHTML(studentLabel())}</h2></div>${error?`<p class="info-note" role="status">${escapeHTML(error)}</p>`:table}${renderRoomPopoverBox()}<div class="timetable-source" data-export-exclude><span>出典：<a href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">明石高専 ↗</a> / <a href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">原本PDF ↗</a>（${escapeHTML(fyText)}${escapeHTML(termText)}）</span><span>休講・変更は公式案内をご確認ください。</span></div><div class="export-controls" data-export-exclude><label class="field">保存形式<select id="export-format" ${error || exportInProgress ? 'disabled' : ''}><option value="pdf"${currentExportFormat==='pdf'?' selected':''}>PDF（A4横）</option><option value="png"${currentExportFormat==='png'?' selected':''}>PNG（画像）</option><option value="text"${currentExportFormat==='text'?' selected':''}>テキスト（.txt）</option><option value="csv"${currentExportFormat==='csv'?' selected':''}>CSV（Excel用 / .csv）</option><option value="json"${currentExportFormat==='json'?' selected':''}>JSON（選択中の授業データ / .json）</option><option value="all-json"${currentExportFormat==='all-json'?' selected':''}>全授業データのJSONエクスポート (.json)</option><option value="ics"${currentExportFormat==='ics'?' selected':''}>カレンダー形式 (.ics)</option></select></label><div class="export-btn-group"><button class="button" id="export-adjust-open" type="button" ${error || exportInProgress ? 'disabled' : ''}>${icon('sliders')}${exportInProgress?'作成中…':escapeHTML(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.adjustLabel||'プレビュー・出力')}</button></div></div><p id="export-status" class="export-status" role="status" data-export-exclude hidden></p></section>
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
            <button type="button" class="size-mode-btn ${exportSizeMode === 'web' ? 'active' : ''}" data-size-mode="web" aria-pressed="${exportSizeMode === 'web' ? 'true' : 'false'}">標準</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'a4fit' ? 'active' : ''}" data-size-mode="a4fit" aria-pressed="${exportSizeMode === 'a4fit' ? 'true' : 'false'}">A4向け</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'custom' ? 'active' : ''}" data-size-mode="custom" aria-pressed="${exportSizeMode === 'custom' ? 'true' : 'false'}">カスタム</button>
            <button type="button" class="size-mode-btn reset" id="size-mode-reset">リセット</button>
            <label class="size-a4-toggle"><input type="checkbox" id="size-toggle-a4" ${a4ModeEnabled ? 'checked' : ''}> A4枠を表示</label>
            <button type="button" class="size-mode-btn" id="size-modal-theme-toggle" title="出力用テーマ切り替え（サイト本体には影響しません）">${getExportTheme() === 'dark' ? `${icon('sun')}白背景で出力` : `${icon('moon')}暗背景で出力`}</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="button export-copy-btn" id="size-modal-copy-btn" ${currentExportFormat === 'png' ? '' : 'hidden'}>${icon('copy')}画像をコピー</button>
            <button type="button" class="button" id="size-modal-save-btn">${icon('download')}${escapeHTML(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.downloadLabel || 'このサイズで保存')}</button>
            <button type="button" class="button secondary size-close-btn" id="export-size-close">閉じる</button>
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
            <input type="range" id="size-slider-cell" min="80" max="320" step="2" value="${exportSizeConfig.cellHeight}">
            <span class="size-slider-val" id="size-val-cell">${exportSizeConfig.cellHeight}px</span>
          </label>
          <label class="size-slider-item">
            <span class="size-slider-name">授業名の大きさ</span>
            <input type="range" id="size-slider-font" min="80" max="160" step="1" value="${exportSizeConfig.fontScale}">
            <span class="size-slider-val" id="size-val-font">${exportSizeConfig.fontScale}%</span>
          </label>
        </div>
      </div>
    </div>
    <div class="data-preview-overlay" id="data-preview-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="データプレビュー">
      <div class="data-preview-card">
        <div class="data-preview-head">
          <h3 id="data-preview-title">データプレビュー</h3>
          <button type="button" class="button size-close-btn" id="data-preview-close" aria-label="閉じる" style="min-height:30px;padding:0 8px;">${icon('close')}</button>
        </div>
        <div class="data-preview-body" id="data-preview-body"></div>
        <div class="data-preview-foot">
          <button type="button" class="button secondary" id="data-preview-cancel">閉じる</button>
          <button type="button" class="button export-copy-btn" id="data-preview-copy">${icon('copy')}コピー</button>
          <button type="button" class="button" id="data-preview-action">${icon('download')}保存</button>
        </div>
      </div>
    </div>`;
}
function getMaxCellHeightForA4(padding) {
  const fixedH = (padding * 2) + 80; // 上下余白 + ヘッダー行(約48px) + thead(約32px)
  return Math.max(80, Math.floor((778 - fixedH) / 4));
}
function getPresetConfig(mode, isA4) {
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
  setCssVar(wrap, '--sheet-scale', String(fitScale.toFixed(3)));
  setCssVar(wrap, '--sheet-height', `${naturalH}px`);
}
function setCssVar(el, prop, value) {
  if (!el?.style) return;
  if (typeof el.style.setProperty === 'function') el.style.setProperty(prop, value);
  else el.style[prop] = value;
}
function applyLiveSheetSize(sheet) {
  if (!sheet) return;
  const pad = exportSizeConfig.padding;
  const cellH = exportSizeConfig.cellHeight;
  const scale = exportSizeConfig.fontScale / 100;
  setCssVar(sheet, '--export-pad', `${pad}px`);
  setCssVar(sheet, '--export-cell-h', `${cellH}px`);
  setCssVar(sheet, '--export-font-scale', String(scale));
  if (sheet.style) sheet.style.padding = `${pad}px`;
}
function getOpenModalEl() {
  if (typeof document === 'undefined') return null;
  for (const id of ['export-size-modal', 'data-preview-modal', 'ical-preview-modal', 'room-legends-modal', 'help-modal', 'profile-switcher-modal', 'link-editor-modal', 'appendix-guide-modal']) {
    const el = document.getElementById(id);
    if (el && el.hidden === false) return el;
  }
  return null;
}

function openLinkEditorModal(mode = 'add', id = '') {
  const modal = document.getElementById('link-editor-modal');
  if (!modal) return;
  const titleEl = document.getElementById('link-editor-title');
  const nameIn = document.getElementById('mylink-name');
  const urlIn = document.getElementById('mylink-url');
  const errEl = document.getElementById('mylink-error');
  const delBtn = document.getElementById('link-modal-delete-btn');
  const submitBtn = document.getElementById('mylink-add-btn');
  const presetsWrap = document.getElementById('link-modal-presets-wrap');
  const sylNote = document.getElementById('link-modal-syllabus-note');

  linkModalMode = mode === 'edit' ? 'edit' : 'add';
  editingMyLinkId = linkModalMode === 'edit' ? String(id || '') : '';
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  if (linkModalMode === 'edit') {
    const item = getResolvedLinks(studentSelection).find(x => x.id === editingMyLinkId);
    if (!item) return;
    if (titleEl) titleEl.textContent = 'リンクを編集';
    if (nameIn) nameIn.value = item.name;
    if (urlIn) urlIn.value = item.url;
    if (delBtn) {
      delBtn.hidden = false;
      delBtn.textContent = item.isDefault ? '非表示にする' : '削除';
    }
    if (submitBtn) submitBtn.textContent = '保存';
    if (presetsWrap) presetsWrap.hidden = true;
    if (sylNote) sylNote.hidden = !item.isSyllabus;
  } else {
    if (titleEl) titleEl.textContent = 'リンクを追加';
    if (nameIn) nameIn.value = '';
    if (urlIn) urlIn.value = '';
    if (delBtn) delBtn.hidden = true;
    if (submitBtn) submitBtn.textContent = '追加';
    if (presetsWrap) presetsWrap.hidden = false;
    if (sylNote) sylNote.hidden = true;
  }

  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList?.add('size-modal-open');
  nameIn?.focus?.();
}

function closeLinkEditorModal() {
  const modal = document.getElementById('link-editor-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  editingMyLinkId = '';
  linkModalMode = 'add';
  setModalBackdropInert(false);
  document.body.classList?.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

const HELP_GUIDE_ITEMS = [
  { id: 'home', title: 'ホーム', summary: '今日の時間割とよく使うリンクを見られます。' },
  { id: 'timetable', title: '時間割', summary: '時間割を見たり、それを画像やカレンダーに登録できる形で保存できます。' },
  { id: 'calendar', title: '年間予定', summary: '高専祭などのイベントや期末週間などを確認し、カレンダーで保存できます。' },
  { id: 'links', title: 'リンク集', summary: 'シラバスやTeams、授業変更リストへのリンクがあります。欲しいリンクを追加することもできます。' }
];

function renderHelpGuideContent(focusKey = 'home') {
  const activeKey = HELP_GUIDE_ITEMS.some(item => item.id === focusKey) ? focusKey : 'home';
  const quickAction = !cookieSaved
    ? `<div class="help-quickstart">
        <span>自分のクラスを設定して始めましょう</span>
        <button type="button" class="button" id="help-modal-pick-profile" style="min-height:32px;padding:4px 12px;white-space:nowrap;">所属を選ぶ →</button>
      </div>`
    : '';
  return `${quickAction}<div class="help-section">
    <ul class="help-guide-list">${HELP_GUIDE_ITEMS.map(item => {
      const isCurrent = item.id === activeKey;
      return `<li class="${isCurrent ? 'is-current-guide' : ''}">
        <strong>${escapeHTML(item.title)}${isCurrent ? ' <span class="badge blue">表示中</span>' : ''}</strong>
        <span>${escapeHTML(item.summary)}</span>
      </li>`;
    }).join('')}</ul>
  </div>
  <details class="help-install-details">
    <summary>スマホのホーム画面に追加（アプリとして使う）</summary>
    <p class="help-install-desc">ブラウザの「ホーム画面に追加」を使うと、アイコンから1タップで全画面起動できます。</p>
    <div class="help-pwa-btns">
      <button type="button" class="button secondary" data-open-guide="./guide/ios.html?embed=1" data-guide-title="iPhone (Safari) でホーム画面に追加">iPhone (Safari) の手順</button>
      <button type="button" class="button secondary" data-open-guide="./guide/android.html?embed=1" data-guide-title="Android (Chrome) でホーム画面に追加">Android (Chrome) の手順</button>
    </div>
  </details>`;
}

function renderAppendixGuideModal() {
  return `<div class="data-preview-overlay" id="appendix-guide-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-labelledby="appendix-guide-title">
    <div class="data-preview-card appendix-guide-card">
      <div class="data-preview-head">
        <h3 id="appendix-guide-title">${icon('document')}操作ガイド</h3>
        <button type="button" class="button size-close-btn" id="appendix-guide-close" aria-label="閉じる">${icon('close')}</button>
      </div>
      <div class="data-preview-body appendix-guide-body">
        <iframe id="appendix-guide-frame" class="appendix-guide-frame" title="操作ガイド" src="about:blank"></iframe>
      </div>
      <div class="data-preview-foot">
        <button type="button" class="button" id="appendix-guide-ok">閉じる</button>
      </div>
    </div>
  </div>`;
}

function openAppendixGuideModal(url, titleText = '操作ガイド') {
  const modal = document.getElementById('appendix-guide-modal');
  const titleEl = document.getElementById('appendix-guide-title');
  const frameEl = document.getElementById('appendix-guide-frame');
  if (!modal || !frameEl) return;
  if (titleEl) titleEl.innerHTML = `${icon('document')}${escapeHTML(titleText)}`;
  frameEl.src = url;
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  document.getElementById('appendix-guide-close')?.focus?.();
}

function closeAppendixGuideModal() {
  const modal = document.getElementById('appendix-guide-modal');
  const frameEl = document.getElementById('appendix-guide-frame');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  if (frameEl) frameEl.src = 'about:blank';
  const parentModal = ['help-modal', 'ical-preview-modal'].map(id => document.getElementById(id)).find(el => el && !el.hidden);
  if (parentModal) {
    setModalBackdropInert(true, parentModal);
  } else {
    setModalBackdropInert(false);
    document.body.classList.remove('size-modal-open');
  }
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

function renderHelpModal() {
  return `<div class="data-preview-overlay" id="help-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="ポータルの使い方">
    <div class="data-preview-card help-modal-card">
      <div class="data-preview-head">
        <h3 id="help-modal-title">${icon('info')}ポータルの使い方</h3>
        <button type="button" class="button size-close-btn" id="help-modal-close" aria-label="閉じる" style="min-height:30px;padding:0 8px;">${icon('close')}</button>
      </div>
      <div class="data-preview-body" id="help-modal-body">${renderHelpGuideContent(activeHelpTab)}</div>
      <div class="data-preview-foot">
        <button type="button" class="button subtle" id="help-replay-tour" style="margin-right:auto;">初回案内をもう一度見る</button>
        <button type="button" class="button" id="help-modal-ok">閉じる</button>
      </div>
    </div>
  </div>`;
}

function updateHelpModalBody(focusKey = activeHelpTab) {
  activeHelpTab = HELP_GUIDE_ITEMS.some(item => item.id === focusKey) ? focusKey : 'home';
  const titleEl = document.getElementById('help-modal-title');
  const bodyEl = document.getElementById('help-modal-body');
  if (titleEl) {
    titleEl.innerHTML = `${icon('info')}ポータルの使い方`;
  }
  if (bodyEl) {
    bodyEl.innerHTML = renderHelpGuideContent(activeHelpTab);
    bodyEl.querySelector?.('#help-modal-pick-profile')?.addEventListener('click', () => {
      closeHelpModal();
      document.getElementById('open-profile-switcher')?.click();
    });
  }
}

function dismissHelpSpotlight() {
  firstVisitSpotlightDismissed = true;
  forceSpotlightReplay = false;
  if (typeof document === 'undefined') return;
  document.body?.classList?.remove?.('guide-spotlight-active');
  const backdrop = document.getElementById('guide-spotlight-backdrop');
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.remove?.();
  }
  document.getElementById('guide-spotlight-card')?.remove?.();
  document.getElementById('guide-spotlight-pointer')?.remove?.();
  document.querySelectorAll?.('.is-spotlight-target')?.forEach?.(el => el.classList?.remove?.('is-spotlight-target'));
}

function isHamburgerMenuVisible() {
  if (typeof document !== 'undefined') {
    const toggle = document.getElementById('menu-toggle');
    if (toggle && typeof toggle.getBoundingClientRect === 'function') {
      const r = toggle.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
  }
  if (typeof window !== 'undefined') {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width:760px)')?.matches) return true;
    if (typeof window.innerWidth === 'number') return window.innerWidth <= 760;
  }
  return false;
}

function positionSpotlightPointer() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const pointer = document.getElementById('guide-spotlight-pointer');
  const card = document.getElementById('guide-spotlight-card');
  if (!pointer || !card) return;
  const step = Number(card.dataset?.step ?? 0);
  let target = null;
  if (step === 0) {
    const toggle = document.getElementById('menu-toggle');
    const toggleRect = typeof toggle?.getBoundingClientRect === 'function' ? toggle.getBoundingClientRect() : null;
    if (toggleRect && toggleRect.width > 0 && toggleRect.height > 0) {
      target = toggle;
    } else {
      target = document.querySelector?.('#sidebar nav') || document.getElementById('sidebar');
    }
  } else {
    target = document.querySelector?.('.page-help-btn');
  }
  if (!target || typeof target.getBoundingClientRect !== 'function') {
    pointer.hidden = true;
    return;
  }
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    pointer.hidden = true;
    return;
  }
  const vw = window.innerWidth || 390;
  const vh = window.innerHeight || 844;
  const cardRect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : { top: vh - 160 };
  const maxBottom = Math.max(120, (cardRect.top || vh - 160) - 56);
  const tx = rect.left + rect.width / 2;
  const ty = rect.top + rect.height / 2;
  // 画面中央側の余白に向けて矢印を配置し、ターゲット中心を指す
  const vx = (vw / 2) - tx;
  const vy = (vh / 2) - ty;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;
  const edgeOffsetX = (rect.width / 2) * Math.abs(ux);
  const edgeOffsetY = (rect.height / 2) * Math.abs(uy);
  const dist = Math.hypot(edgeOffsetX, edgeOffsetY) + 38;
  const ax = Math.min(Math.max(24, tx + ux * dist), vw - 24);
  const ay = Math.min(Math.max(24, ty + uy * dist), maxBottom);
  const angleDeg = Math.atan2(ty - ay, tx - ax) * (180 / Math.PI) + 90;
  pointer.hidden = false;
  pointer.style.left = `${Math.round(ax)}px`;
  pointer.style.top = `${Math.round(ay)}px`;
  pointer.style.setProperty('--pointer-angle', `${angleDeg.toFixed(1)}deg`);
}

function openHelpModal(tab = null) {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  dismissHelpSpotlight();
  const rawHash = (typeof location !== 'undefined' ? (location.hash.slice(1).split('?')[0].split('/')[0] || 'home').trim() : 'home');
  const targetTab = tab || (HELP_GUIDE_ITEMS.some(item => item.id === rawHash) ? rawHash : 'home');
  updateHelpModalBody(targetTab, false);
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  document.getElementById('help-modal-close')?.focus?.();
}

function closeHelpModal() {
  const modal = document.getElementById('help-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  setModalBackdropInert(false);
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

function renderIcalPreviewModal() {
  return `<div class="data-preview-overlay" id="ical-preview-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="カレンダー形式で出力プレビュー">
    <div class="data-preview-card ical-modal-card">
      <div class="data-preview-head">
        <h3 id="ical-modal-title">カレンダー形式で出力 (.ics)</h3>
        <button type="button" class="button size-close-btn" id="ical-modal-close" aria-label="閉じる" style="min-height:30px;padding:0 8px;">${icon('close')}</button>
      </div>
      <div class="data-preview-body" id="ical-modal-body"></div>
      <div class="data-preview-foot">
        <button type="button" class="button secondary" id="ical-modal-cancel">閉じる</button>
        <button type="button" class="button" id="ical-modal-download">${icon('download')}カレンダー形式で出力 (.ics)</button>
      </div>
    </div>
  </div>`;
}

function openRoomLegendsModal() {
  const modal = document.getElementById('room-legends-modal');
  if (!modal) return;
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  document.getElementById('room-legends-close')?.focus?.();
}

function closeRoomLegendsModal() {
  const modal = document.getElementById('room-legends-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  setModalBackdropInert(false);
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

function closeIcalPreviewModal() {
  const modal = document.getElementById('ical-preview-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  setModalBackdropInert(false);
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

async function renderIcalPreviewBody() {
  const titleEl = document.getElementById('ical-modal-title');
  const bodyEl = document.getElementById('ical-modal-body');
  const downloadBtn = document.getElementById('ical-modal-download');
  if (!bodyEl) return;
  const cal = calendarData || FALLBACK_CALENDAR;
  const todayStr = dateKey(new Date());
  const fy = Number(timetableMeta?.fiscalYear) || 2026;
  const term = timetableMeta?.term || '後期';
  const koukiStart = cal.terms?.kouki?.classesStartDate || cal.terms?.kouki?.startDate || `${fy}-09-24`;
  const allEvents = Array.isArray(cal.events) ? cal.events : [];
  const allSubs = Array.isArray(cal.daySubstitutions) ? cal.daySubstitutions : [];
  const lessonWeeksMap = computeAcademicLessonWeeks(cal);

  const sched = selectedSchedule();
  const hasTimetable = !sched.error;
  if (!hasTimetable && icalModalState.includeLessons) {
    icalModalState.includeLessons = false;
  }
  const wantLessons = hasTimetable && Boolean(icalModalState.includeLessons);
  const wantCalendar = Boolean(icalModalState.includeCalendarEvents);

  const filterByPeriod = (period) => {
    if (!period || period === 'all') return { events: allEvents, subs: allSubs };
    const match = (s, e) => {
      if (!s) return false;
      const es = e || s;
      const sm = Number(String(s).slice(5, 7));
      return period === 'zenki' ? (s < koukiStart && sm >= 4) : (es >= koukiStart || sm <= 3);
    };
    return {
      events: allEvents.filter(ev => ev && match(ev.date || ev.startDate, ev.endDate || ev.date)),
      subs: allSubs.filter(sub => sub && match(sub.date, sub.date))
    };
  };

  const { generateIcs, generateCalendarIcs } = await (globalThis.__TIMETABLE_EXPORT_MODULE__ ? Promise.resolve(globalThis.__TIMETABLE_EXPORT_MODULE__) : import('./timetable-export.js'));
  const calPeriod = icalModalState.period || (term === '前期' ? 'zenki' : 'kouki');
  const periodLabel = calPeriod === 'zenki' ? '前期' : (calPeriod === 'kouki' ? '後期' : '通年');
  const filtered = filterByPeriod(calPeriod);

  let previewEvents = [];
  let previewSubs = [];
  let scheduleOverlay = null;
  let rawIcs = '';

  if (titleEl) titleEl.textContent = 'カレンダー形式で出力 (.ics)';

  if (wantCalendar) {
    previewEvents = filtered.events;
    previewSubs = filtered.subs;
  } else if (wantLessons && icalModalState.mode === 'calendar') {
    previewEvents = filtered.events.filter(ev => ev.type === 'holiday');
    previewSubs = filtered.subs;
  }

  if (wantLessons) {
    const semInfo = getActiveSemesterInfo();
    const holidayDates = getExpandedHolidayDates();
    const lessons = sched.selected || [];
    const subMap = new Map();
    for (const s of allSubs) {
      if (!s?.date) continue;
      let eff = Number(s.effectiveDay);
      if (!(eff >= 1 && eff <= 5) && s.substituteDay) {
        const idx = DAYS.indexOf(String(s.substituteDay).replace(/曜日$/, ''));
        if (idx >= 0) eff = idx + 1;
      }
      if (eff >= 1 && eff <= 5) subMap.set(s.date, { effectiveDay: eff });
    }
    const termObj = term === '前期' ? cal.terms?.zenki : cal.terms?.kouki;
    const examEnd = termObj?.examStartDate || semInfo.until;
    scheduleOverlay = {
      lessons,
      mode: icalModalState.mode,
      startDate: semInfo.startDate,
      endDate: icalModalState.mode === 'calendar' ? examEnd : semInfo.until,
      holidaySet: new Set(holidayDates),
      subMap
    };
    rawIcs = generateIcs(lessons, studentLabel(), {
      fiscalYear: fy,
      term,
      semesterInfo: semInfo,
      holidays: holidayDates,
      mode: icalModalState.mode,
      daySubstitutions: allSubs,
      includeCalendarEvents: wantCalendar,
      calendarData: cal,
      calendarPeriod: calPeriod,
      includeExams: true
    });
  } else if (wantCalendar) {
    rawIcs = generateCalendarIcs(cal, { period: calPeriod, includeExams: true });
  }

  const summaryParts = [];
  if (wantLessons) {
    summaryParts.push(`授業時間割（${studentShortLabel()}・${icalModalState.mode === 'calendar' ? '年間予定に準拠' : '単純な4限×5日の繰り返し'}）`);
  }
  if (wantCalendar) {
    summaryParts.push(`年間行事予定（${periodLabel}：行事 ${previewEvents.length}件・振替 ${previewSubs.length}件）`);
  }
  const summaryText = summaryParts.length ? `出力対象: ${summaryParts.join(' ＋ ')}` : '出力対象を1つ以上選択してください。';

  if (downloadBtn) downloadBtn.disabled = !summaryParts.length;

  const profileNoteHtml = hasTimetable
    ? ''
    : ' <button type="button" class="link-btn" id="ical-open-profile-btn" style="font-size:0.85em;margin-left:4px;">所属を設定</button>';

  const optionsHtml = `<div class="ical-options-box">
    <div class="ical-option-row">
      <span class="ical-option-label">出力対象</span>
      <label><input type="checkbox" id="ical-opt-include-lessons"${wantLessons ? ' checked' : ''}${hasTimetable ? '' : ' disabled'}> 自分の授業を含める（${hasTimetable ? escapeHTML(studentShortLabel()) : '所属未設定'}）${profileNoteHtml}</label>
      <label><input type="checkbox" id="ical-opt-include-cal"${wantCalendar ? ' checked' : ''}> 年間行事予定を含める（祝日・試験・振替・行事）</label>
    </div>
    ${wantLessons ? `<div class="ical-option-row">
      <span class="ical-option-label">授業の反映</span>
      <label><input type="radio" name="ical-tt-mode" value="calendar"${icalModalState.mode === 'calendar' ? ' checked' : ''}> 年間予定に準拠（休講日除外・振替授業反映）</label>
      <label><input type="radio" name="ical-tt-mode" value="simple"${icalModalState.mode === 'simple' ? ' checked' : ''}> 単純な4限×5日の繰り返し</label>
    </div>` : ''}
    ${wantCalendar ? `<div class="ical-option-row">
      <span class="ical-option-label">対象期間</span>
      <div class="filter-group">
        <button type="button" class="chip${calPeriod === 'zenki' ? ' active' : ''}" data-ical-period="zenki">前期</button>
        <button type="button" class="chip${calPeriod === 'kouki' ? ' active' : ''}" data-ical-period="kouki">後期</button>
        <button type="button" class="chip${calPeriod === 'all' ? ' active' : ''}" data-ical-period="all">通年</button>
      </div>
    </div>` : ''}
  </div>`;

  const calHtml = renderMonthCalendarGrid({
    year: icalModalState.year,
    month: icalModalState.month,
    events: previewEvents,
    subs: previewSubs,
    todayStr,
    lessonWeeksMap: (wantCalendar || icalModalState.mode === 'calendar') ? lessonWeeksMap : null,
    scheduleOverlay,
    navAttr: 'data-ical-month',
    viewId: 'ical-preview-calendar'
  });

  bodyEl.innerHTML = `
    ${optionsHtml}
    <p class="ical-preview-summary">${escapeHTML(summaryText)}</p>
    ${calHtml}
    <div class="ical-import-help">
      <span>保存した .ics ファイルは iPhone 標準カレンダーや Google カレンダーに取り込めます。</span>
      <button type="button" class="button subtle ical-guide-btn" data-open-guide="./guide/ical.html?embed=1" data-guide-title="カレンダー形式（.ics）の取り込み方法">取り込み手順を見る</button>
    </div>
    <details class="ical-raw-details">
      <summary>生成される .ics データを確認</summary>
      <pre class="preview-code-block" id="ical-preview-code" style="margin-top:8px;">${escapeHTML(rawIcs)}</pre>
    </details>
  `;

  bodyEl.querySelector?.('#ical-open-profile-btn')?.addEventListener('click', () => {
    closeIcalPreviewModal();
    document.getElementById('open-profile-switcher')?.click();
  });
  bodyEl.querySelector?.('#ical-opt-include-lessons')?.addEventListener('change', e => {
    icalModalState.includeLessons = Boolean(e.target.checked);
    renderIcalPreviewBody();
  });
  bodyEl.querySelectorAll?.('input[name="ical-tt-mode"]').forEach(r => {
    r.addEventListener('change', e => {
      if (e.target.checked) {
        icalModalState.mode = e.target.value === 'simple' ? 'simple' : 'calendar';
        renderIcalPreviewBody();
      }
    });
  });
  bodyEl.querySelector?.('#ical-opt-include-cal')?.addEventListener('change', e => {
    icalModalState.includeCalendarEvents = Boolean(e.target.checked);
    renderIcalPreviewBody();
  });
  bodyEl.querySelectorAll?.('[data-ical-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset?.icalPeriod || 'all';
      icalModalState.period = p;
      const [nowY, nowM] = todayStr.slice(0, 7).split('-').map(Number);
      if (p === 'zenki') { icalModalState.year = fy; icalModalState.month = 4; }
      else { icalModalState.year = nowY; icalModalState.month = nowM; }
      renderIcalPreviewBody();
    });
  });
  bodyEl.querySelectorAll?.('[data-ical-month]').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset?.icalMonth);
      if (delta === 0) {
        const [nowY, nowM] = todayStr.slice(0, 7).split('-').map(Number);
        icalModalState.year = nowY;
        icalModalState.month = nowM;
      } else {
        const next = new Date(Date.UTC(icalModalState.year, (icalModalState.month - 1) + delta, 1));
        icalModalState.year = next.getUTCFullYear();
        icalModalState.month = next.getUTCMonth() + 1;
      }
      renderIcalPreviewBody();
    });
  });
}

async function openIcalPreviewModal(source = 'timetable', period = null) {
  const modal = document.getElementById('ical-preview-modal');
  if (!modal) return;
  const todayStr = dateKey(new Date());
  const [nowY, nowM] = todayStr.slice(0, 7).split('-').map(Number);
  const fy = Number(timetableMeta?.fiscalYear) || 2026;
  const hasTimetable = !selectedSchedule().error;
  icalModalState.source = source === 'calendar' ? 'calendar' : 'timetable';
  if (icalModalState.source === 'calendar') {
    icalModalState.includeLessons = false;
    icalModalState.includeCalendarEvents = true;
    icalModalState.period = period || 'all';
    if (icalModalState.period === 'zenki') {
      icalModalState.year = fy;
      icalModalState.month = 4;
    } else {
      icalModalState.year = nowY;
      icalModalState.month = nowM;
    }
  } else {
    icalModalState.includeLessons = hasTimetable;
    icalModalState.includeCalendarEvents = !hasTimetable;
    icalModalState.period = timetableMeta?.term === '前期' ? 'zenki' : 'kouki';
    icalModalState.year = nowY;
    icalModalState.month = nowM;
  }
  await renderIcalPreviewBody();
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  document.getElementById('ical-modal-close')?.focus?.();
}
function setModalBackdropInert(active, activeModal = null) {
  if (typeof document === 'undefined') return;
  const isMobileMenuOpen = typeof document.body?.classList?.contains === 'function' && document.body.classList.contains('menu-open');
  const sidebar = document.getElementById('sidebar');
  const menuToggleEl = document.getElementById('menu-toggle');
  const footer = document.querySelector?.('footer');
  if (menuToggleEl && 'inert' in menuToggleEl) menuToggleEl.inert = Boolean(active);
  if (footer && 'inert' in footer) footer.inert = Boolean(active);
  if (sidebar && 'inert' in sidebar) {
    if (active) sidebar.inert = true;
    else sidebar.inert = Boolean(navMediaQuery?.matches && !isMobileMenuOpen);
  }
  const mainEl = document.getElementById('main');
  if (mainEl && mainEl.children) {
    for (const child of Array.from(mainEl.children)) {
      if (child && 'inert' in child) {
        child.inert = Boolean(active && child !== activeModal);
      }
    }
  }
}
function trapModalFocus(modal, e) {
  if (!modal || modal.hidden || e.key !== 'Tab' || typeof modal.querySelectorAll !== 'function') return;
  const focusables = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hidden && el.offsetParent !== null);
  if (!focusables.length) return;
  const idx = focusables.indexOf(document.activeElement);
  if (e.shiftKey && idx <= 0) {
    e.preventDefault();
    focusables[focusables.length - 1].focus();
  } else if (!e.shiftKey && (idx === -1 || idx === focusables.length - 1)) {
    e.preventDefault();
    focusables[0].focus();
  }
}
function syncSizeControlsUI() {
  document.querySelectorAll('[data-size-mode]').forEach(btn => {
    const active = btn.dataset.sizeMode === exportSizeMode;
    btn.classList.toggle('active', active);
    btn.setAttribute?.('aria-pressed', active ? 'true' : 'false');
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
    if (cellIn) cellIn.max = '320';
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
  const fyLabel = formatFiscalYear(timetableMeta?.fiscalYear || 2026);
  const termLabel = timetableMeta?.term || '後期';
  const updatedText = timetableMeta?.updated || SOURCE?.updated || '2026-09-24';
  const headerRow = document.createElement('div');
  headerRow.className = 'export-header-row';
  headerRow.innerHTML = `
    <div class="export-header-main">
      <div class="export-title" role="heading" aria-level="2">明石高専 ${escapeHTML(fyLabel)}${escapeHTML(termLabel)}時間割</div>
      <span class="export-badge-tag">${escapeHTML(studentLabel())}</span>
      <span class="export-team-tag">Co+work 6班</span>
    </div>
    <div class="export-header-sub">
      <small class="export-pdf-date">PDF参照: ${escapeHTML(updatedText)}</small>
    </div>
  `;
  if (typeof clone.prepend === 'function') clone.prepend(headerRow);
  else if (typeof clone.insertBefore === 'function') clone.insertBefore(headerRow, clone.firstChild || null);
  else clone.append?.(headerRow);

  const scroller = clone.querySelector('.table-scroll');
  if (scroller) scroller.style.cssText = 'overflow:visible;width:100%;max-height:none;';
  const tbl = clone.querySelector('table');
  if (tbl) tbl.style.width = '100%';
  paper.innerHTML = '';
  paper.append(clone);
  applyLiveSheetSize(clone);
  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  syncSizeControlsUI();
  document.getElementById('export-size-close')?.focus?.();
}
function closeSizeAdjustModal() {
  const modal = document.getElementById('export-size-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  setModalBackdropInert(false);
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}
function getExpandedHolidayDates() {
  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const dates = new Set();
  for (const ev of events) {
    if (!ev || !(ev.type === 'holiday' || ev.type === 'break' || ev.type === 'vacation' || ev.hasClasses === false) || ev.type === 'exam') continue;
    const startStr = ev.date || ev.startDate;
    if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) continue;
    const endStr = ev.endDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.endDate) ? ev.endDate : startStr;
    const cur = new Date(`${startStr}T00:00:00Z`);
    const end = new Date(`${endStr}T00:00:00Z`);
    if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) continue;
    let guard = 0;
    while (cur <= end && guard < 120) {
      dates.add(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
      guard++;
    }
  }
  return Array.from(dates);
}
function getActiveSemesterInfo() {
  const term = timetableMeta?.term || '後期';
  const fy = Number(timetableMeta?.fiscalYear) || 2026;
  const termObj = term === '前期' ? calendarData?.terms?.zenki : calendarData?.terms?.kouki;
  const until = termObj?.closingDate || termObj?.endDate || (term === '前期' ? `${fy}-08-07` : `${fy + 1}-02-28`);
  return {
    fiscalYear: fy,
    term,
    startDate: termObj?.classesStartDate || termObj?.startDate,
    until
  };
}
function openExportAdjustModal() {
  if (currentExportFormat === 'pdf' || currentExportFormat === 'png') {
    openSizeAdjustModal();
  } else if (currentExportFormat === 'ics') {
    openIcalPreviewModal('timetable');
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

  const { generateCsv, generateText, generateJson, generateAllLessonsJson, generateIcs } = await import('./timetable-export.js');

  const computePreviewText = () => {
    if (format === 'text') {
      return generateText(lessons, label, { ...textExportOptions, includeEmpty: exportIncludeEmpty, fiscalYear, term });
    }
    if (format === 'csv') {
      return generateCsv(lessons, label, { includeEmpty: exportIncludeEmpty, fiscalYear, term });
    }
    if (format === 'json') {
      return generateJson(lessons, label, updatedDate, { includeEmpty: exportIncludeEmpty, fiscalYear, term });
    }
    if (format === 'all-json') {
      return generateAllLessonsJson(activeLessons, timetableMeta || SOURCE);
    }
    if (format === 'ics') {
      const holidayDates = getExpandedHolidayDates();
      return generateIcs(lessons, label, {
        fiscalYear,
        term,
        semesterInfo: getActiveSemesterInfo(),
        holidays: holidayDates
      });
    }
    return '';
  };

  const refreshPreviewCode = () => {
    const codeEl = document.getElementById('data-preview-code');
    if (codeEl) codeEl.textContent = computePreviewText();
  };

  if (format === 'text') {
    title.textContent = 'テキスト出力プレビュー';
    setBtnContent(copyBtn, 'copy', 'テキストをコピー');
    setBtnContent(actionBtn, 'download', 'テキスト保存');
    body.innerHTML = `
      <div class="data-preview-options">
        <label><input type="checkbox" id="text-opt-location" ${textExportOptions.includeLocation ? 'checked' : ''}> 教室名を含める</label>
        <label><input type="checkbox" id="text-opt-teacher" ${textExportOptions.includeTeacher ? 'checked' : ''}> 担当教員を含める</label>
        <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空き時限を含める</label>
      </div>
      <pre class="preview-code-block" id="data-preview-code">${escapeHTML(computePreviewText())}</pre>
    `;
    document.getElementById('text-opt-location')?.addEventListener('change', e => {
      textExportOptions.includeLocation = e.target.checked;
      refreshPreviewCode();
    });
    document.getElementById('text-opt-teacher')?.addEventListener('change', e => {
      textExportOptions.includeTeacher = e.target.checked;
      refreshPreviewCode();
    });
    document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
      exportIncludeEmpty = e.target.checked;
      refreshPreviewCode();
    });
  } else if (format === 'csv') {
    title.textContent = 'CSV形式プレビュー';
    setBtnContent(copyBtn, 'copy', 'CSVをコピー');
    setBtnContent(actionBtn, 'download', 'CSV保存');
    body.innerHTML = `
      <div class="data-preview-options">
        <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空き時限を含める</label>
      </div>
      <pre class="preview-code-block" id="data-preview-code">${escapeHTML(computePreviewText())}</pre>
    `;
    document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
      exportIncludeEmpty = e.target.checked;
      refreshPreviewCode();
    });
  } else if (format === 'json') {
    title.textContent = 'JSONデータプレビュー';
    setBtnContent(copyBtn, 'copy', 'JSONをコピー');
    setBtnContent(actionBtn, 'download', 'JSON保存');
    body.innerHTML = `
      <div class="data-preview-options">
        <label><input type="checkbox" id="preview-opt-empty" ${exportIncludeEmpty ? 'checked' : ''}> 空き時限を含める</label>
        <button type="button" class="button subtle" id="export-raw-data-btn" style="margin-left:auto;">${icon('download')}全学科原本JSONを保存</button>
      </div>
      <pre class="preview-code-block" id="data-preview-code">${escapeHTML(computePreviewText())}</pre>
    `;
    document.getElementById('preview-opt-empty')?.addEventListener('change', e => {
      exportIncludeEmpty = e.target.checked;
      refreshPreviewCode();
    });
    document.getElementById('export-raw-data-btn')?.addEventListener('click', async () => {
      const { exportAllLessonsJson } = await import('./timetable-export.js');
      exportAllLessonsJson(activeLessons, timetableMeta || SOURCE);
    });
  } else if (format === 'all-json') {
    title.textContent = '全授業データのJSONプレビュー';
    setBtnContent(copyBtn, 'copy', '全授業JSONをコピー');
    setBtnContent(actionBtn, 'download', '全授業JSON保存');
    body.innerHTML = `
      <div class="data-preview-options">
        <span class="muted">全学年・全学科（${activeLessons.length}件）の授業データを出力します。</span>
      </div>
      <pre class="preview-code-block" id="data-preview-code">${escapeHTML(computePreviewText())}</pre>
    `;
  } else if (format === 'ics') {
    title.textContent = 'iCal (.ics) 形式プレビュー';
    setBtnContent(copyBtn, 'copy', 'iCalをコピー');
    setBtnContent(actionBtn, 'download', 'iCal保存 (.ics)');
    body.innerHTML = `<pre class="preview-code-block" id="data-preview-code">${escapeHTML(computePreviewText())}</pre>`;
  }

  lastModalTrigger = document.activeElement || null;
  modal.hidden = false;
  setModalBackdropInert(true, modal);
  document.body.classList.add('size-modal-open');
  document.getElementById('data-preview-close')?.focus?.();
}
function closeDataPreviewModal() {
  const modal = document.getElementById('data-preview-modal');
  const wasOpen = modal && !modal.hidden;
  if (modal) modal.hidden = true;
  setModalBackdropInert(false);
  document.body.classList.remove('size-modal-open');
  if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}
async function downloadCurrentTimetable(action = 'download') {
  if (exportInProgress || selectedSchedule().error) return false;
  const panel = document.getElementById('timetable-sheet');
  if (!panel) return false;
  // 非同期処理中に画面や選択条件が変わっても、押した時点の時間割を保存する。
  const snapshot = panel.cloneNode(true);
  const format = document.getElementById('export-format')?.value || currentExportFormat;
  const fyLabel = formatFiscalYear(timetableMeta?.fiscalYear || 2026);
  const termLabel = timetableMeta?.term || '後期';
  const filename = `${fyLabel}${termLabel}時間割-${studentShortLabel()}`.replace(/[\\/:*?"<>|]/g, '_');
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
  let ok = false;
  try {
    const { exportTimetable } = await import('./timetable-export.js');
    const scheduleResult = selectedSchedule();
    const holidayDates = getExpandedHolidayDates();
    const result = await exportTimetable(snapshot, format, filename, {
      studentLabel: studentLabel(),
      selectedLessons: scheduleResult.selected || [],
      allLessons: activeLessons,
      sourceUrl: timetableMeta?.sourceUrl || SOURCE?.url,
      updated: timetableMeta?.updated || SOURCE?.updated || '2026-09-24',
      fiscalYear: timetableMeta?.fiscalYear || 2026,
      term: timetableMeta?.term || '後期',
      semesterInfo: getActiveSemesterInfo(),
      holidays: holidayDates,
      mode: icalModalState.mode,
      daySubstitutions: Array.isArray(calendarData?.daySubstitutions) ? calendarData.daySubstitutions : [],
      includeCalendarEvents: icalModalState.includeCalendarEvents,
      calendarData: calendarData || FALLBACK_CALENDAR,
      calendarPeriod: icalModalState.period,
      includeExams: icalModalState.includeExams,
      sizeConfig: { ...exportSizeConfig },
      a4Mode: a4ModeEnabled,
      theme: getExportTheme(),
      textOptions: { ...textExportOptions },
      includeEmpty: exportIncludeEmpty,
      action: action
    });
    ok = result?.success !== false;
    if (ok) {
      if (status) {
        status.hidden = true;
        status.textContent = '';
      }
      showToast(action === 'copy'
        ? '時間割をクリップボードにコピーしました。'
        : (format === 'pdf' ? '印刷・PDF保存ダイアログを開きました。' : `${format.toUpperCase()}ファイルを保存しました。`));
    } else {
      if (status) {
        status.hidden = false;
        status.textContent = result?.message || '出力に失敗しました。もう一度お試しください。';
      }
      showToast('出力に失敗しました。もう一度お試しください。');
    }
  } catch (error) {
    console.error('Timetable export failed', error);
    ok = false;
    if (status) {
      status.hidden = false;
      status.textContent = '処理を完了できませんでした。通信状態を確認して、もう一度お試しください。';
    }
    showToast('出力に失敗しました。もう一度お試しください。');
  } finally {
    exportInProgress = false;
    const currentDL = document.getElementById('export-download');
    const currentCopy = document.getElementById('export-copy');
    if (currentDL) {
      currentDL.disabled = Boolean(selectedSchedule().error);
      setBtnContent(currentDL, 'download', EXPORT_FORMAT_CONFIGS[currentExportFormat]?.downloadLabel || '保存');
    }
    if (currentCopy) {
      currentCopy.disabled = Boolean(selectedSchedule().error);
      setBtnContent(currentCopy, 'copy', EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel || 'コピー');
    }
    const select = document.getElementById('export-format');
    if (select) select.disabled = Boolean(selectedSchedule().error);
  }
  return ok;
}
let globalListenersBound = false;
function render() {
  const rawHash = (location.hash.slice(1).split('?')[0].split('/')[0] || 'home').trim();
  const page = Object.hasOwn(names, rawHash) ? rawHash : 'home';
  if (page !== 'links') {
    editingMyLinkId = '';
    myLinksManageMode = false;
  }
  const breadcrumbEl = document.getElementById('breadcrumb');
  if (breadcrumbEl) breadcrumbEl.textContent = names[page];
  document.title = `${names[page]} — 明石高専`;
  document.querySelectorAll('[data-page]').forEach(a => {
    const isActive = a.dataset.page === page;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const footerMeta = document.getElementById('footer-meta');
  if (footerMeta) {
    const fyLabel = formatFiscalYear(timetableMeta?.fiscalYear || 2026);
    const termLabel = timetableMeta?.term || '後期';
    footerMeta.textContent = `${fyLabel}${termLabel}`;
  }
  const main = document.getElementById('main');
  const spotlightActive = page === 'home' && ((!cookieSaved && !firstVisitSpotlightDismissed) || forceSpotlightReplay);
  const showHamburgerStep = isHamburgerMenuVisible();
  const effectiveSpotlightStep = (spotlightStep === 0 && !showHamburgerStep) ? 1 : spotlightStep;
  if (typeof document !== 'undefined') {
    document.body?.classList?.toggle?.('guide-spotlight-active', spotlightActive);
    document.getElementById('menu-toggle')?.classList?.toggle?.('is-spotlight-target', spotlightActive && effectiveSpotlightStep === 0);
    document.getElementById('sidebar')?.classList?.toggle?.('is-spotlight-target', spotlightActive && effectiveSpotlightStep === 0);
  }
  const spotlightCardHtml = spotlightActive
    ? (effectiveSpotlightStep === 0
      ? `<div class="guide-spotlight-card" id="guide-spotlight-card" data-step="0" role="dialog" aria-label="初回案内 1/2" data-export-exclude>
          <div class="guide-spotlight-head">
            <span class="guide-spotlight-step">1 / 2</span>
            <strong>メニューから画面を切り替え</strong>
          </div>
          <p>左上の ≡ ボタンから時間割・年間予定・リンク集へ切り替えられます。</p>
          <div class="guide-spotlight-actions">
            <button type="button" class="guide-spotlight-skip" id="guide-spotlight-skip">スキップ</button>
            <button type="button" class="button" id="guide-spotlight-next">次へ →</button>
          </div>
        </div>`
      : `<div class="guide-spotlight-card" id="guide-spotlight-card" data-step="1" role="dialog" aria-label="初回案内 ${showHamburgerStep ? '2/2' : '1/1'}" data-export-exclude>
          <div class="guide-spotlight-head">
            <span class="guide-spotlight-step">${showHamburgerStep ? '2 / 2' : '1 / 1'}</span>
            <strong>各ページの「使い方」</strong>
          </div>
          <p>操作に迷ったら、画面右上の「使い方」からいつでも確認できます。</p>
          <div class="guide-spotlight-actions">
            <button type="button" class="guide-spotlight-skip" id="guide-spotlight-skip">スキップ</button>
            <button type="button" class="button" id="guide-spotlight-open-help">使い方を開く</button>
          </div>
        </div>`)
    : '';
  const spotlightPointerHtml = spotlightActive
    ? `<div class="guide-spotlight-pointer" id="guide-spotlight-pointer" aria-hidden="true" hidden data-export-exclude><svg viewBox="0 0 24 44"><path d="M12 40V6m0 0-7 8m7-8 7 8"/></svg></div>`
    : '';
  const spotlightBackdrop = spotlightActive
    ? `<div class="guide-spotlight-backdrop" id="guide-spotlight-backdrop" data-export-exclude aria-hidden="true"></div>${spotlightPointerHtml}${spotlightCardHtml}`
    : '';
  const sharedModals = spotlightBackdrop + renderProfileSwitcherModal() + renderIcalPreviewModal() + renderHelpModal() + renderAppendixGuideModal();
  if (main) {
    if (page === 'home') main.innerHTML = home() + sharedModals;
    else if (page === 'timetable') {
      main.innerHTML = timetable() + sharedModals;
      const sheetEl = document.getElementById('timetable-sheet');
      if (sheetEl && !sheetEl.parentElement) {
        const m = main.innerHTML.match(/<section[^>]*id="timetable-sheet"[^>]*>([\s\S]*?)<\/section>/);
        if (m) sheetEl.innerHTML = m[1];
      }
      if (typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth <= 760) {
        const scroller = document.querySelector?.('.table-scroll');
        const todayCol = document.querySelector?.('.real-timetable thead th.is-today-col');
        if (scroller && todayCol && typeof todayCol.offsetLeft === 'number') {
          scroller.scrollLeft = Math.max(0, todayCol.offsetLeft - 72);
        }
      }
    }
    else if (page === 'exam') main.innerHTML = exam() + sharedModals;
    else if (page === 'calendar') main.innerHTML = calendar() + sharedModals;
    else if (page === 'cafeteria') main.innerHTML = cafeteria() + sharedModals;
    else if (page === 'links') main.innerHTML = linksView() + sharedModals;
    if (!globalListenersBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', positionSpotlightPointer);
      window.addEventListener('scroll', positionSpotlightPointer, { passive: true });
    }
    if (spotlightActive) {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(positionSpotlightPointer);
      else positionSpotlightPointer();
    }
    for (const modalId of ['ical-preview-modal', 'room-legends-modal', 'help-modal', 'link-editor-modal', 'appendix-guide-modal']) {
      const mEl = document.getElementById(modalId);
      if (mEl) mEl.hidden = true;
    }
  }
  const formatSelect = document.getElementById('export-format');
  const adjustBtn = document.getElementById('export-adjust-open');

  const syncExportFormatUI = () => {
    const fmt = formatSelect?.value || currentExportFormat;
    currentExportFormat = fmt;
    const cfg = EXPORT_FORMAT_CONFIGS[fmt] || EXPORT_FORMAT_CONFIGS.pdf;
    if (adjustBtn && !exportInProgress) {
      setBtnContent(adjustBtn, 'sliders', cfg.adjustLabel);
    }
    const sizeCopyBtn = document.getElementById('size-modal-copy-btn');
    const sizeSaveBtn = document.getElementById('size-modal-save-btn');
    if (sizeCopyBtn) sizeCopyBtn.hidden = fmt !== 'png';
    if (sizeSaveBtn) setBtnContent(sizeSaveBtn, 'download', cfg.downloadLabel || '保存');
  };

  formatSelect?.addEventListener('change', syncExportFormatUI);
  adjustBtn?.addEventListener('click', () => {
    syncExportFormatUI();
    openExportAdjustModal();
  });
  document.getElementById('size-modal-copy-btn')?.addEventListener('click', () => {
    downloadCurrentTimetable('copy');
  });
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
    const ok = await downloadCurrentTimetable('copy');
    const previewCopy = document.getElementById('data-preview-copy');
    if (previewCopy) {
      const origHtml = previewCopy.innerHTML;
      if (ok) {
        setBtnContent(previewCopy, 'check', 'コピー完了');
        previewCopy.classList?.add('btn-success');
      } else {
        setBtnContent(previewCopy, 'alert', 'コピー失敗');
      }
      const timer = setTimeout(() => {
        previewCopy.innerHTML = origHtml;
        previewCopy.classList?.remove('btn-success');
      }, 1500);
      timer?.unref?.();
    }
  });
  document.getElementById('data-preview-action')?.addEventListener('click', () => {
    closeDataPreviewModal();
    downloadCurrentTimetable('download');
  });


  // 使い方ガイドモーダル & 初回ライトアップツアー
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-open-help]').forEach(btn => {
      btn.addEventListener('click', () => {
        openHelpModal(btn.dataset?.openHelp || 'home');
      });
    });
  }
  const spotlightNextBtn = document.getElementById('guide-spotlight-next');
  if (spotlightNextBtn && !spotlightNextBtn.dataset?.spotlightNextBound) {
    if (spotlightNextBtn.dataset) spotlightNextBtn.dataset.spotlightNextBound = '1';
    spotlightNextBtn.addEventListener('click', () => {
      spotlightStep = 1;
      render();
    });
  }
  const spotlightOpenHelpBtn = document.getElementById('guide-spotlight-open-help');
  if (spotlightOpenHelpBtn && !spotlightOpenHelpBtn.dataset?.spotlightHelpBound) {
    if (spotlightOpenHelpBtn.dataset) spotlightOpenHelpBtn.dataset.spotlightHelpBound = '1';
    spotlightOpenHelpBtn.addEventListener('click', () => {
      openHelpModal('home');
    });
  }
  const spotlightSkipBtn = document.getElementById('guide-spotlight-skip');
  if (spotlightSkipBtn && !spotlightSkipBtn.dataset?.spotlightSkipBound) {
    if (spotlightSkipBtn.dataset) spotlightSkipBtn.dataset.spotlightSkipBound = '1';
    spotlightSkipBtn.addEventListener('click', dismissHelpSpotlight);
  }
  document.getElementById('help-modal-close')?.addEventListener('click', closeHelpModal);
  document.getElementById('help-modal-ok')?.addEventListener('click', closeHelpModal);
  document.getElementById('help-replay-tour')?.addEventListener('click', () => {
    closeHelpModal();
    firstVisitSpotlightDismissed = false;
    forceSpotlightReplay = true;
    spotlightStep = 0;
    if (location.hash !== '#home') location.hash = '#home';
    else render();
  });
  document.getElementById('help-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeHelpModal();
  });
  document.getElementById('appendix-guide-close')?.addEventListener('click', closeAppendixGuideModal);
  document.getElementById('appendix-guide-ok')?.addEventListener('click', closeAppendixGuideModal);
  document.getElementById('appendix-guide-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAppendixGuideModal();
  });

  // 教室略称モーダル
  document.getElementById('open-room-legends-modal')?.addEventListener('click', openRoomLegendsModal);
  document.getElementById('room-legends-close')?.addEventListener('click', closeRoomLegendsModal);
  document.getElementById('room-legends-cancel')?.addEventListener('click', closeRoomLegendsModal);
  document.getElementById('room-legends-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeRoomLegendsModal();
  });

  // 共通 iCal プレビュー＆出力モーダル
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-open-ical-preview]').forEach(btn => {
      btn.addEventListener('click', () => {
        const spec = String(btn.dataset?.openIcalPreview || 'calendar:all');
        const [src, per] = spec.split(':');
        openIcalPreviewModal(src || 'calendar', per || 'all');
      });
    });
  }
  document.getElementById('ical-modal-close')?.addEventListener('click', closeIcalPreviewModal);
  document.getElementById('ical-modal-cancel')?.addEventListener('click', closeIcalPreviewModal);
  document.getElementById('ical-preview-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeIcalPreviewModal();
  });
  async function executeIcalModalExport(action) {
    const sched = selectedSchedule();
    const wantLessons = !sched.error && Boolean(icalModalState.includeLessons);
    const wantCalendar = Boolean(icalModalState.includeCalendarEvents);
    if (!wantLessons && !wantCalendar) return false;
    const { exportTimetable, exportCalendarIcs } = await import('./timetable-export.js');
    const cal = calendarData || FALLBACK_CALENDAR;
    const fy = Number(timetableMeta?.fiscalYear) || 2026;
    const fyLabel = formatFiscalYear(fy);
    const term = timetableMeta?.term || '後期';
    const calPeriod = icalModalState.period || (term === '前期' ? 'zenki' : 'kouki');
    if (wantLessons) {
      const filename = `${fyLabel}${term}時間割-${studentShortLabel()}`.replace(/[\\/:*?"<>|]/g, '_');
      const res = await exportTimetable(null, 'ics', filename, {
        studentLabel: studentLabel(),
        selectedLessons: sched.selected || [],
        updated: timetableMeta?.updated || SOURCE?.updated || '2026-09-24',
        fiscalYear: fy,
        term,
        semesterInfo: getActiveSemesterInfo(),
        holidays: getExpandedHolidayDates(),
        mode: icalModalState.mode,
        daySubstitutions: Array.isArray(cal?.daySubstitutions) ? cal.daySubstitutions : [],
        includeCalendarEvents: wantCalendar,
        calendarData: cal,
        calendarPeriod: calPeriod,
        includeExams: icalModalState.includeExams,
        action
      });
      const ok = res?.success !== false;
      if (ok) {
        showToast(action === 'copy'
          ? 'カレンダーをクリップボードにコピーしました。'
          : 'カレンダー (.ics) ファイルを保存しました。');
      }
      return ok;
    }
    const res = await exportCalendarIcs(cal, `akashi-calendar-${fy}-${calPeriod}`, {
      period: calPeriod,
      includeExams: true,
      action
    });
    const ok = res?.success !== false;
    if (ok) {
      showToast(action === 'copy'
        ? '年間行事予定のカレンダーテキストをコピーしました。'
        : '年間行事予定 (.ics) ファイルを保存しました。');
    }
    return ok;
  }

  document.getElementById('ical-modal-download')?.addEventListener('click', async () => {
    const ok = await executeIcalModalExport('download');
    if (ok) closeIcalPreviewModal();
  });

  // リンク集：アイコンのみ切替・編集モード切替・初期設定に戻す
  const iconOnlyBtn = document.getElementById('links-icon-only-toggle');
  if (iconOnlyBtn && !iconOnlyBtn.dataset?.iconOnlyBound) {
    if (iconOnlyBtn.dataset) iconOnlyBtn.dataset.iconOnlyBound = '1';
    iconOnlyBtn.addEventListener('click', () => {
      toggleLinksIconOnly();
      render();
    });
  }
  const manageToggleBtn = document.getElementById('mylinks-manage-toggle');
  if (manageToggleBtn && !manageToggleBtn.dataset?.manageBound) {
    if (manageToggleBtn.dataset) manageToggleBtn.dataset.manageBound = '1';
    manageToggleBtn.addEventListener('click', () => {
      myLinksManageMode = !myLinksManageMode;
      if (!myLinksManageMode) editingMyLinkId = '';
      render();
    });
  }
  const restoreDefaultsBtn = document.getElementById('links-restore-defaults');
  if (restoreDefaultsBtn && !restoreDefaultsBtn.dataset?.restoreBound) {
    if (restoreDefaultsBtn.dataset) restoreDefaultsBtn.dataset.restoreBound = '1';
    restoreDefaultsBtn.addEventListener('click', () => {
      const snapshot = cloneLinksState(loadLinksState());
      lastLinksSnapshot = snapshot;
      restoreDefaultLinks();
      render();
      showToast('標準リンクを初期状態に戻しました。', {
        undoLabel: '元に戻す',
        onUndo: () => {
          if (!lastLinksSnapshot) return;
          saveLinksState(lastLinksSnapshot);
          lastLinksSnapshot = null;
          render();
          showToast('操作を取り消しました。');
        }
      });
    });
  }
  const linkModalCloseBtn = document.getElementById('link-modal-close');
  if (linkModalCloseBtn && !linkModalCloseBtn.dataset?.modalCloseBound) {
    if (linkModalCloseBtn.dataset) linkModalCloseBtn.dataset.modalCloseBound = '1';
    linkModalCloseBtn.addEventListener('click', closeLinkEditorModal);
  }
  const linkModalCancelBtn = document.getElementById('link-modal-cancel');
  if (linkModalCancelBtn && !linkModalCancelBtn.dataset?.modalCancelBound) {
    if (linkModalCancelBtn.dataset) linkModalCancelBtn.dataset.modalCancelBound = '1';
    linkModalCancelBtn.addEventListener('click', closeLinkEditorModal);
  }
  const linkEditorOverlay = document.getElementById('link-editor-modal');
  if (linkEditorOverlay && !linkEditorOverlay.dataset?.backdropBound) {
    if (linkEditorOverlay.dataset) linkEditorOverlay.dataset.backdropBound = '1';
    linkEditorOverlay.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeLinkEditorModal();
    });
  }
  const linkModalDeleteBtn = document.getElementById('link-modal-delete-btn');
  if (linkModalDeleteBtn && !linkModalDeleteBtn.dataset?.modalDeleteBound) {
    if (linkModalDeleteBtn.dataset) linkModalDeleteBtn.dataset.modalDeleteBound = '1';
    linkModalDeleteBtn.addEventListener('click', () => {
      const id = editingMyLinkId;
      if (!id) return;
      const item = getResolvedLinks(studentSelection).find(x => x.id === id);
      const snapshot = cloneLinksState(loadLinksState());
      lastLinksSnapshot = snapshot;
      closeLinkEditorModal();
      if (DEFAULT_LINK_IDS.has(id)) {
        hideDefaultLink(id);
      } else {
        deleteMyLink(id);
      }
      render();
      if (item) {
        showToast(`「${item.name}」を${item.isDefault ? '非表示に' : '削除'}しました。`, {
          undoLabel: '元に戻す',
          onUndo: () => {
            if (!lastLinksSnapshot) return;
            saveLinksState(lastLinksSnapshot);
            lastLinksSnapshot = null;
            render();
            showToast('操作を取り消しました。');
          }
        });
      }
    });
  }

  // 教室略称タップ展開ポップオーバー
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('.lesson-location-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pop = document.getElementById('room-legend-popover');
        const txt = document.getElementById('room-legend-popover-text');
        const raw = btn.dataset?.roomRaw || '';
        const full = btn.dataset?.roomFull || expandRoomLegend(raw);
        if (pop && txt) {
          txt.innerHTML = `<strong>${escapeHTML(raw)}</strong> — ${escapeHTML(full)}`;
          pop.hidden = false;
        }
      });
    });
  }
  document.getElementById('room-legend-close')?.addEventListener('click', () => {
    const pop = document.getElementById('room-legend-popover');
    if (pop) pop.hidden = true;
  });

  // 定期試験検索入力
  document.getElementById('exam-search-input')?.addEventListener('input', e => {
    const q = String(e.target?.value || '').trim().toLowerCase();
    const badgeEl = document.getElementById('exam-count-badge');
    const emptyEl = document.getElementById('exam-search-empty');
    if (typeof document.querySelectorAll === 'function') {
      const cards = Array.from(document.querySelectorAll('.exam-card:not(.exam-card-empty)'));
      let visibleCount = 0;
      cards.forEach(card => {
        const txt = String(card.textContent || '').toLowerCase();
        const show = !q || txt.includes(q);
        if (card.style) card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      const totalCount = Number(badgeEl?.dataset?.total || cards.length);
      if (badgeEl) badgeEl.textContent = q ? `${visibleCount}/${totalCount}件` : `${totalCount}件`;
      if (emptyEl) emptyEl.hidden = !(q && cards.length > 0 && visibleCount === 0);
    }
  });

  // リンク追加・編集フォーム送信（モーダル内）
  const myLinkForm = document.getElementById('mylink-form');
  if (myLinkForm && !myLinkForm.dataset?.formBound) {
    if (myLinkForm.dataset) myLinkForm.dataset.formBound = '1';
    myLinkForm.addEventListener('submit', e => {
      e.preventDefault();
      const nameInput = document.getElementById('mylink-name');
      const urlInput = document.getElementById('mylink-url');
      const errEl = document.getElementById('mylink-error');
      const isEdit = linkModalMode === 'edit' && Boolean(editingMyLinkId);
      const res = isEdit
        ? updateMyLink(editingMyLinkId, { name: nameInput?.value, url: urlInput?.value })
        : addMyLink({ name: nameInput?.value, url: urlInput?.value });
      if (!res.success) {
        if (errEl) {
          errEl.textContent = res.error || (isEdit ? 'リンクを更新できませんでした。' : 'リンクを追加できませんでした。');
          errEl.hidden = false;
        }
        return;
      }
      closeLinkEditorModal();
      render();
      showToast(isEdit ? `「${res.item?.name || 'リンク'}」を更新しました。` : `「${res.item?.name || 'リンク'}」を追加しました。`);
    });
  }
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-dash-offset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset?.dashOffset);
        dashboardOffsetDays = val === 0 ? 0 : (dashboardOffsetDays + val);
        render();
      });
    });
    document.querySelectorAll('[data-cal-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset?.calJump || 'today';
        const todayStr = dateKey(new Date());
        const [curY, curM] = todayStr.slice(0, 7).split('-').map(Number);
        const fy = Number(timetableMeta?.fiscalYear) || 2026;
        if (calendarViewMode === 'month') {
          if (target === 'zenki') {
            calendarMonthOffset = (fy - curY) * 12 + (4 - curM);
          } else if (target === 'kouki') {
            calendarMonthOffset = (fy - curY) * 12 + (9 - curM);
          } else {
            calendarMonthOffset = 0;
          }
          render();
          return;
        }
        const list = document.getElementById('calendar-timeline-list');
        if (!list?.querySelector) return;
        let anchor = null;
        if (target === 'zenki') {
          anchor = document.getElementById('cal-anchor-zenki');
        } else if (target === 'kouki') {
          anchor = document.getElementById('cal-anchor-kouki');
        } else if (target === 'current') {
          const monthPrefix = todayStr.slice(0, 7);
          anchor = Array.from(list.querySelectorAll('.calendar-event-item[data-date]'))
            .find(li => (li.dataset?.date || '').startsWith(monthPrefix) && li.style?.display !== 'none')
            || Array.from(list.querySelectorAll('.calendar-event-item[data-date]'))
            .find(li => (li.dataset?.date || '') >= `${monthPrefix}-01` && li.style?.display !== 'none');
        } else {
          anchor = list.querySelector('.calendar-event-item.is-today')
            || Array.from(list.querySelectorAll('.calendar-event-item[data-date]'))
            .find(li => (li.dataset?.date || '') >= todayStr && li.style?.display !== 'none');
        }
        anchor?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      });
    });
    document.querySelectorAll('[data-cal-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ds = btn.dataset?.calSelect || '';
        if (!ds) return;
        calendarSelectedDate = ds;
        render();
      });
    });
    document.querySelectorAll('[data-cal-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        calendarViewMode = btn.dataset?.calView === 'month' ? 'month' : 'list';
        render();
      });
    });
    document.querySelectorAll('[data-cal-month]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset?.calMonth);
        calendarMonthOffset = delta === 0 ? 0 : (calendarMonthOffset + delta);
        calendarSelectedDate = '';
        render();
      });
    });
    document.querySelectorAll('[data-allergen-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset?.allergenChip || '';
        selectedAllergenFilter = (val && selectedAllergenFilter === val) ? '' : val;
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
  }
  document.getElementById('calendar-hide-past-btn')?.addEventListener('click', () => {
    calendarHidePast = !calendarHidePast;
    render();
  });
  document.getElementById('calendar-jump-today')?.addEventListener('click', () => {
    if (calendarViewMode === 'month') {
      calendarMonthOffset = 0;
      render();
      return;
    }
    const list = document.getElementById('calendar-timeline-list');
    if (!list?.querySelector) return;
    const todayStr = dateKey(new Date());
    const todayItem = list.querySelector('.calendar-event-item.is-today')
      || Array.from(list.querySelectorAll('.calendar-event-item[data-date]')).find(li => (li.dataset?.date || '') >= todayStr && li.style?.display !== 'none');
    todayItem?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('calendar-search-input')?.addEventListener('input', e => {
    calendarSearchQuery = String(e.target?.value || '');
    const q = calendarSearchQuery.trim().toLowerCase();
    const badgeEl = document.getElementById('calendar-count-badge');
    const items = Array.from(document.querySelectorAll('#calendar-timeline-list .calendar-event-item'));
    let shown = 0;
    items.forEach(item => {
      const hit = !q || String(item.textContent || '').toLowerCase().includes(q);
      if (item.style) item.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    if (badgeEl) badgeEl.textContent = `${shown}件の行事`;
  });
  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-open-link-add]').forEach(btn => {
      if (btn.dataset?.addOpenBound) return;
      if (btn.dataset) btn.dataset.addOpenBound = '1';
      btn.addEventListener('click', () => openLinkEditorModal('add'));
    });
    document.querySelectorAll('[data-edit-id]').forEach(btn => {
      if (btn.dataset?.editOpenBound) return;
      if (btn.dataset) btn.dataset.editOpenBound = '1';
      btn.addEventListener('click', () => {
        const id = btn.dataset?.editId || '';
        if (id) openLinkEditorModal('edit', id);
      });
    });
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.dataset?.presetBound) return;
      if (btn.dataset) btn.dataset.presetBound = '1';
      btn.addEventListener('click', () => {
        const name = btn.dataset?.presetName || btn.textContent?.trim();
        const url = btn.dataset?.presetUrl || '';
        if (name && url) {
          const res = addMyLink({ name, url });
          if (res?.success) {
            closeLinkEditorModal();
            render();
            showToast(`「${name}」を追加しました。`);
          }
        }
      });
    });
    document.querySelectorAll('.mylink-move-btn').forEach(btn => {
      if (btn.dataset?.moveBound) return;
      if (btn.dataset) btn.dataset.moveBound = '1';
      btn.addEventListener('click', e => {
        e?.stopPropagation?.();
        const id = btn.dataset?.moveId;
        const dir = btn.dataset?.dir;
        if (id && dir) {
          reorderMyLink(id, dir);
          render();
          const escId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/"/g, '\\"');
          const sameBtn = document.querySelector?.(`.mylink-move-btn[data-move-id="${escId}"][data-dir="${dir}"]`);
          const fallbackBtn = document.querySelector?.(`.mylink-move-btn[data-move-id="${escId}"]`);
          (sameBtn && !sameBtn.disabled ? sameBtn : fallbackBtn)?.focus?.({ preventScroll: true });
        }
      });
    });
    document.querySelectorAll('.mylink-remove-btn').forEach(btn => {
      if (btn.dataset?.removeBound) return;
      if (btn.dataset) btn.dataset.removeBound = '1';
      btn.addEventListener('click', e => {
        e?.stopPropagation?.();
        const id = btn.dataset?.removeId;
        if (id) {
          const snapshot = cloneLinksState(loadLinksState());
          const prevLinks = snapshot.custom;
          const idx = prevLinks.findIndex(l => l.id === id);
          const removedItem = idx >= 0 ? { ...prevLinks[idx] } : null;
          deleteMyLink(id);
          if (editingMyLinkId === id) editingMyLinkId = '';
          render();
          if (removedItem) {
            lastDeletedMyLink = { item: removedItem, index: idx };
            lastLinksSnapshot = snapshot;
            showToast(`「${removedItem.name}」を削除しました。`, {
              undoLabel: '元に戻す',
              onUndo: () => {
                if (lastLinksSnapshot) {
                  saveLinksState(lastLinksSnapshot);
                  lastLinksSnapshot = null;
                  lastDeletedMyLink = null;
                } else if (lastDeletedMyLink) {
                  restoreMyLink(lastDeletedMyLink.item, lastDeletedMyLink.index);
                  lastDeletedMyLink = null;
                }
                render();
                showToast('削除を取り消しました。');
              }
            });
          }
        }
      });
    });
    document.querySelectorAll('.link-hide-btn').forEach(btn => {
      if (btn.dataset?.hideBound) return;
      if (btn.dataset) btn.dataset.hideBound = '1';
      btn.addEventListener('click', e => {
        e?.stopPropagation?.();
        const id = btn.dataset?.hideId;
        if (id && DEFAULT_LINK_IDS.has(id)) {
          const snapshot = cloneLinksState(loadLinksState());
          const item = getResolvedLinks(studentSelection, snapshot).find(x => x.id === id);
          hideDefaultLink(id);
          if (editingMyLinkId === id) editingMyLinkId = '';
          render();
          if (item) {
            lastLinksSnapshot = snapshot;
            showToast(`「${item.name}」を非表示にしました。`, {
              undoLabel: '元に戻す',
              onUndo: () => {
                if (!lastLinksSnapshot) return;
                saveLinksState(lastLinksSnapshot);
                lastLinksSnapshot = null;
                render();
                showToast('非表示を取り消しました。');
              }
            });
          }
        }
      });
    });
    document.querySelectorAll('[data-drag-id]').forEach(el => {
      if (el.dataset?.dragBound) return;
      if (el.dataset) el.dataset.dragBound = '1';
      el.addEventListener('dragstart', e => {
        dragLinkId = el.dataset?.dragId || '';
        el.classList?.add('is-dragging');
        if (e?.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', dragLinkId); } catch {}
        }
      });
      el.addEventListener('dragend', () => {
        dragLinkId = '';
        document.querySelectorAll?.('.is-dragging, .is-drag-over').forEach(n => {
          n.classList?.remove('is-dragging', 'is-drag-over');
        });
      });
      el.addEventListener('dragover', e => {
        const targetId = el.dataset?.dragId || '';
        if (!dragLinkId || !targetId || dragLinkId === targetId) return;
        e?.preventDefault?.();
        if (e?.dataTransfer) e.dataTransfer.dropEffect = 'move';
        el.classList?.add('is-drag-over');
      });
      el.addEventListener('dragleave', () => {
        el.classList?.remove('is-drag-over');
      });
      el.addEventListener('drop', e => {
        e?.preventDefault?.();
        el.classList?.remove('is-drag-over');
        const targetId = el.dataset?.dragId || '';
        if (!dragLinkId || !targetId || dragLinkId === targetId) return;
        reorderUnifiedLinkByDrop(dragLinkId, targetId);
        dragLinkId = '';
        render();
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
  const closeProfileModal = () => {
    const modal = document.getElementById('profile-switcher-modal');
    const wasOpen = modal && !modal.hidden;
    if (modal) modal.hidden = true;
    setModalBackdropInert(false);
    document.body.classList.remove('size-modal-open');
    if (wasOpen && lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
      lastModalTrigger.focus();
      lastModalTrigger = null;
    }
  };
  const syncProfileModalValidation = () => {
    const statusEl = document.getElementById('profile-modal-status');
    const saveBtn = document.getElementById('profile-modal-save');
    const needsCourse = Number(draftProfile.grade) < 6 && Number(draftProfile.grade) >= 4 && draftProfile.department === 'E' && !draftProfile.course;
    if (statusEl) {
      statusEl.hidden = !needsCourse;
      statusEl.textContent = needsCourse ? '4・5年生のE科はコース（ED・EJ）を選択してください。' : '';
    }
    if (saveBtn) saveBtn.disabled = Boolean(needsCourse);
  };
  const updateProfileModalFieldsInPlace = (changedKey) => {
    const wrap = document.getElementById('profile-modal-fields');
    if (!wrap) return;
    const isAdv = Number(draftProfile.grade) >= 6;
    const needsCourse = !isAdv && Number(draftProfile.grade) >= 4 && draftProfile.department === 'E';
    const deptSel = document.getElementById('modal-student-department');
    const clsSel = document.getElementById('modal-student-classGroup');
    const typeSel = document.getElementById('modal-student-studentType');
    const courseSel = document.getElementById('modal-student-course');
    const artsSel = document.getElementById('modal-student-arts');
    if (changedKey === 'grade' && deptSel) {
      const deptOptions = isAdv
        ? ADVANCED_DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || d])
        : DEPARTMENTS.map(d => [d, DEPARTMENT_NAMES[d] || `${d}科`]);
      const labelNode = deptSel.parentElement?.firstChild;
      if (labelNode && labelNode.nodeType === 3) labelNode.nodeValue = isAdv ? '専攻' : '学科';
      deptSel.innerHTML = deptOptions.map(([v, l]) => `<option value="${escapeHTML(v)}"${String(v) === String(draftProfile.department) ? ' selected' : ''}>${escapeHTML(l)}</option>`).join('');
      deptSel.value = String(draftProfile.department);
    }
    if (clsSel) {
      clsSel.disabled = Boolean(isAdv || Number(draftProfile.grade) >= 3);
      clsSel.value = String(draftProfile.classGroup);
    }
    if (typeSel) {
      typeSel.disabled = Boolean(isAdv);
      typeSel.value = String(draftProfile.studentType);
    }
    if (courseSel) {
      courseSel.disabled = Boolean(isAdv || !needsCourse);
      courseSel.value = String(draftProfile.course || '');
    }
    if (artsSel?.parentElement) {
      artsSel.parentElement.hidden = !(!isAdv && Number(draftProfile.grade) === 1);
      artsSel.disabled = Boolean(isAdv || Number(draftProfile.grade) !== 1);
      artsSel.value = String(draftProfile.arts || 'music');
    } else if (!isAdv && Number(draftProfile.grade) === 1) {
      renderProfileModalFields(true);
      return;
    }
    syncProfileModalValidation();
  };
  const renderProfileModalFields = (forceRebuild = false) => {
    const wrap = document.getElementById('profile-modal-fields');
    if (!wrap) return;
    if (!draftProfile) draftProfile = { ...studentSelection };
    if (!forceRebuild && document.getElementById('modal-student-grade')) {
      syncProfileModalValidation();
      return;
    }
    wrap.innerHTML = buildStudentFilterControls(draftProfile, 'modal-student', 'data-modal-student');
    syncProfileModalValidation();
    wrap.querySelectorAll?.('[data-modal-student]').forEach(sel => {
      sel.addEventListener('change', e => {
        const key = e.target.dataset.modalStudent;
        const val = key === 'grade' ? Number(e.target.value) : e.target.value;
        if (!SELECTION_VALUES[key]?.includes(val)) return;
        draftProfile[key] = val;
        if (key === 'grade') {
          const isAdv = val >= 6;
          if (isAdv && !ADVANCED_DEPARTMENTS.includes(draftProfile.department)) draftProfile.department = 'ME';
          else if (!isAdv && !DEPARTMENTS.includes(draftProfile.department)) draftProfile.department = 'M';
        }
        updateProfileModalFieldsInPlace(key);
      });
    });
  };
  const openProfileModal = () => {
    const modal = document.getElementById('profile-switcher-modal');
    if (!modal) return;
    dismissHelpSpotlight();
    draftProfile = { ...studentSelection };
    renderProfileModalFields(true);
    lastModalTrigger = document.activeElement || null;
    modal.hidden = false;
    setModalBackdropInert(true, modal);
    document.body.classList.add('size-modal-open');
    document.getElementById('modal-student-grade')?.focus?.();
  };
  const profileTriggers = new Set([
    ...(typeof document.querySelectorAll === 'function' ? document.querySelectorAll('.profile-switch-trigger') : []),
    document.getElementById('open-profile-switcher'),
    document.getElementById('onboarding-switch-btn')
  ].filter(Boolean));
  profileTriggers.forEach(btn => {
    if (btn.dataset?.profileOpenBound) return;
    if (btn.dataset) btn.dataset.profileOpenBound = '1';
    btn.addEventListener?.('click', openProfileModal);
  });
  document.getElementById('onboarding-dismiss')?.addEventListener('click', () => {
    onboardingDismissed = true;
    render();
  });
  document.getElementById('profile-modal-close')?.addEventListener('click', closeProfileModal);
  document.getElementById('profile-modal-cancel')?.addEventListener('click', closeProfileModal);
  document.getElementById('profile-switcher-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeProfileModal();
  });
  document.getElementById('profile-modal-save')?.addEventListener('click', () => {
    studentSelection = sanitizeSelection(draftProfile || studentSelection);
    onboardingDismissed = true;
    filterOpen = false;
    saveSelectionCookie();
    closeProfileModal();
    render();
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
    document.addEventListener?.('click', e => {
      const btn = e.target?.closest?.('[data-open-guide]');
      if (!btn) return;
      const url = btn.dataset?.openGuide;
      const titleText = btn.dataset?.guideTitle || '操作ガイド';
      if (url) openAppendixGuideModal(url, titleText);
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const appendixEl = document.getElementById('appendix-guide-modal');
        if (appendixEl && !appendixEl.hidden) {
          closeAppendixGuideModal();
          return;
        }
        closeDataPreviewModal();
        closeIcalPreviewModal();
        closeRoomLegendsModal();
        closeHelpModal();
        closeLinkEditorModal();
        closeSizeAdjustModal();
        const pm = document.getElementById('profile-switcher-modal');
        if (pm && !pm.hidden) {
          pm.hidden = true;
          setModalBackdropInert(false);
          document.body.classList.remove('size-modal-open');
          if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
            lastModalTrigger.focus();
            lastModalTrigger = null;
          }
        }
        return;
      }
      if (e.key === 'Tab') {
        const openModal = getOpenModalEl();
        if (openModal) trapModalFocus(openModal, e);
        return;
      }
      if (getOpenModalEl()) return;
      const target = e.target || document.activeElement;
      const tag = String(target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-6]$/.test(String(e.key || ''))) {
        const routes = [
          'home',
          'timetable',
          ...(FEATURE_FLAGS.exam ? ['exam'] : []),
          'calendar',
          ...(FEATURE_FLAGS.cafeteria ? ['cafeteria'] : []),
          'links'
        ];
        const nextRoute = routes[Number(e.key) - 1];
        if (nextRoute) {
          e.preventDefault?.();
          location.hash = `#${nextRoute}`;
        }
        return;
      }
      if (e.key === '/' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const searchEl = document.getElementById('calendar-search-input')
          || document.getElementById('exam-search-input');
        if (searchEl && !searchEl.disabled && !searchEl.hidden && typeof searchEl.focus === 'function') {
          e.preventDefault?.();
          searchEl.focus();
        }
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
    } else if (mode === 'web') {
      a4ModeEnabled = false;
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
    if (typeof window === 'undefined' || typeof window.innerWidth !== 'number' || window.innerWidth > 760) {
      document.getElementById(id)?.focus({preventScroll:true});
    }
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
  if (modalThemeBtn) setBtnContent(modalThemeBtn, expTheme === 'dark' ? 'sun' : 'moon', expTheme === 'dark' ? '白背景で出力' : '暗背景で出力');
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
