/**
 * script.js
 * Lógica principal de ClassSeat Pro.
 * Maneja: renderizado, drag & drop, localStorage, modales, fullscreen.
 */

// ═══════════════════════════════════════════
//  ESTADO GLOBAL
// ═══════════════════════════════════════════
window.appState = {
  desks: [],         // Array de objetos pupitre
  nextDeskId: 100,   // Counter para IDs de nuevos pupitres
};

const STORAGE_KEY = "classseat_pro_v2";

// ═══════════════════════════════════════════
//  SPLASH SCREEN
// ═══════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");

  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.style.display = "none";
      app.classList.remove("hidden");
      app.classList.add("fade-in");
      initApp();
    }, 600);
  }, 2200);
});

// ═══════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════
function initApp() {
  loadState();
  renderAll();
  bindEvents();
}

// ═══════════════════════════════════════════
//  PERSISTENCIA
// ═══════════════════════════════════════════
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      window.appState.desks = parsed.desks || deepClone(INITIAL_DESKS);
      window.appState.nextDeskId = parsed.nextDeskId || 100;
    } else {
      window.appState.desks = deepClone(INITIAL_DESKS);
    }
  } catch (e) {
    window.appState.desks = deepClone(INITIAL_DESKS);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    desks: window.appState.desks,
    nextDeskId: window.appState.nextDeskId,
  }));
  showStatus("Cambios guardados automáticamente");
}

function restoreDefault() {
  window.appState.desks = deepClone(INITIAL_DESKS);
  window.appState.nextDeskId = 100;
  saveState();
  renderAll();
  showToast("✓ Distribución original restaurada");
}

// ═══════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════
function renderAll() {
  renderDesks();
  renderUnassigned();
}

function renderDesks() {
  const grid = document.getElementById("deskGrid");
  grid.innerHTML = "";

  // Agrupar por columna
  const cols = {};
  window.appState.desks.forEach(desk => {
    if (!cols[desk.col]) cols[desk.col] = [];
    cols[desk.col].push(desk);
  });

  const colNums = Object.keys(cols).map(Number).sort((a, b) => a - b);

  colNums.forEach(colNum => {
    const colEl = document.createElement("div");
    colEl.className = "desk-column";
    colEl.dataset.col = colNum;

    // Column label
    const label = document.createElement("div");
    label.className = "col-label";
    label.textContent = `Col. ${colNum}`;
    colEl.appendChild(label);

    // Sort desks by row
    const sorted = cols[colNum].slice().sort((a, b) => a.row - b.row);

    sorted.forEach(desk => {
      colEl.appendChild(createDeskEl(desk));
    });

    grid.appendChild(colEl);
  });

  // Init SortableJS on each desk-column so desks can be reordered
  document.querySelectorAll(".desk-column").forEach(col => {
    Sortable.create(col, {
      group: "desks",
      animation: 180,
      handle: ".desk-drag-handle",
      filter: ".col-label",
      ghostClass: "desk-ghost",
      chosenClass: "desk-chosen",
      dragClass: "desk-drag",
      onEnd(evt) {
        reorderDesksFromDOM();
        saveState();
      }
    });
  });
}

function createDeskEl(desk) {
  const el = document.createElement("div");
  el.className = "desk-card";
  el.dataset.deskId = desk.id;

  // Drag handle
  const handle = document.createElement("div");
  handle.className = "desk-drag-handle";
  handle.title = "Arrastrar pupitre";
  handle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
  el.appendChild(handle);

  // Desk body
  const body = document.createElement("div");
  body.className = "desk-body";

  // Seat left
  body.appendChild(createSeatEl(desk, 0));

  // Divider
  const div = document.createElement("div");
  div.className = "desk-divider";
  body.appendChild(div);

  // Seat right
  body.appendChild(createSeatEl(desk, 1));

  el.appendChild(body);

  // Delete button
  const del = document.createElement("button");
  del.className = "desk-delete-btn";
  del.title = "Eliminar pupitre";
  del.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  del.addEventListener("click", () => deleteDesk(desk.id));
  el.appendChild(del);

  return el;
}

