/**
 * script.js — ClassSeat Pro
 * Guardado: GitHub API (commits a data/seats.json) + localStorage como caché local.
 *
 * Flujo:
 *  1. Al iniciar: carga config GitHub de localStorage.
 *  2. Si hay config → descarga data/seats.json del repo como estado principal.
 *  3. Cada cambio → hace commit a GitHub automáticamente (debounced 1.5 s).
 *  4. Sin config → funciona solo con localStorage como antes.
 */

// ═══════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ═══════════════════════════════════════════════════════
window.appState = {
  desks: [],
  nextDeskId: 100,
};

// Claves de localStorage
const LS_STATE  = "classseat_pro_v2";      // estado de los pupitres
const LS_GH     = "classseat_github_cfg";  // config de GitHub

// Config de GitHub (se llena desde localStorage o el modal)
let ghConfig = null;   // { repo, branch, token }
let ghFileSha = null;  // SHA del archivo actual en GitHub (necesario para actualizarlo)

// Debounce timer para no hacer un commit por cada micro-cambio
let saveTimer = null;

// ═══════════════════════════════════════════════════════
//  SPLASH → INIT
// ═══════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const app    = document.getElementById("app");

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

async function initApp() {
  // 1. Cargar config de GitHub desde localStorage
  const savedCfg = localStorage.getItem(LS_GH);
  if (savedCfg) {
    try { ghConfig = JSON.parse(savedCfg); } catch (_) { ghConfig = null; }
  }

  // 2. Cargar estado
  if (ghConfig) {
    updateGhStatusUI(true);
    await loadFromGitHub();
  } else {
    updateGhStatusUI(false);
    loadFromLocalStorage();
  }

  renderAll();
  bindEvents();
}

// ═══════════════════════════════════════════════════════
//  CARGA DE ESTADO
// ═══════════════════════════════════════════════════════

/** Carga desde localStorage (fallback sin GitHub) */
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(LS_STATE);
    if (saved) {
      const p = JSON.parse(saved);
      window.appState.desks       = p.desks       || deepClone(INITIAL_DESKS);
      window.appState.nextDeskId  = p.nextDeskId  || 100;
    } else {
      window.appState.desks = deepClone(INITIAL_DESKS);
    }
  } catch (_) {
    window.appState.desks = deepClone(INITIAL_DESKS);
  }
}

