<details>
<summary>Documentation Metadata (click to expand)</summary>

```json
{
  "doc_type": "file_overview",
  "file_path": "src/PixelHQUltra.jsx",
  "source_hash": "3d561c6f41ff80cb0d0199a5d6cfd8bfc3324becc5e5ea704d803e109257881b",
  "last_updated": "2026-03-07T10:13:56.045896+00:00",
  "tokens_used": 51229,
  "complexity_score": 6,
  "estimated_review_time_minutes": 25,
  "external_dependencies": [
    "react"
  ]
}
```

</details>

[Documentation Home](../README.md) > [src](./README.md) > **PixelHQUltra.mdx**

---

# PixelHQUltra.jsx

> **File:** `src/PixelHQUltra.jsx`

![Complexity: Medium](https://img.shields.io/badge/Complexity-Medium-yellow) ![Review Time: 25min](https://img.shields.io/badge/Review_Time-25min-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)
- [Usage Examples](#usage-examples)
- [Maintenance Notes](#maintenance-notes)
- [Functions and Classes](#functions-and-classes)

---

## Overview

This module exports a default React component PixelHQUltra that composes a small simulation/game UI. It renders a tiled office map, agent pixel sprites, speech/notification bubbles, flying message particles, a terminal correlation feed, a HUD with agent cards, and transient overlays for meetings, debates, and a knowledge graph. The file creates several module-scoped singletons (EventBus, A2AProtocol, PersonalityEngine, TerminalBridge, KGOverlay) and a static OFFICE_MAP generated from officeData.js.

Application state uses a useReducer pattern with an INIT state object. The reducer maintains agents (id->agent map), particles, meeting/debate state, camera, revealed fog-of-war (Set of "x,y" strings), terminal feed, toasts, and UI flags. A mount useEffect wires TerminalBridge and bus events to dispatch actions, starts intervals/timeouts for particle ticks and bubble expiry, and ensures all subscriptions and timers are cleaned up on unmount. Visual components include a DOM-tiled OfficeWorld, an offscreen-cached Minimap canvas, a KG canvas rendered with requestAnimationFrame when visible, and many small presentational components (PixelCharacter, AgentSprite, MessageParticle, MeetingOverlay, DebateOverlay, TerminalFeed, HUD). Performance optimizations include offscreen canvas caching for static tiles and conditional RAF for the KG overlay.

## Dependencies

### External Dependencies

| Module | Usage |
| --- | --- |
| `react` | Imports React hooks: useState, useEffect, useCallback, useRef, useReducer which are used throughout the file for component state, lifecycle, memoized callbacks, refs for canvases and timers, and the main reducer pattern in PixelHQUltra. |

### Internal Dependencies

| Module | Usage |
| --- | --- |
| [./engine.js](.././engine.js.md) | Imports EventBus, A2AProtocol, A2A_MSG, PersonalityEngine, TerminalBridge, TERMINAL_EVENTS. The file creates singletons (new EventBus(), new A2AProtocol(bus), new PersonalityEngine()) and constructs a TerminalBridge(bus, personas) to connect to a terminal/bridge. Bus events (TERMINAL_EVENTS.*) are subscribed to and mapped into reducer dispatch actions (agent moves, speech/work events, a2a messages, meeting/XPs). A2AProtocol is used to open debates and send knowledge-share events (a2a.openDebate, a2a.shareKnowledge). |
| [./officeData.js](.././officeData.js.md) | Imports multiple constants and helpers used by rendering and simulation: TILE, WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H, T, TILE_STYLE, generateOfficeMap, WAYPOINTS, INITIAL_AGENTS, AGENT_ROLES, XP_TABLE, EVOLUTION_MILESTONES, PLATFORM_CONFIG. generateOfficeMap() is invoked once (OFFICE_MAP). Constants drive tile rendering, viewport sizing, initial agent creation (initAgents uses INITIAL_AGENTS), waypoint lookups for movement, XP and evolution logic, and platform cards in the HUD. |
| [./kgOverlay.js](.././kgOverlay.js.md) | Imports KGOverlay, KG_NODES, KG_EDGES. The file instantiates new KGOverlay(bus) and toggles its visible/render behavior from OfficeWorld. KG_NODES and KG_EDGES are referenced in the footer to display counts. The KGOverlay instance is used for hit-testing, rendering legend, and managing hovered/selected node state in response to mouse events on the KG canvas. |

## 📁 Directory

This file is part of the **src** directory. View the [directory index](_docs/src/README.md) to see all files in this module.

## Architecture Notes

- State is centralized via a useReducer with actions like AGENT_MOVE, PARTICLE_ADD/TICK, MEETING_*/DEBATE_*, XP_GAIN, STAT_INC, TERM_FEED, TOAST, BRIDGE_STATUS, SELECT_AGENT, CAMERA_* and TOGGLE_HUD.
- An EventBus singleton decouples external inputs (TerminalBridge, A2AProtocol) from UI state; mounted effects subscribe to bus events and dispatch reducer actions.
- Minimap uses an offscreen canvas to cache static tiles; the KG overlay uses a canvas + RAF loop only while visible to minimize work.
- The main mount effect registers multiple intervals/timeouts and stores them for cleanup; subscriptions are explicitly unsubscribed on unmount.
- Agents are stored as an object map (id -> agent) for O(1) lookup; revealed fog-of-war is represented as a Set of 'x,y' strings in state.

## Usage Examples

### Simulate a meeting via UI header button

Clicking the 'Call Meeting' header button emits TERMINAL_EVENTS.GAME_MEETING_START on the EventBus with a meeting object (meetingId, organizer, attendees, agenda). The mounted effect subscribed to that event dispatches MEETING_START, moves attendees to meeting waypoints, sequences MEETING_STATEMENT actions to append transcript entries and ADD_BUBBLE actions for speech, and schedules MEETING_END on a timeout. Timers are tracked and cleared on unmount.

### Send an A2A message → particle → receiver bubble

When an A2A message arrives the handler dispatches PARTICLE_ADD with {from,to,type} producing a particle with progress=0. A periodic PARTICLE_TICK interval advances progress until arrival; sender and receiver bubbles are shown via ADD_BUBBLE and timeouts. MessageParticle renders along a bezier arc between agents.

### Open and interact with the Knowledge Graph (KG) overlay

Toggling KG visibility mounts a KG canvas sized to the viewport and starts an RAF loop that calls kgOverlay.render(ctx, camera). Mouse handlers convert screen to world coordinates and use kgOverlay.hitTest for hover/select interactions. The overlay is managed by the singleton kgOverlay created at module scope.

## Maintenance Notes

- If map size grows, consider replacing DOM-tiled rendering with a single canvas for tiles to reduce layout/paint costs.
- Always push new timeouts/interval IDs into the shared timeoutsRef and clear them on unmount to avoid leaks.
- When copying reducer state, create a new Set for revealed to avoid mutating shared references; serialize Sets to arrays for persistence/tests.
- Validate incoming bus events for unknown agent IDs or WAYPOINT keys to avoid runtime errors.
- Ensure KG overlay RAF is canceled on hide to prevent orphaned loops when toggling rapidly.

---

## Navigation

**↑ Parent Directory:** [Go up](_docs/src/README.md)

---

*This documentation was automatically generated by AI ([Woden DocBot](https://github.com/marketplace/ai-document-creator)) and may contain errors. It is the responsibility of the user to validate the accuracy and completeness of this documentation.*


---

## Functions and Classes


#### function clamp

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function clamp(value: number, min: number, max: number): number
```

### Description

Returns a numeric value constrained to lie between the provided min and max bounds by using Math.max and Math.min.


This function evaluates Math.min(max, value) to ensure the value is not greater than max, then applies Math.max(min, ...) to ensure the result is not less than min. The implementation does not perform explicit validation of the relationship between min and max or the types of the arguments; it relies on JavaScript's numeric/coercion behavior and the semantics of Math.min/Math.max.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | ✅ | The input value to constrain between min and max.
<br>**Constraints:** No explicit type checking in code; non-number inputs are coerced by Math.min/Math.max and may produce NaN, No enforced relationship between min and max (if min > max, result will be influenced by Math.max/Math.min behavior) |
| `min` | `number` | ✅ | The lower bound of the allowed range.
<br>**Constraints:** No explicit validation that min <= max; behavior when min > max follows Math.max/Math.min semantics |
| `max` | `number` | ✅ | The upper bound of the allowed range.
<br>**Constraints:** No explicit validation that max >= min; behavior when max < min follows Math.min/Math.max semantics |

### Returns

**Type:** `number`

A number equal to value if it lies between min and max; otherwise the nearest bound (min or max). The result may be NaN if inputs are non-numeric and coerce to NaN.


**Possible Values:**

- value (if min <= value <= max)
- min (if value < min and min <= max, or when min > max depending on coercion)
- max (if value > max and min <= max)
- NaN (when inputs are non-numeric in a way that causes Math.min/Math.max to return NaN)

### Usage Examples

#### Clamp a value to the range 0–255 (common for color channel values)

```javascript
clamp(300, 0, 255) // returns 255
```

Demonstrates limiting an out-of-range high value down to the max bound.

#### Value already within range

```javascript
clamp(128, 0, 255) // returns 128
```

Shows that a value inside the bounds is returned unchanged.

#### min greater than max (no explicit validation)

```javascript
clamp(10, 20, 5) // returns 20 (behavior follows Math.min/Math.max combination)
```

Illustrates that the function does not validate min <= max and will produce results determined by Math.min/Math.max.

### Complexity

O(1) time complexity and O(1) space complexity

### Related Functions

- `Math.min` - Called by clamp to limit the value to the upper bound
- `Math.max` - Called by clamp to apply the lower bound after Math.min

### Notes

- The function is a pure computation with no side effects.
- There is no explicit validation of argument types or that min <= max; callers should ensure sensible numeric inputs if they want predictable behavior.
- If any argument coerces to NaN, the result will be NaN because Math.min/Math.max propagate NaN.

---



#### function getViewportProfile

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function getViewportProfile(width: number = (typeof window === 'undefined' ? 1440 : window.innerWidth)): { width: number, compact: boolean, stacked: boolean, scale: number }
```

### Description

Compute a viewport profile (width, compact flag, stacked flag, and scale) from a given viewport width (defaults to window.innerWidth or 1440 when window is undefined).


This function determines layout-related flags and a scaling factor based on an input width in pixels. It: 1) decides if the layout is 'compact' by comparing width to DESKTOP_ROW_BUDGET; 2) computes sidePaneWidth depending on the compact flag using COMPACT_PANEL_WIDTH, FULL_FEED_WIDTH, and FULL_HUD_WIDTH; 3) computes availableWorldWidth by subtracting horizontal paddings, column gap, and sidePaneWidth from width; 4) sets a 'stacked' boolean when availableWorldWidth is less than WORLD_VIEWPORT_PX * INLINE_SCALE_MIN; 5) computes a 'scale' using the clamp(...) helper: if stacked it clamps (width - LAYOUT_HORIZONTAL_PADDING) / WORLD_VIEWPORT_PX between STACKED_SCALE_MIN and STACKED_SCALE_MAX, otherwise it clamps availableWorldWidth / WORLD_VIEWPORT_PX between INLINE_SCALE_MIN and 1. The function returns an object with the computed values.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `width` = `typeof window === "undefined" ? 1440 : window.innerWidth` | `number` | ❌ | Viewport width in pixels to base layout decisions on. If omitted, defaults to window.innerWidth when window is available, otherwise 1440.
<br>**Constraints:** Should be a finite numeric pixel width, Behavior assumes non-negative values (used in numeric comparisons and arithmetic) |

### Returns

**Type:** `{ width: number, compact: boolean, stacked: boolean, scale: number }`

An object describing the viewport profile: the input width, a compact layout boolean, a stacked layout boolean, and a numeric scale factor clamped to configured bounds.


**Possible Values:**

- { width: (number) the same value passed in or the default }
- { compact: true | false }
- { stacked: true | false }
- { scale: number — if stacked, guaranteed between STACKED_SCALE_MIN and STACKED_SCALE_MAX; otherwise between INLINE_SCALE_MIN and 1 }

### Usage Examples

#### Use when you need layout decisions for the current window

```javascript (jsx)
getViewportProfile()
```

Returns profile using window.innerWidth (or 1440 if window is undefined).

#### Use for a specific width (e.g., testing or server-side calculations)

```javascript (jsx)
getViewportProfile(1024)
```

Computes compact/stacked flags and scale based on a 1024px wide viewport.

### Complexity

O(1) time and O(1) space — performs a fixed number of arithmetic and boolean operations regardless of input size.

### Related Functions

- `clamp` - Called by this function to constrain the computed scale within configured min/max bounds.

### Notes

- Function relies on several external constants (DESKTOP_ROW_BUDGET, COMPACT_PANEL_WIDTH, FULL_FEED_WIDTH, FULL_HUD_WIDTH, LAYOUT_HORIZONTAL_PADDING, LAYOUT_COLUMN_GAP, WORLD_VIEWPORT_PX, INLINE_SCALE_MIN, STACKED_SCALE_MIN, STACKED_SCALE_MAX) which must be defined in the same module or in scope.
- Reads global window when no width argument is provided; on server-side (no window) it falls back to a default width of 1440.
- No validation is performed beyond numeric comparisons — passing non-numeric values may produce NaN results.

---



#### function getAgentPlatformIds

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function getAgentPlatformIds(agent: any): string[]
```

### Description

Return an array of platform IDs from agent.platforms that are strings and have a corresponding truthy entry in the global PLATFORM_CONFIG.


This function reads the optional platforms property from the provided agent object using optional chaining (agent?.platforms). It treats the platforms value as an array (falling back to an empty array if undefined or falsy), then filters that array to include only items that are of type string and for which PLATFORM_CONFIG[platformId] evaluates to a truthy value. The function returns the filtered array of platform ID strings. The function does not modify its input or any external state; it only reads agent and the global PLATFORM_CONFIG.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` = `none` | `any` | ✅ | An object that may contain a platforms property (expected to be an array). The function only reads agent.platforms.
<br>**Constraints:** If present, agent.platforms should be an iterable (typically an array)., Elements of agent.platforms are expected to be strings to be included in the result. |

### Returns

**Type:** `string[]`

An array containing the platform ID strings from agent.platforms that are strings and have a truthy entry in PLATFORM_CONFIG.


**Possible Values:**

- [] (empty array) if agent is undefined/null or has no platforms or no matching platforms
- ['platformA', 'platformB'] etc. — any subset of the input platforms that are strings and present/truthy in PLATFORM_CONFIG

### Usage Examples

#### Agent has platforms array with some valid platform IDs

```javascript
const agent = { platforms: ['web', 'mobile', 42] }; const validIds = getAgentPlatformIds(agent);
```

Returns an array of string platform IDs from agent.platforms that also exist in PLATFORM_CONFIG; non-string entries (like 42) are excluded.

#### Agent is null or has no platforms

```javascript
const validIds = getAgentPlatformIds(null);
```

Returns an empty array because agent?.platforms is undefined and the fallback empty array is used.

### Complexity

Time complexity: O(n) where n is the length of agent.platforms (each element is checked once). Space complexity: O(k) where k is the number of matched platform IDs returned (plus negligible overhead for the intermediate array).

### Related Functions

- `PLATFORM_CONFIG` - Reads this global configuration object to determine which platform IDs are considered valid (not a function but a required global reference).

### Notes

- Relies on a global PLATFORM_CONFIG being available in the scope where this function runs; if PLATFORM_CONFIG is undefined, lookups will yield undefined and cause all entries to be filtered out.
- The function uses a strict type check for strings (typeof platformId === 'string') and a truthiness check for PLATFORM_CONFIG[platformId].
- This function does not mutate the agent object or PLATFORM_CONFIG.

---



#### function initAgents

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function initAgents(): { [id: string]: { id: any, pos: { x?: any, y?: any, ... }, spawn?: object, [key: string]: any } }
```

### Description

Returns an object mapping each agent's id to a new agent object where the agent's pos property is initialized as a shallow copy of its spawn property.


The function iterates over the INITIAL_AGENTS array, and for each agent 'a' it creates an entry [a.id, { ...a, pos: { ...a.spawn } }]. It then constructs and returns an object from those entries via Object.fromEntries. Each resulting value is a new object that spreads the original agent properties and sets 'pos' to a shallow copy of 'spawn' (so the pos object is a new object with the same enumerable properties as spawn). The function uses Array.prototype.map and Object.fromEntries; it does not mutate the ORIGINAL agents in INITIAL_AGENTS because spreads create shallow copies at the top level.

### Returns

**Type:** `{ [id: string]: object }`

An object whose keys are agent ids (a.id) and whose values are agent objects created by spreading the original agent and replacing/setting the pos property to a shallow copy of its spawn property.


**Possible Values:**

- An object with one key per element in INITIAL_AGENTS mapping to the constructed agent object
- An empty object {} if INITIAL_AGENTS is an empty array or has no entries

### Usage Examples

#### Initialize agents state from a predefined list of agents

```javascript (jsx)
const agentsById = initAgents();
```

Creates an object where each agent is accessible by its id and each agent's pos is initialized from its spawn, suitable for seeding in-memory state like a game or simulation.

### Complexity

Time: O(n) where n is INITIAL_AGENTS.length due to a single map pass and Object.fromEntries construction. Space: O(n) additional space for the returned object and shallow copies of agent objects and their pos/spawn objects.

### Related Functions

- `Object.fromEntries` - Called by this function to convert array of [key, value] pairs into an object
- `Array.prototype.map` - Used to transform INITIAL_AGENTS into an array of [id, agentObject] entries

### Notes

- The copies performed are shallow: top-level agent properties are copied via spread, and pos is a shallow copy of spawn. Nested objects deeper than one level remain shared with the original spawn if present.
- The function relies on an external variable INITIAL_AGENTS being available in scope; that variable is not defined within this function.
- If multiple agents share the same id, later entries will overwrite earlier ones in the resulting object (standard object key behavior).

---



#### function reducer

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function reducer(state: Object, action: Object) => Object
```

### Description

Reducer function that takes the current application state and an action object, and returns a new state based on the action.type handled in the switch statement.


This function implements a typical Redux-style reducer: it inspects action.type and produces a new state object without mutating the input state. It handles many action types that update agents (movement, state, bubbles, XP, stats), UI elements (camera, HUD, toasts, selection), transient systems (particles, terminal feed), meeting/debate flows, and bridge connection status. For AGENT_MOVE it optionally recenters the camera when the 'boss' moves and marks a set of tiles as revealed around the camera. For ADD_BUBBLE and EXPIRE_BUBBLES it manages per-agent bubble arrays and prunes old entries by timestamp. XP_GAIN increments experience, computes level-ups and evolution milestones using EVOLUTION_MILESTONES. PARTICLE_ADD/PARTICLE_TICK add and advance particles and remove completed ones. Other cases produce straightforward updates by returning shallow copies with updated nested properties.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `Object` | ✅ | The current application state object; expected to contain keys like agents, camera, revealed, particles, termFeed, meeting, debate, toasts, bridgeConnected, selectedAgent, showHUD, etc.
<br>**Constraints:** Should be an immutable-like plain object (function returns new objects rather than mutating), Certain properties are expected to exist (e.g., state.agents, state.particles, state.revealed, state.toasts, state.termFeed) for corresponding actions to work without errors |
| `action` | `Object` | ✅ | Action object with a mandatory 'type' string and additional fields depending on the action.type handled (examples: agentId, pos, text, particle, delta, meeting, debate, amount, stat, id, connected, x, y).
<br>**Constraints:** action.type must be one of the handled strings (e.g., 'AGENT_MOVE', 'ADD_BUBBLE', 'XP_GAIN', etc.) for meaningful changes, Action must include action-specific fields required by that branch (e.g., AGENT_MOVE requires agentId and pos) |

### Returns

**Type:** `Object`

A new state object representing the updated application state after applying the action. The reducer never returns undefined; unrecognized action.type returns the original state object.


**Possible Values:**

- Original state (when action.type is unrecognized or when early-return conditions apply, e.g., missing agent)
- New state object with modifications appropriate to the action.type

### Usage Examples

#### Move an agent and update camera & revealed tiles (boss moves)

```javascript
reducer(state, { type: 'AGENT_MOVE', agentId: 'boss', pos: { x: 50, y: 30 } })
```

Updates the boss agent's pos and state to 'walking', recenters camera around the boss, and adds a set of revealed tile coordinates around the new camera position.

#### Add a speech bubble for an agent

```javascript
reducer(state, { type: 'ADD_BUBBLE', agentId: 'alice', text: 'Hello!' })
```

Creates a bubble object (with id, timestamp, style and color defaults) and appends it to the agent's bubble list (keeps at most last 3).

#### Advance particles by delta and remove completed

```javascript
reducer(state, { type: 'PARTICLE_TICK', delta: 0.05 })
```

Increments progress for each particle by delta and filters out particles with progress >= 1.

### Complexity

Time: O(A + P + VIEWPORT_W*VIEWPORT_H) in typical worst-cases where A is number of agents (EXPIRE_BUBBLES loops agents), P is number of particles (PARTICLE_TICK maps/filters), and AGENT_MOVE may iterate over VIEWPORT_W*VIEWPORT_H area to mark revealed tiles. Space: O(n) additional allocation proportional to changes (creates shallow copies of objects and arrays).

### Related Functions

- `EVOLUTION_MILESTONES` - Read-only lookup used by XP_GAIN branch to determine abilities unlocked at level milestones

### Notes

- The reducer reads Date.now() and Math.random() to create unique ids and timestamps for bubbles, particles, toasts and terminal feed entries.
- When an action expects an agent (by agentId) the reducer checks presence and returns original state if agent missing (e.g., ADD_BUBBLE, CAMERA_FOCUS).
- Camera centering logic clamps to world bounds using WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H globals; these must be defined in the surrounding module scope.
- AGENT_MOVE reveals tiles by adding coordinate strings to a Set copied from state.revealed; disclosed coordinates are strings formatted as 'x,y'.
- The reducer uses shallow copies to avoid mutating the incoming state; callers should still treat returned object as the new immutable state.

---



#### function PixelCharacter

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function PixelCharacter({ spriteData, scale = 4, bobbing = false, walking = false })
```

### Description

Implementation not visible

The function implementation body is not present in the provided source snippet (only the function signature is visible). Therefore the internal behavior, algorithm, rendering logic, return value, and any interactions cannot be determined from the provided line.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `spriteData` | `not specified in signature` | ✅ | Not specified in the visible code. Present as a named property in the single destructured parameter object.
 |
| `scale` = `4` | `not specified in signature` | ❌ | Not specified in the visible code. Provided with a default value of 4 in the signature.
 |
| `bobbing` = `false` | `not specified in signature` | ❌ | Not specified in the visible code. Provided with a default boolean value false in the signature.
 |
| `walking` = `false` | `not specified in signature` | ❌ | Not specified in the visible code. Provided with a default boolean value false in the signature.
 |

### Returns

**Type:** `unknown (implementation not visible)`

The return value cannot be determined because the function body is not included in the provided snippet.


### Usage Examples

#### Cannot demonstrate usage because implementation is not visible

```javascript (jsx)
PixelCharacter({ spriteData: ..., scale: 4, bobbing: false, walking: false })
```

Only the signature is available; example uses the visible parameter names and defaults but does not guarantee correct usage or return behavior.

### Complexity

Not determinable from visible code

### Notes

- Only the function signature line was provided; the implementation body is missing.
- Do not assume rendering, return type (React element or otherwise), or side effects without seeing the function body.

---



#### function SpeechBubble

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript/jsx
function SpeechBubble({ bubble, agentColor })
```

### Description

Implementation not visible

Implementation not visible. Only the function signature/declaration line is available, so the internal logic, return values, side effects, and interactions cannot be determined from the provided source.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `bubble` | `unknown` | ❌ | Destructured property from the single props parameter; exact expected shape and usage are not visible in the provided implementation.
<br>**Constraints:** Not visible in the provided code |
| `agentColor` | `unknown` | ❌ | Destructured property from the single props parameter; exact expected type and usage are not visible in the provided implementation.
<br>**Constraints:** Not visible in the provided code |

### Returns

**Type:** `unknown`

Not visible — no return statement or JSX body available in the provided snippet.


**Possible Values:**

- Not determinable from the provided code

### Usage Examples

#### Typical invocation in a React component when passing props

```javascript/jsx
SpeechBubble({ bubble: someBubbleValue, agentColor: '#ff0000' })
```

Example shows how the function would be called with the expected destructured props, but the effect and return are unknown because the implementation is not provided.

### Complexity

Unknown — implementation not visible, so time and space complexity cannot be determined

### Notes

- Only the function signature line was provided. The body/implementation is not present in the input, so behavior cannot be documented beyond parameter names.

---



#### function AgentSprite

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function AgentSprite({ agent, isSelected, onClick })
```

### Description

Implementation not visible

The body/implementation of this function is not present in the provided source snippet (only the function signature is available). Therefore the actual behavior, return value, internal logic, and side effects cannot be determined from the supplied code.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | `unknown` | ✅ | Parameter named 'agent' passed via object destructuring; purpose and expected shape are not visible in the provided snippet.
 |
| `isSelected` | `unknown` | ✅ | Parameter named 'isSelected' passed via object destructuring; purpose and expected type are not visible in the provided snippet.
 |
| `onClick` | `unknown` | ✅ | Parameter named 'onClick' passed via object destructuring; purpose and expected type are not visible in the provided snippet.
 |

### Returns

**Type:** `unknown`

Implementation not visible; return value cannot be determined from the provided snippet.


### Usage Examples

#### Example of how to call the function with an object of props (implementation details unknown)

```javascript (jsx)
AgentSprite({ agent: myAgent, isSelected: true, onClick: () => console.log('clicked') })
```

Demonstrates the call-site pattern expected by the signature: an object with agent, isSelected, and onClick properties. The actual result and behavior are not provided in the snippet.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature was provided; the implementation body is missing from the input.
- Because the implementation is not visible, do not assume return type, side effects, exceptions, or internal calls.

---



#### function MessageParticle

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function MessageParticle({ particle, agents })
```

### Description

Implementation not visible

The function's implementation is not included in the provided source snippet. Only the function signature is visible, so no line-by-line behavior, return values, internal algorithm, or side effects can be determined from the available information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `particle` | `unknown (property of the single destructured parameter object)` | ❌ | Destructured property named 'particle' from the single object parameter; actual expected shape and usage are not visible in the provided snippet.
<br>**Constraints:** Not visible in the provided code |
| `agents` | `unknown (property of the single destructured parameter object)` | ❌ | Destructured property named 'agents' from the single object parameter; actual expected shape and usage are not visible in the provided snippet.
<br>**Constraints:** Not visible in the provided code |

### Returns

**Type:** `unknown`

Return value(s) cannot be determined because the function body is not provided.


### Usage Examples

#### Illustrative call using the visible signature (behavior undefined because implementation is missing)

```javascript (jsx)
MessageParticle({ particle: someParticle, agents: someAgents })
```

Example demonstrates how to call the function with the visible destructured parameters. The actual effect, return value, and behavior are not visible in the provided snippet.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature line is available in the provided source. The implementation body is not included, so this documentation cannot describe behavior, return values, side effects, or exceptions.
- File extension (.jsx) and the signature style indicate this is JavaScript/JSX code, likely a React component or helper function, but that cannot be asserted as behavior without the implementation.

---



#### function MeetingOverlay

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function MeetingOverlay({ meeting, agents, dispatch })
```

### Description

Implementation not visible

Implementation not visible. Only the function signature (a JavaScript/JSX function component) is present in the provided source snippet; no body or logic is available to analyze.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `meeting` | `unknown (no type annotations in snippet)` | ✅ | Destructured prop named 'meeting' provided to the component; actual expected shape and usage are not visible in the snippet.
<br>**Constraints:** Not specified in visible code |
| `agents` | `unknown (no type annotations in snippet)` | ✅ | Destructured prop named 'agents' provided to the component; actual expected shape and usage are not visible in the snippet.
<br>**Constraints:** Not specified in visible code |
| `dispatch` | `unknown (no type annotations in snippet)` | ✅ | Destructured prop named 'dispatch' provided to the component; likely a function or dispatcher but its exact behavior is not visible.
<br>**Constraints:** Not specified in visible code |

### Returns

**Type:** `unknown`

Implementation not visible; cannot determine what (if anything) this function returns. As a JSX function component it would typically return React elements (JSX), but the body is not provided.


**Possible Values:**

- Unknown — body not visible; likely a React element or null/undefined if used as a component

### Usage Examples

#### Basic JSX usage of the component (example only — implementation not visible)

```javascript (jsx)
<MeetingOverlay meeting={meetingObj} agents={agentsArray} dispatch={dispatchFn} />
```

Illustrative example showing how the component might be used in JSX. The actual rendering behavior and side effects are not visible in the provided snippet.

### Complexity

Unknown (implementation not visible) — cannot determine time or space complexity without the function body.

### Notes

- Only the function signature was provided; the function body and implementation details are not available in the input.
- Because the implementation is not visible, descriptions of behavior, side effects, return values, and exceptions are intentionally left unspecified to avoid hallucination.

---



#### function DebateOverlay

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function DebateOverlay({ debate, agents, dispatch })
```

### Description

Implementation not visible

Implementation not visible. Only the function signature is available: a JavaScript/JSX function named DebateOverlay that destructures a single props object to extract debate, agents, and dispatch. No implementation body is provided in the visible source, so internal behavior, rendering, or side effects cannot be determined from the given input.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `debate` | `any` | ✅ | Destructured property from the single props object. Actual expected shape and usage not visible in the implementation.
<br>**Constraints:** Not determinable from visible code |
| `agents` | `any` | ✅ | Destructured property from the single props object. Actual expected shape and usage not visible in the implementation.
<br>**Constraints:** Not determinable from visible code |
| `dispatch` | `any` | ✅ | Destructured property from the single props object, likely a dispatch function or handler, but actual usage is not visible.
<br>**Constraints:** Not determinable from visible code |

### Returns

**Type:** `unknown`

Implementation not visible; return value (if any) cannot be determined from the provided source line.


**Possible Values:**

- unknown

### Usage Examples

#### Basic invocation in a React component tree

```javascript (jsx)
<DebateOverlay debate={debateObj} agents={agentsArray} dispatch={dispatchFn} />
```

Example shows how the component might be used in JSX by passing the three props it destructures; actual behavior and rendering are not visible in the provided source.

#### Calling as plain function (if used that way)

```javascript (jsx)
DebateOverlay({ debate: debateObj, agents: agentsArray, dispatch: dispatchFn })
```

Illustrates calling the function with an object containing the expected keys; no implementation details are available.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature line was provided. The implementation body is not included in the input, so all behavioral details, return values, side effects, exceptions, and complexity cannot be determined without the rest of the code.
- Parameter types and shapes should be confirmed from the component's implementation or surrounding code before use.

---



#### function useViewportProfile

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx/react)
function useViewportProfile(): any
```

### Description

Returns a React state value representing the current viewport profile and keeps it updated on window resize events.


This is a React custom hook that initializes a local state variable profile by calling getViewportProfile(), then registers a window resize event listener which updates that state by calling getViewportProfile() again whenever the browser window is resized. The effect's cleanup removes the resize listener. The hook returns the current profile state.

### Returns

**Type:** `any`

The current viewport profile value as produced by getViewportProfile(), stored in React state.


**Possible Values:**

- Any value returned by getViewportProfile()

### Side Effects

> ❗ **IMPORTANT**
> This function has side effects that modify state or perform I/O operations.

- Registers a window "resize" event listener via window.addEventListener
- Removes the previously registered window "resize" event listener on cleanup via window.removeEventListener
- Updates React component state via setProfile when the resize handler runs

### Usage Examples

#### Use inside a functional React component to adapt UI to viewport profile

```javascript (jsx/react)
function MyComponent() {
  const profile = useViewportProfile();
  return <div>Current profile: {String(profile)}</div>;
}
```

Demonstrates importing and calling the hook inside a component; the returned profile will update when the window is resized.

### Complexity

Time: O(1) per call/update (initial call and each resize handler invocation do constant work); Space: O(1) additional space for storing the profile state reference.

### Related Functions

- `getViewportProfile` - Called by this hook to determine the initial and updated profile values
- `useState` - React hook used to store the profile state
- `useEffect` - React hook used to register and clean up the window resize listener

### Notes

- This implementation depends on the behavior and return type of getViewportProfile() which is external to this function.
- The hook adds a global window event listener; ensure components using this hook are mounted in a browser environment where window is available.
- The hook uses an empty dependency array for useEffect so the listener is added once on mount and removed on unmount.

---



#### function PlatformMatrix

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function PlatformMatrix({ agents, compact = false })
```

