"use strict";

/*1*/

/**
 * Genera un identificador único basado en timestamp + número aleatorio.
 * @returns {string} ID único
 */
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a un texto legible en español.
 * @param {string} iso
 * @returns {string}
 */
function formatearFecha(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]} ${anio}`;
}

/**
 * Retorna true si la fecha ISO ya pasó (es anterior a hoy).
 * @param {string} iso
 * @returns {boolean}
 */
function estaVencida(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date(new Date().toDateString());
}

/**
 * Genera las iniciales de un nombre (máx. 2 letras).
 * @param {string} nombre
 * @returns {string}
 */
function iniciales(nombre) {
  if (!nombre) return "?";
  const partes = nombre.trim().split(" ");
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Genera un color de avatar basado en el nombre usando hashing simple.
 * @param {string} nombre
 * @returns {string} Color hexadecimal
 */
function colorAvatar(nombre) {
  const colores = [
    "#4f46e5","#0ea5e9","#ec4899","#10b981",
    "#f59e0b","#8b5cf6","#ef4444","#14b8a6",
    "#f97316","#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colores[Math.abs(hash) % colores.length];
}

/**
 * Escapa caracteres HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* 2*/

// Clave raíz utilizada en LocalStorage
const LS_KEY = "gestorpro_v1";

/**
 * Carga el estado completo de la aplicación desde LocalStorage.
 * Si no existe, devuelve la estructura vacía inicial.
 * @returns {{ proyectos: Array }}
 */
function cargarEstado() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("GestorPro: Error al leer LocalStorage", e);
  }
  // Estado inicial vacío
  return { proyectos: [] };
}

/**
 * Persiste el estado completo en LocalStorage.
 * @param {{ proyectos: Array }} estado
 */
function guardarEstado(estado) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(estado));
  } catch (e) {
    console.warn("GestorPro: Error al guardar en LocalStorage", e);
  }
}

// Estado global de la aplicación (cargado al iniciar)
let estado = cargarEstado();

// ID del proyecto actualmente seleccionado en la vista de detalle
let proyectoActivoId = null;

// Filtro de estado activo en el panel de tareas
let filtroTareas = "all";

// Callback guardado para confirmar eliminaciones
let callbackConfirmar = null;

/* 3 */

/**
 * Muestra la vista del dashboard y oculta la de detalle.
 */
function mostrarDashboard() {
  document.getElementById("viewDashboard").classList.add("view--active");
  document.getElementById("viewProject").classList.remove("view--active");
  proyectoActivoId = null;
  renderizarProyectos();
}

/**
 * Muestra la vista de detalle de un proyecto específico.
 * @param {string} id - ID del proyecto a mostrar
 */
function mostrarDetalleProyecto(id) {
  proyectoActivoId = id;
  const proyecto = obtenerProyecto(id);
  if (!proyecto) return;

  // Rellenar datos del proyecto en el DOM
  document.getElementById("projectDetailTitle").textContent = proyecto.nombre;
  document.getElementById("projectDetailDesc").textContent = proyecto.descripcion || "";

  // Badge de estado
  const badge = document.getElementById("projectDetailBadge");
  badge.textContent = etiquetaEstado(proyecto.estado);
  badge.className = `badge badge--${proyecto.estado}`;

  // Ocultar dashboard y mostrar detalle
  document.getElementById("viewDashboard").classList.remove("view--active");
  document.getElementById("viewProject").classList.add("view--active");

  // Activar la primera pestaña por defecto
  activarTab("members");
  filtroTareas = "all";
  actualizarFiltrosBotones();

  renderizarMiembros();
  renderizarTareas();
}

/**
 * Retorna el texto de etiqueta para un estado de proyecto.
 * @param {string} estado
 * @returns {string}
 */
function etiquetaEstado(estado) {
  const etiquetas = { active: "Activo", paused: "Pausado", finished: "Finalizado" };
  return etiquetas[estado] || estado;
}

/* 4 */

// --- Operaciones de datos ---

/**
 * Obtiene todos los proyectos del estado.
 * @returns {Array}
 */
function obtenerProyectos() {
  return estado.proyectos;
}

/**
 * Obtiene un proyecto por su ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
function obtenerProyecto(id) {
  return estado.proyectos.find(p => p.id === id);
}

/**
 * Crea un nuevo proyecto y lo guarda.
 * @param {Object} datos - { nombre, descripcion, estado, color }
 */
function crearProyecto(datos) {
  const nuevo = {
    id:          generarId(),
    nombre:      datos.nombre.trim(),
    descripcion: datos.descripcion ? datos.descripcion.trim() : "",
    estado:      datos.estado || "active",
    color:       datos.color || "#4f46e5",
    creadoEn:    new Date().toISOString(),
    miembros:    [],   // Array de { id, nombre, rol }
    tareas:      [],   // Array de { id, nombre, descripcion, estado, prioridad, asignadoA, fechaLimite }
  };
  estado.proyectos.unshift(nuevo);
  guardarEstado(estado);
  return nuevo;
}

/**
 * Actualiza los datos de un proyecto existente.
 * @param {string} id
 * @param {Object} datos
 */
function actualizarProyecto(id, datos) {
  const proyecto = obtenerProyecto(id);
  if (!proyecto) return;
  proyecto.nombre      = datos.nombre.trim();
  proyecto.descripcion = datos.descripcion ? datos.descripcion.trim() : "";
  proyecto.estado      = datos.estado;
  proyecto.color       = datos.color;
  guardarEstado(estado);
}

/**
 * Elimina un proyecto y todos sus datos.
 * @param {string} id
 */
function eliminarProyecto(id) {
  estado.proyectos = estado.proyectos.filter(p => p.id !== id);
  guardarEstado(estado);
}

// --- Renderizado ---

/**
 * Renderiza todas las tarjetas de proyectos en el dashboard,
 * aplicando el filtro de búsqueda si existe.
 */
function renderizarProyectos() {
  const grid    = document.getElementById("projectsGrid");
  const empty   = document.getElementById("emptyProjects");
  const busqueda = document.getElementById("searchProjects").value.toLowerCase().trim();

  let proyectos = obtenerProyectos();

  // Filtrar por término de búsqueda
  if (busqueda) {
    proyectos = proyectos.filter(p =>
      p.nombre.toLowerCase().includes(busqueda) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(busqueda))
    );
  }

  grid.innerHTML = "";

  if (proyectos.length === 0) {
    empty.style.display = "flex";
    return;
  }

  empty.style.display = "none";

  proyectos.forEach(proyecto => {
    const card = crearTarjetaProyecto(proyecto);
    grid.appendChild(card);
  });
}

/**
 * Crea y retorna el elemento DOM de una tarjeta de proyecto.
 * @param {Object} proyecto
 * @returns {HTMLElement}
 */
function crearTarjetaProyecto(proyecto) {
  const totalTareas     = proyecto.tareas.length;
  const tareasCompletadas = proyecto.tareas.filter(t => t.estado === "done").length;
  const totalMiembros   = proyecto.miembros.length;

  // Calcular porcentaje de progreso
  const progreso = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const card = document.createElement("article");
  card.className = "project-card";
  card.setAttribute("data-id", proyecto.id);
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Proyecto: ${proyecto.nombre}`);

  card.innerHTML = `
    <!-- Banda de color del proyecto -->
    <div class="project-card__color-bar" style="background:${escapeHtml(proyecto.color)};"></div>
    <div class="project-card__body">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem;">
        <h3 class="project-card__title">${escapeHtml(proyecto.nombre)}</h3>
        <span class="badge badge--${escapeHtml(proyecto.estado)}">${escapeHtml(etiquetaEstado(proyecto.estado))}</span>
      </div>
      <p class="project-card__desc">${escapeHtml(proyecto.descripcion || "Sin descripción")}</p>

      <!-- Barra de progreso de tareas -->
      <div style="margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--gray-500); margin-bottom:4px;">
          <span>Progreso</span>
          <span>${tareasCompletadas}/${totalTareas} tareas</span>
        </div>
        <div style="height:6px; background:var(--gray-200); border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${progreso}%; background:${escapeHtml(proyecto.color)}; border-radius:999px; transition:width 0.4s ease;"></div>
        </div>
      </div>

      <div class="project-card__footer">
        <div class="project-card__stats">
          <span class="project-card__stat">&#128101; ${totalMiembros} miembro${totalMiembros !== 1 ? "s" : ""}</span>
          <span class="project-card__stat">&#10003; ${tareasCompletadas}/${totalTareas}</span>
        </div>
        <span style="font-size:0.72rem; color:var(--gray-400);">
          ${formatearFecha(proyecto.creadoEn.split("T")[0])}
        </span>
      </div>
    </div>
  `;

  // Abrir detalle al hacer clic o presionar Enter
  function abrirDetalle() {
    mostrarDetalleProyecto(proyecto.id);
  }
  card.addEventListener("click", abrirDetalle);
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") abrirDetalle(); });

  return card;
}