/** Descarga data/seats.json desde el repo GitHub */
async function loadFromGitHub() {
  showSyncing("Conectando con GitHub…");
  try {
    const { repo, branch, token } = ghConfig;
    const url = `https://api.github.com/repos/${repo}/contents/data/seats.json?ref=${branch || "main"}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      }
    });

    if (res.status === 404) {
      // El archivo no existe todavía → usar distribución por defecto y crear el archivo
      window.appState.desks = deepClone(INITIAL_DESKS);
      ghFileSha = null;
      showStatus("GitHub conectado · primer uso, creando archivo…");
      await commitToGitHub(false); // silent
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    ghFileSha = data.sha;

    const decoded = JSON.parse(atob(data.content.replace(/\n/g, "")));
    window.appState.desks      = decoded.desks      || deepClone(INITIAL_DESKS);
    window.appState.nextDeskId = decoded.nextDeskId || 100;

    showStatus("✓ Sincronizado con GitHub");
  } catch (e) {
    console.warn("Error al cargar desde GitHub:", e.message);
    showStatus("⚠ Sin conexión a GitHub, cargando local…");
    loadFromLocalStorage();
  }
}

// ═══════════════════════════════════════════════════════
//  GUARDADO
// ═══════════════════════════════════════════════════════

/**
 * Punto de entrada principal para guardar.
 * Siempre guarda en localStorage de inmediato,
 * y hace commit a GitHub con debounce de 1.5 s.
 */
function saveState() {
  // 1. Guardar en localStorage siempre (caché local instantánea)
  localStorage.setItem(LS_STATE, JSON.stringify({
    desks:      window.appState.desks,
    nextDeskId: window.appState.nextDeskId,
  }));

  if (ghConfig) {
    // 2. Debounce: esperar 1.5 s sin cambios antes de hacer el commit
    clearTimeout(saveTimer);
    showStatus("Guardando…");
    document.getElementById("syncSpinner").classList.remove("hidden");
    saveTimer = setTimeout(() => commitToGitHub(true), 1500);
  } else {
    showStatus("✓ Guardado localmente");
  }
}

/**
 * Hace un commit del estado actual a data/seats.json en GitHub.
 * @param {boolean} notify - Mostrar toast al terminar
 */
async function commitToGitHub(notify = true) {
  if (!ghConfig) return;

  const { repo, branch, token } = ghConfig;
  const content = {
    desks:      window.appState.desks,
    nextDeskId: window.appState.nextDeskId,
    savedAt:    new Date().toISOString(),
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

  const body = {
    message: `ClassSeat Pro: actualización de asientos ${new Date().toLocaleString("es-BO")}`,
    content: encoded,
    branch:  branch || "main",
  };
  if (ghFileSha) body.sha = ghFileSha; // actualizar archivo existente

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/seats.json`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    ghFileSha = data.content.sha; // actualizar SHA para el próximo commit
    document.getElementById("syncSpinner").classList.add("hidden");
    showStatus("✓ Guardado en GitHub");
    if (notify) showToast("✓ Guardado en GitHub");

  } catch (e) {
    document.getElementById("syncSpinner").classList.add("hidden");
    showStatus("⚠ Error al guardar en GitHub");
    console.error("GitHub commit error:", e.message);
    if (notify) showToast("⚠ Error al guardar: " + e.message);
  }
}

// ═══════════════════════════════════════════════════════
//  RESTAURAR
// ═══════════════════════════════════════════════════════
function restoreDefault() {
  window.appState.desks      = deepClone(INITIAL_DESKS);
  window.appState.nextDeskId = 100;
  ghFileSha = null;
  saveState();
  renderAll();
  showToast("✓ Distribución original restaurada");
}

// ═══════════════════════════════════════════════════════
//  GITHUB CONFIG MODAL
// ═══════════════════════════════════════════════════════

function openGithubModal() {
  const modal = document.getElementById("modalGithub");
  const errEl = document.getElementById("ghError");
  const disconnWrap = document.getElementById("ghDisconnectWrap");

  // Rellenar campos si ya hay config guardada
  if (ghConfig) {
    document.getElementById("ghRepo").value   = ghConfig.repo   || "";
    document.getElementById("ghBranch").value = ghConfig.branch || "";
    document.getElementById("ghToken").value  = ghConfig.token  || "";
    disconnWrap.classList.remove("hidden");
  } else {
    document.getElementById("ghRepo").value   = "";
    document.getElementById("ghBranch").value = "";
    document.getElementById("ghToken").value  = "";
    disconnWrap.classList.add("hidden");
  }

  errEl.classList.add("hidden");
  errEl.textContent = "";
  modal.classList.remove("hidden");
}

