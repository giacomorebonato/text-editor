# text-editor

A minimal, zero-config TUI text editor that runs in your terminal. Opens a file, lets you edit it full-screen with word wrapping, and saves on exit. That's it.

Built with [Bun](https://bun.sh) and [OpenTUI](https://github.com/anomalyco/opentui) as a learning project to evaluate the stack for TUI applications. The entire editor is ~100 lines of code — OpenTUI's `TextareaRenderable` does the heavy lifting.

## Install

```bash
bun install
bun run build
```

This produces a standalone `text-editor` binary (no Bun needed to run it).

## Usage

```bash
# Open an existing file
text-editor ./config.yaml

# Create a new file (saved on first exit)
text-editor ./notes.txt
```

If the file exists, it's loaded. If it doesn't, the editor starts empty and creates the file when you save.

## Keybindings

| Key | Action |
|-----|--------|
| Ctrl+Q | Save and quit |
| Arrow keys | Move cursor |
| Ctrl+A | Jump to start of line |
| Ctrl+E | Jump to end of line |
| Ctrl+K | Delete to end of line |
| Ctrl+U | Delete to start of line |
| Ctrl+W | Delete word backward |

Standard text editing (insert, delete, backspace, text selection) works as expected.

## Features

- Full-screen editing with word wrapping
- Status bar showing filename and current line number
- Crash recovery — SIGHUP/SIGTERM signals trigger an automatic save before exit
- Compiles to a single standalone binary via `bun build --compile`
- No config files, no flags, no options — just `text-editor <file>`

## Development

```bash
bun install
bun run dev <file-path>
```

## Tech Stack

- [Bun](https://bun.sh) — JavaScript runtime and single-binary compiler
- [OpenTUI](https://github.com/anomalyco/opentui) (`@opentui/core`) — TUI rendering framework