// --- Modal de proyecto ---

// Variables de contexto del modal de proyecto
let modoEdicionProyecto = false;
let idProyectoEditando  = null;

// Colores disponibles para los proyectos
const COLORES_PROYECTO = [
  "#4f46e5","#7c3aed","#ec4899","#ef4444",
  "#f59e0b","#10b981","#0ea5e9","#14b8a6",
  "#f97316","#6366f1","#8b5cf6","#1d4ed8",
];

/**
 * Abre el modal para crear un nuevo proyecto.
 */
function abrirModalNuevoProyecto() {
  modoEdicionProyecto = false;
  idProyectoEditando  = null;

  document.getElementById("modalProjectTitle").textContent = "Nuevo Proyecto";
  document.getElementById("btnSaveProject").textContent   = "Crear Proyecto";
  document.getElementById("formProject").reset();
  document.getElementById("inputProjectColor").value = "#4f46e5";
  document.getElementById("errProjectName").textContent  = "";
  document.getElementById("inputProjectName").classList.remove("is-invalid");
  renderizarColorPicker("#4f46e5");
  abrirModal("modalProject");
}

/**
 * Abre el modal para editar un proyecto existente.
 * @param {string} id - ID del proyecto a editar
 */
function abrirModalEditarProyecto(id) {
  const proyecto = obtenerProyecto(id);
  if (!proyecto) return;

  modoEdicionProyecto = true;
  idProyectoEditando  = id;

  document.getElementById("modalProjectTitle").textContent     = "Editar Proyecto";
  document.getElementById("btnSaveProject").textContent        = "Guardar Cambios";
  document.getElementById("inputProjectName").value            = proyecto.nombre;
  document.getElementById("inputProjectDesc").value            = proyecto.descripcion;
  document.getElementById("inputProjectStatus").value          = proyecto.estado;
  document.getElementById("inputProjectColor").value           = proyecto.color;
  document.getElementById("errProjectName").textContent        = "";
  document.getElementById("inputProjectName").classList.remove("is-invalid");
  renderizarColorPicker(proyecto.color);
  abrirModal("modalProject");
}

