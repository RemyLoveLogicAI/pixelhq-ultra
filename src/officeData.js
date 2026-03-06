// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ PIXELHQ ULTRA — OFFICE LAYOUT & AGENT DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const TILE = 32;          // px per tile
export const WORLD_W  = 60;      // world width in tiles
export const WORLD_H  = 38;      // world height in tiles
export const VIEWPORT_W = 26;    // visible tiles wide
export const VIEWPORT_H = 18;    // visible tiles tall

// ─── Tile type IDs ───────────────────────────────────────────────────────────
export const T = {
  VOID:    0,
  FLOOR:   1,
  WALL:    2,
  GLASS:   3,
  DOOR:    4,
  DESK:    5,
  CHAIR:   6,
  MTABLE:  7,  // meeting table
  SERVER:  8,
  PLANT:   9,
  COFFEE:  10,
  WBOARD:  11,  // whiteboard
  WINDOW:  12,
  CARPET:  13,
  SOFA:    14,
  MONITOR: 15,
  HALLWAY: 16,
  TERMINAL_STATION: 17,
  FILING:  18,
};

// ─── Visual styles per tile ──────────────────────────────────────────────────
export const TILE_STYLE = {
  [T.VOID]:    { bg: "#050508",   border: "none",    label: "" },
  [T.FLOOR]:   { bg: "#13131f",   border: "1px solid #1a1a2e", label: "" },
  [T.HALLWAY]: { bg: "#0e0e1c",   border: "1px solid #161625", label: "" },
  [T.WALL]:    { bg: "#07070f",   border: "1px solid #0d0d1a", label: "", solid: true },
  [T.GLASS]:   { bg: "#4a6fa512", border: "1px solid #4a6fa544", label: "" },
  [T.DOOR]:    { bg: "#5a2e0a",   border: "1px solid #8B4513", label: "🚪" },
  [T.DESK]:    { bg: "#2e1e10",   border: "1px solid #5a3a20", label: "🖥️" },
  [T.CHAIR]:   { bg: "#1a1a2e",   border: "1px solid #2a2a4e", label: "🪑" },
  [T.MTABLE]:  { bg: "#3a2818",   border: "1px solid #6a4a30", label: "" },
  [T.SERVER]:  { bg: "#0a1f0a",   border: "1px solid #1a4f1a", label: "🖧"  },
  [T.PLANT]:   { bg: "#0a1f0a",   border: "1px solid #15400a", label: "🌿" },
  [T.COFFEE]:  { bg: "#1f0a00",   border: "1px solid #5a2000", label: "☕" },
  [T.WBOARD]:  { bg: "#e8e8f0",   border: "1px solid #ccc",    label: "📋" },
  [T.WINDOW]:  { bg: "#1a3a6a22", border: "1px solid #4a8aff55", label: "" },
  [T.CARPET]:  { bg: "#1a0f2e",   border: "1px solid #2a1a4e", label: "" },
  [T.SOFA]:    { bg: "#1a0a2a",   border: "1px solid #3a1a5a", label: "🛋️" },
  [T.MONITOR]: { bg: "#050520",   border: "1px solid #0a0a50", label: "💻" },
  [T.TERMINAL_STATION]: { bg: "#001a00", border: "1px solid #00ff4433", label: "⌨️" },
  [T.FILING]:  { bg: "#1a1000",   border: "1px solid #4a3000", label: "🗄️" },
};

// ─── Generate the world map ──────────────────────────────────────────────────
function fill(map, x, y, w, h, type) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++)
      if (row >= 0 && row < WORLD_H && col >= 0 && col < WORLD_W)
        map[row][col] = type;
}

function wall(map, x, y, w, h) {
  // Outline only
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) {
      if (row === y || row === y + h - 1 || col === x || col === x + w - 1)
        map[row][col] = T.WALL;
    }
}

