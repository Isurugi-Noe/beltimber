/**
 * Limit Cut Position Guide — edge projections + geometric spread from opposite.
 */
const CENTER = { x: 200, y: 200 };
const ARENA_R = 175;
const SQUARE_HALF = 11;


const WAYMARKS_CW = ["A", "2", "B", "3", "C", "4", "D", "1"];

const OPPOSITE = {
  A: "C",
  C: "A",
  B: "D",
  D: "B",
  "1": "3",
  "3": "1",
  "2": "4",
  "4": "2",
};

const WAYMARK_STYLE = {
  A: { color: "#e85c5c", shape: "circle" },
  B: { color: "#e8c840", shape: "circle" },
  C: { color: "#5b8def", shape: "circle" },
  D: { color: "#a86bd4", shape: "circle" },
  "1": { color: "#e85c5c", shape: "square" },
  "2": { color: "#e8c840", shape: "square" },
  "3": { color: "#5b8def", shape: "square" },
  "4": { color: "#a86bd4", shape: "square" },
};

const WAYMARK_POS = {
  A: { x: 200, y: 95 },
  B: { x: 305, y: 200 },
  C: { x: 200, y: 305 },
  D: { x: 95, y: 200 },
  "1": { x: 138, y: 138 },
  "2": { x: 262, y: 138 },
  "3": { x: 262, y: 262 },
  "4": { x: 138, y: 262 },
};

/**
 * Number markers: two players share perpendicular outer edges of the square.
 * edgeX/edgeY = which point on the square the axis-aligned line leaves from.
 */
const SPOT_PROJECTION = {
  A1: { square: "1", wall: "north", edgeX: "left" },
  "4A": { square: "1", wall: "west", edgeY: "bottom" },
  "1B": { square: "2", wall: "north", edgeX: "right" },
  B2: { square: "2", wall: "east", edgeY: "bottom" },
  "2C": { square: "3", wall: "east", edgeY: "top" },
  C3: { square: "3", wall: "south", edgeX: "right" },
  "3D": { square: "4", wall: "south", edgeX: "left" },
  D4: { square: "4", wall: "west", edgeY: "top" },
};

const PLAYER_ODD_COLOR = "#7eb8da";
const PLAYER_EVEN_COLOR = "#e85c5c";

function playerColor(n) {
  return n % 2 === 1 ? PLAYER_ODD_COLOR : PLAYER_EVEN_COLOR;
}

function square2x2(cx, cy, s) {
  const h = s / 2;
  return [
    [cx - h, cy - h],
    [cx + h, cy - h],
    [cx - h, cy + h],
    [cx + h, cy + h],
  ];
}

/** Three dots in an upward-pointing triangle. */
function triangle3(cx, cy, s) {
  const halfBase = s * 0.52;
  const topY = cy - s * 0.32;
  const bottomY = cy + s * 0.32;
  return [
    [cx, topY],
    [cx - halfBase, bottomY],
    [cx + halfBase, bottomY],
  ];
}

function leftDotGroup(count, cx, s) {
  if (count === 1) return [[cx, 0]];
  if (count === 2) return [[cx, -s / 2], [cx, s / 2]];
  if (count === 3) return triangle3(cx, 0, s);
  return square2x2(cx, 0, s);
}

/** Dot centers relative to marker origin. */
function dotOffsetsForPlayer(n, spacing) {
  const s = spacing;
  if (n === 1) return [[0, 0]];
  if (n === 2) return [[0, -s / 2], [0, s / 2]];
  if (n === 3) return triangle3(0, 0, s);
  if (n === 4) return square2x2(0, 0, s);
  if (n === 6) {
    return [...triangle3(-s * 0.55, 0, s), ...triangle3(s * 0.55, 0, s)];
  }

  const left = n - 4;
  const rightCenterX = s * 0.85;
  const leftCenterX = -(s * 0.85 + (left > 1 ? s * 0.35 : 0));
  return [...leftDotGroup(left, leftCenterX, s), ...square2x2(rightCenterX, 0, s)];
}

