import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog/dialog";

describe("Dialog", () => {
  it("should render the dialog title text when opened via defaultOpen", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
          <DialogDescription>Some description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText("My Dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should resolve every AC-001 named export from the dialog barrel", () => {
    const exports = [
      Dialog,
      DialogClose,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogOverlay,
      DialogPortal,
      DialogTitle,
      DialogTrigger,
    ];

    expect(exports.every((exported) => exported !== undefined)).toBe(true);
  });
});
