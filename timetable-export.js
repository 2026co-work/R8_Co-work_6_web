import { html2canvas, jsPDF } from './vendor/export-libraries.js';

export function fitOnPage(width, height, pageWidth = 297, pageHeight = 210, margin = 10) {
  if (!(width > 0 && height > 0)) throw new Error('時間割の画像サイズが不正です。');
  const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height);
  const w = width * scale;
  const h = height * scale;
  return { x: (pageWidth - w) / 2, y: (pageHeight - h) / 2, width: w, height: h };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const PERIOD_TIMES = [
  { start: '090000', end: '103000', startTime: '09:00', endTime: '10:30' },
  { start: '104000', end: '121000', startTime: '10:40', endTime: '12:10' },
  { start: '130000', end: '143000', startTime: '13:00', endTime: '14:30' },
  { start: '144000', end: '161000', startTime: '14:40', endTime: '16:10' }
];

const DAYS_OF_WEEK = ['月', '火', '水', '木', '金'];

/**
 * CRC32計算（PNGチャンク用）
 */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

function calculateCrc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * PNGバイナリに tEXt メタデータチャンク（Title, Author, Creation Time）を注入
 */
export async function injectPngMetadata(blob, metadata = {}) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
    return blob;
  }

  const ihdrEndOffset = 33;
  const chunksToAdd = [];

  const textEntries = [
    { key: 'Title', value: metadata.title || '明石高専 授業時間割' },
    { key: 'Author', value: metadata.author || '明石高専 Co+work6班' },
    { key: 'Creation Time', value: metadata.creationTime || new Date().toISOString() },
    { key: 'Description', value: metadata.description || '' }
  ].filter(e => Boolean(e.value));

  for (const entry of textEntries) {
    const keyBytes = new TextEncoder().encode(entry.key);
    const valBytes = new TextEncoder().encode(entry.value);
    const dataLen = keyBytes.length + 1 + valBytes.length;

    const chunk = new Uint8Array(4 + 4 + dataLen + 4);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, dataLen);
    chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x58; chunk[7] = 0x74; // 'tEXt'
    chunk.set(keyBytes, 8);
    chunk[8 + keyBytes.length] = 0;
    chunk.set(valBytes, 8 + keyBytes.length + 1);

    const crcData = chunk.subarray(4, 8 + dataLen);
    const crc = calculateCrc32(crcData);
    view.setUint32(8 + dataLen, crc);

    chunksToAdd.push(chunk);
  }

  const totalExtraLen = chunksToAdd.reduce((sum, c) => sum + c.length, 0);
  const resultBytes = new Uint8Array(bytes.length + totalExtraLen);

  resultBytes.set(bytes.subarray(0, ihdrEndOffset), 0);
  let curOffset = ihdrEndOffset;
  for (const chunk of chunksToAdd) {
    resultBytes.set(chunk, curOffset);
    curOffset += chunk.length;
  }
  resultBytes.set(bytes.subarray(ihdrEndOffset), curOffset);

  return new Blob([resultBytes], { type: 'image/png' });
}