async function saveGithubConfig() {
  const repo   = document.getElementById("ghRepo").value.trim();
  const branch = document.getElementById("ghBranch").value.trim() || "main";
  const token  = document.getElementById("ghToken").value.trim();
  const errEl  = document.getElementById("ghError");
  const btn    = document.getElementById("modalSaveGithub");

  errEl.classList.add("hidden");
  errEl.textContent = "";

  // Validación básica
  if (!repo || !repo.includes("/")) {
    showGhError("El repositorio debe tener el formato usuario/nombre-repo");
    return;
  }
  if (!token) {
    showGhError("Debes ingresar tu token PAT de GitHub");
    return;
  }

  // Verificar token y repo con la API
  btn.disabled = true;
  btn.textContent = "Verificando…";

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      }
    });

    if (res.status === 401) throw new Error("Token inválido o expirado. Verifica que tenga permiso 'repo'.");
    if (res.status === 404) throw new Error("Repositorio no encontrado. Verifica el nombre y que el token tenga acceso.");
    if (!res.ok) throw new Error(`Error de GitHub: HTTP ${res.status}`);

    // Todo bien → guardar config
    ghConfig = { repo, branch, token };
    localStorage.setItem(LS_GH, JSON.stringify(ghConfig));

    document.getElementById("modalGithub").classList.add("hidden");
    updateGhStatusUI(true);

    // Cargar estado desde GitHub (puede sobreescribir el local)
    await loadFromGitHub();
    renderAll();
    showToast("✓ GitHub conectado correctamente");

  } catch (e) {
    showGhError(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
      Conectar y verificar`;
  }
}

function disconnectGithub() {
  ghConfig  = null;
  ghFileSha = null;
  localStorage.removeItem(LS_GH);
  document.getElementById("modalGithub").classList.add("hidden");
  updateGhStatusUI(false);
  showToast("GitHub desconectado. Los cambios se guardarán solo localmente.");
}

function showGhError(msg) {
  const el = document.getElementById("ghError");
  el.textContent = "⚠ " + msg;
  el.classList.remove("hidden");
}

/** Actualiza el botón de estado de GitHub en el header */
function updateGhStatusUI(connected) {
  const label = document.getElementById("ghStatusLabel");
  const dot   = document.getElementById("ghDot");
  const btn   = document.getElementById("btnGithub");

  if (connected && ghConfig) {
    label.textContent = ghConfig.repo.split("/")[1] || ghConfig.repo;
    dot.classList.add("dot-connected");
    dot.classList.remove("dot-disconnected");
    btn.classList.add("gh-connected");
  } else {
    label.textContent = "Conectar GitHub";
    dot.classList.remove("dot-connected");
    dot.classList.add("dot-disconnected");
    btn.classList.remove("gh-connected");
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════
function renderAll() {
  renderDesks();
  renderUnassigned();
}

function renderDesks() {
  const grid = document.getElementById("deskGrid");
  grid.innerHTML = "";

  const cols = {};
  window.appState.desks.forEach(d => {
    if (!cols[d.col]) cols[d.col] = [];
    cols[d.col].push(d);
  });

  Object.keys(cols).map(Number).sort((a, b) => a - b).forEach(colNum => {
    const colEl = document.createElement("div");
    colEl.className = "desk-column";
    colEl.dataset.col = colNum;

    const label = document.createElement("div");
    label.className = "col-label";
    label.textContent = `Col. ${colNum}`;
    colEl.appendChild(label);

    cols[colNum].slice().sort((a, b) => a.row - b.row).forEach(desk => {
      colEl.appendChild(createDeskEl(desk));
    });

    grid.appendChild(colEl);
  });

  document.querySelectorAll(".desk-column").forEach(col => {
    Sortable.create(col, {
      group: "desks",
      animation: 180,
      handle: ".desk-drag-handle",
      filter: ".col-label",
      ghostClass: "desk-ghost",
      chosenClass: "desk-chosen",
      onEnd() {
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

  const handle = document.createElement("div");
  handle.className = "desk-drag-handle";
  handle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
  el.appendChild(handle);

  const body = document.createElement("div");
  body.className = "desk-body";
  body.appendChild(createSeatEl(desk, 0));
  const div = document.createElement("div");
  div.className = "desk-divider";
  body.appendChild(div);
  body.appendChild(createSeatEl(desk, 1));
  el.appendChild(body);

  const del = document.createElement("button");
  del.className = "desk-delete-btn";
  del.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  del.addEventListener("click", () => deleteDesk(desk.id));
  el.appendChild(del);

  return el;
}

function createSeatEl(desk, seatIndex) {
  const studentId = desk.students[seatIndex];
  const student   = studentId ? getStudentById(studentId) : null;

  const seat = document.createElement("div");
  seat.className = "desk-seat" + (student ? "" : " empty");
  seat.dataset.deskId     = desk.id;
  seat.dataset.seatIndex  = seatIndex;

  if (student) {
    const avatar = document.createElement("div");
    avatar.className = "seat-avatar";
    avatar.textContent = getInitials(student.full);
    seat.appendChild(avatar);

    const name = document.createElement("span");
    name.className = "seat-name";
    name.textContent = shortName(student.full, student.id);
    name.title = student.full;
    seat.appendChild(name);

    seat.draggable = true;
    seat.dataset.studentId = studentId;
    seat.addEventListener("dragstart", onStudentDragStart);
    seat.addEventListener("dragend",   onStudentDragEnd);
  } else {
    seat.innerHTML = `<span class="empty-slot">+</span>`;
  }

  seat.addEventListener("dragover",  onSeatDragOver);
  seat.addEventListener("dragleave", onSeatDragLeave);
  seat.addEventListener("drop",      onSeatDrop);

  return seat;
}

function renderUnassigned() {
  const pool    = document.getElementById("unassignedPool");
  const section = document.getElementById("unassignedSection");
  pool.innerHTML = "";

  const assigned   = new Set(window.appState.desks.flatMap(d => d.students.filter(Boolean)));
  const unassigned = STUDENTS_DATA.all.filter(s => !assigned.has(s.id));

  if (!unassigned.length) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");

  unassigned.forEach(student => {
    const chip = document.createElement("div");
    chip.className = "student-chip";
    chip.draggable = true;
    chip.dataset.studentId = student.id;
    chip.title = student.full;
    chip.innerHTML = `
      <div class="chip-avatar">${getInitials(student.full)}</div>
      <span>${shortName(student.full, student.id)}</span>`;
    chip.addEventListener("dragstart", onStudentDragStart);
    chip.addEventListener("dragend",   onStudentDragEnd);
    pool.appendChild(chip);
  });

  pool.addEventListener("dragover",  onPoolDragOver);
  pool.addEventListener("dragleave", onPoolDragLeave);
  pool.addEventListener("drop",      onPoolDrop);
}

// ═══════════════════════════════════════════════════════
//  DRAG & DROP
// ═══════════════════════════════════════════════════════
let dragState = null;

function onStudentDragStart(e) {
  dragState = {
    studentId:     e.currentTarget.dataset.studentId,
    fromDeskId:    e.currentTarget.dataset.deskId,
    fromSeatIndex: e.currentTarget.dataset.seatIndex !== undefined
                    ? parseInt(e.currentTarget.dataset.seatIndex) : null,
  };
  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragState.studentId);
}

function onStudentDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".seat-over, .pool-over").forEach(el =>
    el.classList.remove("seat-over", "pool-over"));
  dragState = null;
}

function onSeatDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add("seat-over"); }
function onSeatDragLeave(e) { e.currentTarget.classList.remove("seat-over"); }

function onSeatDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("seat-over");
  if (!dragState) return;

  const toDeskId    = e.currentTarget.dataset.deskId;
  const toSeatIndex = parseInt(e.currentTarget.dataset.seatIndex);
  const { studentId, fromDeskId, fromSeatIndex } = dragState;

  const toDesk = window.appState.desks.find(d => d.id === toDeskId);
  if (!toDesk) return;

  const targetStudentId = toDesk.students[toSeatIndex];

  if (fromDeskId) {
    const fromDesk = window.appState.desks.find(d => d.id === fromDeskId);
    if (fromDesk) fromDesk.students[fromSeatIndex] = targetStudentId || null;
  }
  toDesk.students[toSeatIndex] = studentId;

  saveState();
  renderAll();
}

function onPoolDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add("pool-over"); }
function onPoolDragLeave(e) { e.currentTarget.classList.remove("pool-over"); }

function onPoolDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("pool-over");
  if (!dragState) return;
  const { fromDeskId, fromSeatIndex } = dragState;
  if (fromDeskId && fromSeatIndex !== null) {
    const fromDesk = window.appState.desks.find(d => d.id === fromDeskId);
    if (fromDesk) {
      fromDesk.students[fromSeatIndex] = null;
      saveState();
      renderAll();
    }
  }
}

// ═══════════════════════════════════════════════════════
//  PUPITRES
// ═══════════════════════════════════════════════════════
function addDesk() {
  const cols = {};
  window.appState.desks.forEach(d => { cols[d.col] = (cols[d.col] || 0) + 1; });
  const maxCol = Math.max(...window.appState.desks.map(d => d.col), 4);
  let targetCol = 1, minCount = Infinity;
  for (let c = 1; c <= maxCol; c++) {
    if ((cols[c] || 0) < minCount) { minCount = cols[c] || 0; targetCol = c; }
  }
  const rows   = window.appState.desks.filter(d => d.col === targetCol).map(d => d.row);
  const newRow = rows.length ? Math.max(...rows) + 1 : 1;
  window.appState.desks.push({
    id: `d${window.appState.nextDeskId++}`,
    col: targetCol, row: newRow, students: [null, null]
  });
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
  document.querySelectorAll(".desk-column").forEach(colEl => {
    const colNum = parseInt(colEl.dataset.col);
    colEl.querySelectorAll(".desk-card").forEach((el, rowIdx) => {
      const desk = window.appState.desks.find(d => d.id === el.dataset.deskId);
      if (desk) { desk.col = colNum; desk.row = rowIdx + 1; }
    });
  });
}

// ═══════════════════════════════════════════════════════
//  FULLSCREEN
// ═══════════════════════════════════════════════════════
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}
document.addEventListener("fullscreenchange", () => {
  const icon = document.getElementById("iconFullscreen");
  icon.innerHTML = document.fullscreenElement
    ? `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`
    : `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
});

