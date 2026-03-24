# Architecture Document - text-editor

**Author:** mino
**Date:** 2026-03-24
**Based on:** PRD v1 (post-adversarial review)

## Overview

The text-editor is a single-file TUI application (~100–250 lines) built on two dependencies: the Bun runtime and the OpenTUI framework (`@opentui/core`). The architecture is deliberately simple — OpenTUI's `TextareaRenderable` owns all editing state and behavior; the application is glue code connecting file I/O, signal handling, and input validation to the framework.

## System Architecture

```
┌──────────────────────────────────────────────────┐
│                   index.ts                        │
│                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  CLI Layer   │  │ File I/O │  │  Signal      │ │
│  │  - argv      │  │ - read   │  │  Handlers    │ │
│  │  - validate  │  │ - save   │  │  - SIGHUP    │ │
│  │  - resolve   │  │ - atomic │  │  - SIGTERM   │ │
│  └──────┬───────┘  └────┬─────┘  └──────┬──────┘ │
│         │               │               │         │
│  ┌──────▼───────────────▼───────────────▼──────┐ │
│  │              OpenTUI Renderer                │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  BoxRenderable (root, flexDirection:col)│  │ │
│  │  │  ┌──────────────────────────────────┐   │  │ │
│  │  │  │  TextareaRenderable (editor)     │   │  │ │
│  │  │  │  - flexGrow: 1                   │   │  │ │
│  │  │  │  - wrapMode: "word"              │   │  │ │
│  │  │  │  - keyBindings: Ctrl+Q → submit  │   │  │ │
│  │  │  └──────────────────────────────────┘   │  │ │
│  │  │  ┌──────────────────────────────────┐   │  │ │
│  │  │  │  TextRenderable (status bar)     │   │  │ │
│  │  │  │  - height: 1, flexShrink: 0      │   │  │ │
│  │  │  │  - "filename | line X"           │   │  │ │
│  │  │  └──────────────────────────────────┘   │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. CLI Layer (pre-TUI)

Runs before the renderer starts. Validates inputs and exits early with error messages on failure.

| Check | Condition | Error message |
|-------|-----------|---------------|
| Missing argument | `process.argv[2]` is undefined | "Usage: text-editor \<file-path\>" |
| Path is directory | `stat.isDirectory()` | "Error: path is a directory" |
| Permission denied | Read fails with EACCES/EPERM | "Error: permission denied — \<path\>" |
| Not UTF-8 | Content contains invalid UTF-8 bytes | "Error: not a text file" |

Non-existent files are not an error — they start an empty editor buffer (upsert model).

### 2. File I/O Layer

**Read:** `Bun.file(path).text()` — reads entire file into memory as UTF-8. Validated before entering TUI.

**Write (atomic):** Write-to-temp-then-rename strategy to prevent partial writes:
1. Write content to `<path>.tmp` via `Bun.write()`
2. Rename `<path>.tmp` → `<path>` via `fs.rename()`
3. On failure: remove temp file, display error in status bar, do not exit

**Write failure handling:** The `save()` function returns success/failure. On failure during Ctrl+Q, the editor remains open and the status bar shows an error. On failure during signal handler, best-effort only (process is exiting).

### 3. Signal Handlers

Registered before the renderer starts:
- `SIGHUP` → `save()` then `process.exit(0)`
- `SIGTERM` → `save()` then `process.exit(0)`

Signal saves are best-effort — if the write fails, data is lost. This is an accepted limitation (see PRD Known Limitations).

### 4. OpenTUI Renderer

Created with `createCliRenderer()`:
- `exitOnCtrlC: false` — Ctrl+C does not exit (prevents accidental data loss)
- `targetFps: 30` — sufficient for text editing, lower CPU usage
- `useAlternateScreen: true` — clean terminal restoration on exit

### 5. Component Tree

```
RootRenderable (renderer.root)
└── BoxRenderable "root" (100% × 100%, flexDirection: column)
    ├── TextareaRenderable "editor" (flexGrow: 1, wrapMode: word)
    └── TextRenderable "status" (height: 1, flexShrink: 0)
```

**TextareaRenderable** owns all editing state: text buffer, cursor position, scroll offset, selection. The application never reads or writes these directly except to get content for saving (`editBuffer.getText()`).

**TextRenderable** for the status bar is updated every frame via `renderer.setFrameCallback()`, reading `editor.logicalCursor.row`.

## Data Flow

```
Startup:
  argv → validate path → read file → create renderer → create textarea(initialValue) → focus

Editing:
  keystrokes → TextareaRenderable (internal) → frame callback → status bar update

Save (Ctrl+Q):
  onSubmit → editBuffer.getText() → write temp → rename → destroy renderer → exit

Save (signal):
  SIGHUP/SIGTERM → editBuffer.getText() → write temp → rename → exit
```

## Application State

| Field | Owner | Mutable |
|-------|-------|---------|
| `resolvedPath` | App | No (set once from argv) |
| `fileName` | App | No (derived from path) |
| Text content | TextareaRenderable.editBuffer | Yes (via user input) |
| Cursor position | TextareaRenderable.logicalCursor | Yes (via user input) |
| Scroll position | TextareaRenderable (internal) | Yes (via framework) |

The application holds no editing state. The framework is the single source of truth.

## Build & Distribution

```bash
bun build --compile index.ts --outfile text-editor
```

Produces a self-contained Mach-O arm64 binary (~63MB) with the Bun runtime and all dependencies bundled. No runtime installation required on the target machine.

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Single file (`index.ts`) | Project is <250 lines — splitting adds complexity without benefit |
| OpenTUI imperative API | React/Solid bindings not needed for 2 components |
| `Bun.file()` / `Bun.write()` | Native Bun APIs per CLAUDE.md, no `node:fs` |
| 30fps target | Text editing doesn't need 60fps; saves CPU |
| Alternate screen buffer | Clean terminal restoration without manual escape codes |
| Write-to-temp-then-rename | Prevents partial writes from corrupting the file on disk |
