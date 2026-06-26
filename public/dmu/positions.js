/**
 * Arena geometry — 400×400 viewBox
 */
const BOSS = { x: 200, y: 200 };
const BOSS_RING_R = 86;
const LEFT_TOWER = { x: 148, y: 278, r: 34 };
const RIGHT_TOWER = { x: 252, y: 278, r: 34 };
const EDGE_FRAC = 0.92;

function getRoleFamily(roleId) {
  if (roleId === "T1" || roleId === "T2") return "tank";
  if (roleId === "M1" || roleId === "M2") return "melee";
  if (roleId === "H1" || roleId === "H2") return "healer";
  if (roleId === "R1" || roleId === "R2") return "ranged";
  return "default";
}

function neverAdjusts(roleId) {
  const family = getRoleFamily(roleId);
  return family === "healer" || family === "ranged";
}

function edgePoint(tower, degrees, outward = 1) {
  const rad = (degrees * Math.PI) / 180;
  const dist = tower.r * EDGE_FRAC * outward;
  return {
    x: Math.round(tower.x + dist * Math.cos(rad)),
    y: Math.round(tower.y + dist * Math.sin(rad)),
  };
}

function towerAxes(tower) {
  const dx = BOSS.x - tower.x;
  const dy = BOSS.y - tower.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, px: -dy / len, py: dx / len };
}

function towerLocal(tower, alongBoss, perpRight) {
  const { ux, uy, px, py } = towerAxes(tower);
  const dist = tower.r * EDGE_FRAC;
  return {
    x: Math.round(tower.x + dist * (alongBoss * ux + perpRight * px)),
    y: Math.round(tower.y + dist * (alongBoss * uy + perpRight * py)),
  };
}

function nsPoint(tower, direction) {
  return {
    x: tower.x,
    y: Math.round(tower.y + direction * tower.r * EDGE_FRAC),
  };
}

function ringTowerIntersections(tower) {
  const dx = tower.x - BOSS.x;
  const dy = tower.y - BOSS.y;
  const d = Math.hypot(dx, dy);
  const a = (BOSS_RING_R * BOSS_RING_R - tower.r * tower.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, BOSS_RING_R * BOSS_RING_R - a * a));
  const ux = dx / d;
  const uy = dy / d;
  const px = -uy;
  const py = ux;
  const mx = BOSS.x + a * ux;
  const my = BOSS.y + a * uy;
  return [
    { x: Math.round(mx + h * px), y: Math.round(my + h * py) },
    { x: Math.round(mx - h * px), y: Math.round(my - h * py) },
  ];
}

function pickEvenCone(tower, side) {
  const pts = ringTowerIntersections(tower);
  if (side === "left") {
    return pts.reduce((best, p) => (p.x + p.y < best.x + best.y ? p : best));
  }
  return pts.reduce((best, p) => (p.x - p.y > best.x - best.y ? p : best));
}

/** Boss ring ∩ tower, on the tower→boss line inside the tower (odd stack). */
function ringPointOnTowerAxis(tower) {
  const { ux, uy } = towerAxes(tower);
  const dBT = Math.hypot(BOSS.x - tower.x, BOSS.y - tower.y);
  const s = dBT - BOSS_RING_R;
  return {
    x: Math.round(tower.x + s * ux),
    y: Math.round(tower.y + s * uy),
  };
}

const ODD_LEFT_STACK = ringPointOnTowerAxis(LEFT_TOWER);
const ODD_LEFT_CONE = towerLocal(LEFT_TOWER, -0.72, 0);
const ODD_RIGHT_CONE = towerLocal(RIGHT_TOWER, -0.72, 0);
const ODD_RIGHT_CIRCLE = edgePoint(RIGHT_TOWER, 90);
const ODD_RIGHT_STACK = nsPoint(RIGHT_TOWER, -1);
/** Help stack — front of right tower, scoot left, just outside the rim (235°). */
const ODD_RIGHT_HELP = edgePoint(RIGHT_TOWER, 235, 1.08);