/**
 * Renderiza los swatches de color en el picker del modal.
 * @param {string} colorSeleccionado
 */
function renderizarColorPicker(colorSeleccionado) {
  const picker = document.getElementById("colorPicker");
  picker.innerHTML = "";
  COLORES_PROYECTO.forEach(color => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch" + (color === colorSeleccionado ? " color-swatch--selected" : "");
    swatch.style.background = color;
    swatch.setAttribute("aria-label", `Color ${color}`);
    swatch.addEventListener("click", () => {
      document.getElementById("inputProjectColor").value = color;
      // Desmarcar todos y marcar el seleccionado
      picker.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("color-swatch--selected"));
      swatch.classList.add("color-swatch--selected");
    });
    picker.appendChild(swatch);
  });
}

/**
 * Guarda el proyecto (crear o editar) desde el formulario del modal.
 */
function guardarProyecto() {
  const nombre  = document.getElementById("inputProjectName").value.trim();
  const errNombre = document.getElementById("errProjectName");

  // Validación: nombre requerido
  if (!nombre) {
    errNombre.textContent = "El nombre del proyecto es obligatorio.";
    document.getElementById("inputProjectName").classList.add("is-invalid");
    return;
  }

  errNombre.textContent = "";
  document.getElementById("inputProjectName").classList.remove("is-invalid");

  const datos = {
    nombre,
    descripcion: document.getElementById("inputProjectDesc").value,
    estado:      document.getElementById("inputProjectStatus").value,
    color:       document.getElementById("inputProjectColor").value,
  };

  if (modoEdicionProyecto) {
    actualizarProyecto(idProyectoEditando, datos);
    cerrarModal("modalProject");
    mostrarDetalleProyecto(idProyectoEditando);
    mostrarToast("Proyecto actualizado correctamente.", "success");
  } else {
    const nuevo = crearProyecto(datos);
    cerrarModal("modalProject");
    mostrarToast("Proyecto creado con éxito.", "success");
    renderizarProyectos();
  }
}

/* 5*/

// --- Operaciones de datos ---

/**
 * Agrega un miembro al proyecto activo.
 * @param {{ nombre: string, rol: string }} datos
 */
function agregarMiembro(datos) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  proyecto.miembros.push({
    id:     generarId(),
    nombre: datos.nombre.trim(),
    rol:    datos.rol ? datos.rol.trim() : "Sin rol",
  });
  guardarEstado(estado);
}

