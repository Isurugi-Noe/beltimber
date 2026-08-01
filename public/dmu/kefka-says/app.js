const STORAGE_KEY = "kefka-says-debuffs-v2";

const NEO_DEBUFFS = [
  {
    id: "compressed-water",
    name: "Compressed Water",
    alias: "stacks",
    icon: "icons/compressed-water.png",
  },
  {
    id: "forked-lightning",
    name: "Forked Lightning",
    alias: "spreads",
    icon: "icons/forked-lightning.png",
  },
  {
    id: "acceleration-bomb",
    name: "Acceleration Bomb",
    alias: "stillness",
    icon: "icons/acceleration-bomb.png",
  },
  {
    id: "cursed-shriek",
    name: "Cursed Shriek",
    alias: "gazes",
    icon: "icons/cursed-shriek.png",
  },
];

const CHAOS_DEBUFFS = [
  {
    id: "entropy",
    name: "Entropy",
    icon: "icons/entropy.png",
  },
  {
    id: "dynamic-fluid",
    name: "Dynamic Fluid",
    icon: "icons/dynamic-fluid.png",
  },
];

const KEFKA_MECHANICS = [
  {
    id: "thunder",
    name: "Thrumming Thunder",
    shortName: "Thunder",
    icon: "icons/thunder.png",
  },
  {
    id: "blizzard",
    name: "Blizzard Blowout",
    shortName: "Blizzard",
    icon: "icons/blizzard.png",
  },
];

const DURATIONS = ["short", "long"];
const NEO_KEYS = NEO_DEBUFFS.flatMap((d) => DURATIONS.map((dur) => `${d.id}:${dur}`));
const CHAOS_KEYS = CHAOS_DEBUFFS.map((d) => d.id);
const KEFKA_KEYS = KEFKA_MECHANICS.flatMap((mechanic) => [
  `${mechanic.id}:recorded`,
  `${mechanic.id}:release`,
]);
const ALL_KEYS = [...NEO_KEYS, ...CHAOS_KEYS, ...KEFKA_KEYS];

let selections = loadSelections();

function emptySelections() {
  return Object.fromEntries(ALL_KEYS.map((key) => [key, null]));
}

function normalizeValue(value) {
  return value === "real" || value === "fake" ? value : null;
}

function loadSelections() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const result = emptySelections();
    for (const key of ALL_KEYS) {
      result[key] = normalizeValue(saved[key]);
    }
    return result;
  } catch {
    return emptySelections();
  }
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

function rfClass(value) {
  if (value === "real") return "is-real";
  if (value === "fake") return "is-fake";
  return "is-unset";
}

