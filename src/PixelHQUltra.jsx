import { useState, useEffect, useCallback, useRef, useReducer, useMemo } from "react";
import {
  EventBus, A2AProtocol, A2A_MSG, PersonalityEngine, TerminalBridge, TERMINAL_EVENTS,
  TOOL_DESTINATION,
} from "./engine.js";
import {
  TILE, WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H,
  T, TILE_STYLE, generateOfficeMap,
  WAYPOINTS, DEST_BY_EVENT, INITIAL_AGENTS, AGENT_ROLES, XP_TABLE, EVOLUTION_MILESTONES,
} from "./officeData.js";

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 SINGLETONS — created once, shared via context/closure
// ═══════════════════════════════════════════════════════════════════════════════
const bus      = new EventBus();
const a2a      = new A2AProtocol(bus);
const personas = new PersonalityEngine();
const OFFICE_MAP = generateOfficeMap();

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 STATE — reducer + initial state
// ═══════════════════════════════════════════════════════════════════════════════
function initAgents() {
  return Object.fromEntries(
    INITIAL_AGENTS.map(a => [a.id, { ...a, pos: { ...a.spawn } }])
  );
}

const INIT = {
  agents:      initAgents(),
  // Camera follows boss
  camera:      { x: WAYPOINTS.bossDesk.x - VIEWPORT_W / 2, y: WAYPOINTS.bossDesk.y - VIEWPORT_H / 2 },
  // Active meeting
  meeting:     null,   // { meetingId, attendees, agenda, transcript, phase }
  // Active debate
  debate:      null,   // { debateId, a, b, topic, rounds, turn }
  // Flying message particles
  particles:   [],     // [{ id, from, to, type, text, progress }]
  // Fog-of-war: set of "x,y" strings seen by camera
  revealed:    new Set(),
  // Terminal correlation feed
  termFeed:    [],     // [{ id, agentId, raw, translated, eventType, ts }]
  // Toast notifications
  toasts:      [],     // [{ id, text, color }]
  // HUD state
  bridgeConnected: false,
  selectedAgent: null,
  showHUD: true,
};

