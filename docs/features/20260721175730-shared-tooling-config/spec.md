# Spec: Share tooling config from @pziel/pureui (R9a)

**Version:** 0.2.0
**Created:** 2026-07-21
**Status:** Implemented

## 1. Overview

The 6 `pure*` repos are independent git repos (no monorepo). Their tooling config
(`biome.json`, `tsconfig*`, `vite.config.ts`, `vitest.config.ts`, `components.json`) is
hand-copied and has drifted. This feature (R9a) ships the shared **base presets** from the
existing `@pziel/pureui` package so apps extend one source. Migrating the apps to consume
them is R9b (separate, blocked on publish).

Mechanism: JSON presets via native `extends` (`@pziel/pureui/biome`, `/tsconfig`,
`/tsconfig-node`); Vite/Vitest presets as compiled-JS factory functions (`./vite`,
`./vitest`) - raw `.ts` under `node_modules` fails type-stripping.

Out of scope: `components.json` (shadcn has no `extends`); `puredevtools` (browser-ext
outlier); the app migrations (R9b).

## 2. Acceptance Criteria

See the task file `.pzielinski/20260721175730-shared-tooling-config/` for the full AC/TC
list (AC-001..AC-009, TC-001..TC-009) and the AC -> test traceability table.

Summary:
- AC-001/006/007: exports subpaths + `files` + optional peer deps; build emits the 7
  `dist/config/*` artifacts.
- AC-002/003: JSON presets carry the canonical biome + tsconfig core.
- AC-004/005: `createTauriViteConfig` / `createVitestConfig` factories.
- AC-008: pureui dogfoods its own presets; full gate green.
- AC-009: version bump, README, ADR-005.
