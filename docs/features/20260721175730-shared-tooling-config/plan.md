# Plan: Share tooling config from @pziel/pureui (R9a)

Full task breakdown lives in the task file:
`.pzielinski/20260721175730-shared-tooling-config/20260721175730-shared-tooling-config.md`.

## Tasks

1. **Base JSON presets + dogfood** - `config/{biome,tsconfig,tsconfig.node}.base.json`;
   repoint pureui's own `biome.json`/`tsconfig*.json` to `extends` them. (AC-002/003/008)
2. **Vite + Vitest factories** - `config/vite.base.ts` (`createTauriViteConfig`),
   `config/vitest.base.ts` (`createVitestConfig`). (AC-004/005)
3. **Build + package wiring** - multi-entry lib build + copy-JSON plugin -> `dist/config/`;
   `exports` subpaths, `files`, optional `peerDependencies`, version `0.2.0`. (AC-001/006/007)
4. **Docs + backlog** - README "Consuming the shared tooling config", ADR-005, learnings,
   todos R9 -> in-progress + R9b follow-up. (AC-009)

## Execution order

1 -> 2 -> 3 -> 4 (each TDD red-green, committed independently).

## Acceptance verification

- Unit (Vitest): TC-001..007 in `config/__tests__/`.
- Build gate: TC-008 (`dist/config/*` artifacts) + `npm pack --dry-run`.
- CLI gate: TC-009 (`biome check` on a fixture extending the base flags `noExplicitAny`).
- Dogfood gate: `npm run lint` + `npm run typecheck` + `npm test` + `npm run build` green.
