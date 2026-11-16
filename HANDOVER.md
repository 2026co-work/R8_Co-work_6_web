# 開発引き継ぎドキュメント (HANDOVER.md)

最終更新: 2026-11-15 11:58 JST  
対象リポジトリ: `C:\Users\ko\.gemini\antigravity\scratch\R8_Co-work_6_web` (branch: `main`)

全マイルストーン（M1〜M5, E2E, M_FINAL）の実装・ビルド・厳格E2Eテスト検証が完了した状態の引き継ぎ・完了記録ドキュメントです。

---

## 1. 関連設計・仕様ドキュメント一覧（リポジトリ内）

- [`PROJECT.md`](./PROJECT.md): 全体アーキテクチャ、全24機能インベントリ（F1〜F24）、マイルストーン定義（M1〜M5, E2E, M_FINAL: すべて DONE）、データ・Cookie・LocalStorage・シラバスURL・iCal出力のインターフェース契約
- [`TEST_INFRA.md`](./TEST_INFRA.md): E2Eテスト設計書（Tier 1〜4 のカバレッジマトリクス、12の実運用シナリオ定義）
- [`TEST_READY.md`](./TEST_READY.md): テスト実行コマンド一覧（通常モード・`STRICT_E2E=1` 厳格モード）

---

## 2. マイルストーン完了状況サマリー

| マイルストーン | 対象機能 | 状態 | 詳細 |
|---|---|---|---|
| **M1: データ自動取得・公開基盤** | F1〜F5 | **完了 (DONE)** | `scripts/fetch-*.mjs`, `scripts/build-data.mjs`, `scripts/convert-to-lessons.mjs` (専攻科 専1・専2 ME/AC PDF抽出対応), `scripts/fallbacks/`, `dist-data/*.json`, `.github/workflows/data-update.yml`, `vite.config.mjs` 実装・検証済み |
| **M2: 6タブナビ・ホーム刷新** | F6〜F8 | **完了 (DONE)** | `index.html`, `portal.html`, `app.js`, `styles.css`, `tests/portal.test.cjs` にて6タブ構成（`#home`, `#timetable`, `#exam`, `#calendar`, `#cafeteria`, `#links`）、ホーム「今日の概要ダッシュボード」、非対象機能の排除を実装・検証済み |
| **M3: 時間割の動的連携・専攻科UI** | F9〜F12 | **完了 (DONE)** | `app.js` に専攻科選択（6:専1, 7:専2, ME/AC）、`dist-data/timetable-lessons.json` の動的メタデータ/専攻科マージ（本科 `LESSONS` の国際学生・芸術科目を保持しつつ専1/専2を動的反映）、`renderTimetableBanners()`、および `timetable-export.js` の動的ヘッダ・フッター連動を実装済み（`timetable-standalone.html` 無変更維持） |
| **M4: 定期試験・年間予定・iCal拡張** | F13〜F17 | **完了 (DONE)** | `app.js` に `exam()`/`examView()`（クラス別スケジュールカード・監督者・シラバス連携・10日前正午未公開フォールバック・自習ルール・`syotyui.pdf`案内）、`calendar()`/`calendarView()`（行事予定タイムライン・第1〜15週・授業振替・`#export-calendar-ics`）を実装。`timetable-export.js` に `generateCalendarIcs()`, `exportCalendarIcs()`, `generateIcs()` の `UNTIL`/`EXDATE` 拡張、および `#export-format` の `.ics` 選択肢とプレビューを追加 |
| **M5: 食堂メニュー・シラバス・マイリンク** | F18〜F22 | **完了 (DONE)** | `app.js` に `cafeteria()`/`cafeteriaView()`（抽出済みメニュー表示・未抽出時フォールバック・`sourcePdfUrl: null` 時ボタン無効化・寮生食堂/ニュースリンク）、`OFFICIAL_SERVICES` 8サイト HTTPS＋`noopener noreferrer` リンク、`getSyllabusUrl()`、`linksView()` のマイリンク一覧描画・追加/削除/ワンタップ追加UI、`addMyLink()` の `https?://` スキーム制限・保存失敗伝播を実装 |
| **E2E / M_FINAL: 総合テスト・統合完了** | F23〜F24 | **完了 (DONE)** | `tests/e2e-harness.cjs` 同期 fetch 対応および `STRICT_E2E=1` 全280件 + 全テスト316件パス（失敗0・スキップ0） |

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