function appendSvgDots(parent, player, spacing, radius) {
  const svgNs = "http://www.w3.org/2000/svg";
  const color = playerColor(player);
  const offsets = dotOffsetsForPlayer(player, spacing);

  for (const [dx, dy] of offsets) {
    const dot = document.createElementNS(svgNs, "circle");
    dot.setAttribute("cx", String(dx));
    dot.setAttribute("cy", String(dy));
    dot.setAttribute("r", String(radius));
    dot.setAttribute("fill", color);
    dot.setAttribute("class", "player-dot");
    parent.appendChild(dot);
  }
}

function playerDotsHtml(player, spacing, { dotScale = 0.55 } = {}) {
  const color = playerColor(player);
  const dotSize = spacing * dotScale;
  const offsets = dotOffsetsForPlayer(player, spacing);
  const dots = offsets
    .map(
      ([dx, dy]) =>
        `<span class="dot" style="width:${dotSize}px;height:${dotSize}px;background:${color};transform:translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))"></span>`
    )
    .join("");
  const width = spacing * (player === 6 || player >= 5 ? 3.4 : player >= 3 ? 2.2 : 1.6);
  return `<span class="player-tag" style="width:${width}px;height:${spacing * 1.6}px">${dots}</span>`;
}

function relativeNorthDegrees() {
  if (northMode !== "relative") return 0;
  const destination = OPPOSITE[dashOrigin];
  const idx = WAYMARKS_CW.indexOf(destination);
  return ((8 - idx) % 8) * 45;
}

function uprightCounterRotation() {
  return -relativeNorthDegrees();
}

function appendUprightContent(svgNs, parent, build) {
  const counter = uprightCounterRotation();
  if (!counter) {
    build(parent);
    return;
  }
  const upright = document.createElementNS(svgNs, "g");
  upright.setAttribute("transform", `rotate(${counter})`);
  build(upright);
  parent.appendChild(upright);
}

function squareEdges(id) {
  const { x, y } = WAYMARK_POS[id];
  return {
    left: x - SQUARE_HALF,
    right: x + SQUARE_HALF,
    top: y - SQUARE_HALF,
    bottom: y + SQUARE_HALF,
  };
}

function squareEdgeAnchor(spec) {
  const e = squareEdges(spec.square);
  switch (spec.wall) {
    case "north":
      return { x: e[spec.edgeX], y: e.top };
    case "south":
      return { x: e[spec.edgeX], y: e.bottom };
    case "east":
      return { x: e.right, y: e[spec.edgeY] };
    case "west":
      return { x: e.left, y: e[spec.edgeY] };
    default:
      return { x: e.left, y: e.top };
  }
}

/** Straight horizontal/vertical ray from the square edge to the arena circle. */
function wallPointOnCircle(edgePoint, wall) {
  const { x, y } = edgePoint;
  const cx = CENTER.x;
  const cy = CENTER.y;
  const r = ARENA_R;

  switch (wall) {
    case "north": {
      const dx = x - cx;
      const t = Math.sqrt(Math.max(0, r * r - dx * dx));
      return { x: Math.round(x), y: Math.round(cy - t) };
    }
    case "south": {
      const dx = x - cx;
      const t = Math.sqrt(Math.max(0, r * r - dx * dx));
      return { x: Math.round(x), y: Math.round(cy + t) };
    }
    case "west": {
      const dy = y - cy;
      const t = Math.sqrt(Math.max(0, r * r - dy * dy));
      return { x: Math.round(cx - t), y: Math.round(y) };
    }
    case "east": {
      const dy = y - cy;
      const t = Math.sqrt(Math.max(0, r * r - dy * dy));
      return { x: Math.round(cx + t), y: Math.round(y) };
    }
    default:
      return { x: Math.round(x), y: Math.round(y) };
  }
}

