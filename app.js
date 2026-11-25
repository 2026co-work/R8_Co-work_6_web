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
};
const names={home:'ホーム',timetable:'時間割',exam:'定期試験',calendar:'年間予定',cafeteria:'食堂メニュー',links:'リンク'};
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
  pdf: { copyLabel: null, downloadLabel: 'PDF保存', adjustLabel: 'レイアウト調整' },
  png: { copyLabel: '画像をコピー', downloadLabel: 'PNG保存', adjustLabel: 'レイアウト調整' },
  ics: { copyLabel: 'iCalをコピー', downloadLabel: 'iCal保存 (.ics)', adjustLabel: 'プレビュー' },
  text: { copyLabel: 'テキストをコピー', downloadLabel: 'テキスト保存', adjustLabel: 'プレビュー' },
  csv: { copyLabel: 'CSVをコピー', downloadLabel: 'CSV保存', adjustLabel: 'プレビュー' },
  json: { copyLabel: 'JSONをコピー', downloadLabel: 'JSON保存', adjustLabel: 'プレビュー' },
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
    { date: '2026-04-08', substituteDay: '月', weekNumber: 1, note: '水曜日に月曜授業を実施' },
    { date: '2026-10-14', originalDay: 3, effectiveDay: 1, substituteDay: '月', weekNumber: 3, note: '水曜日に月曜授業を実施' },
    { date: '2026-11-04', substituteDay: '月', weekNumber: 5, note: '水曜日に月曜授業を実施' },
    { date: '2027-01-12', substituteDay: '月', weekNumber: 13, note: '火曜日に月曜授業を実施' }
  ],
  events: [
    { date: '2026-04-03', title: '入学式', hasClasses: false, type: 'ceremony' },
    { date: '2026-04-07', title: '前期授業開始・全校集会', hasClasses: true, type: 'academic' },
    { date: '2026-04-23', title: '開校記念日', hasClasses: true, type: 'academic' },
    { date: '2026-07-30', endDate: '2026-08-05', title: '前期期末試験', hasClasses: false, type: 'exam' },
    { date: '2026-08-08', endDate: '2026-09-23', title: '夏季休業', hasClasses: false, type: 'vacation' },
    { date: '2026-09-24', title: '後期授業開始・全校集会', hasClasses: true, type: 'academic' },
    { date: '2026-10-12', title: 'スポーツの日', hasClasses: false, type: 'holiday' },
    { date: '2026-10-31', endDate: '2026-11-01', title: '高専祭', hasClasses: false, type: 'event' },
    { date: '2026-12-26', endDate: '2027-01-04', title: '冬季休業', hasClasses: false, type: 'vacation' },
    { date: '2027-02-02', endDate: '2027-02-08', title: '学年末試験（後期期末試験）', hasClasses: false, type: 'exam' },
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
let calendarSearchQuery = '';
let calendarHidePast = false;
let calendarViewMode = 'list';
let calendarMonthOffset = 0;
let selectedAllergenFilter = '';

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
    field('留学生区分', 'studentType', [['regular', '一般学生'], ['international', '留学生']], isAdvanced) +
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

  if (!isSubstituted && (effectiveDay === 0 || effectiveDay === 6 || holidayEv)) {
    const restLabel = holidayEv?.title || holidayEv?.name || '休業日';
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">
            ${navControls}
            <span class="badge yellow">${escapeHTML(restLabel)}</span>
          </div>
        </div>
        <div class="dashboard-rest-card">
          <p><strong>${escapeHTML(todayDateStr)}</strong> — ${escapeHTML(restLabel)}（授業予定なし）</p>
          <a class="button" href="#timetable">${icon('calendar')}週間時間割を見る</a>
        </div>
      </section>
    `;
  }

  const examEv = !isSubstituted ? events.find(e =>
    e.type === 'exam' &&
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  ) : null;
  if (examEv) {
    const examLabel = examEv.title || examEv.name || '定期試験期間';
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">
            ${navControls}
            <span class="badge red">${escapeHTML(examLabel)}</span>
          </div>
        </div>
        <div class="dashboard-rest-card">
          <p><strong>${escapeHTML(todayDateStr)}</strong> — ${escapeHTML(examLabel)}</p>
          <a class="button" href="#exam">${icon('document')}試験時間割を見る</a>
        </div>
      </section>
    `;
  }

  const dayIdx = effectiveDay - 1;
  const { grid, error: schedError } = selectedSchedule();
  if (schedError) {
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">${navControls}</div>
        </div>
        <div class="dashboard-empty-card">
          <p>${escapeHTML(schedError)}</p>
          <button type="button" class="button profile-switch-trigger" id="home-fix-profile-btn">${icon('edit')}所属を設定する</button>
        </div>
      </section>
    `;
  }
  const dayLessons = grid[dayIdx] || [];
  const hasClasses = dayLessons.some(slot => slot.length > 0);

  if (!hasClasses) {
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head">
          <h2>${icon('calendar')}今日の時間割</h2>
          <div class="panel-head-meta">${navControls}</div>
        </div>
        <div class="dashboard-empty-card">
          <p>${escapeHTML(todayDateStr)} — 授業予定なし</p>
          <a class="button secondary" href="#timetable">${icon('calendar')}時間割を見る</a>
        </div>
      </section>
    `;
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

  return subBanner + `
    <section class="panel today-schedule" id="today-schedule">
      <div class="panel-head">
        <h2>${icon('calendar')}今日の時間割</h2>
        <div class="panel-head-meta">
          ${navControls}
          ${allDoneToday ? '<span class="badge gray">授業終了</span>' : ''}
          <span class="badge gray">${DAYS[dayIdx]}曜</span>
        </div>
      </div>
      <div class="today-periods-list">
        ${periodRows}
      </div>
      ${renderRoomPopoverBox()}
      <div class="panel-footer">
        <a class="text-link" href="#timetable">週間時間割へ${icon('arrow')}</a>
      </div>
    </section>
  `;
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
        ${todayMenu.bowl ? `
          <div class="dish-item bowl-dish">
            <span class="dish-badge">丼物</span>
            <span class="dish-name">${escapeHTML(todayMenu.bowl.name)}</span>
            ${todayMenu.bowl.price ? `<span class="dish-price">${escapeHTML(todayMenu.bowl.price)}円</span>` : ''}
          </div>
        ` : ''}
        ${allergensStr ? `<p class="allergens-note"><small>アレルギー特定原材料: ${escapeHTML(allergensStr)}</small></p>` : ''}
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

function persistMyLinks(links) {
  try {
    const saved = saveMyLinks(links);
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
  const links = loadMyLinks();
  if (!link.id && links.some(l => normalizeLinkUrl(l.url) === normalizeLinkUrl(v.url))) {
    return { success: false, error: 'このURLはすでにマイリンクに登録されています。' };
  }
  const newItem = { id: link.id || `custom-${Date.now()}-${++myLinkSeq}`, name: v.name, url: v.url, custom: true };
  links.push(newItem);
  const persisted = persistMyLinks(links);
  if (!persisted.success) return persisted;
  return { success: true, item: newItem };
}
const addCustomLink = addMyLink;

function updateMyLink(id, link) {
  if (!id) return { success: false, error: '対象のリンクIDが見つかりません。' };
  const v = validateMyLinkInput(link);
  if (!v.valid) return { success: false, error: v.error };
  const links = loadMyLinks();
  const idx = links.findIndex(l => l.id === id);
  if (idx === -1) return { success: false, error: '対象のマイリンクが見つかりませんでした。' };
  if (links.some(l => l.id !== id && normalizeLinkUrl(l.url) === normalizeLinkUrl(v.url))) {
    return { success: false, error: 'このURLはすでにマイリンクに登録されています。' };
  }
  links[idx] = { ...links[idx], name: v.name, url: v.url };
  const persisted = persistMyLinks(links);
  if (!persisted.success) return persisted;
  return { success: true, item: links[idx], links };
}

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

function restoreMyLink(item, index = 0) {
  if (!item || typeof item !== 'object' || !item.id) return loadMyLinks();
  const links = loadMyLinks();
  if (links.some(l => l.id === item.id)) return links;
  const insertAt = Math.max(0, Math.min(links.length, Number.isFinite(index) ? index : links.length));
  links.splice(insertAt, 0, { ...item });
  persistMyLinks(links);
  return links;
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

function renderQuickLinks() {
  const syllabusUrl = getSyllabusUrl(studentSelection);
  const customLinks = loadMyLinks();

  const customItemsHtml = customLinks.map(l => `
    <a class="quick-link-btn external-link" href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer">
      ${icon('external')}<span>${escapeHTML(l.name)}</span>
    </a>
  `).join('');

  return `
    <section class="panel quick-links" id="quick-links">
      <div class="panel-head">
        <h2>${icon('link')}クイックリンク</h2>
      </div>
      <div class="quick-links-grid">
        <a class="button syllabus-launch-btn" href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener noreferrer">
          ${icon('book')}シラバス（${escapeHTML(studentShortLabel())}）
        </a>
        <a class="button secondary" href="#timetable">
          ${icon('calendar')}週間時間割
        </a>
        <a class="quick-link-btn" href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer">
          ${icon('external')}<span>Teams</span>
        </a>
        <a class="quick-link-btn" href="https://classroom.google.com" target="_blank" rel="noopener noreferrer">
          ${icon('external')}<span>Classroom</span>
        </a>
        <a class="quick-link-btn" href="https://webclass.kosen-k.go.jp/webclass/login.php?auth_mode=SAML" target="_blank" rel="noopener noreferrer">
          ${icon('external')}<span>WebClass</span>
        </a>
        ${customItemsHtml}
      </div>
      <div class="panel-footer">
        <a class="text-link" href="#links">すべてのリンクへ${icon('arrow')}</a>
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
      ${studentPillBtn()}
      <div class="date-block">
        <strong>${longDate(displayDateKey)}</strong>
        ${dashboardOffsetDays === 0 ? '' : `<small>基準日から${dashboardOffsetDays > 0 ? `+${dashboardOffsetDays}` : dashboardOffsetDays}日</small>`}
      </div>
    </div>
  `;
  const onboardingHtml = (!cookieSaved && !onboardingDismissed)
    ? `<div class="onboarding-banner" id="onboarding-banner" role="region" aria-label="初期設定">
        <span>現在は初期設定（<strong>${escapeHTML(studentLabel())}</strong>）で表示中</span>
        <div class="onboarding-actions">
          <button type="button" class="button secondary profile-switch-trigger" id="onboarding-open-profile">${icon('edit')}所属を変更</button>
          <button type="button" class="button subtle" id="onboarding-dismiss">閉じる</button>
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
  const actions = `<div class="heading-actions">${themeToggleBtn()}${studentPillBtn()}</div>`;
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

function renderCalendarMonthGrid(events, subs, todayStr) {
  const [baseY, baseM] = todayStr.slice(0, 7).split('-').map(Number);
  const firstOfTarget = new Date(Date.UTC(baseY, (baseM - 1) + calendarMonthOffset, 1));
  const y = firstOfTarget.getUTCFullYear();
  const m = firstOfTarget.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = firstOfTarget.getUTCDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-month-cell is-pad"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter(ev => {
      const s = ev.date || ev.startDate || '';
      const e = ev.endDate || s;
      return s && ds >= s && ds <= e;
    });
    const subDay = subs.find(s => s && s.date === ds);
    const pills = [
      ...dayEvents.slice(0, 2).map(ev => {
        const cls = ev.type === 'exam' ? 'is-exam' : ((ev.type === 'holiday' || ev.type === 'break' || ev.type === 'vacation' || ev.hasClasses === false) ? 'is-holiday' : 'is-event');
        return `<span class="cal-month-pill ${cls}" title="${escapeHTML(ev.title || ev.name || '')}">${escapeHTML(ev.title || ev.name || '')}</span>`;
      }),
      ...(subDay ? [`<span class="cal-month-pill is-sub">${escapeHTML(String(subDay.substituteDay || '月').replace(/曜日$/, ''))}曜授業</span>`] : [])
    ].slice(0, 3);
    const extraCount = dayEvents.length + (subDay ? 1 : 0) - pills.length;
    cells.push(`<div class="cal-month-cell${ds === todayStr ? ' is-today' : ''}${dayEvents.some(e => e.type === 'holiday' || e.type === 'vacation') ? ' is-rest' : ''}">
      <span class="cal-month-daynum">${d}</span>
      <div class="cal-month-pills">${pills.join('')}${extraCount > 0 ? `<span class="cal-month-more">+${extraCount}</span>` : ''}</div>
    </div>`);
  }
  return `<div class="calendar-month-view" id="calendar-month-view">
    <div class="cal-month-nav">
      <button type="button" class="button secondary" data-cal-month="-1" aria-label="前の月">← 前月</button>
      <strong>${y}年 ${m}月</strong>
      <button type="button" class="button secondary" data-cal-month="0">今月</button>
      <button type="button" class="button secondary" data-cal-month="1" aria-label="次の月">翌月 →</button>
    </div>
    <div class="cal-month-grid">
      ${['日', '月', '火', '水', '木', '金', '土'].map(w => `<div class="cal-month-head">${w}</div>`).join('')}
      ${cells.join('')}
    </div>
  </div>`;
}

function calendar() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${studentPillBtn()}</div>`;
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

  const koukiStart = data.terms?.kouki?.classesStartDate || data.terms?.kouki?.startDate || '2026-09-24';
  const [curY, curM] = currentMonthPrefix.split('-').map(Number);
  const lastDom = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
  const monthStart = `${currentMonthPrefix}-01`;
  const monthEnd = `${currentMonthPrefix}-${String(lastDom).padStart(2, '0')}`;
  const matchesPeriod = (startStr, endStr) => {
    if (!startStr) return true;
    const endSafe = endStr || startStr;
    if (calendarFilterPeriod === 'current') return startStr <= monthEnd && endSafe >= monthStart;
    if (calendarFilterPeriod === 'zenki') return startStr < koukiStart && Number(startStr.slice(5, 7)) >= 4;
    if (calendarFilterPeriod === 'kouki') return endSafe >= koukiStart || Number(startStr.slice(5, 7)) <= 3;
    return true;
  };
  const qLower = calendarSearchQuery.trim().toLowerCase();

  const sortedEvents = [...events]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .filter(ev => {
      const start = String(ev.date || ev.startDate || '');
      const endSafe = String(ev.endDate || start);
      if (!matchesPeriod(start, endSafe)) return false;
      if (calendarHidePast && endSafe && endSafe < todayStr) return false;
      if (calendarFilterCategory === 'holiday') {
        return ev.type === 'holiday' || ev.type === 'break' || ev.type === 'vacation' || ev.hasClasses === false;
      }
      if (calendarFilterCategory === 'exam') return ev.type === 'exam';
      if (calendarFilterCategory === 'event') {
        return !['holiday', 'break', 'vacation', 'exam'].includes(ev.type);
      }
      return true;
    });

  const filteredSubs = (calendarFilterCategory === 'holiday' || calendarFilterCategory === 'exam')
    ? []
    : subs.filter(s => s && matchesPeriod(String(s.date || ''), String(s.date || '')) && (!calendarHidePast || String(s.date || '') >= todayStr));

  const timelineEntries = [
    ...sortedEvents.map(ev => {
      const start = ev.date || ev.startDate || '';
      const endRaw = ev.endDate || start;
      const end = ev.endDate && ev.endDate !== start ? ` 〜 ${ev.endDate}` : '';
      const title = ev.name || ev.title || '行事';
      const b = badgeMap[ev.type] || { cls: 'blue', label: ev.hasClasses === false ? '休業' : '予定' };
      const isToday = start && (todayStr >= start && todayStr <= endRaw);
      const isPast = !isToday && endRaw && endRaw < todayStr;
      const textForSearch = `${start} ${endRaw} ${title} ${ev.note || ''} ${b.label}`.toLowerCase();
      const hiddenBySearch = Boolean(qLower && !textForSearch.includes(qLower));
      return {
        sortDate: start,
        html: `<li class="calendar-event-item${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}" data-date="${escapeHTML(start)}" data-type="${escapeHTML(ev.type || 'event')}"${hiddenBySearch ? ' style="display:none;"' : ''}>
      <span class="calendar-event-date">${escapeHTML(start + end)}</span>
      ${isToday ? '<span class="badge red">本日</span>' : ''}
      <span class="badge ${b.cls}">${escapeHTML(b.label)}</span>
      <strong class="calendar-event-title">${escapeHTML(title)}</strong>
      ${ev.note ? `<small class="calendar-event-note">${escapeHTML(ev.note)}</small>` : ''}
    </li>`
      };
    }),
    ...filteredSubs.map(s => {
      const ds = String(s.date || '');
      const title = `${String(s.substituteDay || '月').replace(/曜日$/, '')}曜日授業を実施`;
      const isToday = ds === todayStr;
      const isPast = ds < todayStr;
      const textForSearch = `${ds} 授業振替 ${title} ${s.note || ''}`.toLowerCase();
      const hiddenBySearch = Boolean(qLower && !textForSearch.includes(qLower));
      return {
        sortDate: ds,
        html: `<li class="calendar-event-item${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}" data-date="${escapeHTML(ds)}" data-type="substitution"${hiddenBySearch ? ' style="display:none;"' : ''}>
      <span class="calendar-event-date">${escapeHTML(ds)}</span>
      ${isToday ? '<span class="badge red">本日</span>' : ''}
      <span class="badge blue">授業振替</span>
      <strong class="calendar-event-title">${escapeHTML(title)}</strong>
      ${s.note ? `<small class="calendar-event-note">${escapeHTML(s.note)}</small>` : ''}
    </li>`
      };
    })
  ].sort((a, b) => String(a.sortDate).localeCompare(String(b.sortDate)));

  const eventRows = timelineEntries.map(x => x.html).join('');

  const periodChip = (key, label) => `<button type="button" class="chip${calendarFilterPeriod === key ? ' active' : ''}" data-cal-period="${key}" aria-pressed="${calendarFilterPeriod === key ? 'true' : 'false'}">${label}</button>`;
  const catChip = (key, label) => `<button type="button" class="chip${calendarFilterCategory === key ? ' active' : ''}" data-cal-cat="${key}" aria-pressed="${calendarFilterCategory === key ? 'true' : 'false'}">${label}</button>`;
  const zenkiPdfUrl = normalizeAkashiUrl(data.meta?.zenkiPdfUrl, '');
  const koukiPdfUrl = normalizeAkashiUrl(data.meta?.koukiPdfUrl, '');
  const calSourceUrl = normalizeAkashiUrl(data.meta?.sourceUrl, 'https://www.akashi.ac.jp/life/calendar.html');

  const mainBodyHtml = calendarViewMode === 'month'
    ? renderCalendarMonthGrid(sortedEvents, subs, todayStr)
    : `<div class="calendar-events" id="calendar-events"><ul class="calendar-timeline" id="calendar-timeline-list">${eventRows || '<li class="calendar-event-item"><span class="calendar-event-title">該当する行事はありません。</span></li>'}</ul></div>`;

  return `${heading('年間予定', '', actions)}
    <section class="panel calendar-panel">
      <div class="panel-head">
        <h2>${icon('calendar')}行事予定表</h2>
        <span class="badge blue">${escapeHTML(weekInfo.label)}</span>
      </div>
      <div class="calendar-toolbar">
        <button type="button" class="button" id="export-calendar-ics">${icon('download')}iCal保存 (.ics)</button>
        ${zenkiPdfUrl ? `<a class="button secondary" href="${escapeHTML(zenkiPdfUrl)}" target="_blank" rel="noopener noreferrer">前期PDF</a>` : ''}
        ${koukiPdfUrl ? `<a class="button secondary" href="${escapeHTML(koukiPdfUrl)}" target="_blank" rel="noopener noreferrer">後期PDF</a>` : ''}
        <a class="text-link" href="${escapeHTML(calSourceUrl)}" target="_blank" rel="noopener noreferrer">公式行事予定${icon('arrow')}</a>
      </div>
      <div class="calendar-filters" role="group" aria-label="年間予定絞り込み">
        <div class="filter-group">${periodChip('all', '通年')}${periodChip('current', '今月')}${periodChip('zenki', '前期')}${periodChip('kouki', '後期')}</div>
        <div class="filter-group">${catChip('all', 'すべて')}${catChip('holiday', '祝日・休業')}${catChip('exam', '定期試験')}${catChip('event', '学校行事')}</div>
        <div class="filter-group">
          <button type="button" class="chip${calendarViewMode === 'list' ? ' active' : ''}" data-cal-view="list" aria-pressed="${calendarViewMode === 'list' ? 'true' : 'false'}">リスト</button>
          <button type="button" class="chip${calendarViewMode === 'month' ? ' active' : ''}" data-cal-view="month" aria-pressed="${calendarViewMode === 'month' ? 'true' : 'false'}">月間</button>
          <button type="button" class="chip${calendarHidePast ? ' active' : ''}" id="calendar-hide-past-btn" aria-pressed="${calendarHidePast ? 'true' : 'false'}">今後のみ</button>
          <button type="button" class="chip" id="calendar-jump-today">今日へ</button>
        </div>
      </div>
      <div class="exam-search-bar"${calendarViewMode === 'month' ? ' hidden' : ''}>
        <input type="search" id="calendar-search-input" value="${escapeHTML(calendarSearchQuery)}" placeholder="行事名・日付で検索..." aria-label="年間予定検索">
      </div>
      ${mainBodyHtml}
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
    const detailsHtml = item.details ? ` <small class="dish-details">(${escapeHTML(item.details)})</small>` : '';
    return `<div><span class="dish-badge">${badge}</span> ${titleHtml}${priceHtml}${detailsHtml}</div>`;
  };
  const dishRows = [
    fmtDish('ランチA', day.lunchA, true),
    fmtDish('ランチB', day.lunchB, true),
    fmtDish('麺類', day.noodle, false),
    fmtDish('丼', day.bowl, false)
  ].filter(Boolean);
  const rawAllergens = [
    Array.isArray(day.allergens) ? day.allergens.join(', ') : (day.allergens || ''),
    day.lunchA?.allergens,
    day.lunchB?.allergens,
    day.noodle?.allergens,
    day.bowl?.allergens
  ].filter(Boolean).join(' ');
  const allergens = Array.isArray(day.allergens) ? day.allergens.join(', ') : (day.allergens || day.lunchA?.allergens || '');
  const hasAllergenAlert = Boolean(allergenAlert && rawAllergens.includes(allergenAlert));
  return `<li class="cafeteria-menu-item${isToday ? ' is-today' : ''}${hasAllergenAlert ? ' has-allergen-alert' : ''}">
    <div class="cafeteria-day-head"><strong>${escapeHTML(dateTitle || '本日')}</strong><span class="panel-head-meta">${isToday ? '<span class="badge red">本日</span>' : ''}${hasAllergenAlert ? `<span class="badge red">${icon('alert')}${escapeHTML(allergenAlert)}を含む</span>` : ''}</span></div>
    <div class="cafeteria-day-dishes">${dishRows.join('') || `<span>${escapeHTML(day.name || day.menu || '')}</span>`}</div>
    ${allergens ? `<p class="allergens">アレルゲン: ${escapeHTML(allergens)}</p>` : ''}
  </li>`;
}

function cafeteria() {
  const actions = `<div class="heading-actions">${themeToggleBtn()}${studentPillBtn()}</div>`;
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
  const allergenChoices = ['小麦', '卵', '乳', '牛肉', '豚肉', '鶏肉', '大豆', 'ごま'];
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
  return `${heading('食堂メニュー', '', actions)}
    <section class="panel cafeteria-panel cafeteria-view" id="cafeteria-view" data-text-extracted="${isTextExtracted ? 'true' : 'false'}">
      <div class="panel-head">
        <h2>${icon('utensils')}学生食堂</h2>
      </div>
      ${weekTabsHtml}
      ${allergenChipsHtml}
      ${menuContent}
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
  const actions = `<div class="heading-actions">${themeToggleBtn()}${studentPillBtn()}</div>`;
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
  const existingUrls = new Set(myLinks.map(item => normalizeLinkUrl(item.url)));
  const myLinkItems = myLinks.length
    ? myLinks.map((item, idx) => {
        const isEditing = editingMyLinkId === item.id;
        return `
        <div class="mylink-row${isEditing ? ' is-editing' : ''}" data-link-id="${escapeHTML(item.id)}">
          <a class="button secondary mylink-anchor" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}${escapeHTML(item.name)}</a>
          <div class="mylink-reorder-btns">
            <button type="button" class="button secondary mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="up" aria-label="${escapeHTML(item.name)}を上へ移動" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="button secondary mylink-move-btn" data-move-id="${escapeHTML(item.id)}" data-dir="down" aria-label="${escapeHTML(item.name)}を下へ移動" ${idx === myLinks.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
          <button type="button" class="button secondary mylink-edit-btn" data-edit-id="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}を編集" aria-expanded="${isEditing ? 'true' : 'false'}">編集</button>
          <button type="button" class="button secondary mylink-remove-btn" data-remove-id="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}を削除">削除</button>
          ${isEditing ? `
          <form class="mylink-edit-form" data-edit-form-id="${escapeHTML(item.id)}" novalidate>
            <input type="text" class="mylink-edit-name" name="name" value="${escapeHTML(item.name)}" placeholder="表示名" aria-label="リンク名を編集">
            <input type="url" class="mylink-edit-url" name="url" value="${escapeHTML(item.url)}" placeholder="https://..." aria-label="URLを編集">
            <div class="mylink-edit-actions">
              <button type="submit" class="button mylink-save-btn">保存</button>
              <button type="button" class="button secondary mylink-cancel-btn">キャンセル</button>
            </div>
            <p class="mylink-edit-error info-note" role="alert" hidden></p>
          </form>` : ''}
        </div>
      `;
      }).join('')
    : '<p class="hint">登録されたマイリンクはまだありません。</p>';

  const presetButtons = PRESET_LINKS.map(p => {
    const added = existingUrls.has(normalizeLinkUrl(p.url));
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

  return `${heading('リンク・シラバス', '', actions)}
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
        <form id="mylink-form" class="mylink-form" novalidate>
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
  const { dateStr, weekdayNum } = getJstParts(date);
  const weekInfo = getAcademicWeek(date);
  const cal = calendarData || FALLBACK_CALENDAR;
  const events = Array.isArray(cal?.events) ? cal.events : [];
  let banners = `<div class="timetable-banner week-banner" role="status"><span class="week-pill">${escapeHTML(weekInfo.label)}</span></div>`;

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
    banners += `<div class="alert alert-warning timetable-banner exam-period-banner"><span class="badge red">定期試験期間</span> 現在は定期試験期間です。<a class="text-link" href="#exam">試験時間割を確認 →</a></div>`;
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
  const legendEntries = Object.entries(activeRoomLegends || {});
  const legendsHtml = (!error && legendEntries.length > 0)
    ? `<details class="room-legends-box" data-export-exclude><summary>教室略称・正式名称一覧（${legendEntries.length}件）</summary><div class="room-legends-grid">${legendEntries.map(([k, v]) => `<div><strong>${escapeHTML(k)}</strong>: ${escapeHTML(v)}</div>`).join('')}</div></details>`
    : '';

  return `${heading(`${fyText} ${termText}時間割`,'',`<div class="heading-actions">${themeToggleBtn()}</div>`)}
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
    <section class="panel timetable-panel" id="timetable-sheet"><div class="panel-head"><h2>${escapeHTML(studentLabel())}</h2><span class="badge" data-export-exclude>${totalPeriods}コマ</span></div>${error ? '' : '<div class="timetable-search-bar" data-export-exclude><input type="search" id="timetable-search-input" placeholder="科目名・教員名・教室名で検索..." aria-label="時間割内検索"><span id="timetable-search-count" class="field-hint" hidden></span></div>'}${error?`<p class="info-note" role="status">${escapeHTML(error)}</p>`:table}${renderRoomPopoverBox()}${legendsHtml}<div class="timetable-source" data-export-exclude><span>出典：<a href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">明石高専 ↗</a> / <a href="${escapeHTML(sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">原本PDF ↗</a>（${escapeHTML(fyText)}${escapeHTML(termText)}）</span><span>休講・変更は公式案内をご確認ください。</span></div><div class="export-controls" data-export-exclude><label class="field">保存形式<select id="export-format" ${error || exportInProgress ? 'disabled' : ''}><option value="pdf"${currentExportFormat==='pdf'?' selected':''}>PDF（A4横）</option><option value="png"${currentExportFormat==='png'?' selected':''}>PNG（画像）</option><option value="text"${currentExportFormat==='text'?' selected':''}>テキスト（.txt）</option><option value="csv"${currentExportFormat==='csv'?' selected':''}>CSV（Excel用 / .csv）</option><option value="json"${currentExportFormat==='json'?' selected':''}>JSON（データ / .json）</option><option value="ics"${currentExportFormat==='ics'?' selected':''}>iCal（カレンダー / .ics）</option></select></label><div class="export-btn-group"><button class="button export-copy-btn" id="export-copy" type="button" ${error || exportInProgress ? 'disabled' : ''} ${EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel ? '' : 'hidden'}>${icon('copy')}${escapeHTML(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.copyLabel||'コピー')}</button><button class="button" id="export-download" type="button" ${error || exportInProgress ? 'disabled' : ''}>${icon('download')}${exportInProgress?'作成中…':escapeHTML(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.downloadLabel||'保存')}</button><button class="button secondary" id="export-adjust-open" type="button" ${error || exportInProgress ? 'disabled' : ''}>${icon('sliders')}${escapeHTML(EXPORT_FORMAT_CONFIGS[currentExportFormat]?.adjustLabel||'調整')}</button></div></div><p id="export-status" class="export-status" role="status" data-export-exclude hidden></p></section>
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
            <button type="button" class="size-mode-btn ${exportSizeMode === 'memo' ? 'active' : ''}" data-size-mode="memo" aria-pressed="${exportSizeMode === 'memo' ? 'true' : 'false'}">メモ書き可</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'custom' ? 'active' : ''}" data-size-mode="custom" aria-pressed="${exportSizeMode === 'custom' ? 'true' : 'false'}">カスタム</button>
            <button type="button" class="size-mode-btn reset" id="size-mode-reset">リセット</button>
            <label class="size-a4-toggle"><input type="checkbox" id="size-toggle-a4" ${a4ModeEnabled ? 'checked' : ''}> A4枠を表示</label>
            <button type="button" class="size-mode-btn" id="size-modal-theme-toggle" title="出力用テーマ切り替え（サイト本体には影響しません）">${getExportTheme() === 'dark' ? `${icon('sun')}白背景で出力` : `${icon('moon')}暗背景で出力`}</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="button" id="size-modal-save-btn">${icon('download')}このサイズで保存</button>
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
  for (const id of ['export-size-modal', 'data-preview-modal', 'profile-switcher-modal']) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  return null;
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
      updated: timetableMeta?.updated || SOURCE?.updated || '2026-09-24',
      fiscalYear: timetableMeta?.fiscalYear || 2026,
      term: timetableMeta?.term || '後期',
      semesterInfo: getActiveSemesterInfo(),
      holidays: holidayDates,
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
  if (page !== 'links') editingMyLinkId = '';
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
  if (main) {
    if (page === 'home') main.innerHTML = home() + renderProfileSwitcherModal();
    else if (page === 'timetable') {
      main.innerHTML = timetable() + renderProfileSwitcherModal();
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
    else if (page === 'exam') main.innerHTML = exam() + renderProfileSwitcherModal();
    else if (page === 'calendar') main.innerHTML = calendar() + renderProfileSwitcherModal();
    else if (page === 'cafeteria') main.innerHTML = cafeteria() + renderProfileSwitcherModal();
    else if (page === 'links') main.innerHTML = linksView() + renderProfileSwitcherModal();
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
        setBtnContent(copyBtn, 'copy', cfg.copyLabel);
      } else {
        copyBtn.hidden = true;
      }
    }
    if (downloadBtn && !exportInProgress) {
      setBtnContent(downloadBtn, 'download', cfg.downloadLabel);
    }
    if (adjustBtn) {
      setBtnContent(adjustBtn, 'sliders', cfg.adjustLabel);
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


  // 年間予定 iCal 保存ボタン
  document.getElementById('export-calendar-ics')?.addEventListener('click', async () => {
    const { exportCalendarIcs } = await import('./timetable-export.js');
    const cal = calendarData || FALLBACK_CALENDAR;
    const fy = timetableMeta?.fiscalYear || 2026;
    exportCalendarIcs(cal, `akashi-calendar-${fy}`);
    showToast('年間行事予定 (.ics) を保存しました。');
  });

  // 時間割内ハイライト検索
  document.getElementById('timetable-search-input')?.addEventListener('input', e => {
    const q = String(e.target?.value || '').trim().toLowerCase();
    const countEl = document.getElementById('timetable-search-count');
    if (typeof document.querySelectorAll !== 'function') return;
    const cards = Array.from(document.querySelectorAll('.real-timetable .lesson-card'));
    const cells = Array.from(document.querySelectorAll('.real-timetable td.schedule-cell'));
    if (!q) {
      cards.forEach(c => c.classList?.remove('is-match', 'is-dimmed'));
      cells.forEach(td => td.classList?.remove('is-match', 'is-dimmed'));
      if (countEl) { countEl.hidden = true; countEl.textContent = ''; }
      return;
    }
    let matches = 0;
    cards.forEach(c => {
      const extraRoom = c.querySelector?.('.lesson-location-btn')?.dataset?.roomFull || '';
      const hit = `${c.textContent || ''} ${extraRoom}`.toLowerCase().includes(q);
      c.classList?.toggle('is-match', hit);
      c.classList?.toggle('is-dimmed', !hit);
      if (hit) matches++;
    });
    cells.forEach(td => {
      if (td.classList?.contains('schedule-empty')) {
        td.classList?.remove('is-match');
        td.classList?.add('is-dimmed');
        return;
      }
      const cellCards = td.querySelectorAll ? Array.from(td.querySelectorAll('.lesson-card')) : [];
      const anyHit = cellCards.some(c => c.classList?.contains('is-match'));
      td.classList?.toggle('is-match', anyHit);
      td.classList?.toggle('is-dimmed', !anyHit);
    });
    if (countEl) {
      countEl.hidden = false;
      countEl.textContent = `${matches}件の授業が一致`;
    }
  });

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
    showToast('マイリンクを追加しました。');
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
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset?.presetName || btn.textContent?.trim();
        const url = btn.dataset?.presetUrl || '';
        if (name && url) {
          const res = addMyLink({ name, url });
          render();
          if (res?.success) showToast(`「${name}」を追加しました。`);
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
          const sameBtn = document.querySelector?.(`.mylink-move-btn[data-move-id="${id}"][data-dir="${dir}"]`);
          const fallbackBtn = document.querySelector?.(`.mylink-move-btn[data-move-id="${id}"]`);
          (sameBtn && !sameBtn.disabled ? sameBtn : fallbackBtn)?.focus?.({ preventScroll: true });
        }
      });
    });
    document.querySelectorAll('.mylink-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset?.editId || '';
        if (!id) return;
        editingMyLinkId = editingMyLinkId === id ? '' : id;
        render();
        if (editingMyLinkId) {
          document.querySelector?.(`.mylink-edit-form[data-edit-form-id="${editingMyLinkId}"] .mylink-edit-name`)?.focus?.({ preventScroll: true });
        }
      });
    });
    document.querySelectorAll('.mylink-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        editingMyLinkId = '';
        render();
      });
    });
    document.querySelectorAll('.mylink-edit-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id = form.dataset?.editFormId || '';
        const nameVal = form.querySelector?.('.mylink-edit-name')?.value;
        const urlVal = form.querySelector?.('.mylink-edit-url')?.value;
        const errEl = form.querySelector?.('.mylink-edit-error');
        const res = updateMyLink(id, { name: nameVal, url: urlVal });
        if (!res.success) {
          if (errEl) {
            errEl.textContent = res.error || 'リンクを更新できませんでした。';
            errEl.hidden = false;
          }
          return;
        }
        editingMyLinkId = '';
        render();
        showToast('マイリンクを更新しました。');
      });
    });
    document.querySelectorAll('.mylink-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset?.removeId;
        if (id) {
          const prevLinks = loadMyLinks();
          const idx = prevLinks.findIndex(l => l.id === id);
          const removedItem = idx >= 0 ? { ...prevLinks[idx] } : null;
          deleteMyLink(id);
          if (editingMyLinkId === id) editingMyLinkId = '';
          render();
          document.getElementById('mylink-name')?.focus?.({ preventScroll: true });
          if (removedItem) {
            lastDeletedMyLink = { item: removedItem, index: idx };
            showToast(`「${removedItem.name}」を削除しました。`, {
              undoLabel: '元に戻す',
              onUndo: () => {
                if (!lastDeletedMyLink) return;
                restoreMyLink(lastDeletedMyLink.item, lastDeletedMyLink.index);
                lastDeletedMyLink = null;
                render();
                showToast('削除を取り消しました。');
              }
            });
          }
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
  let draftProfile = { ...studentSelection };
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
  const renderProfileModalFields = () => {
    const wrap = document.getElementById('profile-modal-fields');
    const statusEl = document.getElementById('profile-modal-status');
    const saveBtn = document.getElementById('profile-modal-save');
    if (!wrap) return;
    wrap.innerHTML = buildStudentFilterControls(draftProfile, 'modal-student', 'data-modal-student');
    const needsCourse = Number(draftProfile.grade) < 6 && Number(draftProfile.grade) >= 4 && draftProfile.department === 'E' && !draftProfile.course;
    if (statusEl) {
      statusEl.hidden = !needsCourse;
      statusEl.textContent = needsCourse ? '4・5年生のE科はコース（ED・EJ）を選択してください。' : '';
    }
    if (saveBtn) saveBtn.disabled = Boolean(needsCourse);
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
        const focusId = e.target.id;
        renderProfileModalFields();
        document.getElementById(focusId)?.focus?.({ preventScroll: true });
      });
    });
  };
  const openProfileModal = () => {
    const modal = document.getElementById('profile-switcher-modal');
    if (!modal) return;
    draftProfile = { ...studentSelection };
    renderProfileModalFields();
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
    studentSelection = sanitizeSelection(draftProfile);
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
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeDataPreviewModal();
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
        const routes = ['home', 'timetable', 'exam', 'calendar', 'cafeteria', 'links'];
        const nextRoute = routes[Number(e.key) - 1];
        if (nextRoute) {
          e.preventDefault?.();
          location.hash = `#${nextRoute}`;
        }
        return;
      }
      if (e.key === '/' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const searchEl = document.getElementById('timetable-search-input')
          || document.getElementById('exam-search-input')
          || document.getElementById('calendar-search-input');
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