function glassWall(map, x, y, w, h) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) {
      if (row === y || row === y + h - 1 || col === x || col === x + w - 1)
        map[row][col] = T.GLASS;
    }
}

export function generateOfficeMap() {
  // Start: all void
  const map = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(T.VOID));

  // ── Outer building floor ──────────────────────────────
  fill(map, 0, 0, WORLD_W, WORLD_H, T.FLOOR);
  wall(map, 0, 0, WORLD_W, WORLD_H);       // outer walls

  // Windows along top and bottom edges
  for (let c = 2; c < WORLD_W - 2; c += 4) {
    map[0][c] = T.WINDOW; map[0][c + 1] = T.WINDOW;
    map[WORLD_H - 1][c] = T.WINDOW; map[WORLD_H - 1][c + 1] = T.WINDOW;
  }

  // ── MEETING ROOM (top-left) ────────────────────────────
  // Zone: col 1-13, row 1-11
  fill(map, 1, 1, 13, 11, T.CARPET);
  glassWall(map, 1, 1, 13, 11);
  map[6][13] = T.DOOR;   // door to hallway
  // Meeting table (oval approximation with MTABLE tiles)
  fill(map, 4, 4, 7, 4, T.MTABLE);
  // Chairs around table
  for (let c = 4; c < 11; c++) { map[3][c] = T.CHAIR; map[8][c] = T.CHAIR; }
  map[5][3] = T.CHAIR; map[6][3] = T.CHAIR;
  map[5][11] = T.CHAIR; map[6][11] = T.CHAIR;
  // Whiteboard on left wall
  map[3][2] = T.WBOARD; map[4][2] = T.WBOARD; map[5][2] = T.WBOARD;
  // Plant corners
  map[2][2] = T.PLANT; map[2][12] = T.PLANT;
  map[9][2] = T.PLANT; map[9][12] = T.PLANT;

  // ── BOSS OFFICE (top-right) ────────────────────────────
  // Zone: col 46-58, row 1-13
  fill(map, 46, 1, 13, 13, T.CARPET);
  glassWall(map, 46, 1, 13, 13);
  map[7][46] = T.DOOR;
  // Executive desk
  map[4][55] = T.DESK; map[4][56] = T.DESK;
  map[5][55] = T.DESK; map[5][56] = T.DESK;
  map[4][54] = T.MONITOR;
  map[6][55] = T.CHAIR;
  // Sofa / visitor chairs
  map[10][48] = T.SOFA; map[10][49] = T.SOFA;
  map[11][48] = T.CHAIR; map[11][50] = T.CHAIR;
  // Plants + awards
  map[2][47] = T.PLANT; map[2][57] = T.PLANT;
  // Windows (boss view)
  map[1][48] = T.WINDOW; map[1][49] = T.WINDOW;
  map[1][54] = T.WINDOW; map[1][55] = T.WINDOW;

  // ── MAIN HALLWAY (horizontal, row 12) ─────────────────
  fill(map, 1, 12, WORLD_W - 2, 2, T.HALLWAY);

  // ── OPEN WORKSPACE (center, the big floor) ────────────
  // Zone: col 14-44, row 1-11
  fill(map, 14, 1, 31, 11, T.FLOOR);
  // 3 rows × 5 desks (with gaps)
  const deskCols = [15, 18, 21, 24, 27, 30, 33, 36, 39];
  const deskRows = [2, 5, 8];
  deskRows.forEach((r, ri) =>
    deskCols.forEach((c, ci) => {
      map[r][c]     = T.DESK;
      map[r][c + 1] = T.MONITOR;
      map[r + 1][c] = T.CHAIR;
      if ((ri + ci) % 4 === 0) map[r - 1][c] = T.PLANT;  // occasional plant
    })
  );
  // Terminal station (where bash/tool work happens visually)
  map[10][16] = T.TERMINAL_STATION; map[10][17] = T.TERMINAL_STATION;
  // Filing cabinet row
  map[10][30] = T.FILING; map[10][31] = T.FILING; map[10][32] = T.FILING;

  // ── SUPERVISOR ZONE (col 14-44, row 14-22) ────────────
  fill(map, 14, 14, 31, 9, T.FLOOR);
  // Supervisor desks (front row of open plan, lower section)
  const supDesks = [16, 22, 28, 34, 40];
  supDesks.forEach(c => {
    map[15][c] = T.DESK; map[15][c + 1] = T.MONITOR;
    map[16][c] = T.CHAIR;
  });
  // Second row employee desks
  const emp2Rows = [19, 21];
  emp2Rows.forEach(r =>
    [16, 22, 28, 34].forEach(c => {
      map[r][c] = T.DESK; map[r][c + 1] = T.MONITOR;
      map[r + 1] && (map[r + 1][c] = T.CHAIR);
    })
  );

  // ── BREAK ROOM (bottom-left) ───────────────────────────
  fill(map, 1, 25, 13, 12, T.FLOOR);
  wall(map, 1, 25, 13, 12);
  map[25][8] = T.DOOR;
  // Coffee station
  map[27][3] = T.COFFEE; map[27][4] = T.COFFEE;
  // Sofas
  map[30][3] = T.SOFA; map[30][4] = T.SOFA; map[30][5] = T.SOFA;
  map[32][3] = T.SOFA; map[32][4] = T.SOFA;
  map[29][8] = T.CHAIR; map[29][9] = T.CHAIR;
  // Plants
  map[26][2] = T.PLANT; map[26][12] = T.PLANT;
  map[35][2] = T.PLANT; map[35][12] = T.PLANT;

  // ── SERVER ROOM / INTERN DEN (bottom-right) ───────────
  fill(map, 46, 25, 13, 12, T.FLOOR);
  wall(map, 46, 25, 13, 12);
  map[25][51] = T.DOOR;
  // Server racks
  for (let c = 48; c <= 56; c += 2) {
    map[27][c] = T.SERVER; map[28][c] = T.SERVER;
  }
  // Intern desks (crammed)
  map[31][47] = T.DESK; map[31][49] = T.DESK;
  map[31][51] = T.DESK; map[31][53] = T.DESK;
  map[32][47] = T.CHAIR; map[32][49] = T.CHAIR;
  map[32][51] = T.CHAIR; map[32][53] = T.CHAIR;
  // Terminal stations for interns
  map[34][47] = T.TERMINAL_STATION; map[34][48] = T.TERMINAL_STATION;

  // ── LOWER HALLWAY (row 23-24) ──────────────────────────
  fill(map, 1, 23, WORLD_W - 2, 2, T.HALLWAY);

  // ── VERTICAL CORRIDOR (col 13) ────────────────────────
  fill(map, 13, 1, 1, WORLD_H - 2, T.HALLWAY);
  fill(map, 45, 1, 1, WORLD_H - 2, T.HALLWAY);

  return map;
}

