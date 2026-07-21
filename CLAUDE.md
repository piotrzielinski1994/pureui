# pureui

Briefing for Claude Code. Read [README.md](README.md) first - setup, commands, repo layout. This file lists conventions and non-obvious bits not visible from individual files.

## What this is

A shared React component library consumed by the `pure*` apps (`purerequest`,
`purequery`, future ones) to keep one consistent design. It builds to `dist/` (ESM +
`.d.ts`), ships design tokens, and is previewed in Storybook. It is NOT an app - no
routes, no Tauri, no runtime.

## Communication

- Keep replies short. No filler, no pleasantries, no recap of the user's message.
- Status updates fit in one or two sentences.

## Components (the core rule)

- **Every component is composed - Radix-style.** Compound parts + context, `asChild`/`Slot` for polymorphism, `cva` variants, `className` merged last via `cn`. This is mandatory and detailed in [docs/composed-components.md](docs/composed-components.md). Read it before building any component.
- **Reach for a shadcn/Radix primitive first** (`npx shadcn add <name>`, config in [components.json](components.json)); strip its `rounded-*`.

## UI / design

- Read [docs/design.md](docs/design.md) before any UI change - the shared visual contract (mirrored in the sibling app repos). Key rule: **no rounded corners anywhere** (`--radius` and every `--radius-*` pinned to `0rem` in [src/styles/theme.css](src/styles/theme.css)); never raise them or add `rounded-*`.
- Tokens live in [src/styles/theme.css](src/styles/theme.css) and are the consistency anchor - always theme via the CSS tokens (`bg-background`, `text-foreground`, `border-border`, ...), never hard-coded hex, so light/dark and per-app custom themes both work.

## Build / packaging

- Library build is Vite library mode + `vite-plugin-dts` ([vite.config.ts](vite.config.ts)). `react`/`react-dom`/`react/jsx-runtime` are `external` - never bundle React.
- `dts` `include`/`exclude` keeps `*.stories.*` and `*.test.*` out of the type bundle.
- `theme.css` is copied to `dist/styles/` by the `copyThemeCss` closeBundle plugin (Vite lib mode won't emit it otherwise - see [docs/learnings.md](docs/learnings.md)).
- Publish/registry is deferred (ADR-001). Don't wire a registry without a decision on the scope question.

## Features

- Each feature lives in `docs/features/<timestamp>-<slug>/` with `spec.md` (what/why) + `plan.md` (how). `<timestamp>` = `YYYYMMDDHHMMSS`.
- Branch name matches the feature folder name exactly.

## Architectural Decisions

- Log significant, costly-to-reverse, or contested decisions to [docs/adr.md](docs/adr.md). Not routine config.

## Learning from conversation

- Append project-specific gotchas / conventions to [docs/learnings.md](docs/learnings.md). **Every root-caused bug is a learning** - record symptom, root cause, fix, wrong turns, in the same turn as the fix, without being asked.

## Before committing

- Check whether the change drifts [README.md](README.md) or this file (new script, renamed module, new convention, removed reference) and update in the same change. Each fact lives in exactly one place: README = human onboarding (setup, commands, layout); CLAUDE.md = agent working rules (conventions, gotchas, invariants).

## TDD

Red-green-refactor. Frontend tests -> `npm test` (Vitest). Don't skip red - a test never seen failing is one you can't trust. Get to green before refactoring.
