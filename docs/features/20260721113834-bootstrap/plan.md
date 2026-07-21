# Plan: Bootstrap - pureui Shared Component Library

**Spec:** docs/features/20260721113834-bootstrap/spec.md
**Created:** 2026-07-21
**Status:** Draft

## 1. Overview

Scaffold `pureui` as a Vite-library-mode React component library with a Storybook 10
workshop, shared Tailwind v4 oklch tokens, and the radix-ui composed-component
convention documented. Prove the full pipeline (build -> dts -> exports -> story ->
test) with a single seed component (`Button`) + `cn` util. No mass component
extraction yet.

## 2. File Structure

```
pureui/
  .nvmrc                         # node 24
  .gitignore                     # + dist/, storybook-static/
  .prettierrc.json               # mirror siblings
  package.json                   # lib metadata, exports, peerDeps, scripts
  tsconfig.json                  # app/src config + @/* alias
  tsconfig.node.json             # vite/config tsconfig
  vite.config.ts                 # lib mode + dts + tailwind + vitest
  eslint.config.js               # flat config (mirror siblings)
  README.md                      # what pureui is, install, scripts, layout
  CLAUDE.md                      # agent conventions (features, design, TDD, composed-components)
  components.json                # shadcn config (new-york, tokens) for future `shadcn add`
  index.html                     # (none needed - Storybook owns preview)
  .storybook/
    main.ts                      # react-vite framework, stories glob, a11y addon
    preview.ts                   # import theme.css, backgrounds/dark, controls
  src/
    index.ts                     # PUBLIC BARREL: re-export Button, buttonVariants, cn
    lib/
      utils.ts                   # cn()
      __tests__/utils.test.ts    # cn behavior test
    components/
      button/
        button.tsx               # composed Button (Slot + cva)
        button.stories.tsx       # Storybook workshop
        __tests__/button.test.tsx# behavior tests (render, variant, asChild, merge)
    styles/
      theme.css                  # oklch tokens + --radius:0 (shared contract, CSS)
    test/
      setup.ts                   # jest-dom + matchMedia stub
  docs/
    design.md                    # shared visual contract (copy from siblings)
    composed-components.md       # radix-ui composition rule (THE requested note)
    adr.md                       # ADR-001 publish deferral, ADR-002 lib-mode choice
    learnings.md                 # seed
    features/20260721113834-bootstrap/{spec,plan}.md
```

## 3. Task Breakdown

