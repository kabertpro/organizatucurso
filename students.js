/**
 * students.js
 * Base de datos de estudiantes y distribución inicial de pupitres.
 *
 * Cada estudiante tiene:
 *   id    → identificador único (no cambiar)
 *   full  → nombre completo (para exportaciones y tooltip)
 *   short → nombre corto que se muestra en el pupitre (EDITABLE libremente)
 *
 * Para cambiar cómo se muestra un nombre en el pupitre,
 * simplemente edita el campo "short" de ese estudiante.
 */

const STUDENTS_DATA = {
  all: [
    // ── Columna 1 ──
    { id: "s01", full: "Thiago André Kapa Cosme",          short: "Thiago Kapa" },
    { id: "s02", full: "Heiddy Bolivia Ocampo Velarde",    short: "Heiddy Ocampo" },
    { id: "s03", full: "Daniel Alfredo Ayala Heredia",     short: "Daniel Ayala" },
    { id: "s04", full: "Adriana Camila Inarra Condorcet",  short: "Adriana Inarra" },
    { id: "s05", full: "María José Mercado Archondo",      short: "María Mercado" },
    { id: "s06", full: "Óscar Peralta Escobar",            short: "Óscar Peralta" },
    { id: "s07", full: "Joaquín Augusto Gutierrez Linares",short: "Joaquín Gutierrez" },
    // ── Columna 2 ──
    { id: "s08", full: "Susana Irma Quispe Calderón",      short: "Susana Quispe" },
    { id: "s09", full: "Ivana Agustina Vargas Guerra",     short: "Ivana Vargas" },
    { id: "s10", full: "Nicole Britany Coarita Salazar",   short: "Nicole Coarita" },
    { id: "s11", full: "Camila Escobar Soliz",             short: "Camila Escobar" },
    { id: "s12", full: "Luciana Milenka Soliz Perales",    short: "Luciana Soliz" },
    { id: "s13", full: "Abril Alejandra Huañapaco Torrez", short: "Abril Huañapaco" },
    { id: "s14", full: "Natalia Milenka Soliz Perales",    short: "Natalia Soliz" },
    { id: "s15", full: "Brizeyda Samantha Prieto Calderón",short: "Brizeyda Prieto" },
    { id: "s16", full: "Mateo Andres Chavarria Camacho",   short: "Mateo Chavarria" },
    { id: "s17", full: "Mauricio Adriel Ramirez Santa Maria", short: "Mauricio Ramirez" },
    { id: "s18", full: "Zeus Javier Méndez Aliaga",        short: "Zeus Méndez" },
    { id: "s19", full: "Alex Orlando Fernandez Montealegre", short: "Alex Fernandez" },
    // ── Columna 3 ──
    { id: "s20", full: "Brissa Nicole Flores Conde",       short: "Brissa Flores" },
    { id: "s21", full: "Solangel Fabiana Villanueva Conde",short: "Solangel Villanueva" },
    { id: "s22", full: "Camila Milagros Bolivia Zelada Espejo", short: "Camila Zelada" },
    { id: "s23", full: "Liliana López Jiménez",            short: "Liliana López" },
    { id: "s24", full: "Malaika Mirian Medina Iriondo",    short: "Malaika Medina" },
    { id: "s25", full: "José Antonio Yujra Apaza",         short: "José Yujra" },
    { id: "s26", full: "Fernando André Loayza Callisaya",  short: "Fernando Loayza" },
    { id: "s27", full: "Flavia Martina Higueras Antezana", short: "Flavia Higueras" },
    { id: "s28", full: "Damaris Dinai Zegarra Villareal",  short: "Damaris Zegarra" },
    { id: "s29", full: "Uriel Hugo Méndez Aliaga",         short: "Uriel Méndez" },
    { id: "s30", full: "Fedra Salome Mariscal Mollinedo",  short: "Fedra Mariscal" },
    { id: "s31", full: "Jade Abigail Saldias Ergueta",     short: "Jade Saldias" },
    { id: "s32", full: "Brissa Luciana Lopez Castellon",   short: "Brissa Lopez" },
    // ── Columna 4 ──
    { id: "s33", full: "Ezequiel Víctor Morales Álvarez",  short: "Ezequiel Morales" },
    { id: "s34", full: "Agustín Andaveris Barrientos",     short: "Agustín Andaveris" },
    { id: "s35", full: "Bianca Antonela Valenzuela Bejar", short: "Bianca Valenzuela" },
    { id: "s36", full: "Adriana Valeria Holguin Aliaga",   short: "Adriana Holguin" },
    { id: "s37", full: "Catalina Trinidad Mamani Campana", short: "Catalina Mamani" },
    { id: "s38", full: "Britany Cristel Condori Morales",  short: "Britany Condori" },
    { id: "s39", full: "María Celeste Huayraña Balajar",   short: "María Huayraña" },
    { id: "s40", full: "Verenice Yesmin Peñaranda Antonio",short: "Verenice Peñaranda" },
  ]
};

