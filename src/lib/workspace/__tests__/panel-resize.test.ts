import { afterEach, describe, expect, it } from "vitest";

import {
  PANEL_RESIZE_STEP,
  type PanelResizeTarget,
  resolveFocusedPanel,
  stepLayout,
} from "@/lib/workspace/panel-resize";

// Hoisted panel-resize helpers (AC-005), generic over the app's panel-group key.
// `resolveFocusedPanel` walks up from the focused element to the nearest
// `[data-panel]` ancestor and maps its id onto a built-in resize target
// (sidebar/console) or null; `stepLayout` is a pure reducer that clamps the
// target panel to [min,max] and moves the exact applied delta off its sibling.
// The DOM tests run under jsdom (pureui vitest env). We assert observable output
// (the resolved target's fields, the returned layout) and the shallow-copy
// contract, not the DOM-walk internals.

// Build a `<div data-panel id={panelId}>` containing a focusable child, mount it,
// and return that child so it can be passed to resolveFocusedPanel as the
// "active" element (mirrors document.activeElement being inside a panel).
function mountFocusedChild(panelId: string): HTMLElement {
  const panel = document.createElement("div");
  panel.setAttribute("data-panel", "");
  panel.id = panelId;
  const child = document.createElement("button");
  panel.appendChild(child);
  document.body.appendChild(panel);
  return child;
}

// Resolve the built-in `sidebar` target via the public API so the stepLayout
// tests do not depend on any non-exported RESIZE_TARGETS internal.
function sidebarTarget(): PanelResizeTarget {
  const child = mountFocusedChild("sidebar");
  const target = resolveFocusedPanel(child);
  if (target === null) {
    throw new Error("expected a sidebar resize target to resolve");
  }
  return target;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PANEL_RESIZE_STEP", () => {
  // TC-007 -> AC-005 - behavior: the exported step constant is 5.
  it("should equal 5", () => {
    expect(PANEL_RESIZE_STEP).toBe(5);
  });
});

describe("resolveFocusedPanel", () => {
  // TC-007 -> AC-005 - behavior: a focused element inside `[data-panel] id=sidebar`
  // resolves the sidebar target with its group/panel/sibling ids and min/max.
  it("should return the sidebar target if the focused element is inside a sidebar panel", () => {
    const child = mountFocusedChild("sidebar");

    expect(resolveFocusedPanel(child)).toEqual({
      group: "workspace",
      panelId: "sidebar",
      siblingId: "content",
      min: 12,
      max: 40,
    });
  });

  // TC-007 -> AC-005 - behavior: a focused element inside `[data-panel] id=console`
  // resolves the console target (group "main", min 10, max 70 - the sibling's 30%
  // minSize caps it below 100).
  it("should return the console target if the focused element is inside a console panel", () => {
    const child = mountFocusedChild("console");

    expect(resolveFocusedPanel(child)).toEqual({
      group: "main",
      panelId: "console",
      siblingId: "content",
      min: 10,
      max: 70,
    });
  });

  // TC-008 -> AC-005 - behavior: a `[data-panel]` whose id is a non-target sibling
  // (content) resolves to null.
  it("should return null if the focused element is inside a non-target content panel", () => {
    const child = mountFocusedChild("content");

    expect(resolveFocusedPanel(child)).toBeNull();
  });

  // TC-008 -> AC-005 - behavior: a null active element resolves to null.
  it("should return null if the active element is null", () => {
    expect(resolveFocusedPanel(null)).toBeNull();
  });
});

describe("stepLayout", () => {
  // TC-009 -> AC-005 - behavior: stepping the sidebar past its max clamps to 40
  // and moves only the applied +2 off the sibling.
  it("should clamp to the max and move the applied delta off the sibling if the step overshoots", () => {
    const target = sidebarTarget();
    const layout = { sidebar: 38, content: 62 };

    expect(stepLayout(layout, target, 5)).toEqual({ sidebar: 40, content: 60 });
  });

  // TC-010 -> AC-005 - behavior: stepping when already at the max yields the
  // unchanged layout (applied delta 0).
  it("should return the unchanged layout if the target is already at its max", () => {
    const target = sidebarTarget();
    const layout = { sidebar: 40, content: 60 };

    expect(stepLayout(layout, target, 5)).toEqual({ sidebar: 40, content: 60 });
  });

  // TC-010 -> AC-005 - side-effect-contract: it returns a shallow copy, not the
  // same object reference, even when nothing changes.
  it("should return a new object (shallow copy) and not mutate the input if the applied delta is 0", () => {
    const target = sidebarTarget();
    const layout = { sidebar: 40, content: 60 };

    const result = stepLayout(layout, target, 5);

    expect(result).not.toBe(layout);
    expect(layout).toEqual({ sidebar: 40, content: 60 });
  });
});
