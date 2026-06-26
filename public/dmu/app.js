const STAGE_DURATION_MS = 10_500;
const FIRST_TOWER_DURATION_MS = 9_000;
const BAIT_DURATION_MS = 6_000;
const MOVE_DURATION_MS = STAGE_DURATION_MS - BAIT_DURATION_MS;

const DEBUFF_COLORS = {
  stack: "#4caf82",
  cone: "#e8c840",
  circle: "#a86bd4",
  past: "#e8a030",
  future: "#5b8def",
  fixed: "#c8ccd4",
};

/** Keep labels readable when spots are close (odd left tower). */
const LABEL_OFFSET = {
  stack:  { dx: 14, dy: -20 },
  cone:   { dx: -18, dy: -14 },
  circle: { dx: 16, dy: 20 },
  past:   { dx: 14, dy: -16 },
  future: { dx: 14, dy: -16 },
  fixed:  { dx: 0, dy: -20 },
};

const roleSelect = document.getElementById("role-select");
const startGroupABtn = document.getElementById("start-group-a");
const startGroupBBtn = document.getElementById("start-group-b");
const groupBDebuffWrap = document.getElementById("group-b-debuff-wrap");
const groupBConeBtn = document.getElementById("group-b-cone");
const groupBCircleBtn = document.getElementById("group-b-circle");
const groupADebuffWrap = document.getElementById("group-a-debuff-wrap");
const groupAConeBtn = document.getElementById("group-a-cone");
const groupACircleBtn = document.getElementById("group-a-circle");
const groupASamePartnerCheck = document.getElementById("group-a-same-partner");
const nextStepBtn = document.getElementById("next-step-btn");

let groupBDebuffChoice = "cone";
let groupADebuffChoice = "cone";
let groupASamePartner = false;
const resetBtn = document.getElementById("reset-btn");
const stagePills = document.getElementById("stage-pills");
const stageLabel = document.getElementById("stage-label");
const phaseLabel = document.getElementById("phase-label");
const countdownEl = document.getElementById("countdown");
const stageHint = document.getElementById("stage-hint");
const stepDetail = document.getElementById("step-detail");
const timelineStatus = document.getElementById("timeline-status");
const positionMarkers = document.getElementById("position-markers");
const coneBaitGuides = document.getElementById("cone-bait-guides");
const towerTypeBadge = document.getElementById("tower-type-badge");
const arenaLayerOdd = document.getElementById("arena-odd");
const arenaLayerEven = document.getElementById("arena-even");
const cloneMarkers = document.getElementById("clone-markers");
const pastFutureMarkers = document.getElementById("past-future-markers");

let timeline = null;
let currentStage = -1;
let simRunning = false;
let selectedGroup = "A";
let activeGroup = "A";
let countdownInterval = null;
let stageEndsAt = 0;
let stageStartedAt = 0;
let lastRenderedPreviewKey = null;

function init() {
  roleSelect.addEventListener("change", onConfigChange);
  startGroupABtn?.addEventListener("click", () => startWithGroup("A"));
  startGroupBBtn?.addEventListener("click", () => startWithGroup("B"));
  groupBConeBtn?.addEventListener("click", () => setGroupBDebuff("cone"));
  groupBCircleBtn?.addEventListener("click", () => setGroupBDebuff("circle"));
  groupAConeBtn?.addEventListener("click", () => setGroupADebuff("cone"));
  groupACircleBtn?.addEventListener("click", () => setGroupADebuff("circle"));
  groupASamePartnerCheck?.addEventListener("change", () => {
    groupASamePartner = groupASamePartnerCheck.checked;
    onConfigChange();
  });
  nextStepBtn?.addEventListener("click", skipToNextStep);
  resetBtn.addEventListener("click", () => reset(true));
  onConfigChange();
}

function setGroupBDebuff(value) {
  groupBDebuffChoice = value;
  groupBConeBtn?.classList.toggle("active", value === "cone");
  groupBCircleBtn?.classList.toggle("active", value === "circle");
  if (currentStage >= 0 && timeline) {
    lastRenderedPreviewKey = null;
    previewStep(currentStage);
  } else {
    onConfigChange();
  }
}

