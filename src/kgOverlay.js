// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ PIXELHQ ULTRA — KNOWLEDGE GRAPH OVERLAY
//
// Maps the 25-node LoveLogicAI Agent Knowledge Graph onto the PixelHQ tile-map.
// Renders as a toggleable semi-transparent layer with:
//   - Tier-colored glowing nodes pinned to tile coordinates
//   - 29 typed, directional edges with animated flow particles
//   - Hover tooltips and click-to-inspect panels
//   - EventBus integration for real-time agent↔node correlation
//
// Usage:
//   import { KGOverlay, KG_NODES, KG_EDGES } from "./kgOverlay.js";
//   // In your render loop:
//   kgOverlay.render(ctx, camera, { hoveredNode, selectedNode });
// ═══════════════════════════════════════════════════════════════════════════════

import { TILE, WORLD_W, WORLD_H, WAYPOINTS } from "./officeData.js";

// ─── TIER COLORS ─────────────────────────────────────────────────────────────
export const TIER_STYLE = {
  0: { fill: "#FFD700", glow: "#FFD70088", border: "#D4A800", label: "Principal" },
  1: { fill: "#4A6FA5", glow: "#4A6FA588", border: "#345A8A", label: "Core System" },
  2: { fill: "#7C3AED", glow: "#7C3AED88", border: "#6025C0", label: "Subsystem" },
  3: { fill: "#059669", glow: "#05966988", border: "#047857", label: "Platform" },
  4: { fill: "#DC2626", glow: "#DC262688", border: "#B91C1C", label: "Notion DB" },
};

// ─── EDGE TYPE COLORS ────────────────────────────────────────────────────────
export const EDGE_STYLE = {
  govern:      { color: "#F97316", dash: [],     width: 2.5, label: "Govern" },
  orchestrate: { color: "#3B82F6", dash: [],     width: 2,   label: "Orchestrate" },
  deploy:      { color: "#22C55E", dash: [],     width: 2,   label: "Deploy" },
  data:        { color: "#EAB308", dash: [],     width: 1.5, label: "Data" },
  auth:        { color: "#A855F7", dash: [],     width: 2,   label: "Auth" },
  comms:       { color: "#EF4444", dash: [],     width: 1.5, label: "Comms" },
  sync:        { color: "#06B6D4", dash: [6, 4], width: 1.5, label: "Sync" },
  infra:       { color: "#6B7280", dash: [4, 4], width: 1.5, label: "Infra" },
};

