import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/resizable/resizable";

describe("Resizable", () => {
  it("should render a panel group with its panel when composed", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>left</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>right</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const group = container.querySelector(
      '[data-slot="resizable-panel-group"]',
    );
    const panel = container.querySelector('[data-slot="resizable-panel"]');

    expect(group).not.toBeNull();
    expect(panel).not.toBeNull();
  });

  it("should resolve every AC-001 named export from the resizable barrel", () => {
    const exports = [ResizableHandle, ResizablePanel, ResizablePanelGroup];

    expect(exports.every((exported) => exported !== undefined)).toBe(true);
  });
});
