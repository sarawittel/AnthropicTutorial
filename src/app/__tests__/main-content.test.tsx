import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    selectedFile: null,
    getFileContent: vi.fn(() => ""),
    updateFile: vi.fn(),
    handleToolCall: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    stop: vi.fn(),
  })),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resize-handle" />,
}));

afterEach(() => {
  cleanup();
});

test("renders Preview tab as active by default", () => {
  render(<MainContent />);
  const previewButton = screen.getByRole("tab", { name: "Preview" });
  const codeButton = screen.getByRole("tab", { name: "Code" });
  expect(previewButton.getAttribute("data-state")).toBe("active");
  expect(codeButton.getAttribute("data-state")).toBe("inactive");
});

test("shows PreviewFrame by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code tab switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);
  const codeButton = screen.getByRole("tab", { name: "Code" });
  await user.click(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Preview tab after Code switches back to preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();

  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("Code tab becomes active after clicking", async () => {
  const user = userEvent.setup();
  render(<MainContent />);
  const codeButton = screen.getByRole("tab", { name: "Code" });
  await user.click(codeButton);
  expect(codeButton.getAttribute("data-state")).toBe("active");
  expect(
    screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")
  ).toBe("inactive");
});

test("Preview tab becomes active after clicking from Code", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));
  await user.click(screen.getByRole("tab", { name: "Preview" }));

  expect(
    screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")
  ).toBe("active");
  expect(
    screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")
  ).toBe("inactive");
});