const escapeIcsText = text => String(text ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

function formatDateIcs(dateStr, addDays = 0) {
  const match = String(dateStr || '').trim().match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) return '';
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + addDays));
  const yyyy = String(d.getUTCFullYear()).padStart(4, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function resolveIcsUntil(options = {}) {
  const raw = options?.semesterInfo?.until || options?.semesterInfo?.endDate || options?.until;
  if (raw) {
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str.replace(/-/g, '')}T145959Z`;
    if (/^\d{8}$/.test(str)) return `${str}T145959Z`;
    return str;
  }
  const fy = Number(options?.fiscalYear) || 2026;
  if (options?.term === '前期') return `${fy}0831T145959Z`;
  if (options?.fiscalYear && fy !== 2026) return `${fy + 1}0228T145959Z`;
  return '20270228T145959Z';
}

function resolveIcsBaseDates(options = {}) {
  const defaultDates = { 1: '20261005', 2: '20261006', 3: '20261007', 4: '20261008', 5: '20261009' };
  const fy = Number(options?.fiscalYear) || 2026;
  const term = options?.term || '後期';
  const startRaw = options?.semesterInfo?.startDate;
  if (!startRaw && term !== '前期' && fy === 2026) return defaultDates;
  const seedStr = startRaw || (term === '前期' ? `${fy}-04-06` : `${fy}-10-05`);
  const seedDate = new Date(`${seedStr}T00:00:00Z`);
  if (Number.isNaN(seedDate.getTime())) return defaultDates;
  const dow = seedDate.getUTCDay();
  const mondayOffset = dow === 0 ? 1 : (dow === 6 ? 2 : -(dow - 1));
  const out = {};
  for (let d = 1; d <= 5; d++) {
    const dt = new Date(seedDate.getTime() + (mondayOffset + d - 1) * 86400000);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    out[d] = `${yyyy}${mm}${dd}`;
  }
  return out;
}

function formatFiscalYearText(fy) {
  if (!fy) return '令和8年度';
  if (typeof fy === 'string' && fy.includes('年度')) return fy;
  const num = Number(fy);
  if (Number.isFinite(num) && num >= 2019) return `令和${num - 2018}年度`;
  return `${fy}年度`;
}

const VTIMEZONE_TOKYO = [
  'BEGIN:VTIMEZONE',
  'TZID:Asia/Tokyo',
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0900',
  'TZOFFSETTO:+0900',
  'TZNAME:JST',
  'END:STANDARD',
  'END:VTIMEZONE'
].join('\r\n');

function filterCalendarItemsByPeriod(calendarData = {}, period = 'all') {
  const rawEvents = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const rawSubs = Array.isArray(calendarData?.daySubstitutions) ? calendarData.daySubstitutions : [];
  if (!period || period === 'all') {
    return { events: rawEvents, subs: rawSubs };
  }
  const koukiStart = calendarData?.terms?.kouki?.classesStartDate || calendarData?.terms?.kouki?.startDate || '2026-09-24';
  const matchDate = (startStr, endStr) => {
    if (!startStr) return false;
    const endSafe = endStr || startStr;
    const startMonth = Number(String(startStr).slice(5, 7));
    if (period === 'zenki') {
      return startStr < koukiStart && startMonth >= 4;
    }
    if (period === 'kouki') {
      return endSafe >= koukiStart || startMonth <= 3;
    }
    return true;
  };
  return {
    events: rawEvents.filter(ev => ev && matchDate(ev.date || ev.startDate, ev.endDate || ev.date)),
    subs: rawSubs.filter(sub => sub && matchDate(sub.date, sub.date))
  };
}

function buildCalendarVevents(calendarData = {}, options = {}) {
  const includeExams = options?.includeExams !== false;
  const period = options?.period || 'all';
  const { events: rawEvents, subs: rawSubs } = filterCalendarItemsByPeriod(calendarData, period);
  const vevents = [];
  const subEventDates = new Set();

  rawEvents.forEach((ev, idx) => {
    if (!ev || !ev.date || !ev.title) return;
    if (!includeExams && ev.type === 'exam') return;

    const start = formatDateIcs(ev.date, 0);
    if (!start) return;
    if (ev.type === 'special' || /振替/.test(String(ev.title))) {
      subEventDates.add(String(ev.date).trim());
    }
    const end = ev.endDate ? formatDateIcs(ev.endDate, 1) : formatDateIcs(ev.date, 1);
    const desc = ev.description || ev.note || '';

    vevents.push([
      'BEGIN:VEVENT',
      `UID:cal-${start}-${idx}@akashi-kosen`,
      `DTSTART;VALUE=DATE:${start}`,
      end ? `DTEND;VALUE=DATE:${end}` : '',
      `SUMMARY:${escapeIcsText(ev.title)}`,
      desc ? `DESCRIPTION:${escapeIcsText(desc)}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n'));
  });

  rawSubs.forEach((sub, idx) => {
    if (!sub || !sub.date) return;
    if (subEventDates.has(String(sub.date).trim())) return;
    const start = formatDateIcs(sub.date, 0);
    if (!start) return;
    const end = formatDateIcs(sub.date, 1);
    const summary = sub.reason || sub.note || (sub.substituteDay ? `${sub.substituteDay}曜日授業振替` : '授業振替');

    vevents.push([
      'BEGIN:VEVENT',
      `UID:cal-sub-${start}-${idx}@akashi-kosen`,
      `DTSTART;VALUE=DATE:${start}`,
      end ? `DTEND;VALUE=DATE:${end}` : '',
      `SUMMARY:${escapeIcsText(summary)}`,
      sub.note && sub.note !== summary ? `DESCRIPTION:${escapeIcsText(sub.note)}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n'));
  });

  return vevents;
}

/**
 * iCalendar (.ics) 生成
 * options.mode:
 *   - 'calendar' (デフォルト/後方互換): holidays を EXDATE 除外し、daySubstitutions があれば振替先の授業を個別 VEVENT として追加
 *   - 'simple': 4x5 の単純な週間繰り返し（祝日除外・振替なし）
 * options.includeCalendarEvents: true の場合、calendarData の行事予定（VALUE=DATE）も同梱
 */
export function generateIcs(selectedLessons, studentLabel, options = {}) {
  const baseDates = resolveIcsBaseDates(options);
  const mode = options?.mode === 'simple' ? 'simple' : 'calendar';
  const escapeIcs = escapeIcsText;
  const untilStr = resolveIcsUntil(options);
  const untilDateCompact = untilStr.slice(0, 8);
  const minBaseCompact = Object.values(baseDates).sort()[0] || '20260401';

  const parsedHolidays = mode === 'simple'
    ? []
    : (Array.isArray(options?.holidays) ? options.holidays : [])
        .map(h => {
          const compact = formatDateIcs(h, 0);
          if (!compact) return null;
          const d = new Date(Date.UTC(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)) - 1, Number(compact.slice(6, 8))));
          return { compact, dow: d.getUTCDay() };
        })
        .filter(Boolean);

  const rawSubs = mode === 'simple'
    ? []
    : (Array.isArray(options?.daySubstitutions) ? options.daySubstitutions : []);
  const parsedSubs = rawSubs
    .map(sub => {
      const compact = formatDateIcs(sub?.date, 0);
      if (!compact || compact < minBaseCompact || compact > untilDateCompact) return null;
      const d = new Date(Date.UTC(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)) - 1, Number(compact.slice(6, 8))));
      const origDow = d.getUTCDay();
      let effDow = Number(sub.effectiveDay);
      if (!(effDow >= 1 && effDow <= 5) && sub.substituteDay) {
        const idx = DAYS_OF_WEEK.indexOf(String(sub.substituteDay).replace(/曜日$/, ''));
        if (idx >= 0) effDow = idx + 1;
      }
      if (!(effDow >= 1 && effDow <= 5)) return null;
      return { compact, origDow, effDow, subDayLabel: DAYS_OF_WEEK[effDow - 1], note: sub.note || sub.reason || '' };
    })
    .filter(Boolean);

  const calTitle = (options?.fiscalYear || options?.term)
    ? `明石高専 ${formatFiscalYearText(options?.fiscalYear || 2026)}${options?.term || '後期'} 時間割 (${escapeIcs(studentLabel)})`
    : `明石高専 時間割 (${escapeIcs(studentLabel)})`;
  const events = [];

  for (const lesson of selectedLessons) {
    const day = lesson.dayOfWeek;
    const dateStr = baseDates[day];
    if (!dateStr) continue;

    const startP = lesson.period - 1;
    const span = lesson.duration || 1;
    const endP = Math.min(3, startP + span - 1);

    const startTime = PERIOD_TIMES[startP]?.start || '090000';
    const endTime = PERIOD_TIMES[endP]?.end || '103000';

    const uid = `${dateStr}-${lesson.id || Math.random().toString(36).slice(2)}@akashi-kosen`;
    const summary = escapeIcs(lesson.subjectName);
    const location = escapeIcs(lesson.location || '');
    const periodText = `${lesson.period}${span > 1 ? `〜${lesson.period + span - 1}` : ''}限`;
    const description = escapeIcs(`担当: ${lesson.teacher || '未定'}\n時限: ${periodText}\n対象: ${studentLabel}${lesson.notes ? `\n備考: ${lesson.notes}` : ''}`);

    const exDateSet = new Set(parsedHolidays.filter(h => h.dow === day).map(h => h.compact));
    // 振替元となる曜日の通常授業を除外（振替先が同じ曜日でない場合）
    for (const sub of parsedSubs) {
      if (sub.origDow === day && sub.effDow !== day) {
        exDateSet.add(sub.compact);
      }
    }
    const exDates = Array.from(exDateSet).sort();

    events.push([
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      `DESCRIPTION:${description}`,
      `DTSTART;TZID=Asia/Tokyo:${dateStr}T${startTime}`,
      `DTEND;TZID=Asia/Tokyo:${dateStr}T${endTime}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`,
      exDates.length > 0 ? `EXDATE;TZID=Asia/Tokyo:${exDates.map(d => `${d}T${startTime}`).join(',')}` : '',
      'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n'));

    // 振替授業日に振替先曜日の授業を個別 VEVENT として追加
    for (const sub of parsedSubs) {
      if (sub.effDow !== day || sub.origDow === day) continue;
      const subUid = `sub-${sub.compact}-${lesson.id || Math.random().toString(36).slice(2)}@akashi-kosen`;
      const subDesc = escapeIcs(`振替授業（${sub.subDayLabel}曜日授業）\n担当: ${lesson.teacher || '未定'}\n時限: ${periodText}\n対象: ${studentLabel}${lesson.notes ? `\n備考: ${lesson.notes}` : ''}`);
      events.push([
        'BEGIN:VEVENT',
        `UID:${subUid}`,
        `SUMMARY:${summary}`,
        location ? `LOCATION:${location}` : '',
        `DESCRIPTION:${subDesc}`,
        `DTSTART;TZID=Asia/Tokyo:${sub.compact}T${startTime}`,
        `DTEND;TZID=Asia/Tokyo:${sub.compact}T${endTime}`,
        'TRANSP:OPAQUE',
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].filter(Boolean).join('\r\n'));
    }
  }

  if (options?.includeCalendarEvents && options?.calendarData) {
    const calPeriod = options.calendarPeriod || (options.term === '前期' ? 'zenki' : (options.term === '後期' ? 'kouki' : 'all'));
    events.push(...buildCalendarVevents(options.calendarData, {
      period: calPeriod,
      includeExams: options.includeExams !== false
    }));
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akashi KOSEN//Campus Portal Timetable//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calTitle}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    VTIMEZONE_TOKYO,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * 年間行事予定 iCalendar (.ics) 生成 (RFC 5545 VALUE=DATE)
 * options.period: 'all' | 'zenki' | 'kouki'
 */
export function generateCalendarIcs(calendarData = {}, options = {}) {
  const period = options?.period || 'all';
  const vevents = buildCalendarVevents(calendarData, options);
  const periodSuffix = period === 'zenki' ? '（前期）' : (period === 'kouki' ? '（後期）' : '');
  const calName = escapeIcsText(`${calendarData?.meta?.title || '明石高専 年間行事予定'}${periodSuffix}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akashi KOSEN//Campus Portal Calendar//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * CSV形式生成（1時限=1行の正規化展開）
 * options.includeEmpty が true の場合、空きコマも出力
 */
export function generateCsv(selectedLessons, studentLabel, options = {}) {
  const { includeEmpty = false } = options;
  const headers = ['曜日', '時限', '開始時間', '終了時間', '科目名', '教室', '担当教員', '連続コマ', '備考'];
  const rows = [];
  const hasDynamicMeta = Boolean(options?.fiscalYear || options?.term || options?.semesterInfo);
  if (hasDynamicMeta) {
    const fy = formatFiscalYearText(options?.fiscalYear || options?.semesterInfo?.fiscalYear);
    const rawFy = options?.fiscalYear || options?.semesterInfo?.fiscalYear || 2026;
    const termStr = options?.term || options?.semesterInfo?.term || '後期';
    rows.push(['# メタデータ', `${fy} (${rawFy})`, termStr, `対象: ${studentLabel}`]);
  }
  rows.push(headers);

  const sorted = [...selectedLessons].sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.period - b.period));

  if (!includeEmpty) {
    for (const l of sorted) {
      const dayName = DAYS_OF_WEEK[l.dayOfWeek - 1] || `${l.dayOfWeek}`;
      const span = l.duration || 1;

      for (let offset = 0; offset < span; offset++) {
        const currentPeriod = l.period + offset;
        const timeInfo = PERIOD_TIMES[currentPeriod - 1] || { startTime: '', endTime: '' };
        const spanLabel = span > 1 ? `${span}コマ連続 (${offset + 1}/${span})` : '1コマ';

        rows.push([
          dayName,
          `${currentPeriod}限`,
          timeInfo.startTime,
          timeInfo.endTime,
          `"${(l.subjectName || '').replace(/"/g, '""')}"`,
          `"${(l.location || '').replace(/"/g, '""')}"`,
          `"${(l.teacher || '').replace(/"/g, '""')}"`,
          `"${spanLabel}"`,
          `"${(l.notes || '').replace(/"/g, '""')}"`
        ]);
      }
    }
  } else {
    // 空きコマを含めて月〜金、1〜4限を網羅
    for (let d = 1; d <= 5; d++) {
      const dayName = DAYS_OF_WEEK[d - 1];
      const dayLessons = sorted.filter(l => l.dayOfWeek === d);

      let p = 1;
      while (p <= 4) {
        const lesson = dayLessons.find(l => l.period <= p && p < l.period + (l.duration || 1));
        const timeInfo = PERIOD_TIMES[p - 1] || { startTime: '', endTime: '' };

        if (lesson) {
          const span = lesson.duration || 1;
          const offset = p - lesson.period;
          const spanLabel = span > 1 ? `${span}コマ連続 (${offset + 1}/${span})` : '1コマ';
          rows.push([
            dayName,
            `${p}限`,
            timeInfo.startTime,
            timeInfo.endTime,
            `"${(lesson.subjectName || '').replace(/"/g, '""')}"`,
            `"${(lesson.location || '').replace(/"/g, '""')}"`,
            `"${(lesson.teacher || '').replace(/"/g, '""')}"`,
            `"${spanLabel}"`,
            `"${(lesson.notes || '').replace(/"/g, '""')}"`
          ]);
        } else {
          rows.push([
            dayName,
            `${p}限`,
            timeInfo.startTime,
            timeInfo.endTime,
            `"（空き）"`,
            `""`,
            `""`,
            `"1コマ"`,
            `""`
          ]);
        }
        p++;
      }
    }
  }

  return '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
}

/**
 * テキスト形式生成
 */
export function generateText(selectedLessons, studentLabel, options = {}) {
  const { includeLocation = true, includeTeacher = true, includeEmpty = false, fiscalYear, term, semesterInfo } = options;
  const fyLabel = formatFiscalYearText(fiscalYear || semesterInfo?.fiscalYear);
  const termLabel = term || semesterInfo?.term || '後期';
  const lines = [
    `■ 明石高専 時間割（${fyLabel}${termLabel}）`,
    `対象: ${studentLabel}`,
    `----------------------------------------`
  ];

  for (let d = 1; d <= 5; d++) {
    const dayName = DAYS_OF_WEEK[d - 1];
    const dayLessons = selectedLessons
      .filter(l => l.dayOfWeek === d)
      .sort((a, b) => a.period - b.period);

    lines.push(`\n【${dayName}曜日】`);
    if (dayLessons.length === 0) {
      if (includeEmpty) {
        for (let p = 1; p <= 4; p++) {
          const time = PERIOD_TIMES[p - 1] || { startTime: '', endTime: '' };
          lines.push(`  ${p}限 (${time.startTime}-${time.endTime}) （空き）`);
        }
      } else {
        lines.push('  （授業なし）');
      }
      continue;
    }

    if (!includeEmpty) {
      for (const l of dayLessons) {
        const span = l.duration || 1;
        const pText = `${l.period}${span > 1 ? `〜${l.period + span - 1}` : ''}限`;
        const startTime = PERIOD_TIMES[l.period - 1]?.startTime || '';
        const endTime = PERIOD_TIMES[l.period + span - 2]?.endTime || '';
        const locText = includeLocation && l.location ? ` [${l.location}]` : '';
        const rawTeacher = String(l.teacher || '').trim();
        const teacherText = includeTeacher && rawTeacher
          ? ((/^\(.*\)$/.test(rawTeacher) || /^（.*）$/.test(rawTeacher)) ? ` ${rawTeacher}` : ` (${rawTeacher})`)
          : '';
        lines.push(`  ${pText} (${startTime}-${endTime}) ${l.subjectName}${locText}${teacherText}`);
      }
    } else {
      let p = 1;
      while (p <= 4) {
        const lesson = dayLessons.find(l => l.period <= p && p < l.period + (l.duration || 1));
        const time = PERIOD_TIMES[p - 1] || { startTime: '', endTime: '' };
        if (lesson) {
          if (lesson.period === p) {
            const span = lesson.duration || 1;
            const pText = `${lesson.period}${span > 1 ? `〜${lesson.period + span - 1}` : ''}限`;
            const startTime = PERIOD_TIMES[lesson.period - 1]?.startTime || '';
            const endTime = PERIOD_TIMES[lesson.period + span - 2]?.endTime || '';
            const locText = includeLocation && lesson.location ? ` [${lesson.location}]` : '';
            const rawTeacher = String(lesson.teacher || '').trim();
            const teacherText = includeTeacher && rawTeacher
              ? ((/^\(.*\)$/.test(rawTeacher) || /^（.*）$/.test(rawTeacher)) ? ` ${rawTeacher}` : ` (${rawTeacher})`)
              : '';
            lines.push(`  ${pText} (${startTime}-${endTime}) ${lesson.subjectName}${locText}${teacherText}`);
          }
        } else {
          lines.push(`  ${p}限 (${time.startTime}-${time.endTime}) （空き）`);
        }
        p++;
      }
    }
  }

  lines.push('\n----------------------------------------');
  lines.push('出典: 明石高専 Webページ (https://www.akashi.ac.jp/life/lesson.html)');
  return lines.join('\n');
}

/**
 * JSON形式生成
 * options.includeEmpty が true の場合、空きコマ情報も含める
 */
export function generateJson(selectedLessons, studentLabel, updated = '2026-09-24', options = {}) {
  const { includeEmpty = false, fiscalYear, term, semesterInfo } = options;
  const totalPeriods = selectedLessons.reduce((sum, l) => sum + (l.duration || 1), 0);
  const fyLabel = formatFiscalYearText(fiscalYear || semesterInfo?.fiscalYear);
  const termLabel = term || semesterInfo?.term || '後期';

  let outputLessons = selectedLessons;
  if (includeEmpty) {
    const list = [...selectedLessons];
    for (let d = 1; d <= 5; d++) {
      for (let p = 1; p <= 4; p++) {
        const exists = list.some(l => l.dayOfWeek === d && l.period <= p && p < l.period + (l.duration || 1));
        if (!exists) {
          list.push({
            id: `empty-d${d}-p${p}`,
            dayOfWeek: d,
            period: p,
            duration: 1,
            subjectName: '（空き）',
            empty: true
          });
        }
      }
    }
    outputLessons = list.sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.period - b.period));
  }

  const exportData = {
    meta: {
      title: '明石高専 授業時間割',
      term: `${fyLabel}${termLabel}`,
      ...(fiscalYear || semesterInfo?.fiscalYear ? { fiscalYear: fiscalYear || semesterInfo?.fiscalYear } : {}),
      student: studentLabel,
      sourceUpdated: updated,
      totalPeriods: totalPeriods,
      totalSubjects: selectedLessons.length
    },
    lessons: outputLessons
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * 所属の短縮表記 (例: 4EJ, 1-3-E)
 */
export function formatStudentShortBadge(label) {
  if (!label) return '';
  const acMatch = label.match(/専攻科([12])年\s*.*?(ME|AC)/);
  if (acMatch) {
    return `専${acMatch[1]}${acMatch[2]}`;
  }
  const highMatch = label.match(/([45])年\s*([MECA])(?:学科|科)?(?:・(?:電気電子コース\((ED)\)|情報コース\((EJ)\)))?/);
  if (highMatch) {
    const grade = highMatch[1];
    const course = highMatch[3] || highMatch[4];
    if (course) return `${grade}${course}`;
    return `${grade}${highMatch[2]}`;
  }
  const midMatch = label.match(/3年\s*([MECA])(?:学科|科)?(?:・(留学生))?/);
  if (midMatch) {
    return `3${midMatch[1]}${midMatch[2] ? '-留' : ''}`;
  }
  const lowMatch = label.match(/([12])年\s*([MECA])(?:学科|科)?・(\d)組/);
  if (lowMatch) {
    return `${lowMatch[1]}-${lowMatch[3]}-${lowMatch[2]}`;
  }
  return label.replace(/\s+/g, '');
}

function escapeHtmlSimple(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function prepareExportSnapshot(snapshot, options = {}) {
  snapshot.querySelectorAll('[data-export-exclude]').forEach(node => node.remove());
  snapshot.removeAttribute('id');
  snapshot.classList.add('export-sheet');

  const theme = options.theme || (typeof document !== 'undefined' && document.documentElement?.getAttribute('data-theme')) || 'light';
  snapshot.setAttribute('data-theme', theme);
  snapshot.setAttribute('aria-hidden', 'true');

  const label = options.studentLabel || '';
  const updated = options.updated || '2026-09-24';
  const termLabel = options.term || options.semesterInfo?.term || '後期';
  const fyLabel = formatFiscalYearText(options.fiscalYear || options.semesterInfo?.fiscalYear);

  snapshot.querySelector('.panel-head')?.remove?.();
  snapshot.querySelector('.timetable-source')?.remove?.();

  const headerRow = document.createElement('div');
  headerRow.className = 'export-header-row';
  headerRow.innerHTML = `
    <div class="export-header-main">
      <div class="export-title" role="heading" aria-level="2">明石高専 ${escapeHtmlSimple(fyLabel)}${escapeHtmlSimple(termLabel)}時間割</div>
      <span class="export-badge-tag">${escapeHtmlSimple(label)}</span>
      <span class="export-team-tag">Co+work 6班</span>
    </div>
    <div class="export-header-sub">
      <small class="export-pdf-date">PDF参照: ${escapeHtmlSimple(updated)}</small>
    </div>
  `;
  snapshot.prepend(headerRow);

  const scroller = snapshot.querySelector('.table-scroll');
  if (scroller) {
    scroller.style.cssText = 'overflow:visible;width:100%;max-height:none;';
    scroller.scrollLeft = 0;
  }
  const table = snapshot.querySelector('table');
  if (table) table.style.width = '100%';
  return snapshot;
}

export function applyExportSizeStyle(sheet, config = {}) {
  const pad = config.padding ?? 10;
  const cellH = config.cellHeight ?? 172;
  const scale = (config.fontScale ?? 105) / 100;
  sheet.style.setProperty('--export-pad', `${pad}px`);
  sheet.style.setProperty('--export-cell-h', `${cellH}px`);
  sheet.style.setProperty('--export-font-scale', String(scale));
  sheet.style.padding = `${pad}px`;
}

async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed', e);
    }
  }
  if (typeof document !== 'undefined') {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) return true;
    } catch {
      ta.remove();
    }
  }
  return false;
}

