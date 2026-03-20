---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Building a basic TUI text editor using Bun and OpenTUI'
session_goals: 'Design features, architecture, and UX for reading, editing, and saving text files — simple and functional, no special effects'
selected_approach: 'ai-recommended'
techniques_used: ['First Principles Thinking', 'SCAMPER Method', 'Constraint Mapping']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** mino
**Date:** 2026-03-20

## Session Overview

**Topic:** Building a basic TUI text editor using Bun and OpenTUI
**Goals:** Design features, architecture, and UX for reading, editing, and saving text files — simple and functional, no special effects

### Session Setup

Focused session on practical TUI design with specific tech stack constraints (Bun + OpenTUI). Prioritizing simplicity, functionality, and core editing workflows.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Basic TUI text editor with focus on read/edit/save core functionality

**Recommended Techniques:**

- **First Principles Thinking:** Strip assumptions about what a text editor truly needs — establishes a clean, minimal foundation before building up features
- **SCAMPER Method:** Systematically explore design and features through 7 lenses — ideal for a concrete product with a defined, bounded scope
- **Constraint Mapping:** Explicitly map what Bun and OpenTUI can/can't do, and what "basic" means — filters ideas through real technical reality

**AI Rationale:** Your language ("basic", "no special effects", "only") signals a pragmatic, constraint-aware mindset. This sequence moves from clarity → generation → validation, perfectly suited for a focused build session.

---

## Technique Execution Results

### Technique 1: First Principles Thinking

**[Core #1]: The Minimal Cursor Contract**
_Concept_: The editor's entire job is: place a cursor, accept keystrokes at that position, move it with arrows. Everything else is decoration.
_Novelty_: Starts from "what does editing physically mean?" rather than "what features do users expect?"

**[Core #2]: Flat Index Model**
_Concept_: Internal state is just a string + a cursor index. No 2D grid, no line/column tracking — the cursor is a position in a flat character sequence. Newlines are just characters.
_Novelty_: Most TUI editors model text as an array of lines. Flat string is simpler to reason about and exactly what the file is on disk.

**[Core #3]: Infinite Canvas via Space Expansion (Vertical Only)**
_Concept_: Moving the cursor below the last line auto-fills with a newline. The file grows to meet the cursor. Horizontal expansion is disabled by the 120-char cap.
_Novelty_: Eliminates "invalid cursor position" vertically — you can always move down and type.

**[Core #4]: Horizontal Scroll Eliminated via 120-Char Line Cap**
_Concept_: Lines cannot exceed 120 characters. The cursor stops at column 120. No horizontal scroll needed — `scrollX` is eliminated entirely.
_Novelty_: One constraint kills a whole subsystem. Rendering is trivial; viewport always fits.

**[Core #5]: Faithful Serialization**
_Concept_: Save writes the exact string to disk — no trimming, no normalization, no newline conversion.
_Novelty_: Eliminates subtle bugs where the editor "helpfully" mutates your file. Transparent conduit between keystrokes and disk.

**[UX #6]: Upsert File Model**
_Concept_: `text-editor ./file.txt` — if file exists, load it; if not, start empty and create on first save.
_Novelty_: Collapses create/edit into one gesture. The file system is the UI for file management.

**[UX #7]: Auto-Save on Quit**
_Concept_: Ctrl+Q writes `text` to disk then exits. SIGHUP/SIGTERM also trigger auto-save for safety.
_Novelty_: No dirty flag, no confirmation dialogs, no "unsaved changes" prompt.

---

### Technique 2: SCAMPER Method (in progress)

**[SCAMPER #8]: Signal-Driven Exit Safety**
_Concept_: SIGHUP and SIGTERM also trigger auto-save, so closing the terminal window never loses data.
_Novelty_: The OS becomes a safety net; Ctrl+Q remains the explicit user-facing exit.

**[SCAMPER #9]: Ctrl+A/E Line Jumps**
_Concept_: Ctrl+A moves cursor to start of current line, Ctrl+E to end.
_Novelty_: Readline/bash muscle memory — feels native in a terminal context at near-zero implementation cost.

**[Core #10]: Explicit Quit Keybinding**
_Concept_: Ctrl+Q is the single intentional exit gesture — saves and quits. One obvious keybinding beats implicit terminal-close for discoverability.
_Novelty_: A new user needs to know exactly one thing to safely exit.

**[Core #11]: 120-Char Line Cap**
_Concept_: The editor refuses to insert characters past column 120. Cursor stops at the cap.
_Novelty_: Eliminates horizontal scroll entirely, reducing state from 4 fields to 3.

**[SCAMPER #12]: Undo Eliminated**
_Concept_: No undo stack, no history, no snapshots. Ctrl+Z is unbound.
_Novelty_: Removes the most complex stateful feature most editors carry.

**[SCAMPER #13]: Minimal Status Bar**
_Concept_: A single persistent bottom row showing `filename | line X`. Updates as cursor moves. No flash, no extra feedback.
_Novelty_: Adds the one piece of dynamic feedback users actually need without any other chrome. `line X` is computed by counting newlines between index 0 and `cursor`.

**[SCAMPER #14]: Derived Scroll Position**
_Concept_: `scrollY` is not stored — computed on every render from `cursor` and `terminalHeight` to keep cursor always in view.
_Novelty_: State model shrinks to just two fields: `text` and `cursor`. Everything else is derived.

**[SCAMPER #15]: Overwrite Mode Eliminated**
_Concept_: Insert-only. No overwrite toggle, no Insert key handling. Typing always inserts.
_Novelty_: One less state field, one less branch.

---

### Complete State Model (as of session)

```
text: string        // flat file contents
cursor: number      // index into text
scrollY: number     // first visible line index
```

### Complete Design Decisions

| Concern | Decision |
|---|---|
| State | `text`, `cursor`, `scrollY` |
| Line model | Flat string, no horizontal scroll |
| Line length | Max 120 chars (hard cap) |
| Vertical movement | Arrows; ↓ past EOF adds newline |
| Horizontal movement | Arrows + Ctrl+A/E; stops at col 120 |
| File open | `text-editor ./file.txt`, upsert |
| Save | Auto-save on Ctrl+Q |
| Quit | Ctrl+Q (also SIGHUP/SIGTERM for safety) |
| Undo | None — cut |
| Overwrite mode | None — cut |
| Status bar | `filename \| line X` (bottom row, static filename, dynamic line) |
| Scroll | Derived from cursor + terminalHeight, not stored |

### Final State Model

```
text: string     // flat file contents
cursor: number   // index into text
// everything else is derived on render
```
