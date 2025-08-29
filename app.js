// ===========================
// Utilidades base
// ===========================
const fmtARS = new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits: 0 });
const fmtPct = (n)=> `${n.toFixed(3)}%`;

const form = document.getElementById('sim-form');
const resultado = document.getElementById('resultado');
const resumen = document.getElementById('resumen');
const rescateInfo = document.getElementById('rescateInfo');
const tablaBody = document.querySelector('#tabla tbody');
const chartSvg = document.getElementById('chart');

const toggleRescate = document.getElementById('toggleRescate');
const mesRescateInput = document.getElementById('mesRescate');
const mesRescateLabel = document.getElementById('mesRescateLabel');
const themeToggleBtn = document.getElementById('themeToggle');
const errorFechaNacimiento = document.getElementById('errorFechaNacimiento');

// ===========================
// Tema (oscuro/claro) con persistencia
// ===========================
function getPreferredTheme(){
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light';
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  // refrescar gráfico con colores del tema si ya hay datos
  if (lastRows) renderChart(lastRows, lastRescate);
}
themeToggleBtn.addEventListener('click', ()=>{
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t);
});

// ===========================
// Slider rescate: "Mes X de N-1"
// ===========================
let rescateMaxMeses = 24;
function actualizarLabelRescate() {
  mesRescateLabel.textContent = `Mes ${mesRescateInput.value} de ${rescateMaxMeses}`;
}
function setRescateMax(max) {
  rescateMaxMeses = Math.max(1, max);
  mesRescateInput.max = String(rescateMaxMeses);
  if (Number(mesRescateInput.value) > rescateMaxMeses) {
    mesRescateInput.value = String(rescateMaxMeses);
  }
  actualizarLabelRescate();
}
toggleRescate.addEventListener('change', () => {
  mesRescateInput.disabled = !toggleRescate.checked;
  actualizarLabelRescate();
});
mesRescateInput.addEventListener('input', actualizarLabelRescate);

// ===========================
// Reset
// ===========================
document.getElementById('btnReset').addEventListener('click', () => {
  form.reset();
  resultado.hidden = true;
  rescateInfo.hidden = true;
  chartSvg.innerHTML = '';
  tablaBody.innerHTML = '';
  actualizarTasaSegunPlazo();
  setRescateMax(24);
});

// ===========================
// Fondos fijos por horizonte
// ===========================
const FONDOS = {
  corto:   { nombre: 'SBS Gestión Renta Fija - Clase A', horizonte: 'Corto plazo',   tasa: 45.604 },
  mediano: { nombre: 'SBS Retorno Total - Clase A',      horizonte: 'Mediano plazo', tasa: 33.761 },
  largo:   { nombre: 'SBS Acciones Argentina - Clase A', horizonte: 'Largo plazo',   tasa: 44.723 }
};

function seleccionarFondoPorPlazo(anios) {
  if (anios <= 2) return FONDOS.corto;
  if (anios <= 5) return FONDOS.mediano;
  return FONDOS.largo;
}

function actualizarTasaSegunPlazo() {
  const anios = Number(document.getElementById('plazoAnios').value || 0);
  const inputTasa = document.getElementById('tasaAnual');
  const f = seleccionarFondoPorPlazo(anios || 1);
  inputTasa.value = String(f.tasa.toFixed(3));
  inputTasa.placeholder = '';
}

// ===========================
// Simulación
// ===========================

function simular(aporteMensual, anios, tasaAnual) {
  const n = Math.max(1, Math.round(anios * 12));
  const r = Math.pow(1 + tasaAnual/100, 1/12) - 1;

  let saldo = 0;
  const rows = [];
  for (let m = 1; m <= n; m++) {
    const saldoInicial = saldo;
    const rendimiento = saldoInicial * r;
    saldo = saldoInicial + rendimiento + aporteMensual;
    rows.push({ mes:m, saldoInicial, aporte: aporteMensual, rendimiento, saldo });
  }
  return rows;
}

// Penalidades por tercios (10%, 5%, 1%) y evita último mes
function aplicarRescate(rows, mesRescate) {
  const n = rows.length;
  const tercio1 = Math.floor(n / 3);
  const tercio2 = Math.floor((2 * n) / 3);
  const m = Math.max(1, Math.min(mesRescate, n - 1)); // clamp y evita último mes

  const row = rows[m - 1];
  if (!row) return null;

  let tasaPenalidad, tramoLabel;
  if (m <= tercio1) {
    tasaPenalidad = 0.10;
    tramoLabel = `Primer tercio (0–${tercio1} meses)`;
  } else if (m <= tercio2) {
    tasaPenalidad = 0.05;
    tramoLabel = `Segundo tercio (${tercio1 + 1}–${tercio2} meses)`;
  } else {
    tasaPenalidad = 0.01;
    tramoLabel = `Último tercio (${tercio2 + 1}–${n - 1} meses)`;
  }

  const penalidad = row.saldo * tasaPenalidad;
  const neto = row.saldo - penalidad;
  return { mes: m, saldo: row.saldo, tasaPenalidad, penalidad, neto, tercio1, tercio2, n, tramoLabel };
}

