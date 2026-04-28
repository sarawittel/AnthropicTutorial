"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface StrReplaceArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
  new_path?: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

export function getToolLabel(toolName: string, args: StrReplaceArgs | FileManagerArgs): string {
  if (toolName === "str_replace_editor") {
    const { command, path } = args as StrReplaceArgs;
    switch (command) {
      case "create":    return `Creating ${path}`;
      case "str_replace":
      case "insert":    return `Editing ${path}`;
      case "view":      return `Reading ${path}`;
      case "undo_edit": return `Undoing edit in ${path}`;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args as FileManagerArgs;
    switch (command) {
      case "rename": return `Renaming ${path} → ${new_path ?? ""}`;
      case "delete": return `Deleting ${path}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const label = getToolLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
