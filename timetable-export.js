import html2canvas from 'html2canvas';

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

export async function exportTimetable(snapshot, format, filename) {
  if (!['pdf', 'png'].includes(format)) throw new Error('PDFまたはPNGを選択してください。');
  snapshot.querySelectorAll('[data-export-exclude]').forEach(node => node.remove());
  snapshot.removeAttribute('id');
  snapshot.classList.add('export-sheet');
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.inert = true;
  snapshot.style.cssText = 'position:fixed;left:0;top:0;width:1100px;max-width:none;padding:28px;background:#fff;z-index:-100;pointer-events:none;border:0;border-radius:0;box-shadow:none;';
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
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const bounds = fitOnPage(canvas.width, canvas.height);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', bounds.x, bounds.y, bounds.width, bounds.height, undefined, 'FAST');
      pdf.setProperties({ title: filename, creator: 'Akashi KOSEN 学生ページ(仮)' });
      downloadBlob(pdf.output('blob'), `${filename}.pdf`);
    }
    canvas.width = 0;
    canvas.height = 0;
  } finally {
    snapshot.remove();
  }
}
