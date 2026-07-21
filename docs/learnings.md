# Learnings

Project-specific gotchas and conventions worth not re-deriving. Newest first.

- **`typescript@7` (latest) breaks `typescript-eslint@8`** (peer `<6.1.0`). Pin TS to `~5.9`. See ADR-003.
- **Vite `build.lib` does not emit imported CSS as a standalone file for a JS-only entry.** `theme.css` is copied into `dist/styles/` by a small `closeBundle` plugin (`copyThemeCss` in `vite.config.ts`) so consumers can `import "@pzielinski/pureui/styles/theme.css"`.
- **`tsconfig` project `references` + `tsc --noEmit`** errors (TS6306/TS6310: referenced project must be `composite` and may not disable emit). Bootstrap keeps `tsconfig.node.json` standalone (editor-only) rather than a referenced project.