function updateCloneVisibility(roleId) {
  cloneMarkers?.classList.toggle("hidden", isSupportDps(roleId));
}

function isTankMelee(roleId) {
  return roleId.startsWith("T") || roleId.startsWith("M");
}

function isSupportDps(roleId) {
  return roleId.startsWith("H") || roleId.startsWith("R");
}

function getConfig() {
  const roleId = roleSelect.value;
  const group = simRunning ? activeGroup : selectedGroup;
  const tankMelee = isTankMelee(roleId);
  return {
    roleId,
    group,
    groupBDebuff: group === "B" ? groupBDebuffChoice : null,
    groupADebuff: group === "A" ? groupADebuffChoice : null,
    sameAsPartner: group === "A" && tankMelee ? groupASamePartner : false,
  };
}

function updatePickerVisibility(step) {
  const { roleId, group } = getConfig();
  const tankMelee = isTankMelee(roleId);
  const showB = group === "B" && step?.tower <= 4;
  groupBDebuffWrap?.classList.toggle("hidden", !showB);
  const showA =
    group === "A" && step && (step.tower >= 4 || step.action === "baitOnly");
  groupADebuffWrap?.classList.toggle("hidden", !showA);
  groupASamePartnerCheck
    ?.closest(".same-partner-check")
    ?.classList.toggle("hidden", !tankMelee);
}

function setGroupADebuff(value) {
  groupADebuffChoice = value;
  groupAConeBtn?.classList.toggle("active", value === "cone");
  groupACircleBtn?.classList.toggle("active", value === "circle");
  if (currentStage >= 0 && timeline) {
    lastRenderedPreviewKey = null;
    previewStep(currentStage);
  } else {
    onConfigChange();
  }
}

function updateGroupStartButtons() {
  const roleId = roleSelect.value;
  const disabled = simRunning;
  if (startGroupABtn) startGroupABtn.disabled = disabled || !getTimeline(roleId, "A");
  if (startGroupBBtn) startGroupBBtn.disabled = disabled || !getTimeline(roleId, "B");
}

function startWithGroup(group) {
  if (simRunning) return;
  selectedGroup = group;
  activeGroup = group;
  timeline = getTimeline(roleSelect.value, group);
  if (!timeline) return;
  start();
}

function onConfigChange() {
  const { roleId, group } = getConfig();
  updateCloneVisibility(roleId);
  renderConeBaitGuides(roleId);
  timeline = getTimeline(roleId, group);

  if (!timeline) {
    timelineStatus.textContent = `No timeline for ${roleId} / Group ${group} yet.`;
    updateGroupStartButtons();
    buildStagePills([]);
    stageHint.textContent = "Select a role with a populated timeline.";
    clearPositionMarkers();
    clearConeBaitGuides();
    groupBDebuffWrap?.classList.add("hidden");
    groupADebuffWrap?.classList.add("hidden");
    return;
  }

  timelineStatus.textContent = timeline.label;
  updateGroupStartButtons();
  buildStagePills(timeline.steps);

  if (currentStage < 0) {
    previewStep(0, "all");
  } else if (currentStage >= 0) {
    previewStep(currentStage);
  }
}

function buildStagePills(steps) {
  stagePills.innerHTML = "";
  steps.forEach((step) => {
    const pill = document.createElement("div");
    const isEven = step.towerParity === "even";
    const isBaitOnly = step.action === "baitOnly";
    pill.className = isBaitOnly
      ? "pill bait"
      : ["pill", "tower", isEven ? "even" : "odd"].join(" ");

    if (!isBaitOnly && step.tower) {
      const letter = getTowerGroupLetter(step.tower);
      if (letter) {
        const groupEl = document.createElement("span");
        groupEl.className = `pill-group group-${letter.toLowerCase()}`;
        groupEl.textContent = letter;
        pill.appendChild(groupEl);
      }
    }

    const towerEl = document.createElement("span");
    towerEl.className = "pill-tower";
    towerEl.textContent = isBaitOnly
      ? "PF"
      : step.baitPhase
        ? `T${step.tower}+`
        : `T${step.tower ?? "?"}`;
    pill.appendChild(towerEl);

    pill.title = step.title;
    stagePills.appendChild(pill);
  });
}

