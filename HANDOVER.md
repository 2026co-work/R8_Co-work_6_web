# 開発引き継ぎドキュメント (HANDOVER.md)

最終更新: 2026-11-17 00:54 JST  
対象リポジトリ: `C:\Users\ko\.gemini\antigravity\scratch\R8_Co-work_6_web` (branch: `main`)

全マイルストーン（M1〜M5, E2E, M_FINAL）および [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) で特定された全57件のバグ・UI/UX課題・未連携データ項目の改修・検証が完了した最新記録ドキュメントです。

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

---

## 3. ビルド・テスト検証結果（実測値）

### 3.1 厳格E2Eテスト (`$env:STRICT_E2E='1'`)
- **実行コマンド**: `$env:STRICT_E2E='1'; node --test tests/e2e-tier1-features.test.cjs tests/e2e-tier2-boundaries.test.cjs tests/e2e-tier3-combinations.test.cjs tests/e2e-tier4-scenarios.test.cjs`
- **結果**: **tests 280 / pass 280 / fail 0 / skipped 0**

### 3.2 本番ビルド検証 (`npm run build`)
- **結果**: **成功 (exit code 0)**
- `vite build` により `dist/` へバンドル出力され、`dist-data/` → `dist/dist-data/` および `timetable-standalone.html` → `dist/timetable-standalone.html` が自動ミラーリングされました。

### 3.3 全テストスイート (`npm test`)
- **実行コマンド**: `npm test` (`node --test tests/*.test.cjs`)
- **結果**: **tests 316 / pass 316 / fail 0 / skipped 0**（既存単体テスト36件 + E2E 280件 すべてパス）

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
