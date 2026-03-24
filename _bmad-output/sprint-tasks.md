# Sprint Tasks - text-editor MVP

**Date:** 2026-03-24
**Based on:** PRD v1 (post-adversarial review) + Architecture Document

## Sprint 1: Core Editor (DONE)

All tasks in this sprint are complete. The editor is functional.

- [x] **T1: Project scaffold** — `bun init`, install `@opentui/core`
- [x] **T2: CLI argument parsing** — Parse `process.argv[2]`, resolve path, extract filename (FR15)
- [x] **T3: File read** — Load file via `Bun.file().text()`, handle non-existent files as empty buffer (FR1, FR2)
- [x] **T4: Renderer setup** — `createCliRenderer()` with alternate screen, 30fps (NFR3)
- [x] **T5: Editor component** — `TextareaRenderable` with word wrap, Ctrl+Q → submit (FR3, FR6–FR10)
- [x] **T6: Status bar** — `TextRenderable` showing `filename | line X`, updated via frame callback (FR11–FR13)
- [x] **T7: Save and quit** — `onSubmit` → `editBuffer.getText()` → `Bun.write()` → exit (FR3)
- [x] **T8: Signal handlers** — SIGHUP/SIGTERM → save + exit (FR4)
- [x] **T9: Binary build** — `bun build --compile` → standalone macOS binary (FR16)
- [x] **T10: README** — Usage docs, keybindings table, features

## Sprint 2: Hardening (from adversarial review)

These tasks address gaps found in the adversarial review and the updated PRD. They bring the implementation in line with the "File Definition & Constraints" section.

- [x] **T11: Directory check** — Before opening, check if path is a directory. Display "Error: path is a directory" and exit.
- [x] **T12: UTF-8 validation** — After reading file content, validate it is valid UTF-8. Display "Error: not a text file" and exit if invalid.
- [x] **T13: Permission error handling** — Catch EACCES/EPERM on read and display a descriptive error message instead of a generic one.
- [x] **T14: Atomic writes** — Replace direct `Bun.write(resolvedPath, content)` with write-to-temp-then-rename pattern to prevent partial writes.
- [x] **T15: Write failure handling (Ctrl+Q)** — If save fails during Ctrl+Q, remain in editor and show error in status bar instead of exiting.
- [x] **T16: FPS target to 60** — Update `targetFps` from 30 to 60 to meet NFR3 (16ms frame budget).

## Sprint 3: Polish (Post-MVP nice-to-haves)

Only if Sprint 2 is complete and the editor feels solid.

- [x] **T17: Dirty indicator** — Track changes via `onContentChange`, show `[modified]` in status bar
- [x] **T18: Undo/redo** — Ctrl+Z / Ctrl+Shift+Z mapped to undo/redo actions (OpenTUI built-in support)

## Traceability

| Task | FRs covered | NFRs covered |
|------|-------------|--------------|
| T2 | FR15 | — |
| T3 | FR1, FR2 | NFR2 |
| T5 | FR3, FR5, FR6, FR7, FR8, FR9, FR10 | NFR1 |
| T6 | FR11, FR12, FR13 | — |
| T7 | FR3 | NFR4 |
| T8 | FR4 | NFR4 |
| T9 | FR16 | — |
| T11 | — | NFR5 |
| T12 | — | NFR5 |
| T13 | — | NFR5 |
| T14 | FR5 | NFR4 |
| T15 | — | NFR4 |
| T16 | — | NFR3 |