/**
 * Elimina un miembro del proyecto activo y desasigna sus tareas.
 * @param {string} miembroId
 */
function eliminarMiembro(miembroId) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  proyecto.miembros = proyecto.miembros.filter(m => m.id !== miembroId);

  // Desasignar al miembro de las tareas que le pertenecían
  proyecto.tareas.forEach(t => {
    if (t.asignadoA === miembroId) t.asignadoA = "";
  });

  guardarEstado(estado);
}

// --- Renderizado ---

/**
 * Renderiza la lista de miembros del proyecto activo en el DOM.
 */
function renderizarMiembros() {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  const lista  = document.getElementById("membersList");
  const empty  = document.getElementById("emptyMembers");

  lista.innerHTML = "";

  if (proyecto.miembros.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  proyecto.miembros.forEach(miembro => {
    const li = document.createElement("li");
    li.className = "member-item";
    li.innerHTML = `
      <!-- Avatar con iniciales y color generado por el nombre -->
      <div class="member-avatar" style="background:${colorAvatar(miembro.nombre)};">
        ${escapeHtml(iniciales(miembro.nombre))}
      </div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(miembro.nombre)}</div>
        <div class="member-role">${escapeHtml(miembro.rol)}</div>
      </div>
      <div class="member-actions">
        <!-- Botón de eliminar miembro -->
        <button class="btn btn--icon btn--ghost" data-eliminar-miembro="${escapeHtml(miembro.id)}" title="Eliminar miembro">&#128465;</button>
      </div>
    `;
    lista.appendChild(li);
  });

  // Delegación de eventos para eliminar miembros
  lista.querySelectorAll("[data-eliminar-miembro]").forEach(btn => {
    btn.addEventListener("click", e => {
      const mid = btn.getAttribute("data-eliminar-miembro");
      const m   = proyecto.miembros.find(x => x.id === mid);
      confirmarEliminacion(
        `¿Eliminar al miembro "${m ? m.nombre : ""}"? Se desasignará de todas sus tareas.`,
        () => {
          eliminarMiembro(mid);
          renderizarMiembros();
          renderizarTareas();
          mostrarToast("Miembro eliminado.", "info");
        }
      );
    });
  });
}

// --- Modal de miembro ---

/**
 * Abre el modal para agregar un nuevo miembro al proyecto.
 */
function abrirModalAgregarMiembro() {
  document.getElementById("formMember").reset();
  document.getElementById("errMemberName").textContent = "";
  document.getElementById("inputMemberName").classList.remove("is-invalid");
  abrirModal("modalMember");
}

/**
 * Guarda el nuevo miembro desde el formulario del modal.
 */
function guardarMiembro() {
  const nombre    = document.getElementById("inputMemberName").value.trim();
  const errNombre = document.getElementById("errMemberName");

  if (!nombre) {
    errNombre.textContent = "El nombre del miembro es obligatorio.";
    document.getElementById("inputMemberName").classList.add("is-invalid");
    return;
  }

  // Verificar si ya existe un miembro con ese nombre
  const proyecto = obtenerProyecto(proyectoActivoId);
  const existe = proyecto.miembros.some(
    m => m.nombre.toLowerCase() === nombre.toLowerCase()
  );
  if (existe) {
    errNombre.textContent = "Ya existe un miembro con ese nombre en este proyecto.";
    document.getElementById("inputMemberName").classList.add("is-invalid");
    return;
  }

  errNombre.textContent = "";
  document.getElementById("inputMemberName").classList.remove("is-invalid");

  agregarMiembro({
    nombre,
    rol: document.getElementById("inputMemberRole").value,
  });

  cerrarModal("modalMember");
  renderizarMiembros();
  mostrarToast(`Miembro "${nombre}" agregado.`, "success");
}

/* 6 */

// --- Operaciones de datos ---

/**
 * Crea una nueva tarea en el proyecto activo.
 * @param {Object} datos
 */
function crearTarea(datos) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  proyecto.tareas.push({
    id:           generarId(),
    nombre:       datos.nombre.trim(),
    descripcion:  datos.descripcion ? datos.descripcion.trim() : "",
    estado:       datos.estado || "pending",
    prioridad:    datos.prioridad || "medium",
    asignadoA:    datos.asignadoA || "",
    fechaLimite:  datos.fechaLimite || "",
    creadoEn:     new Date().toISOString(),
  });
  guardarEstado(estado);
}

