<div align="center">

# 🎮 PixelHQ ULTRA

**Multi-agent pixel office with A2A protocol, terminal correlation, and evolution engine.**

Built by [LoveLogicAI LLC](https://github.com/RemyLoveLogicAI) · Part of the [Agent Knowledge Graph](https://github.com/RemyLoveLogicAI/awesome/blob/main/ARCHITECTURE.md) ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)

</div>

---

## What is PixelHQ ULTRA?

PixelHQ ULTRA is a real-time pixel-art visualization layer for autonomous AI agent orchestration. It renders a tile-based office environment where AI agents (Claude Code, Codex CLI, Gemini CLI, OpenCode) appear as pixel sprites that move, collaborate, and evolve based on actual terminal activity.

Think of it as a **game UI for your AI agent swarm** — agents walk to meeting rooms when collaborating, sit at desks when coding, and gain XP that unlocks new abilities.

### Key Features

- **60×38 tile-based office world** with 18 tile types (desks, servers, meeting tables, whiteboards, coffee stations)
- **Agent-to-Agent (A2A) protocol** implementing Google A2A spec semantics for task assignment, peer review, knowledge sharing, meetings, and debates
- **Terminal bridge** that watches Claude Code / Codex CLI / Gemini CLI session logs and translates tool calls into game events — zero PII exposure
- **4-tier agent hierarchy** — Boss → Supervisor → Employee → Intern — with XP, leveling, and evolution milestones
- **Knowledge Graph overlay** mapping the full 25-node LoveLogicAI architecture onto the tile grid with typed, animated edges
- **Personality engine** giving each agent distinct behavioral patterns
- **WebSocket broadcast** for real-time multi-viewer spectating

---

## Architecture

PixelHQ ULTRA sits at Tier 1 of the LoveLogicAI Agent Knowledge Graph:

```
Remy Sr (Principal)
  └── PixelHQ ULTRA ──INFRA──→ Mac Mini M4
       │                └──DEPLOY──→ Vercel
       ├──ORCH──→ MCP Server
       └── KG Overlay (25 nodes, 29 edges, 5 tiers)
```

### Module Map

| File | Role | Lines |
|------|------|-------|
| `src/PixelHQUltra.jsx` | Main React component — Canvas renderer, state reducer, camera, HUD | ~1200 |
| `src/engine.js` | EventBus, A2AProtocol, PersonalityEngine, TerminalBridge | ~500 |
| `src/officeData.js` | Tile definitions, office map generator, sprite data, waypoints, XP tables | ~600 |
| `src/kgOverlay.js` | Knowledge Graph overlay — 25 nodes, 29 typed edges, particle system | ~300 |
| `src/bridge.js` | Node.js WebSocket server — watches CLI session logs, strips PII, broadcasts events | ~280 |

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/RemyLoveLogicAI/pixelhq-ultra.git
cd pixelhq-ultra
npm install
```

### 2. Start the terminal bridge

The bridge watches your AI CLI sessions and broadcasts game events over WebSocket:

```bash
npm run bridge
# Listens on ws://localhost:7890
# Watches: ~/.claude/projects, ~/.codex/sessions, ~/.gemini/sessions, ~/.opencode/sessions
```

### 3. Start the dev server

```bash
npm run dev
# Opens Vite dev server with hot reload
```

### 4. Build for production

```bash
npm run build
```

---

## Agent Hierarchy

| Role | Sprite Color | Spawn | XP/Level | Evolves Into |
|------|-------------|-------|----------|--------------|
| **Boss** | 🟡 Gold | Corner office | 100 XP/level | Strategic Vision → Force Meeting → God Mode |
| **Supervisor** | 🔵 Blue | Supervisor zone | 100 XP/level | Multi-Task → Priority Override → Resource Surge |
| **Employee** | 🟢🔴🟣 Varied | Open workspace | 100 XP/level | Speed Boost → Debug Sense → Pair Program |
| **Intern** | 🟠🩵 Varied | Server room | 50 XP/level | Quick Learn → Coffee Power → Promoted! |

### XP Sources

| Event | XP |
|-------|-----|
| Task complete | +30 |
| Peer review | +20 |
| Knowledge share | +15 |
| Meeting attend | +10 |
| Tool use | +5 |

---

## A2A Protocol Messages

| Message Type | Flow | Description |
|-------------|------|-------------|
| `TASK_ASSIGN` | Boss → Any | Assign work |
| `TASK_COMPLETE` | Any → Boss | Report completion |
| `TASK_BLOCKED` | Any → Supervisor | Escalate blocker |
| `PEER_REVIEW` | Employee → Employee | Request code review |
| `KNOWLEDGE_SHARE` | Any → All | Broadcast learning |
| `MEETING_CALL` | Boss → Group | Convene meeting |
| `DEBATE_OPEN` | Agent ↔ Agent | Disagree + discuss |
| `WORK_HANDOFF` | Any → Any | Pass artifact |
| `STATUS_PING` | Any | Heartbeat |
| `EVOLUTION_VOTE` | Agents | Vote on protocol changes |

---

## Knowledge Graph Overlay

Press **`K`** in the UI to toggle the KG overlay. It maps the full [LoveLogicAI architecture](https://github.com/RemyLoveLogicAI/awesome/blob/main/ARCHITECTURE.md) onto the tile grid:

- **25 nodes** across 5 tiers (Principal → Core → Subsystem → Platform → Notion DB)
- **29 typed edges** with 8 color-coded relationship types
- **Animated particles** that flow along edges during real-time A2A messages
- **Hover tooltips** and **click-to-inspect panels** for every node
- **Legend overlay** showing all tier and edge type colors

---

## Terminal Bridge Privacy

The bridge is designed with a strict privacy gate:

- **Only structural metadata** is emitted (tool name, file basename, command verb)
- **No file content, arguments, or outputs** are ever transmitted
- **Agent depth inference** maps sub-agent calls to the correct hierarchy tier
- All events are one-way: terminal → game. No data flows back to the CLI.

---

## Project Status

| Component | Status |
|-----------|--------|
| Core renderer + tile map | ✅ Shipped |
| A2A protocol + EventBus | ✅ Shipped |
| Terminal bridge (Claude/Codex/Gemini/OpenCode) | ✅ Shipped |
| Agent sprites + animation | ✅ Shipped |
| XP + Evolution system | ✅ Shipped |
| KG Overlay (25 nodes) | ✅ Shipped |
| WebSocket spectator mode | ✅ Shipped |
| Debate overlay + state wiring | ✅ Shipped |
| Minimap with click-to-pan | ✅ Shipped |
| Camera focus / per-agent follow | ✅ Shipped |
| Mobile-responsive viewport | 🔜 Planned |
| Sound effects + music | 🔜 Planned |
| Multiplayer cursor sharing | 🔜 Planned |

---

## Related Projects

| Project | Role in Ecosystem |
|---------|-------------------|
| [awesome](https://github.com/RemyLoveLogicAI/awesome) | Architecture docs + ARCHITECTURE.md |
| [omni-agents](https://github.com/RemySr/omni-agents) | 4-tier self-healing agent platform |

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

*Built by agents, for agents, governed by a human.*

**LoveLogicAI LLC** · [@RemyLoveLogicAI](https://github.com/RemyLoveLogicAI)

</div>
