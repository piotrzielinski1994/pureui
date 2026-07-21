# Spec: Bootstrap - pureui Shared Component Library

**Version:** 0.1.0
**Created:** 2026-07-21
**Status:** Draft

## 1. Overview

Stand up `pureui`: a shared React component library that sibling desktop apps
(`purerequest`, `purequery`, and future `pure*` apps) consume to keep a **single,
consistent design**. This feature delivers **scaffold + pipeline only** - one seed
component (Button) proving the whole chain end-to-end. Real component extraction
from the apps lands in later features.

Stack (mirrors the sibling apps so extracted components drop in unchanged):
- **React 19 + TypeScript 5.8** - components + types
- **Vite 7 (library mode)** + **vite-plugin-dts** - build to ESM `dist/` with `.d.ts`
- **Tailwind CSS v4** (`@tailwindcss/vite`) - styling, shared oklch tokens
- **class-variance-authority + clsx + tailwind-merge** - variant/`cn` tooling
- **radix-ui primitives** (`@radix-ui/react-slot`, ...) - composed-component base
- **lucide-react** - icons
- **Storybook 10 (react-vite)** - component preview/workshop
- **Vitest + Testing Library** - behavior tests
- **npm** - package manager

Package identity: `@pzielinski/pureui`. Build output produced now; **registry/publish
wiring deferred** to a later feature (see ADR-001). Apps may link via `file:`/git meanwhile.

### User Story

As a developer maintaining several `pure*` apps, I want a shared `pureui` library with
a build, a Storybook workshop, shared design tokens, and the composed-component
convention wired up, so future features extract components into one consistent source
instead of duplicating primitives per app.

## 2. Acceptance Criteria

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-001 | `npm install` succeeds from a clean checkout with no peer-dependency errors | Must |
| AC-002 | `npm run build` produces `dist/index.js` (ESM) + `dist/index.d.ts`; the barrel `src/index.ts` re-exports `Button`, `buttonVariants`, `cn` | Must |
| AC-003 | The built package's `exports`/`types`/`peerDependencies` (react, react-dom) are set so a consuming app can `import { Button } from "@pzielinski/pureui"` and get types | Must |
| AC-004 | Storybook launches (`npm run storybook`) and renders a `Button` story with variant/size controls | Must |
| AC-005 | `Button` is a composed component: `asChild` via `@radix-ui/react-slot` merges props onto the child element (proves the radix-ui composition pattern) | Must |
| AC-006 | Shared design tokens ship as `src/styles/theme.css` (oklch tokens + `--radius: 0rem` no-rounded rule) and are exported/importable by consumers | Must |
| AC-007 | `docs/design.md` (shared visual contract) and `docs/composed-components.md` (radix-ui composition rule) exist and are referenced from `CLAUDE.md` | Must |
| AC-008 | Lint + typecheck pass: `npm run lint` and `npm run typecheck` exit 0 | Should |
| AC-009 | At least one Vitest behavior test for `Button` passes (`npm test`), asserting rendered/observable behavior incl. `asChild` | Should |
| AC-010 | Storybook production build succeeds (`npm run build-storybook`) without errors | Should |

## 3. User Test Cases

### TC-001 (happy path): Library builds and exposes the public API
**Precondition:** Clean checkout, `npm install` done.
**Steps:** Run `npm run build`. Inspect `dist/`.
**Expected:** `dist/index.js` and `dist/index.d.ts` exist; `index.d.ts` declares `Button`, `buttonVariants`, `cn`. Exit 0.
**Maps to:** AC-002, AC-003

### TC-002 (happy path): Button renders with variant classes
**Precondition:** Test env set up.
**Steps:** Render `<Button variant="destructive">Del</Button>`; read the DOM.
**Expected:** A `<button>` with text "Del" carrying the destructive variant classes. Renders default variant when none passed.
**Maps to:** AC-002, AC-009

### TC-003 (composition): asChild merges onto child element
**Precondition:** Test env set up.
**Steps:** Render `<Button asChild><a href="/x">go</a></Button>`.
**Expected:** Output element is an `<a href="/x">` (NOT a wrapping `<button>`) carrying the button classes - proves Slot composition.
**Maps to:** AC-005, AC-009

### TC-004 (edge): className merge does not duplicate/conflict
**Precondition:** Test env set up.
**Steps:** Render `<Button className="px-8">x</Button>`.
**Expected:** `tailwind-merge` collapses conflicting padding - only the caller's `px-8` survives (no `px-4 px-8` both present).
**Maps to:** AC-002, AC-009

### TC-005 (happy path): Storybook shows the Button workshop
**Precondition:** `npm install` done.
**Steps:** `npm run storybook`; open the Button story.
**Expected:** Button renders with args controls for `variant` and `size`; changing them updates the preview. No console errors.
**Maps to:** AC-004

## 4. Data Model

None. This is a UI library - no domain entities.

## 5. API Contract (public library surface)

Barrel `src/index.ts` re-exports:
- `Button` - `React.FC<ButtonProps>` (composed, `asChild` supported)
- `buttonVariants` - cva variant function
- `cn(...inputs: ClassValue[]): string` - class merge util

CSS entry (side-effect import):
- `@pzielinski/pureui/styles/theme.css` - oklch tokens + no-radius rule

## 6. UI Behavior (Storybook workshop)

### States (per component story)
- **Default:** primary Button rendered.
- **Variants:** default / destructive / outline / secondary / ghost / link selectable via controls.
- **Sizes:** default / sm / lg / icon selectable via controls.
- **asChild:** a story rendering the Button as an `<a>` link.

No app "loading/empty/error" states - a library workshop, not an app.

## 7. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Consumer passes conflicting Tailwind classes | `cn`/`tailwind-merge` resolves to the last-wins class (TC-004) |
| `asChild` with a non-button child | Slot forwards props/classes onto the child; no nested `<button>` (TC-003) |
| React provided by consumer app | `react`/`react-dom` are `peerDependencies` - not bundled into `dist/` (AC-003) |
| Tailwind not configured in consumer | Documented: consumer must import `theme.css` and have Tailwind v4; library ships utility classnames, not compiled CSS for arbitrary utilities |
| dts build picks up story/test files | `tsconfig`/dts `include` scoped to `src`, excludes `*.stories.*` and `*.test.*` from the type bundle |

## 8. Dependencies

- Node.js 24 (`.nvmrc`)
- npm (repo outside `~/projects/as24/`)
- npm registry reachable for install

## 9. Infrastructure Prerequisites

| Category | Requirement |
|----------|-------------|
| Environment variables | N/A |
| Registry images | N/A |
| Cloud quotas | N/A |
| Network reachability | npm registry reachable for install |
| CI status | N/A (CI in a later feature) |
| External secrets | N/A (publish/registry deferred - ADR-001) |
| Database migrations | N/A |

**Verification before implementation:** `node -v` (24), `nvm use`, npm registry reachable.

## 10. Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-07-21 | 0.1.0 | Piotr Zieliński | Initial bootstrap spec |