// ─── Named waypoints in the office ─────────────────────────────────────────
// Each room/zone has named tiles for agent navigation
export const WAYPOINTS = {
  // Meeting room
  meetingTable:    { x: 7,  y: 6 },
  meetingChair1:   { x: 4,  y: 3 },
  meetingChair2:   { x: 7,  y: 3 },
  meetingChair3:   { x: 10, y: 3 },
  meetingChair4:   { x: 4,  y: 8 },
  meetingChair5:   { x: 7,  y: 8 },
  meetingChair6:   { x: 10, y: 8 },
  meetingEntry:    { x: 14, y: 6 },
  // Boss office
  bossDesk:        { x: 55, y: 5 },
  bossOfficeEntry: { x: 45, y: 7 },
  bossVisitor1:    { x: 48, y: 11 },
  bossVisitor2:    { x: 50, y: 11 },
  // Open workspace
  terminalStation: { x: 16, y: 10 },
  filingCabinet:   { x: 30, y: 10 },
  workspaceCenter: { x: 28, y: 6  },
  // Supervisor zone
  supDesk1:        { x: 16, y: 15 },
  supDesk2:        { x: 22, y: 15 },
  // Break room
  coffeeStation:   { x: 3,  y: 27 },
  breakRoomSofa:   { x: 3,  y: 30 },
  // Server room
  serverRack:      { x: 50, y: 27 },
  internDesk1:     { x: 47, y: 31 },
  internDesk2:     { x: 49, y: 31 },
  internDesk3:     { x: 51, y: 31 },
  internDesk4:     { x: 53, y: 31 },
  // Hallway hubs
  hallwayCenter:   { x: 28, y: 12 },
  hallwayLeft:     { x: 8,  y: 12 },
  hallwayRight:    { x: 50, y: 12 },
};

