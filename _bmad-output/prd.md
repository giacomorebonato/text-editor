---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - brainstorming/brainstorming-session-2026-03-20-1420.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: cli_tool
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - text-editor

**Author:** mino
**Date:** 2026-03-20

## Executive Summary

A minimal TUI text editor built with Bun and OpenTUI, designed as a practical learning vehicle for evaluating the Bun + OpenTUI stack and demonstrating the BMAD workflow methodology end-to-end. The editor reads, edits, and saves text files through a terminal interface. It targets a single user: the developer building it. There is no market goal — the product's value is in the building process itself.

### What Makes This Special

This project validates two things simultaneously: whether Bun + OpenTUI is a viable stack for TUI applications, and whether BMAD can guide a project from brainstorming through delivery. The editor's intentionally minimal scope (textarea wrapper + file I/O + status bar) keeps the focus on stack exploration rather than feature complexity. Architecture leans heavily on OpenTUI's built-in `TextareaRenderable` component, treating the framework as the product and the glue code as the experiment.

## Project Classification

- **Project Type:** CLI Tool — terminal-based interactive application
- **Domain:** General (developer tooling)
- **Complexity:** Low — single-user, local file I/O, no networking, well-bounded scope
- **Project Context:** Greenfield — new project from scratch
- **Tech Stack:** Bun runtime + OpenTUI framework
- **Distribution:** Single binary via `bun build --compile`
- **Supported Platform:** macOS only (arm64/x86_64). Linux and Windows are untested and unsupported.

## Success Criteria

### User Success

- Open an existing file or create a new one from a single CLI command (`text-editor ./file.txt`)
- Edit text with standard cursor movement, insertion, and deletion — no learning curve beyond the terminal itself
- Save and exit with Ctrl+Q — one keybinding to remember
- Status bar shows current filename and line number at all times

### Business Success

Not applicable. Personal learning project with no revenue, adoption, or growth targets.

### Technical Success

- OpenTUI's `TextareaRenderable` successfully handles all editing concerns (cursor, selection, scrolling, key input)
- `bun build --compile` produces a functional standalone binary that runs without Bun installed
- Signal handlers (SIGHUP/SIGTERM) reliably trigger save-on-exit
- BMAD workflow guides the project from brainstorming through delivery without gaps

### Measurable Outcomes

- Editor opens, edits, and saves a file without data loss
- Single binary runs on macOS without runtime dependencies
- Total application code stays under 250 lines (excluding dependencies)
- Project completed end-to-end using BMAD methodology

## Product Scope

### MVP - Minimum Viable Product

- File open/create via CLI argument (upsert model: open if the file exists, create on save if it does not)
- Full-screen `TextareaRenderable` with word wrapping
- Ctrl+Q save-and-quit via `keyBindings` API (application must disable XON/XOFF flow control on startup to ensure Ctrl+Q is not intercepted by the terminal driver)
- Status bar: `filename | line X`
- SIGHUP/SIGTERM save safety net
- `bun build --compile` single binary

### Post-MVP (Nice-to-Have)

- Ctrl+A / Ctrl+E line jump shortcuts
- Dirty indicator in status bar
- Undo support

### Vision

Not applicable. The project is intentionally bounded at MVP. If the stack proves capable, future *separate* projects may build on the learnings.

## User Journeys

### Journey 1: Editing an Existing File (Happy Path)

Mino is working on a config file and needs a quick edit. He runs `text-editor ./config.yaml`. The editor opens full-screen with the file contents loaded in the textarea. The status bar shows `config.yaml | line 1`. He navigates with arrow keys to the line he needs, makes the change, glances at the status bar to confirm his position, and hits Ctrl+Q. The file is saved and he's back at the shell prompt. Total interaction: under 10 seconds.

### Journey 2: Creating a New File + Unexpected Terminal Close (Edge Case)

Mino runs `text-editor ./notes.txt` — the file doesn't exist yet. The editor opens with an empty textarea. He types several paragraphs of notes. Midway through, his terminal window is accidentally closed. The SIGHUP signal fires, triggering the save handler. When he opens a new terminal and checks `notes.txt`, his content is there. No data lost.

**Caveat:** SIGHUP delivery on terminal close is terminal-emulator-dependent. Terminal.app on macOS sends it reliably; other emulators (iTerm2, tmux, screen) may not. Uncatchable signals like SIGKILL (`kill -9`) bypass all handlers entirely — data loss is unavoidable in that case.

## CLI Tool Specific Requirements

### Project-Type Overview

Purely interactive TUI application — not a scriptable CLI utility. Accepts a single file path argument and opens a full-screen editing interface. No subcommands, flags, output formats, or configuration files. The command surface is intentionally minimal: one argument, one keybinding to exit.

### Command Structure

- **Invocation:** `text-editor <file-path>`
- **Arguments:** Single positional argument — path to the file to edit (upsert model)
- **No flags, no options, no subcommands**
- **Missing argument:** Display error message and exit
- **Shell completion:** Not required — file path completion is provided natively by the shell

### File Definition & Constraints