function setTowerVisual(parity, baitOnly = false) {
  if (baitOnly) {
    arenaLayerOdd?.classList.add("hidden");
    arenaLayerEven?.classList.add("hidden");
    if (towerTypeBadge) {
      towerTypeBadge.textContent = "Past / Future only";
      towerTypeBadge.className = "tower-badge bait";
    }
    return;
  }
  const isEven = parity === "even";
  arenaLayerOdd?.classList.toggle("hidden", isEven);
  arenaLayerEven?.classList.toggle("hidden", !isEven);
  if (towerTypeBadge) {
    towerTypeBadge.textContent = isEven ? "Even Towers" : "Odd Towers";
    towerTypeBadge.className = `tower-badge ${isEven ? "even" : "odd"}`;
  }
}

function getStepPhase(step, elapsedMs) {
  if (step.action === "baitOnly") return "bait";
  if (!step.baitPhase) return "tower";
  return elapsedMs < BAIT_DURATION_MS ? "bait" : "tower";
}

function getStageDuration(step) {
  if (step.action === "baitOnly") return BAIT_DURATION_MS;
  if (step.tower === 1) return FIRST_TOWER_DURATION_MS;
  return STAGE_DURATION_MS;
}

function clearPositionMarkers() {
  if (positionMarkers) positionMarkers.innerHTML = "";
  updatePastFutureRefVisibility([]);
}

function clearConeBaitGuides() {
  if (coneBaitGuides) coneBaitGuides.innerHTML = "";
}

function renderConeBaitGuides(roleId) {
  clearConeBaitGuides();
  if (!coneBaitGuides || !isSupportDps(roleId)) return;

  const guide = getEvenConeBaitGuideForRole(roleId);
  if (!guide) return;

  const svgNs = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(svgNs, "g");
  g.setAttribute("class", "cone-bait-guide reference");

  for (const line of guide.lines) {
    const el = document.createElementNS(svgNs, "line");
    el.setAttribute("x1", String(line.x1));
    el.setAttribute("y1", String(line.y1));
    el.setAttribute("x2", String(line.x2));
    el.setAttribute("y2", String(line.y2));
    g.appendChild(el);
  }

  const rect = document.createElementNS(svgNs, "rect");
  rect.setAttribute("x", String(guide.square.x));
  rect.setAttribute("y", String(guide.square.y));
  rect.setAttribute("width", String(guide.square.width));
  rect.setAttribute("height", String(guide.square.height));
  g.appendChild(rect);

  coneBaitGuides.appendChild(g);
}

function updatePastFutureRefVisibility(markerSpots) {
  if (!pastFutureMarkers) return;
  const hasActiveBait = markerSpots.some(
    (s) => (s.debuff === "past" || s.debuff === "future") && !s.preview
  );
  pastFutureMarkers.classList.toggle("hidden", hasActiveBait);
}