// ─── Destination lookup by event type ────────────────────────────────────────
export const DEST_BY_EVENT = {
  tool_bash:  "terminalStation",
  tool_read:  "filingCabinet",
  tool_write: "workspaceCenter",
  tool_edit:  "workspaceCenter",
  tool_task:  "hallwayCenter",
  thinking:   "workspaceCenter",
};

// ─── Agent definitions ────────────────────────────────────────────────────────
// ROLE hierarchy: boss → supervisor → employee → intern
export const AGENT_ROLES = { BOSS: "boss", SUPERVISOR: "supervisor", EMPLOYEE: "employee", INTERN: "intern" };

// Pixel art: 7 wide × 12 tall, each cell is a color string or 0 (transparent)
const _ = 0;
const SPRITES = {
  boss: {
    idle: [
      [_, _, "#FFD700", "#FFD700", "#FFD700", _, _],
      [_, "#B8860B", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#B8860B", _],
      [_, "#B8860B", "#FAEBD7", "#000",    "#FAEBD7", "#B8860B", _],
      [_, "#8B6914", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#8B6914", _],
      [_, "#1a1a4a", "#FFD700", "#FFD700", "#FFD700", "#1a1a4a", _],
      ["#1a1a4a", "#1a1a4a", "#1a1a4a", "#FFD700", "#1a1a4a", "#1a1a4a", "#1a1a4a"],
      ["#1a1a4a", "#1a1a4a", "#1a1a4a", "#1a1a4a", "#1a1a4a", "#1a1a4a", "#1a1a4a"],
      [_, "#0d0d2e", "#0d0d2e", _, "#0d0d2e", "#0d0d2e", _],
      [_, "#0d0d2e", _, _, _, "#0d0d2e", _],
    ],
  },
  supervisor: {
    idle: [
      [_, _, "#93C5FD", "#93C5FD", "#93C5FD", _, _],
      [_, "#4169E1", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#4169E1", _],
      [_, "#4169E1", "#FAEBD7", "#333",    "#FAEBD7", "#4169E1", _],
      [_, "#1E3A8A", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#1E3A8A", _],
      [_, "#1E4080", "#4169E1", "#4169E1", "#4169E1", "#1E4080", _],
      ["#1E4080", "#1E4080", "#1E4080", "#4169E1", "#1E4080", "#1E4080", "#1E4080"],
      ["#1E4080", "#1E4080", "#1E4080", "#1E4080", "#1E4080", "#1E4080", "#1E4080"],
      [_, "#0a0a3e", "#0a0a3e", _, "#0a0a3e", "#0a0a3e", _],
      [_, "#0a0a3e", _, _, _, "#0a0a3e", _],
    ],
  },
  employee1: {
    idle: [
      [_, _, "#86EFAC", "#86EFAC", "#86EFAC", _, _],
      [_, "#22C55E", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#22C55E", _],
      [_, "#22C55E", "#FAEBD7", "#222",    "#FAEBD7", "#22C55E", _],
      [_, "#15803D", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#15803D", _],
      [_, "#15803D", "#22C55E", "#22C55E", "#22C55E", "#15803D", _],
      ["#15803D", "#15803D", "#22C55E", "#22C55E", "#22C55E", "#15803D", "#15803D"],
      ["#15803D", "#15803D", "#15803D", "#15803D", "#15803D", "#15803D", "#15803D"],
      [_, "#0a2010", "#0a2010", _, "#0a2010", "#0a2010", _],
      [_, "#0a2010", _, _, _, "#0a2010", _],
    ],
  },
  employee2: {
    idle: [
      [_, _, "#FCA5A5", "#FCA5A5", "#FCA5A5", _, _],
      [_, "#EF4444", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#EF4444", _],
      [_, "#EF4444", "#FAEBD7", "#111",    "#FAEBD7", "#EF4444", _],
      [_, "#991B1B", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#991B1B", _],
      [_, "#991B1B", "#EF4444", "#EF4444", "#EF4444", "#991B1B", _],
      ["#991B1B", "#991B1B", "#EF4444", "#EF4444", "#EF4444", "#991B1B", "#991B1B"],
      ["#991B1B", "#991B1B", "#991B1B", "#991B1B", "#991B1B", "#991B1B", "#991B1B"],
      [_, "#200000", "#200000", _, "#200000", "#200000", _],
      [_, "#200000", _, _, _, "#200000", _],
    ],
  },
  employee3: {
    idle: [
      [_, _, "#D8B4FE", "#D8B4FE", "#D8B4FE", _, _],
      [_, "#A855F7", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#A855F7", _],
      [_, "#A855F7", "#FAEBD7", "#222",    "#FAEBD7", "#A855F7", _],
      [_, "#7E22CE", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#7E22CE", _],
      [_, "#7E22CE", "#A855F7", "#A855F7", "#A855F7", "#7E22CE", _],
      ["#7E22CE", "#7E22CE", "#A855F7", "#A855F7", "#A855F7", "#7E22CE", "#7E22CE"],
      ["#7E22CE", "#7E22CE", "#7E22CE", "#7E22CE", "#7E22CE", "#7E22CE", "#7E22CE"],
      [_, "#150025", "#150025", _, "#150025", "#150025", _],
      [_, "#150025", _, _, _, "#150025", _],
    ],
  },
  intern1: {
    idle: [
      [_, _, "#FED7AA", "#FED7AA", "#FED7AA", _, _],
      [_, "#FB923C", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#FB923C", _],
      [_, "#FB923C", "#FAEBD7", "#333",    "#FAEBD7", "#FB923C", _],
      [_, "#9A3412", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#9A3412", _],
      [_, "#9A3412", "#FB923C", "#FB923C", "#FB923C", "#9A3412", _],
      ["#9A3412", "#9A3412", "#FB923C", "#FB923C", "#FB923C", "#9A3412", "#9A3412"],
      ["#9A3412", "#9A3412", "#9A3412", "#9A3412", "#9A3412", "#9A3412", "#9A3412"],
      [_, "#200800", "#200800", _, "#200800", "#200800", _],
      [_, "#200800", _, _, _, "#200800", _],
    ],
  },
  intern2: {
    idle: [
      [_, _, "#99F6E4", "#99F6E4", "#99F6E4", _, _],
      [_, "#14B8A6", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#14B8A6", _],
      [_, "#14B8A6", "#FAEBD7", "#111",    "#FAEBD7", "#14B8A6", _],
      [_, "#0F766E", "#FAEBD7", "#FAEBD7", "#FAEBD7", "#0F766E", _],
      [_, "#0F766E", "#14B8A6", "#14B8A6", "#14B8A6", "#0F766E", _],
      ["#0F766E", "#0F766E", "#14B8A6", "#14B8A6", "#14B8A6", "#0F766E", "#0F766E"],
      ["#0F766E", "#0F766E", "#0F766E", "#0F766E", "#0F766E", "#0F766E", "#0F766E"],
      [_, "#001510", "#001510", _, "#001510", "#001510", _],
      [_, "#001510", _, _, _, "#001510", _],
    ],
  },
};

// ─── Initial agent roster ─────────────────────────────────────────────────────
export const INITIAL_AGENTS = [
  {
    id: "boss",
    name: "The Boss",
    role: AGENT_ROLES.BOSS,
    sprite: SPRITES.boss,
    color: "#FFD700",
    accent: "#D97706",
    tool: "claudecode",
    spawn: WAYPOINTS.bossDesk,
    homeWaypoint: "bossDesk",
    xp: 0, level: 1, xpToNext: 100,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "sup1",
    name: "Supervisor",
    role: AGENT_ROLES.SUPERVISOR,
    sprite: SPRITES.supervisor,
    color: "#93C5FD",
    accent: "#4169E1",
    tool: "claudecode",
    spawn: WAYPOINTS.supDesk1,
    homeWaypoint: "supDesk1",
    xp: 0, level: 1, xpToNext: 100,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "emp1",
    name: "Dev Alpha",
    role: AGENT_ROLES.EMPLOYEE,
    sprite: SPRITES.employee1,
    color: "#86EFAC",
    accent: "#22C55E",
    tool: "codexcli",
    spawn: { x: 15, y: 3 },
    homeWaypoint: "workspaceCenter",
    xp: 0, level: 1, xpToNext: 75,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "emp2",
    name: "Dev Beta",
    role: AGENT_ROLES.EMPLOYEE,
    sprite: SPRITES.employee2,
    color: "#FCA5A5",
    accent: "#EF4444",
    tool: "geminicli",
    spawn: { x: 21, y: 3 },
    homeWaypoint: "workspaceCenter",
    xp: 0, level: 1, xpToNext: 75,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "emp3",
    name: "Dev Gamma",
    role: AGENT_ROLES.EMPLOYEE,
    sprite: SPRITES.employee3,
    color: "#D8B4FE",
    accent: "#A855F7",
    tool: "opencode",
    spawn: { x: 27, y: 5 },
    homeWaypoint: "workspaceCenter",
    xp: 0, level: 1, xpToNext: 75,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "int1",
    name: "Intern Kai",
    role: AGENT_ROLES.INTERN,
    sprite: SPRITES.intern1,
    color: "#FED7AA",
    accent: "#FB923C",
    tool: "claudecode",
    spawn: WAYPOINTS.internDesk1,
    homeWaypoint: "internDesk1",
    xp: 0, level: 1, xpToNext: 50,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
  {
    id: "int2",
    name: "Intern Mox",
    role: AGENT_ROLES.INTERN,
    sprite: SPRITES.intern2,
    color: "#99F6E4",
    accent: "#14B8A6",
    tool: "codexcli",
    spawn: WAYPOINTS.internDesk2,
    homeWaypoint: "internDesk2",
    xp: 0, level: 1, xpToNext: 50,
    state: "idle",
    bubbles: [],
    currentTask: null,
    stats: { tasksCompleted: 0, linesWritten: 0, commandsRun: 0, meetings: 0 },
    evolution: [],
  },
];

// XP rewards per action
export const XP_TABLE = {
  task_complete:    30,
  tool_use:         5,
  peer_review:      20,
  knowledge_share:  15,
  meeting_attend:   10,
  debate_win:       25,
  level_up_bonus:   50,
};

// Evolution milestones (level → unlocked ability)
export const EVOLUTION_MILESTONES = {
  boss:       { 2: "Strategic Vision",  3: "Force Meeting",    5: "God Mode"        },
  supervisor: { 2: "Multi-Task",        3: "Priority Override",5: "Resource Surge"  },
  employee:   { 2: "Speed Boost",       3: "Debug Sense",      5: "Pair Program"    },
  intern:     { 2: "Quick Learn",       3: "Coffee Power",     5: "Promoted!"       },
};
