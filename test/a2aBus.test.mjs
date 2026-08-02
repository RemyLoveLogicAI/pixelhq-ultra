import { test } from "node:test";
import assert from "node:assert/strict";
import { A2ABusClient, buildBusUrl, DEFAULT_A2A_BUS_URL, DEFAULT_A2A_TOPIC } from "../src/a2aBus.mjs";

// Minimal EventBus stub matching engine.js semantics.
function makeBus() {
  const listeners = new Map();
  const events = [];
  return {
    events,
    on(e, h) {
      if (!listeners.has(e)) listeners.set(e, new Set());
      listeners.get(e).add(h);
    },
    emit(e, d) {
      events.push({ event: e, data: d });
      listeners.get(e)?.forEach((h) => h(d));
    },
  };
}

// Controllable mock WebSocket (browser addEventListener style).
class MockWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.sent = [];
    this._handlers = {};
    MockWebSocket.instances.push(this);
  }
  addEventListener(evt, h) {
    this._handlers[evt] = h;
  }
  send(data) {
    this.sent.push(data);
  }
  close() {
    this._handlers.close?.({});
  }
  // test helpers
  _open() {
    this._handlers.open?.({});
  }
  _message(data) {
    this._handlers.message?.({ data });
  }
}

test("buildBusUrl appends the topic query param", () => {
  assert.equal(buildBusUrl(), `${DEFAULT_A2A_BUS_URL}?topic=${DEFAULT_A2A_TOPIC}`);
  assert.equal(buildBusUrl("wss://h/bus?x=1", "t"), "wss://h/bus?x=1&topic=t");
});

test("sends a subscribe frame on open", () => {
  MockWebSocket.instances = [];
  const bus = makeBus();
  const client = new A2ABusClient({ bus, WebSocketImpl: MockWebSocket, heartbeatMs: 0 });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws._open();
  const frame = JSON.parse(ws.sent[0]);
  assert.equal(frame.kind, "subscribe");
  assert.equal(frame.topic, DEFAULT_A2A_TOPIC);
  assert.ok(bus.events.some((e) => e.event === "a2a:bus:connected"));
  client.disconnect();
});

test("reactively re-emits an inbound directed message", () => {
  MockWebSocket.instances = [];
  const bus = makeBus();
  const client = new A2ABusClient({ bus, WebSocketImpl: MockWebSocket, heartbeatMs: 0 });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws._open();
  ws._message(JSON.stringify({ from: "scout", to: "boss", type: "status_ping", payload: { ok: true } }));

  const msg = bus.events.find((e) => e.event === "a2a:message")?.data;
  assert.equal(msg.from, "scout");
  assert.equal(msg.to, "boss");
  assert.equal(msg.type, "status_ping");
  assert.ok(bus.events.some((e) => e.event === "a2a:to:boss"));
  assert.equal(client.stats.received, 1);
  client.disconnect();
});

test("broadcast when no recipient; ignores malformed frames", () => {
  MockWebSocket.instances = [];
  const bus = makeBus();
  const client = new A2ABusClient({ bus, WebSocketImpl: MockWebSocket, heartbeatMs: 0 });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws._open();
  ws._message("not json{{{");
  ws._message(JSON.stringify({ from: "a", type: "knowledge_share", payload: 1 }));

  assert.ok(bus.events.some((e) => e.event === "a2a:broadcast"));
  assert.equal(client.stats.received, 1); // malformed frame ignored
  client.disconnect();
});

test("reconnects with exponential backoff after close", async () => {
  MockWebSocket.instances = [];
  const bus = makeBus();
  const client = new A2ABusClient({ bus, WebSocketImpl: MockWebSocket, heartbeatMs: 0 });
  client.connect();
  const first = MockWebSocket.instances[0];
  first._open();
  assert.equal(client.reconnectDelay, 1000);
  first.close(); // triggers scheduleReconnect (delay 1000 → next 2000)
  assert.equal(client.reconnectDelay, 2000);
  assert.equal(client.stats.reconnects, 1);
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(MockWebSocket.instances.length, 2); // reconnected
  client.disconnect();
});

test("disconnect stops reconnection", async () => {
  MockWebSocket.instances = [];
  const bus = makeBus();
  const client = new A2ABusClient({ bus, WebSocketImpl: MockWebSocket, heartbeatMs: 0 });
  client.connect();
  MockWebSocket.instances[0]._open();
  client.disconnect();
  MockWebSocket.instances[0].close();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(client.stopped, true);
  assert.equal(MockWebSocket.instances.length, 1); // no reconnect after disconnect
});
