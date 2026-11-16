# E2E Test Suite Ready

## Test Runner
- Command: `npm test` or `node --test tests/*.test.cjs`
- E2E Suites only: `node --test tests/e2e-*.test.cjs`
- Strict verification mode (all features must pass with zero skips for M_FINAL):
  - PowerShell: `$env:STRICT_E2E='1'; node --test tests/e2e-*.test.cjs; $env:STRICT_E2E=''`
  - Bash/POSIX: `STRICT_E2E=1 node --test tests/e2e-*.test.cjs`
- Expected: All tests pass with exit code 0.

## Coverage Summary
| Tier | Count | Description |
|------|------:|-------------|
| 1. Feature Coverage | 120 | 5 test cases per feature across all 24 features in PROJECT.md (F1–F24) |
| 2. Boundary & Corner | 120 | 5 boundary, negative, error-recovery cases per feature across all 24 features (F1–F24) |
| 3. Cross-Feature | 28 | 28 pairwise combinatorial cross-feature interaction tests (T3-P-01 to T3-P-28) |
| 4. Real-World Application | 12 | 12 realistic multi-step user workflows defined in TEST_INFRA.md (S-01 to S-12) |
| **Total E2E Tests** | **280** | **Total repository tests in `npm test`: 316 tests** |

## Feature Checklist
| # | Feature | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|:------:|:------:|:------:|:------:|
| 1 | Data Auto-Fetch Scripts | 5 | 5 | ✓ | ✓ |
| 2 | Master Runner & Fault Isolation | 5 | 5 | ✓ | ✓ |
| 3 | GitHub Actions Daily Update | 5 | 5 | ✓ | ✓ |
| 4 | Dual-Build & Packaging Parity | 5 | 5 | ✓ | ✓ |
| 5 | Advanced Course PDF Extraction | 5 | 5 | ✓ | ✓ |
| 6 | 6-Tab Responsive Navigation | 5 | 5 | ✓ | ✓ |
| 7 | Today's Overview Dashboard | 5 | 5 | ✓ | ✓ |
| 8 | Non-Goals Exclusion Integrity | 5 | 5 | ✓ | ✓ |
| 9 | Advanced Course Timetable UI | 5 | 5 | ✓ | ✓ |
| 10 | Dynamic Term/Year Metadata | 5 | 5 | ✓ | ✓ |
| 11 | Calendar-Linked Timetable Banners | 5 | 5 | ✓ | ✓ |
| 12 | Standalone Timetable Preservation | 5 | 5 | ✓ | ✓ |
| 13 | Dedicated Exam Tab & Schedule Grid | 5 | 5 | ✓ | ✓ |
| 14 | Exam Unreleased & Fallback UI | 5 | 5 | ✓ | ✓ |
| 15 | Academic Calendar Timeline | 5 | 5 | ✓ | ✓ |
| 16 | Calendar Event iCal (.ics) Export | 5 | 5 | ✓ | ✓ |
| 17 | Timetable iCal Extension | 5 | 5 | ✓ | ✓ |
| 18 | Cafeteria News Scraper & Menu View | 5 | 5 | ✓ | ✓ |
| 19 | Cafeteria Fallback Modes | 5 | 5 | ✓ | ✓ |
| 20 | Cookie-Based Syllabus Deep Link | 5 | 5 | ✓ | ✓ |
| 21 | Official URL Directory | 5 | 5 | ✓ | ✓ |
| 22 | LocalStorage My Links Manager | 5 | 5 | ✓ | ✓ |
| 23 | E2E Test Suite (Tiers 1–4) | 5 | 5 | ✓ | ✓ |
| 24 | Adversarial Hardening (Tier 5) | 5 | 5 | ✓ | ✓ |

## Test Artifacts
- `tests/e2e-harness.cjs`: Shared headless DOM/VM harness with RFC 6265 cookie jar, localStorage, MockDate, mock fetch, and `requireOrSkip` progressive gating.
- `tests/e2e-tier1-features.test.cjs`: Tier 1 Feature Coverage test suite (120 tests).
- `tests/e2e-tier2-boundaries.test.cjs`: Tier 2 Boundary & Error Recovery test suite (120 tests).
- `tests/e2e-tier3-combinations.test.cjs`: Tier 3 Pairwise Combinatorial test suite (28 tests).
- `tests/e2e-tier4-scenarios.test.cjs`: Tier 4 Real-World Application Scenarios test suite (12 tests).