/**
 * Actualiza una tarea existente del proyecto activo.
 * @param {string} tareaId
 * @param {Object} datos
 */
function actualizarTarea(tareaId, datos) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  const tarea = proyecto.tareas.find(t => t.id === tareaId);
  if (!tarea) return;

  tarea.nombre       = datos.nombre.trim();
  tarea.descripcion  = datos.descripcion ? datos.descripcion.trim() : "";
  tarea.estado       = datos.estado;
  tarea.prioridad    = datos.prioridad;
  tarea.asignadoA    = datos.asignadoA;
  tarea.fechaLimite  = datos.fechaLimite;
  guardarEstado(estado);
}

/**
 * Elimina una tarea del proyecto activo.
 * @param {string} tareaId
 */
function eliminarTarea(tareaId) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;
  proyecto.tareas = proyecto.tareas.filter(t => t.id !== tareaId);
  guardarEstado(estado);
}

/**
 * Cambia el estado de una tarea cíclicamente:
 *   pending → inprogress → done → pending
 * @param {string} tareaId
 */
function ciclarEstadoTarea(tareaId) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;
  const tarea = proyecto.tareas.find(t => t.id === tareaId);
  if (!tarea) return;
  const ciclo = { pending: "inprogress", inprogress: "done", done: "pending" };
  tarea.estado = ciclo[tarea.estado] || "pending";
  guardarEstado(estado);
}

// --- Renderizado ---

/**
 * Renderiza el tablero Kanban de tareas del proyecto activo.
 * Aplica el filtro de estado si no es "all".
 */
function renderizarTareas() {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;

  // Contenedores de las columnas Kanban
  const colPending    = document.getElementById("tasksPending");
  const colInprogress = document.getElementById("tasksInprogress");
  const colDone       = document.getElementById("tasksDone");
  const emptyTasks    = document.getElementById("emptyTasks");

  colPending.innerHTML    = "";
  colInprogress.innerHTML = "";
  colDone.innerHTML       = "";

  // Filtrar según el filtro activo
  let tareas = proyecto.tareas;
  if (filtroTareas !== "all") {
    tareas = tareas.filter(t => t.estado === filtroTareas);
  }

  // Actualizar contadores por columna (siempre sobre total real, no filtrado)
  document.getElementById("countPending").textContent    = proyecto.tareas.filter(t => t.estado === "pending").length;
  document.getElementById("countInprogress").textContent = proyecto.tareas.filter(t => t.estado === "inprogress").length;
  document.getElementById("countDone").textContent       = proyecto.tareas.filter(t => t.estado === "done").length;

  if (tareas.length === 0) {
    emptyTasks.style.display = "block";
    return;
  }

  emptyTasks.style.display = "none";

  tareas.forEach(tarea => {
    const card = crearTarjetaTarea(tarea, proyecto.miembros);
    // Distribuir en la columna correcta según estado
    if (tarea.estado === "pending")    colPending.appendChild(card);
    else if (tarea.estado === "inprogress") colInprogress.appendChild(card);
    else if (tarea.estado === "done")  colDone.appendChild(card);
  });
}

/**
 * Crea y retorna el elemento DOM de una tarjeta de tarea.
 * @param {Object} tarea
 * @param {Array}  miembros - Lista de miembros del proyecto
 * @returns {HTMLElement}
 */
