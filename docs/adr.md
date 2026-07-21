# Architecture Decision Records

Append-only. Only significant, costly-to-reverse, or contested decisions.

## ADR-001: Defer publish/registry wiring

**Context:** Package is named `@pzielinski/pureui`, but the git remote owner is
`piotrzielinski1994`. GitHub Packages forces the npm scope to equal the repo owner
(`@piotrzielinski1994`), so the chosen scope cannot publish there as-is. Resolving the
publish identity (rename scope, use a different registry, or public npm) is its own
decision with trade-offs.

**Decision:** Bootstrap ships a buildable `dist/` with correct `exports`, `types`, and
`peerDependencies`, but does NOT wire a registry or publish step. Consuming apps link
via `file:`/git in the meantime.

**Why:** Unblocks component extraction now without prematurely locking the publish
identity. Registry wiring lands in its own feature once the scope question is settled.

## ADR-002: Vite library mode + vite-plugin-dts (not tsup)

**Context:** A React component library needs an ESM build + `.d.ts` emission. Options:
Vite library mode, tsup (esbuild), or raw `tsc`.

**Decision:** Use Vite library mode (`build.lib`) with `vite-plugin-dts`.

**Why:** Storybook's `@storybook/react-vite` already pulls Vite in, and the sibling apps
are all Vite - one build tool, one config surface, no second bundler. Extracted
components need no re-tooling. `react`/`react-dom`/`react/jsx-runtime` are marked
`external` so React is never bundled into the library.

## ADR-003: Pin TypeScript to 5.9 (not 7.x)

**Context:** `typescript@7` (the native rewrite) is the `latest` tag, but
`typescript-eslint@8` declares a peer range of `>=4.8.4 <6.1.0`. Installing TS 7 breaks
linting.

**Decision:** Pin `typescript` to `~5.9.3` (the newest TS the linter supports).

**Why:** Keeps `npm run lint` working. Revisit when typescript-eslint ships TS 7 support.

## ADR-004: Publish to public npm under the `@pziel` org

**Context:** ADR-001 deferred publishing because `@pzielinski` was not an owned scope.
The npm username scope is `@piotr.zielinski.1994` (ugly), and creating an org named
`pzielinski` was blocked. A free public npm org `pziel` was created instead.

**Decision:** Rename the package to `@pziel/pureui` and publish it to the **public** npm
registry (`publishConfig.access = "public"`, `private` removed). This supersedes the
"deferred" state of ADR-001.

**Why:** Public scoped packages under a free org cost nothing, give a clean import name
(`@pziel/pureui`), and let the sibling apps depend on a versioned registry package
instead of a `file:`/git link. GitHub Packages was rejected because it forces the scope
to the repo owner (`@piotrzielinski1994`) and requires an auth `.npmrc` in every
consumer.