const EVEN_LEFT_CONE = pickEvenCone(LEFT_TOWER, "left");
const EVEN_RIGHT_CONE = pickEvenCone(RIGHT_TOWER, "right");
const EVEN_LEFT_CIRCLE = edgePoint(LEFT_TOWER, 80);
const EVEN_RIGHT_CIRCLE = edgePoint(RIGHT_TOWER, 100);
const EVEN_LEFT_STACK = towerLocal(LEFT_TOWER, 0.95, 0);
const EVEN_RIGHT_STACK = nsPoint(RIGHT_TOWER, -1);

const FUTURE_Y = BOSS.y - BOSS_RING_R;
const PAST_BAIT = { x: BOSS.x, y: BOSS.y + BOSS_RING_R };

/** Matches past/future bait circles on the arena (r=10 → 20×20 square). */
const BAIT_MARKER_R = 10;
const BAIT_MARK_SIZE = BAIT_MARKER_R * 2;

/**
 * Even cone bait guide — square from tower top ∩ side edge (same size as past/future).
 * Right tower: top line runs to right edge, square TL on corner, bait at TL.
 * Left tower: top line runs to left edge, square TR on corner, bait at BL.
 */
function getEvenConeBaitGuide(role) {
  const size = BAIT_MARK_SIZE;
  const tower = role === "healer" ? LEFT_TOWER : RIGHT_TOWER;
  const cx = tower.x;
  const cy = tower.y;
  const r = tower.r;
  const topY = cy - r;

  if (role === "healer") {
    const cornerX = cx - r;
    return {
      lines: [
        { x1: cx, y1: topY, x2: cornerX, y2: topY },
        { x1: cornerX, y1: topY, x2: cornerX, y2: topY + size },
      ],
      square: { x: cornerX - size, y: topY, width: size, height: size },
      bait: { x: cornerX - size, y: topY + size },
    };
  }

  const cornerX = cx + r;
  return {
    lines: [
      { x1: cx, y1: topY, x2: cornerX, y2: topY },
      { x1: cornerX, y1: topY, x2: cornerX, y2: topY + size },
    ],
    square: { x: cornerX, y: topY, width: size, height: size },
    bait: { x: cornerX, y: topY },
  };
}

function evenConeBaitPosition(role) {
  const guide = getEvenConeBaitGuide(role);
  return {
    x: Math.round(guide.bait.x),
    y: Math.round(guide.bait.y),
  };
}

function getEvenConeBaitGuideForRole(roleId) {
  const family = getRoleFamily(roleId);
  if (family === "healer") return getEvenConeBaitGuide("healer");
  if (family === "ranged") return getEvenConeBaitGuide("ranged");
  return null;
}

const EVEN_HEALER_CONE_BAIT = evenConeBaitPosition("healer");
const EVEN_RANGED_CONE_BAIT = evenConeBaitPosition("ranged");
/** Odd tower — healer behind cone (boss-relative, south of left tower). */
const ODD_HEALER_BEHIND_CONE = towerLocal(LEFT_TOWER, -1.22, 0.12);

const POSITIONS = {
  oddLeftStack:    { ...ODD_LEFT_STACK },
  oddLeftCone:     { ...ODD_LEFT_CONE },
  oddRightCone:    { ...ODD_RIGHT_CONE },
  oddRightCircle:  { ...ODD_RIGHT_CIRCLE },
  oddRightStack:   { ...ODD_RIGHT_STACK },
  oddRightHelp:    { ...ODD_RIGHT_HELP },

  evenLeftCone:    { ...EVEN_LEFT_CONE },
  evenLeftCircle:  { ...EVEN_LEFT_CIRCLE },
  evenLeftStack:   { ...EVEN_LEFT_STACK },
  evenRightCone:   { ...EVEN_RIGHT_CONE },
  evenRightCircle: { ...EVEN_RIGHT_CIRCLE },
  evenRightStack:  { ...EVEN_RIGHT_STACK },

  leftTowerOutFront: towerLocal(LEFT_TOWER, 1.08, 0),
  farNorthClone:     { x: LEFT_TOWER.x, y: FUTURE_Y },
  farNorthCloneRight: { x: RIGHT_TOWER.x, y: FUTURE_Y },
  pastBait:          { ...PAST_BAIT },
  futureBait:        { x: BOSS.x, y: FUTURE_Y },
  oddHealerBehindCone: { ...ODD_HEALER_BEHIND_CONE },
  evenHealerConeBait:  { ...EVEN_HEALER_CONE_BAIT },
  evenRangedConeBait:  { ...EVEN_RANGED_CONE_BAIT },
};

