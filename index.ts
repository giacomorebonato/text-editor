import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  TextareaRenderable,
} from "@opentui/core"
import { resolve, dirname, basename } from "path"
import { rename, unlink, stat } from "node:fs/promises"

// --- CLI argument parsing ---
const filePath = process.argv[2]
if (!filePath) {
  console.error("Usage: text-editor <file-path>")
  process.exit(1)
}

const resolvedPath = resolve(filePath)
const fileName = basename(resolvedPath)

// --- Pre-TUI validation ---
let initialContent = ""
let isNewFile = false

try {
  const fileStat = await stat(resolvedPath).catch(() => null)

  if (fileStat?.isDirectory()) {
    console.error(`Error: path is a directory — ${resolvedPath}`)
    process.exit(1)
  }

  const file = Bun.file(resolvedPath)
  if (await file.exists()) {
    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder("utf-8", { fatal: true })
    try {
      initialContent = decoder.decode(buffer)
    } catch {
      console.error("Error: not a text file")
      process.exit(1)
    }
  } else {
    isNewFile = true
  }
} catch (err: unknown) {
  const code = (err as NodeJS.ErrnoException).code
  if (code === "EACCES" || code === "EPERM") {
    console.error(`Error: permission denied — ${resolvedPath}`)
  } else {
    console.error(`Error reading file: ${err}`)
  }
  process.exit(1)
}

// --- Save function (atomic: write temp then rename) ---
let editor: TextareaRenderable | null = null
let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null
let statusBar: TextRenderable | null = null
let statusError = ""
let dirty = false

async function save(): Promise<boolean> {
  if (!editor) return false
  const content = editor.editBuffer.getText()
  const tmpPath = resolvedPath + ".tmp"
  try {
    await Bun.write(tmpPath, content)
    await rename(tmpPath, resolvedPath)
    return true
  } catch (err) {
    // Clean up temp file on failure
    await unlink(tmpPath).catch(() => {})
    statusError = `Save failed: ${err}`
    return false
  }
}

async function saveAndExit() {
  const ok = await save()
  if (ok || !renderer) {
    renderer?.destroy()
    process.exit(0)
  }
  // Save failed during Ctrl+Q — stay open, show error in status bar
  if (statusBar) {
    statusBar.content = `${fileName} | ${statusError}`
  }
}

async function signalSaveAndExit() {
  await save() // best-effort
  renderer?.destroy()
  process.exit(0)
}

// --- Signal handlers for crash recovery ---
process.on("SIGHUP", signalSaveAndExit)
process.on("SIGTERM", signalSaveAndExit)

// --- Renderer setup ---
renderer = await createCliRenderer({
  exitOnCtrlC: false,
  targetFps: 60,
  useAlternateScreen: true,
})

// Root layout: vertical flex column
const root = new BoxRenderable(renderer, {
  id: "root",
  width: "100%",
  height: "100%",
  flexDirection: "column",
})
renderer.root.add(root)

// Editor textarea — fills available space
editor = new TextareaRenderable(renderer, {
  id: "editor",
  initialValue: initialContent,
  width: "100%",
  flexGrow: 1,
  wrapMode: "word",
  showCursor: true,
  cursorStyle: { style: "block", blinking: true },
  keyBindings: [
    { name: "q", ctrl: true, action: "submit" },
    { name: "z", ctrl: true, action: "undo" },
    { name: "z", ctrl: true, shift: true, action: "redo" },
  ],
  onSubmit: () => {
    saveAndExit()
  },
  onContentChange: () => {
    dirty = true
    statusError = "" // clear any previous save error on new edit
  },
})
root.add(editor)
editor.focus()

// Status bar — fixed 1-line height at bottom
statusBar = new TextRenderable(renderer, {
  id: "status",
  content: `${fileName} | line 1`,
  height: 1,
  flexShrink: 0,
  width: "100%",
  fg: "#000000",
  bg: "#A5D6FF",
})
root.add(statusBar)

// Update status bar on cursor movement
renderer.setFrameCallback(async () => {
  if (editor && statusBar) {
    const cursor = editor.logicalCursor
    if (statusError) {
      statusBar.content = `${fileName} | ${statusError}`
    } else {
      const modified = dirty ? " [modified]" : ""
      statusBar.content = `${fileName}${modified} | line ${cursor.row + 1}`
    }
  }
})
