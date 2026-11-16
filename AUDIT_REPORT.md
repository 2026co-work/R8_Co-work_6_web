# 明石高専キャンパスポータル 総合調査報告書 (AUDIT_REPORT.md)

**文書バージョン**: 1.0.0  
**調査日**: 2026年11月16日  
**対象システム**: 明石工業高等専門学校 キャンパスポータル (`R8_Co-work_6_web`)  
**調査種別**: 動作バグ、UI/UX課題、データパイプライン未実装・フォールバック乖離の総合監査  
**遵守規程**: ソースコード無変更（Read-Only監査）、非対象機能（授業変更・空き教室・混雑状況・歴代校長・備品報告）の完全除外  

---

## 目次

1. [Executive Summary（全体概要）](#executivesummary全体概要)
   - 1.1 調査の目的と背景
   - 1.2 調査体制・検証アプローチ
   - 1.3 発見事項の全体統計と総括
   - 1.4 最重要クリティカル発見事項
2. [第1章: 動作バグ（Functional & Runtime Bugs）](#第1章-動作バグfunctional--runtime-bugs)
   - B1: マイリンク削除ボタン押下時の `ReferenceError: removeMyLink is not defined`
   - B2: 定期試験タブにおける `classCode` の `1-undefined` 描画および学科フィルタ不発
   - B3: 食堂メニュータブ（#cafeteria）で週替わりメニューが一切描画されないデータキー不一致
   - B4: `convert-to-lessons.mjs` における単一行科目のパース破損とテスト `F5-T1-01` 失敗
   - B5: Git HEAD における専攻科データ未コミットによる環境依存テスト失敗
   - B6: 学事週数（`getAcademicWeek`）が木曜日に週番号を進める計算不整合
   - B7: `render()` ごとに `window` へ重複登録される `keydown` / `resize` イベントリスナー
   - B8: 新規4タブ（定期試験・年間予定・食堂・マイリンク）の主要CSSクラス定義の完全欠落
   - B9: `exportTimetable` における iCal 出力時の年度・学期メタデータ引数欠落および日付固定化
   - B10: `fetch-exam.mjs` と `app.js` のデータキー不一致（`days` vs `schedule`）
   - B11: `scripts/fetch-cafeteria.mjs` におけるメニューパース未実装（ダミー抽出判定）
   - B12: `portal.html` におけるダークモードFOUC（白画面フラッシュ）防止スクリプト欠落
   - B13: `package.json` の `"type": "module"` 欠落による Node.js 実行時警告
   - B14: E2E テストスイートの形骸化（Hollow Assertions による重大バグ隠蔽）
3. [第2章: 使いづらい挙動（UI/UX課題）](#第2章-使いづらい挙動uiux課題)
   - 2.1 ホーム / ダッシュボード（5件）
   - 2.2 時間割（6件）
   - 2.3 定期試験（3件）
   - 2.4 年間予定（3件）
   - 2.5 食堂メニュー（3件）
   - 2.6 リンク集・マイリンク（5件）
   - 2.7 共通UI・テーマ・アクセシビリティ（6件）
4. [第3章: 取得可能だが未実装・フォールバック止まりとなっているデータ項目（Data Pipeline & Fallback Gaps）](#第3章-取得可能だが未実装フォールバック止まりとなっているデータ項目data-pipeline--fallback-gaps)
   - D1: 学生食堂メニュー取得スクリプトにおけるテキスト抽出のダミー化とフォールバック固定
   - D2: フロントエンド `#cafeteria` タブのプロパティ不一致による常時フォールバック表示
   - D3: 寮生食堂（Dormitory）メニューPDF（`menyu.pdf`）の未パースおよびフロントエンド未連携
   - D4: 定期試験日程・時間割のPDF未パースおよび空配列（`days: []`）固定化
   - D5: 答案返却期間時間割（`returnPdfUrl`）の取得済みデータのフロントエンド未連携
   - D6: 年間行事予定（Calendar）の自動スクレイピング未実装（フォールバック丸ごとコピー止まり）
   - D7: 年間行事予定PDFリンク（`zenkiPdfUrl` / `koukiPdfUrl`）の取得済みデータのフロントエンド未表示
   - D8: 生成済みデータ `dist-data/timetable-links.json` の完全な孤立（フロントエンド未ロード）
   - D9: 時間割PDF凡例（`roomLegends` 43件）の抽出済みデータの変換時破棄と教室正式名称の未表示
   - D10: 時間割変換スクリプト（`convert-to-lessons.mjs`）のパース不具合による科目名欠損と教員名誤代入
   - D11: 通学アクセス・神姫バス（Shinki Bus）時刻表リンクの未連携
   - D12: 時間割原本PDF URL（`sourcePdfUrl`）のフロントエンド未反映とハードコード定数依存
5. [改善優先度マトリクス（緊急度・影響度・実装コスト）](#改善優先度マトリクス緊急度影響度実装コスト)
   - 5.1 優先度評価基準
   - 5.2 全課題マトリクス一覧表
   - 5.3 段階的改修ロードマップ（Phase 1 〜 Phase 3）
6. [付録・独立検証手順](#付録独立検証手順)

---

## Executive Summary（全体概要）

### 1.1 調査の目的と背景
明石工業高等専門学校（明石高専）キャンパスポータルは、学生および教職員が日々の授業時間割、定期試験日程、学事暦、学生食堂・寮生食堂メニュー、各種公式サービス・シラバスへのアクセスをワンストップで行えるよう構築されたWebアプリケーションです。

本調査の目的は、現行コードベースおよびデータパイプラインに潜む「動作バグ（クラッシュ・例外・計算誤差・不整合）」、「日常利用における使いづらい挙動（UI/UX摩擦・アクセシビリティ違反）」、ならびに「外部ソースから取得可能であるにもかかわらず未抽出・フォールバック固定・フロントエンド未連携となっているデータ項目」を網羅的かつ客観的に特定し、具体的な改善策を策定・提示することにあります。

### 1.2 調査体制・検証アプローチ
本監査では、リポジトリの完全整合性を担保するため、**リポジトリ内の既存コード・データ・テストを一切改変しない（Read-Only）** 制約を徹底し、並行専門エージェント群による多角的アプローチを採用しました。

1. **静的コード解析・契約照合**:
   - `index.html`, `portal.html`, `app.js`（1,812行）, `styles.css`（389行）, `timetable-export.js`（776行）, `timetable-data.js`（484行）の構文・参照関係照合。
   - `scripts/*.mjs` のデータ変換パイプラインおよび `dist-data/*.json` のスキーマ整合性検証。
2. **動的実行・エラー再現**:
   - Node.js テストランナー（`tests/*.test.cjs` 316件）の完全実行および `$env:STRICT_E2E='1'` による境界値検証。
   - スクリプト群（`parse-pdf-timetable.mjs`, `convert-to-lessons.mjs`, `fetch-cafeteria.mjs`, `fetch-exam.mjs`, `fetch-calendar.mjs`）の実行パイプライン追跡。
3. **DOMイベント・UI/UX・アクセシビリティ検証**:
   - SPA状態遷移、クリック・キーボード・リサイズハンドラのライフサイクル追跡。
   - WCAG 2.1 AA 準拠度（コントラスト比・フォーカストラップ・スクリーンリーダーARIA属性）の評価。
4. **制約事項の完全遵守**:
   - 要求仕様で非対象と指定された5大機能（「授業変更」「空き教室」「混雑状況」「歴代校長」「備品報告」）は、課題・未実装項目から完全に除外しています。

### 1.3 発見事項の全体統計と総括

本調査の結果、合計 **57件** の課題・改善項目が特定されました。

```
┌─────────────────────────────────────────────────────────────┐
│                 監査結果 総括サマリー (計57件)                 │
├─────────────────────────────────────────────────────────────┤
│ 1. 動作バグ (Functional & Runtime Bugs)          : 14件     │
│ 2. 使いづらい挙動 (UI/UX & Accessibility Issues)  : 31件     │
│ 3. データパイプライン未実装・フォールバック乖離     : 12件     │
└─────────────────────────────────────────────────────────────┘
```

本システムは、洗練された時間割グリッド生成エンジンや各種エクスポート（PDF/PNG/iCal/CSV/JSON）など堅牢な基盤を有している一方で、**「関数名のタイポによる実行時クラッシュ」「データプロパティ名の不一致による画面崩延や情報マスク」「新規タブに対応するCSSルールの完全欠落」「スクレイピングパイプラインの途絶による固定フォールバック依存」** など、実装の最終連携フェーズにおける深刻な不整合が複数存在することが判明しました。

### 1.4 最重要クリティカル発見事項

特に緊急の是正を要する最重要課題は以下の4点です：

1. **マイリンク削除ボタンの `ReferenceError` クラッシュ (B1 / U21)**:
   - 削除ボタンを押すと未定義関数 `removeMyLink` が呼び出され、即座に例外停止してリンク削除が一切機能しない。
2. **定期試験画面の `1-undefined` 描画と学科フィルタ無効化 (B2)**:
   - オブジェクトプロパティ `department` を `dept` と誤参照し、画面見出しに「1-undefined」と表示され、試験データの絞り込みが成立しない。
3. **週替わり食堂メニューの完全非表示バグ (B3 / U18 / D2)**:
   - 実データが `data.weeklyMenus` であるにもかかわらず、UIコードが `data.menus` を探索しているため、抽出済みデータがあるにもかかわらず常に空配列とみなされ、学生に献立情報が一切届かない。
4. **新規4タブ（試験・年間予定・食堂・リンク集）のCSSスタイル定義完全欠落 (B8 / U12 / U15 / U20)**:
   - `app.js` が出力する `.exam-card` や `.calendar-timeline` 等のクラス定義が `styles.css` に1件も存在せず、ブラウザ標準の素のリストや文字の羅列となりUIが著しく崩壊している。

---

## 第1章: 動作バグ（Functional & Runtime Bugs）

### B1: マイリンク削除ボタン押下時の `ReferenceError: removeMyLink is not defined`

- **該当箇所**: `app.js` 1554行目（機能名: マイリンク管理）
- **現状の挙動**:
  マイリンク一覧（`#links` タブ）に表示される各リンクカードの「削除」ボタンをクリックした際、コンソールに以下の実行時エラーが出力され、スクリプトの実行が中断する。`localStorage` からリンクは削除されず、画面も更新されない。
  ```text
  Uncaught ReferenceError: removeMyLink is not defined
      at HTMLButtonElement.<anonymous> (app.js:1554:9)
  ```
- **原因詳細**:
  `app.js` 637行目で定義されている削除関数の名前は `deleteMyLink(id)` である。しかし、1554行目のイベントリスナー内では `removeMyLink(id)` を呼び出している。リポジトリ全体で `removeMyLink` の定義は存在しない。なお、既存テスト `tests/e2e-tier1-features.test.cjs:1264` では削除ボタンをクリックせず `localStorage.setItem` で直接モックしていたため見逃されていた。
- **期待される挙動**:
  マイリンクの削除ボタンをクリックすると、確認ダイアログまたは即時処理により対象のリンクが `localStorage` から削除され、一覧が再描画されて画面上から該当リンクが消去されること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -1551,7 +1551,7 @@ function bindEvents() {
       btn.addEventListener('click', () => {
         const id = btn.dataset?.removeId;
         if (id) {
  -        removeMyLink(id);
  +        deleteMyLink(id);
           render();
         }
       });
  ```
  ※または `deleteMyLink` のエイリアスとして `const removeMyLink = deleteMyLink;` を宣言する。

---

### B2: 定期試験タブにおける `classCode` の `1-undefined` 描画および学科フィルタ不発

- **該当箇所**: `app.js` 762, 781, 783, 807, 730-731, 745-746行目（機能名: 定期試験日程 `#exam`）
- **現状の挙動**:
  定期試験タブを開いた際、見出しや空カードメッセージに「**試験時間割（1-undefined）**」「**1-undefinedの試験時間割は未公開です**」と表示される。さらに、試験エントリの学科絞り込みが常に `undefined` と照合され、フィルタが正しく機能しない。
- **原因詳細**:
  `DEFAULT_SELECTION`（33行目）および Cookie 上の学生属性プロパティ名は `department`（値: `'M'`, `'E'`, `'C'`, `'A'` 等）である。しかし `exam()` 関数内（762行目）では：
  ```javascript
  const classCode = `${studentSelection.grade}-${studentSelection.dept}`;
  ```
  と存在しない `dept` プロパティを参照している。そのため `studentSelection.dept` は `undefined` となり、文字列結合により `"1-undefined"` や `"2-undefined"` が生成される。同様に `extractExamEntries`（730-746行目）でも `selection?.dept` と比較しているため学科一致判定が成立しない。
- **期待される挙動**:
  学年と学科コードが正しく結合され、「試験時間割（1-M）」「試験時間割（3-E）」等と表示され、自学科に該当する試験エントリが正確に抽出されること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -728,7 +728,7 @@ function extractExamEntries(data, selection) {
  -    const deptMatch = !selection?.dept || !entry.dept || entry.dept === selection.dept;
  +    const deptMatch = !selection?.department || !entry.dept || entry.dept === selection.department;
  @@ -762,7 +762,7 @@ function exam() {
  -  const classCode = `${studentSelection.grade}-${studentSelection.dept}`;
  +  const classCode = `${studentSelection.grade}-${studentSelection.department}`;
  ```

---

### B3: 食堂メニュータブ（#cafeteria）で週替わりメニューが一切描画されないデータキー不一致

- **該当箇所**: `app.js` 890〜895行目（機能名: 学生食堂メニュー `#cafeteria`）
- **現状の挙動**:
  データファイル `dist-data/cafeteria.json` に日替わりランチ・定食データが存在し、かつ `meta.isTextExtracted: true` であるにもかかわらず、食堂画面を開くと常に以下の注意書きのみが表示され、献立一覧カードが1件も描画されない。
  > 「今月の日替わりランチ詳細はPDFからのテキスト抽出が未対応のため（テキスト未抽出）、原本PDFまたは公式ニュースでご確認ください。」
- **原因詳細**:
  `dist-data/cafeteria.json` および内蔵フォールバック `FALLBACK_CAFETERIA`（`app.js:204`）のスキーマは `weeklyMenus`（配列）である。しかし `cafeteria()` 関数（890行目）では：
  ```javascript
  const menus = Array.isArray(data.menus) ? data.menus : (Array.isArray(data.items) ? data.items : []);
  ```
  と `data.menus` または `data.items` を探索している。どちらのキーも存在しないため `menus` は常に `[]`（length = 0）となり、表示条件 `(isTextExtracted && menus.length)` が常に偽となってフォールバック文が表示される。
- **期待される挙動**:
  `weeklyMenus` を取得・走査し、週替わり・日替わりの各メニュー（Aランチ、Bランチ、丼物、麺類、価格、アレルゲン）がカード形式で正常に展開・表示されること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -890,3 +890,4 @@ function cafeteria() {
  -  const menus = Array.isArray(data.menus) ? data.menus : (Array.isArray(data.items) ? data.items : []);
  +  const weeklyMenus = Array.isArray(data.weeklyMenus) ? data.weeklyMenus : [];
  +  const menus = Array.isArray(data.menus) ? data.menus : weeklyMenus;
  ```
  さらに `weeklyMenus` の各日データをループ展開するレンダラーを実装する。

---

### B4: `convert-to-lessons.mjs` における単一行科目のパース破損とテスト `F5-T1-01` 失敗

- **該当箇所**: `scripts/convert-to-lessons.mjs` 115行目、`scripts/parse-pdf-timetable.mjs` 96〜132行目
- **現状の挙動**:
  パイプラインを実行して `dist-data/timetable-lessons.json` を生成した際、専攻科コマの「構造システムⅠ（lesson-317）」「マウンイェ地盤工学特論（lesson-324）」「世界の都市形成史（lesson-326）」において `subjectName` が空文字 `""` になる。この状態で `node --test tests/e2e-tier1-features.test.cjs` を実行すると以下のテストが FAIL する。
  ```text
  ✖ F5-T1-01: Extracted lessons contain Grade 6 (専1) ME lessons with valid day/period (8.4074ms)
    AssertionError [ERR_ASSERTION]: Non-empty subject name
        at tests\e2e-tier1-features.test.cjs:277:12
  ```
- **原因詳細**:
  `convert-to-lessons.mjs` の `parseSourceText(text)` において、教室ブラケット `[...]` がないセルの処理で `lines.slice(0, -1)` を科目名としている。セル内テキストが「構造システムⅠ」のように1行のみの場合、`lines.slice(0, -1)` は空配列 `[]` となり、`subjectName` が空文字 `""` になる。さらに `lines.at(-1)` によって本来科目名である文字列が `teacher` に誤認代入される。
- **期待される挙動**:
  教員名の記載がない単一行セルであっても、1行目のテキストが確実に `subjectName` に格納され、テスト `F5-T1-01` がパスすること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/scripts/convert-to-lessons.mjs
  +++ b/scripts/convert-to-lessons.mjs
  @@ -112,6 +112,13 @@ export function parseSourceText(text) {
  +  if (lines.length === 1) {
  +    return {
  +      subjectName: unwrap(lines[0]),
  +      location: '',
  +      teacher: ''
  +    };
  +  }
     return {
       subjectName: unwrap(lines.slice(0, -1).join('\n')),
       location: '',
  ```

---

### B5: Git HEAD における専攻科データ未コミットによる環境依存テスト失敗

- **該当箇所**: `dist-data/timetable-lessons.json`, `dist-data/lessons.json`, `package.json` 9行目
- **現状の挙動**:
  Git HEAD コミットに含まれている `dist-data/timetable-lessons.json` は本科（1〜5年）の 317コマのみであり、専攻科（専1・専2の40コマ）が含まれていない。リポジトリをクローン直後の状態で `$env:STRICT_E2E='1'; npm test` を実行すると、7件のテスト（`F5-T1-01`〜`F5-T1-05`, `S-01`, `S-02`）が直ちに FAIL する。
  ```text
  ✖ S-01: Fresh Pipeline Build & Serving (F1, F2, F3, F4) AssertionError: Includes grades 1-7
  ✖ S-02: Advanced Course Student Lifecycle (F5, F9, F10, F16, F20) AssertionError: Expected >= 10 lessons for 専1 ME, found 0
  ```
- **原因詳細**:
  作業環境で `node scripts/convert-to-lessons.mjs` を手動実行すると専攻科40コマを含む全357コマのファイルが生成されるが、その最新成果物が Git にコミットされていなかった。リポジトリの追跡データとテストコードの要求水準に乖離が生じている。
- **期待される挙動**:
  クローン直後の未ビルド状態であってもコミット済み JSON データが最新状態（357コマ）であるか、あるいは `npm test` の `pretest` フックで自動的にビルドが実行されること。
- **改善提案**:
  専攻科40コマを含む完全な `dist-data/timetable-lessons.json`（357コマ）を Git にコミットする。または `package.json` の `test` スクリプトにビルドステップを事前フックする。

---

### B6: 学事週数（`getAcademicWeek`）が木曜日に週番号を進める計算不整合

- **該当箇所**: `app.js` 345〜368行目（機能名: 学事週数計算 `getAcademicWeek`）
- **現状の挙動**:
  2026年度後期の授業開始日は `2026-10-01`（木曜日）である。`app.js` 358行目の計算式 `Math.floor(diffDays / 7) + 1` により、以下のように同一授業週の途中で週番号が変わってしまう。
  - `2026-10-05（月）`: `diffDays = 4` → `weekNum = 1`（第1週）
  - `2026-10-07（水）`: `diffDays = 6` → `weekNum = 1`（第1週）
  - `2026-10-08（木）`: `diffDays = 7` → `weekNum = 2`（第2週）
  月曜〜水曜と木曜〜金曜で週番号が分裂し、学事予定や授業進度管理と矛盾する。また、春季休業期間（3月）でも「後期 第15週」と表示され続ける。
- **期待される挙動**:
  学校の授業週は月曜日から金曜日までを単一の「第N週」として扱う。木曜日開始の半端週（第0週または第1週準備期間）を適切にオフセットし、週の切り替えが月曜日の午前0時に行われること。また学期終了後は休業期間表示となること。
- **改善提案**:
  週番号の算出起点を「学期開始日を含む週の月曜日（例: 2026-09-28）」に設定し、月曜起算の暦週ベースで計算するようロジックを改修する。

---

### B7: `render()` ごとに `window` へ重複登録される `keydown` / `resize` イベントリスナー

- **該当箇所**: `app.js` 1584〜1594行目（機能名: イベントバインド `bindEvents`）
- **現状の挙動**:
  画面遷移（ハッシュ変更）や時間割の条件変更を行うたびに `render()` → `bindEvents()` が実行される。この中で `window.addEventListener('keydown', ...)` および `window.addEventListener('resize', ...)` が解除（`removeEventListener`）されることなく無制限に追加登録され続ける。
- **原因詳細**:
  SPAの全画面再描画ライフサイクル内にグローバルオブジェクト（`window`）へのリスナー登録が含まれているため。画面を10回切り替えると、Escapeキー押下時に10回のモーダルクローズハンドラが重複実行され、メモリリークとパフォーマンス劣化を招く。
- **期待される挙動**:
  `window` に対するキーボード・リサイズリスナーはアプリケーション初期化時に1度だけ登録されるか、既存リスナーが破棄・再利用されること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -1583,6 +1583,9 @@ function bindEvents() {
  +  if (!window.__globalListenersBound) {
  +    window.__globalListenersBound = true;
       window.addEventListener('keydown', e => {
         if (e.key === 'Escape') {
           closeDataPreviewModal();
           closeSizeAdjustModal();
         }
       });
       window.addEventListener('resize', () => {
         if (!document.getElementById('export-size-modal')?.hidden) {
           updateSizeModalScale();
         }
       });
  +  }
  ```

---

### B8: 新規4タブ（定期試験・年間予定・食堂・マイリンク）の主要CSSクラス定義の完全欠落

- **該当箇所**: `styles.css` 全体（機能名: 全画面スタイリング）
- **現状の挙動**:
  `app.js` が生成するHTMLに含まれる以下の主要CSSクラスが、`styles.css` に1件も定義されていない。
  - 定期試験: `.exam-card`, `.exam-card-head`, `.exam-card-meta`, `.exam-timetable`
  - 年間予定: `.calendar-event-item`, `.calendar-timeline`, `.calendar-events`, `.calendar-event-date`, `.calendar-event-title`, `.calendar-event-note`, `.calendar-substitutions`
  - 食堂メニュー: `.cafeteria-menu-list`, `.cafeteria-menu-item`, `.cafeteria-links`, `.dormitory-section`
  - マイリンク: `.mylink-row`, `.mylinks-list`, `.mylink-form`, `.mylink-anchor`, `.mylink-remove-btn`, `.preset-suggestions`, `.preset-btn`
  これにより、枠線・パディング・背景色・グリッド配置が当たらず、ブラウザ標準の素の黒丸ビュレットやインラインテキストとして描画され、デザインが崩壊している。ダークモード時にも適切な反転スタイルが適用されない。
- **期待される挙動**:
  ポータル全体のデザインシステム（バーガンディ `--primary: #6b1d2f`、カード余白、角丸、ダークモード変数）に準拠したCSSルールが適用され、統一感のあるカード型レイアウトでレンダリングされること。
- **改善提案**:
  第2章の各UI/UX改善提案に記載したCSSスタイルルールを `styles.css` に一括追加する。

---

### B9: `exportTimetable` における iCal 出力時の年度・学期メタデータ引数欠落および日付固定化

- **該当箇所**: `timetable-export.js` 617行目、`app.js` 1395行目（機能名: iCalエクスポート）
- **現状の挙動**:
  時間割エクスポート関数 `exportTimetable('ics', lessons, options)` を呼び出した際、`options.fiscalYear` および `options.term` が内部の `generateIcs` 関数に渡されない。さらに `generateIcs` 内部（144〜150行目）で開始日 `baseDates` が `20261005`〜`20261009`、繰り返し終了日 `UNTIL` が `20270228T145959Z` にハードコード固定されているため、前期や次年度の時間割をエクスポートしても常に2026年度後期のカレンダーが生成されてしまう。
- **期待される挙動**:
  `options.fiscalYear` および `options.term` に応じて学期開始週および終了日を動的に算出し、該当学期の正しい日程で `.ics` ファイルが生成されること。
- **改善提案（コード差分イメージ）**:
  ```diff
  --- a/timetable-export.js
  +++ b/timetable-export.js
  @@ -617,1 +617,1 @@ export function exportTimetable(format, lessons, options = {}) {
  -  const icsString = generateIcs(selectedLessons, studentLabel, { semesterInfo, holidays });
  +  const icsString = generateIcs(selectedLessons, studentLabel, { semesterInfo, holidays, fiscalYear: options.fiscalYear, term: options.term });
  ```

---

### B10: `fetch-exam.mjs` と `app.js` のデータキー不一致（`days` vs `schedule`）

- **該当箇所**: `scripts/fetch-exam.mjs` 153行目 vs `app.js` 725行目（機能名: 定期試験データパイプライン）
- **現状の挙動**:
  `scripts/fetch-exam.mjs` は定期試験データを `{ meta, periods, days: [] }` という形式で出力する。しかし、`app.js` の `extractExamEntries(data, selection)` は：
  ```javascript
  const entries = data.schedule ?? data.schedules ?? data.entries ?? data.items;
  ```
  と探索しており、`data.days` を探索しない。そのため、将来スクリプト側で `days` 配列に試験日程を格納しても、フロントエンド側でデータが認識されず無視される。
- **期待される挙動**:
  スクリプトの出力キーとフロントエンドの探索キーが一致し、シームレスにデータが受け渡されること。
- **改善提案**:
  `app.js` 725行目に `data.days` を探索候補として追加する（`data.schedule ?? data.days ?? data.schedules ?? ...`）。

---

### B11: `scripts/fetch-cafeteria.mjs` におけるメニューパース未実装（ダミー抽出判定）

- **該当箇所**: `scripts/fetch-cafeteria.mjs` 75〜94行目、160〜175行目（機能名: 食堂スクレイパー）
- **現状の挙動**:
  PDFのパース処理 `parseCafeteriaPdf` は、単にテキスト要素の総数（`totalTexts >= 50`）を数えて `isTextExtracted: true` を返すのみである。PDFから日別の料理名・価格・アレルゲンを抽出するロジックが存在せず、161行目で `weeklyMenus = baseline.weeklyMenus` と固定フォールバックデータを常に代入している。
- **原因詳細**:
  PDFテキスト抽出機能がプロトタイプ段階（ダミー判定）で放置されており、公式Webに掲載された最新メニューPDFのコンテンツ解析が未完となっている。
- **期待される挙動**:
  PDF内の座標・テーブル構造を解析し、週別・曜日別・区分別（A定食、B定食、丼物、麺類、価格、アレルギー）の実データを抽出して `dist-data/cafeteria.json` を生成すること。
- **改善提案**:
  PDFParser の `Texts` 配列から Y座標/X座標をグループ化して表形式を再現するパーサーを実装する（詳細は第3章 D1 参照）。

---

### B12: `portal.html` におけるダークモードFOUC（白画面フラッシュ）防止スクリプト欠落

- **該当箇所**: `portal.html` 1〜12行目 vs `index.html` 10〜18行目（機能名: テーマ同期）
- **現状の挙動**:
  `index.html` には `<head>` 内で `localStorage.getItem('campus-theme')` を読み取って即座に `document.documentElement.dataset.theme` を付与するインラインスクリプトが存在するが、`portal.html` にはこのスクリプトが存在しない。ダークモードを設定しているユーザーが `portal.html` を直接開くかリロードすると、CSS適用前に一瞬白画面がフラッシュ（FOUC/FOUT）する。
- **期待される挙動**:
  `portal.html` でもDOM描画開始前にテーマ属性が確定し、ちらつきのない快適なダークモード表示が維持されること。
- **改善提案**:
  `index.html` 10〜18行目の初期化スクリプトを `portal.html` の `<head>` 内にも追加する。

---

### B13: `package.json` の `"type": "module"` 欠落による Node.js 実行時警告

- **該当箇所**: `package.json`（プロジェクト設定）
- **現状の挙動**:
  `node scripts/verify-lessons.mjs` などを実行した際、Node.js から以下の警告メッセージが出力される。
  ```text
  (node:45992) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///.../timetable-data.js is not specified and it doesn't parse as CommonJS.
  ```
- **期待される挙動**:
  プロジェクト内のESモジュールとCommonJSスクリプトが警告なしにクリーンに実行されること。
- **改善提案**:
  `package.json` に `"type": "module"` を明記し、テスト等の CommonJS ファイルは `.cjs` 拡張子で維持する。

---

### B14: E2E テストスイートの形骸化（Hollow Assertions による重大バグ隠蔽）

- **該当箇所**: `tests/e2e-tier1-features.test.cjs` 559, 729, 738, 1038, 1264, 1282行目（機能名: テスト品質）
- **現状の挙動**:
  テストスイートは 316 件すべてパス（PASS）するが、マイリンク削除の `removeMyLink` 未定義エラー、定期試験の `1-undefined` 表示、食堂メニュー非表示バグが一切検知できていなかった。
- **原因詳細**:
  - マイリンク削除テスト（1264行目）では、削除ボタンをクリックせず `localStorage.setItem` でストレージを直接上書きしていた。
  - 定期試験テスト（738行目）では、`assert.ok(html.length > 0)` や `assert.ok(html.includes('試験'))` という極めて浅い検証しか行っておらず、`1-undefined` という文字列の混入を検証していなかった。
  - 食堂テスト（1038行目）でも、コンテナ要素が存在することのみを確認し、メニューカードが1件以上描画されているかをアサートしていなかった。
- **期待される挙動**:
  実際のDOMイベント（削除ボタンクリック）を発火させ、異常な文字列（`undefined`）が含まれていないことや、要素が期待通りレンダリングされていることを厳格に検証するアサーションを実装すること。
- **改善提案**:
  形骸化したアサーションを、実際のユーザー操作イベント（DOMクリック等）の発火およびUIレンダリング結果の厳格な検証に置き換える。具体的には以下の4点のテストを改修する：
  1. **マイリンク削除テスト (`F22-T1-04`: 1264行目)**: `localStorage.setItem` の直接実行ではなく、DOM上の削除ボタン（`.mylink-remove-btn[data-remove-id="1"]`）のクリックイベントを発火させ、`deleteMyLink` の正常実行とDOMからの項目消失を検証する（`removeMyLink` 未定義クラッシュの回帰防止）。
  2. **定期試験学科フィルタテスト (`F13-T1-03`, `F13-T1-04`: 729, 738行目)**: `innerHTML.length > 0` という浅い検証を廃止し、`assert.doesNotMatch(html, /undefined/)` による `1-undefined` の非混入確認、および `assert.match(html, /2-C/)` による正しい学年・学科コード描画を検証する。
  3. **食堂メニュー描画テスト (`F18-T1-05`: 1038行目)**: 単なる `document.title` 検証ではなく、メイン領域にメニューカード要素（`.cafeteria-menu-item` 等）が1件以上存在すること、料理名および価格表記（例: `¥\d+|\d+円`）がレンダリングされていることを検証する。
  4. **動的年度・学期フッター表示テスト (`F10-T1-04`: 559行目)**: 静的文字列（「明石高専」）の有無ではなく、`2026年度` および `後期` の動的メタデータがフッターに埋め込まれていることを検証する。

  **コード差分イメージ (`tests/e2e-tier1-features.test.cjs`)**:
  ```diff
  --- a/tests/e2e-tier1-features.test.cjs
  +++ b/tests/e2e-tier1-features.test.cjs
  @@ -556,5 +556,6 @@
   test('F10-T1-04: Footer attribution displays dynamic year/term info', async () => {
     const app = createAppInstance();
     app.navigate('#timetable');
  -  assert.ok(app.elements.main.innerHTML.includes('明石高専') || app.elements.main.innerHTML.includes('キャンパス'));
  +  assert.match(app.elements.main.innerHTML, /2026年度/, 'Footer displays fiscal year');
  +  assert.match(app.elements.main.innerHTML, /後期/, 'Footer displays term');
   });
  @@ -727,4 +728,6 @@
     app.selectStudent({ grade: 2, department: 'C' });
     app.navigate('#exam');
  -  assert.ok(app.elements.main.innerHTML.length > 0);
  +  assert.doesNotMatch(app.elements.main.innerHTML, /undefined/, 'No undefined classCode in exam heading');
  +  assert.match(app.elements.main.innerHTML, /2-C/, 'Exam heading displays correct classCode 2-C');
   });
  @@ -737,3 +740,4 @@
     app.navigate('#exam');
  -  assert.ok(app.elements.main.innerHTML.length > 0);
  +  assert.doesNotMatch(app.elements.main.innerHTML, /1-undefined/, 'Exam view does not show 1-undefined');
  +  assert.match(app.elements.main.innerHTML, /試験時間割/, 'Exam timetable heading exists');
   });
  @@ -1037,3 +1041,5 @@
     app.navigate('#cafeteria');
  -  assert.match(app.document.title, /食堂|メニュー/);
  +  assert.match(app.document.title, /食堂|メニュー/);
  +  assert.ok(app.elements.main.innerHTML.includes('cafeteria-menu') || app.elements.main.innerHTML.includes('ランチ'), 'Renders cafeteria menu content');
  +  assert.doesNotMatch(app.elements.main.innerHTML, /テキスト未抽出/, 'Weekly menus are properly rendered when data exists');
   });
  @@ -1263,4 +1269,7 @@
     const before = JSON.parse(app.localStorage.getItem('campus-links-v1'));
     assert.equal(before.length, 2);
  -  app.run('const items = JSON.parse(localStorage.getItem("campus-links-v1")); localStorage.setItem("campus-links-v1", JSON.stringify(items.filter(i => i.id !== "1")));');
  +  app.navigate('#links');
  +  const removeBtn = app.document.querySelector('.mylink-remove-btn[data-remove-id="1"]');
  +  assert.ok(removeBtn, 'Remove button exists in DOM');
  +  removeBtn.click();
     const after = JSON.parse(app.localStorage.getItem('campus-links-v1'));
     assert.equal(after.length, 1);
     assert.equal(after[0].id, '2');
  ```

---

## 第2章: 使いづらい挙動（UI/UX課題）

### 2.1 ホーム / ダッシュボード (Home / Dashboard)

#### U1: 平日祝日・休校日における誤った通常授業時間割表示
- **該当箇所**: `app.js` 370〜432行目 (`renderTodaySchedule()`)
- **現状の挙動**: 土日（`effectiveDay === 0 || 6`）のみ休業日判定を行っており、国民の祝日（例: スポーツの日、勤労感謝の日）や学校休業日であっても月〜金であれば通常の授業時間割が表示されてしまう。学生が休日に誤登校するリスクがある。
- **期待される挙動**: `calendarData.events` と照合し、当日が祝日・休校日（`hasClasses === false`）の場合は「本日は休業日（祝日名）です。授業はありません。」と明瞭に表示されること。
- **改善提案**:
  ```javascript
  const todayEvent = calendarData?.events?.find(e => 
    (e.type === 'holiday' || e.type === 'break' || e.hasClasses === false) && 
    (e.date === todayDateStr || (e.endDate && todayDateStr >= e.date && todayDateStr <= e.endDate))
  );
  if (!sub && (effectiveDay === 0 || effectiveDay === 6 || todayEvent)) {
    const holidayName = todayEvent?.name || todayEvent?.title || '休業日';
    return subBanner + `
      <section class="panel today-schedule" id="today-schedule">
        <div class="panel-head"><h2>${icon('calendar')}今日の時間割</h2><span class="badge yellow">${escapeHTML(holidayName)}</span></div>
        <div class="dashboard-rest-card"><p>本日は<strong>${escapeHTML(holidayName)}</strong>です。授業はありません。</p><a class="button" href="#timetable">${icon('calendar')}週間時間割を見る</a></div>
      </section>`;
  }
  ```

#### U2: 2コマ連続授業（duration >= 2）の重複カード描画
- **該当箇所**: `app.js` 433〜463行目 (`renderTodaySchedule()`)
- **現状の挙動**: 実験・実習などの2コマ連続授業（例: 3〜4限）が、3限と4限の両方のスロットで「3〜4限 実習」として2重にカード化されて縦に並ぶ。
- **期待される挙動**: 連続授業は開始時限にまとめて1枚のカード（「3〜4限 13:00〜16:10」）として描画され、後続時限は重複描画されないこと。
- **改善提案**: `renderedLessonIds = new Set()` を設け、描画済み `lesson.id` を後続時限でスキップする。

#### U3: 翌日／前日時間割のプレビュー・日付ナビゲーション欠如
- **該当箇所**: `app.js` 684〜721行目 (`home()`, `renderTodayOverview()`)
- **現状の挙動**: 日付が `new Date()` に固定されており、放課後や日曜夜に「明日の授業の準備」をする際にわざわざ時間割タブへ移動して探さなければならない。
- **期待される挙動**: 「今日の時間割」上部に「← 前日」「翌日 →」「今日に戻る」ボタンがあり、ワンタップで翌日や前日の時間割をダッシュボード上で確認できること。
- **改善提案**:
  ダッシュボードの日付オフセット状態（`dashboardOffsetDays = 0`）を管理し、「今日の時間割」パネル上部に「← 前日」「今日に戻る」「翌日 →」ボタンを配置する。クリック時にオフセット日数を加減算し、該当日付の時間割をダッシュボード上で即座にプレビュー描画する。
  ```javascript
  // 日付ナビゲーションUI生成およびハンドラ案
  const navControls = `
    <div class="dashboard-date-nav" role="group" aria-label="日付ナビゲーション">
      <button type="button" class="button subtle" data-nav-offset="-1" aria-label="前日の時間割">← 前日</button>
      <button type="button" class="button subtle ${state.dashboardOffset === 0 ? 'active' : ''}" data-nav-offset="0">今日</button>
      <button type="button" class="button subtle" data-nav-offset="1" aria-label="翌日の時間割">翌日 →</button>
    </div>`;
  ```

#### U4: 定期試験公開状態のダッシュボード非連動
- **該当箇所**: `app.js` 484〜503行目 (`renderExamAlert()`)
- **現状の挙動**: 試験時間割が公開中（`status: 'published'`）であっても、常に「定期試験時間割は、試験開始10日前の正午にこちらで発表します。」と固定表示される。
- **期待される挙動**: 公開時は「定期試験時間割 公開中」の緑色バッジと「試験科目と教室を確認してください」の案内文に切り替わること。
- **改善提案**:
  `renderExamAlert()` において `examData.meta.status === 'published'` を評価し、公開中であれば緑色バッジ（`badge green`）と確認を促すメッセージへ動的に切り替える。
  ```javascript
  const isPublished = examData?.meta?.status === 'published';
  const noticeText = isPublished 
    ? '定期試験時間割が公開されました。試験科目・教室・監督配置を確認してください。' 
    : (examData?.meta?.noticeText || '定期試験時間割は、試験開始10日前の正午にこちらで発表します。');
  const badgeCls = isPublished ? 'green' : 'yellow';
  const badgeText = isPublished ? '公開中' : '試験情報';
  ```

#### U5: 休日・休校日における食堂「営業中」誤案内
- **該当箇所**: `app.js` 555〜562行目 (`renderCafeteriaSummary()`)
- **現状の挙動**: 土日・祝日でメニュー未設定の場合、「本日の日替わりランチ・定食メニューは、学生食堂にて提供中です。」と表示される。
- **期待される挙動**: 週末・休校日は「本日は食堂休業日です（平日 11:30〜13:30 営業）」と正確に休業状態を案内すること。
- **改善提案**:
  `renderCafeteriaSummary()` において、土日（`dayOfWeek === 0 || dayOfWeek === 6`）または祝日・休校日の場合は案内テキストを休業案内へ動的に切り替える。
  ```javascript
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const statusText = isWeekend
    ? '本日は学生食堂の休業日です（平日 11:30〜13:30 営業）。'
    : '本日の日替わりランチ・定食メニューは、学生食堂にて提供中です。';
  ```

---

### 2.2 時間割 (Timetable)

#### U6: 横スクロール時の時限列消失とスクロール示唆不足
- **該当箇所**: `styles.css` 10行目 (`.real-timetable`)、`app.js` 1034〜1039行目
- **現状の挙動**: スマートフォン等の狭小画面で木曜・金曜側へ横スクロールすると、左端の時限・時刻ヘッダーが画面外に流れてしまい、何限目の授業か識別できなくなる。
- **期待される挙動**: 時限列（`th:first-child`）が左端に `position: sticky; left: 0` で固定され、境界シャドウが表示されること。
- **改善提案（CSS）**:
  ```css
  .real-timetable th:first-child{position:sticky;left:0;z-index:3;background:#f8f1f3;box-shadow:2px 0 4px rgba(0,0,0,0.06)}
  [data-theme="dark"] .real-timetable th:first-child{background:#171b26;box-shadow:2px 0 4px rgba(0,0,0,0.3)}
  ```

#### U7: 条件変更アコーディオンと「決定」ボタンの操作不整合
- **該当箇所**: `app.js` 1047〜1062, 1639〜1673行目
- **現状の挙動**: セレクトボックスを変更するだけで即座に画面全体が再描画されるが、下部に「決定」ボタンが配置されており、ユーザーがボタンを押すべきか困惑する。また全DOM再構築によりフォーカスが失われる。
- **期待される挙動**: テーブル部分のみを部分更新（差分描画）するか、「決定」ボタンの文言を「条件を閉じる」に変更すること。
- **改善提案**:
  セレクトボックス変更時に全画面再描画（`render()`）を行うのではなく、時間割テーブル領域（`#timetable-sheet`）のみを部分再描画してセレクトボックスのフォーカスとアコーディオンの開閉状態を維持する。あわせて下部ボタンのラベルを「決定」から「条件を閉じる」に変更し、クリック時はアコーディオン（`<details>`）の `open = false` のみを実行する役割に整理する。

#### U8: 非活性セレクトボックスの理由説明不足
- **該当箇所**: `app.js` 1030〜1033行目
- **現状の挙動**: 3年生以上の「クラス」や、4・5年E科以外の「コース」が無効化（`disabled`）されるが、理由の説明がなく故障に見える。
- **期待される挙動**: 単体版（`timetable-standalone.html`）のように「※3年生以上は学科共通」「※4・5年のE科で選択」等の補助注記（`<small class="field-hint">`）を添えること。
- **改善提案**:
  `timetable-standalone.html` と同様に、無効化されたセレクト要素の下部に `<small class="field-hint">` で注記を表示する。
  ```javascript
  const classHint = isUpperGrade ? '<small class="field-hint">※3年生以上は学科共通です</small>' : '';
  const courseHint = !isECourseSelectable ? '<small class="field-hint">※電気電子工学科（E科）4・5年のみ選択可能です</small>' : '';
  ```

#### U9: エクスポート調整モーダルにおける非標準 CSS `zoom` の使用
- **該当箇所**: `styles.css` 265行目 (`.size-paper-wrap{zoom:var(--sheet-scale,0.65);}`)
- **現状の挙動**: 非標準の CSS `zoom` を使用しているため、Firefox等のブラウザでプレビューが縮小されずモーダルからはみ出す。
- **期待される挙動**: 標準的な CSS `transform: scale(...)` を使用し、全モダンブラウザで均一にプレビュー表示されること。
- **改善提案（CSS）**:
  ```css
  .size-paper-wrap{transform:scale(var(--sheet-scale,0.65));transform-origin:top center;transition:transform .15s}
  ```

#### U10: エクスポート調整モーダルからの直接保存動線の欠落
- **該当箇所**: `app.js` 1070〜1083行目 (`export-size-modal`)
- **現状の挙動**: サイズ調整モーダル内に保存ボタンがなく、調整後に「閉じる」を押してから元の画面の「💾 PDFダウンロード」を押す2度手間を強いられる。
- **期待される挙動**: モーダル操作バー内に「💾 このサイズで保存」ボタンを直接配置すること。
- **改善提案**:
  サイズ調整モーダルのコントロールバー（`.size-preset-row`）内に「💾 このサイズで保存」ボタンを直接配置し、モーダルを閉じる手間なく `downloadCurrentTimetable('download')` を発火可能にする。
  ```javascript
  // モーダル操作バーへのボタン追加
  <button type="button" class="button primary" id="size-modal-save-btn">💾 このサイズで保存</button>
  // クリックリスナーで保存処理を直結
  document.getElementById('size-modal-save-btn')?.addEventListener('click', () => {
    downloadCurrentTimetable('download');
    closeSizeAdjustModal();
  });
  ```

#### U11: クリップボードコピー時のフィードバック欠如
- **該当箇所**: `app.js` 1502行目 (`data-preview-copy`)
- **現状の挙動**: プレビューモーダルで「📋 コピー」を押してもモーダル内に何の反応もなく、コピーできたか分からない。
- **期待される挙動**: クリック時にボタンラベルが2秒間「✅ コピー完了！」に切り替わり、明確な成功フィードバックを返すこと。
- **改善提案**:
  プレビューモーダルの「📋 コピー」ボタン押下時に、コピー完了直後ボタンラベルを一時的に「✅ コピー完了！」に変更し、成功スタイルクラス（`.btn-success`）を付与して2秒後に元の表記に戻すフィードバックタイマーを追加する。
  ```javascript
  const copyBtn = document.getElementById('data-preview-copy');
  copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(text);
    const origHtml = copyBtn.innerHTML;
    copyBtn.innerHTML = '✅ コピー完了！';
    copyBtn.classList.add('btn-success');
    setTimeout(() => {
      copyBtn.innerHTML = origHtml;
      copyBtn.classList.remove('btn-success');
    }, 2000);
  });
  ```

---

### 2.3 定期試験 (Exam)

#### U12: 定期試験カードおよびグリッドのCSSスタイル完全欠落
- **該当箇所**: `styles.css`
- **現状の挙動**: `.exam-timetable`, `.exam-card`, `.exam-card-head`, `.exam-card-meta` などのスタイルが一切定義されておらず、枠線・余白のない素のテキストとして縦並びになり視読性が極めて低い。
- **期待される挙動**: カード型レイアウト、日付・時限バッジ、教室・監督者の明瞭な視覚構造が適用されること。
- **改善提案（CSS）**:
  ```css
  .exam-timetable{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px}
  .exam-card{background:white;border:1px solid var(--line);border-radius:var(--radius);padding:16px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
  [data-theme="dark"] .exam-card{background:#171b26;border-color:var(--line)}
  .exam-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .exam-card h3{font-size:15px;font-weight:700;margin:6px 0}
  .exam-card-meta{font-size:12px;color:var(--muted);margin:0}
  ```

#### U13: クラス・科目・日程の検索・フィルタ機能の欠如
- **該当箇所**: `app.js` 753〜815行目 (`exam()`)
- **現状の挙動**: 該当クラスの試験一覧がそのまま並ぶのみで、科目名での絞り込みや他学年・他クラスの試験を検索できない。
- **期待される挙動**: インクリメンタルサーチ（科目名・教室・教員名）入力欄を備えること。
- **改善提案**:
  定期試験画面ヘッダー部にインクリメンタル検索入力欄を配置し、入力されたキーワードで科目名・教室・教員名をリアルタイムに絞り込み表示する。
  ```javascript
  const searchInputHtml = `
    <div class="exam-search-bar">
      <input type="search" id="exam-search-input" class="search-input" placeholder="科目名・教室・教員名で絞り込み..." aria-label="定期試験科目検索">
    </div>`;
  document.getElementById('exam-search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.exam-card').forEach(card => {
      const match = card.textContent.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
    });
  });
  ```

#### U14: CSSクラス名のタイポによる注意書きスタイル崩れ
- **該当箇所**: `app.js` 797行目 (`class="exam-rule"`) vs `styles.css` 370行目 (`.exam-rules`)
- **現状の挙動**: 単数形と複数形の不一致により、自習ルールの注意書きにスタイル（フォントサイズ11px、ミュート色）が適用されない。
- **期待される挙動**: クラス名を一致させ、指定通りの補助テキストスタイルで表示されること。
- **改善提案**:
  `app.js` 797行目の出力クラス名を単数形から複数形の `class="exam-rules"` に変更し、`styles.css` 370行目の定義（`font-size: 11px; color: var(--muted);`）と一致させる。
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -797,1 +797,1 @@
  -  <p class="exam-rule">※試験教室・時間は変更される場合があります。</p>
  +  <p class="exam-rules">※試験教室・時間は変更される場合があります。</p>
  ```

---

### 2.4 年間予定 (Calendar)

#### U15: 年間予定タイムラインのCSSスタイル完全欠落
- **該当箇所**: `styles.css`
- **現状の挙動**: `.calendar-timeline`, `.calendar-event-item` 等が未定義のため、ブラウザデフォルトの黒丸ビュレット付きリスト（左40pxインデント）で表示され、バッジや日付が横並びで崩れる。
- **期待される挙動**: 左側に日付・種別バッジ、右側にイベント名と備考が整然と並ぶタイムラインUIとして表示されること。
- **改善提案（CSS）**:
  ```css
  .calendar-timeline{list-style:none;padding:0;margin:16px 0;display:flex;flex-direction:column;gap:10px}
  .calendar-event-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:white;border:1px solid var(--line);border-radius:10px;flex-wrap:wrap}
  [data-theme="dark"] .calendar-event-item{background:#171b26;border-color:var(--line)}
  .calendar-event-date{font-size:12px;font-weight:700;min-width:110px;color:var(--ink)}
  .calendar-event-title{font-size:13.5px;flex:1}
  .calendar-event-note{font-size:11px;color:var(--muted);width:100%;margin-top:4px}
  ```

#### U16: 月別・学期別・カテゴリ別フィルタの欠如による長大スクロールの強制
- **該当箇所**: `app.js` 817〜876行目 (`calendar()`)
- **現状の挙動**: 4月から翌年3月までの1年分の全行事が一括出力され、今月の予定や定期試験日程を探すために長大な縦スクロールを強いられる。
- **期待される挙動**: 「今月」「前期」「後期」「すべて」の期間タブ、および「祝日・休業」「定期試験」「学校行事」のカテゴリ絞り込みボタンを提供すること。
- **改善提案**:
  年間予定タブ上部に「今月」「前期」「後期」「通年」の期間セグメントコントロールと、「祝日・休業」「定期試験」「学校行事」のカテゴリ絞り込みチップを配置し、長大なリストを目的別に絞り込んで閲覧可能にする。
  ```html
  <div class="calendar-filters" role="group" aria-label="年間行事フィルタ">
    <div class="filter-group">
      <button type="button" class="chip active" data-period="all">通年</button>
      <button type="button" class="chip" data-period="current">今月</button>
      <button type="button" class="chip" data-period="zenki">前期</button>
      <button type="button" class="chip" data-period="kouki">後期</button>
    </div>
  </div>
  ```

#### U17: 「今日」や直近イベントのハイライトおよび過去イベントの視覚的区別欠如
- **該当箇所**: `app.js` 835〜846行目 (`calendar()`)
- **現状の挙動**: 数ヶ月前の過去の行事とこれからの予定が同一の濃さで並んでおり、現在位置が直感的に把握できない。
- **期待される挙動**: 過去の行事は `opacity: 0.6` 等で控えめに表示し、今日または直近のイベントはアクセントボーダーや「本日」バッジで強調表示されること。
- **改善提案**:
  行事リスト生成時に各イベント日付と本日日付を照合し、過去のイベントには `.is-past`（`opacity: 0.55`）、当日のイベントには `.is-today`（ワインレッドの左境界線と「本日」バッジ付与）のスタイルクラスを適用して時間軸上の現在位置を直感的に把握可能にする。
  ```javascript
  const isPast = evDateStr < todayDateStr;
  const isToday = evDateStr === todayDateStr;
  const itemClass = `calendar-event-item ${isPast ? 'is-past' : ''} ${isToday ? 'is-today' : ''}`;
  const todayBadge = isToday ? '<span class="badge red">本日</span>' : '';
  ```

---

### 2.5 食堂メニュー (Cafeteria)

#### U18: プロパティ名不一致による週替わり抽出メニューの完全非表示（UI影響）
- **該当箇所**: `app.js` 890〜895行目 (`cafeteria()`)
- **現状の挙動**: 前述のバグB3により、抽出済み日替わりメニューが存在するにもかかわらず、学生には「未対応」としか表示されず、利用者に深刻な不信感を与える。
- **期待される挙動**: A定食・B定食・丼・麺・価格・アレルギー情報が日別カードで表示されること。
- **改善提案**:
  `app.js` 890行目のデータ参照キーを修正し、`dist-data/cafeteria.json` の正しいプロパティである `weeklyMenus` を参照して週替わり日替わりメニューカード（A定食・B定食・麺類・丼物・価格・アレルゲン）を描画する。
  ```javascript
  const weeklyMenus = Array.isArray(data.weeklyMenus) ? data.weeklyMenus : (Array.isArray(data.menus) ? data.menus : []);
  const hasWeeklyData = isTextExtracted && weeklyMenus.length > 0;
  // hasWeeklyData が真の場合、週別および日別のメニューカードグリッドをレンダリング
  ```

#### U19: 週別・日別タブ切り替えおよび日付ナビゲーションの欠如
- **該当箇所**: `app.js` 879〜917行目 (`cafeteria()`)
- **現状の挙動**: 複数週のデータがある場合でも週の切り替えUIが存在せず、今週以外の献立を確認できない。
- **期待される挙動**: 「今週」「来週」の週タブ切り替えと、曜日ごとの献立カードナビゲーションを提供すること。
- **改善提案**:
  食堂タブ上部に週切り替えタブ（例: `第1週（11/4〜11/8）`、`第2週（11/11〜11/15）`）を配置し、選択された週の月〜金の献立カードをスムーズに切り替えて閲覧できるナビゲーションUIを導入する。
  ```javascript
  const weekTabs = weeklyMenus.map((w, idx) => `
    <button type="button" class="tab-btn ${idx === currentWeekIdx ? 'active' : ''}" data-week-idx="${idx}">
      ${escapeHTML(w.weekLabel || `第${idx + 1}週`)} (${escapeHTML(w.weekRange || '')})
    </button>
  `).join('');
  ```

#### U20: 食堂メニューリスト・寮生食堂セクションのCSSスタイル欠落
- **該当箇所**: `styles.css`
- **現状の挙動**: `.cafeteria-menu-list`, `.cafeteria-menu-item`, `.dormitory-section` 等が未定義のため、料理名や価格がスタイルのない素の文字として並ぶ。
- **期待される挙動**: ホーム画面の `.dish-item` 同様、料理名、価格バッジ、アレルギーアイコンが整頓された見やすいデザインで表示されること。
- **改善提案（CSS）**:
  `styles.css` に食堂メニューカードおよび寮生食堂セクションのレスポンシブグリッドCSSルールを追加する。
  ```css
  .cafeteria-menu-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin:16px 0}
  .cafeteria-menu-item{background:white;border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
  [data-theme="dark"] .cafeteria-menu-item{background:#171b26;border-color:var(--line)}
  .cafeteria-menu-item h4{font-size:14px;font-weight:700;margin:0 0 6px;color:var(--ink)}
  .cafeteria-menu-item .price{font-size:13px;font-weight:700;color:var(--primary)}
  .cafeteria-menu-item .allergens{font-size:11px;color:var(--muted);margin-top:4px}
  .dormitory-section{margin-top:28px;padding:20px;background:var(--card-bg,#fff);border:1px solid var(--line);border-radius:var(--radius)}
  [data-theme="dark"] .dormitory-section{background:#171b26}
  ```

---

### 2.6 リンク集・マイリンク (Links)

#### U21: マイリンク削除ボタンの未定義関数呼び出しによるクラッシュ（UI影響）
- **該当箇所**: `app.js` 1554行目
- **現状の挙動**: バグB1により削除ボタンを押しても画面に何も起きず、コンソールに未定義エラーが出る。
- **期待される挙動**: 即座に対象リンクが一覧から消去されること。
- **改善提案**:
  `app.js` 1554行目のクリックイベント内で呼び出している未定義関数名 `removeMyLink(id)` を、定義済みの `deleteMyLink(id)` に修正する（または後方互換性のため `const removeMyLink = deleteMyLink;` のエイリアスを定義する）。
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -1554,1 +1554,1 @@
  -  removeMyLink(id);
  +  deleteMyLink(id);
  ```

#### U22: マイリンクの並び替えUI（↑・↓ボタン）の欠落
- **該当箇所**: `app.js` 938〜945行目 (`linksView()`), 619行目 (`reorderMyLink()`)
- **現状の挙動**: 内部に並び替え関数 `reorderMyLink` が実装されているにもかかわらず、画面上に「↑」「↓」ボタンが描画されておらず、リンク順序を変更できない。
- **期待される挙動**: 各マイリンク行に「↑」「↓」ボタンを配置し、ユーザーが優先順位を自由に変更できること。
- **改善提案**:
  各マイリンク行（`.mylink-row`）内に上移動・下移動ボタン（↑・↓）を配置し、実装済みの `reorderMyLink(id, direction)` を呼び出すイベントハンドラを接続する。
  ```javascript
  // linksView 内のマイリンク行HTML
  <div class="mylink-reorder-btns">
    <button type="button" class="btn-subtle mylink-move-btn" data-move-id="${link.id}" data-dir="up" aria-label="上へ移動" ${idx === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" class="btn-subtle mylink-move-btn" data-move-id="${link.id}" data-dir="down" aria-label="下へ移動" ${idx === links.length - 1 ? 'disabled' : ''}>↓</button>
  </div>
  ```

#### U23: マイリンク追加フォームのダークモード表示崩れ
- **該当箇所**: `styles.css` 122〜127行目、`app.js` 961〜965行目 (`#mylink-form`)
- **現状の挙動**: 入力欄が `.field` クラスでラップされていないため、ダークモード時に白背景のOS標準テキストボックスが表示され、デザインが崩れる。
- **期待される挙動**: テーマ変数（`--line`, `--ink`, `--bg`）に連動した洗練されたインプットデザインが保たれること。
- **改善提案（CSS）**:
  マイリンク追加フォームの各入力欄を `<div class="field">` でラップするか、`styles.css` にテーマ変数連動のインプットスタイルを定義してダークモードでの背景色と枠線を整える。
  ```css
  .mylink-form input[type="text"], .mylink-form input[type="url"]{
    width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:6px;
    background:var(--bg);color:var(--ink);font-size:13px;outline:none;
  }
  .mylink-form input:focus{border-color:var(--primary);box-shadow:0 0 0 2px rgba(107,29,47,0.15)}
  ```

#### U24: 英語エラーメッセージによる不親切なUX
- **該当箇所**: `app.js` 599〜614行目 (`addMyLink()`)
- **現状の挙動**: 不正なURL入力時に `'Disallowed scheme'`、空入力時に `'Name and URL are required'` と英語メッセージが表示される。
- **期待される挙動**: 「URLは http:// または https:// で入力してください」「リンク名とURLを入力してください」と分かりやすい日本語で案内されること。
- **改善提案**:
  `addMyLink()` 内のバリデーションエラーメッセージを日本語のわかりやすい案内文に変更する。
  ```diff
  --- a/app.js
  +++ b/app.js
  @@ -602,2 +602,2 @@
  -  if (!name || !url) throw new Error('Name and URL are required');
  -  if (!isValidCustomUrl(url)) throw new Error('Disallowed scheme');
  +  if (!name || !url) throw new Error('リンク名とURLを両方入力してください。');
  +  if (!isValidCustomUrl(url)) throw new Error('URLは http:// または https:// で始まる有効な形式で入力してください。');
  ```

#### U25: 公式リンク集のカテゴリ分け欠如による視認性低下
- **該当箇所**: `app.js` 919〜955行目 (`OFFICIAL_SERVICES`)
- **現状の挙動**: TeamsやClassroomなどの学習ツールと、JR西日本や山陽電車などの運行情報が混ざって1つの横並びリストになっている。
- **期待される挙動**: 「学内・学習支援（LMS/Office）」「学術情報・シラバス」「交通・運行情報」にセクション分けされて表示されること。
- **改善提案**:
  `OFFICIAL_SERVICES` 配列の各要素に `category: 'learning' | 'academic' | 'transport'` 属性を追加し、リンク集画面で「学内学習ツール・LMS」「学術情報・シラバス」「交通・運行情報」の3セクションにグループ化して見出し付きで出力する。
  ```javascript
  const categories = [
    { key: 'learning', title: '学内学習ツール・LMS' },
    { key: 'academic', title: '学術情報・シラバス' },
    { key: 'transport', title: '交通・運行情報' }
  ];
  // カテゴリごとに見出し（<h3>）とリンクカードグリッドを分割出力
  ```

---

### 2.7 共通UI・テーマ・アクセシビリティ (Common UI, Theme & Accessibility)

#### U26: `portal.html` におけるダークモード初期スクリプト欠落によるテーマちらつき (FOUT)
- **該当箇所**: `portal.html` 1〜12行目
- **現状の挙動**: バグB12により、ダークモード利用時にページ遷移すると一瞬真っ白な画面がフラッシュする。
- **期待される挙動**: DOM描画前にテーマが即時適用され、ちらつきなくダークモードで表示されること。
- **改善提案**:
  `portal.html` の `<head>` 直下に `index.html` と同一のテーマ即時適用インラインスクリプトを追加し、CSS適用・DOM描画前の白画面フラッシュ（FOUT）を防止する。
  ```html
  <script>
    (function() {
      try {
        const saved = localStorage.getItem('campus-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        document.documentElement.dataset.theme = theme;
      } catch (e) {}
    })();
  </script>
  ```

#### U27: ダークモード時のテーマ切り替えボタン `aria-label` / `title` 反転不整合
- **該当箇所**: `app.js` 各画面関数の `#theme-toggle` 出力部（705, 754, 818等）
- **現状の挙動**: ダークモード適用中であっても `aria-label="ダークモードに切り替える"` がハードコードされており、スクリーンリーダーで誤った案内が読み上げられる。
- **期待される挙動**: ダークモード時は「ライトモードに切り替える」、ライトモード時は「ダークモードに切り替える」と動的に反転すること。
- **改善提案**:
  各画面のヘッダーにおけるテーマ切り替えボタン出力部で、現在のテーマ状態に応じてアクセシビリティラベルおよびツールチップを動的に反転させる。
  ```javascript
  const isDark = document.documentElement.dataset.theme === 'dark';
  const labelText = isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える';
  const buttonHtml = `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${labelText}" title="${labelText}">${isDark ? icon('sun') : icon('moon')}</button>`;
  ```

#### U28: モバイルにおけるフローティングハンバーガーボタンのコンテンツ被り
- **該当箇所**: `styles.css` 20〜22行目 (`.floating-menu-toggle`)
- **現状の挙動**: スマホで下スクロールすると、左上に固定されたボタンが時間割の左上セルやカードのテキストに重なり、視認やタップを阻害する。
- **期待される挙動**: トップバー（ヘッダー領域）内に収めるか、下スクロール時に自動退避すること。
- **改善提案（CSS）**:
  モバイル画面において、固定フローティングボタン（`position: fixed`）をトップバー内に常設配置するか、下スクロール時に自動退避（`transform: translateY(-70px)`）し上スクロールで再表示されるスマートヘッダーCSSを適用する。
  ```css
  @media (max-width: 768px) {
    .floating-menu-toggle {
      top: 12px; left: 12px;
      transition: transform 0.25s ease;
    }
    .floating-menu-toggle.is-hidden {
      transform: translateY(-70px);
    }
  }
  ```

#### U29: モーダルダイアログのフォーカストラップおよびフォーカス復元欠如
- **該当箇所**: `app.js` 1195〜1233, 1248〜1259行目
- **現状の挙動**: モーダルオープン時に内部へフォーカスが移動せず、Tabキーで背後の非活性要素が選択される。また閉じた後も元のトリガーボタンにフォーカスが復帰しない。
- **期待される挙動**: オープン時に閉じるボタンへフォーカスし、Tab移動をモーダル内に閉じ込め（Focus Trap）、クローズ時に元の要素へ復元すること。
- **改善提案**:
  モーダルオープン時に前回のフォーカス要素（`lastActiveElement = document.activeElement`）を記憶し、モーダル内の閉じるボタンにフォーカスを移す。さらに `Tab` キー押下時のフォーカストラップ関数を組み込み、モーダルクローズ時に `lastActiveElement.focus()` でフォーカスを復帰させる。
  ```javascript
  function trapFocus(modalElement) {
    const focusables = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    modalElement.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  ```

#### U30: コントラスト比不足（--muted 3.5:1）によるアクセシビリティ（WCAG 2.1 AA）違反
- **該当箇所**: `styles.css` 2行目 (`--muted: #7c8290` on `#f7f6f4`)
- **現状の挙動**: 薄いグレー文字（`#7c8290`）が背景色（`#f7f6f4`）に対してコントラスト比約3.5:1しかなく、10px〜12pxの補足文字（時限の時刻表記や注記）が読みにくい。
- **期待される挙動**: WCAG 2.1 AA基準を満たす 4.5:1 以上のコントラスト比（`--muted: #5e6573`）を確保すること。
- **改善提案（CSS）**:
  `styles.css` の CSS 変数定義において、ライトモードおよびダークモードの `--muted` カラー値を WCAG 2.1 AA 準拠（4.5:1以上）のカラーコードへ更新する。
  ```css
  :root {
    /* 現行 #7c8290 (約3.5:1) -> 改修後 #5e6573 (約5.3:1, WCAG AA合格) */
    --muted: #5e6573;
  }
  [data-theme="dark"] {
    /* 暗背景 #12141c に対し十分な視読性を確保 */
    --muted: #a8b2c4;
  }
  ```

#### U31: データ非同期読み込み中のローディング表示およびオフライン状態表示の欠如
- **該当箇所**: `app.js` 268〜312行目 (`loadDistData()`)
- **現状の挙動**: `fetch` 実行中にスピナーやスケルトンが表示されず、通信失敗時もエラーが握りつぶされて内蔵データが表示されるため、最新かフォールバックか学生に分からない。
- **期待される挙動**: 初回データ取得中に控えめなインジケータを示し、通信失敗時は「※オフラインモード（内蔵データを表示中）」と明示すること。
- **改善提案**:
  `loadDistData()` の実行ステータス（`isLoading`, `isOffline`）を状態管理変数に保持し、データ取得中はスケルトンを表示する。通信失敗時はヘッダーに「※オフライン動作中（内蔵フォールバックを表示中）」の黄色インジケータバッジを表示してユーザーにデータ鮮度の状態を明示する。
  ```javascript
  let isOfflineMode = false;
  async function loadDistData() {
    try {
      await Promise.all([/* fetch */]);
    } catch (e) {
      isOfflineMode = true;
      document.getElementById('network-status-badge')?.classList.remove('hidden');
    }
  }
  ```

---

## 第3章: 取得可能だが未実装・フォールバック止まりとなっているデータ項目（Data Pipeline & Fallback Gaps）

### D1: 学生食堂メニュー取得スクリプトにおけるテキスト抽出のダミー化とフォールバック固定

- **該当箇所**: `scripts/fetch-cafeteria.mjs`（75–94行目 `parseCafeteriaPdf`, 160–175行目 `runFetchCafeteria`）
- **現状の挙動**:
  PDFのテキスト件数が50件以上ある場合 `isTextExtracted: true` を返すのみで、品目名・価格・アレルゲン情報のパース処理が一切実装されていない。`isTextExtracted: true` であっても、`weeklyMenus` には固定フォールバック（`scripts/fallbacks/cafeteria.json` に記載された11/2〜11/13の2週間分）がそのまま代入される。公式ニュースタイトルは「学生食堂メニュー（１１/４～１１/３０）」と1か月全日程分が存在するにもかかわらず、11/16以降のメニューデータが永遠に未取得・未抽出のままとなる。
- **期待される挙動**:
  `pdf2json` から得られるテキスト要素の座標（X/Y）およびテキスト内容を解析し、月間全週分の日替わり定食A/B、丼物、麺類、価格、アレルギー情報を自動抽出し、`dist-data/cafeteria.json` に動的に出力すること。
- **改善提案（パース拡張・コード案）**:
  ```javascript
  export function parseWeeklyMenuTable(pages) {
    const weeklyMenus = [];
    // Y座標で行（曜日・品目）、X座標で列（週・日）をグループ化
    // 日替わりランチA、B、丼、麺、価格（例: 450円）、アレルギー（卵、乳、小麦等）を正規表現で抽出
    // 週単位オブジェクト { weekLabel, weekRange, days: [...] } を構築
    return weeklyMenus;
  }
  ```

---

### D2: フロントエンド `#cafeteria` タブのプロパティ不一致による常時フォールバック表示

- **該当箇所**: `app.js`（881–895行目 `cafeteria()` 関数）
- **現状の挙動**:
  `dist-data/cafeteria.json` のスキーマは `weeklyMenus` である（ホームダッシュボード `renderCafeteriaSummary()` では正しく `weeklyMenus` を参照している）。しかし、メイン画面の `cafeteria()` では `data.menus` または `data.items` を探索しているため `menus` は常に空配列 `[]` となる。その結果、取得済み献立データが存在するにもかかわらず、画面上には常に「テキスト未抽出」の警告文が表示され、データが完全にマスクされている。
- **期待される挙動**:
  `data.weeklyMenus` を正しく受け取り、週別・日別の献立カードを展開描画すること。
- **改善提案**:
  ```javascript
  const weeklyMenus = data.weeklyMenus || [];
  const menuContent = (isTextExtracted && weeklyMenus.length)
    ? `<div class="cafeteria-weeks">${weeklyMenus.map(renderWeekCard).join('')}</div>`
    : `<p class="info-note">...</p>`;
  ```

---

### D3: 寮生食堂（Dormitory）メニューPDF（`menyu.pdf`）の未パースおよびフロントエンド未連携

- **該当箇所**: `scripts/fetch-cafeteria.mjs`（148–158行目, 188–189行目）, `dist-data/cafeteria.json`（7–8行目）, `app.js`（908–914行目）
- **現状の挙動**:
  スクレイパーは寮生食堂ニュース記事およびPDFリンク（`dormitoryArticleUrl`, `dormitoryPdfUrl`）を正常に検出してJSONメタデータに格納している。しかし、PDF内容（朝食・昼食・夕食の月間献立）を解析するロジックが未実装であり、フロントエンドでも外部リンクボタンの表示にとどまっている。
- **期待される挙動**:
  寮生食堂メニューPDFをダウンロード・パースし、寮生向けに朝・昼・夕の献立カレンダーをポータル内で閲覧可能にすること。
- **改善提案**:
  `scripts/fetch-cafeteria.mjs` に `parseDormitoryPdf(buffer)` を追加し、朝昼夕のメニューを抽出して `dist-data/cafeteria.json` の `dormitoryMenus` に格納。UIに「一般食堂」「寮生食堂」切り替えタブを設ける。

---

### D4: 定期試験日程・時間割のPDF未パースおよび空配列（`days: []`）固定化

- **該当箇所**: `scripts/fetch-exam.mjs`（121–136行目, 153行目）, `dist-data/exam.json`（54行目）, `app.js`（763–789行目）
- **現状の挙動**:
  スクレイパーは試験時間割PDF（例: 前期期末試験 `R8zenkishiken0728.pdf` や後期期末試験PDF）へのリンクを検出しているが、PDFファイルをダウンロード・パースする処理が一切実装されておらず、スクリプト内で `let days = [];` と空配列がハードコードされている。そのため画面上では常に「試験時間割は未公開です」というフォールバックカードしか表示されない。
- **期待される挙動**:
  試験時間割PDFの表構造をパースし、クラス別・日別・時限別の試験科目名、教室名、監督教員名（supervisor）を抽出して `dist-data/exam.json` に出力すること。
- **改善提案**:
  `pdf2json` を用いた試験時間割グリッドパーサーを実装し、クラス行と時限列から試験エントリを抽出して `days` 配列を生成する。

---

### D5: 答案返却期間時間割（`returnPdfUrl`）の取得済みデータのフロントエンド未連携

- **該当箇所**: `scripts/fetch-exam.mjs`（113行目, 147行目）, `dist-data/exam.json`（11行目）, `app.js`（753–804行目）
- **現状の挙動**:
  スクレイパーは定期試験ページから「令和8年度前期答案返却期間時間割（20260805更新）」（`touanhenkyaku20260805.pdf`）を抽出し、`dist-data/exam.json` の `meta.returnPdfUrl` として保存している。また `dist-data/calendar.json` にも答案返却期間（前期: 8/6〜8/7、後期: 2/10〜2/12）が定義されている。しかし `app.js` の `exam()` 関数内では `sourcePdfUrl`, `notesPdfUrl`, `prevPdfUrl` の3つのボタンのみが生成されており、`meta.returnPdfUrl` は完全に無視されている。
- **期待される挙動**:
  答案返却期間が近づいた際、定期試験画面の上部リンク列に「📝 答案返却時間割 (PDF)」ボタンが表示され、学生がワンタップで返却時間割を閲覧できること。
- **改善提案**:
  `exam()` 関数内のボタングループ生成部に `meta.returnPdfUrl` のリンクボタンを追加する。

---

### D6: 年間行事予定（Calendar）の自動スクレイピング未実装（フォールバック丸ごとコピー止まり）

- **該当箇所**: `scripts/fetch-calendar.mjs`（105–117行目）, `dist-data/calendar.json`
- **現状の挙動**:
  `fetch-calendar.mjs` は、公式カレンダーページ（`https://www.akashi.ac.jp/life/calendar.html`）を取得して `zenkiPdfUrl` と `koukiPdfUrl` を正規表現で抽出するのみである。`terms`, `daySubstitutions`, `events` は一切スクレイピングされず、`baseline`（`scripts/fallbacks/calendar.json`）の固定オブジェクトがそのままコピーされて `dist-data/calendar.json` に書き出されている。
- **期待される挙動**:
  Webページ上のテーブルまたは行事予定表PDFから、祝日・授業振替日・学期開始終了日・定期試験期間・高専祭日程を自動抽出し、動的に更新されること。
- **改善提案**:
  HTMLテーブルパーサーまたはPDFパーサーを実装し、年間行事一覧を自動更新可能にする。

---

### D7: 年間行事予定PDFリンク（`zenkiPdfUrl` / `koukiPdfUrl`）の取得済みデータのフロントエンド未表示

- **該当箇所**: `dist-data/calendar.json`（6–7行目）, `app.js`（817–876行目 `calendar()` 関数）
- **現状の挙動**:
  `dist-data/calendar.json` には、最新の行事予定表PDFリンク（前期: `zenkiPdfUrl`, 後期: `koukiPdfUrl`）および `sourceUrl` が保持されている。しかし、`app.js` の `#calendar` タブでは「📅 行事予定をiCal保存 (.ics)」ボタンのみが配置され、原本PDFへのリンクや公式サイトへのリンクが一切描画されていない。
- **期待される挙動**:
  年間予定画面上部に「📄 前期行事予定表 (PDF)」「📄 後期行事予定表 (PDF)」「🌐 公式カレンダー」のリンクボタンが配置されること。
- **改善提案**:
  `calendar()` 関数のアクションバーに原本PDF閲覧ボタンを追加する。

---

### D8: 生成済みデータ `dist-data/timetable-links.json` の完全な孤立（フロントエンド未ロード）

- **該当箇所**: `dist-data/timetable-links.json`, `scripts/build-data.mjs`（24–31行目）, `app.js`（268–312行目 `loadDistData()`）
- **現状の挙動**:
  ビルドタスク（`fetch-timetable-links.mjs`）によって、授業時間割ページおよび定期試験ページから抽出されたすべてのPDFリンク（前期時間割、後期時間割、前期期末試験、定期試験諸注意、答案返却時間割）が `dist-data/timetable-links.json` として生成・保存されている。しかしフロントエンド `app.js` の `loadDistData()` では `timetable-lessons.json`, `calendar.json`, `exam.json`, `cafeteria.json` の4つしか fetch しておらず、`timetable-links.json` は一切読み込まれていない。リポジトリ全体でこれを参照するUIコードが皆無である。
- **期待される挙動**:
  `timetable-links.json` をフロントエンドでロードし、時間割画面の出典欄やリンク集画面に「公式時間割・試験PDFアーカイブ一覧」として提示すること。
- **改善提案**:
  `loadDistData()` に `timetable-links.json` のフェッチを追加し、`#timetable` の出典欄および `#links` タブにPDFアーカイブを表示する。

---

### D9: 時間割PDF凡例（`roomLegends` 43件）の抽出済みデータの変換時破棄と教室正式名称の未表示

- **該当箇所**: `scripts/parse-pdf-timetable.mjs`（160–166行目）, `dist-data/R8_koukijikanwari_20260924-2.json`（9–52行目）, `scripts/convert-to-lessons.mjs`, `dist-data/timetable-lessons.json`, `app.js`（455行目, 1038行目）
- **現状の挙動**:
  時間割PDF原本の最下部（Y >= 86）には、「トーカロ: トーカロ教室(旧合併教室)」「オークラ: オークラ輸送機 4M教室(旧4M教室)」「情1: 情報メディアセンター第1演習室」「福研: 福利施設研修室」「もの: A科ものづくり演習室」「演1: 専攻科棟演習室1」など43件の教室略称と正式名称の対応表（凡例）が存在する。`parse-pdf-timetable.mjs` はこの凡例を正しく抽出し `roomLegends` に保存しているが、Webアプリ用データを生成する `convert-to-lessons.mjs` がこれを出力スキーマに含めず完全に破棄している。そのためUI上では略称コードしか表示できず、低学年や新入生にとってどの教室を指すのか判別が困難である。
- **期待される挙動**:
  `timetable-lessons.json` に `roomLegends` を含め、時間割テーブルやダッシュボードの教室名表示時にツールチップまたは正式名称補足を展開すること。
- **改善提案**:
  `convert-to-lessons.mjs` で `roomLegends` を保持し、UIで教室略称ホバー時に正式名称を表示する。

---

### D10: 時間割変換スクリプト（`convert-to-lessons.mjs`）のパース不具合による科目名欠損と教員名誤代入

- **該当箇所**: `scripts/convert-to-lessons.mjs`（91–119行目 `parseSourceText`）, `dist-data/timetable-lessons.json`
- **現状の挙動**:
  前述のバグB4と同様。教室表記 `[...]` がない単一行テキスト（例: `"構造システムⅠ"`, `"世界の都市形成史"`）において、`lines.slice(0, -1)` により `subjectName` が空文字 `""` になり、教員名フィールドに科目名が代入されるデータ破損が発生する。また教室表記が先頭にある場合（例: `"[情4・専講]\nマウンイェ\n地盤工学特論"`）も科目名が空文字になる。
- **期待される挙動**:
  全授業コマで正確な科目名、教室名、教員名がパース・格納されること。
- **改善提案**:
  単一行テキストおよび先頭ブラケット表記に対応した正規表現マッチングを実装する。

---

### D11: 通学アクセス・神姫バス（Shinki Bus）時刻表リンクの未連携

- **該当箇所**: `app.js`（919–928行目 `OFFICIAL_SERVICES`）, `#links` タブ, `#home` クイックリンク
- **現状の挙動**:
  `OFFICIAL_SERVICES` には「JR西日本 列車運行情報」「山陽電車 運行情報」などの鉄道運行情報は登録されているが、明石高専生（土山駅・大久保駅・魚住駅等からのバス通学生）が日常的に利用する「神姫バス（明石高専前・高専正門前・土山駅・大久保駅）」の時刻表・バスロケーションへのリンクが一切登録されていない。
- **期待される挙動**:
  公式リンク集およびホーム画面に「神姫バス時刻表（高専前・土山駅・大久保駅方面）」および「神姫バスロケ（接近情報）」のリンクが提供されること。
- **改善提案**:
  `OFFICIAL_SERVICES` に神姫バス公式時刻表・バスナビリンクを追加する。

---

### D12: 時間割原本PDF URL（`sourcePdfUrl`）のフロントエンド未反映とハードコード定数依存

- **該当箇所**: `app.js`（116–120行目, 1042行目, 1218行目）, `timetable-data.js`（11–15行目 `SOURCE` オブジェクト）
- **現状の挙動**:
  原本PDFの更新日（`SOURCE?.updated || '2026-09-24'`）がハードコードされた定数 `SOURCE` に依存しており、時間割画面の出典リンク（1042行目）はHTMLページ（`lesson.html`）を指している。`timetable-links.json` や `parse-pdf-timetable.mjs` で取得されている時間割原本PDF（`R8_koukijikanwari_20260924-2.pdf`）への直接リンクが提供されていない。
- **期待される挙動**:
  `timetable-lessons.json` に含まれる動的メタデータ（更新日時・PDF直リンク）をUI出典欄およびエクスポートヘッダーに反映すること。
- **改善提案**:
  動的メタデータをUIにバインドし、原本PDFへの直接ダウンロードリンクを配置する。

---

## 改善優先度マトリクス（緊急度・影響度・実装コスト）

### 5.1 優先度評価基準

- **緊急度**:
  - **P0（即時修正）**: クラッシュ、実行時例外、誤登校・誤認を招く表示崩れ、テスト失敗
  - **P1（短期修正）**: 主要機能の非表示・未連携、デザインシステム崩壊（CSS欠落）、重要操作の摩擦
  - **P2（中期改善）**: ユーザビリティ向上、アクセシビリティ（WCAG 2.1 AA）準拠、検索・フィルタ拡張
  - **P3（将来検討）**: パイプライン完全自律化、追加公式リンク・アーカイブ連携
- **影響度**:
  - **High**: 全ユーザーまたは特定学年・学科の利用が全面的に阻害される
  - **Medium**: 特定機能の操作性が著しく低下する、または情報が一部欠損する
  - **Low**: 軽微な見た目・補助情報の不足
- **実装コスト**:
  - **Low**: 数行〜10行程度のピンポイント修正（即日対応可）
  - **Medium**: コンポーネント改修、CSSルール群追加、パーサー改修（1〜2日）
  - **High**: パイプライン構造刷新、新規パーサー開発（数日〜1週間）

---

### 5.2 全課題マトリクス一覧表

| ID | 課題名 | 区分 | 緊急度 | 影響度 | コスト | 主な該当ファイル |
|:---|:---|:---:|:---:|:---:|:---:|:---|
| **B1** | マイリンク削除ボタンの `ReferenceError` | バグ | **P0** | High | Low | `app.js:1554` |
| **B2** | 定期試験タブの `1-undefined` 描画と学科フィルタ不発 | バグ | **P0** | High | Low | `app.js:762, 730` |
| **B3** | 食堂メニューのプロパティ不一致による完全非表示 | バグ | **P0** | High | Low | `app.js:890` |
| **B4** | 単一行科目のパース破損とテスト `F5-T1-01` 失敗 | バグ | **P0** | High | Low | `scripts/convert-to-lessons.mjs:115` |
| **B5** | Git HEAD の専攻科未コミットによるテスト失敗 | バグ | **P0** | High | Low | `dist-data/timetable-lessons.json` |
| **B8** | 新規4タブの主要CSSクラス完全欠落 | バグ | **P1** | High | Medium | `styles.css` |
| **U1** | 祝日・休校日の誤った通常時間割表示 | UI/UX | **P1** | High | Medium | `app.js:370` |
| **U2** | 2コマ連続授業の重複カード描画 | UI/UX | **P1** | Medium | Low | `app.js:433` |
| **U6** | 時間割横スクロール時の時限列固定欠如 | UI/UX | **P1** | High | Low | `styles.css:10` |
| **U9** | 非標準 CSS `zoom` の使用による表示崩れ | UI/UX | **P1** | Medium | Low | `styles.css:265` |
| **U12** | 定期試験カード・グリッドのCSS欠落 | UI/UX | **P1** | High | Medium | `styles.css` |
| **U15** | 年間予定タイムラインのCSS欠落 | UI/UX | **P1** | High | Medium | `styles.css` |
| **U18** | 週替わり食堂メニュー非表示のUI影響 | UI/UX | **P1** | High | Low | `app.js:890` |
| **U20** | 食堂メニューリストのCSS欠落 | UI/UX | **P1** | High | Medium | `styles.css` |
| **U21** | マイリンク削除クラッシュのUI影響 | UI/UX | **P1** | High | Low | `app.js:1554` |
| **D2** | 食堂 `#cafeteria` タブのデータプロパティ不一致 | データ | **P1** | High | Low | `app.js:890` |
| **D5** | 答案返却時間割PDF（`returnPdfUrl`）の未表示 | データ | **P1** | Medium | Low | `app.js:753` |
| **D7** | 年間行事予定PDF（`zenkiPdfUrl`/`koukiPdfUrl`）の未表示 | データ | **P1** | Medium | Low | `app.js:817` |
| **D10** | 単一行セルの科目名欠損と教員名誤代入 | データ | **P1** | High | Low | `scripts/convert-to-lessons.mjs` |
| **B6** | 学事週数が木曜日に進む計算不整合 | バグ | **P2** | Medium | Medium | `app.js:345` |
| **B7** | `window` イベントリスナーの重複登録・リーク | バグ | **P2** | Medium | Low | `app.js:1584` |
| **B9** | iCal エクスポートの年度・学期引数欠落と日付固定 | バグ | **P2** | Medium | Medium | `timetable-export.js:617` |
| **B10** | 試験スクリプトとフロントエンドのキー不一致（days vs schedule） | バグ | **P2** | Medium | Low | `app.js:725` |
| **B12** | `portal.html` のダークモードFOUC防止スクリプト欠落 | バグ | **P2** | Low | Low | `portal.html` |
| **B14** | E2E テストの形骸化（Hollow Assertions） | バグ | **P2** | Medium | Medium | `tests/*.test.cjs` |
| **U3** | 翌日・前日時間割プレビューナビゲーション欠如 | UI/UX | **P2** | Medium | Medium | `app.js:684` |
| **U4** | 定期試験公開状態のダッシュボード非連動 | UI/UX | **P2** | Medium | Low | `app.js:484` |
| **U5** | 休日食堂の「営業中」誤案内 | UI/UX | **P2** | Medium | Low | `app.js:555` |
| **U7** | 時間割条件変更アコーディオンと決定ボタンの不整合 | UI/UX | **P2** | Medium | Medium | `app.js:1047` |
| **U8** | 非活性セレクトボックスの無効化理由説明不足 | UI/UX | **P2** | Low | Low | `app.js:1030` |
| **U10** | エクスポートサイズ調整モーダルからの直接保存動線欠落 | UI/UX | **P2** | Medium | Low | `app.js:1070` |
| **U11** | クリップボードコピー時のインプレースフィードバック欠如 | UI/UX | **P2** | Low | Low | `app.js:1502` |
| **U13** | 定期試験の科目・教室・監督者検索フィルタ欠如 | UI/UX | **P2** | Medium | Medium | `app.js:753` |
| **U14** | CSSクラス名タイポ（exam-rule vs exam-rules） | UI/UX | **P2** | Low | Low | `app.js:797` |
| **U16** | 年間予定の月別・学期別・カテゴリ別フィルタ欠如 | UI/UX | **P2** | Medium | Medium | `app.js:817` |
| **U17** | 年間予定の「本日」強調および過去イベント視覚区別欠如 | UI/UX | **P2** | Low | Low | `app.js:835` |
| **U19** | 食堂メニューの週別・日別タブ切り替え欠如 | UI/UX | **P2** | Medium | Medium | `app.js:879` |
| **U22** | マイリンク並び替えボタン（↑・↓）のUI欠落 | UI/UX | **P2** | Medium | Low | `app.js:938` |
| **U23** | マイリンク追加フォームのダークモード表示崩れ | UI/UX | **P2** | Low | Low | `styles.css:122` |
| **U24** | マイリンク入力エラーの英語メッセージ | UI/UX | **P2** | Low | Low | `app.js:599` |
| **U25** | 公式リンク集のカテゴリ分け欠如 | UI/UX | **P2** | Low | Low | `app.js:919` |
| **U26** | `portal.html` のダークモード初期スクリプト欠落によるテーマちらつき（FOUT） | UI/UX | **P2** | Low | Low | `portal.html` |
| **U27** | テーマ切り替えボタンの aria-label 反転不整合 | UI/UX | **P2** | Low | Low | `app.js:705` |
| **U28** | モバイルフローティングボタンのコンテンツ被り | UI/UX | **P2** | Medium | Low | `styles.css:20` |
| **U29** | モーダルのフォーカストラップ・フォーカス復元欠如 | UI/UX | **P2** | Medium | Medium | `app.js:1195` |
| **U30** | コントラスト比不足（--muted）のアクセシビリティ違反 | UI/UX | **P2** | Medium | Low | `styles.css:2` |
| **U31** | データ非同期ロード表示およびオフライン状態明示欠如 | UI/UX | **P2** | Low | Low | `app.js:268` |
| **D9** | 教室凡例（roomLegends 43件）の破棄と正式名称未表示 | データ | **P2** | Medium | Medium | `scripts/convert-to-lessons.mjs` |
| **D11** | 通学アクセス・神姫バス時刻表リンクの欠落 | データ | **P2** | Medium | Low | `app.js:919` |
| **D12** | 時間割原本PDF直リンク欠落と定数 SOURCE 依存 | データ | **P2** | Low | Low | `app.js:1042` |
| **B11** | 食堂スクレイパーのダミー抽出判定とフォールバック固定 | バグ | **P3** | Medium | High | `scripts/fetch-cafeteria.mjs:75` |
| **B13** | package.json の `"type": "module"` 欠落 | バグ | **P3** | Low | Low | `package.json` |
| **D1** | 食堂PDFパース未実装による月間後半メニュー欠損 | データ | **P3** | Medium | High | `scripts/fetch-cafeteria.mjs` |
| **D3** | 寮生食堂メニューPDF（menyu.pdf）の未パース | データ | **P3** | Low | High | `scripts/fetch-cafeteria.mjs` |
| **D4** | 定期試験時間割PDFの未パース（days: [] 固定） | データ | **P3** | Medium | High | `scripts/fetch-exam.mjs` |
| **D6** | 年間行事予定の自動スクレイピング未実装 | データ | **P3** | Low | High | `scripts/fetch-calendar.mjs` |
| **D8** | `timetable-links.json` の完全孤立（UI未ロード） | データ | **P3** | Low | Medium | `app.js:268` |

---

### 5.3 段階的改修ロードマップ

#### Phase 1: クリティカルバグ解消 ＆ CSSスタイル完全適用（即時〜1週間）
- **目的**: 実行時エラーの根絶、デザインシステムの復元、基本機能の可視化
- **主要タスク**:
  1. `app.js` の `removeMyLink` → `deleteMyLink` 修正（B1 / U21）。
  2. `app.js` の `studentSelection.dept` → `department` 修正（B2）。
  3. `app.js` の `data.menus` → `data.weeklyMenus` 参照修正および献立レンダラー実装（B3 / U18 / D2）。
  4. `scripts/convert-to-lessons.mjs` の単一行パース不具合修正（B4 / D10）。
  5. 最新データ（357コマ）の Git コミットおよびテスト全パス確認（B5）。
  6. `styles.css` に欠落している新規4タブの全CSSクラスルール（`.exam-card`, `.calendar-timeline`, `.cafeteria-menu-list`, `.mylink-row` 等）を追加（B8 / U12 / U15 / U20）。
  7. 時間割時限列の `sticky` 固定（U6）および CSS `zoom` から `transform: scale` への置換（U9）。
  8. ホーム画面の祝日・休校日判定（U1）および連続授業カード重複防止（U2）。

#### Phase 2: UI/UX ブラッシュアップ ＆ 連携強化（2週間〜1ヶ月）
- **目的**: 日常操作性の向上、アクセシビリティ準拠、取得済みデータのUI連携
- **主要タスク**:
  1. 定期試験タブでの答案返却PDFボタン（D5）、年間予定タブでの原本PDFボタン（D7）の追加。
  2. 学事週数計算（B6）およびイベントリスナー多重登録（B7）の是正。
  3. iCalエクスポートの学期動的対応（B9）および試験データ探索キーの統合（B10）。
  4. マイリンク並び替えボタン（U22）、日本語エラーメッセージ化（U24）。
  5. WCAG 2.1 AA 準拠（コントラスト比改善 U30、フォーカストラップ U29、ARIA属性 U27）。
  6. 神姫バス時刻表リンクの追加（D11）および教室凡例ツールチップ対応（D9）。
  7. E2Eテストスイートの検証ロジック厳格化（B14）。

#### Phase 3: データパイプライン完全自律化（中期計画）
- **目的**: 手動フォールバックに頼らない完全自律スクレイピングシステムの確立
- **主要タスク**:
  1. 食堂メニューPDFの表形式パーサー実装による全週自動更新（B11 / D1）。
  2. 定期試験時間割PDFのパーサー実装による `days` 自動生成（D4）。
  3. 寮生食堂PDFパーサーおよび寮生タブの実装（D3）。
  4. 年間行事予定の自動更新パイプライン確立（D6）。
  5. `dist-data/timetable-links.json` を活用したPDFアーカイブ機能の提供（D8）。

---

## 付録: 独立検証手順

本報告書で指摘した各バグおよび整合性課題は、以下のコマンドを実行することで、任意の開発環境において独立して再現・検証可能です。

### 1. 動作バグの静的・動的再現

```powershell
Set-Location "C:\Users\ko\.gemini\antigravity\scratch\R8_Co-work_6_web"

# B1: removeMyLink 未定義呼び出しの確認
node -e "const code = require('fs').readFileSync('app.js', 'utf8'); console.log('removeMyLink calls:', (code.match(/removeMyLink/g)||[]).length, '| deleteMyLink defs:', (code.match(/function deleteMyLink/g)||[]).length);"
# -> 出力: removeMyLink calls: 1 | deleteMyLink defs: 1 (未定義呼び出しを確認)

# B2: studentSelection.dept 参照バグの確認
node -e "const code = require('fs').readFileSync('app.js', 'utf8'); console.log('studentSelection.dept exists:', code.includes('studentSelection.dept'));"
# -> 出力: true (誤ったプロパティ参照を確認)

# B3: 食堂メニューのプロパティ不一致確認
node -e "const code = require('fs').readFileSync('app.js', 'utf8'); console.log('Searches data.menus:', code.includes('data.menus')); console.log('Searches weeklyMenus in cafeteria():', code.slice(code.indexOf('function cafeteria()'), code.indexOf('function linksView()')).includes('weeklyMenus'));"
# -> 出力: Searches data.menus: true | Searches weeklyMenus in cafeteria(): false

# B4: convert-to-lessons の単一行セル科目名欠損の確認
node -e "const { parseSourceText } = require('./scripts/convert-to-lessons.mjs'); console.log('Single line result:', parseSourceText('構造システムⅠ'));"
# -> 出力: { subjectName: '', location: '', teacher: '構造システムⅠ' } (科目名の欠損を確認)

# B8: CSS クラス欠落の確認
node -e "const css = require('fs').readFileSync('styles.css', 'utf8'); for(const c of ['exam-card', 'calendar-timeline', 'cafeteria-menu-list', 'mylink-row']) console.log(c, 'in styles.css:', css.includes(c));"
# -> 出力: すべて false (クラス定義の完全欠落を確認)
```

### 2. データパイプライン乖離の検証

```powershell
# D5, D7, D8: 取得済みメタデータのフロントエンド未参照確認
Select-String -Path 'app.js' -Pattern 'returnPdfUrl|zenkiPdfUrl|timetable-links'
# -> 出力: 0件 (取得済みデータがフロントエンドで一切参照されていないことを確認)

# D9: 教室凡例の変換時破棄確認
Select-String -Path 'dist-data/R8_koukijikanwari_20260924-2.json' -Pattern 'roomLegends'
# -> 出力: 1件ヒット (中間JSONには存在する)
Select-String -Path 'dist-data/timetable-lessons.json' -Pattern 'roomLegends'
# -> 出力: 0件 (最終配布JSONでは破棄されている)
```

### 3. リポジトリ整合性（無変更）の確認

```powershell
git status --short
# -> AUDIT_REPORT.md および .agents/ 以外のファイルが変更されていないことを確認。
```

---
**以上、本報告書をもって明石高専キャンパスポータルの総合調査を完了とします。**
