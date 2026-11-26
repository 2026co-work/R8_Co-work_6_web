'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readJson } = require('./e2e-harness.cjs');

function tok(x, y, text, fontSize = 9) {
  return { x, y, R: [{ T: encodeURIComponent(text), TS: [0, fontSize, 0, 0] }] };
}

function buildAllergenBlock(baseX, allgY, activeAllergens = []) {
  const names = ['小麦', '卵', '乳', 'そば', '落花生', 'えび', 'かに', 'くるみ'];
  const tokens = [tok(baseX, allgY, 'アレルゲン', 7)];
  names.forEach((name, idx) => {
    const x = baseX + 1.4 + idx * 0.9;
    tokens.push(tok(x, allgY - 0.15, name, 6));
    if (activeAllergens.includes(name)) {
      const centerOffset = name.length >= 3 ? 0.32 : (name.length === 2 ? 0.18 : 0.05);
      tokens.push(tok(x + centerOffset, allgY + 0.05, '●', 7));
    }
  });
  return tokens;
}

function buildSyntheticCompassPage() {
  const allgYs = [9.7, 13.4, 17.1, 20.8, 24.5, 28.2, 31.9, 35.6];
  const colXs = [4.65, 14.0, 23.35, 32.7];
  const headers = [
    { date: '9月30日', dow: '（水）' },
    { date: '10月1日', dow: '（木）' },
    { date: '10月2日', dow: '（金）' },
    { date: '10月5日', dow: '（月）' }
  ];

  const Texts = [];
  headers.forEach((h, i) => {
    const cx = colXs[i] + 3.5;
    Texts.push(tok(cx, 4.9, h.date, 11));
    Texts.push(tok(cx + 0.2, 5.5, h.dow, 10));
  });

  // 1) Column 0 (9/30): out-of-range previous-month cover with underlying hidden text
  // 2) Column 1 (10/1): full holiday overlay "臨時休業" with hidden underlying text
  // 3) Column 2 (10/2): open day with A/B/curry/bowl/noodle and allergens
  // 4) Column 3 (10/5): partial top-2-row overlay "～研修日～ 常設メニューのみ"
  colXs.forEach((bx, colIdx) => {
    allgYs.forEach((ay, rowIdx) => {
      const yTop = rowIdx === 0 ? 6.2 : allgYs[rowIdx - 1] + 0.6;
      const yNut = ay - 0.9;
      if (colIdx === 0 || colIdx === 1) {
        Texts.push(tok(bx + 0.3, yTop + 0.4, '隠れた料理', 9));
        Texts.push(tok(bx + 6.5, yTop + 0.4, '¥430', 9));
        Texts.push(tok(bx + 0.3, yNut, 'エネルギー', 7));
        Texts.push(tok(bx + 2.0, yNut + 0.2, '400kcal', 7));
        Texts.push(...buildAllergenBlock(bx, ay, ['小麦']));
        return;
      }
      if (colIdx === 2) {
        const defs = [
          { name: '和風おろし豚焼肉', details: '（ご飯・味噌汁付）', price: '¥430', kcal: '202kcal', allg: ['小麦', 'えび'] },
          { name: '鶏肉クッパ', details: '（味噌汁付）', price: '¥380', kcal: '475kcal', allg: ['小麦', '卵'] },
          { name: 'カレーライス（中辛）', details: '', price: '¥300', kcal: '561kcal', allg: ['小麦'] },
          { name: 'ポークカツカレー', details: '', price: '¥380', kcal: '771kcal', allg: ['小麦', '卵', '乳'] },
          { name: 'かつ丼', details: '', price: '¥350', kcal: '735kcal', allg: ['小麦', '卵', '乳'] },
          { name: '醤油ラーメン', details: '', price: '¥250', kcal: '390kcal', allg: ['小麦', '卵', '乳'] },
          { name: 'かけうどん・そば', details: '', price: '¥200', kcal: '344kcal', allg: ['小麦', 'そば'] },
          { name: 'ライス中(210g)', details: '', price: '¥120', kcal: '328kcal', allg: [] }
        ];
        const d = defs[rowIdx];
        Texts.push(tok(bx + 0.3, yTop + 0.3, d.name, 9));
        if (d.details) Texts.push(tok(bx + 0.3, yTop + 0.9, d.details, 8));
        Texts.push(tok(bx + 6.8, yTop + 0.3, d.price, 9));
        Texts.push(tok(bx + 0.3, yNut, 'エネルギー', 7));
        Texts.push(tok(bx + 2.0, yNut + 0.2, d.kcal, 7));
        Texts.push(...buildAllergenBlock(bx, ay, d.allg));
        return;
      }
      // colIdx === 3: partial overlay over rows 0..1, real regular/bowl/noodle below
      if (rowIdx <= 1) {
        Texts.push(tok(bx + 0.3, yTop + 0.4, '隠れた日替わり', 9));
        Texts.push(tok(bx + 6.5, yTop + 0.4, '¥430', 9));
      } else if (rowIdx === 4) {
        Texts.push(tok(bx + 0.3, yTop + 0.3, 'かつ丼', 9));
        Texts.push(tok(bx + 6.8, yTop + 0.3, '¥350', 9));
      } else if (rowIdx === 5) {
        Texts.push(tok(bx + 0.3, yTop + 0.3, 'とんこつラーメン', 9));
        Texts.push(tok(bx + 6.8, yTop + 0.3, '¥250', 9));
      }
      Texts.push(tok(bx + 0.3, yNut, 'エネルギー', 7));
      Texts.push(tok(bx + 2.0, yNut + 0.2, rowIdx <= 1 ? '450kcal' : '411kcal', 7));
      Texts.push(...buildAllergenBlock(bx, ay, rowIdx === 5 ? ['小麦', '卵'] : ['小麦']));
    });
  });

  // Excel overlays (pasted shapes rendered after table cells)
  const Fills = [
    { x: 4.3, y: 6.0, w: 9.2, h: 29.8 },   // Col 0 (9/30) month cover
    { x: 13.7, y: 6.0, w: 9.2, h: 29.8 },  // Col 1 (10/1) full holiday overlay
    { x: 32.4, y: 6.0, w: 9.2, h: 7.8 }    // Col 3 (10/5) partial top-2-row overlay
  ];
  Texts.push(tok(7.5, 16.0, '９月', 24));
  Texts.push(tok(17.5, 16.0, '臨', 22));
  Texts.push(tok(17.5, 18.0, '時', 22));
  Texts.push(tok(17.5, 20.0, '休', 22));
  Texts.push(tok(17.5, 22.0, '業', 22));
  Texts.push(tok(34.5, 8.2, '～研修日～', 18));
  Texts.push(tok(34.5, 10.6, '常設メニューのみ', 18));

  return { Width: 42.2, Height: 37.2, Fills, Texts };
}