### Description

Implementation not visible

The function implementation is not included in the provided source (only the signature line is visible). Because the body is not available, it is not possible to describe the algorithm, return value, or detailed behavior of this function beyond the parameter names and default values present in the signature.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agents` | `unknown` | ✅ | Parameter named 'agents' as declared in the function signature. The implementation is not visible, so its expected shape or use cannot be determined.
 |
| `compact` = `false` | `boolean` | ❌ | Optional parameter named 'compact' with a default value of false as declared in the signature. The implementation is not visible so its effect is unknown.
 |

### Returns

**Type:** `unknown`

Return value(s) cannot be determined because the function body and any return statements are not visible in the provided source.


### Usage Examples

#### Basic invocation with agents and default compact flag

```javascript (jsx)
PlatformMatrix({ agents: myAgents })
```

Shows how to call the function with an 'agents' argument while relying on the default compact=false. The effect is unknown because implementation is not visible.

#### Invocation specifying compact true

```javascript (jsx)
PlatformMatrix({ agents: myAgents, compact: true })
```

Shows how to call the function with both parameters. The observable behavior is not documented here because the implementation body is not provided.

### Complexity

Unknown (implementation not available, cannot determine time or space complexity)

### Notes

- Only the function signature line was provided; the implementation (body) is not available in the input.
- Do not assume behavior, return types, or side effects beyond what is visible in the signature.

---



#### function Minimap

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function Minimap({ state, dispatch })
```

