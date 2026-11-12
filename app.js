import { DAYS, TIMES, DEPARTMENTS, COURSE_LABELS, SOURCE, LESSONS, generateTimetable } from './timetable-data.js';

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
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icons[name] || icons.info}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(date);
const today = dateKey(new Date());
const longDate = date => new Intl.DateTimeFormat('ja-JP', {dateStyle:'full',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T12:00:00+09:00`));
const periods = [['09:00','10:30'],['10:40','12:10'],['13:00','14:30'],['14:40','16:10']];
const DEFAULT_SELECTION = { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' };
const COOKIE_NAME = 'campus-student-v1';
const SELECTION_VALUES = { grade: [1,2,3,4,5], department: DEPARTMENTS, classGroup: ['1','2','3','4'], studentType: ['regular','international'], course: ['','ED','EJ'], arts: ['music','art'] };
let cookieSaved = false;
let exportInProgress = false;
const EXPORT_MODES = {
  nomargin: { padding: 10, cellHeight: 172, fontScale: 105 },
  memo: { padding: 36, cellHeight: 118, fontScale: 95 },
};
let exportSizeMode = 'nomargin';
let exportSizeConfig = { ...EXPORT_MODES.nomargin };
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
function heading(title,subtitle,action='') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
const link = (href,label) => `<a class="text-link" href="${href}">${label}${icon('arrow')}</a>`;
function home() {
  return `${heading('ホーム','学校生活を、もっとスムーズに。',`<div class="date-block"><strong>${longDate(today)}</strong><small>キャンパスポータル</small></div>`)}
    <section class="panel development-card"><span class="icon-box rose">${icon('school')}</span><h2>現在開発中</h2><p>ホームページの機能は、ただいま準備中です。<br>時間割は、メニューからご利用いただけます。</p><a class="button" href="#timetable">${icon('calendar')}時間割を見る</a></section>`;
}
function studentLabel() {
  const s = studentSelection;
  return `${s.grade}年 ${s.department}学科${s.grade <= 2 ? `・${s.classGroup}組` : ''}${s.grade >= 4 && s.department === 'E' ? `・${COURSE_LABELS[s.course] || 'コース未選択'}` : ''}${s.studentType === 'international' ? '・留学生' : ''}${s.grade === 1 ? `・${s.arts === 'art' ? '美術' : '音楽'}` : ''}`;
}
function studentShortLabel() {
  const s = studentSelection;
  if (s.grade <= 2) return `${s.grade}-${s.classGroup}-${s.department}`;
  if (s.grade >= 4 && s.department === 'E') return `${s.grade}${s.course || 'E'}`;
  return `${s.grade}${s.department}`;
}
function selectedSchedule() {
  try { return { ...generateTimetable(LESSONS, studentSelection), error: '' }; }
  catch (error) { return { selected: [], grid: Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => [])), error: error.message }; }
}
function timetable() {
  const s = studentSelection;
  const { selected, grid, error } = selectedSchedule();
  const options = (values, current) => values.map(([value,label]) => `<option value="${escapeHTML(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
  const field = (label, key, values, disabled = false) => `<label class="field">${label}<select id="student-${key}" data-student="${key}" ${disabled ? 'disabled' : 'required'}>${options(values,s[key])}</select></label>`;
  const needsCourse = s.grade >= 4 && s.department === 'E';
  const controls = field('学年','grade',[1,2,3,4,5].map(n=>[n,`${n}年`])) +
    field('学科','department',DEPARTMENTS.map(d=>[d,`${d}学科`])) +
    field('クラス（1・2年）','classGroup',[1,2,3,4].map(n=>[n,`${n}組`]),s.grade>=3) +
    field('留学生の区分','studentType',[['regular','留学生ではない'],['international','留学生']]) +
    field('E学科のコース（4・5年）','course',[['','選択してください'],['EJ',COURSE_LABELS.EJ],['ED',COURSE_LABELS.ED]],!needsCourse) +
    (s.grade===1 ? field('芸術選択','arts',[['music','音楽'],['art','美術']]) : '');
  const table = `<div class="table-scroll" tabindex="0" role="region" aria-label="週間時間割。左右にスクロールできます"><table class="real-timetable"><caption class="sr-only">${escapeHTML(studentLabel())}の後期時間割</caption><thead><tr><th scope="col">時限</th>${DAYS.map(d=>`<th scope="col">${d}曜日</th>`).join('')}</tr></thead><tbody>${periods.map((time,p)=>`<tr><th scope="row">${p+1}限<small>${time[0]}<br>${time[1]}</small></th>${grid.map(day=>{
    const cell = day[p];
    if(cell.length===1 && cell[0].period-1<p && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id))) return '';
    const span = cell.length===1 && !day.some(items=>items.length>1 && items.some(l=>l.id===cell[0].id)) ? (cell[0].duration||1) : 1;
    return `<td rowspan="${span}" class="schedule-cell ${cell.length?'':'schedule-empty'}">${cell.length ? cell.map(l=>`<div class="lesson-card"><strong>${escapeHTML(l.subjectName)}</strong>${l.location?`<small class="lesson-location">${icon('door')}${escapeHTML(l.location)}</small>`:''}<small>${escapeHTML(l.teacher)}</small>${span>1?`<span class="badge gray">${l.period}〜${l.period+span-1}限</span>`:''}${l.notes?`<small>${escapeHTML(l.notes)}</small>`:''}</div>`).join('') : '<span>空き</span>'}${cell.length>1?'<span class="badge red">授業の重複</span>':''}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `${heading('時間割','学年・学科・履修区分に合わせて、あなたの1週間を確認。')}
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
    <section class="panel timetable-panel" id="timetable-sheet"><div class="panel-head"><h2>${escapeHTML(studentLabel())}</h2><span class="badge" data-export-exclude>${selected.length}授業</span></div><p class="hint" data-export-exclude>スマートフォンでは表を左右にスクロールできます。</p>${error?`<p class="info-note" role="status">${escapeHTML(error)}</p>`:table}<div class="timetable-source" data-export-exclude><span>出典：<a href="https://www.akashi.ac.jp/life/lesson.html" target="_blank" rel="noopener noreferrer">明石高専「時間割・授業時間」 ↗</a></span><span>個別の休講・変更は学校の案内で確認してください。</span></div><div class="export-config-bar" data-export-exclude><button class="button secondary" id="export-size-open" type="button" ${error || exportInProgress ? 'disabled' : ''}>サイズ調整</button><span class="size-mode-Summary" id="export-size-summary">みため: ${exportSizeMode === 'nomargin' ? '余白なし' : exportSizeMode === 'memo' ? 'メモ書き可' : 'カスタム'}</span></div><div class="export-controls" data-export-exclude><label class="field">保存形式<select id="export-format" ${error || exportInProgress ? 'disabled' : ''}><option value="pdf">PDF（A4横）</option><option value="png">PNG（画像）</option></select></label><button class="button" id="export-download" type="button" ${error || exportInProgress ? 'disabled' : ''}>${exportInProgress?'作成中…':'時間割をダウンロード'}</button></div><p id="export-status" class="export-status" role="status" data-export-exclude>${error?'選択条件を設定するとダウンロードできます。':'選択中の時間割全体を保存します。'}</p></section>
    <div class="size-overlay" id="export-size-modal" hidden data-export-exclude role="dialog" aria-modal="true" aria-label="サイズ調整">
      <div class="size-overlay-viewport" id="size-overlay-viewport">
        <div class="size-paper-wrap" id="size-paper-wrap">
          <div class="size-paper" id="size-modal-paper"></div>
        </div>
      </div>
      <div class="size-overlay-controls">
        <div class="size-preset-row">
          <div class="size-preset-group" role="group" aria-label="みため">
            <span class="size-preset-label">みため:</span>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'nomargin' ? 'active' : ''}" data-size-mode="nomargin">余白なし</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'memo' ? 'active' : ''}" data-size-mode="memo">メモ書き可</button>
            <button type="button" class="size-mode-btn ${exportSizeMode === 'custom' ? 'active' : ''}" data-size-mode="custom">カスタム</button>
            <button type="button" class="size-mode-btn reset" id="size-mode-reset">リセット</button>
          </div>
          <button type="button" class="button size-close-btn" id="export-size-close">閉じる</button>
        </div>
        <div class="size-sliders">
          <label class="size-slider-item">
            <span class="size-slider-name">余白</span>
            <input type="range" id="size-slider-padding" min="0" max="48" step="2" value="${exportSizeConfig.padding}">
            <span class="size-slider-val" id="size-val-padding">${exportSizeConfig.padding}px</span>
          </label>
          <label class="size-slider-item">
            <span class="size-slider-name">マスの高さ</span>
            <input type="range" id="size-slider-cell" min="100" max="196" step="2" value="${exportSizeConfig.cellHeight}">
            <span class="size-slider-val" id="size-val-cell">${exportSizeConfig.cellHeight}px</span>
          </label>
          <label class="size-slider-item">
            <span class="size-slider-name">文字の大きさ</span>
            <input type="range" id="size-slider-font" min="80" max="130" step="1" value="${exportSizeConfig.fontScale}">
            <span class="size-slider-val" id="size-val-font">${exportSizeConfig.fontScale}%</span>
          </label>
        </div>
      </div>
    </div>`;
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
function openSizeAdjustModal() {
  const modal = document.getElementById('export-size-modal');
  const paper = document.getElementById('size-modal-paper');
  const panel = document.getElementById('timetable-sheet');
  if (!modal || !paper || !panel) return;
  const clone = panel.cloneNode(true);
  clone.querySelectorAll('[data-export-exclude]').forEach(n => n.remove());
  clone.removeAttribute('id');
  clone.classList.add('export-sheet');
  clone.setAttribute('data-theme', currentTheme);
  paper.setAttribute('data-theme', currentTheme);
  clone.querySelector('.panel-head')?.remove();
  clone.querySelector('.timetable-source')?.remove();
  const title = document.createElement('h1');
  title.className = 'export-title';
  title.textContent = `明石高専後期時間割 ${studentLabel()} Co+work6班 ＜時間割PDF参照日時: ${SOURCE?.updated || '2026-09-24'}＞`;
  clone.prepend(title);
  const scroller = clone.querySelector('.table-scroll');
  if (scroller) scroller.style.cssText = 'overflow:visible;width:100%;max-height:none;';
  const tbl = clone.querySelector('table');
  if (tbl) tbl.style.width = '100%';
  paper.innerHTML = '';
  paper.append(clone);
  applyLiveSheetSize(clone);
  modal.hidden = false;
  document.body.classList.add('size-modal-open');
  const viewport = document.getElementById('size-overlay-viewport');
  const wrap = document.getElementById('size-paper-wrap');
  if (viewport && wrap) {
    const availW = Math.max(280, (viewport.clientWidth || 360) - 24);
    const fitScale = Math.min(1, availW / 1100);
    wrap.style.setProperty('--sheet-scale', String(fitScale));
  }
}
function closeSizeAdjustModal() {
  const modal = document.getElementById('export-size-modal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('size-modal-open');
  const summary = document.getElementById('export-size-summary');
  if (summary) {
    summary.textContent = `みため: ${exportSizeMode === 'nomargin' ? '余白なし' : exportSizeMode === 'memo' ? 'メモ書き可' : 'カスタム'}`;
  }
  const panel = document.getElementById('timetable-sheet');
  if (panel) applyLiveSheetSize(panel);
}
async function downloadCurrentTimetable() {
  if (exportInProgress || selectedSchedule().error) return;
  const panel = document.getElementById('timetable-sheet');
  if (!panel) return;
  // 非同期処理中に画面や選択条件が変わっても、押した時点の時間割を保存する。
  const snapshot = panel.cloneNode(true);
  const format = document.getElementById('export-format').value;
  const filename = `R8後期時間割-${studentShortLabel()}`.replace(/[\\/:*?"<>|]/g, '_');
  const button = document.getElementById('export-download');
  const status = document.getElementById('export-status');
  exportInProgress = true;
  button.disabled = true;
  button.textContent = '作成中…';
  status.textContent = `${format.toUpperCase()}を作成しています…`;
  try {
    const { exportTimetable } = await import('./timetable-export.js');
    await exportTimetable(snapshot, format, filename, {
      studentLabel: studentLabel(),
      updated: SOURCE?.updated || '2026-09-24',
      sizeConfig: { ...exportSizeConfig },
      theme: currentTheme,
    });
    status.textContent = format === 'pdf'
      ? '印刷・PDF保存画面を開きました。「PDFに保存」またはプリンターを選択してください。'
      : 'ファイルを作成しました。ブラウザーのダウンロードを確認してください。';
  } catch (error) {
    console.error('Timetable export failed', error);
    status.textContent = 'ファイルを作成できませんでした。通信状態を確認して、もう一度お試しください。';
  } finally {
    exportInProgress = false;
    const current = document.getElementById('export-download');
    if (current) { current.disabled = Boolean(selectedSchedule().error); current.textContent = '時間割をダウンロード'; }
    const select = document.getElementById('export-format');
    if (select) select.disabled = Boolean(selectedSchedule().error);
  }
}
function render() {
  const route=location.hash.slice(1).split('?')[0] || 'home';
  const names={home:'ホーム',timetable:'時間割'};
  const page=Object.hasOwn(names,route)?route:'home';
  const breadcrumbEl=document.getElementById('breadcrumb');
  if(breadcrumbEl) breadcrumbEl.textContent=names[page];
  document.title=`${names[page]} — Campus`;
  document.querySelectorAll('[data-page]').forEach(a=>{
    a.classList.toggle('active',a.dataset.page===page);
    if(a.dataset.page===page) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('main').innerHTML=page==='home'?home():timetable();
  document.getElementById('export-download')?.addEventListener('click',downloadCurrentTimetable);
  document.getElementById('export-size-open')?.addEventListener('click',openSizeAdjustModal);
  document.getElementById('export-size-close')?.addEventListener('click',closeSizeAdjustModal);
  const syncSizeControlsUI = () => {
    document.querySelectorAll('[data-size-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sizeMode === exportSizeMode);
    });
    const padIn = document.getElementById('size-slider-padding');
    const cellIn = document.getElementById('size-slider-cell');
    const fontIn = document.getElementById('size-slider-font');
    if (padIn) padIn.value = String(exportSizeConfig.padding);
    if (cellIn) cellIn.value = String(exportSizeConfig.cellHeight);
    if (fontIn) fontIn.value = String(exportSizeConfig.fontScale);
    const padVal = document.getElementById('size-val-padding');
    const cellVal = document.getElementById('size-val-cell');
    const fontVal = document.getElementById('size-val-font');
    if (padVal) padVal.textContent = `${exportSizeConfig.padding}px`;
    if (cellVal) cellVal.textContent = `${exportSizeConfig.cellHeight}px`;
    if (fontVal) fontVal.textContent = `${exportSizeConfig.fontScale}%`;
    const sheet = document.querySelector('#size-modal-paper .export-sheet');
    applyLiveSheetSize(sheet);
  };
  document.querySelectorAll('[data-size-mode]').forEach(btn => btn.addEventListener('click', () => {
    const mode = btn.dataset.sizeMode;
    exportSizeMode = mode;
    if (EXPORT_MODES[mode]) exportSizeConfig = { ...EXPORT_MODES[mode] };
    syncSizeControlsUI();
  }));
  document.getElementById('size-mode-reset')?.addEventListener('click', () => {
    exportSizeMode = 'nomargin';
    exportSizeConfig = { ...EXPORT_MODES.nomargin };
    syncSizeControlsUI();
  });
  const bindSizeSlider = (id, key) => {
    document.getElementById(id)?.addEventListener('input', e => {
      exportSizeConfig[key] = Number(e.target.value);
      exportSizeMode = 'custom';
      syncSizeControlsUI();
    });
  };
  bindSizeSlider('size-slider-padding', 'padding');
  bindSizeSlider('size-slider-cell', 'cellHeight');
  bindSizeSlider('size-slider-font', 'fontScale');
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

function setupNavigation() {
  const sidebar=document.getElementById('sidebar');
  const toggle=document.getElementById('menu-toggle');
  const close=document.getElementById('menu-close');
  const overlay=document.getElementById('menu-overlay');
  const workspace=document.querySelector('.workspace');
  const skip=document.querySelector('.skip-link');
  const mobile=window.matchMedia('(max-width: 760px)');
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
window.addEventListener('hashchange',()=>{closeNavigation();render();window.scrollTo(0,0);document.getElementById('main').focus({preventScroll:true});document.querySelector?.('.topbar')?.classList?.remove('topbar-hidden');});

const THEME_COOKIE = 'campus-theme';
function getInitialTheme() {
  try {
    const entry = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${THEME_COOKIE}=`));
    if (entry) {
      const val = decodeURIComponent(entry.slice(THEME_COOKIE.length+1));
      if (val === 'dark' || val === 'light') return val;
    }
  } catch {}
  return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}
