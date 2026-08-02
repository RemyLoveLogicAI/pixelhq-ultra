// ═══════════════════════════════════════════════════════════════════════════════
// 🛰️  PIXELHQ ULTRA — REACTIVE A2A BUS CLIENT
//
// Subscribes to the remote Agent-to-Agent comm hub over a persistent WebSocket
// and pushes messages onto a local EventBus *reactively* (onmessage), replacing
// the previous HTTP long-poll loop. Isomorphic: the WebSocket implementation is
// injected, so the same client runs in the browser (global WebSocket) and in
// Node (the `ws` package).
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_A2A_BUS_URL = "wss://a2a-mattermost.shares.zrok.io/bus";
export const DEFAULT_A2A_TOPIC = "a2a-comm-hub";

/** Build the topic-scoped bus URL, e.g. wss://host/bus?topic=a2a-comm-hub */
export function buildBusUrl(baseUrl = DEFAULT_A2A_BUS_URL, topic = DEFAULT_A2A_TOPIC) {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}topic=${encodeURIComponent(topic)}`;
}

/** Resolve a WebSocket constructor: explicit impl → global WebSocket (browser). */
function resolveWebSocket(WebSocketImpl) {
  if (WebSocketImpl) return WebSocketImpl;
  if (typeof globalThis !== "undefined" && globalThis.WebSocket) return globalThis.WebSocket;
  throw new Error("No WebSocket implementation available — pass { WebSocketImpl }");
}

export class A2ABusClient {
  /**
   * @param {object}   opts
   * @param {object}   opts.bus            EventBus-like target ({ emit(event, data) }).
   * @param {string}  [opts.baseUrl]       Bus base URL (defaults to the zrok comm hub).
   * @param {string}  [opts.topic]         Topic to subscribe to.
   * @param {Function}[opts.WebSocketImpl] WebSocket constructor (browser omits it).
   * @param {number}  [opts.heartbeatMs]   Status-ping interval; 0 disables.
   * @param {number}  [opts.maxBackoffMs]  Reconnect backoff ceiling.
   */
  constructor({
    bus,
    baseUrl = DEFAULT_A2A_BUS_URL,
    topic = DEFAULT_A2A_TOPIC,
    WebSocketImpl = null,
    heartbeatMs = 25000,
    maxBackoffMs = 30000,
  } = {}) {
    if (!bus || typeof bus.emit !== "function") {
      throw new Error("A2ABusClient requires an EventBus-like { emit } target");
    }
    this.bus = bus;
    this.baseUrl = baseUrl;
    this.topic = topic;
    this.url = buildBusUrl(baseUrl, topic);
    this._WS = WebSocketImpl;
    this.heartbeatMs = heartbeatMs;
    this.maxBackoffMs = maxBackoffMs;

    this.ws = null;
    this.connected = false;
    this.reconnectDelay = 1000;
    this.stopped = false;
    this._heartbeatId = null;
    this._reconnectId = null;
    this.stats = { received: 0, published: 0, reconnects: 0 };
  }

  connect() {
    this.stopped = false;
    const WS = resolveWebSocket(this._WS);
    let ws;
    try {
      ws = new WS(this.url);
    } catch (err) {
      this._scheduleReconnect();
      return this;
    }
    this.ws = ws;

    // Both browser (onopen=) and ws (on("open")) styles are supported.
    const bind = (evt, handler) => {
      if (typeof ws.addEventListener === "function") ws.addEventListener(evt, handler);
      else if (typeof ws.on === "function") ws.on(evt, handler);
    };

    bind("open", () => {
      this.connected = true;
      this.reconnectDelay = 1000;
      this._send({ kind: "subscribe", topic: this.topic });
      this._startHeartbeat();
      this.bus.emit("a2a:bus:connected", { url: this.url, topic: this.topic });
    });
    bind("message", (evt) => {
      const raw = evt && "data" in evt ? evt.data : evt;
      this._handleMessage(raw);
    });
    bind("close", () => {
      this.connected = false;
      this._stopHeartbeat();
      this.bus.emit("a2a:bus:disconnected", { url: this.url });
      this._scheduleReconnect();
    });
    bind("error", (err) => {
      this.bus.emit("a2a:bus:error", { error: err?.message || String(err) });
    });
    return this;
  }

  /** Reactively translate an inbound frame into local EventBus emissions. */
  _handleMessage(raw) {
    let msg;
    try {
      msg = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(raw?.toString?.() ?? "");
    } catch {
      return null; // ignore non-JSON frames
    }
    if (!msg || typeof msg !== "object") return null;
    this.stats.received += 1;

    // Normalize to the A2AProtocol shape used across the app.
    const normalized = {
      id: msg.id ?? `bus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: msg.from ?? msg.sender ?? "unknown",
      to: msg.to ?? msg.recipient ?? null,
      type: msg.type ?? "knowledge_share",
      payload: msg.payload ?? msg.data ?? msg,
      timestamp: msg.timestamp ?? Date.now(),
      topic: this.topic,
    };

    this.bus.emit("a2a:message", normalized);
    if (normalized.to) this.bus.emit(`a2a:to:${normalized.to}`, normalized);
    else this.bus.emit("a2a:broadcast", normalized);
    return normalized;
  }

  /** Publish a message back onto the bus (reactive, no polling). */
  publish(message) {
    const ok = this._send({ kind: "publish", topic: this.topic, message });
    if (ok) this.stats.published += 1;
    return ok;
  }

  _send(obj) {
    if (!this.ws || this.connected !== true) return false;
    try {
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  _startHeartbeat() {
    if (!this.heartbeatMs || this._heartbeatId) return;
    this._heartbeatId = setInterval(() => {
      this._send({ kind: "ping", topic: this.topic, t: Date.now() });
    }, this.heartbeatMs);
    if (typeof this._heartbeatId?.unref === "function") this._heartbeatId.unref();
  }

  _stopHeartbeat() {
    if (this._heartbeatId) {
      clearInterval(this._heartbeatId);
      this._heartbeatId = null;
    }
  }

  _scheduleReconnect() {
    if (this.stopped) return;
    this.stats.reconnects += 1;
    const delay = this.reconnectDelay;
    this._reconnectId = setTimeout(() => this.connect(), delay);
    if (typeof this._reconnectId?.unref === "function") this._reconnectId.unref();
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxBackoffMs);
  }

  disconnect() {
    this.stopped = true;
    this._stopHeartbeat();
    if (this._reconnectId) {
      clearTimeout(this._reconnectId);
      this._reconnectId = null;
    }
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.connected = false;
  }
}