function crearTarjetaTarea(tarea, miembros) {
  const asignado = miembros.find(m => m.id === tarea.asignadoA);
  const vencida  = estaVencida(tarea.fechaLimite);

  const etiquetasPrioridad = { high: "Alta", medium: "Media", low: "Baja" };

  const card = document.createElement("div");
  card.className = `task-card task-card--${escapeHtml(tarea.prioridad)}`;
  card.setAttribute("data-tarea-id", tarea.id);

  card.innerHTML = `
    <div class="task-card__title">${escapeHtml(tarea.nombre)}</div>
    ${tarea.descripcion
      ? `<div class="task-card__desc">${escapeHtml(tarea.descripcion)}</div>`
      : ""}
    <div class="task-card__footer">
      <div class="task-card__meta">
        <!-- Chip de prioridad -->
        <span class="priority-chip priority-chip--${escapeHtml(tarea.prioridad)}">
          ${escapeHtml(etiquetasPrioridad[tarea.prioridad] || tarea.prioridad)}
        </span>
        <!-- Fecha límite (si existe) -->
        ${tarea.fechaLimite
          ? `<span class="task-due ${vencida ? "task-due--overdue" : ""}">
               &#128197; ${formatearFecha(tarea.fechaLimite)}${vencida ? " &#9888;" : ""}
             </span>`
          : ""}
        <!-- Responsable (si existe) -->
        ${asignado
          ? `<span class="task-assignee">
               <span class="task-avatar" style="background:${colorAvatar(asignado.nombre)};">
                 ${escapeHtml(iniciales(asignado.nombre))}
               </span>
               ${escapeHtml(asignado.nombre.split(" ")[0])}
             </span>`
          : `<span style="font-size:0.72rem; color:var(--gray-400);">Sin asignar</span>`}
      </div>
      <!-- Acciones de la tarjeta -->
      <div class="task-card__actions">
        <!-- Cambiar estado cíclicamente -->
        <button class="btn btn--icon btn--edit" data-ciclar="${escapeHtml(tarea.id)}" title="Cambiar estado">&#8635;</button>
        <!-- Editar tarea -->
        <button class="btn btn--icon btn--edit" data-editar-tarea="${escapeHtml(tarea.id)}" title="Editar tarea">&#9998;</button>
        <!-- Eliminar tarea -->
        <button class="btn btn--icon btn--ghost" data-eliminar-tarea="${escapeHtml(tarea.id)}" title="Eliminar tarea">&#128465;</button>
      </div>
    </div>
  `;

  // Evento: ciclar estado
  card.querySelector("[data-ciclar]").addEventListener("click", e => {
    e.stopPropagation();
    ciclarEstadoTarea(tarea.id);
    renderizarTareas();
    actualizarTituloBadge();
    mostrarToast("Estado de tarea actualizado.", "info");
  });

  // Evento: editar tarea
  card.querySelector("[data-editar-tarea]").addEventListener("click", e => {
    e.stopPropagation();
    abrirModalEditarTarea(tarea.id);
  });

  // Evento: eliminar tarea
  card.querySelector("[data-eliminar-tarea]").addEventListener("click", e => {
    e.stopPropagation();
    confirmarEliminacion(
      `¿Eliminar la tarea "${tarea.nombre}"?`,
      () => {
        eliminarTarea(tarea.id);
        renderizarTareas();
        actualizarTituloBadge();
        mostrarToast("Tarea eliminada.", "info");
      }
    );
  });

  return card;
}

/**
 * Actualiza el badge de estado del proyecto en el título de detalle
 * (útil al cambiar tareas que pueden no afectar el estado del proyecto,
 *  pero sí el progreso visible).
 */
function actualizarTituloBadge() {
  // Sólo actualiza si estamos en la vista de detalle
  if (!proyectoActivoId) return;
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;
  document.getElementById("projectDetailTitle").textContent = proyecto.nombre;
}

// --- Modal de tarea ---

let modoEdicionTarea  = false;
let idTareaEditando   = null;

/**
 * Pobla el selector de responsables con los miembros del proyecto activo.
 */
function poblarSelectAsignatario() {
  const proyecto = obtenerProyecto(proyectoActivoId);
  const sel = document.getElementById("inputTaskAssignee");
  sel.innerHTML = `<option value="">Sin asignar</option>`;
  if (!proyecto) return;
  proyecto.miembros.forEach(m => {
    const opt = document.createElement("option");
    opt.value       = m.id;
    opt.textContent = m.nombre;
    sel.appendChild(opt);
  });
}

/**
 * Abre el modal para crear una nueva tarea.
 */
function abrirModalNuevaTarea() {
  modoEdicionTarea = false;
  idTareaEditando  = null;

  document.getElementById("modalTaskTitle").textContent = "Nueva Tarea";
  document.getElementById("btnSaveTask").textContent    = "Crear Tarea";
  document.getElementById("formTask").reset();
  document.getElementById("errTaskName").textContent    = "";
  document.getElementById("inputTaskName").classList.remove("is-invalid");
  document.getElementById("inputTaskPriority").value    = "medium";
  poblarSelectAsignatario();
  abrirModal("modalTask");
}

/**
 * Abre el modal para editar una tarea existente.
 * @param {string} tareaId
 */
