import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/button/button";

describe("Button", () => {
  it("should render a native button carrying its children text when the default variant is used", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });

    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveTextContent("Click me");
    expect(button.className).toContain("bg-primary");
  });

  it("should apply the destructive variant classes when variant is destructive", () => {
    render(<Button variant="destructive">Del</Button>);

    const button = screen.getByRole("button", { name: "Del" });

    expect(button.className).toContain("bg-destructive");
  });

  it("should render as the child element and carry the button classes when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/x">go</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "go" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/x");
    expect(screen.queryByRole("button")).toBeNull();
    expect(link.className).toContain("inline-flex");
  });

  it("should collapse conflicting tailwind padding classes when className overrides padding", () => {
    render(<Button className="px-8">x</Button>);

    const button = screen.getByRole("button", { name: "x" });
    const classes = button.className.split(/\s+/);

    expect(classes).toContain("px-8");
    expect(classes).not.toContain("px-4");
  });
});