// ═══════════════════════════════════════════════════════
//  BIND EVENTS
// ═══════════════════════════════════════════════════════
function bindEvents() {
  document.getElementById("btnFullscreen").addEventListener("click", toggleFullscreen);
  document.getElementById("btnAddDesk").addEventListener("click", addDesk);

  document.getElementById("btnGithub").addEventListener("click", openGithubModal);
  document.getElementById("modalCancelGithub").addEventListener("click", () => {
    document.getElementById("modalGithub").classList.add("hidden");
  });
  document.getElementById("modalSaveGithub").addEventListener("click", saveGithubConfig);
  document.getElementById("btnDisconnect").addEventListener("click", disconnectGithub);
  document.getElementById("btnToggleToken").addEventListener("click", () => {
    const inp  = document.getElementById("ghToken");
    const icon = document.getElementById("eyeIcon");
    const show = inp.type === "password";
    inp.type   = show ? "text" : "password";
    icon.innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  document.getElementById("modalGithub").addEventListener("click", function(e) {
    if (e.target === this) this.classList.add("hidden");
  });

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
  document.getElementById("modalRestore").addEventListener("click", function(e) {
    if (e.target === this) this.classList.add("hidden");
  });

  document.getElementById("btnExportPdf").addEventListener("click", exportPDF);
  document.getElementById("btnExportTxt").addEventListener("click", exportTXT);
}

// ═══════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function getStudentById(id) {
  return STUDENTS_DATA.all.find(s => s.id === id) || { full: "Desconocido", id };
}

// shortName() está definida en students.js
function getInitials(fullName) {
  const p = fullName.trim().split(/\s+/);
  return (p[0][0] + (p[2] ? p[2][0] : p[1][0])).toUpperCase();
}

let statusTimer = null;
function showStatus(msg) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  clearTimeout(statusTimer);
  if (!msg.startsWith("Guardando") && !msg.startsWith("Conect")) {
    statusTimer = setTimeout(() => { el.textContent = "✓ Todo al día"; }, 5000);
  }
}

function showSyncing(msg) {
  document.getElementById("syncSpinner").classList.remove("hidden");
  showStatus(msg);
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
  }, 2800);
}