### Description

Implementation not visible

Implementation not visible. The source provided contains only the function signature; no function body or implementation logic is present in the supplied context, so behavior, algorithm, and internal operations cannot be determined from the given information.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` = `none (destructured parameter)` | `unknown (property of the first parameter object)` | ✅ | Destructured property from the single props object passed to the function; actual structure and meaning are not visible in the provided implementation.
 |
| `dispatch` = `none (destructured parameter)` | `unknown (property of the first parameter object)` | ✅ | Destructured property from the single props object passed to the function; actual structure and meaning are not visible in the provided implementation.
 |

### Returns

**Type:** `unknown`

Implementation not visible; no return statements or JSX were provided to determine the return value.


### Usage Examples

#### Typical React component usage (inferred from signature only)

```javascript (jsx)
Minimap({ state, dispatch })
```

Example shows how the function might be invoked as a component or function with a props object that contains state and dispatch. Exact usage, JSX rendering, and behavior are not visible in the provided implementation.

### Complexity

Unknown (implementation not visible)

### Notes

- Only the function signature was provided; the actual implementation body is missing from the supplied source context.
- Because the implementation is not visible, parameters, return values, side effects, exceptions, and internal calls cannot be determined and therefore are documented as unknown.

---



#### function OfficeWorld

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function OfficeWorld({ state, dispatch, scale = 1 })
```