function spotCoords(spotId) {
  const spec = SPOT_PROJECTION[spotId];
  if (!spec) return { x: CENTER.x, y: CENTER.y };
  const edge = squareEdgeAnchor(spec);
  return wallPointOnCircle(edge, spec.wall);
}

/** Edge spots in CCW order around the arena wall. */
const SPOTS_CCW = ["C3", "2C", "B2", "1B", "A1", "4A", "D4", "3D"];

/** Edge spot reached first from each waymark going CCW / CW along the ring. */
const SPOT_FROM_WAYMARK = {
  A: { ccw: "A1", cw: "1B" },
  "2": { ccw: "1B", cw: "B2" },
  B: { ccw: "B2", cw: "2C" },
  "3": { ccw: "2C", cw: "C3" },
  C: { ccw: "C3", cw: "3D" },
  "4": { ccw: "3D", cw: "D4" },
  D: { ccw: "D4", cw: "4A" },
  "1": { ccw: "4A", cw: "A1" },
};

function getPlayerPositions(origin, rotation) {
  const opp = OPPOSITE[origin];
  const spread = rotation === "cw" ? "ccw" : "cw";
  const p1Spot = SPOT_FROM_WAYMARK[opp][spread];
  const startIdx = SPOTS_CCW.indexOf(p1Spot);
  if (startIdx < 0) return [];

  const step = spread === "ccw" ? 1 : -1;

  return Array.from({ length: 8 }, (_, i) => {
    const player = i + 1;
    const spot = SPOTS_CCW[(startIdx + step * i + 800) % 8];
    return { player, spot, ...spotCoords(spot) };
  });
}

let dashOrigin = "A";
let dashRotation = "cw";
let highlightedPlayer = null;
let northMode = "true";

const waymarkPicker = document.getElementById("waymark-picker");
const destinationPicker = document.getElementById("destination-picker");
const playerPicker = document.getElementById("player-picker");
const rotCwBtn = document.getElementById("rot-cw");
const rotCcwBtn = document.getElementById("rot-ccw");
const posRotCwBtn = document.getElementById("pos-rot-cw");
const posRotCcwBtn = document.getElementById("pos-rot-ccw");
const northTrueBtn = document.getElementById("north-true");
const northRelativeBtn = document.getElementById("north-relative");
const arenaContent = document.getElementById("arena-content");
const arenaBadge = document.getElementById("arena-badge");
const waymarkersLayer = document.getElementById("waymarkers");
const playerMarkersLayer = document.getElementById("player-markers");
const dashArcLayer = document.getElementById("dash-arc");
const cornerGuidesLayer = document.getElementById("corner-guides");
const summaryEl = document.getElementById("summary");

function init() {
  buildPlayerPicker();

  waymarkPicker.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-waymark]");
    if (!btn) return;
    setOrigin(btn.dataset.waymark);
  });

  destinationPicker.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-waymark]");
    if (!btn) return;
    setOrigin(OPPOSITE[btn.dataset.waymark]);
  });

  rotCwBtn.addEventListener("click", () => setDashRotation("cw"));
  rotCcwBtn.addEventListener("click", () => setDashRotation("ccw"));
  posRotCwBtn.addEventListener("click", () => setPositionRotation("cw"));
  posRotCcwBtn.addEventListener("click", () => setPositionRotation("ccw"));
  northTrueBtn.addEventListener("click", () => setNorthMode("true"));
  northRelativeBtn.addEventListener("click", () => setNorthMode("relative"));

  render();
}

function setNorthMode(mode) {
  northMode = mode;
  syncControlPickers();
  render();
}

function positionRotation() {
  return dashRotation === "cw" ? "ccw" : "cw";
}

function setOrigin(origin) {
  dashOrigin = origin;
  syncControlPickers();
  render();
}

function setDashRotation(rotation) {
  dashRotation = rotation;
  syncControlPickers();
  render();
}

