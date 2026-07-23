import { describe, expect, it } from "vitest";

import { dragOverlayLabel } from "@/lib/workspace/drag-overlay-label";

// Hoisted drag-overlay-label helper (AC-006). It labels the drag overlay: a
// count ("${size} items") only for a genuine multi-select (the dragged id is in
// the selection AND more than one id is selected), otherwise the single item's
// name. The important guard is that a single-item selection shows the name and
// never the ungrammatical "1 items". These assert the returned string only.

describe("dragOverlayLabel", () => {
  // TC-011 -> AC-006 - behavior: dragging a selected id within a 3-item selection
  // yields the count label.
  it("should return '3 items' if the dragged id is in a 3-item selection", () => {
    expect(dragOverlayLabel("a", "Node A", new Set(["a", "b", "c"]))).toBe(
      "3 items",
    );
  });

  // TC-012 -> AC-006 - behavior: a single-item selection shows the name, never
  // "1 items".
  it("should return the name if the selection holds only the dragged id", () => {
    const label = dragOverlayLabel("a", "Node A", new Set(["a"]));

    expect(label).toBe("Node A");
    expect(label).not.toBe("1 items");
  });

  // TC-012 -> AC-006 - behavior: dragging an id that is not part of the current
  // selection shows the dragged item's own name.
  it("should return the name if the dragged id is not in the selection", () => {
    expect(dragOverlayLabel("a", "Node A", new Set(["b", "c"]))).toBe("Node A");
  });
});
