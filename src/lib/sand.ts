// The pixel hourglass on the landscape countdown: which cells are glass, sand or empty for a given part of the
// day gone. Pure maths, drawn by components/SandGlass.

export const SAND_COLS = 15, SAND_ROWS = 23;
const MID = 7, NECK = 11;
/** Half-width of the inside of the glass at row `r` (−1 on the two cap rows). */
const half = (r: number) => {
  if (r <= 0 || r >= SAND_ROWS - 1) return -1;
  const d = Math.abs(r - NECK); // rows from the neck
  return d <= 1 ? 0 : Math.min(6, d - 1);
};

type Cell = [row: number, col: number];
const inside = (from: number, to: number) => {
  const out: Cell[] = [];
  for (let r = from; r <= to; r++) for (let c = MID - half(r); c <= MID + half(r); c++) out.push([r, c]);
  return out;
};
const TOP = inside(1, NECK - 1), BOTTOM = inside(NECK + 1, SAND_ROWS - 2);
/** Grains in the glass (the top chamber full). */
export const GRAINS = TOP.length;

// Top: sand sits against the neck and its surface sinks, the middle first (a dip).
const topOrder = [...TOP].sort((a, b) => {
  const e = ([r, c]: Cell) => (NECK - 1 - r) + Math.max(0, 1.5 - Math.abs(c - MID) * 0.5);
  return e(a) - e(b) || Math.abs(b[1] - MID) - Math.abs(a[1] - MID);
});
// Bottom: sand piles from the floor up, higher in the middle (a heap).
const bottomOrder = [...BOTTOM].sort((a, b) => {
  const e = ([r, c]: Cell) => (SAND_ROWS - 2 - r) + Math.abs(c - MID) * 0.5;
  return e(a) - e(b) || Math.abs(a[1] - MID) - Math.abs(b[1] - MID);
});

const GLASS: Cell[] = (() => {
  const out: Cell[] = [];
  for (let c = 0; c < SAND_COLS; c++) out.push([0, c], [SAND_ROWS - 1, c]);
  for (let r = 1; r < SAND_ROWS - 1; r++) out.push([r, MID - half(r) - 1], [r, MID + half(r) + 1]);
  return out;
})();

/** Grains still in the top chamber when `fraction` of the day is gone (0 at midnight, 1 at the next). */
export const grainsTop = (fraction: number) => Math.round((1 - Math.max(0, Math.min(1, fraction))) * GRAINS);

/** The hourglass with `top` grains above and the rest below. `land` is the row a falling grain stops at. */
export function sandCells(top: number) {
  const k = Math.max(0, Math.min(GRAINS, Math.round(top)));
  const sand = [...topOrder.slice(0, k), ...bottomOrder.slice(0, GRAINS - k)];
  const filled = new Set(sand.map(([r, c]) => r * SAND_COLS + c));
  const empty = [...TOP, ...BOTTOM, [NECK, MID] as Cell].filter(([r, c]) => !filled.has(r * SAND_COLS + c));
  let land = SAND_ROWS - 2;
  while (land > NECK && filled.has(land * SAND_COLS + MID)) land--;
  return { glass: GLASS, sand, empty, land, neck: NECK, mid: MID, falling: k > 0 && land > NECK };
}