function createSeatEl(desk, seatIndex) {
  const studentId = desk.students[seatIndex];
  const student = studentId ? getStudentById(studentId) : null;

  const seat = document.createElement("div");
  seat.className = "desk-seat" + (student ? "" : " empty");
  seat.dataset.deskId = desk.id;
  seat.dataset.seatIndex = seatIndex;

  if (student) {
    const name = document.createElement("span");
    name.className = "seat-name";
    name.textContent = shortName(student.full, student.id);
    name.title = student.full;
    seat.appendChild(name);

    // Avatar initials
    const avatar = document.createElement("div");
    avatar.className = "seat-avatar";
    avatar.textContent = getInitials(student.full);
    seat.prepend(avatar);

    seat.draggable = true;
    seat.dataset.studentId = studentId;

    seat.addEventListener("dragstart", onStudentDragStart);
    seat.addEventListener("dragend", onStudentDragEnd);
  } else {
    seat.innerHTML = `<span class="empty-slot">+</span>`;
  }

  seat.addEventListener("dragover", onSeatDragOver);
  seat.addEventListener("dragleave", onSeatDragLeave);
  seat.addEventListener("drop", onSeatDrop);

  return seat;
}

function renderUnassigned() {
  const pool = document.getElementById("unassignedPool");
  const section = document.getElementById("unassignedSection");
  pool.innerHTML = "";

  const assigned = new Set(window.appState.desks.flatMap(d => d.students.filter(Boolean)));
  const unassigned = STUDENTS_DATA.all.filter(s => !assigned.has(s.id));

  if (unassigned.length === 0) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  unassigned.forEach(student => {
    const chip = document.createElement("div");
    chip.className = "student-chip";
    chip.draggable = true;
    chip.dataset.studentId = student.id;
    chip.title = student.full;

    chip.innerHTML = `
      <div class="chip-avatar">${getInitials(student.full)}</div>
      <span>${shortName(student.full, student.id)}</span>
    `;

    chip.addEventListener("dragstart", onStudentDragStart);
    chip.addEventListener("dragend", onStudentDragEnd);

    pool.appendChild(chip);
  });

  // Make unassigned pool also a drop target
  pool.addEventListener("dragover", onPoolDragOver);
  pool.addEventListener("dragleave", onPoolDragLeave);
  pool.addEventListener("drop", onPoolDrop);
}

// ═══════════════════════════════════════════
//  DRAG & DROP DE ESTUDIANTES
// ═══════════════════════════════════════════
let dragState = null;

function onStudentDragStart(e) {
  const studentId = e.currentTarget.dataset.studentId;
  const deskId = e.currentTarget.dataset.deskId;
  const seatIndex = e.currentTarget.dataset.seatIndex;

  dragState = { studentId, fromDeskId: deskId, fromSeatIndex: seatIndex !== undefined ? parseInt(seatIndex) : null };

  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", studentId);
}

function onStudentDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".seat-over, .pool-over").forEach(el => el.classList.remove("seat-over", "pool-over"));
  dragState = null;
}

function onSeatDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("seat-over");
}

function onSeatDragLeave(e) {
  e.currentTarget.classList.remove("seat-over");
}

function onSeatDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("seat-over");
  if (!dragState) return;

  const toDeskId = e.currentTarget.dataset.deskId;
  const toSeatIndex = parseInt(e.currentTarget.dataset.seatIndex);
  const { studentId, fromDeskId, fromSeatIndex } = dragState;

  const toDesk = window.appState.desks.find(d => d.id === toDeskId);
  if (!toDesk) return;

  const targetStudentId = toDesk.students[toSeatIndex];

  // Swap or move
  if (fromDeskId) {
    const fromDesk = window.appState.desks.find(d => d.id === fromDeskId);
    if (fromDesk) {
      // Swap
      fromDesk.students[fromSeatIndex] = targetStudentId || null;
    }
  }
  toDesk.students[toSeatIndex] = studentId;

  saveState();
  renderAll();
}

function onPoolDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("pool-over");
}

function onPoolDragLeave(e) {
  e.currentTarget.classList.remove("pool-over");
}

function onPoolDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("pool-over");
  if (!dragState) return;

  const { studentId, fromDeskId, fromSeatIndex } = dragState;
  if (fromDeskId && fromSeatIndex !== null) {
    const fromDesk = window.appState.desks.find(d => d.id === fromDeskId);
    if (fromDesk) {
      fromDesk.students[fromSeatIndex] = null;
      saveState();
      renderAll();
    }
  }
}

// ═══════════════════════════════════════════
//  GESTIÓN DE PUPITRES
// ═══════════════════════════════════════════
function addDesk() {
  // Determine which column has fewest desks, or default col 1
  const cols = {};
  window.appState.desks.forEach(d => { cols[d.col] = (cols[d.col] || 0) + 1; });
  const maxCol = Math.max(...window.appState.desks.map(d => d.col), 4);
  let targetCol = 1;
  let minCount = Infinity;
  for (let c = 1; c <= maxCol; c++) {
    if ((cols[c] || 0) < minCount) { minCount = cols[c] || 0; targetCol = c; }
  }

  const rows = window.appState.desks.filter(d => d.col === targetCol).map(d => d.row);
  const nextRow = rows.length ? Math.max(...rows) + 1 : 1;

  const newDesk = {
    id: `d${window.appState.nextDeskId++}`,
    col: targetCol,
    row: nextRow,
    students: [null, null]
  };

  window.appState.desks.push(newDesk);
  saveState();
  renderAll();
  showToast(`✓ Pupitre añadido en Columna ${targetCol}`);
}

function deleteDesk(deskId) {
  const idx = window.appState.desks.findIndex(d => d.id === deskId);
  if (idx === -1) return;
  window.appState.desks.splice(idx, 1);
  saveState();
  renderAll();
  showToast("Pupitre eliminado");
}

function reorderDesksFromDOM() {
  // After drag reorder of desks in columns, update col/row in state
  document.querySelectorAll(".desk-column").forEach(colEl => {
    const colNum = parseInt(colEl.dataset.col);
    const deskEls = colEl.querySelectorAll(".desk-card");
    deskEls.forEach((el, rowIdx) => {
      const deskId = el.dataset.deskId;
      const desk = window.appState.desks.find(d => d.id === deskId);
      if (desk) {
        desk.col = colNum;
        desk.row = rowIdx + 1;
      }
    });
  });
}

// ═══════════════════════════════════════════
//  FULLSCREEN
// ═══════════════════════════════════════════
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("fullscreenchange", () => {
  const icon = document.getElementById("iconFullscreen");
  if (document.fullscreenElement) {
    icon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`;
  } else {
    icon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
  }
});

// ═══════════════════════════════════════════
//  BIND EVENTS
// ═══════════════════════════════════════════
function bindEvents() {
  document.getElementById("btnFullscreen").addEventListener("click", toggleFullscreen);
  document.getElementById("btnAddDesk").addEventListener("click", addDesk);
  document.getElementById("btnRestore").addEventListener("click", () => {
    document.getElementById("modalRestore").classList.remove("hidden");
  });
  document.getElementById("modalCancelRestore").addEventListener("click", () => {
    document.getElementById("modalRestore").classList.add("hidden");
  });
  document.getElementById("modalConfirmRestore").addEventListener("click", () => {
    document.getElementById("modalRestore").classList.add("hidden");
    restoreDefault();
  });
  document.getElementById("btnExportPdf").addEventListener("click", exportPDF);
  document.getElementById("btnExportTxt").addEventListener("click", exportTXT);

  // Close modal on overlay click
  document.getElementById("modalRestore").addEventListener("click", function(e) {
    if (e.target === this) this.classList.add("hidden");
  });
}

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getStudentById(id) {
  return STUDENTS_DATA.all.find(s => s.id === id) || { full: "Desconocido", id };
}

// shortName() is defined in students.js — uses the "short" field per student

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return (parts[0][0] + (parts[2] ? parts[2][0] : parts[1][0])).toUpperCase();
}

let statusTimer = null;
function showStatus(msg) {
  const el = document.getElementById("statusMsg");
  el.textContent = "✓ " + msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    el.textContent = "✓ Todo guardado";
  }, 3000);
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2500);
}