function setPositionRotation(rotation) {
  dashRotation = rotation === "cw" ? "ccw" : "cw";
  syncControlPickers();
  render();
}

function syncControlPickers() {
  const destination = OPPOSITE[dashOrigin];
  const spread = positionRotation();

  waymarkPicker.querySelectorAll(".waymark-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.waymark === dashOrigin);
  });
  destinationPicker.querySelectorAll(".waymark-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.waymark === destination);
  });
  rotCwBtn.classList.toggle("active", dashRotation === "cw");
  rotCcwBtn.classList.toggle("active", dashRotation === "ccw");
  posRotCwBtn.classList.toggle("active", spread === "cw");
  posRotCcwBtn.classList.toggle("active", spread === "ccw");
  northTrueBtn.classList.toggle("active", northMode === "true");
  northRelativeBtn.classList.toggle("active", northMode === "relative");
}

function buildPlayerPicker() {
  playerPicker.innerHTML = "";
  for (let n = 1; n <= 8; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn player-btn player-btn--${n % 2 === 1 ? "odd" : "even"}`;
    btn.dataset.player = String(n);
    btn.setAttribute("aria-label", `Highlight player ${n}`);
    btn.innerHTML = playerDotsHtml(n, 6, { dotScale: 0.75 });
    btn.addEventListener("click", () => {
      highlightedPlayer = highlightedPlayer === n ? null : n;
      render();
    });
    playerPicker.appendChild(btn);
  }
}

function updatePlayerPickerButtons() {
  playerPicker.querySelectorAll(".player-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.player) === highlightedPlayer);
  });
}

function renderWaymarkers() {
  const svgNs = "http://www.w3.org/2000/svg";
  waymarkersLayer.innerHTML = "";

  for (const id of WAYMARKS_CW) {
    const { x, y } = WAYMARK_POS[id];
    const style = WAYMARK_STYLE[id];
    const isOrigin = id === dashOrigin;
    const g = document.createElementNS(svgNs, "g");
    g.setAttribute("class", `waymark ${style.shape}${isOrigin ? " dash-origin" : ""}`);
    g.setAttribute("transform", `translate(${x}, ${y})`);

    if (style.shape === "circle") {
      const circle = document.createElementNS(svgNs, "circle");
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", "12");
      circle.setAttribute("fill", `${style.color}33`);
      circle.setAttribute("stroke", style.color);
      circle.setAttribute("stroke-width", isOrigin ? "3" : "2");
      g.appendChild(circle);
    } else {
      const rect = document.createElementNS(svgNs, "rect");
      rect.setAttribute("x", String(-SQUARE_HALF));
      rect.setAttribute("y", String(-SQUARE_HALF));
      rect.setAttribute("width", String(SQUARE_HALF * 2));
      rect.setAttribute("height", String(SQUARE_HALF * 2));
      rect.setAttribute("fill", `${style.color}33`);
      rect.setAttribute("stroke", style.color);
      rect.setAttribute("stroke-width", isOrigin ? "3" : "2");
      g.appendChild(rect);
    }

    appendUprightContent(svgNs, g, (labelWrap) => {
      const label = document.createElementNS(svgNs, "text");
      label.setAttribute("x", "0");
      label.setAttribute("y", "4");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "waymark-label");
      label.textContent = id;
      labelWrap.appendChild(label);
    });

    waymarkersLayer.appendChild(g);
  }
}

function renderCornerGuides(positions) {
  if (!cornerGuidesLayer) return;
  const svgNs = "http://www.w3.org/2000/svg";
  cornerGuidesLayer.innerHTML = "";

  const highlightedSpot = positions.find((p) => p.player === highlightedPlayer)?.spot;

  for (const [spotId, spec] of Object.entries(SPOT_PROJECTION)) {
    const edge = squareEdgeAnchor(spec);
    const spot = spotCoords(spotId);
    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", String(edge.x));
    line.setAttribute("y1", String(edge.y));
    line.setAttribute("x2", String(spot.x));
    line.setAttribute("y2", String(spot.y));
    line.setAttribute("class", `corner-guide${spotId === highlightedSpot ? " highlighted" : ""}`);
    cornerGuidesLayer.appendChild(line);
  }
}

function renderDashArc() {
  const svgNs = "http://www.w3.org/2000/svg";
  dashArcLayer.innerHTML = "";

  const start = WAYMARK_POS[dashOrigin];
  const startIdx = WAYMARKS_CW.indexOf(dashOrigin);
  const r = 108;
  const startAngle = startIdx * 45;
  const endAngle = startAngle + (dashRotation === "cw" ? 45 : -45);
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = CENTER.x + r * Math.sin(startRad);
  const y1 = CENTER.y - r * Math.cos(startRad);
  const x2 = CENTER.x + r * Math.sin(endRad);
  const y2 = CENTER.y - r * Math.cos(endRad);
  const sweep = dashRotation === "cw" ? 1 : 0;

  const path = document.createElementNS(svgNs, "path");
  path.setAttribute("d", `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`);
  path.setAttribute("class", "dash-arc");
  path.setAttribute("marker-end", "url(#arrowhead)");
  dashArcLayer.appendChild(path);

  const startDot = document.createElementNS(svgNs, "circle");
  startDot.setAttribute("cx", String(start.x));
  startDot.setAttribute("cy", String(start.y));
  startDot.setAttribute("r", "7");
  startDot.setAttribute("class", "dash-origin-dot");
  dashArcLayer.appendChild(startDot);
}

function renderPlayers(positions) {
  const svgNs = "http://www.w3.org/2000/svg";
  playerMarkersLayer.innerHTML = "";

  for (const pos of positions) {
    const isHighlighted = pos.player === highlightedPlayer;
    const g = document.createElementNS(svgNs, "g");
    g.setAttribute("class", `player-marker${isHighlighted ? " player-marker--highlighted" : ""}`);
    g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);

    const hit = document.createElementNS(svgNs, "circle");
    hit.setAttribute("r", "16");
    hit.setAttribute("class", "player-marker-hit");
    g.appendChild(hit);

    appendUprightContent(svgNs, g, (upright) => {
      if (isHighlighted) {
        const glow = document.createElementNS(svgNs, "circle");
        glow.setAttribute("r", "24");
        glow.setAttribute("class", "player-marker-glow");
        glow.setAttribute("stroke", playerColor(pos.player));
        upright.appendChild(glow);
      }
      appendSvgDots(upright, pos.player, 5, 2.6);
    });

    playerMarkersLayer.appendChild(g);
  }
}

function renderLegend() {
  const spreadDir = dashRotation === "ccw" ? "clockwise" : "counter-clockwise";
  const rotLabel = dashRotation === "ccw" ? "counter-clockwise" : "clockwise";
  const opp = OPPOSITE[dashOrigin];

  summaryEl.innerHTML =
    `AoE origin at <strong>${dashOrigin}</strong>, rotating <strong>${rotLabel}</strong>. ` +
    `Opposite <strong>${opp}</strong> → spread <strong>${spreadDir}</strong> around the wall.`;
}

function renderArenaNorth() {
  const deg = relativeNorthDegrees();
  arenaContent.setAttribute(
    "transform",
    deg ? `rotate(${deg} ${CENTER.x} ${CENTER.y})` : ""
  );

  if (northMode === "true") {
    arenaBadge.textContent = "True North";
  } else {
    arenaBadge.textContent = `Relative North · ${OPPOSITE[dashOrigin]} up`;
  }
}

function render() {
  const positions = getPlayerPositions(dashOrigin, dashRotation);
  syncControlPickers();
  updatePlayerPickerButtons();
  renderWaymarkers();
  renderCornerGuides(positions);
  renderDashArc();
  renderPlayers(positions);
  renderArenaNorth();
  renderLegend();
}

init();
