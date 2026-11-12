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

/**
 * iCalendar (.ics) 生成
 */
export function generateIcs(selectedLessons, studentLabel) {
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
      'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n'));
  }

  return [
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
}

/**
 * CSV形式生成（1時限=1行の正規化展開）
 * options.includeEmpty が true の場合、空きコマも出力
 */
export function generateCsv(selectedLessons, studentLabel, options = {}) {
  const { includeEmpty = false } = options;
  const headers = ['曜日', '時限', '開始時間', '終了時間', '科目名', '教室', '担当教員', '連続コマ', '備考'];
  const rows = [headers];

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
  const { includeLocation = true, includeTeacher = true, includeEmpty = false } = options;
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
        const teacherText = includeTeacher && l.teacher ? ` (${l.teacher})` : '';
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
            const teacherText = includeTeacher && lesson.teacher ? ` (${lesson.teacher})` : '';
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
  const { includeEmpty = false } = options;
  const totalPeriods = selectedLessons.reduce((sum, l) => sum + (l.duration || 1), 0);

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
      term: '令和8年度後期',
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

export function prepareExportSnapshot(snapshot, options = {}) {
  snapshot.querySelectorAll('[data-export-exclude]').forEach(node => node.remove());
  snapshot.removeAttribute('id');
  snapshot.classList.add('export-sheet');

  const theme = options.theme || (typeof document !== 'undefined' && document.documentElement?.getAttribute('data-theme')) || 'light';
  snapshot.setAttribute('data-theme', theme);
  snapshot.setAttribute('aria-hidden', 'true');

  const label = options.studentLabel || '';
  const updated = options.updated || '2026-09-24';
  const shortBadge = formatStudentShortBadge(label);

  const headH2 = snapshot.querySelector('.panel-head h2');
  if (headH2) {
    headH2.classList.add('export-head-title');
    headH2.innerHTML = '';

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'export-badge-short';
    badgeSpan.textContent = shortBadge;
    headH2.append(badgeSpan);

    const fullSpan = document.createElement('span');
    fullSpan.className = 'export-badge-full';
    fullSpan.textContent = label;
    headH2.append(fullSpan);
  }
  const headerRow = document.createElement('div');
  headerRow.className = 'export-header-row';
  headerRow.innerHTML = `
    <div class="export-header-main">
      <h1 class="export-title">明石高専 後期時間割</h1>
      <span class="export-badge-tag">${label}</span>
      <span class="export-team-tag">Co+work 6班</span>
    </div>
    <div class="export-header-sub">
      <small class="export-pdf-date">PDF参照: ${updated}</small>
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

  const { selectedLessons = [], studentLabel = '', action = 'download', includeEmpty = false } = options;

  // 1. iCalendar (.ics)
  if (format === 'ics') {
    const icsString = generateIcs(selectedLessons, studentLabel);
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
    const csvString = generateCsv(selectedLessons, studentLabel, { includeEmpty });
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
  if (format === 'json') {
    const jsonString = generateJson(selectedLessons, studentLabel, options.updated, { includeEmpty });
    if (action === 'copy') {
      const ok = await copyTextToClipboard(jsonString);
      if (!ok) throw new Error('クリップボードへのコピーに失敗しました。');
      return { success: true, message: 'JSONデータをクリップボードにコピーしました。' };
    }
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${filename}.json`);
    return { success: true, message: 'JSONファイル (.json) を保存しました。' };
  }

  // 4. テキスト (.txt & クリップボードコピー)
  if (format === 'text') {
    const textString = generateText(selectedLessons, studentLabel, { ...options.textOptions, includeEmpty });
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
  snapshot.inert = true;
  snapshot.style.cssText = `position:fixed;left:0;top:0;width:1100px;max-width:none;background:${bgColor};color:${fgColor};z-index:-9999;pointer-events:none;border:0;border-radius:0;box-shadow:none;`;
  applyExportSizeStyle(snapshot, options.sizeConfig);
  document.body.append(snapshot);

  let canvas = null;
  try {
    await document.fonts.ready;
    canvas = await html2canvas(snapshot, {
      backgroundColor: bgColor, scale: 3.5, logging: false,
      windowWidth: 1200, windowHeight: Math.max(900, snapshot.scrollHeight + 60),
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
 * 全学科・全学年の時間割原本データ（JSON）のエクスポート
 */
export function exportAllLessonsJson(lessons, sourceInfo = {}) {
  const exportData = {
    meta: {
      title: '明石高専 令和8年度後期 全時間割原本データ',
      sourceUrl: sourceInfo.url || 'https://www.akashi.ac.jp/life/lesson.html',
      sourceUpdated: sourceInfo.updated || '2026-09-24',
      totalLessons: lessons.length,
      exportedAt: new Date().toISOString(),
      note: '明石高専の全学年・全学科（機械・電気情報・都市システム・建築）の時間割原本データセットです。'
    },
    lessons: lessons
  };
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `明石高専_令和8年度後期_全時間割データ.json`);
  return { success: true, message: '全時間割データ（JSON）をダウンロードしました。' };
}
