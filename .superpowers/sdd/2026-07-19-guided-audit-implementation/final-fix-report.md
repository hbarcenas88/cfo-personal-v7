# Guided Audit — final fix report

Date: 2026-07-26

Branch/worktree: `codex/guided-audit` / `.worktrees/codex-guided-audit`

Scope: one final correction wave; no publication, merge, user-data import or financial adjustment.

## Outcome

All final-review Critical and Important findings were addressed in code and deterministic tests. Six syntax checks, eight tests and the final diff checks pass. The browser evidence is deliberately reported as partial: the 390 × 844 run reached Importar, but did not complete the native file chooser or the remaining stages.

## Critical behavior corrections

### Exact candidates stay unresolved

- `reviewIsBalanced` now treats every unresolved `exact` suggestion as pending.
- The review screen renders a dedicated `Coincidencia exacta` tray.
- Each exact pair renders `Confirmar`, `No corresponde` and `Dejar pendiente`.
- No exact candidate is automatically inserted into `confirmed`.

TDD evidence:

- RED: `guided-audit.test.mjs` expected `needsReview` for a zero-delta exact pair and observed `balanced`.
- RED: `mobile-ui-contract.test.mjs` expected `Coincidencia exacta` and the screen source/render omitted it.
- GREEN: both tests pass after the minimal service/render changes.

### Decisions operate on edges and confirmed nodes

- Confirmed decisions reserve their statement and transaction nodes before candidate matching.
- Dismissed decisions supply only forbidden statement/transaction edges; neither row is removed.
- A dismissed single edge with no alternative becomes one `onlyInBank` plus one `onlyInApp`.
- Dismissing one edge from a two-candidate ambiguity reclassifies the remaining valid edge as exact and leaves the dismissed transaction reviewable.
- Confirming one pair in a two-row/two-transaction ambiguity reserves that pair and reclassifies the independent remainder.
- Multiple distinct dismissals for the same statement row are allowed; duplicate edge decisions and decisions against confirmed nodes are rejected.

The tests use real `buildGuidedAuditReview` and `applyAuditCloseDecision` behavior, not mocks.

## Direct state API coverage and invariants

New `tests/guided-audit-state.test.mjs` imports and exercises the real state module with a deterministic in-memory IndexedDB boundary:

1. creates and persists a closure;
2. rejects the same account/range/order-independent fingerprint as duplicate;
3. reloads the persisted closure through `initState`;
4. saves and reloads a confirmed decision;
5. deletes and reloads the absence of the closure;
6. compares accounts, transactions, budgets, provisions and rules before/after every guided-audit mutation.

No guided-audit state operation mutates financial values. The test uses only fictitious data.

Additional minor coverage:

- an explicit parsed blank row is accepted and omitted;
- the unused fifth `pickerButton` argument was removed;
- the roadmap now reports implementation in final validation instead of future work;
- the Task 6 ledger has one canonical final status.

## SheetJS security override and PWA

Vendored artifact:

- Version: SheetJS Community Edition `0.20.3`
- Browser build: `assets/vendor/xlsx.full.min.js`
- Official source: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`
- Build SHA-256: `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`
- Build MD5: `6b3130af1ceadf07caa0ec08af7addff`
- License source: `https://cdn.sheetjs.com/xlsx-0.20.3/package/LICENSE`
- License SHA-256: `4d2a38ac35cda06a555c84074a819d413339cd3691b822cae50f8f322fe01f64`

The official standalone-script documentation identifies the SheetJS CDN as authoritative. The observed MD5 matches the checksum published by SheetJS for its 0.20.3 browser build. `assets/vendor/PROVENANCE-sheetjs.md` records the version, URLs and hashes; `assets/vendor/LICENSE-sheetjs.txt` is the matching official license.

`mobile-ui-contract.test.mjs` evaluates the vendored browser bundle, asserts `XLSX.version === '0.20.3'`, writes a synthetic XLSX workbook, reads it back and checks the rows. Runtime HTML still references only `./assets/vendor/xlsx.full.min.js`; there is no runtime CDN. The precached asset replacement bumped the worker from `cfo-personal-v7-cache-38` to `cfo-personal-v7-cache-39`.

TDD evidence:

- RED: the new executable bundle contract observed version `0.18.5`, expected `0.20.3`.
- GREEN: the version and synthetic XLSX round-trip pass with the official vendored build.

## Synthetic mobile evidence — exact boundary

Environment:

- URL: `http://127.0.0.1:8797/`
- Browser path: connected Browser plugin using Chrome
- Viewport override: 390 × 844
- Origin: dedicated isolated port to avoid any pre-existing/user browser data
- Fixtures: `tests/fixtures/guided-audit-seed.html` and `guided-audit-synthetic.csv`

Observed in browser:

1. Fixture page identity and status rendered with no console errors or warnings.
2. The isolated app loaded as `CFO Personal V7` with six fictitious movements totaling `-$200.00`.
3. Auditoría rendered the six synthetic movements and `Nuevo cierre`.
4. `Nuevo cierre` opened the five-stage sheet with no native `<select>`.
5. Account `Cuenta sintética` was selected.
6. Range `2026-07-01` to `2026-07-19`, cutoff `2026-07-19` and real balance `-150` were entered.
7. `Continuar a importar` reached the Importar stage.

Exact browser limitation:

- The automation began `waitForEvent('filechooser')`, clicked the unique `data-audit-close-file` input and attempted to assign the synthetic CSV.
- The file-chooser operation did not return and the run was interrupted after 281.4 seconds.
- Therefore Mapear → Revisar → Confirmar/No corresponde/Dejar pendiente → Resultado → reopen → delete was **not** observed browser end-to-end.
- No overflow, safe-area or bottom-navigation claim is made for those unobserved stages, and the visual checkbox in `VERIFIER.md` remains unchecked.

Deterministic evidence retained for the unobserved stages:

- render-level proof covers exclusive amount schemas, exact tray, candidate sides, all three actions, reopen/delete controls and absence of native select;
- service-level proof covers exact/date-warning/distant/ambiguous/app-only/bank-only classification and partial decision reclassification;
- state-level proof covers create/duplicate/persist/decision/reload/delete with no financial mutation;
- the real vendored SheetJS build completes a synthetic XLSX write/read round-trip.

## Final verification

Fresh command set:

```powershell
node --check src/main.js
node --check src/state.js
node --check src/services/guidedAuditService.js
node --check src/services/statementFileService.js
node --check src/screens/auditClose.js
node --check service-worker.js
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/guided-audit.test.mjs
node tests/guided-audit-state.test.mjs
node tests/mobile-ui-contract.test.mjs
git diff --check
git diff --name-only --diff-filter=U
```

Result: all six syntax checks and all eight tests exited 0; `git diff --check` was clean and there were no unmerged paths. PowerShell displayed only the repository's known OneDrive LF→CRLF working-copy warnings.

## Remaining external evidence

- Full 390 × 844 browser E2E from file chooser through deletion remains unobserved for the exact limitation above.
- Real-account validation remains intentionally unexecuted until a JSON backup is confirmed and explicit authorization is given.
- Installed-PWA/offline/upgrade behavior was not claimed.
- No merge, publication or `main` change was performed.