let currentTheme = getInitialTheme();
function updateThemeUI(theme) {
  if (typeof document === 'undefined') return;
  if (document.documentElement) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える');
    btn.title = isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える';
    const iconEl = (typeof btn.querySelector === 'function' ? btn.querySelector('.theme-icon') : null) || btn;
    iconEl.innerHTML = icon(isDark ? 'sun' : 'moon');
  }
}
function setTheme(theme) {
  currentTheme = theme;
  updateThemeUI(theme);
  try {
    const path = location.pathname.slice(0,location.pathname.lastIndexOf('/')+1) || '/';
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; Path=${path}; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  } catch {}
}
function setupTheme() {
  updateThemeUI(currentTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }
}
function setupMobileHeaderScroll() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  let lastY = 0;
  let ticking = false;
  const raf = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame
    : (cb) => setTimeout(cb, 0);
  window.addEventListener('scroll', () => {
    if (!ticking) {
      raf(() => {
        const topbar = typeof document.querySelector === 'function' ? document.querySelector('.topbar') : null;
        const currentY = typeof window.scrollY === 'number' ? window.scrollY : (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0);
        if (topbar && typeof window.innerWidth === 'number' && window.innerWidth <= 760 && !document.body?.classList?.contains('menu-open')) {
          if (currentY > lastY && currentY > 50) {
            topbar.classList?.add('topbar-hidden');
          } else if (currentY < lastY || currentY <= 20) {
            topbar.classList?.remove('topbar-hidden');
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
