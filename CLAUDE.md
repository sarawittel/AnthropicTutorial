# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Tests (Vitest + jsdom)
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate && npx prisma migrate dev
```

All Next.js commands require `NODE_OPTIONS='--require ./node-compat.cjs'` — the npm scripts already include this.

## Architecture

UIGen is a Next.js 15 App Router app where users describe React components in a chat interface and see them rendered live. The app works without an Anthropic API key by falling back to a `MockLanguageModel` in `src/lib/provider.ts`.

### Data flow for component generation

1. User types a prompt in `ChatInterface` → sent to `/api/chat` with the serialized `VirtualFileSystem` state
2. The chat route (`src/app/api/chat/route.ts`) calls Claude via Vercel AI SDK's `streamText`, exposing two tools:
   - `str_replace_editor` — create/replace/insert file content (`src/lib/tools/str-replace.ts`)
   - `file_manager` — rename/delete files (`src/lib/tools/file-manager.ts`)
3. Tool calls stream back to the client; `onToolCall` in `ChatContext` forwards them to `FileSystemContext.handleToolCall`, which applies mutations to the in-memory `VirtualFileSystem`
4. `PreviewFrame` watches `refreshTrigger` from `FileSystemContext`, transpiles all VFS files using `@babel/standalone` (client-side), builds blob URLs + an import map, then writes the result as `srcdoc` into a sandboxed `<iframe>`

### Virtual file system

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree (Map-based). It is serialized to JSON for API calls and for persisting project state to SQLite. The preview entry point is auto-detected: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx`.

### Auth and persistence

- Auth uses JWT stored in an `httpOnly` cookie (`src/lib/auth.ts`, via `jose`)
- Authenticated users' projects are stored in SQLite via Prisma (`User` + `Project` models in `prisma/schema.prisma`). The `Project.data` column holds the serialized VFS; `Project.messages` holds the full chat history.
- Anonymous users get their in-progress work tracked in `src/lib/anon-work-tracker.ts` (localStorage) and prompted to sign up before losing it.
- Prisma client is generated into `src/generated/prisma/` (not the default location).

### Key contexts

- `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) — owns the VFS instance, exposes `handleToolCall` which routes incoming AI tool calls to VFS mutations
- `ChatProvider` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, serializes the VFS and sends it with every request so the API can reconstruct file state

### JSX transformation for preview

`createImportMap` in `src/lib/transform/jsx-transformer.ts`:
- Transpiles every `.js/.jsx/.ts/.tsx` file in the VFS using Babel standalone
- Wraps each in a blob URL and registers it in a browser import map
- Third-party package imports (non-relative, non-`@/`) are resolved to `https://esm.sh/<package>`
- Missing local imports get auto-generated placeholder stub modules so preview doesn't crash
- CSS files are inlined as `<style>` tags; Tailwind CDN is always injected into the preview iframe

### Server actions

`src/actions/` contains Next.js server actions for auth (`getUser`), and project CRUD (`createProject`, `getProject`, `getProjects`).
