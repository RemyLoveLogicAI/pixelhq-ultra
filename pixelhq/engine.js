// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ PIXELHQ ULTRA — CORE ENGINE
// EventBus · A2AProtocol · PersonalityEngine · TerminalBridge
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// 📡 EVENT BUS — pub/sub spine of the system
// ─────────────────────────────────────────────
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }
  emit(event, data) {
    this._listeners.get(event)?.forEach(h => h(data));
    this._listeners.get("*")?.forEach(h => h({ event, data }));
  }
}

// ─────────────────────────────────────────────
// 🤝 A2A PROTOCOL — Agent-to-Agent messaging
// Implements Google A2A spec semantics locally
// ─────────────────────────────────────────────
export const A2A_MSG = {
  TASK_ASSIGN:   "task_assign",   // Boss → Anyone: here's work
  TASK_COMPLETE: "task_complete", // Anyone → Boss: done
  TASK_BLOCKED:  "task_blocked",  // Anyone → Supervisor: I'm stuck
  PEER_REVIEW:   "peer_review",   // Employee → Employee: check my work
  KNOWLEDGE_SHARE: "knowledge_share", // Anyone → All: learned something
  MEETING_CALL:  "meeting_call",  // Boss → Group: convene
  DEBATE_OPEN:   "debate_open",   // Two agents: disagree
  DEBATE_CLOSE:  "debate_close",
  WORK_HANDOFF:  "work_handoff",  // Pass artifact between agents
  STATUS_PING:   "status_ping",   // Heartbeat
  EVOLUTION_VOTE: "evolution_vote", // Agents vote on protocol changes
};

export class A2AProtocol {
  constructor(bus) {
    this.bus = bus;
    this.meetings = new Map();   // meetingId → { attendees, agenda, transcript }
    this.debates  = new Map();   // debateId → { a, b, topic, rounds }
    this.workItems = new Map();  // itemId → { owner, artifact, reviewers }
  }