const EVEN_CONE_TANK = { primary: "evenLeftCone", clash: "evenRightCone" };
const EVEN_CIRCLE_TANK = { primary: "evenLeftCircle", clash: "evenRightCircle" };

const STACK_MIRROR = {
  oddLeftStack: "oddRightStack",
  oddRightStack: "oddLeftStack",
  evenLeftStack: "evenRightStack",
  evenRightStack: "evenLeftStack",
};

function hintFor(key) {
  const map = {
    oddLeftStack: "Left tower — boss ring, inside tower (stack)",
    oddLeftCone: "Left tower — cone (in from edge, toward stack)",
    oddRightCone: "Right tower — cone (in from edge, toward boss)",
    oddRightCircle: "Right tower — south (circle)",
    oddRightStack: "Right tower — north (stack)",
    oddRightHelp: "Right tower — front, scoot left, just outside rim (help stack)",
    evenLeftCone: "Left tower — boss ring ∩ tower (cone)",
    evenLeftCircle: "Left tower — bottom, slightly right (circle)",
    evenLeftStack: "Left tower — boss hitbox ring (stack)",
    evenRightCone: "Right tower — boss ring ∩ tower (cone)",
    evenRightCircle: "Right tower — bottom, slightly left (circle)",
    evenRightStack: "Right tower — north/front (stack)",
    leftTowerOutFront: "Left tower — out + front edge (help stack)",
    farNorthClone: "Left tower line — boss ring north (clone bait)",
    farNorthCloneRight: "Right tower line — boss ring north (clone bait)",
    pastBait: "Boss ring — between towers (Past)",
    futureBait: "Boss ring — north (Future)",
    oddHealerBehindCone: "Left tower — boss-relative behind cone (not on edge)",
    evenHealerConeBait: "Left tower — bait square bottom-left (cone bait)",
    evenRangedConeBait: "Right tower — bait square top-left (cone bait)",
  };
  return map[key] ?? key;
}

function spotFromKey(key, debuff, towerParity, variant, note) {
  const pos = POSITIONS[key];
  if (!pos) return null;
  const towerSide = key.includes("Left") ? "left" : key.includes("Right") ? "right" : "center";
  return {
    ...pos,
    key,
    debuff,
    tower: towerSide,
    variant,
    hint: hintFor(key),
    note,
  };
}

function evenPairForRole(debuff, roleId) {
  const family = getRoleFamily(roleId);
  const base = debuff === "cone" ? EVEN_CONE_TANK : EVEN_CIRCLE_TANK;
  if (family === "melee") return { primary: base.clash, clash: base.primary };
  if (family === "healer") {
    return { primary: base.primary, clash: base.clash };
  }
  if (family === "ranged") {
    const rangedPrimary = debuff === "cone" ? "evenRightCone" : "evenRightCircle";
    const rangedClash = debuff === "cone" ? "evenLeftCone" : "evenLeftCircle";
    return { primary: rangedPrimary, clash: rangedClash };
  }
  return base;
}

function expandEvenConeCircle(debuff, roleId) {
  const pair = evenPairForRole(debuff, roleId);
  return [
    spotFromKey(pair.primary, debuff, "even", "primary"),
    spotFromKey(
      pair.clash,
      debuff,
      "even",
      "partner-clash",
      "Partner has same debuff — adjust to other tower"
    ),
  ];
}

