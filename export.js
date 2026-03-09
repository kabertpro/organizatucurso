/**
 * export.js
 * Funciones para exportar la organización a PDF y TXT.
 * Depende de: jsPDF (CDN), students.js, y el estado actual de la app (window.appState).
 */

/**
 * Genera el contenido de texto de la organización actual.
 * @returns {string} Texto plano con la distribución.
 */
function generateTextContent() {
  const state = window.appState;
  const now = new Date();
  const fecha = now.toLocaleDateString("es-BO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const hora = now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  let txt = "";
  txt += "════════════════════════════════════════\n";
  txt += "   ClassSeat Pro – Organización de Asientos\n";
  txt += "   6to de Secundaria\n";
  txt += `   ${fecha} – ${hora}\n`;
  txt += "════════════════════════════════════════\n\n";

  // Agrupar por columnas
  const cols = {};
  state.desks.forEach(desk => {
    if (!cols[desk.col]) cols[desk.col] = [];
    cols[desk.col].push(desk);
  });

  Object.keys(cols).sort((a, b) => a - b).forEach(colNum => {
    txt += `COLUMNA ${colNum}\n`;
    txt += "─────────────────────────\n";
    const sorted = cols[colNum].slice().sort((a, b) => a.row - b.row);
    sorted.forEach((desk, i) => {
      const left = desk.students[0] ? getStudentById(desk.students[0]).full : "(vacío)";
      const right = desk.students[1] ? getStudentById(desk.students[1]).full : "(vacío)";
      txt += `  Pupitre ${i + 1}: ${left} | ${right}\n`;
    });
    txt += "\n";
  });

  // Unassigned
  const assigned = new Set(state.desks.flatMap(d => d.students.filter(Boolean)));
  const unassigned = STUDENTS_DATA.all.filter(s => !assigned.has(s.id));
  if (unassigned.length > 0) {
    txt += "SIN ASIGNAR\n";
    txt += "─────────────────────────\n";
    unassigned.forEach(s => { txt += `  • ${s.full}\n`; });
    txt += "\n";
  }

  txt += "════════════════════════════════════════\n";
  txt += "   Creado por Kabert Studio - LMKE\n";
  txt += "════════════════════════════════════════\n";

  return txt;
}

/**
 * Exporta la organización como archivo .txt
 */
function exportTXT() {
  const content = generateTextContent();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ClassSeatPro_6toSecundaria_${formatDateFile()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta la organización como archivo .pdf usando jsPDF
 */
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const now = new Date();
  const fecha = now.toLocaleDateString("es-BO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const hora = now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  const state = window.appState;
  const margin = 18;
  let y = margin;

  // ── Header ──
  // Background rect
  doc.setFillColor(14, 116, 144); // cyan-700
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ClassSeat Pro", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Organización de Asientos – 6to de Secundaria", margin, 24);
  doc.setFontSize(9);
  doc.text(`${fecha}  ·  ${hora}`, margin, 31);

  y = 46;

  // ── Columns ──
  const cols = {};
  state.desks.forEach(desk => {
    if (!cols[desk.col]) cols[desk.col] = [];
    cols[desk.col].push(desk);
  });

  const colNums = Object.keys(cols).sort((a, b) => a - b);
  const colWidth = (210 - margin * 2) / colNums.length;

  // Column headers
  colNums.forEach((colNum, idx) => {
    const x = margin + idx * colWidth;
    doc.setFillColor(224, 242, 254); // light blue
    doc.roundedRect(x + 1, y, colWidth - 2, 8, 2, 2, "F");
    doc.setTextColor(14, 116, 144);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Columna ${colNum}`, x + colWidth / 2, y + 5.5, { align: "center" });
  });

  y += 11;

  // Find max rows
  const maxRows = Math.max(...colNums.map(c => cols[c].length));

  for (let row = 0; row < maxRows; row++) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    colNums.forEach((colNum, idx) => {
      const x = margin + idx * colWidth;
      const sorted = cols[colNum].slice().sort((a, b) => a.row - b.row);
      const desk = sorted[row];

      if (!desk) return;

      const left = desk.students[0] ? shortName(getStudentById(desk.students[0]).full, desk.students[0]) : "—";
      const right = desk.students[1] ? shortName(getStudentById(desk.students[1]).full, desk.students[1]) : "—";

      // Desk card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x + 1, y, colWidth - 2, 16, 2, 2, "FD");

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.line(x + colWidth / 2, y + 2, x + colWidth / 2, y + 14);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + "…" : str;
      doc.text(truncate(left, 18), x + colWidth / 4, y + 6, { align: "center" });
      doc.text(truncate(right, 18), x + colWidth * 3 / 4, y + 6, { align: "center" });

      // Row number
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(`F${row + 1}`, x + colWidth / 2, y + 13, { align: "center" });
    });

    y += 18;
  }

  // ── Unassigned ──
  const assigned = new Set(state.desks.flatMap(d => d.students.filter(Boolean)));
  const unassigned = STUDENTS_DATA.all.filter(s => !assigned.has(s.id));

  if (unassigned.length > 0) {
    if (y > 260) { doc.addPage(); y = margin; }
    y += 6;
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margin, y, 210 - margin * 2, 8, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("Estudiantes sin asignar", margin + 4, y + 5.5);
    y += 11;

    unassigned.forEach(s => {
      if (y > 278) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 60);
      doc.text(`• ${s.full}`, margin + 4, y);
      y += 6;
    });
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 287, 210, 10, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Creado por Kabert Studio - LMKE  ·  ClassSeat Pro", margin, 293);
    doc.text(`Pág. ${i} / ${pageCount}`, 210 - margin, 293, { align: "right" });
  }

  doc.save(`ClassSeatPro_6toSecundaria_${formatDateFile()}.pdf`);
}

function formatDateFile() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function getStudentById(id) {
  return STUDENTS_DATA.all.find(s => s.id === id) || { full: "Desconocido", id };
}
