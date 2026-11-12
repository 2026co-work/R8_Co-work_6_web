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

export function prepareExportSnapshot(snapshot, options = {}) {
  snapshot.querySelectorAll('[data-export-exclude]').forEach(node => node.remove());
  snapshot.removeAttribute('id');
  snapshot.classList.add('export-sheet');
  snapshot.setAttribute('data-theme', 'light');
  snapshot.setAttribute('aria-hidden', 'true');

  const label = options.studentLabel || snapshot.querySelector('.panel-head h2')?.textContent?.trim() || '';
  const updated = options.updated || '2026-09-24';
  snapshot.querySelector('.panel-head')?.remove();
  snapshot.querySelector('.timetable-source')?.remove();

  const title = document.createElement('h1');
  title.className = 'export-title';
  title.textContent = `明石高専後期時間割 ${label} Co+work6班 ＜時間割PDF参照日時: ${updated}＞`;
  snapshot.prepend(title);

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

export async function exportTimetable(snapshot, format, filename, options = {}) {
  if (!['pdf', 'png'].includes(format)) throw new Error('PDFまたはPNGを選択してください。');
  prepareExportSnapshot(snapshot, options);
  snapshot.inert = true;
  snapshot.style.cssText = 'position:fixed;left:0;top:0;width:1100px;max-width:none;background:#fff;color:#252b39;z-index:-100;pointer-events:none;border:0;border-radius:0;box-shadow:none;';
  applyExportSizeStyle(snapshot, options.sizeConfig);
  document.body.append(snapshot);
  try {
    // 日本語フォントを描画する準備が整ってから画像化する。
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
      const pdfMargin = options.sizeConfig ? Math.max(4, Math.round(options.sizeConfig.padding * 0.35)) : 5;
      const bounds = fitOnPage(canvas.width, canvas.height, 297, 210, pdfMargin);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');
      pdf.setProperties({ title: filename, creator: '明石高専 Co+work6班' });
      downloadBlob(pdf.output('blob'), `${filename}.pdf`);
    }
    canvas.width = 0;
    canvas.height = 0;
  } finally {
    snapshot.remove();
  }
}