function expandStack(key, debuff, towerParity, roleId) {
  const prefix = towerParity === "even" ? "even" : "odd";
  const family = getRoleFamily(roleId);

  if (family === "healer") {
    const spot = spotFromKey(`${prefix}LeftStack`, "stack", towerParity, "primary");
    return spot ? [spot] : [];
  }
  if (family === "ranged") {
    const spot = spotFromKey(`${prefix}RightStack`, "stack", towerParity, "primary");
    return spot ? [spot] : [];
  }

  if (family === "melee") {
    return [
      spotFromKey(`${prefix}RightStack`, "stack", towerParity, "primary"),
      spotFromKey(
        `${prefix}LeftStack`,
        "stack",
        towerParity,
        "partner-clash",
        "Partner has stack — adjust to left tower"
      ),
    ];
  }

  const primary = spotFromKey(key, debuff, towerParity, "primary");
  const mirrorKey = STACK_MIRROR[key];
  if (mirrorKey) {
    return [
      primary,
      spotFromKey(
        mirrorKey,
        debuff,
        towerParity,
        "partner-clash",
        "Partner has stack — lower HTMR takes other tower"
      ),
    ];
  }
  return [primary];
}

function expandCircle(towerParity, roleId) {
  const family = getRoleFamily(roleId);
  if (family === "healer") {
    if (towerParity === "even") {
      const spot = spotFromKey("evenLeftCircle", "circle", "even", "primary");
      return spot ? [spot] : [];
    }
    const spot = spotFromKey("oddRightCircle", "circle", "odd", "primary");
    return spot ? [spot] : [];
  }
  if (family === "ranged") {
    if (towerParity === "even") {
      const spot = spotFromKey("evenRightCircle", "circle", "even", "primary");
      return spot ? [spot] : [];
    }
    const spot = spotFromKey("oddRightCircle", "circle", "odd", "primary");
    return spot ? [spot] : [];
  }
  if (towerParity === "even") {
    return expandEvenConeCircle("circle", roleId);
  }
  return [spotFromKey("oddRightCircle", "circle", "odd", "primary")];
}

function usesGroupBDebuffPicker(roleId, group) {
  return group === "B";
}

function usesGroupADebuffPicker(roleId, group) {
  return group === "A";
}

/** Group B — Tower 4: pick stack/cone; tanks/melee adjust, healer/ranged primary only. */
function applyGroupBFilter(spots, step, roleId, group, groupBDebuff) {
  if (!usesGroupBDebuffPicker(roleId, group) || !step.groupBAdjust || !groupBDebuff) {
    return spots;
  }

  const variant = neverAdjusts(roleId) ? "primary" : "partner-clash";
  return spots.filter((s) => s.debuff === groupBDebuff && s.variant === variant);
}

/** Group A — Tower 8: pick cone/circle; tanks/melee may adjust, support primary only. */
function applyGroupAFilter(spots, step, roleId, group, groupADebuff, sameAsPartner) {
  if (!usesGroupADebuffPicker(roleId, group) || !step.groupAFilter || !groupADebuff) {
    return spots;
  }

  const variant = neverAdjusts(roleId)
    ? "primary"
    : sameAsPartner
      ? "partner-clash"
      : "primary";
  return spots.filter((s) => s.debuff === groupADebuff && s.variant === variant);
}

function expandPositionKey(key, debuff, towerParity, roleId, opts = {}) {
  if (key.startsWith("htmr:")) {
    return expandHtmr(key.split(":")[1], debuff, towerParity, roleId, opts);
  }

  if (debuff === "circle") {
    return expandCircle(towerParity, roleId);
  }

  if (debuff === "stack") {
    return filterAdjustOnly(expandStack(key, debuff, towerParity, roleId), opts);
  }

  if (debuff === "cone" && towerParity === "odd") {
    const family = getRoleFamily(roleId);
    if (family === "healer" || family === "ranged") {
      const spot = spotFromKey("oddLeftCone", "cone", "odd", "primary");
      return spot ? [spot] : [];
    }
  }

  if (towerParity === "even" && debuff === "cone") {
    const family = getRoleFamily(roleId);
    if (family === "healer") {
      const spot = spotFromKey("evenLeftCone", "cone", "even", "primary");
      return spot ? [spot] : [];
    }
    if (family === "ranged") {
      const spot = spotFromKey("evenRightCone", "cone", "even", "primary");
      return spot ? [spot] : [];
    }
    return filterAdjustOnly(expandEvenConeCircle("cone", roleId), opts);
  }

  const primary = spotFromKey(key, debuff, towerParity, "primary");
  return primary ? [primary] : [];
}

