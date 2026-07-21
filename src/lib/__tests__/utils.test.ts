import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("should merge multiple class strings when several are passed", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("should collapse conflicting tailwind utilities to the last one when they conflict", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("should skip falsy conditional classes when the condition is false", () => {
    const condFalse = false;
    expect(cn("p-2", condFalse && "hidden")).toBe("p-2");
  });

  it("should keep a truthy conditional class when the condition is true", () => {
    const condTrue = true;
    expect(cn("p-2", condTrue && "hidden")).toBe("p-2 hidden");
  });
});