function buildToggles(key) {
  const value = selections[key];
  const wrap = document.createElement("div");
  wrap.className = `debuff-toggles ${rfClass(value)}`;
  wrap.dataset.key = key;

  for (const option of ["real", "fake"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn toggle-btn ${option}${value === option ? " active" : ""}`;
    btn.dataset.value = option;
    btn.textContent = option === "real" ? "Real" : "Fake";
    btn.addEventListener("click", () => setSelection(key, option));
    wrap.appendChild(btn);
  }

  return wrap;
}

function buildNeoRow(debuff, duration) {
  const row = document.createElement("div");
  row.className = "debuff-row debuff-row--single";
  row.dataset.id = `${debuff.id}:${duration}`;

  row.innerHTML = `
    <img class="debuff-icon" src="${debuff.icon}" alt="" width="34" height="34" />
    <div>
      <h3 class="debuff-name">${debuff.name}</h3>
      <span class="debuff-alias">${debuff.alias}</span>
    </div>
  `;
  row.appendChild(buildToggles(`${debuff.id}:${duration}`));

  return row;
}

function buildChaosRow(debuff) {
  const row = document.createElement("div");
  row.className = "debuff-row debuff-row--chaos";
  row.dataset.id = debuff.id;

  row.innerHTML = `
    <img class="debuff-icon" src="${debuff.icon}" alt="" width="34" height="34" />
    <h3 class="debuff-name">${debuff.name}</h3>
  `;
  row.appendChild(buildToggles(debuff.id));
  return row;
}

function buildKefkaRow(mechanic) {
  const row = document.createElement("div");
  row.className = "kefka-row";
  row.dataset.id = mechanic.id;

  row.innerHTML = `
    <img class="debuff-icon" src="${mechanic.icon}" alt="" width="34" height="34" />
    <h3 class="debuff-name">${mechanic.name}</h3>
    <span class="cast-label">Recorded</span>
    <span class="cast-label">Release</span>
  `;
  row.appendChild(buildToggles(`${mechanic.id}:recorded`));
  row.appendChild(buildToggles(`${mechanic.id}:release`));
  return row;
}

function setSelection(key, value) {
  selections[key] = selections[key] === value ? null : value;

  const changed = new Set([key]);
  if (NEO_KEYS.includes(key)) {
    for (const filledKey of autofillNeoSets()) {
      changed.add(filledKey);
    }
  }

  saveSelections();
  for (const changedKey of changed) {
    updateToggles(changedKey);
  }
  renderPrompt();
}

/** Infer Grand Cross cast pairing and fill uniquely determined Neo slots. */
function autofillNeoSets() {
  const ids = NEO_DEBUFFS.map((d) => d.id);
  const filled = [];

  for (const id of ids) {
    for (const duration of DURATIONS) {
      const value = selections[`${id}:${duration}`];
      if (value) filled.push({ id, duration, value });
    }
  }

  if (filled.length === 0) return [];

  const worlds = [];
  const orientationCount = 1 << ids.length;

  for (let mask = 0; mask < orientationCount; mask++) {
    const orientation = Object.fromEntries(ids.map((id, index) => [id, (mask >> index) & 1]));
    let castA = null;
    let castB = null;
    let valid = true;

    for (const entry of filled) {
      // orientation 0: short→A, long→B; orientation 1: short→B, long→A
      const onCastA =
        (orientation[entry.id] === 0 && entry.duration === "short") ||
        (orientation[entry.id] === 1 && entry.duration === "long");
      if (onCastA) {
        if (castA && castA !== entry.value) {
          valid = false;
          break;
        }
        castA = entry.value;
      } else {
        if (castB && castB !== entry.value) {
          valid = false;
          break;
        }
        castB = entry.value;
      }
    }

    if (!valid) continue;

    const world = {};
    for (const id of ids) {
      for (const duration of DURATIONS) {
        const onCastA =
          (orientation[id] === 0 && duration === "short") ||
          (orientation[id] === 1 && duration === "long");
        world[`${id}:${duration}`] = onCastA ? castA : castB;
      }
    }
    worlds.push(world);
  }

  if (worlds.length === 0) return [];

  const filledKeys = [];
  for (const key of NEO_KEYS) {
    if (selections[key]) continue;

    let common = worlds[0][key];
    for (let i = 1; i < worlds.length; i++) {
      if (worlds[i][key] !== common) {
        common = null;
        break;
      }
    }

    if (common) {
      selections[key] = common;
      filledKeys.push(key);
    }
  }
  return filledKeys;
}

function updateToggles(key) {
  const wrap = document.querySelector(`.debuff-toggles[data-key="${key}"]`);
  if (!wrap) return;
  const value = selections[key];
  wrap.className = `debuff-toggles ${rfClass(value)}`;
  wrap.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function marked(value) {
  if (value === "real") return '<span class="real">real</span>';
  if (value === "fake") return '<span class="fake">fake</span>';
  return '<span class="unset">—</span>';
}

function pairLine(duration) {
  const stacks = selections[`compressed-water:${duration}`];
  const spreads = selections[`forked-lightning:${duration}`];
  const stillness = selections[`acceleration-bomb:${duration}`];
  const values = [stacks, spreads, stillness];
  const ready = values.every(Boolean);
  const partial = values.some(Boolean);

  return {
    ready,
    partial,
    html: `stacks ${marked(stacks)}, spreads ${marked(spreads)}, stillness ${marked(stillness)}`,
  };
}

function gazeLine(duration) {
  const value = selections[`cursed-shriek:${duration}`];
  return {
    ready: Boolean(value),
    partial: Boolean(value),
    html: `gazes ${marked(value)}`,
  };
}

function chaosMoveLine(id) {
  const value = selections[id];
  let html = '<span class="unset">—</span>';
  if (id === "entropy") {
    if (value === "real") html = 'Stack center then <span class="real">move</span>';
    if (value === "fake") html = 'Stack center and <span class="fake">stay</span>';
  } else if (id === "dynamic-fluid") {
    if (value === "real") html = 'Stack center and <span class="real">stay</span>';
    if (value === "fake") html = 'Stack center then <span class="fake">move</span>';
  }
  return { ready: Boolean(value), partial: Boolean(value), html };
}

function finalKefkaLine() {
  const results = KEFKA_MECHANICS.map((mechanic) => {
    const recorded = selections[`${mechanic.id}:recorded`];
    const release = selections[`${mechanic.id}:release`];
    const ready = Boolean(recorded && release);
    const result = ready ? (recorded === release ? "real" : "fake") : null;
    return { ...mechanic, recorded, release, ready, result };
  });

  const html = results
    .map((mechanic) => `${mechanic.shortName} ${marked(mechanic.result)}`)
    .join(", ");

  return {
    ready: results.every((mechanic) => mechanic.ready),
    partial: results.some((mechanic) => mechanic.recorded || mechanic.release),
    html,
  };
}

function buildPromptSteps() {
  const shortPair = pairLine("short");
  const shortGaze = gazeLine("short");
  const entropy = chaosMoveLine("entropy");
  const longPair = pairLine("long");
  const longGaze = gazeLine("long");
  const fluid = chaosMoveLine("dynamic-fluid");
  const manaRelease = finalKefkaLine();

  return [
    { label: "Short stacks / spreads / stillness", ...shortPair },
    { label: "Short gazes", note: "Check Thunder (recorded)", ...shortGaze },
    { label: "Entropy", ...entropy },
    { label: "Long stacks / spreads / stillness", note: "Check Blizzard (recorded)", ...longPair },
    { label: "Long gazes", ...longGaze },
    { label: "Dynamic Fluid", ...fluid },
    { label: "Mana Release", ...manaRelease },
  ];
}

function renderPrompt() {
  const list = document.getElementById("prompt-list");
  list.innerHTML = "";

  buildPromptSteps().forEach((step, index) => {
    const li = document.createElement("li");
    li.className = "prompt-step";
    if (step.ready) li.classList.add("is-ready");
    else if (step.partial) li.classList.add("is-partial");

    const noteHtml = step.note ? `<p class="prompt-note">${step.note}</p>` : "";
    li.innerHTML = `
      <span class="prompt-num">${index + 1}</span>
      <div class="prompt-body">
        <p class="prompt-label">${step.label}</p>
        <p class="prompt-text">${step.html}</p>
        ${noteHtml}
      </div>
    `;
    list.appendChild(li);
  });
}

function render() {
  const neoShortList = document.getElementById("neo-short-list");
  const neoLongList = document.getElementById("neo-long-list");
  const chaosList = document.getElementById("chaos-list");
  const kefkaList = document.getElementById("kefka-list");
  neoShortList.innerHTML = "";
  neoLongList.innerHTML = "";
  chaosList.innerHTML = "";
  kefkaList.innerHTML = "";
  NEO_DEBUFFS.forEach((d) => neoShortList.appendChild(buildNeoRow(d, "short")));
  NEO_DEBUFFS.forEach((d) => neoLongList.appendChild(buildNeoRow(d, "long")));
  CHAOS_DEBUFFS.forEach((d) => chaosList.appendChild(buildChaosRow(d)));
  KEFKA_MECHANICS.forEach((mechanic) => kefkaList.appendChild(buildKefkaRow(mechanic)));
  renderPrompt();
}

document.getElementById("reset-btn").addEventListener("click", () => {
  selections = emptySelections();
  saveSelections();
  render();
});

render();
