<details>
<summary>Documentation Metadata (click to expand)</summary>

```json
{
  "doc_type": "file_overview",
  "file_path": "src/PixelHQUltra.jsx",
  "source_hash": "a4b6eb7428b14e4f045e79bda9fd210b469eeadc185f850796430192d1331136",
  "last_updated": "2026-03-07T08:37:42.340154+00:00",
  "tokens_used": 43524,
  "complexity_score": 7,
  "estimated_review_time_minutes": 30,
  "external_dependencies": [
    "react"
  ]
}
```

</details>

[Documentation Home](../README.md) > [src](./README.md) > **PixelHQUltra.jsx**

---

# PixelHQUltra.jsx

> **File:** `src/PixelHQUltra.jsx`

![Complexity: High](https://img.shields.io/badge/Complexity-High-red) ![Review Time: 30min](https://img.shields.io/badge/Review_Time-30min-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)
- [Usage Examples](#usage-examples)
- [Maintenance Notes](#maintenance-notes)
- [Functions and Classes](#functions-and-classes)

---

## Overview

This module exports a self-contained React view (default export PixelHQUltra) that composes many smaller function components to present a realtime multi-agent office simulation. At module scope it instantiates singletons shared across the UI (EventBus, A2AProtocol, PersonalityEngine, a generated OFFICE_MAP, and a KGOverlay). Global application state is managed with a single useReducer hook and an INIT state object; the reducer implements discrete action types such as AGENT_MOVE, ADD_BUBBLE, PARTICLE_TICK, MEETING_START, DEBATE_START, XP_GAIN, TOAST, and CAMERA_PAN.

The UI is a mixture of DOM and canvas layers: tiles, agents, and speech bubbles are DOM elements positioned in world coordinates for easy composition, while high-performance layers (the minimap and the Knowledge Graph overlay) use canvases with cached rendering and requestAnimationFrame loops. Components include PixelCharacter, SpeechBubble, AgentSprite, MessageParticle, MeetingOverlay, DebateOverlay, useViewportProfile, PlatformMatrix, Minimap, OfficeWorld, HUD, TerminalFeed, and the top-level PixelHQUltra which wires them together.

The module is event-driven: on mount it creates and connects a TerminalBridge, subscribes to bus events (TERMINAL_EVENTS.* and custom 'a2a:message'), and maps external events into reducer actions that move agents, spawn particles, add bubbles, update XP, and start meetings/debates. Multiple timers drive bubble expiration, particle animation, and demo sequences; all timers, canvas loops, and bus subscriptions are cleaned up on unmount. State is normalized by agent.id and camera logic, fog-of-war, and XP/leveling behaviors are centralized in the reducer.

## Dependencies

### External Dependencies

| Module | Usage |
| --- | --- |
| `react` | Imports React hooks: useState, useEffect, useCallback, useRef, useReducer. These hooks are used across function components: useReducer for global state in PixelHQUltra, useEffect for lifecycle wiring (bridge connection, timers, canvas render loops), useRef for DOM/canvas refs and timeout ids, and useState for local UI toggles. |

### Internal Dependencies

| Module | Usage |
| --- | --- |
| [./engine.js](.././engine.js.md) | Imports EventBus, A2AProtocol, A2A_MSG, PersonalityEngine, TerminalBridge, TERMINAL_EVENTS. Used to instantiate singletons (bus, a2a, personas), to connect TerminalBridge and register event listeners in PixelHQUltra's mount effect, and to map A2A/terminal messages into UI actions. |
| [./officeData.js](.././officeData.js.md) | Imports TILE, WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H, T, TILE_STYLE, generateOfficeMap, WAYPOINTS, INITIAL_AGENTS, AGENT_ROLES, XP_TABLE, EVOLUTION_MILESTONES, PLATFORM_CONFIG. These provide tile/world geometry, initial agents, waypoints, XP rules, and platform configuration used throughout the UI and reducer. |
| [./kgOverlay.js](.././kgOverlay.js.md) | Imports KGOverlay and KG_NODES/KG_EDGES. The file instantiates kgOverlay = new KGOverlay(bus) and uses it to render the knowledge graph overlay on a canvas, perform hit tests, and draw legends. |

## 📁 Directory

This file is part of the **src** directory. View the [directory index](./README.md) to see all files in this module.

## Architecture Notes

- Event-driven observer pattern with a shared EventBus routing external events into UI state changes.
- Centralized state with useReducer: normalized agent records keyed by id and explicit action types.
- Mixed rendering strategy: DOM for composable sprites/bubbles, canvas for cached/minimap and KG overlay.
- Timers and lifecycle management: many setInterval/setTimeout timers and requestAnimationFrame loops cleaned up on unmount.

## Usage Examples

### Start a demo meeting from the UI header

Clicking 'Call Meeting' emits TERMINAL_EVENTS.GAME_MEETING_START on the bus. The mounted handler dispatches MEETING_START, schedules AGENT_MOVE actions to chairs, sets agent states to 'meeting', emits meeting statements (bubbles and XP changes) at intervals, and finally dispatches MEETING_END to close the overlay. MeetingOverlay reads state.meeting to render the transcript and attendees.

### Send an A2A knowledge share (particle + bubble + XP)

A2A messages are emitted by a2a.shareKnowledge(...) or other modules; bus.on('a2a:message') spawns a MessageParticle via PARTICLE_ADD and adds a speech bubble for the sender. A particle animation interval dispatches PARTICLE_TICK to advance progress; when complete the particle is removed and follow-up bubbles or XP_GAIN actions may be scheduled.

### Pan camera by clicking the minimap

The Minimap renders an on-screen canvas. On click it computes tile coordinates from the event, derives a new camera origin centered on that tile, and dispatches CAMERA_PAN. The reducer clamps camera.x/y to valid ranges and OfficeWorld updates its transform accordingly.

## Maintenance Notes

- Performance: many DOM tiles can be expensive; consider batching or virtualization for larger OFFICE_MAPs.
- Timer safety: timeoutsRef collects setTimeout ids; ensure new timers are tracked and cleared on cleanup to avoid leaks.
- Robustness: guard against missing agent ids or waypoints when handling external events.
- Testing: unit-test reducer actions (AGENT_MOVE, XP_GAIN leveling) and integration tests by emitting TERMINAL_EVENTS on a mocked EventBus.

---

## Navigation

**↑ Parent Directory:** [Go up](./README.md)

---

*This documentation was automatically generated by AI ([Woden DocBot](https://github.com/marketplace/ai-document-creator)) and may contain errors. It is the responsibility of the user to validate the accuracy and completeness of this documentation.*


---

## Functions and Classes


#### function initAgents

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function initAgents(): Record<string, Object>
```

### Description

Returns an object that maps each agent's id to a new agent object whose pos property is initialized from that agent's spawn.


The function reads the global INITIAL_AGENTS array, maps each element to a [id, agentObject] pair, and uses Object.fromEntries to build and return an object keyed by agent id. For each agent a in INITIAL_AGENTS it produces an entry whose key is a.id and whose value is a shallow copy of a with its pos property set to a shallow copy of a.spawn (pos: { ...a.spawn }). The rest of the agent properties are shallow-copied via spread ({ ...a, pos: { ...a.spawn } }).

### Returns

**Type:** `Object (Record<string, Object>)`

An object whose keys are agent ids and whose values are new agent objects created from INITIAL_AGENTS elements. Each agent value is a shallow copy of the original agent object with pos initialized as a shallow copy of spawn.


**Possible Values:**

- An object with one property per element in INITIAL_AGENTS, keyed by that element's id
- An empty object if INITIAL_AGENTS is an empty array

### Usage Examples

#### Initialize agents state from a global INITIAL_AGENTS array

```javascript (jsx)
const agentsById = initAgents();
```

Produces an object mapping agent ids to agent objects with pos set from spawn, suitable for storing in component state or a Redux store.

### Complexity

Time complexity O(n) where n = INITIAL_AGENTS.length due to a single map and fromEntries construction; space complexity O(n) for the returned object and shallow copies of agent objects.

### Related Functions

- `INITIAL_AGENTS` - Global data source read by this function (the function maps over this array)

### Notes

- The function performs shallow copies: it spreads the agent object and spread-copies spawn into pos. Nested objects inside agent properties (other than spawn) remain shared references.
- If multiple agents share the same id value, later entries will overwrite earlier ones in the resulting object (behavior of Object.fromEntries with duplicate keys).
- The implementation relies on INITIAL_AGENTS being defined and iterable in the containing scope.

---



#### function reducer

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
reducer(state: Object, action: Object) => Object
```

### Description

A Redux-style reducer that returns a new application state object based on the provided action.type and associated action payload.


This function inspects action.type and produces a new state object without mutating the provided state. It handles a variety of action types that update agents (movement, state changes, bubbles, xp, stats), camera positioning and revealed tiles, UI elements (toasts, HUD), ephemeral systems (particles, terminal feed), meeting and debate flows, and bridge connectivity. For each recognized case it builds new copies of the relevant slices (using object/array spread) and returns an updated root state. Unrecognized action types return the input state unchanged. The reducer uses Date.now() and Math.random() to generate IDs and timestamps for ephemeral items (bubbles, particles, toasts, term feed entries). Camera math clamps to WORLD_W/WORLD_H minus viewport dimensions and reveals tiles around the camera into a Set constructed from state.revealed.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `Object` | ✅ | Current application state object that will be read to produce the next state. <br>**Constraints:** Expected to contain keys referenced by the reducer such as agents, camera, revealed, particles, termFeed, meeting, debate, toasts, showHUD, bridgeConnected, and selectedAgent. Should be treated as immutable input because the reducer returns copies rather than mutating it. |
| `action` | `Object` | ✅ | Action object describing the state update; must include a `type` string and may include additional properties depending on type. <br>**Constraints:** Must have a `type` matching one of the handled reducer cases such as `AGENT_MOVE`, `TERM_FEED`, `MEETING_START`, `DEBATE_END`, or `TOGGLE_HUD`. Action payloads must include the fields required by the matching case, such as `agentId` and `pos` for `AGENT_MOVE`. |

### Returns

**Type:** `Object`

A new state object representing the updated application state after applying the action. The original state object is not mutated.


**Possible Values:**

- A modified state object reflecting the action (e.g., updated agents, camera, revealed, particles, meeting/debate objects, toasts)
- The unchanged input state object (returned as-is) when action.type is unrecognized or when required referenced entities are missing (e.g., missing agent for some actions)

### Usage Examples

#### Move an agent (boss) and update camera/revealed tiles

```javascript
const next = reducer(state, { type: 'AGENT_MOVE', agentId: 'boss', pos: { x: 120, y: 80 } });
```

Updates the 'boss' agent position and state to 'walking', recenters the camera (clamped to world bounds), and adds revealed tile keys around the new camera area.

#### Add an on-screen speech bubble for an agent

```javascript
const next = reducer(state, { type: 'ADD_BUBBLE', agentId: 'alice', text: 'Hello!', style: 'speech' });
```

Appends a bubble object (with generated id and timestamp) to the agent's bubbles array, keeping up to the last 3 bubbles stored in that agent's bubble list slice.

#### Expire old particle progress

```javascript
const next = reducer(state, { type: 'PARTICLE_TICK', delta: 0.05 });
```

Increments progress on each particle by delta and filters out particles whose progress reaches or exceeds 1.

### Complexity

Time complexity varies by action: many actions are O(1) or O(k) where k is number of touched agents/particles. Notable costs: AGENT_MOVE reveals roughly VIEWPORT_W * VIEWPORT_H tiles (O(VIEWPORT_W * VIEWPORT_H)); EXPIRE_BUBBLES iterates all agents (O(A) where A is number of agents); PARTICLE_TICK maps and filters all particles (O(P)). Space complexity: returns a new state with copies of modified slices; worst-case additional memory proportional to size of modified slices (agents, particles, toasts, etc.).

### Related Functions

- `dispatch (Redux)` - Calls this reducer by dispatching actions; reducer is the pure function used by the store to compute next state

### Notes

- The reducer uses Date.now() and Math.random() to generate IDs and timestamps; while it returns new objects (no mutation of passed-in state), generated IDs and timestamps make results non-deterministic for identical inputs.
- When required referenced entities are missing (e.g., agent not found), many cases return the original state unchanged.
- The revealed field is treated as a Set in state; the reducer creates a new Set from state.revealed when updating it.
- Camera clamping relies on global constants WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H which must be defined in scope where reducer runs.
- Ensure consumer of this reducer accounts for created object identity changes when slices update.

---



#### PixelCharacter

> ⚠️ **WARNING**
> ⚠️ **Validation Warnings**

- Implementation body missing — many details inferred from signature only.

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function PixelCharacter({ spriteData: any, scale: number = 4, bobbing: boolean = false, walking: boolean = false })
```

### Description

Represents a pixel-art character component that renders sprite data with optional scale and animation flags.


Only the function signature/header was provided. The implementation (function body) is not present in the input, so detailed behavior, rendering, return values, side effects, and exceptions cannot be determined. The signature suggests a React-style functional component that accepts sprite data and optional rendering flags (scale, bobbing, walking).

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `spriteData` | `any` | ✅ | Sprite data for the character (structure not provided in snippet; likely pixel/frame data or an image reference).
 |
| `scale` = `4` | `number` | ❌ | Numeric scale factor to enlarge the rendered sprite. Default in signature is 4.
 |
| `bobbing` = `false` | `boolean` | ❌ | If true, enables a vertical bobbing animation. Default in signature is false.
 |
| `walking` = `false` | `boolean` | ❌ | If true, enables walking animation/state. Default in signature is false.
 |

### Returns

**Type:** `unknown`

Not available in the provided snippet; likely returns a JSX element when used as a React component.


### Usage Examples

#### General example of calling the component/function with props

```javascript (jsx)
PixelCharacter({ spriteData: mySprite, scale: 4, bobbing: true, walking: false })
```

Demonstrates how to call the function with the named parameters shown in the signature; the result and behavior are unspecified because implementation is not visible.

### Complexity

Not analyzed

### Notes

- Only the function signature/header was provided. The implementation (function body) is not present in the input, so detailed behavior, return values, side effects, and exceptions cannot be determined.
- The signature appears to be a JavaScript/JSX function, likely a React component based on the file extension and naming convention, but this cannot be asserted as functional behavior without the implementation.

---



#### function SpeechBubble

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function SpeechBubble({ bubble, agentColor })
```

### Description

Implementation not visible

Implementation not visible. Only the function signature is present in the provided source; no body or internal logic was provided to analyze.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `bubble` = `none visible` | `unknown` | ✅ | Destructured prop named 'bubble' from the parameter object; exact expected shape or type is not visible in the provided code.
<br>**Constraints:** No constraints visible in the implementation |
| `agentColor` = `none visible` | `unknown` | ✅ | Destructured prop named 'agentColor' from the parameter object; exact expected type (string, object, etc.) is not visible in the provided code.
<br>**Constraints:** No constraints visible in the implementation |

### Returns

**Type:** `unknown`

Implementation not visible; no return statements or JSX output are present in the provided excerpt.


### Usage Examples

#### Typical JSX usage when rendering the component (example only; implementation not visible)

```javascript (jsx)
<SpeechBubble bubble={someBubbleObject} agentColor="#ff0000" />
```

Illustrative example of how the component might be invoked in JSX given the visible props. The actual rendering behavior is not known because the implementation is missing.

### Complexity

Unknown — implementation not visible, so time and space complexity cannot be determined

### Notes

- Only the function signature (declaration line) was provided. The function body and implementation details are not available in the input.
- Because the implementation is not visible, this documentation does not assert any behavior, return values, side effects, or exceptions beyond what can be directly observed from the signature.

---



#### function AgentSprite

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function AgentSprite({ agent, isSelected, onClick })
```

### Description

Implementation not visible

The function definition is present but its implementation body is not included in the provided source snippet, so the specific behavior, rendering logic, or return value cannot be determined from the available code.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` = `none specified` | `not specified in signature` | ❌ | Destructured prop named 'agent' passed to the function; actual expected shape and usage are not visible in the implementation snippet.
<br>**Constraints:** No constraints visible in the provided code |
| `isSelected` = `none specified` | `not specified in signature` | ❌ | Destructured prop named 'isSelected' passed to the function; actual expected type and usage are not visible in the implementation snippet.
<br>**Constraints:** No constraints visible in the provided code |
| `onClick` = `none specified` | `not specified in signature` | ❌ | Destructured prop named 'onClick' passed to the function; actual expected type (e.g., function) and usage are not visible in the implementation snippet.
<br>**Constraints:** No constraints visible in the provided code |

### Returns

**Type:** `unknown (implementation not visible)`

The return value cannot be determined because the function body and any return statements are not included in the provided snippet.


**Possible Values:**

- Unknown — implementation not visible

### Usage Examples

#### Cannot provide a concrete usage example because implementation is not visible

```javascript (jsx)
/* Implementation not available; example usage depends on component behavior */
```

The function body is missing, so an accurate code example showing how to call or use the function cannot be produced.

### Complexity

Unknown — implementation not visible

### Notes

- Only the function signature line was provided. The body (implementation) is not present in the provided snippet.
- Any details about rendering, event handling, state usage, or side effects would require the full implementation to document accurately.

---



#### function MessageParticle

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function MessageParticle({ particle, agents })
```

### Description

Implementation not visible

The function's implementation body is not provided in the supplied source snippet (only the function signature is visible). Therefore, specific behavior, algorithm, return values, and internal operations cannot be determined from the available information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `particle` | `any` | ✅ | Destructured parameter named 'particle' from the single props object passed to the function. Exact expected shape and usage are not visible in the provided snippet.
 |
| `agents` | `any` | ✅ | Destructured parameter named 'agents' from the single props object passed to the function. Exact expected shape and usage are not visible in the provided snippet.
 |

### Returns

**Type:** `unknown`

Return value cannot be determined because the function body is not present in the provided code fragment.


### Usage Examples

#### Basic invocation with a props object (exact behavior unknown due to missing implementation)

```javascript (jsx)
MessageParticle({ particle: someParticle, agents: someAgents })
```

Demonstrates how to call the function using an object with particle and agents properties; what the function does with those values is not visible in the provided snippet.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature (line: function MessageParticle({ particle, agents }) {) was provided. The implementation body is missing, so all behavioral details, side effects, and return information cannot be determined from the supplied source.
- The file extension .jsx indicates this is a JavaScript/React component or function using JSX; however, without the body, it is not possible to confirm whether it returns JSX, performs rendering, or has other effects.

---



#### function MeetingOverlay

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function MeetingOverlay({ meeting, agents, dispatch })
```

### Description

Implementation not visible

The function implementation is not provided in the visible source snippet. Only the function signature is available; therefore the internal behavior, algorithm, return values, and side effects cannot be determined from the given content.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `meeting` | `unknown` | ❌ | Destructured parameter named 'meeting' from the single props object; actual expected shape and usage are not visible in the provided implementation.
 |
| `agents` | `unknown` | ❌ | Destructured parameter named 'agents' from the single props object; actual expected shape and usage are not visible in the provided implementation.
 |
| `dispatch` | `unknown` | ❌ | Destructured parameter named 'dispatch' from the single props object; actual expected type and usage (e.g., a function reference) are not visible in the provided implementation.
 |

### Returns

**Type:** `unknown`

Return value cannot be determined because the function body is not visible in the provided snippet.


### Usage Examples

#### Basic invocation with a props object

```javascript (jsx)
MeetingOverlay({ meeting: myMeeting, agents: myAgents, dispatch: myDispatch })
```

Demonstrates calling the function with an object that matches the destructured parameter names. The effect and return are unknown because implementation is not visible.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature line was provided. The implementation body is not present, so behavior, side effects, return values, and exceptions cannot be inferred without additional code.
- The file extension .jsx indicates this is a React/JSX component or function in JavaScript, but whether it is a React component returning JSX cannot be confirmed from the single line.

---



#### function DebateOverlay

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function DebateOverlay({ debate, agents, dispatch })
```

### Description

Implementation not visible

The function body/implementation is not present in the provided source excerpt (only the function signature is available). Therefore, the concrete behavior, rendering, logic, return value, and side effects cannot be determined from the provided information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `debate` | `unknown` | ✅ | Parameter named 'debate' passed via object destructuring in the function signature. Implementation not visible so purpose/structure unknown.
<br>**Constraints:** Cannot determine constraints from signature alone |
| `agents` | `unknown` | ✅ | Parameter named 'agents' passed via object destructuring in the function signature. Implementation not visible so purpose/structure unknown.
<br>**Constraints:** Cannot determine constraints from signature alone |
| `dispatch` | `unknown` | ✅ | Parameter named 'dispatch' passed via object destructuring in the function signature. Implementation not visible so purpose/structure unknown.
<br>**Constraints:** Cannot determine constraints from signature alone |

### Returns

**Type:** `unknown`

Return value cannot be determined because the function implementation is not visible in the provided excerpt.


**Possible Values:**

- Unknown — implementation not provided

### Usage Examples

#### Unable to provide concrete usage due to missing implementation

```javascript (jsx)
DebateOverlay({ debate: myDebate, agents: myAgents, dispatch: myDispatch })
```

This example shows how the function would be called using the available signature; actual behavior and return value are unknown because the implementation is not present.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature was provided; the body/implementation is not included in the input.
- All behavioral descriptions, side effects, return values, and exceptions cannot be determined without the full implementation.

---



#### function useViewportProfile

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function useViewportProfile(): { width: number, compact: boolean, stacked: boolean, scale: number }
```

### Description

Returns a viewport profile object (width, compact, stacked, scale) based on window.innerWidth and updates it on window resize; returns a default profile when window is undefined (SSR).


This React hook computes a UI profile object derived from the current browser viewport width. It defines an internal getProfile function that: (1) returns a default profile when window is not available (e.g., server-side rendering); (2) reads window.innerWidth and, based on breakpoint thresholds (<760, <1180, >=1180), returns width and three flags: compact (boolean), stacked (boolean), and scale (number). Scale is computed using expressions that clamp a ratio to a min/max via Math.max/Math.min and references external constants VIEWPORT_W and TILE. The hook uses useState to hold the profile and useEffect to register a window 'resize' event listener that recomputes and sets the profile by calling setProfile(getProfile()). The effect cleans up by removing the resize listener on unmount.

### Returns

**Type:** `{ width: number, compact: boolean, stacked: boolean, scale: number }`

An object describing the current viewport profile: width (current innerWidth or 1440 for SSR), compact (whether compact layout should be used), stacked (whether stacked layout should be used), and scale (a scaling factor clamped to a range).


**Possible Values:**

- { width: 1440, compact: false, stacked: false, scale: 1 } // returned when window is undefined (SSR default)
- { width: w (<760), compact: true, stacked: true, scale: clamped number between 0.54 and 0.72 computed as Math.max(0.54, Math.min(0.72, (w - 32) / (VIEWPORT_W * TILE)))) }
- { width: w (>=760 and <1180), compact: true, stacked: false, scale: clamped number between 0.78 and 0.94 computed as Math.max(0.78, Math.min(0.94, (w - 360) / (VIEWPORT_W * TILE)))) }
- { width: w (>=1180), compact: false, stacked: false, scale: 1 }

### Side Effects

> ❗ **IMPORTANT**
> This function has side effects that modify state or perform I/O operations.

- Reads window.innerWidth (accesses global window)
- Registers a 'resize' event listener on window via window.addEventListener
- Removes the 'resize' event listener on cleanup via window.removeEventListener
- Updates React component state by calling setProfile (via useState)

### Usage Examples

#### Inside a React functional component to adapt UI to viewport size

```javascript (jsx)
const profile = useViewportProfile();
// profile.width, profile.compact, profile.stacked, profile.scale can be used to conditionally render or style components
```

Demonstrates retrieving the current viewport profile within a component; the hook keeps profile updated when the window is resized.

### Complexity

Computing the profile is O(1) time and O(1) space. The hook registers a single event listener; subsequent updates occur on resize events (each update cost O(1)).

### Related Functions

- `useState` - Used by this hook to store and update the profile state
- `useEffect` - Used by this hook to register and clean up the window resize event listener

### Notes

- The function references VIEWPORT_W and TILE constants from outer scope; those must be defined for scale computations to work as intended.
- Provides a fallback default profile when executed in environments without window (server-side rendering).
- Scale computation uses clamping via Math.max/Math.min to enforce minimum and maximum scale values for each breakpoint.
- Because it uses React hooks, this must be called only from React function components or other hooks and obey the Rules of Hooks.

---



#### function PlatformMatrix

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function PlatformMatrix({ agents, compact = false })
```

### Description

Implementation not visible

The implementation body for this function is not included in the provided source snippet (only the function signature is visible). Therefore, no detailed behavior, algorithm, control flow, return values, or side effects can be determined from the available information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agents` | `unknown (no type annotations in signature)` | ✅ | Parameter named 'agents' present in the function signature; actual expected type and usage are not visible because the implementation is not provided.
<br>**Constraints:** No constraints visible in the provided code |
| `compact` = `false` | `boolean (inferred from default value)` | ❌ | Parameter named 'compact' with a default value of false; exact usage inside the function is not visible.
<br>**Constraints:** No additional constraints visible in the provided code |

### Returns

**Type:** `Unknown (implementation not visible)`

The return value cannot be determined because the function body and any return statements are not present in the provided snippet.


**Possible Values:**

- Unknown — cannot enumerate possible return values without implementation

### Usage Examples

#### Example invocation based on visible signature

```javascript (jsx)
PlatformMatrix({ agents: myAgentsArray, compact: true })
```

Demonstrates how to call the function with the available parameters; actual effect and output depend on the unseen implementation.

### Complexity

Unknown — time and space complexity cannot be determined without the implementation

### Notes

- Only the function signature line was provided. The implementation body is missing, so this documentation does not and cannot describe behavior beyond the presence and defaults of parameters.
- Because this file has a .jsx extension and the signature uses a single object parameter with a default, this is syntactically a JavaScript/React-style function, but no assumptions about component semantics should be made without the implementation.

---



#### function Minimap

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function Minimap({ state, dispatch })
```

### Description

Implementation not visible

The function implementation/body is not present in the provided source excerpt. Only the function declaration is available: a JavaScript/JSX function named Minimap that takes a single destructured parameter object with properties state and dispatch. No internal logic, return statements, side effects, or calls can be inspected from the given input, so detailed behavior cannot be determined from this snippet.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `unknown` | ✅ | Destructured property from the single parameter object; exact expected shape or use is not visible in the provided code.
<br>**Constraints:** Not available in excerpt |
| `dispatch` | `unknown` | ✅ | Destructured property from the single parameter object; exact expected type or behavior (e.g., dispatch function) is not visible in the provided code.
<br>**Constraints:** Not available in excerpt |

### Returns

**Type:** `unknown`

Return value cannot be determined because the function body/return statements are not present in the provided excerpt.


### Usage Examples

#### Basic invocation in JSX/React (example only — actual behavior unknown)

```javascript (jsx)
<Minimap state={someState} dispatch={dispatchFunction} />
```

Demonstrates how the component/function might be used in JSX based on its signature; the internal effects and rendering are not visible in the provided snippet.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function declaration line was provided. The implementation body is not available in the input, so all behavioral, return, and side-effect descriptions are intentionally omitted to avoid speculation.
- Parameter names are documented exactly as they appear in the signature; types and shapes are unknown from the snippet.

---



#### function OfficeWorld

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function OfficeWorld({ state, dispatch, scale = 1 })
```

### Description

Implementation not visible

Implementation not visible. Only the function signature is present in the provided source excerpt, so the internal behavior, algorithm, return value, and side effects cannot be determined from the available information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `unknown` | ✅ | Parameter named state provided via object destructuring; actual expected shape and usage cannot be determined from the visible signature.
 |
| `dispatch` | `unknown` | ✅ | Parameter named dispatch provided via object destructuring; actual expected function/structure and usage cannot be determined from the visible signature.
 |
| `scale` = `1` | `number` | ❌ | Numeric scale parameter with a default value; specific effect and accepted range are not visible in the implementation.
 |

### Returns

**Type:** `unknown`

Implementation not visible; no return statements or JSX/values are available in the provided excerpt.


### Usage Examples

#### Generic call with required properties

```javascript (jsx)
OfficeWorld({ state: someState, dispatch: someDispatch })
```

Demonstrates calling the function with the required object properties; specific behavior is unknown because implementation is not visible.

#### Providing an explicit scale

```javascript (jsx)
OfficeWorld({ state: someState, dispatch: someDispatch, scale: 2 })
```

Shows how to pass an explicit scale value instead of using the default; effect of scale is not visible in the provided code.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature line was provided; the function body and implementation details are not included in the input.
- Do not assume any behavior, side effects, return values, or internal calls beyond what is present in the signature.

---



#### function HUD

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function HUD({ state, dispatch, compact = false })
```

### Description

Implementation not visible

The implementation of this function is not included in the provided source snippet (only the function signature is visible). Therefore, the detailed behavior, returned value(s), internal algorithm, DOM rendering, hooks usage, or any calls it makes cannot be determined from the given information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `unknown` | ✅ | Destructured parameter named 'state' from the single props object; actual expected shape and purpose are not visible in the provided code.
 |
| `dispatch` | `function` | ✅ | Destructured parameter named 'dispatch' from the single props object; likely intended as some dispatcher function, but its contract is not visible in the snippet.
 |
| `compact` = `false` | `boolean` | ❌ | Destructured boolean prop defaulting to false; intended to toggle a compact mode, but exact effect is not visible.
 |

### Returns

**Type:** `unknown`

Cannot determine return value or rendered output because the function body/implementation is not provided in the snippet.


### Usage Examples

#### Calling with minimal props based on visible signature

```javascript (jsx)
HUD({ state: someStateObject, dispatch: someDispatchFunction })
```

Demonstrates how to call the function using the visible destructured props; actual behavior of the call is unknown because implementation is not visible.

#### Calling with compact mode enabled

```javascript (jsx)
HUD({ state: someStateObject, dispatch: someDispatchFunction, compact: true })
```

Shows passing the optional compact flag (defaults to false). What compact does internally cannot be determined from the provided snippet.

### Complexity

Not determinable from visible source

### Notes

- Only the function signature line was provided. The implementation (function body) is not present in the input, so all behavioral documentation is intentionally limited to what can be observed from the signature.
- Do not assume rendering, hooks usage, side effects, return type, or interactions with other modules without seeing the implementation.

---



#### function TerminalFeed

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function TerminalFeed({ state, compact = false })
```

### Description

Implementation not visible

The function body/implementation is not available in the provided source excerpt (only the function signature was provided). Therefore the actual behavior, return value, algorithm, side effects, and internal calls cannot be determined from the given information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` = `none (no default provided in signature)` | `unknown (property of the props object)` | ❌ | A property named 'state' passed via the component props. The specific expected structure and usage are not visible in the provided code.
<br>**Constraints:** Cannot determine constraints because implementation is not visible |
| `compact` = `false` | `boolean` | ❌ | A boolean prop that defaults to false according to the signature. Intended use is not visible in the provided code.
<br>**Constraints:** Should be boolean based on default value, but exact constraints are not visible |

### Returns

**Type:** `unknown`

Return value cannot be determined because the function implementation is not present in the provided excerpt.


### Usage Examples

#### Render as a React component in JSX when you want to include the TerminalFeed UI element (exact behavior unknown)

```javascript (jsx)
<TerminalFeed state={someState} compact={true} />
```

Example shows how to pass the two props visible in the signature; exact rendering and effects are unknown because the implementation is not provided.

### Complexity

Unknown (implementation not visible, cannot determine time or space complexity)

### Notes

- Only the function signature line was provided; full implementation must be supplied to document behavior, returns, side effects, exceptions, and complexity accurately.
- The file extension .jsx indicates this is a React component or JSX-capable JavaScript function.

---