### Description

Represents a React JSX component named OfficeWorld which accepts state, dispatch, and an optional scale prop.


The function signature for a JSX component named OfficeWorld is visible, but the implementation body is not included in the provided source. Therefore no details about rendering, state usage, effects, returned JSX, or internal logic can be determined from the available line. Based on the signature, it likely returns JSX (JSX.Element) and uses the provided state and dispatch to render or manage UI, with scale adjusting visual sizing.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `any` | ✅ | An object or value named state passed into the component; exact shape and usage not visible in the provided implementation.
 |
| `dispatch` | `any` | ✅ | A dispatcher function or callback (commonly used with reducers) passed into the component; exact usage not visible in the provided implementation.
 |
| `scale` = `1` | `number` | ❌ | A numeric scale value with a default of 1; how it affects rendering is not visible in the provided implementation.
 |

### Returns

**Type:** `unknown`

No return statements or JSX are visible in the provided single-line signature; the actual return value (likely JSX.Element if a React component) cannot be determined from the provided content.


**Possible Values:**

- JSX.Element (typical for a React component)
- null
- undefined

### Usage Examples

#### Typical invocation as a React component in JSX

```javascript (jsx)
<OfficeWorld state={state} dispatch={dispatch} scale={1} />
```

Shows how the component might be used in JSX by passing the known parameters; actual rendering behavior is not visible.

