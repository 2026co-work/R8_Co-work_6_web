# 開発引き継ぎドキュメント (HANDOVER.md)

最終更新: 2026-11-25 01:20 JST  
対象リポジトリ: `C:\Users\ko\.gemini\antigravity\scratch\R8_Co-work_6_web` (branch: `main`)

全マイルストーン（M1〜M5, E2E, M_FINAL）、[`AUDIT_REPORT.md`](./AUDIT_REPORT.md) の57件対応、およびライブブラウザ・コードベース監査に基づくv2テーマ・レスポンシブ・バグ修正・UX機能強化・回帰テスト検証が完了した最新記録ドキュメントです。

---

## 1. 関連設計・仕様・監査ドキュメント一覧（リポジトリ内）

- [`PROJECT.md`](./PROJECT.md): 全体アーキテクチャ、全24機能インベントリ（F1〜F24）、マイルストーン定義（M1〜M5, E2E, M_FINAL: すべて DONE）、データ・Cookie・LocalStorage・シラバスURL・iCal出力のインターフェース契約
- [`AUDIT_REPORT.md`](./AUDIT_REPORT.md): 動作バグ14件（B1〜B14）・UI/UX課題31件（U1〜U31）・未実装/フォールバック乖離12件（D1〜D12）の監査報告書
- [`TEST_INFRA.md`](./TEST_INFRA.md): E2Eテスト設計書（Tier 1〜4 のカバレッジマトリクス、12の実運用シナリオ定義）
- [`TEST_READY.md`](./TEST_READY.md): テスト実行コマンド一覧（通常モード・`STRICT_E2E=1` 厳格モード）

---

## 2. ブランチ分割・改修完了サマリー

1. **`main` ベースラインコミット**
   - `feat(pipeline)`: M1 データ自動取得パイプライン・フォールバック・`.gitignore` 整備
   - `feat(portal)`: M2〜M5 ポータル本体（`index.html`, `portal.html`, `app.js`, `styles.css`, `timetable-export.js`）
   - `test(e2e)`: E2Eテストスイートおよび設計・監査ドキュメント一式
2. **`fix/critical-runtime-bugs`（重大バグ修正 → `main` マージ済み）**
   - スクリプト解析・データ生成修正（B4, B5, B13, D9, D10）: `package.json` `"type": "module"` 明記、`scripts/convert-to-lessons.mjs` の単一行・先頭ブラケットパース修正および `roomLegends` 保持、`dist-data/timetable-lessons.json` 再生成（科目名欠損 0件、教室凡例 42件）
   - フロントエンドランタイム修正（B1, B2, B3, B6, B7, B10, D2）: `deleteMyLink()` 呼び出し修正、試験タブの `department`/`days` 参照修正、学食 `weeklyMenus` カード描画、学事週数の月曜起算化、`window` リスナー重複防止
   - エクスポート・テーマ初期化修正（B9, B12, U26）: iCal 動的年度/学期転送、`portal.html` ダークモード FOUC 防止スクリプトおよび `localStorage` 同期
3. **`feat/ui-ux-and-styling`（CSS＆UI/UX・アクセシビリティ改善 → `main` マージ済み）**
   - `styles.css` 拡充（B8, U6, U9, U12, U15, U20, U23, U28, U30）: 新規4タブの完全CSS定義、時間割時限列 `sticky` 固定、サイズ調整モーダルの標準 `transform: scale` 対応、モバイルフローティングボタンの自動退避、WCAG 2.1 AA コントラスト改善（`--muted` 調整）
   - UX・A11y 強化（U1〜U5, U7, U8, U10, U11, U13, U14, U16, U17, U19, U22, U24, U25, U27, U29, U31）: ホーム日付前後ナビ・祝日/連続コマ重複修正・公開/休業連動、時間割条件ヒント/確定ラベル/調整内保存/コピー完了通知、試験検索バー、年間予定の期間・カテゴリ絞り込み＆本日/過去区別、学食週切り替えタブ、マイリンク `↑`/`↓` 並び替えボタン＆日英エラー表示＆サービス分類、テーマボタン `aria-label` 反転＆モーダルフォーカス復元＆オフライン表示バッジ
4. **`feat/data-pipeline-and-links`（未連携データ接続・スクレイパー・E2E強化 → `main` マージ済み）**
   - 未連携データのUI接続（D5, D7, D8, D9, D11, D12）: 答案返却PDF・前期/後期行事PDF・`timetable-links.json` 公式PDFアーカイブ・時間割原本PDF直リンク・`roomLegends` ツールチップ/一覧・神姫バスリンクの統合
   - スクレイパー強化（B11, D1, D3, D4, D6）: `fetch-cafeteria.mjs`（週別メニュー表・寮生食堂PDF解析）、`fetch-exam.mjs`（試験PDF解析 `parseExamPdf`）、`fetch-calendar.mjs`（HTML行事抽出 `extractCalendarEventsFromHtml`）を実装（取得不能時は安全にベースラインへフォールバック）
   - E2E アサーション強化（B14）: `tests/e2e-harness.cjs` の `.click()` / ボタン問い合わせ対応と `F10-T1-04`, `F13-T1-03`, `F13-T1-04`, `F18-T1-05`, `F22-T1-04` の実質検証強化
5. **`fix/theme-and-color-system`（v2 テーマシステム＆ダークモード配線 → `main` マージ済み）**
   - `index.html` / `portal.html` / `app.js`: FOUC 防止初期化スクリプト統一、`color-scheme`・動的 `theme-color` メタ追加、`system` / `light` / `dark` の 3モード循環および `matchMedia` / `storage` イベント同期を実装
   - `styles.css`: ダークモード面階層・`color-scheme: dark`・`.alert-info` / `.badge` 視認性・コーナー固定セル・スキップリンク・無効ボタンの WCAG AA コントラストを修正
   - エクスポート分離: サイズ調整モーダルに独立した出力テーマ切替（`#size-modal-theme-toggle`）を設け、アプリ全体テーマとの混線を解消
