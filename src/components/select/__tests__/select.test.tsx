import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/select/select";

describe("Select", () => {
  it("should render a trigger with the combobox role carrying the border-input token", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    );

    const trigger = screen.getByRole("combobox");

    expect(trigger).toBeInTheDocument();
    expect(trigger.className).toContain("border-input");
  });

  it("should resolve every AC-001 named export from the select barrel", () => {
    const exports = [
      Select,
      SelectContent,
      SelectGroup,
      SelectItem,
      SelectLabel,
      SelectScrollDownButton,
      SelectScrollUpButton,
      SelectSeparator,
      SelectTrigger,
      SelectValue,
    ];

    expect(exports.every((exported) => exported !== undefined)).toBe(true);
  });
});