function abrirModalEditarTarea(tareaId) {
  const proyecto = obtenerProyecto(proyectoActivoId);
  if (!proyecto) return;
  const tarea = proyecto.tareas.find(t => t.id === tareaId);
  if (!tarea) return;

  modoEdicionTarea = true;
  idTareaEditando  = tareaId;

  document.getElementById("modalTaskTitle").textContent      = "Editar Tarea";
  document.getElementById("btnSaveTask").textContent         = "Guardar Cambios";
  document.getElementById("inputTaskName").value             = tarea.nombre;
  document.getElementById("inputTaskDesc").value             = tarea.descripcion;
  document.getElementById("inputTaskStatus").value           = tarea.estado;
  document.getElementById("inputTaskPriority").value         = tarea.prioridad;
  document.getElementById("inputTaskDue").value              = tarea.fechaLimite;
  document.getElementById("errTaskName").textContent         = "";
  document.getElementById("inputTaskName").classList.remove("is-invalid");

  poblarSelectAsignatario();
  document.getElementById("inputTaskAssignee").value = tarea.asignadoA || "";
  abrirModal("modalTask");
}

/**
 * Guarda la tarea (crear o editar) desde el formulario del modal.
 */
function guardarTarea() {
  const nombre    = document.getElementById("inputTaskName").value.trim();
  const errNombre = document.getElementById("errTaskName");

  if (!nombre) {
    errNombre.textContent = "El nombre de la tarea es obligatorio.";
    document.getElementById("inputTaskName").classList.add("is-invalid");
    return;
  }

  errNombre.textContent = "";
  document.getElementById("inputTaskName").classList.remove("is-invalid");

  const datos = {
    nombre,
    descripcion:  document.getElementById("inputTaskDesc").value,
    estado:       document.getElementById("inputTaskStatus").value,
    prioridad:    document.getElementById("inputTaskPriority").value,
    asignadoA:    document.getElementById("inputTaskAssignee").value,
    fechaLimite:  document.getElementById("inputTaskDue").value,
  };

  if (modoEdicionTarea) {
    actualizarTarea(idTareaEditando, datos);
    cerrarModal("modalTask");
    renderizarTareas();
    mostrarToast("Tarea actualizada.", "success");
  } else {
    crearTarea(datos);
    cerrarModal("modalTask");
    renderizarTareas();
    mostrarToast("Tarea creada con éxito.", "success");
  }
}

/* 7 */

/**
 * Abre un modal por su ID.
 * @param {string} modalId
 */
function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("modal--open");
  document.body.style.overflow = "hidden";

  // Focus al primer input del modal (accesibilidad)
  setTimeout(() => {
    const primer = modal.querySelector("input, select, textarea, button:not(.modal__close)");
    if (primer) primer.focus();
  }, 100);
}

/**
 * Cierra un modal por su ID.
 * @param {string} modalId
 */
function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("modal--open");
  document.body.style.overflow = "";
}

/**
 * Muestra el modal de confirmación para una acción destructiva.
 * @param {string}   texto    - Texto descriptivo de la acción a confirmar
 * @param {Function} callback - Función a ejecutar si el usuario confirma
 */
function confirmarEliminacion(texto, callback) {
  document.getElementById("modalConfirmText").textContent = texto;
  callbackConfirmar = callback;
  abrirModal("modalConfirm");
}

/* 8*/

let toastTimer = null;

/**
 * Muestra una notificación flotante (toast) con un mensaje.
 * @param {string} mensaje
 * @param {"success"|"error"|"info"} tipo
 */
function mostrarToast(mensaje, tipo = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.className   = `toast toast--${tipo} toast--show`;

  // Si ya había un toast, resetear el timer
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--show");
  }, 3000);
}

/* 9*/

/**
 * Activa una pestaña y muestra su panel correspondiente.
 * @param {"members"|"tasks"} nombreTab
 */
function activarTab(nombreTab) {
  // Actualizar botones de tab
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("tab--active", t.getAttribute("data-tab") === nombreTab);
  });

  // Actualizar paneles
  document.getElementById("tabMembers").classList.toggle("tab-panel--active", nombreTab === "members");
  document.getElementById("tabTasks").classList.toggle("tab-panel--active", nombreTab === "tasks");
}

/* 10 */

/**
 * Actualiza el estado visual de los botones de filtro.
 */
function actualizarFiltrosBotones() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("filter-btn--active", btn.getAttribute("data-filter") === filtroTareas);
  });
}

/* 11*/

/**
 * Registra todos los eventos estáticos de la aplicación.
 * Los eventos sobre elementos dinámicos se delegan o se registran
 * cada vez que se re-renderiza el componente.
 */