6. **`fix/responsive-layout-and-a11y`（v2 レスポンシブ・モーダル・A11y・印刷改修 → `main` マージ済み）**
   - モバイル＆表幅修正: 390px 幅の `#home` ヘッダー溢れ解消、タブ遷移時の `#menu-toggle` 復元、デスクトップ/タブレット時間割フィット改善
   - サイズ調整モーダル: `.size-paper-wrap` の `zoom` 二重縮小を廃止し実サイズ基準の単一スケール計算に統一、コントロールバー折り返し溢れを解消
   - A11y＆印刷: `#main` フォーカス枠抑制、全モーダル共通のフォーカストラップ・`inert`・`Escape` 閉じ・`focus-visible`、フォントフォールバック補強、`@media print` 全タブ印刷対応
7. **`fix/core-logic-export-and-data`（v2 ロジック・iCal・出力・フォーム・データ連携修正 → `main` マージ済み）**
   - iCal＆出力修正: 年間行事 `.ics.ics` 二重拡張子解消、`VTIMEZONE (Asia/Tokyo)`・JST曜日整合・授業振替日重複排除・`calendar.json` `2026-10-14` 水曜振替整備、プレビュー/テキスト出力二重括弧修正、モーダル閉鎖時のライブパネル CSS 変数汚染を除去
   - 試験＆バナー＆データ連携: `app.js` 内のハードコード試験期間（11/20–26）撤去（`F11-T1-05` モック日を実予定の `2027-02-03` に整合）、試験規定重複除去、`専1ME` バッジ・空検索表示・MyLinks `novalidate`/重複URL検証・学食 `notice`/`bowl`/`details` 表示・WebClass SAML連携・`loadDistData` 一括更新・動的ブランド表記を修正
8. **`feat/portal-ux-and-features`（v2 UX強化・新機能・PWA対応 → `main` マージ済み）**
   - プロフィール＆授業進行: 全タブ右上＆オンボーディングからの所属クイック切替モーダル（`#profile-switcher-modal`）、`#home` リアルタイム授業中/次の授業カウントダウン＆ `#timetable` 当日列ハイライト
   - 各タブ操作性向上: 時間割ハイライト検索＋教室コードタップ詳細ポップオーバー、試験カウントダウンバー、年間予定検索・過去非表示・本日ジャンプ・月間カレンダー切替、学食本日強調＆アレルゲン警告フィルタ＋更新日時表示
   - PWA＆操作性: `manifest.webmanifest`（`vite.config.mjs` による `dist/manifest.webmanifest` ミラーリング対応）、MyLinks インライン編集＆削除Undo付きトースト（`#portal-toast`）、出力トースト、キーボード操作（`Alt+1`〜`6`・`/` 検索フォーカス）を追加
9. **`test/verify-all-improvements`（v2 回帰テスト＆ドキュメント更新 → `main` マージ済み）**
   - `tests/improvements-regression.test.cjs`: 上記すべての修正・新機能を検証する12件の回帰テスト（`IMP-01`〜`IMP-12`）を追加
   - `HANDOVER.md`: 改修ブランチ履歴および最新ビルド・テスト結果を反映

---

## 3. ビルド・テスト検証結果（実測値）

### 3.1 厳格E2Eテスト (`$env:STRICT_E2E='1'`)
- **実行コマンド**: `$env:STRICT_E2E='1'; node --test tests/e2e-tier1-features.test.cjs tests/e2e-tier2-boundaries.test.cjs tests/e2e-tier3-combinations.test.cjs tests/e2e-tier4-scenarios.test.cjs`
- **結果**: **tests 280 / pass 280 / fail 0 / skipped 0**

### 3.2 本番ビルド検証 (`npm run build`)
- **結果**: **成功 (exit code 0)**
- `vite build` により `dist/` へバンドル出力され、`dist-data/` → `dist/dist-data/`、`timetable-standalone.html` → `dist/timetable-standalone.html`、および `manifest.webmanifest` → `dist/manifest.webmanifest` が自動ミラーリングされました。

### 3.3 全テストスイート (`npm test`)
- **実行コマンド**: `npm test` (`node --test tests/*.test.cjs`)
- **結果**: **tests 328 / pass 328 / fail 0 / skipped 0**（既存単体テスト36件 + E2E 280件 + 改善回帰テスト12件 すべてパス）

---

## 4. 今後の運用・保守コマンド

```powershell
# 1. 通常テスト実行
npm test

# 2. 厳格モードE2Eテスト（スキップなし検証）
$env:STRICT_E2E='1'; node --test tests/e2e-tier1-features.test.cjs tests/e2e-tier2-boundaries.test.cjs tests/e2e-tier3-combinations.test.cjs tests/e2e-tier4-scenarios.test.cjs

# 3. 本番ビルド（dist/ 生成および dist-data/・単体版ミラーリング）
npm run build
```

### 保守時の制約（非対象機能・互換性）
- **非対象機能（R8）**: 授業変更（振替情報）、混雑状況、歴代校長、備品報告、空き教室は**絶対に実装・文言追加しないこと**（`F8-T1-04` および `T3-P-18` で検証されます。なお年間予定の「授業振替」は仕様内機能です）。
- **単体版の維持（R1/F12）**: `timetable-standalone.html` は変更せず、`tests/timetable.test.cjs` の124通りテスト互換を維持すること。
- **エクスポート互換（R5/F17）**: `tests/export.test.cjs` および `tests/export-formats.test.cjs` の既存契約を維持すること。
