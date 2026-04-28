import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

describe("getToolLabel", () => {
  it("labels str_replace_editor create", () => {
    expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
  });

  it("labels str_replace_editor str_replace", () => {
    expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  it("labels str_replace_editor insert", () => {
    expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  it("labels str_replace_editor view", () => {
    expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading /App.jsx");
  });

  it("labels str_replace_editor undo_edit", () => {
    expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in /App.jsx");
  });

  it("labels file_manager rename", () => {
    expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx → /new.jsx");
  });

  it("labels file_manager delete", () => {
    expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
  });

  it("falls back to tool name for unknown tools", () => {
    expect(getToolLabel("unknown_tool", { command: "create", path: "/x" } as any)).toBe("unknown_tool");
  });
});

describe("ToolCallBadge", () => {
  it("shows spinner and label while in progress", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{ state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" } }}
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  it("shows green dot and label when done", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{ state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, result: "ok" }}
      />
    );
    expect(screen.getAllByText("Creating /App.jsx").length).toBeGreaterThan(0);
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("renders file_manager delete label", () => {
    render(
      <ToolCallBadge
        toolInvocation={{ state: "call", toolCallId: "2", toolName: "file_manager", args: { command: "delete", path: "/old.jsx" } }}
      />
    );
    expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
  });

  it("renders file_manager rename label", () => {
    render(
      <ToolCallBadge
        toolInvocation={{ state: "result", toolCallId: "3", toolName: "file_manager", args: { command: "rename", path: "/a.jsx", new_path: "/b.jsx" }, result: "ok" }}
      />
    );
    expect(screen.getByText("Renaming /a.jsx → /b.jsx")).toBeDefined();
  });
});