// ─── NODE DEFINITIONS ────────────────────────────────────────────────────────
// Tile coordinates map to PixelHQ's 60×38 world grid.
// Tier 0 (Principal)  → Boss office
// Tier 1 (Core)       → Major rooms
// Tier 2 (Subsystems) → Adjacent to parents
// Tier 3 (Platforms)  → Peripheral zones
// Tier 4 (Notion DBs) → Server room cluster
export const KG_NODES = {
  // ── Tier 0: Principal ──
  remy:         { id: "remy",         label: "Remy Sr",          short: "👤 Principal",    tier: 0, x: 55, y: 5,  desc: "Governance principal. Orchestrates all systems." },

  // ── Tier 1: Core Systems ──
  agentos:      { id: "agentos",      label: "AgentOS",          short: "🛡️ Kernel",       tier: 1, x: 28, y: 6,  desc: "Central governance kernel. Policy engine + agent deployment." },
  pixelhq:      { id: "pixelhq",      label: "PixelHQ ULTRA",    short: "🎮 Orch+Viz",     tier: 1, x: 16, y: 10, desc: "Multi-agent orchestration with pixel-art visualization." },
  notionkg:     { id: "notionkg",     label: "Notion KG",        short: "🧠 SoT",          tier: 1, x: 7,  y: 6,  desc: "Universal knowledge graph. Source of truth." },
  omniagents:   { id: "omniagents",   label: "OmniAgents",       short: "🤖 4T-Heal",      tier: 1, x: 40, y: 15, desc: "4-tier self-healing autonomous agent platform." },
  mcpserver:    { id: "mcpserver",    label: "MCP Server",       short: "🔌 Protocol",     tier: 1, x: 50, y: 15, desc: "Model Context Protocol gateway + auth layer." },

  // ── Tier 2: Subsystems ──
  openclaw:     { id: "openclaw",     label: "OpenClaw",         short: "🦞 Deploy",       tier: 2, x: 30, y: 12, desc: "Multi-platform agent deployment. WebSocket gateway." },
  aticgf:       { id: "aticgf",       label: "ATIC-GF",          short: "📜 Events",       tier: 2, x: 22, y: 3,  desc: "Autonomous event ledger framework." },
  rip:          { id: "rip",          label: "R.I.P.",           short: "⚰️ Identity",     tier: 2, x: 38, y: 20, desc: "Remy Identity Protocol. Agent lifecycle mgmt." },
  idmesh:       { id: "idmesh",       label: "Identity Mesh",    short: "🔐 Auth",         tier: 2, x: 50, y: 20, desc: "Cross-agent auth fabric. Least-privilege enforcement." },
  macmini:      { id: "macmini",      label: "Mac Mini M4",      short: "💻 Compute",      tier: 2, x: 50, y: 27, desc: "Headless deployment server. Local compute." },
  cmdpalette:   { id: "cmdpalette",   label: "Cmd Palette",      short: "🎛️ CLI",          tier: 2, x: 55, y: 20, desc: "Multi-CLI command palette with OAuth vault." },

  // ── Tier 3: Platforms ──
  github:       { id: "github",       label: "GitHub",           short: "🐙 Code",         tier: 3, x: 3,  y: 15, desc: "233+ repos. CI/CD pipelines." },
  vercel:       { id: "vercel",       label: "Vercel",           short: "▲ Deploy",        tier: 3, x: 3,  y: 20, desc: "Frontend + serverless deployment." },
  supabase:     { id: "supabase",     label: "Supabase",         short: "⚡ Backend",      tier: 3, x: 55, y: 30, desc: "Database, auth, realtime backend." },
  slack:        { id: "slack",        label: "Slack",            short: "💬 Comms",         tier: 3, x: 35, y: 25, desc: "Team communication channel." },
  telegram:     { id: "telegram",     label: "Telegram",         short: "✈️ Comms",        tier: 3, x: 35, y: 30, desc: "Bot agent platform." },
  linear:       { id: "linear",       label: "Linear",           short: "📐 Tracking",     tier: 3, x: 3,  y: 10, desc: "Issue tracking synced with Notion." },
  cloudflare:   { id: "cloudflare",   label: "Cloudflare",       short: "☁️ Edge",         tier: 3, x: 55, y: 35, desc: "Edge compute, Workers, D1/KV." },
  huggingface:  { id: "huggingface",  label: "HuggingFace",      short: "🤗 Models",       tier: 3, x: 55, y: 25, desc: "Model hosting + inference endpoints." },
  socialpipe:   { id: "socialpipe",   label: "Social Pipeline",  short: "📱 Social",       tier: 3, x: 30, y: 30, desc: "Cross-platform social automation." },

  // ── Tier 4: Notion Databases ──
  projectsdb:   { id: "projectsdb",   label: "Projects DB",      short: "📊 Projects",     tier: 4, x: 8,  y: 3,  desc: "Active project tracking." },
  sessionsdb:   { id: "sessionsdb",   label: "Sessions DB",      short: "🔄 Sessions",     tier: 4, x: 4,  y: 3,  desc: "Session Handoff Logs." },
  decisionsdb:  { id: "decisionsdb",  label: "Decisions DB",     short: "⚖️ Decisions",    tier: 4, x: 4,  y: 8,  desc: "Decision Log with rationale + tradeoffs." },
  riskregister: { id: "riskregister", label: "Risk Register",    short: "🚨 Risk",         tier: 4, x: 8,  y: 8,  desc: "Risk tracking with mitigations." },
};