function renderPositionMarkers(spots, activePhase) {
  clearPositionMarkers();
  if (!positionMarkers || !spots.length) {
    updatePastFutureRefVisibility([]);
    return;
  }

  const svgNs = "http://www.w3.org/2000/svg";

  spots.forEach((spot) => {
    const isPreview = spot.preview === true;
    const isBaitHidden =
      activePhase === "tower" && spot.phase === "bait";

    if (isBaitHidden) return;

    const g = document.createElementNS(svgNs, "g");
    g.setAttribute("transform", `translate(${spot.x}, ${spot.y})`);
    const isActiveBait =
      !isPreview && (spot.debuff === "past" || spot.debuff === "future");
    g.setAttribute(
      "class",
      `pos-marker variant-${spot.variant} debuff-${spot.debuff}${isPreview ? " preview" : ""}${isActiveBait ? " active-bait" : ""}`
    );

    const color = DEBUFF_COLORS[spot.debuff] ?? "#c8ccd4";
    const isClash = spot.variant === "partner-clash";

    const ring = document.createElementNS(svgNs, "circle");
    ring.setAttribute("class", "pos-ring");
    ring.setAttribute("r", isClash ? "13" : "15");
    ring.setAttribute("fill", isClash ? "none" : color);
    ring.setAttribute("fill-opacity", isClash ? "0" : "0.25");
    ring.setAttribute("stroke", color);
    ring.setAttribute("stroke-width", isClash ? "2" : "2.5");
    if (isClash) ring.setAttribute("stroke-dasharray", "4 3");

    const dot = document.createElementNS(svgNs, "circle");
    dot.setAttribute("class", "pos-dot");
    dot.setAttribute("r", "6");
    dot.setAttribute("fill", color);

    const off = LABEL_OFFSET[spot.debuff] ?? { dx: 0, dy: -18 };
    const label = document.createElementNS(svgNs, "text");
    label.setAttribute("x", String(off.dx));
    label.setAttribute("y", String(off.dy));
    label.setAttribute("text-anchor", off.dx < 0 ? "end" : off.dx > 0 ? "start" : "middle");
    label.setAttribute("class", "pos-label");
    label.textContent = spot.label;

    g.appendChild(ring);
    g.appendChild(dot);
    g.appendChild(label);
    positionMarkers.appendChild(g);
  });

  updatePastFutureRefVisibility(
    spots.filter(
      (s) =>
        (s.debuff === "past" || s.debuff === "future") &&
        !(activePhase === "tower" && s.phase === "bait")
    )
  );
}

function formatStepDetail(step, phase, config) {
  const { roleId, group, groupBDebuff, groupADebuff, sameAsPartner } = config;
  let title = step.title;
  if (step.action === "baitClone" && isSupportDps(roleId)) {
    title = title.replace(/Bait Clone/i, "Cone Bait (Waymark)");
  }
  const lines = [`<strong>${title}</strong>`];
  if (step.note) lines.push(`<em>${step.note}</em>`);

  if (step.action === "baitOnly") {
    const onlyBait = getStepPositions(step, "all", config);
    lines.push("<p class='detail-intro'>Bait Past or Future — 6s.</p>");
    lines.push("<ul class='position-list'>");
    for (const spot of onlyBait) {
      lines.push(`<li class="debuff-${spot.debuff}"><span class="debuff-tag">${spot.label}</span> — ${spot.hint}</li>`);
    }
    lines.push("</ul>");
    return lines.join("");
  }

  if (step.baitPhase) {
    lines.push(
      `<p class="timing-note">⏱ <strong>0–6s</strong> Past/Future bait (odd tower counting) · ` +
        `<strong>6–10.5s</strong> move to tower spot</p>`
    );
  }

  const baitSpots = getStepPositions(step, "bait", config);
  const towerSpots = getStepPositions(step, "tower", config);
  const solvedB = group === "B" && step.groupBAdjust;
  const solvedBAdjust = solvedB && isTankMelee(roleId);
  const solvedA = group === "A" && step.groupAFilter;
  const solvedAAdjust = solvedA && isTankMelee(roleId) && sameAsPartner;

  if (step.baitPhase && (phase === "all" || phase === "bait") && baitSpots.length) {
    lines.push("<p class='detail-intro'>Bait (first 6s) — one of:</p><ul class='position-list'>");
    for (const spot of baitSpots) {
      lines.push(`<li class="debuff-${spot.debuff}"><span class="debuff-tag">${spot.label}</span> — ${spot.hint}</li>`);
    }
    lines.push("</ul>");
    if (phase === "bait" || phase === "all") {
      lines.push("<p class='detail-intro'>Tower spots (preview, then move after 6s):</p>");
    }
  }

  if (towerSpots.length && (step.action === "takeTower" || step.baitPhase)) {
    const when = step.baitPhase
      ? phase === "bait" ? " (preview — move after 6s)" : " (last 4.5s)"
      : "";
    let intro = `Tower positions${when}:`;
    if (solvedB) {
      intro = solvedBAdjust
        ? `Tower 4 — ${groupBDebuff} (adjusting):`
        : `Tower 4 — ${groupBDebuff}:`;
    }
    if (solvedA) {
      intro = solvedAAdjust
        ? `Tower 8 — ${groupADebuff} (same as partner — adjusting):`
        : `Tower 8 — ${groupADebuff}:`;
    }
    lines.push(`<p class='detail-intro'>${intro}</p>`);
    lines.push("<ul class='position-list'>");
    for (const spot of towerSpots) {
      const clash = spot.variant === "partner-clash";
      const tag = clash ? ' <span class="clash-tag">partner clash</span>' : "";
      lines.push(
        `<li class="debuff-${spot.debuff} ${clash ? "clash" : ""}">` +
          `<span class="debuff-tag">${spot.label}</span> — ${spot.hint}${tag}</li>`
      );
    }
    lines.push("</ul>");
    if (step.action === "takeTower" && !solvedB && !solvedA) {
      if (isSupportDps(roleId)) {
        lines.push(
          "<p class='debuff-rule'>Cone always left · circle always right. " +
            "Healers: stack/cone left, circle right · Ranged: cone left, stack/circle right. No adjusts.</p>"
        );
      } else {
        lines.push(
          "<p class='debuff-rule'>Odd: one circle on right. " +
            "Even: dashed = partner clash. Melee defaults right.</p>"
        );
      }
    }
  } else if (towerSpots.length) {
    lines.push(`<p>${towerSpots[0].hint}</p>`);
  }

  return lines.join("");
}

