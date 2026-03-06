#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// 🌉 PIXELHQ ULTRA — TERMINAL BRIDGE SERVER
//
// Watches Claude Code / Codex CLI / Gemini CLI session JSONL logs.
// Strips PII and semantic content → emits only structural game events.
// Broadcasts over WebSocket on ws://localhost:7890
//
// Usage:  node bridge.js [--port 7890] [--watch ~/.claude/projects]
// ═══════════════════════════════════════════════════════════════════════════════

const fs      = require("fs");
const path    = require("path");
const os      = require("os");
const { WebSocketServer } = require("ws");

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const PORT    = parseInt(args[args.indexOf("--port") + 1] || "7890", 10);
const WATCH_DIRS = [
  path.join(os.homedir(), ".claude", "projects"),
  path.join(os.homedir(), ".codex",  "sessions"),
  path.join(os.homedir(), ".gemini", "sessions"),
  path.join(os.homedir(), ".opencode", "sessions"),
];
// Accept extra watch dir from CLI
if (args.includes("--watch")) {
  const watchValue = args[args.indexOf("--watch") + 1];
  if (watchValue && !watchValue.startsWith("-")) {
    WATCH_DIRS.unshift(watchValue);
  }
}

// ── Tool name → game event type mapping ───────────────────────────────────────
const TOOL_MAP = {
  "Bash":      "tool_bash",
  "Read":      "tool_read",
  "Write":     "tool_write",
  "Edit":      "tool_edit",
  "Task":      "tool_task",
  "Glob":      "tool_read",
  "Grep":      "tool_read",
  "WebFetch":  "tool_bash",
  "WebSearch": "tool_bash",
  "NotebookEdit": "tool_edit",
  "TodoWrite": "tool_task",
};

// ── Role inference: derive role from agent depth (sub-agents are employees/interns)
function inferRole(depth = 0) {
  if (depth === 0) return "boss";
  if (depth === 1) return "supervisor";
  if (depth === 2) return "employee";
  return "intern";
}

// ── Privacy gate: strip actual content, keep only structural metadata ─────────
function strip(raw) {
  if (!raw || typeof raw !== "string") return "";
  // Remove file content, keep only the file name
  const fileMatch = raw.match(/^(?:~\/|\/|\.\/)([\w./\-]+)/);
  if (fileMatch) return path.basename(fileMatch[1]);
  // For bash: keep just the command verb + flags, drop arguments
  const cmdMatch = raw.trim().match(/^(\S+)/);
  if (cmdMatch) return cmdMatch[1];
  return "[redacted]";
}

// ── Parse a single JSONL line into a game event ───────────────────────────────
function parseLine(line, sessionMeta) {
  if (!line.trim()) return null;
  let obj;
  try { obj = JSON.parse(line); } catch { return null; }

  const { type, message, tool_use_id, subagent_id, depth } = obj;
  const agentId = sessionMeta.id;
  const role    = sessionMeta.role || inferRole(depth || 0);

  if (type === "assistant" && message?.content) {
    const content = message.content;
    if (!Array.isArray(content)) return null;
    // Text response
    const textBlock = content.find(b => b.type === "text");
    if (textBlock) {
      return { type: "agent_text", agentId, role, toolName: null, content: strip(textBlock.text), subAgentId: null };
    }
    // Thinking block
    const thinkBlock = content.find(b => b.type === "thinking");
    if (thinkBlock) {
      return { type: "tool_use", agentId, role, toolName: "Think", content: "[thinking]", subAgentId: null };
    }
    // Tool use
    const toolBlock = content.find(b => b.type === "tool_use");
    if (toolBlock) {
      const toolName = toolBlock.name;
      const input    = toolBlock.input || {};
      // Sub-agent spawn (Task tool)
      if (toolName === "Task") {
        const subId = subagent_id || `sub-${tool_use_id}`;
        return { type: "subagent_spawn", agentId, role, toolName, content: strip(input.description || input.prompt || ""), subAgentId: subId };
      }
      // Normal tool
      const content_ = strip(
        input.command || input.file_path || input.path || input.query || input.description || ""
      );
      return { type: "tool_use", agentId, role, toolName, content: content_, subAgentId: null };
    }
  }

  if (type === "tool_result") {
    // Check for sub-agent completion embedded in result
    if (obj.is_error === false && obj.subagent_id) {
      return { type: "subagent_done", agentId, role, toolName: "Task", content: "[subtask complete]", subAgentId: obj.subagent_id };
    }
    // Stats event for XP purposes
    return { type: "tool_result", agentId, role, toolName: null, content: null, subAgentId: null };
  }

  return null;
}

