# ClassSeat Pro 🏫
**Organizador Inteligente de Asientos Escolares**  
*Creado por Kabert Studio - LMKE*

---

## ¿Cómo abrir la app?

1. Descarga o clona este repositorio.
2. Abre el archivo `index.html` directamente en tu navegador (Chrome, Firefox, Edge, Safari).
3. ¡Listo! No requiere instalación ni servidor.

> **Nota:** Para algunas funciones (fuentes de Google) necesitarás conexión a internet la primera vez. Después funciona offline gracias a localStorage.

---

## Estructura del proyecto

```
seat-organizer/
├── index.html      → Estructura principal de la app
├── styles.css      → Estilos visuales (CSS3)
├── script.js       → Lógica principal (ES6)
├── students.js     → Base de datos de estudiantes y distribución inicial
├── export.js       → Funciones de exportación PDF y TXT
└── README.md       → Este archivo
```

---

## ¿Cómo modificar estudiantes?

Abre el archivo `students.js` y edita los arrays:

### Añadir un estudiante nuevo:
```js
{ id: "s99", full: "Nombre Completo Apellido Apellido" },
```

### Cambiar la distribución inicial de pupitres:
Edita el array `INITIAL_DESKS`. Cada pupitre tiene esta estructura:
```js
{ id: "d01", col: 1, row: 1, students: ["s01", "s02"] }
```
- `col`: columna (1–4)
- `row`: fila dentro de la columna
- `students`: array de dos IDs (o `null` si el asiento está vacío)

---

## ¿Cómo se muestran los nombres?

Los nombres se muestran abreviados en los pupitres:  
**Nombre + Primer Apellido**  
Ejemplo: `Thiago André Kapa Cosme` → `Thiago Kapa`

El nombre completo se mantiene en la base de datos y aparece en exportaciones y en el tooltip al pasar el mouse.

---

## ¿Cómo exportar datos?

### PDF
1. Haz clic en el botón **PDF** en el encabezado.
2. Se descargará un archivo `ClassSeatPro_6toSecundaria_YYYYMMDD.pdf`.

### TXT
1. Haz clic en el botón **TXT** en el encabezado.
2. Se descargará un archivo de texto plano con la distribución actual.

Ambos exportados incluyen:
- Título: ClassSeat Pro
- Curso: 6to de Secundaria
- Fecha y hora automática
- Distribución por columnas
- Estudiantes sin asignar (si los hay)
- Firma: Kabert Studio - LMKE

---

## Funcionalidades

| Función | Descripción |
|---|---|
| 🗺️ Mapa visual | Vista del aula con pizarra, pupitres y puerta |
| 🖱️ Drag & Drop estudiantes | Arrastra estudiantes entre asientos |
| 🖱️ Drag & Drop pupitres | Reordena pupitres dentro de columnas |
| ➕ Añadir pupitre | Añade un nuevo pupitre vacío |
| ❌ Eliminar pupitre | Elimina pupitres (hover → botón ×) |
| 💾 Guardado automático | Todos los cambios se guardan en localStorage |
| 🔄 Restaurar distribución | Vuelve a la distribución original |
| 📄 Exportar PDF | Exporta la distribución actual como PDF |
| 📝 Exportar TXT | Exporta la distribución actual como texto |
| ⛶ Pantalla completa | Para usar como proyector en clase |

---

## ¿Cómo subir a GitHub Pages?

1. Crea un repositorio en GitHub.
2. Sube todos los archivos del proyecto.
3. Ve a **Settings → Pages**.
4. En "Source" selecciona la rama `main` y carpeta `/root`.
5. Haz clic en **Save**.
6. Tu app estará disponible en `https://tuusuario.github.io/nombre-repo/`.

---

## Tecnologías usadas

- **HTML5** – Estructura semántica
- **CSS3** – Diseño moderno con variables, animaciones y responsive
- **JavaScript ES6** – Lógica modular y limpia
- **SortableJS** – Drag & drop de pupitres (CDN)
- **jsPDF** – Exportación PDF (CDN)
- **Google Fonts** – Tipografía Outfit

---

*ClassSeat Pro © 2024 · Kabert Studio - LMKE*