#### Calling with a custom scale value

```javascript (jsx)
<OfficeWorld state={state} dispatch={dispatch} scale={2} />
```

Demonstrates supplying a non-default scale prop; effect on output is unknown from provided code.

### Complexity

Unknown time and space complexity because the implementation is not provided.

### Related Functions

- `Unknown` - No information available in the provided line about related functions or modules called by this component.

### Notes

- Only the function signature line was provided. The full implementation body is required to document behavior, return values, side effects, exceptions, called functions, and complexity accurately.
- Parameter types are annotated as generic (any) because the specific shapes are not visible.
- The file extension .jsx suggests this is a React component, so the likely return type is JSX.Element, but that cannot be confirmed without the implementation.

---



#### function HUD

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx/react)
function HUD({ state, dispatch, compact = false, stacked = false })
```

### Description

Implementation not visible

Implementation not provided in the visible source. Only the function signature is available, so the internal behavior, returned JSX or values, and any algorithms cannot be determined from the provided context.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `any` | ✅ | A prop named state passed into the HUD component; exact shape and usage are not visible in the provided implementation.
<br>**Constraints:** No constraints visible in the implementation |
| `dispatch` | `function` | ✅ | A prop named dispatch (likely a function) passed into the HUD component; exact usage is not visible.
<br>**Constraints:** No constraints visible in the implementation |
| `compact` = `false` | `boolean` | ❌ | Optional boolean prop with default value false; purpose and effect are not visible in the implementation.
<br>**Constraints:** Must be a boolean when provided (inferred from default) |
| `stacked` = `false` | `boolean` | ❌ | Optional boolean prop with default value false; purpose and effect are not visible in the implementation.
<br>**Constraints:** Must be a boolean when provided (inferred from default) |

### Returns

**Type:** `unknown`

Return value is not visible because the function body/implementation is not provided in the supplied source. As a React component it would typically return JSX or null, but this cannot be confirmed here.


**Possible Values:**

- JSX.Element (typical for React components) - not confirmed
- null or undefined - not confirmed

### Usage Examples

#### Rendering the HUD component in a React app

```javascript (jsx/react)
<HUD state={someState} dispatch={someDispatch} />
```

Example shows how to call the component with the visible props; exact rendering behavior is unknown because implementation is not visible.

### Complexity

Unknown (implementation not visible, so time and space complexity cannot be determined)

### Notes

- Only the function signature was provided. The actual implementation (function body) is missing, so internal behavior, side effects, return values, and exceptions cannot be determined from the supplied input.
- The file extension and syntax indicate this is a React functional component written in JSX.

---



#### TerminalFeed

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript (jsx)
function TerminalFeed({ state, compact = false, stacked = false })
```