function previewStep(index, phaseOverride) {
  if (!timeline) return;
  const step = timeline.steps[index];
  const config = getConfig();
  updatePickerVisibility(step);
  const elapsed = stageStartedAt ? Date.now() - stageStartedAt : 0;
  const phase = phaseOverride ?? getStepPhase(step, elapsed);
  const phaseKey = phase === "all" ? "all" : phase;
  const spots = getStepPositions(step, phaseKey, config);

  setTowerVisual(step.towerParity ?? "odd", step.action === "baitOnly");
  const markers =
    phase === "tower" && step.baitPhase
      ? getStepPositions(step, "tower", config)
      : phase === "bait" && step.baitPhase
        ? getStepPositions(step, "bait", config)
        : getStepPositions(step, phaseKey, config);
  renderPositionMarkers(markers, phase);

  stageLabel.textContent =
    step.action === "baitOnly" ? "Final bait" : `Tower ${step.tower} / 8`;
  if (phaseLabel) {
    if (step.action === "baitOnly") {
      phaseLabel.textContent = "Phase: Bait";
    } else if (!step.baitPhase) {
      phaseLabel.textContent = "";
    } else if (phase === "bait") {
      phaseLabel.textContent = "Phase: Bait";
    } else if (phase === "tower") {
      phaseLabel.textContent = "Phase: Move to tower";
    } else {
      phaseLabel.textContent = "Bait 6s → Move 4.5s";
    }
  }

  if (!countdownInterval) countdownEl.textContent = "—";

  stageHint.textContent =
    step.action === "baitOnly"
      ? "Final Past/Future bait only — no tower."
      : step.baitPhase && phase === "all"
      ? "Shows all spots — timer splits 6s bait then 4.5s move."
      : step.baitPhase && phase === "bait"
        ? "Bait now — tower spots shown faded; they go full bright after 6s."
        : step.baitPhase && phase === "tower"
          ? "Move to your tower position!"
          : config.group === "B" && step.groupBAdjust
            ? isTankMelee(config.roleId)
              ? `Tower 4 only — your ${config.groupBDebuff} adjust spot.`
              : `Tower 4 — your ${config.groupBDebuff} spot (left/right tower).`
            : config.group === "A" && step.groupAFilter
              ? isTankMelee(config.roleId)
                ? `Tower 8 — your ${config.groupADebuff} spot${
                    config.sameAsPartner ? " (adjusting)" : ""
                  }.`
                : `Tower 8 — your ${config.groupADebuff} spot (no adjust).`
              : isSupportDps(config.roleId) && step.action === "takeTower"
                ? "Your tower spots only — no partner adjusts."
                : isSupportDps(config.roleId) && step.action === "baitClone"
                  ? "Cone bait on waymark — not clone."
                  : spots.length > 1
              ? "Solid = your spot · dashed = partner clash."
              : spots[0]?.hint ?? "";

  stepDetail.innerHTML = formatStepDetail(step, phase, config);
  updatePills(index);
  lastRenderedPreviewKey = `${index}:${phase}`;
}

