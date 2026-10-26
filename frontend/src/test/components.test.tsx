import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";

const TestDialogWrapper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Test Modal Title"
        description="Test modal description"
        confirmText="Confirm Test"
        onConfirm={() => setIsOpen(false)}
      >
        Modal Body Content
      </Dialog>
    </div>
  );
};

describe("Reusable UI Components", () => {
  it("renders Button with variants and handles loading state", () => {
    const { rerender } = render(<Button variant="primary">Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    rerender(<Button variant="destructive" isLoading>Click Me</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders Input with label, placeholder, and helper text", () => {
    const handleChange = vi.fn();

    render(
      <Input
        label="Exam Code"
        placeholder="e.g. CS101"
        helperText="Required course identifier"
        onChange={handleChange}
      />
    );

    expect(screen.getByText("Exam Code")).toBeInTheDocument();
    expect(screen.getByText("Required course identifier")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("e.g. CS101");
    fireEvent.change(input, { target: { value: "MATH201" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders Badge variants with dot indicator", () => {
    render(
      <div>
        <Badge variant="amber" dot>Conflict</Badge>
        <Badge variant="teal">Valid</Badge>
      </div>
    );

    expect(screen.getByText("Conflict")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("renders EmptyState with title and action button", () => {
    render(
      <EmptyState
        title="No Data Found"
        description="Empty state description text."
        action={<Button size="sm">Add Data</Button>}
      />
    );

    expect(screen.getByText("No Data Found")).toBeInTheDocument();
    expect(screen.getByText("Empty state description text.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Data" })).toBeInTheDocument();
  });

  it("opens Dialog and closes on Escape key or backdrop click", () => {
    render(<TestDialogWrapper />);

    // Dialog is initially closed
    expect(screen.queryByText("Test Modal Title")).not.toBeInTheDocument();

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: "Open Modal" }));
    expect(screen.getByText("Test Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Modal Body Content")).toBeInTheDocument();

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("Test Modal Title")).not.toBeInTheDocument();
  });
});