### Description

Describe or render a terminal-like feed component based on provided state and display flags.


The implementation of this function is not included in the provided source snippet, so its internal behavior, return value, and side effects cannot be determined from the available information. From the signature we can infer it accepts a state object and two optional boolean flags that likely affect layout or density of the rendered feed.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `state` | `object` | ✅ | An object representing the terminal feed state (entries, cursor, metadata, etc.). Exact shape is not available from the snippet.
 |
| `compact` = `false` | `boolean` | ❌ | When true, renders the feed in a compact/dense layout. Exact behavior is not visible in the provided snippet.
 |
| `stacked` = `false` | `boolean` | ❌ | When true, renders feed items stacked vertically in a particular way. Exact behavior is not visible in the provided snippet.
 |

### Returns

**Type:** `unknown`

Return value is not visible because the function body/implementation is not provided.


### Usage Examples

#### Basic invocation with only required props

```javascript (jsx)
TerminalFeed({ state: someState })
```

Demonstrates calling the function with the required 'state' property. Exact behavior is unknown because implementation is not visible.

#### Invocation with optional flags

```javascript (jsx)
TerminalFeed({ state: someState, compact: true, stacked: false })
```

Shows how to pass the optional boolean flags; their effect cannot be documented from the snippet.

### Complexity

Not analyzed

### Notes

- Only the function signature line was provided. Implementation, return statements, called functions, and side effects are not present in the provided snippet.
- Because the body is not visible, do not assume any rendering, state mutation, or I/O behavior.

---