- **Text file:** Any file whose contents can be decoded as UTF-8. The editor operates exclusively in UTF-8 — no other encodings are supported, and no BOM detection or conversion is performed.
- **Binary files:** The editor reads the entire file into memory and validates it as UTF-8. If the content contains bytes that are not valid UTF-8, the editor must display an error message ("Not a text file") and exit without modifying the file.
- **Symlinks:** Followed transparently — the editor reads/writes the target file. Broken symlinks are treated as new file creation, but the symlink's target path must have existing parent directories (consistent with the new-file creation rule below).
- **Directories:** If the path points to a directory, the editor must display an error message ("Path is a directory") and exit.
- **Permission errors:** If the file cannot be read or written due to OS permissions, the editor must display a descriptive error message and exit without entering the TUI.
- **Special characters in paths:** File paths containing spaces, unicode characters, or shell metacharacters must be handled correctly — the editor receives the path as a resolved argument from the shell, so no additional escaping is required.
- **File size upper bound:** Files exceeding 10,000 lines are unsupported. The editor may open them but makes no performance guarantees beyond NFR2.
- **New file creation timing:** Files are created on disk at save time (Ctrl+Q or signal), not at open time. Parent directories must already exist — the editor does not create intermediate directories.
- **Concurrent modification:** No conflict detection. If another process modifies the file while it is open in the editor, saving will silently overwrite those changes (last-write-wins). This is an accepted limitation for a single-user learning project.
- **Write failure during save:** If a write fails (e.g., disk full, permission revoked), the editor must remain open and display an error in the status bar so the user can retry or copy their content. The editor must not exit with unsaved content on write failure. Writes use a write-to-temp-then-rename strategy to avoid partial writes corrupting the target file.

### Technical Architecture

- Zero-config: no config files, no environment variables, no dotfiles
- Great defaults out of the box — word wrapping, sensible key handling
- Single binary via `bun build --compile` — no runtime dependencies
- Terminal raw mode managed by OpenTUI framework

### Implementation Constraints

- No output formats — writes directly to the file system, never to stdout
- No scripting support — stdin/stdout piping is not a use case
- No plugin system or extensibility points
- Error handling limited to: file read/write failures and missing argument

## Scoping & Risk

### MVP Strategy

**Approach:** Problem-solving + Learning MVP — validate whether Bun + OpenTUI can produce a functional TUI text editor, and learn the stack's strengths and limits through hands-on building.

**Resource:** Single developer (mino), no external dependencies beyond the tech stack.

**Both user journeys are fully supported by the MVP feature set.**

### Risk Mitigation

**Technical:** The core bet is that `TextareaRenderable` handles editing well enough. If it falls short, the architecture must pivot to custom rendering. Mitigation: build the textarea integration first, validate before wiring file I/O and status bar.

**Market:** None — personal learning project.

**Resource:** Minimal. Main risk is time spent debugging OpenTUI quirks due to limited documentation and no prior framework experience.

## Functional Requirements

### File Management

- **FR1:** User can open an existing text file by passing its path as a CLI argument
- **FR2:** User can create a new text file by passing a non-existent file path as a CLI argument
- **FR3:** System saves file contents to disk when the user exits with Ctrl+Q
- **FR4:** System saves file contents to disk when receiving SIGHUP or SIGTERM signals
- **FR5:** System writes file contents faithfully — no trimming, normalization, or newline conversion

### Text Editing

- **FR6:** User can insert text at the cursor position
- **FR7:** User can delete text at the cursor position
- **FR8:** User can navigate text using arrow keys
- **FR9:** System wraps long lines using word wrapping
- **FR10:** User can scroll through content that exceeds the visible terminal area

### Status & Feedback

- **FR11:** System displays the current filename in a status bar
- **FR12:** System displays the current line number in a status bar
- **FR13:** Status bar updates dynamically as the cursor moves

### Application Lifecycle

- **FR14:** System restores the terminal to its original state on exit
- **FR15:** System displays an error message when no file path argument is provided

### Distribution

- **FR16:** System compiles to a standalone binary that runs without Bun installed

## Non-Functional Requirements

### Performance

- **NFR1:** Keystroke-to-screen latency must be under 50ms — no perceptible delay between typing and character appearance
- **NFR2:** File open must complete in under 200ms for files under 10,000 lines
- **NFR3:** Cursor navigation and scrolling must render each frame in under 16ms (60fps target)

### Reliability

- **NFR4:** Editor must never lose content that was present in the textarea buffer when a save is triggered (Ctrl+Q or signal handler)
- **NFR5:** Terminal must be cleanly restored on all exit paths — normal exit, signal exit, and error exit

### Known Limitations

These are accepted constraints for a single-user learning project — not bugs to fix:

- **SIGKILL:** Uncatchable signals (`kill -9`) bypass all handlers. Data loss is unavoidable and no mitigation is planned.
- **Concurrent edits:** No file-lock or change-detection mechanism. External modifications are silently overwritten on save (last-write-wins).
- **Platform:** macOS only. The binary may work on Linux but this is untested and unsupported.
- **Large files:** Files exceeding 10,000 lines may degrade in performance with no guarantee of meeting NFR targets.
