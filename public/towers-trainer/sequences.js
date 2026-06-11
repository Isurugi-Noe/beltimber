/**
 * towerParity: "odd" | "even"
 * baitPhase: Past/Future bait runs 0–6s, then 6–10.5s to reach tower position (odd towers after an even tower)
 */

/** Which debuff group owns each tower (T1–T8). */
const TOWER_GROUP_ASSIGNMENTS = "AAABBBBA";

function getTowerGroupLetter(tower) {
  if (!tower || tower < 1 || tower > TOWER_GROUP_ASSIGNMENTS.length) return "";
  return TOWER_GROUP_ASSIGNMENTS[tower - 1];
}

const ROLES = [
  { id: "H1", label: "Healer 1", category: "support" },
  { id: "H2", label: "Healer 2", category: "support" },
  { id: "T1", label: "Tank 1",   category: "support" },
  { id: "T2", label: "Tank 2",   category: "support" },
  { id: "R1", label: "Ranged 1", category: "dps" },
  { id: "R2", label: "Ranged 2", category: "dps" },
  { id: "M1", label: "Melee 1",  category: "dps" },
  { id: "M2", label: "Melee 2",  category: "dps" },
];

const TANK_MELEE_TIMELINE = {
  T2: {
    A: {
      label: "Group A (different debuffs)",
      steps: [
        {
          tower: 1,
          towerParity: "odd",
          action: "takeTower",
          title: "Tower 1 — Take Tower",
          debuffs: { stack: "oddLeftStack", cone: "oddLeftCone", circle: "oddRightCircle" },
        },
        {
          tower: 2,
          towerParity: "even",
          action: "takeTower",
          title: "Tower 2 — Take Tower",
          debuffs: { cone: "htmr:inner", circle: "htmr:south" },
        },
        {
          tower: 3,
          towerParity: "odd",
          action: "takeTower",
          baitPhase: true,
          title: "Tower 3 — Bait then Take Tower",
          debuffs: { stack: "htmr:north", cone: "oddLeftCone", circle: "oddRightCircle" },
          note: "6s Past/Future bait → 4.5s to position. Remember new debuff.",
        },
        {
          tower: 4,
          towerParity: "even",
          action: "baitClone",
          title: "Tower 4 — Bait Clone",
          position: "farNorthClone",
        },
        {
          tower: 5,
          towerParity: "odd",
          action: "helpStack",
          baitPhase: true,
          title: "Tower 5 — Bait then Help Stack",
          position: "leftTowerOutFront",
        },
        {
          tower: 6,
          towerParity: "even",
          action: "baitClone",
          title: "Tower 6 — Bait Clone",
          position: "farNorthClone",
        },
        {
          tower: 7,
          towerParity: "odd",
          action: "helpStack",
          baitPhase: true,
          title: "Tower 7 — Bait then Help Stack",
          position: "leftTowerOutFront",
        },
        {
          tower: 8,
          towerParity: "even",
          action: "takeTower",
          title: "Tower 8 — Take Tower",
          debuffs: { cone: "htmr:inner", circle: "htmr:south" },
          groupAFilter: true,
        },
        {
          action: "baitOnly",
          title: "Final — Bait Past / Future",
          note: "No tower — Past or Future bait only, 6s.",
        },
      ],
    },
    B: {
      label: "Group B (same debuffs)",
      steps: [
        {
          tower: 1,
          towerParity: "odd",
          action: "helpStack",
          title: "Tower 1 — Help Stack",
          position: "leftTowerOutFront",
          note: "Remember your debuff.",
        },
        {
          tower: 2,
          towerParity: "even",
          action: "baitClone",
          title: "Tower 2 — Bait Clone",
          position: "farNorthClone",
        },
        {
          tower: 3,
          towerParity: "odd",
          action: "helpStack",
          baitPhase: true,
          title: "Tower 3 — Bait then Help Stack",
          position: "leftTowerOutFront",
        },
        {
          tower: 4,
          towerParity: "even",
          action: "takeTower",
          title: "Tower 4 — Take Tower",
          debuffs: { cone: "htmr:inner", circle: "htmr:south" },
          groupBAdjust: true,
        },
        {
          tower: 5,
          towerParity: "odd",
          action: "takeTower",
          baitPhase: true,
          title: "Tower 5 — Bait then Take Tower",
          debuffs: { stack: "htmr:north", cone: "oddLeftCone", circle: "oddRightCircle" },
        },
        {
          tower: 6,
          towerParity: "even",
          action: "takeTower",
          title: "Tower 6 — Take Tower",
          debuffs: { cone: "htmr:inner", circle: "htmr:south" },
        },
        {
          tower: 7,
          towerParity: "odd",
          action: "takeTower",
          baitPhase: true,
          title: "Tower 7 — Bait then Take Tower",
          debuffs: { stack: "htmr:north", cone: "oddLeftCone", circle: "oddRightCircle" },
        },
        {
          tower: 8,
          towerParity: "even",
          action: "baitClone",
          title: "Tower 8 — Bait Clone",
          position: "farNorthClone",
        },
        {
          action: "baitOnly",
          title: "Final — Bait Past / Future",
          note: "No tower — Past or Future bait only, 6s.",
        },
      ],
    },
  },
};

const TIMELINES = {
  H1: TANK_MELEE_TIMELINE.T2,
  H2: TANK_MELEE_TIMELINE.T2,
  T1: TANK_MELEE_TIMELINE.T2,
  T2: TANK_MELEE_TIMELINE.T2,
  R1: TANK_MELEE_TIMELINE.T2,
  R2: TANK_MELEE_TIMELINE.T2,
  M1: TANK_MELEE_TIMELINE.T2,
  M2: TANK_MELEE_TIMELINE.T2,
};

function getTimeline(roleId, group) {
  return TIMELINES[roleId]?.[group] ?? null;
}