function registrarEventos() {

  /* ---- Botón: volver al dashboard ---- */
  document.getElementById("btnBack").addEventListener("click", mostrarDashboard);

  /* ---- Botón: ir al dashboard desde el header ---- */
  document.getElementById("btnDashboard").addEventListener("click", mostrarDashboard);

  /* ---- Búsqueda de proyectos ---- */
  document.getElementById("searchProjects").addEventListener("input", renderizarProyectos);

  /* ---- Botón: nuevo proyecto ---- */
  document.getElementById("btnNewProject").addEventListener("click", abrirModalNuevoProyecto);

  /* ---- Botón: guardar proyecto ---- */
  document.getElementById("btnSaveProject").addEventListener("click", guardarProyecto);

  /* ---- Soporte Enter en formulario de proyecto ---- */
  document.getElementById("inputProjectName").addEventListener("keydown", e => {
    if (e.key === "Enter") guardarProyecto();
  });

  /* ---- Botones de editar y eliminar proyecto (panel de detalle) ---- */
  document.getElementById("btnEditProject").addEventListener("click", () => {
    if (proyectoActivoId) abrirModalEditarProyecto(proyectoActivoId);
  });

  document.getElementById("btnDeleteProject").addEventListener("click", () => {
    if (!proyectoActivoId) return;
    const p = obtenerProyecto(proyectoActivoId);
    confirmarEliminacion(
      `¿Eliminar el proyecto "${p ? p.nombre : ""}" y todas sus tareas y miembros? Esta acción no se puede deshacer.`,
      () => {
        const nombre = p ? p.nombre : "";
        eliminarProyecto(proyectoActivoId);
        mostrarDashboard();
        mostrarToast(`Proyecto "${nombre}" eliminado.`, "error");
      }
    );
  });

  /* ---- Pestañas del detalle de proyecto ---- */
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activarTab(tab.getAttribute("data-tab"));
    });
  });

  /* ---- Botón: agregar miembro ---- */
  document.getElementById("btnAddMember").addEventListener("click", abrirModalAgregarMiembro);

  /* ---- Botón: guardar miembro ---- */
  document.getElementById("btnSaveMember").addEventListener("click", guardarMiembro);

  /* ---- Soporte Enter en formulario de miembro ---- */
  document.getElementById("inputMemberName").addEventListener("keydown", e => {
    if (e.key === "Enter") guardarMiembro();
  });

  /* ---- Botón: nueva tarea ---- */
  document.getElementById("btnAddTask").addEventListener("click", abrirModalNuevaTarea);

  /* ---- Botón: guardar tarea ---- */
  document.getElementById("btnSaveTask").addEventListener("click", guardarTarea);

  /* ---- Soporte Enter en formulario de tarea ---- */
  document.getElementById("inputTaskName").addEventListener("keydown", e => {
    if (e.key === "Enter") guardarTarea();
  });

  /* ---- Filtros de tareas ---- */
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      filtroTareas = btn.getAttribute("data-filter");
      actualizarFiltrosBotones();
      renderizarTareas();
    });
  });

  /* ---- Cierre de modales con botones [data-close] ---- */
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      cerrarModal(btn.getAttribute("data-close"));
    });
  });

  /* ---- Cierre de modales al hacer clic en el backdrop ---- */
  document.querySelectorAll(".modal__backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", () => {
      // Encontrar el modal padre y cerrarlo
      const modal = backdrop.closest(".modal");
      if (modal) cerrarModal(modal.id);
    });
  });

  /* ---- Tecla Escape para cerrar el modal activo ---- */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const abierto = document.querySelector(".modal--open");
      if (abierto) cerrarModal(abierto.id);
    }
  });

  /* ---- Confirmar eliminación ---- */
  document.getElementById("btnConfirmDelete").addEventListener("click", () => {
    cerrarModal("modalConfirm");
    if (typeof callbackConfirmar === "function") {
      callbackConfirmar();
      callbackConfirmar = null;
    }
  });
}

/* 12 */

/**
 * Punto de entrada de la aplicación.
 * Se ejecuta cuando el DOM está completamente cargado.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Registrar todos los listeners de eventos estáticos
  registrarEventos();

  // Mostrar el dashboard inicial con los datos del LocalStorage
  mostrarDashboard();

  // Si no hay proyectos, mostrar el estado vacío automáticamente
  const proyectos = obtenerProyectos();
  if (proyectos.length === 0) {
    document.getElementById("emptyProjects").style.display = "flex";
  }

  console.log(
    "%cGestorPro iniciado ✔",
    "color:#4f46e5; font-weight:bold; font-size:14px;"
  );
  console.log(
    `%c${proyectos.length} proyecto(s) cargado(s) desde LocalStorage.`,
    "color:#6b7280; font-size:12px;"
  );
});