function expandHtmr(slot, debuff, towerParity, roleId, opts = {}) {
  const isEven = towerParity === "even";
  const prefix = isEven ? "even" : "odd";

  if (slot === "north" || debuff === "stack") {
    return filterAdjustOnly(expandStack(`${prefix}LeftStack`, "stack", towerParity, roleId), opts);
  }

  if (slot === "inner" || debuff === "cone") {
    if (isEven) {
      const family = getRoleFamily(roleId);
      if (family === "healer") {
        const spot = spotFromKey("evenLeftCone", "cone", "even", "primary");
        return spot ? [spot] : [];
      }
      if (family === "ranged") {
        const spot = spotFromKey("evenRightCone", "cone", "even", "primary");
        return spot ? [spot] : [];
      }
      return filterAdjustOnly(expandEvenConeCircle("cone", roleId), opts);
    }
    const family = getRoleFamily(roleId);
    if (family === "healer" || family === "ranged") {
      const spot = spotFromKey("oddLeftCone", "cone", towerParity, "primary");
      return spot ? [spot] : [];
    }
    return [spotFromKey("oddLeftCone", "cone", towerParity, "primary")];
  }

  if (slot === "south" || debuff === "circle") {
    return expandCircle(towerParity, roleId);
  }

  return [];
}

function filterAdjustOnly(spots, opts) {
  if (!opts.groupBAdjust) return spots;
  return spots.filter((s) => s.variant === "partner-clash");
}

function resolveActionPosition(key, roleId, parity) {
  const family = getRoleFamily(roleId);
  if (key === "farNorthClone") {
    if (family === "melee") return POSITIONS.farNorthCloneRight;
    if (family === "healer") return POSITIONS.evenHealerConeBait;
    if (family === "ranged") return POSITIONS.evenRangedConeBait;
    return POSITIONS.farNorthClone;
  }
  if (key === "leftTowerOutFront") {
    if (family === "melee") return POSITIONS.oddRightHelp;
    if (family === "healer") return POSITIONS.oddHealerBehindCone;
    if (family === "ranged") return POSITIONS.oddRightHelp;
    return POSITIONS.leftTowerOutFront;
  }
  return resolvePositionKey(key, parity);
}

/** Healer: stack/cone left, circle right. Ranged: all on right. Odd: 3 debuff types. */
function supportDpsTakeTowerDebuffs(parity, family) {
  const isOdd = parity === "odd";
  if (family === "healer") {
    return isOdd ? ["stack", "cone", "circle"] : ["cone", "circle"];
  }
  return isOdd ? ["stack", "cone", "circle"] : ["cone", "circle"];
}

function expandSupportDpsTakeTower(step, roleId, parity, expandOpts, groupBDebuff, groupADebuff) {
  const family = getRoleFamily(roleId);
  let debuffList = supportDpsTakeTowerDebuffs(parity, family);
  if (step.groupBAdjust && groupBDebuff) {
    debuffList = Object.keys(step.debuffs);
  } else if (step.groupAFilter && groupADebuff) {
    debuffList = Object.keys(step.debuffs);
  }
  const out = [];

  for (const debuff of debuffList) {
    const key = step.debuffs?.[debuff];
    if (!key) continue;
    for (const spot of expandPositionKey(key, debuff, parity, roleId, expandOpts)) {
      if (spot.variant !== "primary") continue;
      out.push({
        ...spot,
        label: debuff.charAt(0).toUpperCase() + debuff.slice(1),
        phase: "tower",
      });
    }
  }
  return out;
}

function resolvePositionKey(key, towerParity = "odd") {
  if (key.startsWith("htmr:")) {
    const slot = key.split(":")[1];
    const isEven = towerParity === "even";
    if (slot === "north") return POSITIONS[isEven ? "evenLeftStack" : "oddLeftStack"];
    if (slot === "inner") return POSITIONS[isEven ? "evenLeftCone" : "oddLeftCone"];
    if (slot === "south") return POSITIONS[isEven ? "evenLeftCircle" : "oddRightCircle"];
  }
  return POSITIONS[key];
}