  send(fromId, toId, type, payload) {
    const msg = {
      id:        `msg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      from:      fromId,
      to:        toId,            // null = broadcast
      type,
      payload,
      timestamp: Date.now(),
    };
    this.bus.emit("a2a:message", msg);
    if (toId) this.bus.emit(`a2a:to:${toId}`, msg);
    else      this.bus.emit("a2a:broadcast", msg);
    return msg.id;
  }

  assignTask(bossId, workerId, task) {
    return this.send(bossId, workerId, A2A_MSG.TASK_ASSIGN, { task });
  }

  completeTask(workerId, bossId, result) {
    return this.send(workerId, bossId, A2A_MSG.TASK_COMPLETE, { result });
  }

  shareWork(fromId, toId, artifact) {
    const id = `work-${Date.now()}`;
    this.workItems.set(id, { owner: fromId, artifact, reviewers: [] });
    return this.send(fromId, toId, A2A_MSG.WORK_HANDOFF, { itemId: id, artifact });
  }

  requestReview(fromId, toId, artifact) {
    return this.send(fromId, toId, A2A_MSG.PEER_REVIEW, { artifact });
  }

  broadcast(fromId, type, payload) {
    return this.send(fromId, null, type, payload);
  }

  callMeeting(organizerId, attendeeIds, agenda) {
    const meetingId = `mtg-${Date.now()}`;
    this.meetings.set(meetingId, {
      organizer: organizerId,
      attendees: [organizerId, ...attendeeIds],
      agenda,
      transcript: [],
      state: "convening",
    });
    this.send(organizerId, null, A2A_MSG.MEETING_CALL, { meetingId, attendeeIds, agenda });
    return meetingId;
  }

  recordMeetingStatement(meetingId, agentId, statement) {
    const m = this.meetings.get(meetingId);
    if (m) m.transcript.push({ agentId, statement, t: Date.now() });
  }

  openDebate(agentAId, agentBId, topic) {
    const debateId = `dbg-${Date.now()}`;
    this.debates.set(debateId, { a: agentAId, b: agentBId, topic, rounds: [] });
    this.send(agentAId, agentBId, A2A_MSG.DEBATE_OPEN, { debateId, topic });
    return debateId;
  }

  addDebateRound(debateId, agentId, argument) {
    const d = this.debates.get(debateId);
    if (d) d.rounds.push({ agentId, argument, t: Date.now() });
    this.bus.emit("debate:round", { debateId, agentId, argument });
  }

  shareKnowledge(fromId, insight) {
    return this.broadcast(fromId, A2A_MSG.KNOWLEDGE_SHARE, { insight });
  }
}

// ─────────────────────────────────────────────
// 🎭 PERSONALITY ENGINE — Terminal → Game Speech
// Transforms raw CLI output into character dialogue
// ─────────────────────────────────────────────
const SPEECH_TEMPLATES = {
  boss: {
    tool_bash:       ["Initiating system scan...", "Let's see what we're working with.", "Running the diagnostics."],
    tool_read:       ["Reviewing the blueprints.", "Pulling up the specifications.", "Let me assess the situation."],
    tool_write:      ["Drafting the implementation.", "Committing my vision to code.", "Laying the architectural foundation."],
    tool_edit:       ["Refining the approach.", "Optimizing our strategy.", "Iterating on the solution."],
    tool_task:       ["Delegating this module.", "Team, I need this handled.", "Spinning up a sub-task."],
    thinking:        ["Analyzing the optimal path...", "Considering the trade-offs...", "Strategy in progress..."],
    complete:        ["Excellent work, team!", "Mission accomplished.", "Delivering the goods."],
    error:           ["Recalibrating. Stand by.", "Obstacles are opportunities.", "Pivoting strategy."],
    meeting:         ["Team, we need to align.", "Let's sync up.", "Calling a rapid stand-up."],
    debate:          ["I propose we consider...", "From a strategic standpoint...", "The data suggests..."],
  },
  supervisor: {
    tool_bash:       ["Running the test suite.", "Executing the workflow.", "Checking system state."],
    tool_read:       ["Reviewing the codebase.", "Cross-referencing documentation.", "Scanning for context."],
    tool_write:      ["Coordinating the output.", "Scaffolding the module.", "Structuring the deliverable."],
    tool_edit:       ["Applying the changes.", "Updating per requirements.", "Integrating feedback."],
    tool_task:       ["Routing to team member.", "Assigning sub-task.", "Coordinating workflow."],
    thinking:        ["Mapping dependencies...", "Planning the sequence...", "Orchestrating steps..."],
    complete:        ["Checkpoint reached.", "Module complete. Handing off.", "Task verified."],
    error:           ["Handling the exception.", "Escalating to boss.", "Switching approach."],
    meeting:         ["Sync noted.", "Updating the board.", "Taking notes."],
    debate:          ["Here's the technical view:", "By the numbers...", "Architecturally speaking..."],
  },
  employee: {
    tool_bash:       ["On it! Running now.", "Let's gooo~", "Executing! 🚀", "Firing it up!"],
    tool_read:       ["Reading the file...", "Got it, scanning.", "Let me check that.", "Pulling this up!"],
    tool_write:      ["Writing the code!", "Building this out!", "On the keyboard, BRB.", "Crafting it now!"],
    tool_edit:       ["Making the tweaks!", "Patching this up!", "Quick fix incoming!", "On it!"],
    tool_task:       ["Passing this along!", "Handing to a colleague!", "Tag, you're in!"],
    thinking:        ["Hmm... let me think...", "Processing...", "Brain go brrr...", "Give me a sec..."],
    complete:        ["Done! ✓", "Shipped it!", "That's a wrap!", "Done and done!"],
    error:           ["Oops... fixing it!", "Bug found! On it.", "Ugh, let me debug this.", "One sec..."],
    meeting:         ["Here's what I found!", "My take:", "Actually, I think..."],
    debate:          ["Wait, but what if...", "I disagree, actually.", "Here's my counter-point:"],
  },
  intern: {
    tool_bash:       ["Y-yes! Running...", "On it! ...I think.", "Executing the command!"],
    tool_read:       ["R-reading now!", "Got it! Looking...", "Sure! Checking..."],
    tool_write:      ["Writing! Don't watch me...", "Coding... carefully!", "Here goes!"],
    tool_edit:       ["Editing... carefully.", "Small change!", "Is this right?"],
    tool_task:       ["I'll handle that!", "O-okay, I got this!"],
    thinking:        ["Um... hmm...", "Thinking really hard!", "...what was the question?"],
    complete:        ["D-done! Did I do okay?", "Finished! I hope it's right!", "Done!!"],
    error:           ["Oh no oh no...", "Um... there's an error...", "Is this bad?"],
    meeting:         ["*takes notes furiously*", "Noted! ...what does that mean?"],
    debate:          ["Well... maybe...", "I kind of agree but..."],
  },
};

const WORK_SUMMARIES = {
  tool_bash:  (txt) => `$ ${txt.slice(0, 40)}${txt.length > 40 ? "…" : ""}`,
  tool_read:  (txt) => `📖 ${txt.replace(/^.*\//, "").slice(0, 35)}`,
  tool_write: (txt) => `✍️ Writing ${txt.replace(/^.*\//, "").slice(0, 30)}`,
  tool_edit:  (txt) => `✏️ Editing ${txt.replace(/^.*\//, "").slice(0, 30)}`,
  tool_task:  (txt) => `📋 ${txt.slice(0, 40)}`,
  thinking:   (txt) => `💭 ${txt.slice(0, 50)}…`,
  complete:   (txt) => `✅ ${txt.slice(0, 50)}`,
  error:      (txt) => `⚠️ ${txt.slice(0, 40)}`,
};

export class PersonalityEngine {
  constructor() {
    this.templates = SPEECH_TEMPLATES;
  }

  // Pick a random speech line for this role + event
  speak(role, eventType) {
    const lines = this.templates[role]?.[eventType] || this.templates.employee[eventType] || ["..."];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // Generate a work-summary bubble (the "what I'm doing" readout)
  summarize(eventType, rawContent) {
    const fn = WORK_SUMMARIES[eventType];
    return fn ? fn(rawContent || "") : rawContent?.slice(0, 50) || "…";
  }

  // Given raw terminal text → personality-flavored speech for display
  translate(role, rawText, eventType) {
    const casual  = this.speak(role, eventType);
    const summary = this.summarize(eventType, rawText);
    return { casual, summary };
  }
}

// ─────────────────────────────────────────────
// 🔌 TERMINAL BRIDGE — WebSocket ↔ Game Events
// Connects to bridge.js server watching JSONL logs
// Maps real CLI events → game action triggers
// ─────────────────────────────────────────────
export const TERMINAL_EVENTS = {
  // Inbound from bridge.js
  TOOL_USE:     "tool_use",    // Agent used a tool
  TOOL_RESULT:  "tool_result", // Tool returned output
  AGENT_TEXT:   "agent_text",  // Agent produced text
  AGENT_THINK:  "agent_think", // Thinking / reasoning
  SUBAGENT_SPAWN: "subagent_spawn", // Sub-agent created
  SUBAGENT_DONE:  "subagent_done",  // Sub-agent completed
  SESSION_START:  "session_start",
  SESSION_END:    "session_end",
  // Game event types emitted by the bridge
  GAME_AGENT_MOVE:    "game:agent_move",
  GAME_AGENT_SPEAK:   "game:agent_speak",
  GAME_AGENT_WORK:    "game:agent_work",
  GAME_A2A_MESSAGE:   "game:a2a_message",
  GAME_MEETING_START: "game:meeting_start",
  GAME_MEETING_END:   "game:meeting_end",
  GAME_XP_GAIN:       "game:xp_gain",
  GAME_QUEST_UPDATE:  "game:quest_update",
};

// Map CLI tool names → game event types
const TOOL_EVENT_MAP = {
  "Bash":      "tool_bash",
  "Read":      "tool_read",
  "Write":     "tool_write",
  "Edit":      "tool_edit",
  "Task":      "tool_task",
  "Glob":      "tool_read",
  "Grep":      "tool_read",
  "WebFetch":  "tool_bash",
  "WebSearch": "tool_bash",
};

// Map tool → office destination tile key
export const TOOL_DESTINATION = {
  "tool_bash":  "terminalStation",
  "tool_read":  "filingCabinet",
  "tool_write": "workspaceCenter",
  "tool_edit":  "workspaceCenter",
  "tool_task":  "hallwayCenter",
  "thinking":   "workspaceCenter",
};

export class TerminalBridge {
  constructor(bus, engine, wsUrl = "ws://localhost:7890") {
    this.bus    = bus;
    this.engine = engine;
    this.wsUrl  = wsUrl;
    this.ws     = null;
    this.reconnectDelay = 1000;
    this.connected = false;
    this.mockMode  = false;   // fall back to demo events when no bridge
    this.mockTimerId = null;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen  = () => { this.connected = true; this.reconnectDelay = 1000; this.bus.emit("bridge:connected"); };
      this.ws.onclose = () => { this.connected = false; this._scheduleReconnect(); };
      this.ws.onerror = () => { this.mockMode = true; this._startMockEvents(); };
      this.ws.onmessage = ({ data }) => {
        try { this._handleRaw(JSON.parse(data)); } catch {}
      };
    } catch {
      this.mockMode = true;
      this._startMockEvents();
    }
  }

  _scheduleReconnect() {
    if (this.mockMode) return;
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  _handleRaw(raw) {
    const { type, agentId, toolName, content, subAgentId, role } = raw;
    const eventType = TOOL_EVENT_MAP[toolName] || type;
    const { casual, summary } = this.engine.translate(role || "employee", content || "", eventType);

    this.bus.emit(TERMINAL_EVENTS.GAME_AGENT_SPEAK, { agentId, text: casual, style: "speech" });
    this.bus.emit(TERMINAL_EVENTS.GAME_AGENT_WORK,  { agentId, summary, eventType });

    const dest = TOOL_DESTINATION[eventType];
    if (dest) this.bus.emit(TERMINAL_EVENTS.GAME_AGENT_MOVE, { agentId, destination: dest });

    if (type === "subagent_spawn") {
      this.bus.emit(TERMINAL_EVENTS.GAME_A2A_MESSAGE, { from: agentId, to: subAgentId, type: "task_assign", text: casual });
    }
    if (type === "subagent_done") {
      this.bus.emit(TERMINAL_EVENTS.GAME_A2A_MESSAGE, { from: subAgentId, to: agentId, type: "task_complete", text: casual });
      this.bus.emit(TERMINAL_EVENTS.GAME_XP_GAIN, { agentId, amount: 25, reason: "sub-task complete" });
    }
  }

  // Demo events when no bridge.js is running
  _startMockEvents() {
    if (this.mockTimerId !== null) return;
    const DEMO_EVENTS = [
      { type: "tool_use", agentId: "boss", toolName: "Task", content: "Analyze authentication module for security issues", role: "boss" },
      { type: "tool_use", agentId: "emp1", toolName: "Bash", content: "git log --oneline -20 && git diff main", role: "employee" },
      { type: "tool_use", agentId: "emp2", toolName: "Read", content: "/src/auth/jwt.ts", role: "employee" },
      { type: "subagent_spawn", agentId: "boss", subAgentId: "emp3", content: "Review the test coverage", role: "boss" },
      { type: "tool_use", agentId: "emp1", toolName: "Write", content: "/src/auth/jwt.ts", role: "employee" },
      { type: "tool_use", agentId: "sup1", toolName: "Edit", content: "/src/api/routes.ts", role: "supervisor" },
      { type: "agent_text", agentId: "boss", toolName: "Task", content: "Coordinate security review across all modules", role: "boss" },
      { type: "subagent_done", agentId: "emp3", subAgentId: "emp3", content: "Coverage analysis complete: 84%", role: "employee" },
      { type: "tool_use", agentId: "int1", toolName: "Read", content: "/tests/auth.test.ts", role: "intern" },
      { type: "tool_use", agentId: "emp2", toolName: "Bash", content: "pnpm test --coverage", role: "employee" },
    ];

    let i = 0;
    const next = () => {
      if (this.mockTimerId === null) return;
      this._handleRaw(DEMO_EVENTS[i % DEMO_EVENTS.length]);
      i++;
      this.mockTimerId = setTimeout(next, 2500 + Math.random() * 2000);
    };
    this.mockTimerId = setTimeout(next, 1000);

    // Trigger meetings occasionally
    setTimeout(() => {
      if (this.mockTimerId !== null) {
        this.bus.emit(TERMINAL_EVENTS.GAME_MEETING_START, {
          meetingId: "mtg-demo-1",
          organizer: "boss",
          attendees: ["boss", "sup1", "emp1"],
          agenda: "Sprint planning: auth module release",
        });
      }
    }, 12000);
  }

  disconnect() {
    this.ws?.close();
    if (this.mockTimerId !== null) {
      clearTimeout(this.mockTimerId);
      this.mockTimerId = null;
    }
  }
}