// ── WebSocket server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });
const clients = new Set();

wss.on("connection", ws => {
  clients.add(ws);
  console.log(`[bridge] Client connected (${clients.size} total)`);
  ws.on("close", () => { clients.delete(ws); console.log(`[bridge] Client left (${clients.size} total)`); });
  ws.on("error", () => clients.delete(ws));
});

function broadcast(event) {
  const payload = JSON.stringify(event);
  clients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  });
}

// ── File watcher ──────────────────────────────────────────────────────────────
const watchers = new Map();  // filePath → { fd, offset, sessionMeta }

function deriveSessionMeta(filePath) {
  // Infer agent ID from folder name + file name
  const parts   = filePath.split(path.sep);
  const folder  = parts[parts.length - 2] || "agent";
  const fileId  = path.basename(filePath, ".jsonl");
  const id      = `${folder.slice(-6)}-${fileId.slice(-4)}`;
  const role    = folder.includes("subagent") ? "employee" : "boss";
  const tool    = filePath.includes(".codex") ? "codexcli"
                : filePath.includes(".gemini") ? "geminicli"
                : filePath.includes(".opencode") ? "opencode"
                : "claudecode";
  return { id, role, tool };
}

function tailFile(filePath) {
  if (watchers.has(filePath)) return;
  const sessionMeta = deriveSessionMeta(filePath);
  let offset = 0;

  const readNew = () => {
    let stat;
    try { stat = fs.statSync(filePath); } catch { return; }
    if (stat.size <= offset) return;

    const buf = Buffer.alloc(stat.size - offset);
    const fd  = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    offset = stat.size;

    const text  = buf.toString("utf8");
    const lines = text.split("\n");
    lines.forEach(line => {
      const event = parseLine(line, sessionMeta);
      if (event) {
        broadcast(event);
        console.log(`[bridge] → ${event.type} from ${event.agentId} (${event.toolName || ""})`);
      }
    });
  };

  const watcher = fs.watch(filePath, (eventType) => {
    if (eventType === "change") readNew();
  });
  watchers.set(filePath, { watcher, sessionMeta });
  // Read any existing content
  readNew();
}

function watchDir(dir) {
  if (!fs.existsSync(dir)) return;
  // Watch for new JSONL files appearing in subdirectories
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".jsonl")) return;
    const full = path.join(dir, filename);
    if (!watchers.has(full) && fs.existsSync(full)) {
      console.log(`[bridge] New session: ${full}`);
      tailFile(full);
    }
  });
  // Also tail any existing JSONL files
  try {
    const scan = (d) => {
      fs.readdirSync(d, { withFileTypes: true }).forEach(ent => {
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) scan(full);
        else if (ent.name.endsWith(".jsonl")) tailFile(full);
      });
    };
    scan(dir);
  } catch {}
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log(`[bridge] PixelHQ ULTRA Bridge Server`);
console.log(`[bridge] Listening on ws://localhost:${PORT}`);
WATCH_DIRS.forEach(d => {
  console.log(`[bridge] Watching: ${d}`);
  watchDir(d);
});

if (clients.size === 0) {
  console.log(`[bridge] No clients yet — PixelHQUltra.jsx will use demo mode until connected.`);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[bridge] Shutting down...");
  watchers.forEach(({ watcher }) => watcher.close());
  wss.close();
  process.exit(0);
});
