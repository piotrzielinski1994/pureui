# pureui

Shared React component library for the `pure*` desktop apps (`purerequest`,
`purequery`, and future ones). One source of truth for components and design tokens so
every app looks and behaves consistently.

Built with React 19 + TypeScript, Vite (library mode), Tailwind CSS v4, and
Radix-based composed components. Previewed with Storybook.

## Prerequisites

- **Node.js** - version pinned in [.nvmrc](.nvmrc). Run `nvm use` before any npm command.
- **npm** (this repo is outside `~/projects/as24/`).

## Setup

```bash
nvm use
npm install
```

## Commands

| Command | Description |
| --- | --- |
| `npm run build` | Typecheck + build the library to `dist/` (ESM `index.js` + `index.d.ts` + `styles/theme.css`). |
| `npm run dev` | Rebuild the library on change (`vite build --watch`). |
| `npm run storybook` | Component workshop at http://localhost:6006. |
| `npm run build-storybook` | Static Storybook build (`storybook-static/`). |
| `npm run lint` | Biome check (lint + format + import sort). |
| `npm run lint:fix` | Biome check with safe autofixes applied. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run format` | Biome format write. |
| `npm test` | Behavior tests (Vitest, run once). |
| `npm run test:watch` | Vitest in watch mode. |

## Layout

```
src/
  index.ts              public barrel (Button, buttonVariants, cn, types)
  components/<name>/     one folder per component: <name>.tsx, <name>.stories.tsx, __tests__/
  lib/utils.ts          cn() class-merge helper
  styles/theme.css      shared design tokens (oklch, no-radius)
  test/setup.ts         Vitest + Testing Library setup
docs/
  design.md             shared visual contract
  composed-components.md the component composition rule (read before building)
  adr.md, learnings.md
.storybook/             Storybook (react-vite) config
```

## Consuming from an app

> Publishing to a registry is deferred (see [docs/adr.md](docs/adr.md), ADR-001). Until
> then, link locally.

1. Add the dependency (local link while publish is deferred):

   ```jsonc
   // app package.json
   "dependencies": {
     "@pziel/pureui": "file:../pureui"
   }
   ```

2. Import the design tokens once (e.g. in the app entry CSS/TS):

   ```ts
   import "@pziel/pureui/styles/theme.css";
   ```

   The consuming app must run Tailwind CSS v4 - the library ships utility class names +
   token CSS, not precompiled utilities.

3. Use components:

   ```tsx
   import { Button } from "@pziel/pureui";

   <Button variant="outline">Click</Button>;
   <Button asChild><a href="/x">Go</a></Button>;
   ```

`react` and `react-dom` are peer dependencies - the app provides them; React is never
bundled into the library.

## Consuming the shared tooling config

`pureui` also ships the base tooling config the `pure*` apps share, so each app extends
one source instead of copying `biome.json`/`tsconfig*`/`vite`/`vitest` per repo. The JSON
presets use native `extends`; the Vite/Vitest presets are factory functions (raw `.ts`
config under `node_modules` can't be type-stripped, so they ship compiled).

```jsonc
// app biome.json
{ "extends": ["@pziel/pureui/biome"] }

// app tsconfig.json
{ "extends": "@pziel/pureui/tsconfig", "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }

// app tsconfig.node.json
{ "extends": "@pziel/pureui/tsconfig-node" }
```

```ts
// app vite.config.ts
import { createTauriViteConfig } from "@pziel/pureui/vite";

export default createTauriViteConfig({
  appUrl: import.meta.url,
  devPort: 1430,
  hmrPort: 1421,
});
```

```ts
// app vitest.config.ts
import { createVitestConfig } from "@pziel/pureui/vitest";

export default createVitestConfig({ appUrl: import.meta.url });
// overridable: setupFiles, include, inlineDeps
```

`vite`, `vitest`, `@vitejs/plugin-react`, `@tailwindcss/vite` are **optional** peer
dependencies - only apps that import `./vite`/`./vitest` need them installed. `components.json`
is not shareable (shadcn has no `extends`); keep it copied per app.

## Building components

Read [docs/composed-components.md](docs/composed-components.md) and
[docs/design.md](docs/design.md) first. Every component is composed (Radix-style:
compound parts + `asChild`/`Slot`), variants via `cva`, `className` merged via `cn`, no
rounded corners.
