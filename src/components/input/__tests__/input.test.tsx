import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/input/input";

describe("Input", () => {
  it("should render a textbox carrying the border-input token", () => {
    render(<Input placeholder="Name" />);

    const input = screen.getByRole("textbox");

    expect(input).toBeInTheDocument();
    expect(input.className).toContain("border-input");
  });

  it("should resolve the Input named export from the input barrel", () => {
    expect(Input).not.toBeUndefined();
  });
});
