# Composed Components

The single most important rule for building components in `pureui`.

## The rule

**Every component MUST follow the composed-components (compound-component) pattern.
Radix UI is the canonical reference - build like Radix builds.** Do not ship
monolithic, prop-heavy components; ship small parts that compose.

If a shadcn/ui primitive exists for what you need, start from it (`npx shadcn add
<name>`) - shadcn primitives are Radix-based and already composed. Strip their
`rounded-*` classes per [design.md](design.md). Only hand-roll when no primitive fits,
and document why.

## What "composed" means here

1. **Compound components over a prop explosion.** A component is a set of related
   subcomponents that share implicit state via context - not one component with 20
   props. The consumer assembles the parts.

   ```tsx
   // Composed (do this):
   <Dialog>
     <DialogTrigger>Open</DialogTrigger>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Title</DialogTitle>
       </DialogHeader>
     </DialogContent>
   </Dialog>

   // Monolithic (avoid):
   <Dialog title="Title" triggerLabel="Open" showHeader footer={...} />
   ```

2. **`asChild` / `Slot` for polymorphism, not a `as` prop or duplicated variants.**
   A component renders its own element by default, but `asChild` merges its behavior
   and classes onto the child element the consumer passes. This is how one `Button`
   becomes a link without a second component. `Button` in this repo is the seed
   example (`src/components/button/button.tsx`): `asChild` swaps the host element for
   `@radix-ui/react-slot`'s `Slot`.

   ```tsx
   <Button>Click</Button>                 // -> <button>
   <Button asChild><a href="/x">Go</a></Button>  // -> <a> carrying button classes
   ```

3. **Context over prop-drilling.** Subcomponents read shared state from a component
   context (`React.createContext`), so the consumer never threads state through every
   level. This is the Radix model (`RadixDialog.Root` provides, `RadixDialog.Content`
   consumes).

4. **Styling via `cva` variants + `cn`.** Variants (`variant`, `size`, ...) live in a
   `class-variance-authority` config; the consumer's `className` is merged last through
   `cn` (tailwind-merge) so overrides win without conflicts. Never concatenate class
   strings by hand.

5. **Forward the ref, spread the rest.** Each part forwards its ref and spreads
   remaining native props onto its host element, so it stays a drop-in for the native
   element it wraps.

## Why

- **Consistency across the `pure*` apps.** Every app composes the same parts the same
  way, so the UI reads as one product.
- **Flexibility without prop bloat.** New layouts are new compositions, not new props.
- **Accessibility for free.** Radix parts wire ARIA/roles/focus between subcomponents;
  a monolithic component re-implements (and usually breaks) that.

## Checklist for a new component

- [ ] Starts from a shadcn/Radix primitive if one exists; `rounded-*` stripped.
- [ ] Exposes parts (compound) rather than one prop-heavy component, where the UI has structure.
- [ ] Supports `asChild` via `Slot` where element polymorphism is plausible.
- [ ] Shares state via context, not prop-drilling.
- [ ] Variants via `cva`; consumer `className` merged last via `cn`.
- [ ] Forwards ref, spreads native props.
- [ ] Has a `*.stories.tsx` workshop and at least one behavior test.
