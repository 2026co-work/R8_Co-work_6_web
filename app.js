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
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icons[name] || icons.info}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(date);
const today = dateKey(new Date());
const longDate = date => new Intl.DateTimeFormat('ja-JP', {dateStyle:'full',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T12:00:00+09:00`));
const rooms = [{id:'A101',name:'A棟 101',capacity:40},{id:'A102',name:'A棟 102',capacity:40},{id:'A201',name:'A棟 201',capacity:60},{id:'A202',name:'A棟 202',capacity:60},{id:'B101',name:'B棟 101',capacity:30},{id:'B102',name:'B棟 102',capacity:30}];
const periods = [['09:00','10:30'],['10:40','12:10'],['13:00','14:30'],['14:40','16:10']];
const subjects = [
  ['応用数学','情報工学実験','英語コミュニケーションⅡ','プログラミング'],
  ['線形代数','情報ネットワーク','確率・統計','体育'],
  ['プログラミング','応用物理','情報工学実験','情報工学実験'],
  ['応用数学','確率・統計','英語コミュニケーションⅡ','線形代数'],
  ['情報ネットワーク','応用物理','キャリアデザイン','自主学習']
];
const defaultClass = '4年 情報工学科';
let studentSelection = { grade: 1, department: 'M', classGroup: '1', studentType: 'regular', course: '', arts: 'music' };
let roomDate = today;
let roomTime = '13:00';
let roomFilter = 'all';
let toastTimer;
let storageAvailable = true;
function readReservations() {
  try {
    const data = JSON.parse(localStorage.getItem('campus-reservations-v1') || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(r => r && typeof r.id === 'string' && rooms.some(room => room.id === r.room) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end) && r.start < r.end && typeof r.purpose === 'string');
  } catch { storageAvailable = false; return []; }
}
let reservations = readReservations();
const nameOfRoom = id => rooms.find(r => r.id === id)?.name || id;
function lessons(date, className = defaultClass) {
  const weekday = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  if (weekday === 0 || weekday === 6) return [];
  const names = subjects[weekday-1];
  const baseRooms = className === defaultClass ? ['A101','A202','A101','B101'] : ['A201','B102','A201','B102'];
  return names.map((name,i) => ({name,start:periods[i][0],end:periods[i][1],room:baseRooms[i],period:i+1,cancelled:date===today && i===2,changed:date===today && i===1}));
}
function allLessons(date) { return [defaultClass,'3年 情報工学科'].flatMap(c => lessons(date,c)).filter(l => !l.cancelled); }
function occupied(room,date,start,end) {
  return [...allLessons(date),...reservations.filter(r=>r.date===date)].find(r=>r.room===room && start < r.end && end > r.start);
}
function atTime(room,date,time) {
  return [...allLessons(date),...reservations.filter(r=>r.date===date)].find(r=>r.room===room && time >= r.start && time < r.end);
}
function heading(eyebrow,title,subtitle,action='') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
const link = (href,label) => `<a class="text-link" href="${href}">${label}${icon('arrow')}</a>`;
function changeRows() {
  return `<div class="change-row"><i class="dot"></i><span class="badge red">休講</span><div><h3>英語コミュニケーションⅡ</h3><p>サンプル · 3限 ／ 担当教員の都合</p></div></div>
  <div class="change-row"><i class="dot amber"></i><span class="badge amber">教室変更</span><div><h3>確率・統計</h3><p>サンプル · 2限 ／ A棟 201 → A棟 202</p></div></div>
  <div class="change-row"><i class="dot green"></i><span class="badge">補講</span><div><h3>線形代数</h3><p>サンプル · 次の月曜日 4限 ／ B棟 101</p></div></div>`;
}
function home() {
  const free = rooms.filter(r=>!atTime(r.id,today,'13:00')).length;
  const list = todaysLessons();
  const scheduleError = selectedSchedule().error;
  return `${heading('YOUR CAMPUS, AT A GLANCE','こんにちは。', '今日のキャンパスを、ここから。',`<div class="date-block"><strong>${longDate(today)}</strong><small>後期 · キャンパスダッシュボード</small></div>`)}
    <a class="alert" href="#changes">${icon('megaphone')}<div><h2>3件の時間割変更があります <span class="badge red">サンプル</span></h2><p>3限 英語コミュニケーションⅡ の休講などを確認しましょう。</p></div><span class="chevron">${icon('arrow')}</span></a>
    <div class="stats">
      <a class="stat" href="#rooms"><div><div class="stat-label">空き教室</div><div class="stat-number green">${free}<small>室</small></div><div class="stat-note">本日 13:00 時点 · サンプル</div></div><span class="icon-box green">${icon('door')}</span></a>
      <a class="stat" href="#timetable"><div><div class="stat-label">今日の授業</div><div class="stat-number blue">${scheduleError?'—':list.reduce((sum,l)=>sum+(l.duration||1),0)}<small>コマ</small></div><div class="stat-note">${escapeHTML(studentLabel())} · 基本時間割</div></div><span class="icon-box">${icon('calendar')}</span></a>
      <a class="stat" href="#register"><div><div class="stat-label">教室の利用登録</div><div class="stat-number rose">${reservations.filter(r=>r.date===today).length}<small>件</small></div><div class="stat-note">本日 · このブラウザーの登録</div></div><span class="icon-box rose">${icon('edit')}</span></a>
    </div>
    <div class="two-col">
      <section class="panel"><div class="panel-head"><h2>${icon('calendar')}今日の時間割</h2>${link('#timetable','週間を見る')}</div>${scheduleError ? `<div class="empty">${escapeHTML(scheduleError)} ${link('#timetable','条件を選択')}</div>` : list.length ? list.map(l=>`<div class="class-row"><div class="period"><strong>${l.period}${l.duration>1?`〜${l.period+l.duration-1}`:''}限</strong>${periods[l.period-1][0]}</div><div class="class-info"><h3>${escapeHTML(l.subjectName)}</h3><p>${escapeHTML(l.location || '教室指定なし')} · ${escapeHTML(l.teacher)}</p></div></div>`).join(''):'<div class="empty">今日は基本時間割に授業がありません。</div>'}</section>
      <section class="panel"><div class="panel-head"><h2>${icon('clock')}最新の時間割変更</h2>${link('#changes','すべて見る')}</div>${changeRows()}<div class="info-note" style="margin-top:21px">登校前に、授業と教室の変更をチェック。</div></section>
    </div>
    <div class="section-title"><h2>${icon('bell')}お知らせ・案内</h2><span class="muted" style="font-size:10px">サンプルのお知らせ</span></div>
    <article class="notice"><span class="icon-box">${icon('door')}</span><div class="notice-text"><h3>空き教室がオンラインで確認できるようになりました<span class="badge gray">教室利用</span></h3><p>紙の予約表に記入したあとは、QRコードから利用登録をお願いします。</p></div><time datetime="2026-10-01">2026.10.01</time></article>
    <article class="notice"><span class="icon-box green">${icon('document')}</span><div class="notice-text"><h3>後期の時間割を確認しましょう<span class="badge">教務案内</span></h3><p>「時間割」からクラスを選択すると、1週間の授業をまとめて確認できます。</p></div><time datetime="2026-09-28">2026.09.28</time></article>
    <article class="notice"><span class="icon-box rose">${icon('briefcase')}</span><div class="notice-text"><h3>教室を利用するみなさんへ<span class="badge amber">学生課</span></h3><p>利用後は机・椅子を元の位置に戻し、消灯と戸締まりにご協力ください。</p></div><time datetime="2026-09-25">2026.09.25</time></article>
    <div class="help-strip">${icon('info')}<span>教室の予約は、学生課の紙の予約表への記入が必要です。</span><a href="#register">利用登録はこちら →</a></div>`;
}
function studentLabel() {
  const s = studentSelection;
  return `${s.grade}年 ${s.department}学科${s.grade <= 2 ? `・${s.classGroup}組` : ''}${s.grade >= 4 && s.department === 'E' ? `・${COURSE_LABELS[s.course] || 'コース未選択'}` : ''}${s.studentType === 'international' ? '・留学生' : ''}${s.grade === 1 ? `・${s.arts === 'art' ? '美術' : '音楽'}` : ''}`;
}
function selectedSchedule() {
  try { return { ...generateTimetable(LESSONS, studentSelection), error: '' }; }
  catch (error) { return { selected: [], grid: Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => [])), error: error.message }; }
}
function todaysLessons() {
  const day = new Date(`${today}T12:00:00+09:00`).getUTCDay();
  return selectedSchedule().selected.filter(lesson => lesson.dayOfWeek === day).sort((a,b) => a.period-b.period);
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
  return `${heading('WEEKLY TIMETABLE','時間割','学年・学科・履修区分に合わせて、あなたの1週間を確認。')}
    <section class="panel timetable-controls"><div class="panel-head"><h2>${icon('calendar')}表示する時間割</h2><span class="badge gray">令和8年度 後期</span></div><div class="filters student-filters">${controls}</div><p class="hint">選択すると自動で更新します。${s.grade<=2?'一般科目はクラス、専門科目は学科で組み合わせます。':''}${s.grade===3?'留学生は原本の留学生用の行を表示します。':'この学年は留学生別の行がないため共通時間割を表示します。'}</p></section>
    <section class="panel timetable-panel"><div class="panel-head"><h2>${escapeHTML(studentLabel())}</h2><span class="badge">${selected.length}授業</span></div><p class="hint">スマートフォンでは表を左右にスクロールできます。</p>${error?`<p class="info-note" role="status">${escapeHTML(error)}</p>`:table}<p class="timetable-source">出典：<a href="${SOURCE.url}" target="_blank" rel="noopener noreferrer">明石高専・後期時間割（2026年9月24日更新） ↗</a><br>10月8日提供の画像で補正済み。「空き」は原本の空欄です。個別の休講・変更は学校の案内で確認してください。</p></section>`;
}
function roomPage() {
  const filtered = rooms.filter(r=>roomFilter!=='free'||!atTime(r.id,roomDate,roomTime));
  return `${heading('FIND YOUR SPACE','空き教室','利用したい日時を選んで、教室の空き状況を確認しましょう。',`<a class="button" href="#register">${icon('plus')}利用登録</a>`)}
    <div class="filters"><label class="field">利用日<input id="room-date" type="date" value="${roomDate}" required></label><label class="field">確認する時刻<input id="room-time" type="time" value="${roomTime}" required></label><label class="field">表示<select id="room-filter"><option value="all" ${roomFilter==='all'?'selected':''}>すべての教室</option><option value="free" ${roomFilter==='free'?'selected':''}>空き教室のみ</option></select></label></div>
    <p class="hint">${longDate(roomDate)} ${roomTime} 時点 · 授業サンプル＋このブラウザーの登録</p>
    <div class="room-grid">${filtered.map(r=>{const use=atTime(r.id,roomDate,roomTime);return `<article class="panel room-card"><div class="panel-head"><h2>${r.name}</h2><span class="badge ${use?'red':''}">${use?'使用中':'空き'}</span></div><p>講義室 · 定員 ${r.capacity}名</p><div style="font-size:11px">${use?`${escapeHTML(use.name||use.purpose)}<br><span class="muted">${use.start}–${use.end}</span>`:'指定時刻に登録された利用はありません。<br><span class="muted">紙の予約表も確認してください。</span>'}</div><a class="button secondary" href="#register?room=${r.id}&date=${roomDate}&start=${roomTime}">この教室の利用を登録 ${icon('arrow')}</a></article>`}).join('')||'<div class="empty">指定時刻に空いている教室はありません。</div>'}</div>
    <p class="room-note">「空き」は指定時刻の状態です。登録時に利用時間全体の重複を確認します。未登録の紙の予約は反映されません。</p>`;
}
function registerPage() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const requestedDate=params.get('date');
  const requestedStart=params.get('start');
  const formDate=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate||'') && requestedDate>=today ? requestedDate : today;
  const formStart=/^\d{2}:\d{2}$/.test(requestedStart||'') && requestedStart>='08:00' && requestedStart<'20:00' ? requestedStart : '16:30';
  const minutes = Number(formStart.slice(0,2))*60+Number(formStart.slice(3))+60;
  const formEnd = `${String(Math.min(20,Math.floor(minutes/60))).padStart(2,'0')}:${minutes>=1200?'00':String(minutes%60).padStart(2,'0')}`;
  return `${heading('ROOM REGISTRATION','教室の利用登録','紙の予約表に記入した内容を、こちらにも登録してください。')}
    <div class="form-layout"><section class="panel"><div class="panel-head"><h2>利用内容を入力</h2><span class="badge gray">すべて必須</span></div><form id="reservation-form" class="form-grid">
    <label class="field full">教室<select name="room" required>${rooms.map(r=>`<option value="${r.id}" ${params.get('room')===r.id?'selected':''}>${r.name}（${r.capacity}名）</option>`).join('')}</select></label>
    <label class="field full">利用日<input name="date" type="date" min="${today}" value="${formDate}" required></label>
    <label class="field">開始時刻<input name="start" type="time" min="08:00" max="20:00" value="${formStart}" required></label><label class="field">終了時刻<input name="end" type="time" min="08:00" max="20:00" value="${formEnd}" required></label>
    <label class="field full">利用目的<input name="purpose" placeholder="例：グループ学習、委員会活動" maxlength="60" required><small>氏名や学籍番号などの個人情報は入力しないでください。</small></label>
    <label class="check full"><input name="confirmed" type="checkbox" required><span>学生課の紙の予約表に記入済みです。</span></label><div class="full form-message" id="form-message" role="alert"></div><button class="button full" type="submit">${icon('check')}利用内容を登録する</button>
    </form></section><aside class="panel"><h2>教室利用の3ステップ</h2><ol class="steps"><li>紙の予約表に記入<small>学生課のカウンターで、教室と利用時間を確認して予約します。</small></li><li>QRコードを読み取る<small>予約表の横のQRコードから、この登録フォームを開きます。</small></li><li>利用内容を登録<small>教室・日付・時間を入力して、空き教室の表示に反映します。</small></li></ol><div class="info-note">試作版：登録内容はこのブラウザー内だけに保存されます。学校全体への共有・QRコードの設置は、公開URLとデータベースの準備後に行います。</div><button class="button secondary" id="copy-link" style="width:100%;margin-top:16px" type="button">登録フォームのリンクをコピー</button></aside></div>
    <section class="panel" style="margin-top:24px"><div class="panel-head"><h2>このブラウザーで登録した利用</h2><span class="muted" style="font-size:11px">${reservations.length}件</span></div>${reservations.length?reservations.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(r=>`<div class="reservation"><div><strong>${nameOfRoom(r.room)} · ${escapeHTML(r.purpose)}</strong><small>${r.date} ${r.start}–${r.end}</small></div><button class="cancel-button" data-cancel="${escapeHTML(r.id)}">登録を削除</button></div>`).join(''):'<p class="hint">まだ利用登録はありません。</p>'}</section>`;
}
function notify(message) {
  const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,5000);
}
function persist(next) {
  try { localStorage.setItem('campus-reservations-v1',JSON.stringify(next));reservations=next;return true; }
  catch { notify('保存できませんでした。ブラウザーのストレージ設定を確認してください。');return false; }
}
function render() {
  const route=location.hash.slice(1).split('?')[0] || 'home';
  const names={home:'ホーム',timetable:'時間割',changes:'時間割変更',rooms:'空き教室',register:'教室の利用登録'};
  const page=names[route]?route:'home';
  document.getElementById('breadcrumb').textContent=names[page];
  document.title=`${names[page]} — Campus`;
  document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const views={home,timetable,rooms:roomPage,register:registerPage,changes:()=>`${heading('TIMETABLE UPDATES','時間割変更','休講・教室変更・補講のお知らせをまとめて確認。')}<section class="panel"><div class="panel-head"><h2>最新のお知らせ</h2><span class="badge gray">サンプル · 3件</span></div>${changeRows()}</section>`};
  document.getElementById('main').innerHTML=views[page]();
  document.querySelectorAll('[data-student]').forEach(select=>select.addEventListener('change',e=>{
    const key=e.target.dataset.student;
    studentSelection[key]=key==='grade'?Number(e.target.value):e.target.value;
    const id=e.target.id;
    render();
    document.getElementById(id)?.focus({preventScroll:true});
  }));
  for (const id of ['room-date','room-time','room-filter']) document.getElementById(id)?.addEventListener('change',e=>{if(!e.target.value || !e.target.checkValidity())return;if(id==='room-date')roomDate=e.target.value;if(id==='room-time')roomTime=e.target.value;if(id==='room-filter')roomFilter=e.target.value;render()});
  document.getElementById('reservation-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const values=Object.fromEntries(new FormData(e.target));
    const error=document.getElementById('form-message');
    reservations=readReservations();
    if(!values.purpose.trim()){error.textContent='利用目的を入力してください。';return;}
    if(values.date<today || values.start>='20:00' || values.start<'08:00' || values.end>'20:00' || values.start>=values.end){error.textContent='利用日と時間を確認してください。利用時間は8:00〜20:00で、終了は開始より後にしてください。';return;}
    if(occupied(values.room,values.date,values.start,values.end)){error.textContent='この時間帯は授業または登録済みの利用と重複しています。時間か教室を変更してください。';return;}
    const next=[...reservations,{id:globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,room:values.room,date:values.date,start:values.start,end:values.end,purpose:values.purpose.trim()}];
    if(persist(next)){render();notify('利用内容をこのブラウザーに保存しました。');}
  });
  document.querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',()=>{if(persist(reservations.filter(r=>r.id!==button.dataset.cancel))){render();notify('このブラウザーの登録を削除しました。紙の予約表も修正してください。')}}));
  document.getElementById('copy-link')?.addEventListener('click',async()=>{
    if(location.protocol==='file:'){notify('共有リンクはWebサイト公開後に利用できます。');return;}
    try{await navigator.clipboard.writeText(`${location.href.split('#')[0]}#register`);notify('登録フォームのリンクをコピーしました。');}catch{notify('コピーできませんでした。アドレス欄のURLをコピーしてください。');}
  });
}
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);document.getElementById('main').focus({preventScroll:true})});
window.addEventListener('storage',e=>{if(e.key==='campus-reservations-v1'){reservations=readReservations();render()}});
render();
if(!storageAvailable)notify('ブラウザー内の保存データを読み込めませんでした。ストレージ設定を確認してください。');