/**
 * 総合エクスポート処理
 */
export async function exportTimetable(snapshot, format, filename, options = {}) {
  const validFormats = ['pdf', 'png', 'ics', 'csv', 'json', 'text'];
  if (!validFormats.includes(format)) {
    throw new Error('PDFまたはPNG、カレンダー、CSV、テキスト、JSONを選択してください。');
  }

  const {
    selectedLessons = [],
    studentLabel = '',
    action = 'download',
    includeEmpty = false,
    fiscalYear,
    term,
    semesterInfo,
    holidays,
    mode,
    daySubstitutions,
    includeCalendarEvents,
    calendarData,
    calendarPeriod,
    includeExams
  } = options;

  // 1. iCalendar (.ics)
  if (format === 'ics') {
    const icsString = generateIcs(selectedLessons, studentLabel, {
      semesterInfo,
      holidays,
      fiscalYear,
      term,
      mode,
      daySubstitutions,
      includeCalendarEvents,
      calendarData,
      calendarPeriod,
      includeExams
    });
    if (action === 'copy') {
      const ok = await copyTextToClipboard(icsString);
      if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
      return { success: true, message: 'カレンダーテキストをクリップボードにコピーしました。' };
    }
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    downloadBlob(blob, `${filename}.ics`);
    return { success: true, message: 'カレンダーファイル (.ics) を保存しました。' };
  }

  // 2. CSV (.csv)
  if (format === 'csv') {
    const csvString = generateCsv(selectedLessons, studentLabel, { includeEmpty, fiscalYear, term, semesterInfo });
    if (action === 'copy') {
      const ok = await copyTextToClipboard(csvString);
      if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
      return { success: true, message: 'CSVをクリップボードにコピーしました。' };
    }
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${filename}.csv`);
    return { success: true, message: 'CSVファイル (.csv) を保存しました。' };
  }

  // 3. JSON (.json)
  if (format === 'json' || format === 'all-json') {
    const jsonString = format === 'all-json'
      ? generateAllLessonsJson(options.allLessons || selectedLessons, { fiscalYear, term, url: options.sourceUrl, updated: options.updated })
      : generateJson(selectedLessons, studentLabel, options.updated, { includeEmpty, fiscalYear, term, semesterInfo });
    if (action === 'copy') {
      const ok = await copyTextToClipboard(jsonString);
      if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
      return { success: true, message: format === 'all-json' ? '全授業データのJSONをクリップボードにコピーしました。' : 'JSONデータをクリップボードにコピーしました。' };
    }
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const fyLabel = formatFiscalYearText(fiscalYear);
    const outName = format === 'all-json' ? `明石高専_${fyLabel}${term}_全時間割データ.json` : `${filename}.json`;
    downloadBlob(blob, outName);
    return { success: true, message: format === 'all-json' ? '全授業データ（JSON）を保存しました。' : 'JSONファイル (.json) を保存しました。' };
  }

  // 4. テキスト (.txt & クリップボードコピー)
  if (format === 'text') {
    const textString = generateText(selectedLessons, studentLabel, { ...options.textOptions, includeEmpty, fiscalYear, term, semesterInfo });
    if (action === 'copy') {
      const ok = await copyTextToClipboard(textString);
      if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
      return { success: true, message: 'テキストをクリップボードにコピーしました！' };
    }
    const blob = new Blob([textString], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${filename}.txt`);
    return { success: true, message: 'テキストファイルを保存しました。' };
  }

  // 5. 画像・PDF (PNG / PDF)
  if (format === 'pdf' && action === 'copy') {
    throw new Error('PDFのクリップボードコピーには対応していません。「PDFダウンロード」をご利用ください。');
  }

  const isDark = (options.theme || (typeof document !== 'undefined' && document.documentElement?.getAttribute('data-theme'))) === 'dark';
  const bgColor = isDark ? '#171b26' : '#ffffff';
  const fgColor = isDark ? '#e8eaf0' : '#252b39';
  prepareExportSnapshot(snapshot, options);

  // PNG画像出力 (html2canvas) ＋ PDF直接出力 (jsPDF)
  const a4H = Math.round(1100 * 210 / 297); // 778px
  const isA4 = Boolean(options.a4Mode);
  snapshot.inert = true;
  snapshot.style.cssText = `position:fixed;left:0;top:0;width:1100px;max-width:none;${isA4 ? `height:${a4H}px;max-height:${a4H}px;box-sizing:border-box;overflow:hidden;` : ''}background:${bgColor};color:${fgColor};z-index:-9999;pointer-events:none;border:0;border-radius:0;box-shadow:none;`;
  applyExportSizeStyle(snapshot, options.sizeConfig);
  document.body.append(snapshot);

  let canvas = null;
  try {
    await document.fonts.ready;
    canvas = await html2canvas(snapshot, {
      backgroundColor: bgColor, scale: 2.5, logging: false,
      windowWidth: 1100, windowHeight: isA4 ? a4H : Math.max(600, snapshot.scrollHeight),
      scrollX: 0, scrollY: 0, useCORS: true,
    });

    if (format === 'png') {
      const rawBlob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNGを生成できませんでした。')), 'image/png'));
      const metaBlob = await injectPngMetadata(rawBlob, {
        title: filename,
        author: '明石高専 Co+work6班',
        creationTime: new Date().toISOString(),
        description: `対象: ${studentLabel}`
      });

      if (action === 'copy') {
        if (typeof ClipboardItem !== 'undefined' && navigator?.clipboard?.write) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': metaBlob })
            ]);
            return { success: true, message: '画像をクリップボードにコピーしました！' };
          } catch (e) {
            console.warn('Image clipboard copy failed', e);
            throw new Error('画像のクリップボードへのコピーに失敗しました。');
          }
        }
        throw new Error('お使いの環境は画像のクリップボードコピーに対応していません。');
      }

      downloadBlob(metaBlob, `${filename}.png`);
      return { success: true, message: 'PNG画像を保存しました。' };
    } else {
      if (action === 'copy') {
        throw new Error('PDFのクリップボードコピーには対応していません。「PDFダウンロード」をご利用ください。');
      }
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      if (isDark) {
        pdf.setFillColor(23, 27, 38);
        pdf.rect(0, 0, 297, 210, 'F');
      }
      const pdfMargin = options.sizeConfig ? Math.max(4, Math.round(options.sizeConfig.padding * 0.35)) : 5;
      const bounds = fitOnPage(canvas.width, canvas.height, 297, 210, pdfMargin);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');
      pdf.setProperties({ title: filename, creator: '明石高専 Co+work6班' });
      downloadBlob(pdf.output('blob'), `${filename}.pdf`);
      return { success: true, message: 'PDFを保存しました。' };
    }
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    snapshot.remove();
  }
}