test('CAFE-01: extractNewsArticles handles official { array } news feed schema', async () => {
  const mod = await import('../scripts/fetch-cafeteria.mjs');
  assert.deepEqual(mod.extractNewsArticles({ array: [{ title: '学生食堂メニュー' }] }), [{ title: '学生食堂メニュー' }]);
  assert.deepEqual(mod.extractNewsArticles({ items: [{ title: 'legacy' }] }), [{ title: 'legacy' }]);
  assert.deepEqual(mod.extractNewsArticles([{ title: 'direct' }]), [{ title: 'direct' }]);
  assert.deepEqual(mod.extractNewsArticles(null), []);
});

test('CAFE-02: parseArticleDateRange & inferFiscalYearAndMonth handle full-width digits and Dec->Jan rollover', async () => {
  const mod = await import('../scripts/fetch-cafeteria.mjs');
  const novRange = mod.parseArticleDateRange('学生食堂メニュー（１１/４～１１/３０）');
  assert.deepEqual(novRange, { startMonth: 11, startDay: 4, endMonth: 11, endDay: 30 });

  assert.deepEqual(
    mod.inferFiscalYearAndMonth({ title: '学生食堂メニュー（１１/４～１１/３０）', datetime: '2026.10.26' }),
    { fiscalYear: 2026, month: 11 }
  );
  assert.deepEqual(
    mod.inferFiscalYearAndMonth({ title: '学生食堂メニュー（１/５～１/２９）', datetime: '2026.12.22' }),
    { fiscalYear: 2026, month: 1 }
  );
});