function reducer(state, action) {
  switch (action.type) {

    case "AGENT_MOVE": {
      const { agentId, pos } = action;
      const agents = {
        ...state.agents,
        [agentId]: { ...state.agents[agentId], pos, state: "walking" },
      };
      // Camera follows boss
      const camera = agentId === "boss"
        ? {
            x: Math.max(0, Math.min(WORLD_W - VIEWPORT_W, pos.x - Math.floor(VIEWPORT_W / 2))),
            y: Math.max(0, Math.min(WORLD_H - VIEWPORT_H, pos.y - Math.floor(VIEWPORT_H / 2))),
          }
        : state.camera;
      // Reveal tiles around new camera position
      const revealed = new Set(state.revealed);
      for (let dy = -2; dy <= VIEWPORT_H + 2; dy++)
        for (let dx = -2; dx <= VIEWPORT_W + 2; dx++)
          revealed.add(`${camera.x + dx},${camera.y + dy}`);
      return { ...state, agents, camera, revealed };
    }

    case "AGENT_STATE": {
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agentId]: { ...state.agents[action.agentId], state: action.agentState },
        },
      };
    }

    case "ADD_BUBBLE": {
      const agent = state.agents[action.agentId];
      if (!agent) return state;
      const bubble = {
        id:    `bbl-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
        text:  action.text,
        style: action.style || "speech",  // speech | think | shout | a2a | work
        color: action.color || agent.color,
        ts:    Date.now(),
      };
      const bubbles = [...(agent.bubbles || []).slice(-2), bubble];
      return {
        ...state,
        agents: { ...state.agents, [action.agentId]: { ...agent, bubbles } },
      };
    }

    case "EXPIRE_BUBBLES": {
      const now = Date.now();
      const agents = { ...state.agents };
      Object.keys(agents).forEach(id => {
        agents[id] = {
          ...agents[id],
          bubbles: (agents[id].bubbles || []).filter(b => now - b.ts < 5500),
        };
      });
      return { ...state, agents };
    }

    case "TERM_FEED": {
      const entry = { ...action.entry, id: `tf-${Date.now()}` };
      return { ...state, termFeed: [entry, ...state.termFeed].slice(0, 60) };
    }

    case "PARTICLE_ADD": {
      return {
        ...state,
        particles: [...state.particles, { ...action.particle, id: `p-${Date.now()}-${Math.random().toString(36).slice(2)}`, progress: 0 }],
      };
    }

    case "PARTICLE_TICK": {
      return {
        ...state,
        particles: state.particles
          .map(p => ({ ...p, progress: p.progress + action.delta }))
          .filter(p => p.progress < 1),
      };
    }

    case "MEETING_START": {
      return { ...state, meeting: { ...action.meeting, phase: "convening", transcript: [] } };
    }
    case "MEETING_STATEMENT": {
      if (!state.meeting) return state;
      return {
        ...state,
        meeting: {
          ...state.meeting,
          phase: "active",
          transcript: [...state.meeting.transcript, { agentId: action.agentId, text: action.text, ts: Date.now() }],
        },
      };
    }
    case "MEETING_END": {
      return { ...state, meeting: null };
    }

    case "DEBATE_START": {
      return { ...state, debate: { ...action.debate, turn: action.debate.a, rounds: [] } };
    }
    case "DEBATE_ROUND": {
      if (!state.debate) return state;
      const rounds = [...state.debate.rounds, { agentId: action.agentId, text: action.text, ts: Date.now() }];
      const turn   = action.agentId === state.debate.a ? state.debate.b : state.debate.a;
      return { ...state, debate: { ...state.debate, rounds, turn } };
    }
    case "DEBATE_END": {
      return { ...state, debate: null };
    }

    case "XP_GAIN": {
      const agent = state.agents[action.agentId];
      if (!agent) return state;
      let xp = agent.xp + action.amount;
      let level = agent.level;
      let xpToNext = agent.xpToNext;
      const evolution = [...agent.evolution];
      while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * 1.4);
        const milestone = EVOLUTION_MILESTONES[agent.role]?.[level];
        if (milestone) evolution.push({ level, ability: milestone, unlockedAt: Date.now() });
      }
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agentId]: { ...agent, xp, level, xpToNext, evolution },
        },
      };
    }

    case "STAT_INC": {
      const agent = state.agents[action.agentId];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agentId]: {
            ...agent,
            stats: { ...agent.stats, [action.stat]: (agent.stats[action.stat] || 0) + 1 },
          },
        },
      };
    }

    case "TOAST": {
      const toast = { id: `t-${Date.now()}`, text: action.text, color: action.color || "#238636" };
      return { ...state, toasts: [...state.toasts.slice(-3), toast] };
    }
    case "TOAST_EXPIRE": {
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    }

    case "BRIDGE_STATUS": {
      return { ...state, bridgeConnected: action.connected };
    }

    case "SELECT_AGENT": {
      return { ...state, selectedAgent: action.agentId === state.selectedAgent ? null : action.agentId };
    }

    case "TOGGLE_HUD": {
      return { ...state, showHUD: !state.showHUD };
    }

    default: return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 PIXEL CHARACTER SPRITE
// Renders the 2D color-grid pixel art sprite
// ═══════════════════════════════════════════════════════════════════════════════
function PixelCharacter({ spriteData, scale = 4, bobbing = false, walking = false }) {
  const rows = spriteData?.idle || [];
  return (
    <div style={{
      display: "inline-block",
      imageRendering: "pixelated",
      animation: bobbing ? "pixelBob 1.2s ease-in-out infinite" : walking ? "pixelWalk 0.4s steps(2) infinite" : "none",
    }}>
      {rows.map((row, y) => (
        <div key={y} style={{ display: "flex" }}>
          {row.map((color, x) => (
            <div key={x} style={{ width: scale, height: scale, background: color || "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 SPEECH BUBBLE
// Typewriter reveal, multiple styles, A2A indicator
// ═══════════════════════════════════════════════════════════════════════════════
function SpeechBubble({ bubble, agentColor }) {
  const [shown, setShown] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    let i = 0;
    setShown("");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      i++;
      setShown(bubble.text.slice(0, i));
      if (i >= bubble.text.length) clearInterval(timerRef.current);
    }, bubble.style === "work" ? 15 : 28);
    return () => clearInterval(timerRef.current);
  }, [bubble.id, bubble.text]);

  const styles = {
    speech: { bg: "#e8e8f0", fg: "#0d1117", border: agentColor || "#fff", radius: "10px 10px 10px 2px" },
    think:  { bg: "#1a1a2e", fg: "#8b949e",  border: "#30363d",           radius: "50%" },
    shout:  { bg: "#FFD700", fg: "#0d1117",  border: "#B8860B",           radius: 4 },
    a2a:    { bg: "#0d1f3c", fg: "#58a6ff",  border: "#4285F4",           radius: "2px 10px 10px 10px" },
    work:   { bg: "#0d1f0d", fg: "#7ee787",  border: "#238636",           radius: 4 },
  };
  const s = styles[bubble.style] || styles.speech;

  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 4px)",
      left: "50%",
      transform: "translateX(-50%)",
      background: s.bg,
      border: `2px solid ${s.border}`,
      borderRadius: s.radius,
      padding: "4px 7px",
      fontSize: 9,
      fontFamily: "'JetBrains Mono', monospace",
      color: s.fg,
      maxWidth: 180,
      minWidth: 40,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      lineHeight: 1.4,
      zIndex: 200,
      boxShadow: `0 2px 8px ${s.border}44`,
      pointerEvents: "none",
    }}>
      {bubble.style === "a2a" && (
        <div style={{ fontSize: 7, color: "#4285F4", marginBottom: 2, fontWeight: 700 }}>
          📡 A2A
        </div>
      )}
      {shown}
      {shown.length < bubble.text.length && (
        <span style={{ opacity: 0.5, animation: "blink 0.5s step-end infinite" }}>▊</span>
      )}
      {/* Tail */}
      <div style={{
        position: "absolute",
        bottom: -7,
        left: bubble.style === "a2a" ? 4 : "50%",
        transform: bubble.style === "a2a" ? "none" : "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `7px solid ${s.border}`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧑 AGENT SPRITE — positioned in world space
// ═══════════════════════════════════════════════════════════════════════════════
function AgentSprite({ agent, isSelected, onClick }) {
  const { pos, sprite, color, accent, name, role, state: agentState, bubbles, xp, xpToNext, level } = agent;
  const bobbing = agentState === "idle" || agentState === "working";
  const walking = agentState === "walking";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: pos.x * TILE - 14,
        top:  pos.y * TILE - TILE,
        width: TILE * 2,
        height: TILE * 2.5,
        cursor: "pointer",
        transition: "left 0.5s cubic-bezier(.4,0,.2,1), top 0.5s cubic-bezier(.4,0,.2,1)",
        zIndex: isSelected ? 50 : 20,
      }}
    >
      {/* Selected highlight */}
      {isSelected && (
        <div style={{
          position: "absolute", inset: -6,
          border: `2px dashed ${color}`,
          borderRadius: 4,
          animation: "pulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Speech bubbles (stack, newest on top) */}
      <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", width: 200, display: "flex", flexDirection: "column-reverse", gap: 4 }}>
        {(bubbles || []).map(b => (
          <SpeechBubble key={b.id} bubble={b} agentColor={color} />
        ))}
      </div>

      {/* Name badge */}
      <div style={{
        position: "absolute",
        top: -14,
        left: "50%",
        transform: "translateX(-50%)",
        background: accent + "cc",
        color: "#fff",
        fontSize: 7,
        fontFamily: "'JetBrains Mono', monospace",
        padding: "1px 5px",
        borderRadius: 3,
        whiteSpace: "nowrap",
        fontWeight: 700,
      }}>
        Lv.{level} {name}
      </div>

      {/* XP bar */}
      <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 36, height: 3, background: "#0d1117", borderRadius: 2 }}>
        <div style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>

      {/* Pixel art */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <PixelCharacter spriteData={sprite} scale={4} bobbing={bobbing} walking={walking} />
      </div>

      {/* State indicator dot */}
      <div style={{
        position: "absolute",
        bottom: 6,
        right: 6,
        width: 6, height: 6,
        borderRadius: "50%",
        background: agentState === "working" ? "#7ee787" : agentState === "meeting" ? "#fbbf24" : agentState === "walking" ? "#58a6ff" : "#8b949e",
        boxShadow: `0 0 4px ${agentState === "working" ? "#7ee787" : "#000"}`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✉️ MESSAGE PARTICLE — flies between agent positions
// ═══════════════════════════════════════════════════════════════════════════════
function MessageParticle({ particle, agents }) {
  const from = agents[particle.from];
  const to   = agents[particle.to];
  if (!from || !to) return null;
  const fx = from.pos.x * TILE, fy = from.pos.y * TILE;
  const tx = to.pos.x * TILE,   ty = to.pos.y * TILE;
  const t  = particle.progress;
  // Cubic bezier arc
  const cx = (fx + tx) / 2, cy = Math.min(fy, ty) - 60;
  const x  = (1-t)*(1-t)*fx + 2*(1-t)*t*cx + t*t*tx;
  const y  = (1-t)*(1-t)*fy + 2*(1-t)*t*cy + t*t*ty;

  const icons = {
    [A2A_MSG.TASK_ASSIGN]:    "📋",
    [A2A_MSG.TASK_COMPLETE]:  "✅",
    [A2A_MSG.PEER_REVIEW]:    "👁️",
    [A2A_MSG.WORK_HANDOFF]:   "📦",
    [A2A_MSG.KNOWLEDGE_SHARE]:"💡",
    [A2A_MSG.MEETING_CALL]:   "📅",
  };

  return (
    <div style={{
      position: "absolute",
      left: x - 12,
      top:  y - 12,
      width: 24, height: 24,
      fontSize: 14,
      textAlign: "center",
      lineHeight: "24px",
      zIndex: 100,
      filter: "drop-shadow(0 0 4px #4285F4)",
      transform: `scale(${0.7 + 0.3 * Math.sin(t * Math.PI)})`,
      pointerEvents: "none",
    }}>
      {icons[particle.type] || "📨"}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 MEETING OVERLAY — appears over the meeting room area
// ═══════════════════════════════════════════════════════════════════════════════
function MeetingOverlay({ meeting, agents, dispatch }) {
  if (!meeting) return null;
  const transcript = meeting.transcript || [];
  const bodyRef = useRef(null);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 9999, behavior: "smooth" }); }, [transcript.length]);

  return (
    <div style={{
      position: "fixed",
      right: 20,
      top: "50%",
      transform: "translateY(-50%)",
      width: 280,
      background: "#0d1117",
      border: "1px solid #21262d",
      borderRadius: 10,
      padding: 14,
      zIndex: 300,
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>
          📅 {meeting.phase === "convening" ? "Convening..." : "MEETING IN SESSION"}
        </div>
        <button
          onClick={() => dispatch({ type: "MEETING_END" })}
          style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 12 }}
        >✕</button>
      </div>

      <div style={{ fontSize: 9, color: "#586069", marginBottom: 8 }}>
        Agenda: <span style={{ color: "#e6edf3" }}>{meeting.agenda}</span>
      </div>

      {/* Attendees */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {(meeting.attendees || []).map(id => {
          const ag = agents[id];
          return ag ? (
            <div key={id} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: ag.accent + "33", color: ag.color, fontWeight: 700 }}>
              {ag.name}
            </div>
          ) : null;
        })}
      </div>

      {/* Transcript */}
      <div ref={bodyRef} style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {transcript.map((entry, i) => {
          const ag = agents[entry.agentId];
          return (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ag?.color || "#586069", marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 8, color: ag?.color || "#586069", fontWeight: 700 }}>{ag?.name || entry.agentId}</div>
                <div style={{ fontSize: 9, color: "#c9d1d9", lineHeight: 1.4 }}>{entry.text}</div>
              </div>
            </div>
          );
        })}
        {meeting.phase === "convening" && (
          <div style={{ fontSize: 9, color: "#586069", textAlign: "center", padding: 8 }}>
            Gathering agents...
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ OFFICE WORLD — panning tile map + all agents + particles
// ═══════════════════════════════════════════════════════════════════════════════
function OfficeWorld({ state, dispatch }) {
  const { agents, camera, particles, revealed, selectedAgent } = state;
  const vw = VIEWPORT_W * TILE;
  const vh = VIEWPORT_H * TILE;

  return (
    <div style={{
      width: vw,
      height: vh,
      overflow: "hidden",
      position: "relative",
      borderRadius: 8,
      border: "1px solid #21262d",
      boxShadow: "0 0 60px rgba(0,0,0,0.8)",
      flexShrink: 0,
    }}>
      {/* Scanline overlay for retro effect */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 400, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.07) 1px, rgba(0,0,0,0.07) 2px)",
      }} />

      {/* World container — scrolled by camera */}
      <div style={{
        position: "absolute",
        width: WORLD_W * TILE,
        height: WORLD_H * TILE,
        transform: `translate(${-camera.x * TILE}px, ${-camera.y * TILE}px)`,
        transition: "transform 0.35s cubic-bezier(.4,0,.2,1)",
        willChange: "transform",
      }}>
        {/* TILES */}
        {OFFICE_MAP.map((row, y) =>
          row.map((tileType, x) => {
            const style = TILE_STYLE[tileType] || TILE_STYLE[T.FLOOR];
            const isRevealed = revealed.has(`${x},${y}`);
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  position: "absolute",
                  left: x * TILE,
                  top:  y * TILE,
                  width: TILE, height: TILE,
                  background: style.bg,
                  border: style.border,
                  boxSizing: "border-box",
                  fontSize: TILE * 0.45,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  // Fog of war
                  filter: isRevealed ? "none" : "brightness(0.1)",
                  transition: "filter 0.8s ease",
                  overflow: "hidden",
                }}
              >
                {style.label || ""}
              </div>
            );
          })
        )}

        {/* AGENTS */}
        {Object.values(agents).map(agent => (
          <AgentSprite
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent === agent.id}
            onClick={() => dispatch({ type: "SELECT_AGENT", agentId: agent.id })}
          />
        ))}

        {/* PARTICLES — flying A2A messages */}
        {particles.map(p => (
          <MessageParticle key={p.id} particle={p} agents={agents} />
        ))}
      </div>

      {/* Room labels (fixed overlay) */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
        {/* These would be positioned based on camera offset — simplified here */}
        <div style={{ position: "absolute", top: 4, left: 4, fontSize: 8, color: "#30363d", fontFamily: "monospace" }}>
          CAM {camera.x},{camera.y}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 HUD — heads-up display: agent cards, XP, quests, connection status
// ═══════════════════════════════════════════════════════════════════════════════
function HUD({ state, dispatch }) {
  const { agents, bridgeConnected, selectedAgent, toasts } = state;
  const selected = selectedAgent ? agents[selectedAgent] : null;

  const roleOrder = [AGENT_ROLES.BOSS, AGENT_ROLES.SUPERVISOR, AGENT_ROLES.EMPLOYEE, AGENT_ROLES.INTERN];
  const sortedAgents = Object.values(agents).sort((a, b) =>
    roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  );

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: 240,
      flexShrink: 0,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      color: "#c9d1d9",
    }}>

      {/* Connection badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 6,
        background: bridgeConnected ? "#23863622" : "#f8514922",
        border: `1px solid ${bridgeConnected ? "#23863644" : "#f8514944"}`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: bridgeConnected ? "#3fb950" : "#f85149",
          boxShadow: `0 0 6px ${bridgeConnected ? "#3fb950" : "#f85149"}`,
          animation: bridgeConnected ? "none" : "blink 1s step-end infinite",
        }} />
        <span style={{ fontSize: 9, color: bridgeConnected ? "#3fb950" : "#f85149" }}>
          {bridgeConnected ? "Terminal Bridge Connected" : "Demo Mode (bridge.js offline)"}
        </span>
      </div>

      {/* Agent roster */}
      <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", marginBottom: 8, letterSpacing: "0.5px" }}>
          AGENT ROSTER
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sortedAgents.map(agent => (
            <div
              key={agent.id}
              onClick={() => dispatch({ type: "SELECT_AGENT", agentId: agent.id })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 8px",
                borderRadius: 6,
                background: selectedAgent === agent.id ? agent.accent + "18" : "transparent",
                border: `1px solid ${selectedAgent === agent.id ? agent.color + "44" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {/* Status dot */}
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: agent.state === "working" ? "#7ee787" : agent.state === "meeting" ? "#fbbf24" : agent.state === "walking" ? "#58a6ff" : "#484f58",
              }} />
              {/* Name + level */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: agent.color, fontWeight: 700, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Lv{agent.level} {agent.name}
                </div>
                {/* XP bar */}
                <div style={{ height: 2, background: "#21262d", borderRadius: 1, marginTop: 2, overflow: "hidden" }}>
                  <div style={{ width: `${(agent.xp / agent.xpToNext) * 100}%`, height: "100%", background: agent.color, borderRadius: 1, transition: "width 0.4s ease" }} />
                </div>
              </div>
              {/* Role badge */}
              <div style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: agent.accent + "22", color: agent.accent, flexShrink: 0 }}>
                {agent.role.slice(0, 3).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected agent detail panel */}
      {selected && (
        <div style={{ background: "#0d1117", border: `1px solid ${selected.color}44`, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: selected.color, marginBottom: 8 }}>
            {selected.name}
            <span style={{ fontSize: 8, color: "#8b949e", fontWeight: 400, marginLeft: 6 }}>
              [{selected.tool}]
            </span>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
            {[
              ["Tasks", selected.stats.tasksCompleted],
              ["Cmds",  selected.stats.commandsRun],
              ["Lines", selected.stats.linesWritten],
              ["Meets", selected.stats.meetings],
            ].map(([label, val]) => (
              <div key={label} style={{ textAlign: "center", padding: "4px 6px", background: "#161b22", borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: selected.color }}>{val}</div>
                <div style={{ fontSize: 7, color: "#8b949e" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* XP */}
          <div style={{ fontSize: 8, color: "#8b949e", marginBottom: 3 }}>
            XP: {selected.xp}/{selected.xpToNext}
          </div>
          <div style={{ height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{
              height: "100%",
              width: `${(selected.xp / selected.xpToNext) * 100}%`,
              background: `linear-gradient(90deg, ${selected.accent}, ${selected.color})`,
              borderRadius: 3,
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Evolution unlocks */}
          {selected.evolution.length > 0 && (
            <div>
              <div style={{ fontSize: 8, color: "#fbbf24", marginBottom: 4 }}>✨ Evolution Unlocks</div>
              {selected.evolution.map((e, i) => (
                <div key={i} style={{ fontSize: 8, color: "#d8b4fe", padding: "2px 0" }}>
                  Lv{e.level}: {e.ability}
                </div>
              ))}
            </div>
          )}

          {/* Current state */}
          <div style={{ fontSize: 8, color: "#586069", marginTop: 4 }}>
            Status: <span style={{ color: "#c9d1d9" }}>{selected.state}</span>
            &nbsp;·&nbsp;
            Pos: <span style={{ color: "#58a6ff" }}>{selected.pos.x},{selected.pos.y}</span>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 6, zIndex: 500 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: t.color,
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "slideInRight 0.2s ease",
          }}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📺 TERMINAL CORRELATION FEED
// Left panel: real terminal events → game translations
// ═══════════════════════════════════════════════════════════════════════════════
function TerminalFeed({ state }) {
  const { termFeed, agents } = state;
  const feedRef = useRef(null);
  useEffect(() => { feedRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [termFeed.length]);

  const EVENT_ICONS = {
    tool_bash:  "⌨️", tool_read: "📖", tool_write: "✍️",
    tool_edit:  "✏️", tool_task: "📋", thinking:   "💭",
    complete:   "✅", error:     "⚠️",
  };

  return (
    <div style={{
      width: 260,
      background: "#0d1117",
      border: "1px solid #21262d",
      borderRadius: 8,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
      flexShrink: 0,
    }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #21262d", fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: "0.5px" }}>
        TERMINAL CORRELATION
      </div>
      <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        {termFeed.length === 0 && (
          <div style={{ fontSize: 9, color: "#484f58", textAlign: "center", padding: 16 }}>
            Waiting for terminal activity...
          </div>
        )}
        {termFeed.map(entry => {
          const agent = agents[entry.agentId];
          return (
            <div key={entry.id} style={{
              padding: "6px 8px",
              background: "#161b22",
              border: `1px solid ${agent?.accent + "33" || "#21262d"}`,
              borderLeft: `3px solid ${agent?.accent || "#21262d"}`,
              borderRadius: 5,
              fontSize: 9,
              lineHeight: 1.4,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <span style={{ fontSize: 8 }}>{EVENT_ICONS[entry.eventType] || "•"}</span>
                <span style={{ color: agent?.color || "#8b949e", fontWeight: 700, fontSize: 8 }}>{agent?.name || entry.agentId}</span>
                <span style={{ color: "#484f58", fontSize: 7, marginLeft: "auto" }}>
                  {new Date(entry.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              {/* Raw terminal line (truncated) */}
              {entry.raw && (
                <div style={{ color: "#484f58", fontSize: 8, marginBottom: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  $ {entry.raw.slice(0, 40)}{entry.raw.length > 40 ? "…" : ""}
                </div>
              )}
              {/* Game translation */}
              <div style={{ color: "#7ee787", fontSize: 9 }}>
                {entry.translated}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 MAIN — PixelHQ ULTRA
// Wires all systems together
// ═══════════════════════════════════════════════════════════════════════════════
export default function PixelHQUltra() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const timeoutsRef = useRef([]);

  // ── On mount: reveal tiles around initial camera, connect bridge ────────────
  useEffect(() => {
    // Initial fog reveal around boss office
    const cam = INIT.camera;
    const revealed = new Set();
    for (let dy = -2; dy <= VIEWPORT_H + 2; dy++)
      for (let dx = -2; dx <= VIEWPORT_W + 2; dx++)
        revealed.add(`${cam.x + dx},${cam.y + dy}`);
    // Hack initial reveal into state via a move event
    dispatch({ type: "AGENT_MOVE", agentId: "boss", pos: WAYPOINTS.bossDesk });

    // Connect terminal bridge
    const bridge = new TerminalBridge(bus, personas);
    bridge.connect();

    // Wire bus events → reducer actions
    const unsubs = [
      bus.on("bridge:connected", () => dispatch({ type: "BRIDGE_STATUS", connected: true })),

      bus.on(TERMINAL_EVENTS.GAME_AGENT_MOVE, ({ agentId, destination }) => {
        const wp = WAYPOINTS[destination];
        if (wp) dispatch({ type: "AGENT_MOVE", agentId, pos: wp });
      }),

      bus.on(TERMINAL_EVENTS.GAME_AGENT_SPEAK, ({ agentId, text, style }) => {
        dispatch({ type: "ADD_BUBBLE", agentId, text, style });
      }),

      bus.on(TERMINAL_EVENTS.GAME_AGENT_WORK, ({ agentId, summary, eventType }) => {
        dispatch({ type: "ADD_BUBBLE", agentId, text: summary, style: "work" });
        dispatch({ type: "AGENT_STATE", agentId, agentState: "working" });
        dispatch({ type: "STAT_INC", agentId, stat: "commandsRun" });
        dispatch({ type: "XP_GAIN", agentId, amount: XP_TABLE.tool_use });
        dispatch({
          type: "TERM_FEED",
          entry: {
            agentId,
            raw: summary,
            translated: personas.speak(
              Object.values(INITIAL_AGENTS).find(a => a.id === agentId)?.role || "employee",
              eventType
            ),
            eventType,
            ts: Date.now(),
          },
        });
      }),

      bus.on(TERMINAL_EVENTS.GAME_A2A_MESSAGE, ({ from, to, type, text }) => {
        if (!to) return;
        // Fire particle
        dispatch({ type: "PARTICLE_ADD", particle: { from, to, type } });
        // Add bubble on sender
        dispatch({ type: "ADD_BUBBLE", agentId: from, text: text || "📡 A2A message", style: "a2a" });
        // After particle arrives, add bubble on receiver
        const tid = setTimeout(() => {
          dispatch({ type: "ADD_BUBBLE", agentId: to, text: "Got it!", style: "a2a", color: "#4285F4" });
        }, 1200);
        timeoutsRef.current.push(tid);
      }),

      bus.on(TERMINAL_EVENTS.GAME_MEETING_START, (meeting) => {
        dispatch({ type: "MEETING_START", meeting });
        // Move attendees toward meeting room
        (meeting.attendees || []).forEach((id, i) => {
          const chair = WAYPOINTS[`meetingChair${i + 1}`] || WAYPOINTS.meetingTable;
          const tid = setTimeout(() => {
            dispatch({ type: "AGENT_MOVE", agentId: id, pos: chair });
            dispatch({ type: "AGENT_STATE", agentId: id, agentState: "meeting" });
          }, i * 600);
          timeoutsRef.current.push(tid);
        });
        // Simulate meeting dialogue
        let delay = (meeting.attendees?.length || 1) * 700 + 400;
        const topics = [
          { id: meeting.attendees?.[0] || "boss", text: `Alright team, let's discuss: ${meeting.agenda}` },
          { id: meeting.attendees?.[1] || "sup1", text: "Based on current velocity, we can scope this in two sprints." },
          { id: meeting.attendees?.[2] || "emp1", text: "I already started the prototype — want to see it?" },
          { id: meeting.attendees?.[0] || "boss", text: "Great initiative. Let's set checkpoint for end of day." },
        ];
        topics.forEach(({ id, text }) => {
          const tid = setTimeout(() => {
            dispatch({ type: "MEETING_STATEMENT", agentId: id, text });
            dispatch({ type: "ADD_BUBBLE", agentId: id, text, style: "speech" });
            dispatch({ type: "XP_GAIN", agentId: id, amount: XP_TABLE.meeting_attend });
            dispatch({ type: "STAT_INC", agentId: id, stat: "meetings" });
          }, delay);
          timeoutsRef.current.push(tid);
          delay += 3000;
        });
        const endTid = setTimeout(() => dispatch({ type: "MEETING_END" }), delay + 1000);
        timeoutsRef.current.push(endTid);
      }),

      bus.on(TERMINAL_EVENTS.GAME_XP_GAIN, ({ agentId, amount, reason }) => {
        dispatch({ type: "XP_GAIN", agentId, amount });
        dispatch({ type: "TOAST", text: `⭐ +${amount} XP — ${reason}`, color: "#7e22ce" });
      }),
    ];

    // ── A2A bus events → particles + bubbles ───────────────────────────────
    const a2aSub = bus.on("a2a:message", (msg) => {
      if (!msg.to) return;
      dispatch({ type: "PARTICLE_ADD", particle: { from: msg.from, to: msg.to, type: msg.type } });
      const fromAgent = Object.values(INITIAL_AGENTS).find(a => a.id === msg.from);
      const text = personas.speak(fromAgent?.role || "employee", "tool_task");
      dispatch({ type: "ADD_BUBBLE", agentId: msg.from, text, style: "a2a" });
    });
    unsubs.push(a2aSub);

    // ── Periodic timers ───────────────────────────────────────────────────────
    // Expire old bubbles
    const bubbleTimer = setInterval(() => dispatch({ type: "EXPIRE_BUBBLES" }), 1000);
    // Animate particles
    const particleTimer = setInterval(() => dispatch({ type: "PARTICLE_TICK", delta: 0.035 }), 40);
    // Idle: make agents return home occasionally
    const idleTimer = setInterval(() => {
      const agentList = Object.values(INIT.agents);
      const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
      dispatch({ type: "AGENT_STATE", agentId: randomAgent.id, agentState: "idle" });
    }, 8000);

    return () => {
      unsubs.forEach(u => u());
      clearInterval(bubbleTimer);
      clearInterval(particleTimer);
      clearInterval(idleTimer);
      timeoutsRef.current.forEach(tid => clearTimeout(tid));
      timeoutsRef.current = [];
      bridge.disconnect();
    };
  }, []);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      background: "linear-gradient(135deg, #040408 0%, #080d14 100%)",
      color: "#c9d1d9",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      userSelect: "none",
    }}>
      <style>{`
        @keyframes pixelBob {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-2px); }
        }
        @keyframes pixelWalk {
          0%   { transform: translateX(-1px); }
          100% { transform: translateX(1px); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        borderBottom: "1px solid #21262d",
        background: "#0d1117",
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          background: "linear-gradient(135deg, #FFD700, #10A37F, #4285F4, #A855F7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          ⚡ PixelHQ ULTRA
        </div>
        <div style={{ fontSize: 10, color: "#586069" }}>
          Multi-Agent · A2A Protocol · Terminal Correlation · Evolution Engine
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              // Trigger a manual meeting for demo
              bus.emit(TERMINAL_EVENTS.GAME_MEETING_START, {
                meetingId: `mtg-${Date.now()}`,
                organizer: "boss",
                attendees: ["boss", "sup1", "emp1", "emp2"],
                agenda: "Architecture review & sprint alignment",
              });
            }}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid #21262d",
              background: "#161b22", color: "#fbbf24", fontSize: 10, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            📅 Call Meeting
          </button>
          <button
            onClick={() => {
              // Trigger debate demo
              const debateId = a2a.openDebate("emp1", "emp2", "REST vs GraphQL for the API layer");
              dispatch({ type: "ADD_BUBBLE", agentId: "emp1", text: "REST is simpler and more cacheable!", style: "shout" });
              setTimeout(() => {
                dispatch({ type: "ADD_BUBBLE", agentId: "emp2", text: "But GraphQL gives clients exactly what they need!", style: "shout" });
              }, 2000);
              setTimeout(() => {
                dispatch({ type: "ADD_BUBBLE", agentId: "emp1", text: "Fine... but what about our existing tooling?", style: "speech" });
              }, 4500);
              setTimeout(() => {
                dispatch({ type: "ADD_BUBBLE", agentId: "sup1", text: "Team: both have merit. Let me escalate.", style: "speech" });
                dispatch({ type: "ADD_BUBBLE", agentId: "boss", text: "Use GraphQL. Moving on.", style: "shout" });
              }, 7000);
            }}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid #21262d",
              background: "#161b22", color: "#f85149", fontSize: 10, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            ⚔️ Start Debate
          </button>
          <button
            onClick={() => {
              // Knowledge share demo
              a2a.shareKnowledge("emp1", "Using memoization cut render time by 40%!");
              dispatch({ type: "ADD_BUBBLE", agentId: "emp1", text: "💡 Just learned: memoization cut render time by 40%!", style: "speech" });
              ["sup1", "emp2", "emp3"].forEach((id, i) => {
                setTimeout(() => {
                  dispatch({ type: "ADD_BUBBLE", agentId: id, text: "📡 Knowledge received!", style: "a2a" });
                  dispatch({ type: "XP_GAIN", agentId: id, amount: XP_TABLE.knowledge_share });
                }, (i + 1) * 800);
              });
            }}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid #21262d",
              background: "#161b22", color: "#10b981", fontSize: 10, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            💡 Share Knowledge
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_HUD" })}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid #21262d",
              background: "#161b22", color: "#8b949e", fontSize: 10, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {state.showHUD ? "Hide" : "Show"} HUD
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", gap: 12, padding: 12, flex: 1, overflow: "hidden", alignItems: "flex-start" }}>

        {/* LEFT: Terminal Correlation Feed */}
        <TerminalFeed state={state} />

        {/* CENTER: The Office World */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <OfficeWorld state={state} dispatch={dispatch} />
        </div>

        {/* RIGHT: HUD */}
        {state.showHUD && <HUD state={state} dispatch={dispatch} />}

      </div>

      {/* MEETING OVERLAY */}
      <MeetingOverlay meeting={state.meeting} agents={state.agents} dispatch={dispatch} />

      {/* FOOTER */}
      <div style={{
        padding: "6px 20px",
        borderTop: "1px solid #21262d",
        display: "flex",
        gap: 16,
        fontSize: 9,
        color: "#484f58",
        background: "#0d1117",
        flexShrink: 0,
      }}>
        <span>Agents: {Object.keys(state.agents).length}</span>
        <span>Particles: {state.particles.length}</span>
        <span>Feed: {state.termFeed.length} events</span>
        <span>Camera: {state.camera.x},{state.camera.y}</span>
        <span style={{ marginLeft: "auto" }}>
          A2A · MCP-compatible · Fog-of-War · Evolution Engine
        </span>
      </div>
    </div>
  );
}