function baitSpots() {
  return [
    {
      ...POSITIONS.pastBait,
      debuff: "past",
      label: "Past",
      variant: "primary",
      hint: hintFor("pastBait"),
      phase: "bait",
    },
    {
      ...POSITIONS.futureBait,
      debuff: "future",
      label: "Future",
      variant: "primary",
      hint: hintFor("futureBait"),
      phase: "bait",
    },
  ];
}

function towerSpotsForStep(step, roleId, picker) {
  const { group, groupBDebuff, groupADebuff, sameAsPartner } = picker;
  const parity = step.towerParity ?? "odd";
  const expandOpts = step.groupBAdjust ? { groupBAdjust: true } : {};

  if (step.action === "helpStack" || step.action === "baitClone") {
    const family = getRoleFamily(roleId);
    const isClone = step.action === "baitClone";

    if (isClone && family === "ranged") {
      return [
        {
          ...POSITIONS.evenRangedConeBait,
          debuff: "fixed",
          label: "Cone bait",
          variant: "primary",
          hint: hintFor("evenRangedConeBait"),
          phase: "tower",
        },
      ];
    }

    const label = isClone
      ? family === "healer"
        ? "Cone bait"
        : "Bait clone"
      : family === "healer"
        ? "Behind cone"
        : family === "ranged"
          ? "DPS stack"
          : "Help stack";

    const pos = resolveActionPosition(step.position, roleId, parity);
    const hintKey =
      isClone && family === "healer"
        ? "evenHealerConeBait"
        : isClone
          ? family === "melee"
            ? "farNorthCloneRight"
            : "farNorthClone"
          : family === "healer"
            ? "oddHealerBehindCone"
            : family === "ranged" || family === "melee"
              ? "oddRightHelp"
              : "leftTowerOutFront";

    const debuff = "fixed";

    return [
      {
        ...pos,
        debuff,
        label,
        variant: "primary",
        hint: hintFor(hintKey),
        phase: "tower",
      },
    ];
  }

  if (step.action === "takeTower" && step.debuffs) {
    if (neverAdjusts(roleId)) {
      let spots = dedupeSpots(
        expandSupportDpsTakeTower(step, roleId, parity, expandOpts, groupBDebuff, groupADebuff)
      );
      spots = applyGroupBFilter(spots, step, roleId, group, groupBDebuff);
      return applyGroupAFilter(spots, step, roleId, group, groupADebuff, sameAsPartner);
    }

    const out = [];
    for (const [debuff, key] of Object.entries(step.debuffs)) {
      for (const spot of expandPositionKey(key, debuff, parity, roleId, expandOpts)) {
        out.push({
          ...spot,
          label: debuff.charAt(0).toUpperCase() + debuff.slice(1),
          phase: "tower",
        });
      }
    }
    let spots = applyGroupBFilter(dedupeSpots(out), step, roleId, group, groupBDebuff);
    return applyGroupAFilter(spots, step, roleId, group, groupADebuff, sameAsPartner);
  }

  return [];
}

function getStepPositions(step, phase = "all", picker = {}) {
  const { roleId = "T2" } = picker;
  if (step.action === "baitOnly") {
    return baitSpots();
  }

  const towerSpots = towerSpotsForStep(step, roleId, picker);

  if (step.baitPhase) {
    const bait = baitSpots();
    const towerPreview = towerSpots.map((s) => ({ ...s, preview: true }));

    if (phase === "bait") {
      return [...bait, ...towerPreview];
    }
    if (phase === "tower") {
      return towerSpots;
    }
    return [...bait, ...towerPreview];
  }

  if (phase === "bait") return [];
  return towerSpots;
}

function dedupeSpots(spots) {
  const seen = new Set();
  return spots.filter((s) => {
    const id = `${s.debuff}|${s.x}|${s.y}|${s.variant}|${s.phase ?? "tower"}|${s.preview ? "p" : ""}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
