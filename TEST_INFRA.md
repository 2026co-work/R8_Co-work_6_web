# E2E Test Infra: 明石高専キャンパスポータル (Akashi Kosen Campus Portal)

## Test Philosophy
- **Opaque-box, requirement-driven**: Derived directly from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`. Tests treat the application as a black box, interacting through public entry points (CLI commands, HTTP/DOM emulation, cookie/storage state, exported functions, and static build outputs).
- **Methodology**: Systematic combination of Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Realistic Application Workloads.
- **Progressive testability**: Tests verify observable end-user behavior. When a feature under test belongs to a milestone currently in progress, tests detect feature availability and gracefully skip (`t.skip`) with informative milestone references unless `STRICT_E2E=1` is specified. Once an implementation milestone lands, the corresponding tests automatically engage and enforce strict assertions.

## Feature Inventory & Test Coverage Matrix

| # | Feature | Source (Requirement) | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 (Pairwise) | Tier 4 (Workflows) |
|---|---------|----------------------|:------------:|:------------:|:-----------------:|:------------------:|
| 1 | Data Auto-Fetch Scripts | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 2 | Master Runner & Fault Isolation | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 3 | GitHub Actions Daily Update | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 4 | Dual-Build & Packaging Parity | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 5 | Advanced Course PDF Extraction | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 6 | 6-Tab Responsive Navigation | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 7 | Today's Overview Dashboard | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 8 | Non-Goals Exclusion Integrity | ORIGINAL_REQUEST § R8 | 5 | 5 | ✓ | ✓ |
| 9 | Advanced Course Timetable UI | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 10 | Dynamic Term/Year Metadata | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 11 | Calendar-Linked Timetable Banners | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 12 | Standalone Timetable Preservation | ORIGINAL_REQUEST § R1, AC | 5 | 5 | ✓ | ✓ |
| 13 | Dedicated Exam Tab & Schedule Grid | ORIGINAL_REQUEST § R4 | 5 | 5 | ✓ | ✓ |
| 14 | Exam Unreleased & Fallback UI | ORIGINAL_REQUEST § R4 | 5 | 5 | ✓ | ✓ |
| 15 | Academic Calendar Timeline | ORIGINAL_REQUEST § R5 | 5 | 5 | ✓ | ✓ |
| 16 | Calendar Event iCal (.ics) Export | ORIGINAL_REQUEST § R5 | 5 | 5 | ✓ | ✓ |
| 17 | Timetable iCal Extension | ORIGINAL_REQUEST § R5 | 5 | 5 | ✓ | ✓ |
| 18 | Cafeteria News Scraper & Menu View | ORIGINAL_REQUEST § R6 | 5 | 5 | ✓ | ✓ |
| 19 | Cafeteria Fallback Modes | ORIGINAL_REQUEST § R6 | 5 | 5 | ✓ | ✓ |
| 20 | Cookie-Based Syllabus Deep Link | ORIGINAL_REQUEST § R7 | 5 | 5 | ✓ | ✓ |
| 21 | Official URL Directory | ORIGINAL_REQUEST § R7 | 5 | 5 | ✓ | ✓ |
| 22 | LocalStorage My Links Manager | ORIGINAL_REQUEST § R7 | 5 | 5 | ✓ | ✓ |
| 23 | E2E Test Suite (Tiers 1–4) | PROJECT.md Feature 23 | 5 | 5 | ✓ | ✓ |
| 24 | Adversarial Hardening (Tier 5) | PROJECT.md Feature 24 | 5 | 5 | ✓ | ✓ |

## Test Architecture

### Test Runner & Invocation
- **Framework**: Native Node.js test runner (`node:test`, `node:assert/strict`). Zero external test framework dependencies.
- **Commands**:
  - Full test suite: `npm test` or `node --test tests/*.test.cjs`
  - E2E test suites only: `node --test tests/e2e-*.test.cjs`
  - Strict mode (all features must be implemented and passing): `cross-env STRICT_E2E=1 node --test tests/e2e-*.test.cjs`
- **Pass/Fail Semantics**:
  - Exit code 0 on all tests passing / gracefully skipped.
  - Non-zero exit code on any assertion failure or unhandled exception.

### Test Directory Layout
```
tests/
├── timetable.test.cjs               # Existing standalone timetable tests
├── export-formats.test.cjs          # Existing export format contracts
├── export.test.cjs                  # Existing A4 / export layout tests
├── advanced-course.test.cjs         # Existing専攻科 extraction tests
├── portal.test.cjs                  # Existing portal integration tests
├── e2e-harness.cjs                  # Shared DOM/VM simulation & helper utilities
├── e2e-tier1-features.test.cjs      # Tier 1: 120+ Feature coverage tests (>=5 per feature)
├── e2e-tier2-boundaries.test.cjs    # Tier 2: 120+ Boundary, corner case, error tests (>=5 per feature)
├── e2e-tier3-combinations.test.cjs  # Tier 3: 25+ Pairwise cross-feature interaction tests
└── e2e-tier4-scenarios.test.cjs     # Tier 4: 12+ Real-world multi-step user scenarios
```

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | **Fresh Pipeline Build & Serving** | F1, F2, F3, F4: Run data build, verify JSON outputs, verify both root and Vite build index referencing dist-data | High |
| 2 | **Advanced Course Student Lifecycle** | F5, F9, F10, F16, F20: 専攻科1年 ME student selects grade 6, views timetable, exports iCal, resolves syllabus link | High |
| 3 | **First-Year Morning Dashboard Check** | F6, F7, F8, F18, F20, F21, F22: 1年 M student opens #home, checks today's 1-4 period classes, lunch menu, custom MyLinks | High |
| 4 | **Exam Season & Calendar Workflow** | F6, F11, F13, F14, F15, F16: Student checks calendar for exam dates, visits #exam tab, views schedule or fallback, exports .ics | High |
| 5 | **Dual-Mode Standalone vs Portal Parity** | F4, F12, F17: Compare timetable data and export between timetable-standalone.html and app.js portal | Medium |
| 6 | **International Student 3rd Year Transition** | F6, F7, F9, F20: 3年 M international student gets Japanese language classes, checks syllabus and links | Medium |
| 7 | **Electrical Engineering Course Split (ED vs EJ)** | F6, F7, F9, F10, F20: 4年 E student toggles ED vs EJ, verifies distinct course curricula and department syllabus URLs | Medium |
| 8 | **Network Failure & Offline Fallback Journey** | F2, F7, F14, F19: Browser fails to fetch dist-data JSON, application hydrates with built-in fallback data seamlessly | High |
| 9 | **Custom Bookmarks Persistence Lifecycle** | F21, F22: Add custom bookmarks, edit names, reorder, persist in localStorage, delete item, reload | Medium |
| 10 | **Arts Selection & Day Substitution Impact** | F7, F9, F11, F15: 1年 student selects Art vs Music, checks Tuesday substitution day timetable banner | Medium |
| 11 | **Cafeteria Menu Parsing & Dorm Fallback** | F18, F19, F7: View daily menu from extracted text, click fallback link when only PDF image is available | Medium |
| 12 | **End-to-End Export & Multi-Format Generation** | F10, F16, F17: Export timetable and calendar to CSV, JSON, TXT, and RFC 5545 .ics with correct headers | High |

## Coverage Thresholds
- **Tier 1**: ≥ 5 test cases per feature (24 features × 5 = 120 test cases minimum)
- **Tier 2**: ≥ 5 boundary/corner cases per feature (where boundaries exist, 120 test cases minimum)
- **Tier 3**: Pairwise coverage of major cross-feature interactions (≥ 24 test cases minimum)
- **Tier 4**: Realistic multi-step application scenarios (≥ 12 application scenarios)
- **Total Minimum Test Cases**: ≥ 276 test cases