/**
 * Devuelve el nombre corto para mostrar en el pupitre.
 * Usa el campo "short" si existe; si no, intenta nombre + primer apellido.
 */
function shortName(fullName, studentId) {
  // Si se pasa ID, buscar el campo short directamente
  if (studentId) {
    const s = STUDENTS_DATA.all.find(x => x.id === studentId);
    if (s && s.short) return s.short;
  }
  // Fallback: buscar por nombre completo
  const match = STUDENTS_DATA.all.find(x => x.full === fullName);
  if (match && match.short) return match.short;
  // Último recurso: primer nombre + primer apellido automático
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) return `${parts[0]} ${parts[parts.length - 2]}`;
  return fullName;
}

/**
 * Distribución inicial de pupitres.
 * Cada pupitre: { id, col, row, students: [id, id|null] }
 * students[0] = asiento izquierdo, students[1] = asiento derecho
 */
const INITIAL_DESKS = [
  // ── COLUMNA 1 ──
  { id: "d01", col: 1, row: 1, students: ["s01", "s02"] },
  { id: "d02", col: 1, row: 2, students: ["s03", "s04"] },
  { id: "d03", col: 1, row: 3, students: ["s05", "s06"] },
  { id: "d04", col: 1, row: 4, students: ["s07", null] },
  // ── COLUMNA 2 ──
  { id: "d05", col: 2, row: 1, students: ["s08", "s09"] },
  { id: "d06", col: 2, row: 2, students: ["s10", "s11"] },
  { id: "d07", col: 2, row: 3, students: ["s12", "s13"] },
  { id: "d08", col: 2, row: 4, students: ["s14", "s15"] },
  { id: "d09", col: 2, row: 5, students: ["s16", "s17"] },
  { id: "d10", col: 2, row: 6, students: ["s18", "s19"] },
  // ── COLUMNA 3 ──
  { id: "d11", col: 3, row: 1, students: ["s20", "s21"] },
  { id: "d12", col: 3, row: 2, students: ["s22", "s23"] },
  { id: "d13", col: 3, row: 3, students: ["s24", "s25"] },
  { id: "d14", col: 3, row: 4, students: ["s26", "s27"] },
  { id: "d15", col: 3, row: 5, students: ["s28", "s29"] },
  { id: "d16", col: 3, row: 6, students: ["s30", "s31"] },
  { id: "d17", col: 3, row: 7, students: ["s32", null] },
  // ── COLUMNA 4 ──
  { id: "d18", col: 4, row: 1, students: ["s33", "s34"] },
  { id: "d19", col: 4, row: 2, students: ["s35", "s36"] },
  { id: "d20", col: 4, row: 3, students: ["s37", "s38"] },
  { id: "d21", col: 4, row: 4, students: ["s39", "s40"] },
];
