# Learnings

Project-specific gotchas and conventions worth not re-deriving. Newest first.

- **`typescript@7` (latest) breaks `typescript-eslint@8`** (peer `<6.1.0`). Pin TS to `~5.9`. See ADR-003.
- **Vite `build.lib` does not emit imported CSS as a standalone file for a JS-only entry.** `theme.css` is copied into `dist/styles/` by a small `closeBundle` plugin (`copyThemeCss` in `vite.config.ts`) so consumers can `import "@pziel/pureui/styles/theme.css"`.
- **`tsconfig` project `references` + `tsc --noEmit`** errors (TS6306/TS6310: referenced project must be `composite` and may not disable emit). Bootstrap keeps `tsconfig.node.json` standalone (editor-only) rather than a referenced project.
- **Shared Vite/Vitest config presets cannot ship as raw `.ts`.** A consuming app's `vite.config.ts` that imports a `.ts` file from `node_modules` dies with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (Node won't strip types under `node_modules`). Ship them as compiled JS + `.d.ts` (built to `dist/config/` via a multi-entry lib build) and expose factory functions. Biome/tsconfig presets are fine as raw JSON - both npm-package `extends` (`@pziel/pureui/biome`) and relative-path `extends` resolve and fire inherited rules (verified `noExplicitAny`).
