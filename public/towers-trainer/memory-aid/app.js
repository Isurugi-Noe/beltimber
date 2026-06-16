const STORAGE_KEY = "memory-aid-selections";

const groupA = {
  cone: document.getElementById("group-a-cone"),
  circle: document.getElementById("group-a-circle"),
  samePartner: document.getElementById("group-a-same-partner"),
};

const groupB = {
  cone: document.getElementById("group-b-cone"),
  circle: document.getElementById("group-b-circle"),
};

const panelA = document.getElementById("group-a-panel");
const panelB = document.getElementById("group-b-panel");

let selections = loadSelections();

function loadSelections() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      A: saved.A === "circle" ? "circle" : "cone",
      B: saved.B === "circle" ? "circle" : "cone",
      sameAsPartner: Boolean(saved.sameAsPartner),
    };
  } catch {
    return { A: "cone", B: "cone", sameAsPartner: false };
  }
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

function setSelection(group, value) {
  selections[group] = value;
  saveSelections();
  updateButtons(group);
  setFocusedGroup(group);
}

function updateButtons(group) {
  const buttons = group === "A" ? groupA : groupB;
  const value = selections[group];
  buttons.cone.classList.toggle("active", value === "cone");
  buttons.circle.classList.toggle("active", value === "circle");
}

function toggleSameAsPartner() {
  selections.sameAsPartner = !selections.sameAsPartner;
  saveSelections();
  updateSamePartnerButton();
  setFocusedGroup("A");
}

function setFocusedGroup(group) {
  panelA.classList.toggle("focused", group === "A");
  panelA.classList.toggle("dimmed", group === "B");
  panelB.classList.toggle("focused", group === "B");
  panelB.classList.toggle("dimmed", group === "A");
}

function updateSamePartnerButton() {
  groupA.samePartner.classList.toggle("active", selections.sameAsPartner);
}

groupA.cone.addEventListener("click", () => setSelection("A", "cone"));
groupA.circle.addEventListener("click", () => setSelection("A", "circle"));
groupA.samePartner.addEventListener("click", toggleSameAsPartner);
groupB.cone.addEventListener("click", () => setSelection("B", "cone"));
groupB.circle.addEventListener("click", () => setSelection("B", "circle"));

updateButtons("A");
updateButtons("B");
updateSamePartnerButton();
