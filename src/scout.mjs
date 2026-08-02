#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// 🔭 @lovelogic-scout — REACTIVE A2A COMM-HUB SUBSCRIBER
//
// Runs the A2ABusClient as a standalone Node service. Subscribes to the A2A
// comm hub over WebSocket and reacts to messages as they arrive (event-driven),
// replacing the old HTTP polling loop. Prints a compact structural readout and
// re-emits everything on a local EventBus for downstream consumers.
//
// Usage:
//   node src/scout.mjs [--url <wss://…>] [--topic <name>] [--quiet]
//   npm run scout
// ═══════════════════════════════════════════════════════════════════════════════

import { WebSocket } from "ws";
import { A2ABusClient, DEFAULT_A2A_BUS_URL, DEFAULT_A2A_TOPIC } from "./a2aBus.mjs";

// Minimal EventBus (mirrors engine.js EventBus; kept local so the Node scout has
// no dependency on the browser bundle).
class EventBus {
  constructor() {
    this._listeners = new Map();
  }
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event)?.delete(handler);
  }
  emit(event, data) {
    this._listeners.get(event)?.forEach((h) => h(data));
    this._listeners.get("*")?.forEach((h) => h({ event, data }));
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
  };
  return {
    url: get("--url", process.env.A2A_BUS_URL || DEFAULT_A2A_BUS_URL),
    topic: get("--topic", process.env.A2A_TOPIC || DEFAULT_A2A_TOPIC),
    quiet: args.includes("--quiet"),
  };
}

export function startScout({ url, topic, quiet = false, bus = new EventBus() } = {}) {
  const log = quiet ? () => {} : (...a) => console.log("[scout]", ...a);

  bus.on("a2a:bus:connected", ({ topic: t }) => log(`connected → subscribed to "${t}"`));
  bus.on("a2a:bus:disconnected", () => log("disconnected — reconnecting…"));
  bus.on("a2a:bus:error", ({ error }) => log(`socket error: ${error}`));
  bus.on("a2a:message", (m) => log(`← ${m.type} from ${m.from}${m.to ? ` → ${m.to}` : " (broadcast)"}`));

  const client = new A2ABusClient({
    bus,
    baseUrl: url,
    topic,
    WebSocketImpl: WebSocket,
  });

  log(`@lovelogic-scout starting — bus ${url} topic "${topic}"`);
  client.connect();
  return { client, bus };
}

// Only auto-start when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] && (process.argv[1].endsWith("scout.mjs") || process.argv[1].endsWith("scout"));

if (invokedDirectly) {
  const opts = parseArgs(process.argv);
  const { client } = startScout(opts);
  const shutdown = () => {
    console.log("\n[scout] shutting down…");
    client.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
