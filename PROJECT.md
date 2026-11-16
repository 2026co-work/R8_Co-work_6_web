# Project: 明石高専キャンパスポータル (Akashi Kosen Campus Portal)

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE (R1)                              │
│                                                                        │
│  scripts/fetch-timetable-links.mjs ──► scripts/parse-pdf-timetable.mjs │
│  scripts/fetch-calendar.mjs        ──► scripts/parse-calendar.mjs      │
│  scripts/fetch-exam.mjs            ──► scripts/parse-exam.mjs          │
│  scripts/fetch-cafeteria.mjs       ──► scripts/parse-cafeteria.mjs     │
│                             │                                          │
│                             ▼                                          │
│  scripts/build-data.mjs (Master Runner with Pre-read Fallback)         │
│  Output: dist-data/{timetable-lessons, calendar, exam, cafeteria}.json │
│  GitHub Actions: .github/workflows/data-update.yml                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND APPLICATION                            │
│                                                                        │
│  app.js (DataLoader with Embedded Fallback & State Hydration)          │
│  Cookie: campus-student-v1 (grade, dept, course, class, arts)          │
│  LocalStorage: campus-links-v1 (custom URLs, labels, order)            │
│                                                                        │
│  ┌─────────────────────── 6-Tab Navigation (R2) ────────────────────┐  │
│  │ #home       : Today's Dashboard (Timetable, Week, Menu, Links)   │  │
│  │ #timetable  : Interactive Grid, Banners, 専攻科, Dynamic Export  │  │
│  │ #exam       : Exam Schedule by Grade/Dept, Unreleased Fallback   │  │
│  │ #calendar   : Annual Events, Week Counters, iCal .ics Export     │  │
│  │ #cafeteria  : Daily/Weekly Menu, Allergens, PDF Preview/Link     │  │
│  │ #links      : Syllabus (Cookie dept_id), Official URLs, MyLinks  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Dual-Build Serving:                                                   │
│  - Root direct serving: index.html -> ./app.js -> ./dist-data/         │
│  - Vite build: dist/index.html -> bundled assets + dist/dist-data/     │
│  - Isolated Standalone: timetable-standalone.html (zero-dependency)    │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Data Auto-Fetch Scripts | Node.js crawlers for lesson, exam, calendar, cafeteria, syllabus | M1 | R1, survey |
| 2 | Master Runner & Fault Isolation | `build-data.mjs` running all scrapers with fallback to prior dist-data | M1 | R1, survey |
| 3 | GitHub Actions Daily Update | Daily cron (`0 21 * * *` [JST 06:00]) and `workflow_dispatch` pipeline | M1 | R1, survey |
| 4 | Dual-Build & Packaging Parity | Static root serving and `vite build` parity with `dist-data/` mirror | M1 | R1, survey |
| 5 | Advanced Course PDF Extraction | `scripts/convert-to-lessons.mjs` extracting 専1/専2 ME/AC from PDF | M1 | R3, survey |
| 6 | 6-Tab Responsive Navigation | Sidebar and mobile drawer for #home, #timetable, #exam, #calendar, #cafeteria, #links | M2 | R2, survey |
| 7 | Today's Overview Dashboard | Home dashboard with today's classes, week indicator, exam alert, lunch, quick links | M2 | R2, survey |
| 8 | Non-Goals Exclusion Integrity | Strict omission of class substitution, room booking, congestion, principal list, equipment | M2 | R8, survey |
| 9 | Advanced Course Timetable UI | Select grade 6 (専1) & 7 (専2) and ME/AC in timetable grid with badge formatting | M3 | R3, survey |
| 10 | Dynamic Term/Year Metadata | Headings, export headers, and labels dynamic with term and fiscal year metadata | M3 | R3, survey |
| 11 | Calendar-Linked Timetable Banners | Weekly count banner ("後期 第○週") and day substitution alerts on timetable | M3 | R3, survey |
| 12 | Standalone Timetable Preservation | Maintain `timetable-standalone.html` unchanged, passing 124 combinations test | M3 | R1, survey |
| 13 | Dedicated Exam Tab & Schedule Grid | #exam tab with 6-period exam timetable filtered by student grade and department | M4 | R4, survey |
| 14 | Exam Unreleased & Fallback UI | Notice banner "10日前の正午発表", 9:00 self-study rules, links to official PDF/site | M4 | R4, survey |
| 15 | Academic Calendar Timeline | #calendar tab showing 15-week class counts, holidays, substitutions, exam dates | M4 | R5, survey |
| 16 | Calendar Event iCal (.ics) Export | Downloadable RFC 5545 `.ics` file for academic calendar events and exams | M4 | R5, survey |
| 17 | Timetable iCal Extension | Enable `.ics` in export dropdown, maintain RFC 5545 format backwards compatibility | M4 | R5, survey |
| 18 | Cafeteria News Scraper & Menu View | #cafeteria tab parsing monthly menu PDF (lunch A/B, noodles, bowl, allergens) | M5 | R6, survey |
| 19 | Cafeteria Fallback Modes | Dorm menu link, PDF preview, download button, and direct news link on image PDF | M5 | R6, survey |
| 20 | Cookie-Based Syllabus Deep Link | Department ID resolution (11–16, 21–22) from `campus-student-v1` cookie | M5 | R7, survey |
| 21 | Official URL Directory | Curated launchpad: Teams, Classroom, WebClass, SharePoint, OPAC, Science, Trains | M5 | R7, survey |
| 22 | LocalStorage My Links Manager | Quick presets (Gmail, Drive, iCloud, etc.) + custom URL CRUD and reordering | M5 | R7, survey |
| 23 | E2E Test Suite (Tiers 1–4) | Requirement-driven opaque-box testing covering all inventoried features | E2E | AC, survey |
| 24 | Adversarial Hardening (Tier 5) | Fault injection (offline fetch, poisoned cookie/storage, unreleased fallback) | E2E | AC, survey |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Pipeline & Automation | Features 1, 2, 3, 4, 5: `scripts/*.mjs`, `.github/workflows/data-update.yml`, `dist-data/*.json`, Vite build parity | none | DONE |
| M2 | Core Navigation & Home Dashboard | Features 6, 7, 8: 6-tab routing (#home to #links), #home Today's Overview dashboard, non-goals check | M1 | DONE |
| M3 | Timetable Dynamic Enhancements | Features 9, 10, 11, 12: 専攻科 UI, dynamic term/year metadata, calendar banners, standalone preservation | M1, M2 | DONE |
| M4 | Dedicated Exam & Calendar Modules | Features 13, 14, 15, 16, 17: #exam tab with fallback, #calendar tab, calendar iCal, timetable iCal extension | M1, M2 | DONE |
| M5 | Cafeteria & Syllabus / My Links | Features 18, 19, 20, 21, 22: #cafeteria tab with fallback, syllabus URL mapping, official links, My Links CRUD | M1, M2 | DONE |
| E2E | E2E Testing Track | Test harness & runner, Tiers 1–4 requirement tests, Tier 5 adversarial hardening | none (parallel) | DONE (280/280 strict pass) |
| M_FINAL | Final Integration & E2E Pass | 100% pass of all E2E tests across Tiers 1–4, followed by Tier 5 coverage hardening | M1–M5, E2E | DONE (316/316 total pass) |

## Interface Contracts

### 1. Data Pipeline ↔ Frontend App (`dist-data/*.json`)
- `dist-data/timetable-lessons.json`: `{ meta: { title, term, fiscalYear, fetchedAt, updatedAt, totalLessons }, lessons: Lesson[] }`
- `dist-data/calendar.json`: `{ meta: { ... }, terms: { zenki: {...}, kouki: {...} }, daySubstitutions: [...], events: [...] }`
- `dist-data/exam.json`: `{ meta: { title, term, status: "published"|"scheduled"|"fallback", noticeText, sourcePdfUrl, notesPdfUrl, updatedAt }, periods: [...], days: [...] }`
- `dist-data/cafeteria.json`: `{ meta: { title, articleDate, articleUrl, sourcePdfUrl, dormitoryArticleUrl, isTextExtracted, month, fiscalYear, updatedAt }, weeklyMenus: [...] }`
- Error handling: Frontend attempts `fetch('./dist-data/...')`. If network fails or file missing (e.g. offline or `file://`), falls back to bundled in-memory datasets (`timetable-data.js` and embedded fallbacks) without throwing uncaught errors.

### 2. Cookie Persistence (`campus-student-v1`)
- Format: JSON-encoded cookie `campus-student-v1`.
- Properties: `{ grade: 1..7, department: 'M'|'E'|'C'|'A'|'ME'|'AC', classGroup: '1'|'2'|'3'|'4', studentType: 'regular'|'international', course: 'ED'|'EJ', arts: 'music'|'art' }`
- Shared by: #home (today's schedule), #timetable (active selection), #exam (grade/dept filter), #links (syllabus URL resolution).

### 3. LocalStorage Persistence (`campus-links-v1`)
- Format: JSON-encoded array in `localStorage.getItem('campus-links-v1')`.
- Properties per item: `{ id: string, name: string, url: string, custom?: boolean }`.
- Error handling: If `localStorage` is inaccessible, corrupted, or disabled, falls back to default preset list in-memory without breaking.

### 4. Syllabus Resolver Contract
- Function: `getSyllabusUrl(selection: { grade: number, department: string, course?: string }): string`
- Department ID lookup:
  - grade 6 or 7: `ME` -> 21, `AC` -> 22
  - grade 4 or 5: `E` -> (`course === 'EJ'` ? 14 : 13), `M` -> 11, `C` -> 15, `A` -> 16
  - grade 1 to 3: `E` -> 12, `M` -> 11, `C` -> 15, `A` -> 16
- Target URL: `https://syllabus.kosen-k.go.jp/Pages/PublicSubjects?school_id=27&department_id=${deptId}&year=2026&lang=ja`
- Fallback: `https://syllabus.kosen-k.go.jp/Pages/PublicDepartments?school_id=27&lang=ja`

### 5. Timetable Export iCal Contract
- Function: `generateIcs(lessons: Lesson[], studentLabel: string, options?: { semesterInfo?: any, calendarEvents?: any }): string`
- Default call (no options): Must output RFC 5545 format with `RRULE:FREQ=WEEKLY`, `TRANSP:OPAQUE`, base date `20261005`, exactly preserving `tests/export-formats.test.cjs`.
- Extended call: When `options` provided, sets `UNTIL` in `RRULE` and incorporates calendar semester dates and holiday exclusions.

## Code Layout

- `index.html`: Main SPA entry point (6 tabs, wine theme, mobile drawer)
- `portal.html`: Parity entry point
- `app.js`: Main SPA controller, view rendering (6 views), state management
- `styles.css`: Complete styling for portal, tabs, widgets, dark mode, print
- `timetable-data.js`: Timetable data structures, definitions, fallback lessons
- `timetable-export.js`: Multi-format exporters (PDF, PNG, CSV, JSON, TXT, ICS)
- `timetable-standalone.html`: Single-file standalone timetable (preserved intact)
- `dist-data/`: Generated JSON datasets from scrapers
- `scripts/`: Data acquisition, parsing, build, and verification scripts
- `tests/`: Automated unit and integration tests (`timetable`, `export`, `export-formats`, `advanced-course`, `portal`, `e2e`)
- `.github/workflows/data-update.yml`: Scheduled GitHub Actions workflow