// ─── EDGE DEFINITIONS ────────────────────────────────────────────────────────
// 29 typed, directional edges
export const KG_EDGES = [
  // Principal governance (5)
  { from: "remy", to: "agentos",    type: "govern" },
  { from: "remy", to: "pixelhq",    type: "govern" },
  { from: "remy", to: "notionkg",   type: "govern" },
  { from: "remy", to: "omniagents", type: "govern" },
  { from: "remy", to: "mcpserver",  type: "govern" },
  // AgentOS (3)
  { from: "agentos", to: "openclaw",  type: "deploy" },
  { from: "agentos", to: "aticgf",    type: "data" },
  { from: "agentos", to: "pixelhq",   type: "orchestrate" },
  // PixelHQ ULTRA (3)
  { from: "pixelhq", to: "macmini",   type: "infra" },
  { from: "pixelhq", to: "vercel",    type: "deploy" },
  { from: "pixelhq", to: "mcpserver", type: "orchestrate" },
  // Notion KG (6)
  { from: "notionkg", to: "projectsdb",   type: "data" },
  { from: "notionkg", to: "sessionsdb",   type: "data" },
  { from: "notionkg", to: "decisionsdb",  type: "data" },
  { from: "notionkg", to: "riskregister", type: "data" },
  { from: "notionkg", to: "github",       type: "sync" },
  { from: "notionkg", to: "linear",       type: "sync" },
  // OmniAgents (4)
  { from: "omniagents", to: "rip",        type: "auth" },
  { from: "omniagents", to: "slack",      type: "comms" },
  { from: "omniagents", to: "telegram",   type: "comms" },
  { from: "omniagents", to: "socialpipe", type: "comms" },
  // MCP Server (5)
  { from: "mcpserver", to: "idmesh",      type: "auth" },
  { from: "mcpserver", to: "cmdpalette",  type: "data" },
  { from: "mcpserver", to: "supabase",    type: "data" },
  { from: "mcpserver", to: "cloudflare",  type: "infra" },
  { from: "mcpserver", to: "huggingface", type: "data" },
  // Cross-subsystem (3)
  { from: "openclaw", to: "macmini",      type: "deploy" },
  { from: "idmesh",   to: "rip",          type: "auth" },
  { from: "aticgf",   to: "notionkg",     type: "data" },
  // Platform-to-platform (1)
  { from: "github",   to: "vercel",       type: "deploy" },
];

// ─── OVERLAY RENDERER ────────────────────────────────────────────────────────
export class KGOverlay {
  constructor(bus) {
    this.bus = bus;
    this.visible = false;
    this.hoveredNode = null;
    this.selectedNode = null;
    this.particles = [];
    this._particleId = 0;
    this._animFrame = 0;

    // Listen for agent correlation events
    if (bus) {
      bus.on("kg:toggle", () => { this.visible = !this.visible; });
      bus.on("kg:select", ({ nodeId }) => { this.selectedNode = nodeId; });
      bus.on("kg:hover",  ({ nodeId }) => { this.hoveredNode = nodeId; });

      // Correlate terminal events → KG node pulses
      bus.on("a2a:message", (msg) => {
        if (!this.visible) return;
        this._spawnParticle(msg.from, msg.to, msg.type);
      });
    }
  }

  toggle() { this.visible = !this.visible; }

  // ── Particle system for edge flow ──────────────────────────────────────────
  _spawnParticle(fromAgent, toAgent, msgType) {
    // Map agent IDs to KG node IDs (best-effort correlation)
    const agentToNode = {
      boss: "remy", sup1: "agentos", emp1: "pixelhq",
      emp2: "omniagents", emp3: "mcpserver",
      intern1: "openclaw", intern2: "aticgf",
    };
    const fromNode = agentToNode[fromAgent];
    const toNode = agentToNode[toAgent];
    if (!fromNode || !toNode || !KG_NODES[fromNode] || !KG_NODES[toNode]) return;

    this.particles.push({
      id: ++this._particleId,
      from: fromNode,
      to: toNode,
      progress: 0,          // 0→1
      speed: 0.015 + Math.random() * 0.01,
      color: EDGE_STYLE[msgType]?.color || "#ffffff",
    });
  }