function renderTabla(rows) {
  tablaBody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.mes}</td>
      <td>${fmtARS.format(r.saldoInicial)}</td>
      <td>${fmtARS.format(r.aporte)}</td>
      <td>${fmtARS.format(r.rendimiento)}</td>
      <td>${fmtARS.format(r.saldo)}</td>
    </tr>
  `).join('');
}

// Colores del gráfico desde CSS vars del tema
function getChartColors(){
  const css = getComputedStyle(document.documentElement);
  return {
    line: css.getPropertyValue('--chart-line').trim() || '#000',
    grid: css.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,.08)',
    axis: css.getPropertyValue('--chart-axis').trim() || 'rgba(0,0,0,.25)',
    dot:  css.getPropertyValue('--chart-line').trim() || '#000',
  };
}

// SVG line chart sin dependencias
function renderChart(rows, rescate) {
  const w = 800, h = 320, pad = 36;
  const maxY = Math.max(...rows.map(r=>r.saldo)) * 1.05;
  const minY = 0;
  const toX = (i)=> pad + (i/(rows.length-1)) * (w - pad*2);
  const toY = (v)=> h - pad - ((v-minY)/(maxY-minY)) * (h - pad*2);

  const { line, grid, axis, dot } = getChartColors();

  let axes = `<rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>`;
  axes += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="${axis}"/>`;
  axes += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" stroke="${axis}"/>`;
  for (let i=1;i<=4;i++){
    const y = toY(minY + i*(maxY-minY)/5);
    axes += `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="${grid}"/>`;
  }

  const d = rows.map((r,i)=> `${i===0?'M':'L'} ${toX(i)} ${toY(r.saldo)}`).join(' ');
  let path = `<path d="${d}" fill="none" stroke="${line}" stroke-width="2.5"/>`;

  let dots = '';
  for (let i=0;i<rows.length;i++){
    if (i % 6 === 0 || i === rows.length-1) {
      dots += `<circle cx="${toX(i)}" cy="${toY(rows[i].saldo)}" r="3" fill="${dot}"/>`;
    }
  }

  let rescateLine = '';
  if (rescate) {
    const x = toX(rescate.mes-1);
    rescateLine = `<line x1="${x}" y1="${pad}" x2="${x}" y2="${h-pad}" stroke="red" opacity="0.5"/>`;
  }

  chartSvg.innerHTML = axes + path + dots + rescateLine;
}

// Guardamos última simulación para refrescar gráfico al cambiar de tema
let lastRows = null;
let lastRescate = null;

function esMayorDeEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  if (Number.isNaN(nacimiento.getTime())) return false;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad >= 18;
}

// Ejecuta toda la simulación y render con la tasa indicada
function runSimulacion({ nombre, fechaNacimiento, aporteMensual, motivo, plazoAnios, metodoPago, tasaAnual }) {
  const rows = simular(aporteMensual, plazoAnios, tasaAnual);

  // tope del slider: último MES anticipado (N-1)
  setRescateMax(Math.max(1, rows.length - 1));

  // Posible rescate
  let rescMark = null;
  if (toggleRescate.checked) {
    rescMark = aplicarRescate(rows, Number(mesRescateInput.value));
    rescateInfo.hidden = false;
    rescateInfo.innerHTML = `
      <p><strong>Rescate anticipado:</strong> Mes ${rescMark.mes} — ${rescMark.tramoLabel}</p>
      <ul>
        <li>Saldo al rescate: <strong>${fmtARS.format(rescMark.saldo)}</strong></li>
        <li>Penalidad (${fmtPct(rescMark.tasaPenalidad*100)}): <strong>−${fmtARS.format(rescMark.penalidad)}</strong></li>
        <li>Neto a recibir: <strong>${fmtARS.format(rescMark.neto)}</strong></li>
      </ul>`;
  } else {
    rescateInfo.hidden = true;
  }

  const fondo = seleccionarFondoPorPlazo(plazoAnios);
  const montoTotalAportado = rows.reduce((acc, r)=> acc + r.aporte, 0);
  const saldoFinal = rows[rows.length-1].saldo;
  resumen.innerHTML = `
    <p><strong>Hola ${nombre}</strong> — Para un plazo de <strong>${plazoAnios} años</strong>, sugerimos el fondo <strong>${fondo.nombre}</strong> (<em>${fondo.horizonte}</em>).</p>
    <p>Aporte mensual: <strong>${fmtARS.format(aporteMensual)}</strong> — Tasa anual aplicada: <strong>${fmtPct(tasaAnual)}</strong></p>
    <p>Monto total aportado: <strong>${fmtARS.format(montoTotalAportado)}</strong> — Proyección de saldo final: <strong>${fmtARS.format(saldoFinal)}</strong></p>
    <p class="mini">Método de débito elegido: ${metodoPago.toUpperCase()} — Motivo: ${motivo}</p>
    <p class="mini">La cuota se actualizará cada mes según el índice UVA.</p>
  `;

  renderTabla(rows);
  renderChart(rows, rescMark);

  lastRows = rows;
  lastRescate = rescMark;
  resultado.hidden = false;
}

// ===========================
// Listeners
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getPreferredTheme());
  document.getElementById('tasaAnual').readOnly = true;
  actualizarTasaSegunPlazo();
  actualizarLabelRescate();
});

form.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'plazoAnios') actualizarTasaSegunPlazo();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const fechaNacimiento = document.getElementById('fechaNacimiento').value;
  const aporteMensual = Number(document.getElementById('montoMensual').value || 0);
  const motivo = document.getElementById('motivo').value;
  const plazoAnios = Number(document.getElementById('plazoAnios').value);
  const metodoPago = document.getElementById('metodoPago').value;

  if (!nombre || !fechaNacimiento || !aporteMensual || !plazoAnios) {
    alert('Completá todos los campos obligatorios.');
    return;
  }

  if (!esMayorDeEdad(fechaNacimiento)) {
    alert('Debés ser mayor de 18 años.');
    errorFechaNacimiento.hidden = false;
    return;
  } else {
    errorFechaNacimiento.hidden = true;
  }

  const fondo = seleccionarFondoPorPlazo(plazoAnios);
  document.getElementById('tasaAnual').value = String(fondo.tasa.toFixed(3));

  runSimulacion({ nombre, fechaNacimiento, aporteMensual, motivo, plazoAnios, metodoPago, tasaAnual: fondo.tasa });
});