function updatePills(activeIndex) {
  stagePills.querySelectorAll(".pill").forEach((pill, i) => {
    pill.classList.remove("active", "done");
    if (activeIndex >= 0 && i < activeIndex) pill.classList.add("done");
    if (i === activeIndex) pill.classList.add("active");
  });
}

function goToStage(index) {
  currentStage = index;
  stageStartedAt = Date.now();
  stageEndsAt = stageStartedAt + getStageDuration(timeline.steps[index]);
  lastRenderedPreviewKey = null;
  previewStep(index);
}

function refreshPreviewIfNeeded(phase) {
  const key = `${currentStage}:${phase}`;
  if (lastRenderedPreviewKey === key) return;
  previewStep(currentStage, phase);
}

function tickCountdown() {
  if (!timeline) return;
  const step = timeline.steps[currentStage];
  const elapsed = Date.now() - stageStartedAt;
  const remaining = Math.max(0, stageEndsAt - Date.now());

  if (step?.baitPhase) {
    if (elapsed < BAIT_DURATION_MS) {
      const baitLeft = Math.ceil((BAIT_DURATION_MS - elapsed) / 1000);
      countdownEl.textContent = `${baitLeft}s bait`;
      refreshPreviewIfNeeded("bait");
    } else {
      const moveLeft = Math.ceil((STAGE_DURATION_MS - elapsed) / 1000);
      countdownEl.textContent = `${moveLeft}s move`;
      refreshPreviewIfNeeded("tower");
    }
  } else if (step?.action === "baitOnly") {
    countdownEl.textContent = `${Math.ceil(remaining / 1000)}s bait`;
    refreshPreviewIfNeeded("bait");
  } else {
    countdownEl.textContent = `${Math.ceil(remaining / 1000)}s`;
  }

  if (remaining <= 0) advanceStage();
}

function advanceStage() {
  const next = currentStage + 1;
  if (!timeline || next >= timeline.steps.length) {
    finish();
    return;
  }
  goToStage(next);
}

function skipToNextStep() {
  if (!countdownInterval || !timeline || currentStage < 0) return;
  advanceStage();
  if (countdownInterval) tickCountdown();
}

function setControlsDisabled(running) {
  simRunning = running;
  roleSelect.disabled = running;
  updateGroupStartButtons();
  const showA = !groupADebuffWrap?.classList.contains("hidden");
  const tankMelee = isTankMelee(roleSelect.value);
  // Group A/B debuff pickers stay changeable mid-run
  if (groupASamePartnerCheck && showA && tankMelee) {
    groupASamePartnerCheck.disabled = running;
  }
  if (nextStepBtn) nextStepBtn.disabled = !running;
  resetBtn.disabled = !running;
}

function start() {
  if (!timeline) return;
  reset(false);
  setControlsDisabled(true);
  goToStage(0);
  countdownInterval = setInterval(tickCountdown, 100);
  tickCountdown();
}

function finish() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  reset(true);
}

function reset(enableControls = true) {
  clearInterval(countdownInterval);
  countdownInterval = null;
  simRunning = false;
  currentStage = -1;
  stageStartedAt = 0;
  lastRenderedPreviewKey = null;

  if (enableControls) {
    setControlsDisabled(false);
    stageLabel.textContent = "Tower —";
    if (phaseLabel) phaseLabel.textContent = "";
    countdownEl.textContent = "—";
    updatePills(-1);
    onConfigChange();
  }
}

init();
