<details>
<summary>Documentation Metadata (click to expand)</summary>

```json
{
  "doc_type": "file_overview",
  "file_path": "src/officeData.js",
  "source_hash": "cff41f87cd2461d582dd4f158e258c0b3c5185c013ca68ad7e17224201ee4b54",
  "last_updated": "2026-03-07T08:34:55.573753+00:00",
  "tokens_used": 21607,
  "complexity_score": 3,
  "estimated_review_time_minutes": 10,
  "external_dependencies": []
}
```

</details>

[Documentation Home](../README.md) > [src](./README.md) > **officeData**

---

# officeData.js

> **File:** `src/officeData.js`

![Complexity: Low](https://img.shields.io/badge/Complexity-Low-green) ![Review Time: 10min](https://img.shields.io/badge/Review_Time-10min-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)
- [Usage Examples](#usage-examples)
- [Maintenance Notes](#maintenance-notes)
- [Functions and Classes](#functions-and-classes)

---

## Overview

This module is a self-contained data and map definition file for a tile-based office simulation. It exports numeric constants for tile sizing and world dimensions (TILE, WORLD_W, WORLD_H, VIEWPORT_W, VIEWPORT_H), a set of tile type IDs (T), visual presentation details per tile (TILE_STYLE), helper functions to compose a 2D tile map (fill, wall, glassWall) and a single exported map generator function (export function generateOfficeMap()). The generator builds and returns a WORLD_H × WORLD_W 2D array of tile IDs (row-major: map[row][col]) and places rooms, walls, doors, furniture, plants, workstations, and windows by calling the small helper functions and writing explicit tile values into the map array.

Beyond map generation, the file exposes navigation and gameplay metadata used by other systems: WAYPOINTS (named x/y coordinates for agent navigation), DEST_BY_EVENT (mapping event types to waypoint names), AGENT_ROLES and PLATFORM_CONFIG (role and platform enumerations / metadata), SPRITES (pixel art definitions as color grids), INITIAL_AGENTS (array of agent objects with spawn/homeWaypoint, sprites, tools, platforms, XP/level state, stats, and other properties), XP_TABLE (XP rewards per action), and EVOLUTION_MILESTONES (abilities unlocked at specific levels per role). All data structures are plain JavaScript objects/arrays and are exported for use by rendering, AI/agent logic, or simulation orchestration. The module contains no external imports and performs no I/O; it is pure in the sense that generateOfficeMap deterministically produces the same map given the constants in the file.

## Dependencies

No dependencies identified.

## 📁 Directory

This file is part of the **src** directory. View the [directory index](_docs/src/README.md) to see all files in this module.

## Architecture Notes

- Module-style data/config file: exports constants, lookup maps, sprites, and a single generator function. Consumers import values (TILE, TILE_STYLE, WAYPOINTS, INITIAL_AGENTS, generateOfficeMap, etc.) rather than instantiating classes.
- Deterministic, imperative map construction: generateOfficeMap uses helper functions fill(map, x, y, w, h, type), wall(map, x, y, w, h), and glassWall(map, x, y, w, h) to mutate a 2D array (map[row][col]). The map uses row-major indexing where row corresponds to Y and col corresponds to X.
- No error handling is implemented: helper functions assume numeric parameters and rely on bounds checks only when writing to map (they verify row/col are within WORLD_H and WORLD_W in fill). Consumers should ensure WORLD_* constants remain consistent with intended rendering and that code using WAYPOINTS accesses valid coordinates.
- State is held in exported plain objects/arrays (immutable by default in source, but mutable at runtime). There is no runtime persistence, network calls, or side effects in this file.

## Usage Examples

### Rendering the office map on a tile grid

Call generateOfficeMap() to obtain a 2D array: const map = generateOfficeMap(); Iterate rows and columns and for each cell read the tile id (number). Use TILE_STYLE[tileId] to obtain background color, border, label and optional 'solid' flag for collision. Multiply grid coordinates by TILE (pixels per tile) to position sprites when drawing on a canvas or DOM. Example flow: const map = generateOfficeMap(); for (let y=0; y<WORLD_H; y++) for (let x=0; x<WORLD_W; x++) { const id = map[y][x]; const style = TILE_STYLE[id]; drawTile(x * TILE, y * TILE, TILE, style); }.

### Spawning agents and navigation

Import INITIAL_AGENTS and WAYPOINTS to create runtime agent entities. Each INITIAL_AGENTS entry provides spawn (either a direct {x,y} or reference to WAYPOINTS), homeWaypoint name, sprite data (SPRITES.*), tool/platforms and XP/level state. To send an agent to a destination triggered by an event, resolve DEST_BY_EVENT[eventType] to a waypoint name, read WAYPOINTS[waypointName] for {x,y}, and issue a pathfinding/navigation request from agent.spawn to that coordinate. Example: const destName = DEST_BY_EVENT['tool_bash']; const dest = WAYPOINTS[destName]; agent.moveTo(dest.x, dest.y);

## Maintenance Notes

- Performance: generateOfficeMap builds a full 2D array each call. If the map is static, call it once and cache the result instead of regenerating every frame. The map size is WORLD_W × WORLD_H controlled by constants at top.
- Extensibility: helper functions (fill, wall, glassWall) are simple mutators. To support parameterized maps, consider adding function parameters to generateOfficeMap for variants (e.g., seed, flipped layouts) or exporting the helpers for external procedural composition.
- Coordinate conventions: the file uses map[row][col] (y then x). Consumers must follow this convention to avoid off-by-one or transposed rendering bugs.
- Testing: add unit tests that assert known waypoint coordinates and that specific tiles exist at expected map positions (e.g., meeting table at map[6][7] is T.MTABLE). Edge cases include verifying fill/wall respect array bounds when world dimensions change.
- Type-safety: consider adding TypeScript typings or JSDoc if consumers rely on exact object shapes (e.g., agent objects, waypoint entries, sprite arrays) to avoid runtime property errors.

---

## Navigation

**↑ Parent Directory:** [Go up](_docs/src/README.md)

---

*This documentation was automatically generated by AI ([Woden DocBot](https://github.com/marketplace/ai-document-creator)) and may contain errors. It is the responsibility of the user to validate the accuracy and completeness of this documentation.*


---

## Functions and Classes


#### function fill

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function fill(map, x, y, w, h, type) -> undefined
```

### Description

Mutates a 2D array 'map' by setting elements in a rectangular region (x..x+w-1, y..y+h-1) to the provided 'type' when those indices fall within global WORLD_H and WORLD_W bounds.


The function iterates over rows from y to y + h - 1 and columns from x to x + w - 1. For each (row, col) coordinate it checks that row is between 0 (inclusive) and WORLD_H (exclusive) and col is between 0 (inclusive) and WORLD_W (exclusive). If the coordinate is within those global bounds, it assigns map[row][col] = type. The function has no return statement (returns undefined). It directly mutates the passed-in map array and relies on the global constants WORLD_H and WORLD_W for bounds checks.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `map` | `Array<Array<any>>` | ✅ | A 2D array (array of rows) whose elements will be overwritten in the specified rectangular region.
<br>**Constraints:** Should be indexable as map[row][col], Rows should be accessible for indices in the intersection of the requested rectangle and [0, WORLD_H), No internal validation is performed by the function |
| `x` | `number` | ✅ | Left column index of the rectangle (inclusive).
<br>**Constraints:** Used as start column; expected to be an integer or numeric value, Columns considered are x through x + w - 1 |
| `y` | `number` | ✅ | Top row index of the rectangle (inclusive).
<br>**Constraints:** Used as start row; expected to be an integer or numeric value, Rows considered are y through y + h - 1 |
| `w` | `number` | ✅ | Width of the rectangle (number of columns).
<br>**Constraints:** Non-positive or zero values result in zero iterations across columns, Expected to be an integer or numeric value |
| `h` | `number` | ✅ | Height of the rectangle (number of rows).
<br>**Constraints:** Non-positive or zero values result in zero iterations across rows, Expected to be an integer or numeric value |
| `type` | `any` | ✅ | Value to assign into each covered cell of the map.
<br>**Constraints:** No constraints; assigned as-is to map[row][col] |

### Returns

**Type:** `undefined`

The function does not return a value; it performs in-place mutation of the provided map array.


**Possible Values:**

- undefined

### Side Effects

> ❗ **IMPORTANT**
> This function has side effects that modify state or perform I/O operations.

- Mutates the provided 'map' 2D array by assigning map[row][col] = type for covered cells
- Reads global variables WORLD_H and WORLD_W to determine valid bounds

### Usage Examples

#### Fill a 3x2 rectangle starting at column 4, row 5 with value 1

```javascript
fill(map, 4, 5, 3, 2, 1);
```

Sets map[5][4], map[5][5], map[5][6], map[6][4], map[6][5], map[6][6] to 1 when each coordinate is within WORLD_H/W bounds.

#### Attempt to fill a rectangle that extends outside world bounds

```javascript
fill(map, -2, -1, 5, 4, 'wall');
```

Only coordinates that pass the (row >= 0 && row < WORLD_H && col >= 0 && col < WORLD_W) check are written; out-of-bounds cells are skipped.

### Complexity

Time: O(w * h) — the function visits each cell in the specified rectangle once (subject to bounds checks). Space: O(1) additional space (in-place mutation).

### Notes

- The function does not validate types of inputs; passing a non-array or ragged array may result in runtime errors when indexing map[row][col].
- WORLD_H and WORLD_W must be defined in the surrounding scope; otherwise a ReferenceError will be thrown when the function accesses them.
- If w or h are non-integer numbers, the for-loops use them as numeric bounds; fractional values will be coerced by the loop semantics (effectively treated as numbers in the comparison).

---



#### function wall

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function wall(map, x, y, w, h)
```

### Description

Iterates over a rectangular region of a 2D array and sets only the outer boundary cells to T.WALL.


This function treats the 'map' parameter as a 2D array indexed by row then column. It iterates rows from y to y + h - 1 and columns from x to x + w - 1. For each cell within that rectangular region, it checks whether the cell is on the rectangle's perimeter (top row, bottom row, left column, or right column). If so, it assigns T.WALL to map[row][col]. Interior cells (not on the perimeter) are left unchanged. The function contains no return statement and performs its work by mutating the provided map array.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `map` | `Array<Array<any>>` | ✅ | A 2D array (rows then columns) representing the map; elements in this array may be overwritten on the rectangle boundary.
 |
| `x` | `number` | ✅ | Column index of the rectangle's top-left corner within the map.
 |
| `y` | `number` | ✅ | Row index of the rectangle's top-left corner within the map.
 |
| `w` | `number` | ✅ | Width of the rectangle (number of columns to cover).
 |
| `h` | `number` | ✅ | Height of the rectangle (number of rows to cover).
 |

### Returns

**Type:** `undefined`

This function does not return a value; it mutates the provided map in-place.


**Possible Values:**

- undefined

### Side Effects

> ❗ **IMPORTANT**
> This function has side effects that modify state or perform I/O operations.

- Mutates the provided map 2D array by assigning T.WALL to elements on the specified rectangle's perimeter
- Reads the global identifier T (uses its WALL property/value when assigning)

### Usage Examples

#### Mark an outline wall on a map at position (1,1) with width 4 and height 3

```javascript
wall(map, 1, 1, 4, 3);
```

Sets map[1..3][1..4] perimeter cells to T.WALL, leaving interior cells unchanged.

### Complexity

Time: O(w * h) because it iterates over every cell in the rectangle region once; Space: O(1) additional space (in-place mutation).

### Related Functions

- `fill` - Likely complementary: 'fill' functions often set entire rectangular regions, whereas this function only sets the outline; not called here but conceptually related.

### Notes

- The function assumes 'map' is indexable as map[row][col] and that T.WALL is defined in the surrounding scope.
- No validation is performed on parameter values (e.g., bounds checking, integer enforcement). Out-of-range indices or non-array 'map' may produce runtime errors.
- The in-function comment 'Outline only' correctly describes that only the perimeter is modified.

---



#### function glassWall

![Type: Sync](https://img.shields.io/badge/Type-Sync-green)

### Signature

```javascript
function glassWall(map: Array<Array<any>>, x: number, y: number, w: number, h: number): void
```

### Description

Iterates over the rectangular area defined by (x, y, w, h) and sets the perimeter cells of the provided 2D map array to T.GLASS.


The function uses two nested for-loops to iterate rows from y to y+h-1 and columns from x to x+w-1. For each cell in that rectangle it tests whether the cell is on the rectangle's boundary (top row, bottom row, left column, or right column). If the cell is on the boundary, it assigns the value T.GLASS to map[row][col]. The function does not return a value.

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `map` | `Array<Array<any>>` | ✅ | A 2D array (grid) where the function will set perimeter cells to T.GLASS. Treated as mutable; elements are assigned directly.
<br>**Constraints:** Must be an indexable 2D array: map[row][col] must be a valid l-value for rows in the range used, Rows should be at least of length x + w to avoid out-of-bounds access, Contains mutable elements that can be assigned the value T.GLASS |
| `x` | `number` | ✅ | X coordinate (column index) of the top-left corner of the rectangle.
<br>**Constraints:** Integer index (typically >= 0), x + w - 1 must be within valid column indices of map rows |
| `y` | `number` | ✅ | Y coordinate (row index) of the top-left corner of the rectangle.
<br>**Constraints:** Integer index (typically >= 0), y + h - 1 must be within valid row indices of map |
| `w` | `number` | ✅ | Width of the rectangle in columns.
<br>**Constraints:** Expected to be a positive integer (w > 0), Defines horizontal span from x to x + w - 1 |
| `h` | `number` | ✅ | Height of the rectangle in rows.
<br>**Constraints:** Expected to be a positive integer (h > 0), Defines vertical span from y to y + h - 1 |

### Returns

**Type:** `void (undefined)`

The function does not explicitly return a value; it performs in-place mutation of the provided map.


**Possible Values:**

- undefined

### Side Effects

> ❗ **IMPORTANT**
> This function has side effects that modify state or perform I/O operations.

- Mutates the provided 2D array argument `map` by assigning T.GLASS to perimeter cells within the specified rectangle

### Usage Examples

#### Mark the perimeter of a 4x3 rectangle starting at column 2, row 1 as glass on a mutable grid

```javascript
glassWall(map, 2, 1, 4, 3);
```

Sets T.GLASS on the boundary cells of the rectangle spanning columns 2..5 and rows 1..3 in the given map.

### Complexity

Time complexity O(w * h) where w and h are the rectangle's width and height (each cell in the rectangle is visited once); space complexity O(1) additional auxiliary space (in-place modification).

### Notes

- The function references the identifier T.GLASS; T must be defined in the surrounding scope for this assignment to succeed.
- No bounds checking is performed — if map does not have rows/columns covering the specified rectangle, index access may throw a runtime error.
- Only perimeter cells are assigned; interior cells (if any) are left unchanged.

---