  _tickParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].progress += this.particles[i].speed;
      if (this.particles[i].progress >= 1) this.particles.splice(i, 1);
    }
  }

  // ── Hit test for mouse interaction ─────────────────────────────────────────
  hitTest(worldX, worldY) {
    const NODE_RADIUS = 1.2; // tiles
    for (const [id, node] of Object.entries(KG_NODES)) {
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy < NODE_RADIUS * NODE_RADIUS) return id;
    }
    return null;
  }

  // ── Main render ────────────────────────────────────────────────────────────
  render(ctx, camera, dt) {
    if (!this.visible) return;
    this._animFrame++;
    this._tickParticles();

    const ox = -camera.x * TILE;
    const oy = -camera.y * TILE;

    ctx.save();
    ctx.translate(ox, oy);

    // Background dim
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, WORLD_W * TILE, WORLD_H * TILE);

    // Draw edges first (under nodes)
    this._drawEdges(ctx);

    // Draw particles on edges
    this._drawParticles(ctx);

    // Draw nodes
    this._drawNodes(ctx);

    // Draw tooltip for hovered node
    if (this.hoveredNode && KG_NODES[this.hoveredNode]) {
      this._drawTooltip(ctx, KG_NODES[this.hoveredNode]);
    }

    // Draw info panel for selected node
    if (this.selectedNode && KG_NODES[this.selectedNode]) {
      this._drawInfoPanel(ctx, KG_NODES[this.selectedNode]);
    }

    ctx.restore();
  }

  // ── Edge rendering ─────────────────────────────────────────────────────────
  _drawEdges(ctx) {
    for (const edge of KG_EDGES) {
      const from = KG_NODES[edge.from];
      const to = KG_NODES[edge.to];
      if (!from || !to) continue;

      const style = EDGE_STYLE[edge.type] || EDGE_STYLE.data;
      const highlight =
        this.hoveredNode === edge.from || this.hoveredNode === edge.to ||
        this.selectedNode === edge.from || this.selectedNode === edge.to;

      ctx.save();
      ctx.strokeStyle = highlight ? style.color : style.color + "88";
      ctx.lineWidth = highlight ? style.width + 1 : style.width;
      ctx.setLineDash(style.dash);

      // Bezier curve for organic feel
      const x1 = from.x * TILE + TILE / 2;
      const y1 = from.y * TILE + TILE / 2;
      const x2 = to.x * TILE + TILE / 2;
      const y2 = to.y * TILE + TILE / 2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const cpx = mx + (y2 - y1) * 0.15;
      const cpy = my - (x2 - x1) * 0.15;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
      ctx.stroke();

      // Arrowhead
      if (edge.type !== "sync") {
        const t = 0.92;
        const ax = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpx + t * t * x2;
        const ay = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpy + t * t * y2;
        const angle = Math.atan2(y2 - ay, x2 - ax);
        const hs = 6;
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hs * Math.cos(angle - 0.4), y2 - hs * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - hs * Math.cos(angle + 0.4), y2 - hs * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── Particle rendering ─────────────────────────────────────────────────────
  _drawParticles(ctx) {
    for (const p of this.particles) {
      const from = KG_NODES[p.from];
      const to = KG_NODES[p.to];
      if (!from || !to) continue;

      const x1 = from.x * TILE + TILE / 2;
      const y1 = from.y * TILE + TILE / 2;
      const x2 = to.x * TILE + TILE / 2;
      const y2 = to.y * TILE + TILE / 2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const cpx = mx + (y2 - y1) * 0.15;
      const cpy = my - (x2 - x1) * 0.15;

      // Quadratic bezier interpolation
      const t = p.progress;
      const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpx + t * t * x2;
      const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpy + t * t * y2;

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Node rendering ─────────────────────────────────────────────────────────
  _drawNodes(ctx) {
    const pulse = Math.sin(this._animFrame * 0.05) * 0.3 + 0.7;

    for (const [id, node] of Object.entries(KG_NODES)) {
      const style = TIER_STYLE[node.tier];
      const cx = node.x * TILE + TILE / 2;
      const cy = node.y * TILE + TILE / 2;
      const r = node.tier === 0 ? 14 : node.tier <= 1 ? 11 : node.tier <= 2 ? 9 : 7;
      const isHovered = this.hoveredNode === id;
      const isSelected = this.selectedNode === id;

      ctx.save();

      // Glow
      if (isHovered || isSelected || node.tier === 0) {
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = isSelected ? 20 : isHovered ? 15 : 10 * pulse;
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = style.border + (isHovered ? "ee" : "88");
      ctx.fill();

      // Inner fill
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      grad.addColorStop(0, style.fill);
      grad.addColorStop(1, style.border);
      ctx.fillStyle = grad;
      ctx.fill();

      // Label
      ctx.shadowBlur = 0;
      ctx.font = `bold ${node.tier <= 1 ? 9 : 7}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      const labelY = cy + r + 4;
      ctx.strokeText(node.short, cx, labelY);
      ctx.fillText(node.short, cx, labelY);

      ctx.restore();
    }
  }

  // ── Tooltip (hover) ────────────────────────────────────────────────────────
  _drawTooltip(ctx, node) {
    const style = TIER_STYLE[node.tier];
    const cx = node.x * TILE + TILE / 2;
    const cy = node.y * TILE - 20;
    const text = node.label;

    ctx.save();
    ctx.font = "bold 10px monospace";
    const w = ctx.measureText(text).width + 12;
    const h = 18;

    ctx.fillStyle = "#0a0a12ee";
    ctx.strokeStyle = style.fill;
    ctx.lineWidth = 1;
    _roundRect(ctx, cx - w / 2, cy - h, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = style.fill;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy - h / 2);
    ctx.restore();
  }

  // ── Info panel (selected) ──────────────────────────────────────────────────
  _drawInfoPanel(ctx, node) {
    const style = TIER_STYLE[node.tier];
    const px = 10;
    const py = 10;
    const pw = 220;
    const ph = 100;

    // Count edges
    const edges = KG_EDGES.filter(e => e.from === node.id || e.to === node.id);

    ctx.save();
    // Panel background
    ctx.fillStyle = "#0a0a12ee";
    ctx.strokeStyle = style.fill;
    ctx.lineWidth = 2;
    _roundRect(ctx, px, py, pw, ph, 6);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = style.fill;
    ctx.textAlign = "left";
    ctx.fillText(node.label, px + 10, py + 18);

    // Tier badge
    ctx.font = "8px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(`Tier ${node.tier} · ${style.label}`, px + 10, py + 32);

    // Description
    ctx.font = "9px monospace";
    ctx.fillStyle = "#ccc";
    const words = node.desc.split(" ");
    let line = "";
    let lineY = py + 48;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > pw - 20) {
        ctx.fillText(line.trim(), px + 10, lineY);
        lineY += 12;
        line = word + " ";
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), px + 10, lineY);

    // Edge count
    ctx.font = "8px monospace";
    ctx.fillStyle = "#666";
    ctx.fillText(`${edges.length} connections`, px + 10, py + ph - 10);

    ctx.restore();
  }

  // ── Get connected nodes for highlighting ───────────────────────────────────
  getConnected(nodeId) {
    const connected = new Set();
    for (const edge of KG_EDGES) {
      if (edge.from === nodeId) connected.add(edge.to);
      if (edge.to === nodeId) connected.add(edge.from);
    }
    return connected;
  }

  // ── Legend renderer ────────────────────────────────────────────────────────
  renderLegend(ctx, x, y) {
    if (!this.visible) return;

    ctx.save();
    ctx.fillStyle = "#0a0a12dd";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    _roundRect(ctx, x, y, 150, 180, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("KG OVERLAY", x + 10, y + 16);

    // Tier legend
    ctx.font = "8px monospace";
    let ly = y + 32;
    for (const [tier, style] of Object.entries(TIER_STYLE)) {
      ctx.fillStyle = style.fill;
      ctx.beginPath();
      ctx.arc(x + 16, ly - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#aaa";
      ctx.fillText(`T${tier}: ${style.label}`, x + 26, ly);
      ly += 14;
    }

    // Edge legend
    ly += 4;
    ctx.fillStyle = "#888";
    ctx.fillText("─── Edges ───", x + 10, ly);
    ly += 14;
    for (const [type, style] of Object.entries(EDGE_STYLE)) {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.setLineDash(style.dash);
      ctx.beginPath();
      ctx.moveTo(x + 10, ly - 3);
      ctx.lineTo(x + 30, ly - 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#aaa";
      ctx.font = "7px monospace";
      ctx.fillText(style.label, x + 36, ly);
      ly += 12;
    }

    ctx.restore();
  }
}

// ── Utility: rounded rect ────────────────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
