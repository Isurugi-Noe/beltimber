const STORAGE_KEY = "kefka-you-v3";
const ICON_BASE = "../kefka-says/icons";

const DEBUFFS = [
  {
    id: "compressed-water",
    label: "Water",
    icon: `${ICON_BASE}/compressed-water.png`,
  },
  {
    id: "forked-lightning",
    label: "Spread",
    icon: `${ICON_BASE}/forked-lightning.png`,
  },
  {
    id: "acceleration-bomb",
    label: "Stillness",
    icon: `${ICON_BASE}/acceleration-bomb.png`,
  },
  {
    id: "cursed-shriek",
    label: "Gaze",
    icon: `${ICON_BASE}/cursed-shriek.png`,
  },
];

const MANA_MECHANICS = [
  {
    id: "thunder",
    name: "Thrumming Thunder",
    resultName: "Lightning",
    icon: `${ICON_BASE}/thunder.png`,
  },
  {
    id: "blizzard",
    name: "Blizzard Blowout",
    resultName: "Ice",
    icon: `${ICON_BASE}/blizzard.png`,
  },
];

const DURATIONS = ["short", "long"];

let selections = loadSelections();

function emptySelections() {
  return {
    short: {},
    long: {},
    mana: {
      thunder: { recorded: null, release: null },
      blizzard: { recorded: null, release: null },
    },
  };
}

function normalizeValue(value) {
  return value === "real" || value === "fake" ? value : null;
}

function loadSelections() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const result = emptySelections();

    for (const duration of DURATIONS) {
      const entry = saved[duration] && typeof saved[duration] === "object" ? saved[duration] : {};
      for (const debuff of DEBUFFS) {
        const value = normalizeValue(entry[debuff.id]);
        if (value) result[duration][debuff.id] = value;
      }
    }

    const mana = saved.mana && typeof saved.mana === "object" ? saved.mana : {};
    for (const mechanic of MANA_MECHANICS) {
      const entry = mana[mechanic.id] && typeof mana[mechanic.id] === "object" ? mana[mechanic.id] : {};
      result.mana[mechanic.id] = {
        recorded: normalizeValue(entry.recorded),
        release: normalizeValue(entry.release),
      };
    }

    return result;
  } catch {
    return emptySelections();
  }
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

function isSpread(id, value) {
  return (
    (id === "forked-lightning" && value === "real") ||
    (id === "compressed-water" && value === "fake")
  );
}

function markedEntries(duration) {
  return DEBUFFS
    .map((debuff) => [debuff.id, selections[duration][debuff.id]])
    .filter(([, value]) => value);
}

function resolveSet(duration) {
  const entries = markedEntries(duration);
  const spread = entries.some(([id, value]) => isSpread(id, value));
  const parts = [
    {
      text: spread ? "spread on B and D" : "stack on A and C",
      kind: spread ? "spread" : "stack",
    },
  ];

  const bomb = selections[duration]["acceleration-bomb"];
  if (bomb) {
    parts.push({
      text: bomb === "real" ? "stillness" : "motion",
      kind: bomb === "real" ? "stillness" : "motion",
    });
  }

  return parts;
}

function resolveGaze(duration) {
  const gaze = selections[duration]["cursed-shriek"];
  if (gaze === "fake") {
    return { text: "look towards", kind: "look-towards" };
  }
  return { text: "look away", kind: "look-away" };
}

function resolveMana(mechanicId) {
  const entry = selections.mana[mechanicId];
  if (!entry.recorded || !entry.release) return null;
  return entry.recorded === entry.release ? "real" : "fake";
}

function markedParts(parts) {
  return parts
    .map((part, index) => {
      const prefix = index === 0 ? "" : " + ";
      return `${prefix}<span class="${part.kind}">${part.text}</span>`;
    })
    .join("");
}

function markedGaze(gaze) {
  return `<span class="${gaze.kind}">${gaze.text}</span>`;
}

function markedMana(value) {
  if (value === "real") return '<span class="real">real</span>';
  if (value === "fake") return '<span class="fake">fake</span>';
  return '<span class="unset">—</span>';
}

function renderPrompt() {
  document.getElementById("prompt-line").innerHTML =
    `First set ${markedParts(resolveSet("short"))}, second set ${markedParts(resolveSet("long"))}`;
  document.getElementById("gaze-line").innerHTML =
    `First gaze ${markedGaze(resolveGaze("short"))}, second gaze ${markedGaze(resolveGaze("long"))}`;
  document.getElementById("mana-line").innerHTML =
    `Lightning ${markedMana(resolveMana("thunder"))}, Ice ${markedMana(resolveMana("blizzard"))}`;
}

function setValue(duration, id, value) {
  if (selections[duration][id] === value) {
    delete selections[duration][id];
  } else {
    selections[duration][id] = value;
  }
  saveSelections();
  render();
}

function setManaValue(mechanicId, cast, value) {
  selections.mana[mechanicId][cast] =
    selections.mana[mechanicId][cast] === value ? null : value;
  saveSelections();
  render();
}

function buildToggles(activeValue, onPick) {
  const wrap = document.createElement("div");
  wrap.className = "debuff-toggles";

  for (const option of ["real", "fake"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn toggle-btn ${option}${activeValue === option ? " active" : ""}`;
    btn.textContent = option === "real" ? "Real" : "Fake";
    btn.addEventListener("click", () => onPick(option));
    wrap.appendChild(btn);
  }

  return wrap;
}

function buildIconPicker(duration) {
  const wrap = document.getElementById(`${duration}-icons`);
  wrap.innerHTML = "";

  for (const debuff of DEBUFFS) {
    const value = selections[duration][debuff.id] || null;

    const card = document.createElement("div");
    card.className = "debuff-card";
    if (value === "real") card.classList.add("is-real");
    if (value === "fake") card.classList.add("is-fake");

    card.innerHTML = `
      <img class="debuff-icon" src="${debuff.icon}" alt="" width="42" height="42" />
      <span class="icon-label">${debuff.label}</span>
    `;
    card.appendChild(buildToggles(value, (option) => setValue(duration, debuff.id, option)));
    wrap.appendChild(card);
  }
}

function buildManaPicker() {
  const wrap = document.getElementById("mana-list");
  wrap.innerHTML = "";

  for (const mechanic of MANA_MECHANICS) {
    const entry = selections.mana[mechanic.id];
    const row = document.createElement("div");
    row.className = "mana-row";

    row.innerHTML = `
      <img class="debuff-icon" src="${mechanic.icon}" alt="" width="42" height="42" />
      <span class="icon-label">${mechanic.name}</span>
    `;

    for (const cast of [
      { key: "recorded", label: "Recorded" },
      { key: "release", label: "Release" },
    ]) {
      const group = document.createElement("div");
      group.className = "cast-group";
      if (entry[cast.key] === "real") group.classList.add("is-real");
      if (entry[cast.key] === "fake") group.classList.add("is-fake");

      const label = document.createElement("span");
      label.className = "cast-label";
      label.textContent = cast.label;
      group.appendChild(label);
      group.appendChild(
        buildToggles(entry[cast.key], (option) => setManaValue(mechanic.id, cast.key, option))
      );
      row.appendChild(group);
    }

    wrap.appendChild(row);
  }
}

function render() {
  for (const duration of DURATIONS) {
    buildIconPicker(duration);
  }
  buildManaPicker();
  renderPrompt();
}

document.getElementById("reset-btn").addEventListener("click", () => {
  selections = emptySelections();
  saveSelections();
  render();
});

render();
