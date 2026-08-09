const STORAGE_KEY = "kefka-you-v2";
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

const DURATIONS = ["short", "long"];

let selections = loadSelections();

function emptySelections() {
  return { short: {}, long: {} };
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

function renderPrompt() {
  document.getElementById("prompt-line").innerHTML =
    `First set ${markedParts(resolveSet("short"))}, second set ${markedParts(resolveSet("long"))}`;
  document.getElementById("gaze-line").innerHTML =
    `First gaze ${markedGaze(resolveGaze("short"))}, second gaze ${markedGaze(resolveGaze("long"))}`;
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
      <div class="debuff-toggles">
        <button type="button" class="btn toggle-btn real${value === "real" ? " active" : ""}" data-value="real">Real</button>
        <button type="button" class="btn toggle-btn fake${value === "fake" ? " active" : ""}" data-value="fake">Fake</button>
      </div>
    `;

    card.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => setValue(duration, debuff.id, btn.dataset.value));
    });

    wrap.appendChild(card);
  }
}

function render() {
  for (const duration of DURATIONS) {
    buildIconPicker(duration);
  }
  renderPrompt();
}

document.getElementById("reset-btn").addEventListener("click", () => {
  selections = emptySelections();
  saveSelections();
  render();
});

render();
