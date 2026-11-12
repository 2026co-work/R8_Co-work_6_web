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
  // Safariなどでも取得前にURLを破棄しない。
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const PERIOD_TIMES = [
  { start: '090000', end: '103000', text: '9:00-10:30' },
  { start: '104000', end: '121000', text: '10:40-12:10' },
  { start: '130000', end: '143000', text: '13:00-14:30' },
  { start: '144000', end: '161000', text: '14:40-16:10' }
];

const DAYS_OF_WEEK = ['月', '火', '水', '木', '金'];

/**
 * iCalendar (.ics) 生成
 * GoogleカレンダーやiPhone等に毎週繰り返しの授業としてインポート可能
 */
export function generateIcs(selectedLessons, studentLabel) {
  // 基準週（月曜〜金曜）の日付: 2026年10月5日（月）〜 10月9日（金）
  // 後期末: 2027年2月28日
  const baseDates = {
    1: '20261005', // 月
    2: '20261006', // 火
    3: '20261007', // 水
    4: '20261008', // 木
    5: '20261009'  // 金
  };

  const escapeIcs = text => (text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

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
    const teacher = escapeIcs(lesson.teacher || '');
    const periodText = `${lesson.period}${span > 1 ? `〜${lesson.period + span - 1}` : ''}限`;
    const description = escapeIcs(`担当: ${lesson.teacher || '未定'}\n時限: ${periodText}\n対象: ${studentLabel}${lesson.notes ? `\n備考: ${lesson.notes}` : ''}`);

    events.push([
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      `DESCRIPTION:${description}`,
      `DTSTART;TZID=Asia/Tokyo:${dateStr}T${startTime}`,
      `DTEND;TZID=Asia/Tokyo:${dateStr}T${endTime}`,
      'RRULE:FREQ=WEEKLY;UNTIL=20270228T145959Z',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n'));
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akashi KOSEN//Campus Portal Timetable//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:明石高専 時間割 (${escapeIcs(studentLabel)})`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

/**
 * CSV形式生成（Excel対応BOM付き）
 */
export function generateCsv(selectedLessons, studentLabel) {
  const headers = ['曜日', '開始時限', '終了時限', '時間', '科目名', '教室', '担当教員', 'コマ数', '備考'];
  const rows = [headers];

  // 曜日・時限順にソート
  const sorted = [...selectedLessons].sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.period - b.period));

  for (const l of sorted) {
    const dayName = DAYS_OF_WEEK[l.dayOfWeek - 1] || `${l.dayOfWeek}`;
    const span = l.duration || 1;
    const endPeriod = l.period + span - 1;
    const timeRange = `${PERIOD_TIMES[l.period - 1]?.text.split('-')[0] || ''} - ${PERIOD_TIMES[endPeriod - 1]?.text.split('-')[1] || ''}`;

    rows.push([
      dayName,
      `${l.period}限`,
      `${endPeriod}限`,
      timeRange,
      `"${(l.subjectName || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.teacher || '').replace(/"/g, '""')}"`,
      `${span}コマ`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);
  }

  // UTF-8 BOM (\uFEFF) を付与してExcel文字化けを防止
  return '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
}

/**
 * テキスト / Markdown形式生成
 */
export function generateText(selectedLessons, studentLabel) {
  const lines = [
    `■ 明石高専 時間割（令和8年度後期）`,
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
      lines.push('  （授業なし）');
      continue;
    }

    for (const l of dayLessons) {
      const span = l.duration || 1;
      const pText = `${l.period}${span > 1 ? `〜${l.period + span - 1}` : ''}限`;
      const timeText = `${PERIOD_TIMES[l.period - 1]?.text.split('-')[0] || ''}-${PERIOD_TIMES[l.period + span - 2]?.text.split('-')[1] || ''}`;
      const locText = l.location ? ` [${l.location}]` : '';
      const teacherText = l.teacher ? ` (${l.teacher})` : '';
      lines.push(`  ${pText} (${timeText}) ${l.subjectName}${locText}${teacherText}`);
    }
  }

  lines.push('\n----------------------------------------');
  lines.push('出典: 明石高専 Webページ (https://www.akashi.ac.jp/life/lesson.html)');
  return lines.join('\n');
}

/**
 * 総合エクスポート処理
 */
export async function exportTimetable(snapshot, format, filename, extraData = {}) {
  const { selectedLessons = [], studentLabel = '' } = extraData;

  // サポート対象外のフォーマットチェック
  const validFormats = ['pdf', 'png', 'ics', 'csv', 'json', 'text'];
  if (!validFormats.includes(format)) {
    throw new Error('PDFまたはPNG、カレンダー、CSV、テキスト、JSONを選択してください。');
  }

  // 1. iCalendar (.ics)
  if (format === 'ics') {
    const icsString = generateIcs(selectedLessons, studentLabel);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    downloadBlob(blob, `${filename}.ics`);
    return { success: true, message: 'カレンダーファイル (.ics) を保存しました。' };
  }

  // 2. CSV (.csv)
  if (format === 'csv') {
    const csvString = generateCsv(selectedLessons, studentLabel);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${filename}.csv`);
    return { success: true, message: 'CSVファイル (.csv) を保存しました。' };
  }

  // 3. JSON (.json)
  if (format === 'json') {
    const exportData = {
      meta: {
        title: '明石高専 授業時間割',
        term: '令和8年度後期',
        student: studentLabel,
        exportedAt: new Date().toISOString(),
        totalLessons: selectedLessons.length
      },
      lessons: selectedLessons
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${filename}.json`);
    return { success: true, message: 'JSONファイル (.json) を保存しました。' };
  }

  // 4. テキスト (.txt & クリップボードコピー)
  if (format === 'text') {
    const textString = generateText(selectedLessons, studentLabel);
    // クリップボードにコピー
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textString);
      } catch {}
    }
    const blob = new Blob([textString], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${filename}.txt`);
    return { success: true, message: 'テキストを保存＆クリップボードにコピーしました！' };
  }

  // 5. 画像・PDF (PNG / PDF)

  snapshot.querySelectorAll('[data-export-exclude]').forEach(node => node.remove());
  snapshot.removeAttribute('id');
  snapshot.classList.add('export-sheet');
  snapshot.setAttribute('data-theme', 'light');
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.inert = true;
  snapshot.style.cssText = 'position:fixed;left:0;top:0;width:1100px;max-width:none;padding:28px;background:#fff;color:#252b39;z-index:-100;pointer-events:none;border:0;border-radius:0;box-shadow:none;';
  const title = document.createElement('p');
  title.className = 'export-brand';
  title.textContent = 'Akashi KOSEN 学生ページ(仮) ｜ 令和8年度 後期時間割';
  snapshot.prepend(title);
  const scroller = snapshot.querySelector('.table-scroll');
  scroller.style.cssText = 'overflow:visible;width:100%;max-height:none;';
  scroller.scrollLeft = 0;
  const table = snapshot.querySelector('table');
  table.style.width = '100%';
  document.body.append(snapshot);

  try {
    await document.fonts.ready;
    const canvas = await html2canvas(snapshot, {
      backgroundColor: '#ffffff', scale: 2, logging: false,
      windowWidth: 1200, windowHeight: Math.max(900, snapshot.scrollHeight + 60),
      scrollX: 0, scrollY: 0, useCORS: true,
    });
    if (format === 'png') {
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNGを生成できませんでした。')), 'image/png'));
      downloadBlob(blob, `${filename}.png`);
    } else {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const bounds = fitOnPage(canvas.width, canvas.height);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');
      pdf.setProperties({ title: filename, creator: 'Akashi KOSEN 学生ページ(仮)' });
      downloadBlob(pdf.output('blob'), `${filename}.pdf`);
    }
    canvas.width = 0;
    canvas.height = 0;
    return { success: true, message: `${format.toUpperCase()}を保存しました。` };
  } finally {
    snapshot.remove();
  }
}