test('CAFE-03: parseWeeklyMenuTable handles open days, 8-allergen x-matching, full holiday overlays, partial overlays, and out-of-range covers', async () => {
  const mod = await import('../scripts/fetch-cafeteria.mjs');
  const page = buildSyntheticCompassPage();
  const weeks = mod.parseWeeklyMenuTable([page], {
    fiscalYear: 2026,
    articleTitle: '学生食堂メニュー（１０/１～１０/３０）'
  });

  assert.equal(weeks.length, 1);
  const days = weeks[0].days;
  assert.deepEqual(days.map(d => d.date), ['2026-10-01', '2026-10-02', '2026-10-05'], 'Skips masked 9/30 out-of-range column');

  // 10/1 closed day overlay
  assert.equal(days[0].isOpen, false);
  assert.equal(days[0].closedReason, '臨時休業');
  assert.equal(days[0].lunchA, undefined, 'Hidden cells behind full overlay must not leak');

  // 10/2 open day with 8 allergens, price, kcal, details
  assert.equal(days[1].isOpen, true);
  assert.equal(days[1].lunchA.name, '和風おろし豚焼肉');
  assert.equal(days[1].lunchA.price, 430);
  assert.equal(days[1].lunchA.kcal, 202);
  assert.equal(days[1].lunchA.details, 'ご飯・味噌汁付');
  assert.deepEqual(days[1].lunchA.allergens, ['小麦', 'えび']);
  assert.equal(days[1].lunchB.name, '鶏肉クッパ');
  assert.deepEqual(days[1].lunchB.allergens, ['小麦', '卵']);
  assert.equal(days[1].noodle.name, '醤油ラーメン');
  assert.equal(days[1].bowl.name, 'かつ丼');
  assert.ok(Array.isArray(days[1].regularMenu) && days[1].regularMenu.length === 4);

  // 10/5 partial top-2-row overlay
  assert.equal(days[2].isOpen, true);
  assert.match(days[2].notice, /研修日/);
  assert.match(days[2].notice, /常設メニューのみ/);
  assert.equal(days[2].lunchA, undefined, 'Hidden Aランチ behind partial overlay must not leak');
  assert.equal(days[2].lunchB, undefined, 'Hidden Bランチ behind partial overlay must not leak');
  assert.equal(days[2].noodle.name, 'とんこつラーメン');
  assert.equal(days[2].bowl.name, 'かつ丼');
});

test('CAFE-04: parseWeeklyMenuTable returns [] honestly when PDF has no extractable dishes', async () => {
  const mod = await import('../scripts/fetch-cafeteria.mjs');
  assert.deepEqual(mod.parseWeeklyMenuTable([], { fiscalYear: 2026 }), []);
  assert.deepEqual(mod.parseWeeklyMenuTable([{ Width: 52.6, Texts: [] }], { fiscalYear: 2026 }), []);
});

test('CAFE-05: dist-data/cafeteria.json contains verified Nov 2026 official PDF extraction', async () => {
  const mod = await import('../scripts/fetch-cafeteria.mjs');
  const data = readJson('dist-data/cafeteria.json');
  assert.equal(data.meta.isTextExtracted, true);
  assert.equal(data.meta.month, 11);
  assert.equal(data.meta.fiscalYear, 2026);
  assert.equal(data.weeklyMenus.length, 5);

  const allDays = data.weeklyMenus.flatMap(w => w.days);
  assert.equal(allDays.length, 21);

  const nov02 = allDays.find(d => d.date === '2026-11-02');
  const nov03 = allDays.find(d => d.date === '2026-11-03');
  const nov23 = allDays.find(d => d.date === '2026-11-23');
  assert.equal(nov02?.isOpen, false);
  assert.equal(nov02?.closedReason, '臨時休業');
  assert.equal(nov03?.isOpen, false);
  assert.equal(nov03?.closedReason, '文化の日');
  assert.equal(nov23?.isOpen, false);
  assert.equal(nov23?.closedReason, '勤労感謝の日');

  const nov04 = allDays.find(d => d.date === '2026-11-04');
  assert.equal(nov04?.isOpen, true);
  assert.equal(nov04?.lunchA?.name, '照りマヨチキン');
  assert.equal(nov04?.lunchA?.price, 430);
  assert.equal(nov04?.lunchB?.name, '豚の生姜焼き丼');

  const nov26 = allDays.find(d => d.date === '2026-11-26');
  assert.equal(nov26?.isOpen, true);
  assert.equal(nov26?.lunchA?.name, '和風おろし豚焼肉');
  assert.equal(nov26?.lunchA?.price, 430);
  assert.equal(nov26?.lunchB?.name, '鶏肉クッパ');
  assert.equal(nov26?.noodle?.name, '醤油ラーメン');
  assert.equal(nov26?.bowl?.name, 'かつ丼');

  // Every extracted allergen must belong to the official 8 allergens
  const officialSet = new Set(mod.OFFICIAL_ALLERGENS);
  for (const day of allDays) {
    for (const al of (day.allergens || [])) {
      assert.ok(officialSet.has(al), `Unexpected allergen "${al}" on ${day.date}`);
    }
  }
});