### Task 1: Project scaffold + tooling config
**Files:** Create `package.json`, `.nvmrc`, `.gitignore`, `.prettierrc.json`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `components.json`, `src/lib/utils.ts`.
**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` (from `@/lib/utils`); npm scripts `build`, `dev`, `lint`, `typecheck`, `format`, `test`, `test:watch`, `storybook`, `build-storybook`.
- [ ] Write failing test: `src/lib/__tests__/utils.test.ts` (cn merges + dedups conflicting classes)
- [ ] Run, confirm FAIL (module missing)
- [ ] Add deps, configs, `cn`
- [ ] Run, confirm PASS
- [ ] Commit (`feat(bootstrap): AC-001 project scaffold + cn util`)

### Task 2: Tailwind v4 tokens + Vite library build with dts
**Files:** Create `src/styles/theme.css`, `vite.config.ts`, `src/index.ts` (barrel, initially exports `cn`). Modify `package.json` (`exports`, `main`, `module`, `types`, `files`, `peerDependencies`).
**Interfaces:**
- Consumes: `cn` from Task 1.
- Produces: `dist/index.js` (ESM) + `dist/index.d.ts`; export map `.` and `./styles/theme.css`.
- [ ] Write failing test: build assertion in `src/lib/__tests__/utils.test.ts` is not build-level; instead verify via a node check script step in verify phase. (Build correctness proven by TC-001 manual run + verifier.)
- [ ] Configure Vite lib mode (`build.lib`, `formats: ["es"]`, external react/react-dom/jsx-runtime) + `vite-plugin-dts` (exclude stories/tests)
- [ ] Run `npm run build`, confirm `dist/index.{js,d.ts}` exist and typecheck
- [ ] Commit (`feat(bootstrap): AC-002/006 vite lib build + dts + theme tokens`)

### Task 3: Composed Button component + tests
**Files:** Create `src/components/button/button.tsx`, `src/components/button/__tests__/button.test.tsx`, `src/test/setup.ts`. Modify `src/index.ts` (add `Button`, `buttonVariants`).
**Interfaces:**
- Consumes: `cn` (Task 1); `@radix-ui/react-slot` `Slot`; `cva` from `class-variance-authority`.
- Produces: `Button` (`React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }`), `buttonVariants`.
- [ ] Write failing tests (TC-002 variant classes, TC-003 asChild->anchor, TC-004 className merge)
- [ ] Run, confirm FAIL
- [ ] Implement Button (Slot when `asChild`, cva variants; strip `rounded-*` per design.md)
- [ ] Run, confirm PASS
- [ ] Commit (`feat(bootstrap): AC-005/009 composed Button + behavior tests`)

### Task 4: Storybook 10 workshop
**Files:** Create `.storybook/main.ts`, `.storybook/preview.ts`, `src/components/button/button.stories.tsx`. Modify `package.json` (storybook deps already in Task 1; wire scripts).
**Interfaces:**
- Consumes: `Button` (Task 3), `theme.css` (Task 2).
- Produces: running Storybook with Button story (variant/size/asChild).
- [ ] Add Storybook 10 (react-vite) + a11y addon; `main.ts` stories glob `src/**/*.stories.tsx`
- [ ] `preview.ts` imports `theme.css`, sets dark/light backgrounds + autodocs
- [ ] Write `button.stories.tsx` (Default + argTypes for variant/size + AsChildLink story)
- [ ] Run `npm run storybook` (smoke) and `npm run build-storybook` (must exit 0)
- [ ] Commit (`feat(bootstrap): AC-004/010 Storybook workshop + Button story`)

### Task 5: Docs (design contract, composed-components rule, ADR, README, CLAUDE.md)
**Files:** Create `docs/design.md`, `docs/composed-components.md`, `docs/adr.md`, `docs/learnings.md`, `README.md`, `CLAUDE.md`.
**Interfaces:**
- Consumes: nothing runtime.
- Produces: `docs/composed-components.md` = the mandatory "follow radix-ui composed components" note; `CLAUDE.md` references design.md + composed-components.md; ADR-001 (publish deferred), ADR-002 (Vite lib mode over tsup).
- [ ] Copy/adapt `design.md` from purequery (the shared contract already lives there)
- [ ] Write `composed-components.md` (radix-ui as the canonical example; compound + `asChild`/Slot pattern; every new component MUST follow it)
- [ ] Write README (install, scripts, layout, how apps consume) + CLAUDE.md (features flow, design read-first, TDD, composed-components rule)
- [ ] Commit (`docs(bootstrap): AC-007 design + composed-components + ADR + README/CLAUDE`)

## 4. Approach & Key Decisions

- **Vite library mode + vite-plugin-dts** (not tsup): one build tool shared with Storybook's react-vite; matches sibling Vite setup so extracted components need no re-tooling. (ADR-002)
- **Publish/registry deferred** (ADR-001): `@pzielinski/pureui` scope does not match the GitHub Packages owner scope (`@piotrzielinski1994`); resolving registry identity is its own decision. Bootstrap ships buildable `dist/` + correct `exports`/`peerDeps`; apps link via `file:`/git until publish wiring lands.
- **Composed components (radix-ui) is the law**: documented in `docs/composed-components.md`, enforced by seeding `Button` with `asChild`/`Slot`. Design pattern: **compound components + Slot-based composition** (Radix model) over prop-drilling.
- **Design tokens owned here**: `theme.css` is the consistency anchor the user asked for; `design.md` is the shared visual contract copied from the siblings (currently duplicated in purerequest/purequery).
- **`react`/`react-dom` as peerDependencies**: never bundle React into a library (dual-React bugs).

## 5. Edge Cases Handled

- Conflicting Tailwind classes -> `cn` last-wins (TC-004).
- `asChild` non-button child -> Slot merge, no nested button (TC-003).
- dts must exclude `*.stories.*` / `*.test.*` from the type bundle.
- React not double-bundled (peerDeps + Vite `external`).

## 6. Tests

- `utils.test.ts`: cn merge/dedup.
- `button.test.tsx`: default render, variant classes, `asChild`->anchor, className merge.
- Storybook build (`build-storybook`) as a compile-level smoke gate.

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Storybook 10 + Vite 7 peer mismatch | Pin Vite 7 (sibling parity); SB 10 supports Vite 7. Verify at install (AC-001). |
| vite-plugin-dts pulls test/story types into dist | Scope dts `include: ["src"]`, `exclude` stories/tests; verify `dist/index.d.ts` clean. |
| Tailwind v4 utilities not emitted for a library | Library ships classnames + token CSS, not precompiled utilities; consumer runs Tailwind v4. Document in README. |
| Publish scope/registry ambiguity | Deferred by ADR-001; not in this feature's ACs. |

## 8. Acceptance Verification

| AC | Test / Proof | Status |
|----|--------------|--------|
| AC-001 | manual `npm install` | Pending |
| AC-002 | `npm run build` + inspect dist (TC-001) | Pending |
| AC-003 | package `exports`/`peerDeps` + dts (TC-001) | Pending |
| AC-004 | `npm run storybook` (TC-005) | Pending |
| AC-005 | button.test asChild (TC-003) | Pending |
| AC-006 | theme.css present + exported | Pending |
| AC-007 | docs exist + CLAUDE.md references | Pending |
| AC-008 | `npm run lint` + `npm run typecheck` | Pending |
| AC-009 | `npm test` (TC-002/003/004) | Pending |
| AC-010 | `npm run build-storybook` | Pending |