/**
 * 年間行事予定 iCalendar (.ics) ファイル保存
 */
export async function exportCalendarIcs(calendarData, filename = 'akashi-kosen-calendar', options = {}) {
  const icsString = generateCalendarIcs(calendarData, options);
  if (options?.action === 'copy') {
    const ok = await copyTextToClipboard(icsString);
    if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
    return { success: true, message: '年間行事予定のiCalテキストをコピーしました。' };
  }
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const safeName = String(filename || 'akashi-kosen-calendar').replace(/\.ics$/i, '');
  downloadBlob(blob, `${safeName}.ics`);
  return { success: true, message: '年間行事予定 (.ics) を保存しました。' };
}

/**
 * 全学科・全学年の時間割原本データ（JSON文字列）を生成
 */
export function generateAllLessonsJson(lessons, sourceInfo = {}) {
  const fyLabel = formatFiscalYearText(sourceInfo.fiscalYear);
  const termLabel = sourceInfo.term || '後期';
  const exportData = {
    meta: {
      title: `明石高専 ${fyLabel}${termLabel} 全時間割原本データ`,
      sourceUrl: sourceInfo.url || 'https://www.akashi.ac.jp/life/lesson.html',
      sourceUpdated: sourceInfo.updated || '2026-09-24',
      totalLessons: lessons.length,
      exportedAt: new Date().toISOString(),
      note: '明石高専の全学年・全学科（機械・電気情報・都市システム・建築）の時間割原本データセットです。'
    },
    lessons: lessons
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * 全学科・全学年の時間割原本データ（JSON）のエクスポート
 */
export function exportAllLessonsJson(lessons, sourceInfo = {}) {
  const fyLabel = formatFiscalYearText(sourceInfo.fiscalYear);
  const termLabel = sourceInfo.term || '後期';
  const jsonString = generateAllLessonsJson(lessons, sourceInfo);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `明石高専_${fyLabel}${termLabel}_全時間割データ.json`);
  return { success: true, message: '全時間割データ（JSON）をダウンロードしました。' };
}
